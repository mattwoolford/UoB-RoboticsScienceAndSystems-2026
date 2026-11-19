"""Integration checks for real TCP framing, leases, validation and Java jobs."""
import json
from pathlib import Path
import socket
import tempfile
import threading
import time
import unittest
from urllib.request import Request, urlopen
from urllib.error import HTTPError

from .app import DashboardServer
from .robot import RobotService
from .simulations import SimulationService


class FakeRobot:
    """Use a real localhost socket, fragmenting records as real TCP can do."""

    def __init__(self, robot_name=None, withhold_ack=None, settings=None):
        self.hello = dict(type='hello', protocol=1)
        if robot_name is not None:
            self.hello['robot'] = robot_name
        if settings is not None:
            self.hello['settings'] = dict(settings)
        self.reject_settings = False
        self.listener = socket.socket()
        self.listener.bind(('127.0.0.1', 0))
        self.listener.listen()
        self.port = self.listener.getsockname()[1]
        self.commands = []
        self.withhold_ack = withhold_ack
        self.calibrate_received = threading.Event()
        self.stop_received = threading.Event()
        self.thread = threading.Thread(target=self.run, daemon=True)
        self.thread.start()

    def run(self):
        connection, _ = self.listener.accept()
        connection.settimeout(.1)
        buffer = b''
        try:
            while True:
                try:
                    data = connection.recv(4096)
                except socket.timeout:
                    data = None
                if data == b'':
                    break
                if data:
                    buffer += data
                    while b'\n' in buffer:
                        line, buffer = buffer.split(b'\n', 1)
                        command = line.decode()
                        self.commands.append(command)
                        if command == 'CALIBRATE':
                            self.calibrate_received.set()
                        elif command == 'STOP':
                            self.stop_received.set()
                        if command == 'HELLO':
                            hello = (json.dumps(self.hello) + '\n').encode()
                            split = len(hello) // 2
                            connection.sendall(hello[:split])
                            connection.sendall(hello[split:])
                        elif command.startswith('SETTINGS '):
                            _, correction, recovery = command.split()
                            ack = dict(type='ack', command='SETTINGS', ok=not self.reject_settings)
                            if self.reject_settings:
                                ack['error'] = 'settings_write_failed'
                            else:
                                ack['settings'] = dict(drift_correction=correction == '1',
                                                       drift_path_recovery=recovery == '1')
                                self.hello['settings'] = ack['settings']
                            connection.sendall((json.dumps(ack) + '\n').encode())
                        elif command.startswith(('START', 'CALIBRATE', 'STOP')) and command != self.withhold_ack:
                            ack = dict(type='ack', command=command.split()[0], ok=command != 'START line_follow',
                                       error='Calibrate first.')
                            connection.sendall((json.dumps(ack) + '\n').encode())
                sample = dict(type='telemetry', timestamp_ms=100, x_mm=1, y_mm=2,
                              heading_rad=0, left_pwm=0, right_pwm=0, left_count=1,
                              right_count=1, sensors=[0]*5, ready=True, state='idle')
                connection.sendall((json.dumps(sample) + '\n').encode())
        except OSError:
            pass
        finally:
            connection.close()
            self.listener.close()


