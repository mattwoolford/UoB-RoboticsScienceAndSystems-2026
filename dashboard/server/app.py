"""Loopback HTTP API; Vite proxies /api and production assets share this origin."""
import argparse
import errno
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import mimetypes
from pathlib import Path
from urllib.parse import urlsplit

from .pwm_sweep import sweep_id
from .results import list_workbooks, workbook_available, workbook_path
from .robot import RobotService
from .simulations import CANDIDATES, SimulationService

DIST = Path(__file__).resolve().parents[1] / 'dist'
XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'


class DashboardServer(ThreadingHTTPServer):
    """Own services for the server lifetime and close their workers on shutdown."""
    daemon_threads = True

    def __init__(self, address, output_directory=None):
        self.results = Path(output_directory or DIST.parent / 'results').resolve()
        self.simulation = SimulationService(self.results)
        self.robot = RobotService(self.results)
        super().__init__(address, Handler)

    def server_close(self):
        self.robot.disconnect()
        if self.robot.sweep.worker:
            self.robot.sweep.worker.join()
        self.simulation.close()
        super().server_close()


class Handler(BaseHTTPRequestHandler):
    """Explicit routes and same-origin checks keep control local to this app."""

    def log_message(self, format, *args):
        # Polling traffic is intentionally quiet; actionable errors reach the UI.
        if args and str(args[1] if len(args) > 1 else '') not in {'200', '202'}:
            super().log_message(format, *args)

    def reply(self, status, body, content_type='application/json', filename=None):
        """Serialize finite JSON and avoid caching live control state."""
        data = json.dumps(body, allow_nan=False).encode() if content_type == 'application/json' else body
        self.send_response(status)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        if filename:
            self.send_header('Content-Disposition', f'attachment; filename="{filename}"')
        self.end_headers()
        try:
            self.wfile.write(data)
        except (BrokenPipeError, ConnectionResetError):
            pass  # Closing a tab should not disrupt a worker or another request.

    def trusted(self):
        """Reject DNS-rebinding hosts and cross-site browser control requests."""
        allowed = {'127.0.0.1', 'localhost', '::1'}
        try:
            host = urlsplit('http://' + self.headers.get('Host', '')).hostname
            origin = self.headers.get('Origin')
            if host not in allowed:
                return False
            if origin:
                parsed = urlsplit(origin)
                allowed_ports = {5173, self.server.server_port}
                if parsed.scheme != 'http' or parsed.hostname not in allowed or parsed.port not in allowed_ports:
                    return False
            return self.headers.get('Sec-Fetch-Site') not in {'cross-site'}
        except ValueError:
            return False

    def send_workbook(self, path, filename):
        if workbook_available(path):
            try:
                data = path.read_bytes()
            except FileNotFoundError:
                pass  # Another request may have just deleted it.
            else:
                return self.reply(200, data, XLSX_TYPE, filename)
        return self.reply(404, {'error': 'Saved workbook not found.'})

    def do_GET(self):
        """Serve live state, completed-run exports, or the built React application."""
        if not self.trusted():
            return self.reply(403, {'error': 'Only local dashboard requests are allowed.'})
        route = urlsplit(self.path).path
        if route == '/api/state':
            return self.reply(200, dict(simulation=self.server.simulation.snapshot(),
                                       robot=self.server.robot.snapshot(), candidates=CANDIDATES))
        if route == '/api/results/workbooks':
            return self.reply(200, list_workbooks(self.server.results))
        if route.startswith('/api/results/workbooks/'):
            filename = route.removeprefix('/api/results/workbooks/')
            path = workbook_path(self.server.results, filename)
            return self.send_workbook(path, filename)
        if route == '/api/robot/pwm-sweep.xlsx':
            with self.server.robot.lock:
                workbook = self.server.robot.sweep.workbook
            if workbook is None:
                return self.reply(404, {'error': 'Complete a PWM run before downloading the workbook.'})
            return self.send_workbook(workbook, workbook.name)
        if route == '/api/results.xlsx':
            with self.server.simulation.lock:
                workbook = self.server.simulation.workbook
            return self.send_workbook(workbook, 'results.xlsx')
        if route == '/api/results.csv':
            with self.server.simulation.lock:
                data = self.server.simulation.csv_bytes
            if data is None:
                return self.reply(404, {'error': 'Complete a simulation before downloading results.'})
            return self.reply(200, data, 'text/csv', 'results.csv')
        if route.startswith('/api/'):
            return self.reply(404, {'error': 'Unknown API route.'})
        # Resolve within dist to prevent filesystem traversal, including symlinks.
        target = (DIST / route.lstrip('/')).resolve()
        if not target.is_relative_to(DIST.resolve()):
            return self.reply(404, {'error': 'Not found.'})
        if not target.is_file():
            target = DIST / 'index.html'
        if not target.is_file():
            return self.reply(404, {'error': 'Run pnpm dev or build the dashboard with pnpm build.'})
        return self.reply(200, target.read_bytes(), mimetypes.guess_type(target.name)[0] or 'application/octet-stream')

    def do_DELETE(self):
        """Remove a single published workbook by its download name."""
        if not self.trusted():
            return self.reply(403, {'error': 'Only local dashboard requests are allowed.'})
        route = urlsplit(self.path).path
        if not route.startswith('/api/results/workbooks/'):
            return self.reply(404, {'error': 'Unknown API route.'})
        filename = route.removeprefix('/api/results/workbooks/')
        try:
            if filename.startswith('pwm-sweep-'):
                try:
                    batch_id = sweep_id(filename)
                except ValueError:
                    return self.reply(404, {'error': 'Saved workbook not found.'})
                self.server.robot.sweep.store.delete_workbook(batch_id)
            else:
                path = workbook_path(self.server.results, filename)
                if path is None:
                    return self.reply(404, {'error': 'Saved workbook not found.'})
                path.unlink()
        except FileNotFoundError:
            return self.reply(404, {'error': 'Saved workbook not found.'})
        except ValueError as error:
            return self.reply(409, {'error': str(error)})
        except OSError as error:
            return self.reply(409, {'error': f'Could not delete the workbook: {error.strerror}.'})
        self.reply(200, {'ok': True})

    def do_POST(self):
        """Validate bounded JSON commands and translate adapter errors for the UI."""
        if not self.trusted():
            return self.reply(403, {'error': 'Only local dashboard requests are allowed.'})
        try:
            if self.headers.get('Content-Type', '').split(';')[0] != 'application/json':
                raise ValueError('Commands require application/json.')
            size = int(self.headers.get('Content-Length', '0'))
            if not 0 < size <= 4096:
                raise ValueError('Command body must be between 1 and 4096 bytes.')
            options = json.loads(self.rfile.read(size))
            if not isinstance(options, dict):
                raise ValueError('Command body must be a JSON object.')
            route = urlsplit(self.path).path
            if route == '/api/simulation/start':
                self.server.simulation.start(options)
            elif route == '/api/simulation/cancel':
                self.server.simulation.cancel()
            elif route == '/api/robot/connect':
                self.server.robot.connect(options.get('host', '192.168.4.1'), options.get('port', 80))
            elif route == '/api/robot/disconnect':
                self.server.robot.disconnect()
            elif route == '/api/robot/command':
                self.server.robot.command(options.get('command'), options.get('procedure'))
            elif route == '/api/robot/pwm-sweep/start':
                self.server.robot.start_pwm_sweep(options.get('runs'))
            elif route == '/api/robot/pwm-sweep/resume':
                self.server.robot.resume_pwm_sweep(options.get('filename'))
            elif route == '/api/robot/settings':
                settings = self.server.robot.set_settings(options)
                return self.reply(200, {'ok': True, 'settings': settings})
            elif route == '/api/heartbeat':
                self.server.robot.heartbeat()
            else:
                return self.reply(404, {'error': 'Unknown API route.'})
            self.reply(200, {'ok': True})
        except (ValueError, TypeError, OSError) as error:
            self.reply(400, {'error': str(error)})


def main():
    """Bind only loopback; a network robot is reached through the TCP adapter."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8765)
    parser.add_argument('--allow-port-fallback', action='store_true',
                        help='Use a free loopback port if the requested port is occupied.')
    args = parser.parse_args()
    try:
        server = DashboardServer(('127.0.0.1', args.port))
    except OSError as error:
        if not args.allow_port_fallback or error.errno != errno.EADDRINUSE:
            raise
        server = DashboardServer(('127.0.0.1', 0))
    with server:
        print(f'Dashboard API: http://127.0.0.1:{server.server_port}', flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == '__main__':
    main()
