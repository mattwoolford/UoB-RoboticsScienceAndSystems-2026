"""Loopback HTTP API; Vite proxies /api and production assets share this origin."""
import argparse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import mimetypes
from pathlib import Path
from urllib.parse import urlsplit

from .robot import RobotService
from .simulations import CANDIDATES, SimulationService

DIST = Path(__file__).resolve().parents[1] / 'dist'


class DashboardServer(ThreadingHTTPServer):
    """Own services for the server lifetime and close their workers on shutdown."""
    daemon_threads = True

    def __init__(self, address):
        self.simulation = SimulationService()
        self.robot = RobotService()
        super().__init__(address, Handler)

    def server_close(self):
        self.robot.disconnect()
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

    def do_GET(self):
        """Serve live state, completed-run exports, or the built React application."""
        if not self.trusted():
            return self.reply(403, {'error': 'Only local dashboard requests are allowed.'})
        route = urlsplit(self.path).path
        if route == '/api/state':
            return self.reply(200, dict(simulation=self.server.simulation.snapshot(),
                                       robot=self.server.robot.snapshot(), candidates=CANDIDATES))
        if route in {'/api/results.csv', '/api/results.xlsx'}:
            csv = route.endswith('.csv')
            with self.server.simulation.lock:
                data = self.server.simulation.csv_bytes if csv else self.server.simulation.xlsx_bytes
            if data is None:
                return self.reply(404, {'error': 'Complete a simulation before downloading results.'})
            return self.reply(200, data, 'text/csv' if csv else
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'results.csv' if csv else 'results.xlsx')
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
    args = parser.parse_args()
    with DashboardServer(('127.0.0.1', args.port)) as server:
        print(f'Dashboard API: http://127.0.0.1:{args.port}', flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == '__main__':
    main()