class RobotChecks(unittest.TestCase):
    def test_ack_fragmentation_and_browser_timeout(self):
        fake = FakeRobot()
        service = RobotService()
        try:
            service.connect('127.0.0.1', fake.port)
            service.heartbeat()
            service.command('start', 'open_loop')
            with self.assertRaisesRegex(ValueError, 'Calibrate first'):
                service.command('start', 'line_follow')
            self.assertEqual(service.snapshot()['telemetry']['x_mm'], 1)
            # Even a healthy telemetry stream cannot renew the absent browser lease.
            deadline = time.monotonic() + 3
            while service.snapshot()['status'] != 'error' and time.monotonic() < deadline:
                time.sleep(.05)
            self.assertEqual(service.snapshot()['status'], 'error')
            self.assertIn('heartbeat', service.snapshot()['message'])
            fake.thread.join(1)
            self.assertIn('STOP', fake.commands)
        finally:
            service.disconnect()

    def test_stop_cancels_start_waiting_for_command_slot(self):
        fake = FakeRobot()
        service = RobotService()
        errors = []
        try:
            service.connect('127.0.0.1', fake.port)
            # Hold the ACK slot to reproduce a start queued behind another command.
            service.command_lock.acquire()
            def queued_start():
                try:
                    service.command('start', 'open_loop')
                except ValueError as error:
                    errors.append(str(error))
            worker = threading.Thread(target=queued_start)
            worker.start()
            time.sleep(.1)
            service.command('stop')
            service.command_lock.release()
            worker.join(2)
            self.assertEqual(errors, ['Command cancelled by Stop.'])
            self.assertNotIn('START open_loop', fake.commands)
        finally:
            service.disconnect()

    def test_interchangeable_robot_names_use_selected_endpoint(self):
        service = RobotService()
        # Reuse the dashboard session against different TCP endpoints and names;
        # even a robot omitting identity metadata must provide only protocol v1.
        for name in ('robot-alpha', 'Replacement robot / 42', None):
            with self.subTest(robot_name=name):
                fake = FakeRobot(robot_name=name)
                try:
                    service.connect('127.0.0.1', fake.port)
                    self.assertEqual(service.snapshot()['status'], 'connected')
                    self.assertIn(f'127.0.0.1:{fake.port}', service.snapshot()['message'])
                    self.assertIsNotNone(service.snapshot()['telemetry'])
                    service.command('start', 'open_loop')
                    self.assertIn('START open_loop', fake.commands)
                finally:
                    service.disconnect()
                    fake.thread.join(1)
                self.assertEqual(service.snapshot()['status'], 'disconnected')
                self.assertIn('STOP', fake.commands)

    def test_handshake_requires_protocol_not_robot_identity(self):
        service = RobotService()
        # A familiar device label cannot bypass protocol compatibility checks.
        for hello in ({'type': 'hello', 'robot': 'stamp-c3'},
                      {'type': 'hello', 'protocol': 2, 'robot': 'stamp-c3'}):
            service._record(hello)
            self.assertFalse(service.hello_event.is_set())
        service._record({'type': 'hello', 'protocol': 1, 'robot': 'arbitrary-name'})
        self.assertTrue(service.hello_event.is_set())

    def test_settings_require_firmware_support_and_well_typed_records(self):
        fake = FakeRobot()
        service = RobotService()
        try:
            service.connect('127.0.0.1', fake.port)
            state = service.snapshot()
            self.assertIsNone(state['settings'])
            with self.assertRaisesRegex(ValueError, 'support drift settings'):
                service.set_settings(dict(connection_id=state['connection_id'],
                                          drift_correction=True, drift_path_recovery=False))
            self.assertFalse(any(line.startswith('SETTINGS ') for line in fake.commands))
            with self.assertRaisesRegex(ValueError, 'boolean'):
                service._record(dict(type='hello', protocol=1,
                                     settings=dict(drift_correction=1, drift_path_recovery=True)))
        finally:
            service.disconnect()

    def test_invalid_targets_and_samples(self):
        service = RobotService()
        for host in ('example.com', '8.8.8.8', '0.0.0.0'):
            with self.assertRaises(ValueError):
                service.connect(host)
        with self.assertRaises(ValueError):
            service._record({'type': 'telemetry', 'sensors': []})


class HttpChecks(unittest.TestCase):
    @staticmethod
    def post(url, path, body):
        """Exercise the same JSON request contract used by dashboard stop buttons."""
        request = Request(url + path, data=json.dumps(body).encode(),
                          headers={'Content-Type': 'application/json'})
        with urlopen(request, timeout=5) as response:
            return json.load(response)

    def test_robot_settings_round_trip_and_connection_scope(self):
        initial = dict(drift_correction=False, drift_path_recovery=True)
        updated = dict(drift_correction=True, drift_path_recovery=False)
        with DashboardServer(('127.0.0.1', 0)) as server:
            worker = threading.Thread(target=server.serve_forever, daemon=True)
            worker.start()
            url = f'http://127.0.0.1:{server.server_port}'

            def robot_state():
                with urlopen(url + '/api/state') as response:
                    return json.load(response)['robot']

            try:
                fake = FakeRobot(settings=initial)
                self.post(url, '/api/robot/connect', {'host': '127.0.0.1', 'port': fake.port})
                state = robot_state()
                self.assertEqual(state['settings'], initial)
                draft = dict(updated, connection_id=state['connection_id'])
                for invalid in ({}, dict(draft, drift_correction=1), dict(draft, drift_path_recovery='true')):
                    with self.assertRaises(HTTPError):
                        self.post(url, '/api/robot/settings', invalid)
                self.assertFalse(any(line.startswith('SETTINGS ') for line in fake.commands))
                fake.reject_settings = True
                with self.assertRaises(HTTPError) as result:
                    self.post(url, '/api/robot/settings', draft)
                self.assertEqual(json.load(result.exception)['error'], 'settings_write_failed')
                self.assertEqual(robot_state()['settings'], initial)
                fake.reject_settings = False
                self.assertEqual(self.post(url, '/api/robot/settings', draft), dict(ok=True, settings=updated))
                self.assertIn('SETTINGS 1 0', fake.commands)
                self.assertEqual(robot_state()['settings'], updated)
                self.post(url, '/api/robot/disconnect', {})
                self.assertIsNone(robot_state()['settings'])
                replacement = FakeRobot(settings=initial)
                self.post(url, '/api/robot/connect', {'host': '127.0.0.1', 'port': replacement.port})
                with self.assertRaises(HTTPError):
                    self.post(url, '/api/robot/settings', draft)
                self.assertEqual(robot_state()['settings'], initial)
                self.assertFalse(any(line.startswith('SETTINGS ') for line in replacement.commands))
            finally:
                server.robot.disconnect()
                server.shutdown()
                worker.join()

    def test_robot_stop_bypasses_pending_calibration_http_request(self):
        fake = FakeRobot(withhold_ack='CALIBRATE')
        with DashboardServer(('127.0.0.1', 0)) as server:
            worker = threading.Thread(target=server.serve_forever, daemon=True)
            worker.start()
            url = f'http://127.0.0.1:{server.server_port}'
            calibration_finished = threading.Event()
            calibration = None
            try:
                self.post(url, '/api/robot/connect', {'host': '127.0.0.1', 'port': fake.port})
                def calibrate():
                    try:
                        self.post(url, '/api/robot/command', {'command': 'calibrate'})
                    except HTTPError:
                        pass  # The mock deliberately never acknowledges calibration.
                    finally:
                        calibration_finished.set()
                calibration = threading.Thread(target=calibrate)
                calibration.start()
                self.assertTrue(fake.calibrate_received.wait(1))
                self.assertFalse(calibration_finished.is_set())
                self.assertEqual(self.post(url, '/api/robot/command', {'command': 'stop'}), {'ok': True})
                self.assertTrue(fake.stop_received.wait(.5))
                # Stop must reach TCP while another HTTP command still waits for ACK.
                self.assertFalse(calibration_finished.is_set())
                self.assertLess(fake.commands.index('CALIBRATE'), fake.commands.index('STOP'))
            finally:
                server.robot.disconnect()
                if calibration:
                    calibration.join(3)
                fake.thread.join(1)
                server.shutdown()
                worker.join()

    def test_simulation_cancel_http_reaps_worker_and_preserves_exports(self):
        with tempfile.TemporaryDirectory() as directory, DashboardServer(('127.0.0.1', 0)) as server:
            server.simulation.output = Path(directory)
            server.simulation.csv_bytes = b'previous completed CSV'
            server.simulation.xlsx_bytes = b'previous completed workbook'
            worker = threading.Thread(target=server.serve_forever, daemon=True)
            worker.start()
            url = f'http://127.0.0.1:{server.server_port}'
            try:
                self.post(url, '/api/simulation/start', {
                    'mode': 'all_parallel', 'runs': 100, 'seed': 2026, 'live': False,
                })
                self.assertEqual(self.post(url, '/api/simulation/cancel', {}), {'ok': True})
                server.simulation.thread.join(10)
                self.assertFalse(server.simulation.thread.is_alive())
                with urlopen(url + '/api/state') as response:
                    state = json.load(response)['simulation']
                self.assertEqual(state['status'], 'cancelled', state['message'])
                self.assertTrue(state['has_exports'])
                with urlopen(url + '/api/results.csv') as response:
                    self.assertEqual(response.read(), b'previous completed CSV')
                self.assertEqual(list(Path(directory).iterdir()), [])
            finally:
                server.simulation.close()
                server.shutdown()
                worker.join()

    def test_state_origin_and_body_validation(self):
        with DashboardServer(('127.0.0.1', 0)) as server:
            worker = threading.Thread(target=server.serve_forever, daemon=True)
            worker.start()
            url = f'http://127.0.0.1:{server.server_port}'
            try:
                with urlopen(url + '/api/state') as response:
                    self.assertEqual(len(json.load(response)['candidates']), 5)
                for body, headers, status in [
                    (b'{}', {'Content-Type': 'application/json', 'Origin': 'https://example.com'}, 403),
                    (b'[]', {'Content-Type': 'application/json'}, 400),
                    (b'{}', {'Content-Type': 'text/plain'}, 400),
                ]:
                    with self.assertRaises(HTTPError) as result:
                        urlopen(Request(url + '/api/simulation/start', data=body, headers=headers))
                    self.assertEqual(result.exception.code, status)
                with self.assertRaises(HTTPError) as result:
                    urlopen(url + '/api/results.csv')
                self.assertEqual(result.exception.code, 404)
            finally:
                server.shutdown()
                worker.join()


class SimulationChecks(unittest.TestCase):
    def test_real_java_job_and_exports(self):
        with tempfile.TemporaryDirectory() as directory:
            service = SimulationService(directory)
            try:
                service.start(dict(mode='single', selected='sterile', runs=1, seed=2026, live=False))
                service.thread.join(90)
                state = service.snapshot()
                self.assertEqual(state['status'], 'completed', state['message'])
                self.assertEqual(len(state['samples']), 31)
                self.assertEqual(state['summary'][0]['mean_drift_mm'], 0)
                self.assertEqual(len(service.csv_bytes.splitlines()), 32)
                self.assertTrue(service.xlsx_bytes.startswith(b'PK'))
                self.assertTrue((Path(directory) / state['run_id'] / 'results.csv').exists())
            finally:
                service.close()

    def test_input_bounds(self):
        service = SimulationService()
        for options in ({'runs': True}, {'seed': -1}, {'runs': 101}, {'mode': 'bad'}, {'live': 'false'}):
            with self.assertRaises(ValueError):
                service.start(options)


if __name__ == '__main__':
    unittest.main()
