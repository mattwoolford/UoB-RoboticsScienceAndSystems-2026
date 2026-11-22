"""Integration checks for real TCP framing, leases, validation and Java jobs."""
import json
import os
from contextlib import contextmanager
from io import BytesIO
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
        self.sweep_events = []
        self.listener = socket.socket()
        self.listener.bind(('127.0.0.1', 0))
        self.listener.listen()
        self.port = self.listener.getsockname()[1]
        self.commands = []
        self.withhold_ack = withhold_ack
        self.calibrate_received = threading.Event()
        self.stop_received = threading.Event()
        self.drop_connection = threading.Event()
        self.thread = threading.Thread(target=self.run, daemon=True)
        self.thread.start()

    def run(self):
        connection, _ = self.listener.accept()
        connection.settimeout(.1)
        buffer = b''
        state = 'idle'
        try:
            while not self.drop_connection.is_set():
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
                            state = 'idle'
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
                            if command.startswith('START pwm_sweep '):
                                state = 'pwm_sweep'
                                for event in self.sweep_events:
                                    connection.sendall((json.dumps(event) + '\n').encode())
                                    if event['type'] == 'pwm_sweep_done':
                                        state = 'idle'
                sample = dict(type='telemetry', timestamp_ms=100, x_mm=1, y_mm=2,
                              heading_rad=0, left_pwm=0, right_pwm=0, left_count=1,
                              right_count=1, sensors=[0]*5, ready=True, state=state)
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

    def test_interrupted_sweep_resumes_same_workbook_after_restart(self):
        from openpyxl import load_workbook

        @contextmanager
        def dashboard(directory):
            with DashboardServer(('127.0.0.1', 0), directory) as server:
                worker = threading.Thread(target=server.serve_forever)
                worker.start()
                try:
                    yield f'http://127.0.0.1:{server.server_port}'
                finally:
                    server.shutdown()
                    worker.join()

        def get(url):
            with urlopen(url, timeout=3) as response:
                return json.load(response)

        def wait_for(url, predicate):
            deadline = time.monotonic() + 8
            while time.monotonic() < deadline:
                self.post(url, '/api/heartbeat', {})
                state = get(url + '/api/state')['robot']['pwm_sweep']
                if predicate(state):
                    return state
                time.sleep(.02)
            self.fail(f'Unexpected sweep state: {state}')

        def samples(wire_run, velocity):
            return [dict(type='pwm_sample', run=wire_run, pwm=pwm, elapsed_ms=2000,
                         left_delta=10, right_delta=12, left_rad_s=velocity, right_rad_s=velocity + 1)
                    for pwm in range(0, 301, 5)]

        def connect(url, events):
            fake = FakeRobot()
            fake.hello['pwm_sweep'] = True
            fake.sweep_events = events
            self.post(url, '/api/robot/connect', {'host': '127.0.0.1', 'port': fake.port})
            return fake

        files = '/api/results/workbooks'
        resume = '/api/robot/pwm-sweep/resume'
        with tempfile.TemporaryDirectory() as directory:
            with dashboard(directory) as url:
                # The partial second ramp has distinct readings so leakage into the
                # resumed workbook would be visible.
                fake = connect(url, samples(1, 10) + samples(2, 99)[:4])
                self.post(url, '/api/robot/pwm-sweep/start', {'runs': 3})
                recording = wait_for(url, lambda s: s['saved_runs'] == 1 and s['completed_steps'] == 65)
                self.assertEqual(recording['status'], 'running')
                filename = recording['filename']
                self.assertEqual([f['filename'] for f in get(url + files)], [filename])
                with urlopen(url + files + '/' + filename) as response:
                    book = load_workbook(BytesIO(response.read()))
                self.assertEqual(book.sheetnames, ['Summary', 'Run 1'])
                self.assertEqual(book['Run 1']['E62'].value, 10)
                self.assertEqual(len(book['Summary']._charts), 1)
                book.close()
                with self.assertRaises(HTTPError):
                    urlopen(Request(url + files + '/' + filename, method='DELETE'))
                # An independent local API also has to respect the writer's claim.
                with dashboard(directory) as other:
                    with self.assertRaises(HTTPError):
                        urlopen(Request(other + files + '/' + filename, method='DELETE'))
                fake.drop_connection.set()
                wait_for(url, lambda s: s['status'] == 'failed' and s['resumable'])

            with dashboard(directory) as url:
                recovered, = get(url + '/api/state')['robot']['pwm_sweep']['resumable']
                self.assertEqual((recovered['filename'], recovered['saved_runs'], recovered['runs']),
                                 (filename, 1, 3))
                second_run = samples(1, 20)
                for sample in second_run:
                    sample['battery_mv'] = 5320 - sample['pwm']
                second_run[1]['battery_mv'] = None
                second_run[2]['battery_mv'] = False
                fake = connect(url, second_run + samples(2, 30) + [dict(type='pwm_sweep_done')])
                self.post(url, resume, {'filename': filename})
                done = wait_for(url, lambda s: s['status'] == 'completed')
                self.assertEqual((done['saved_runs'], done['completed_steps']), (3, 183))
                self.assertEqual(done['resumable'], [])
                self.assertEqual([c for c in fake.commands if c.startswith('START')], ['START pwm_sweep 2'])
                self.assertEqual([f['filename'] for f in get(url + files)], [filename])
                with urlopen(url + files + '/' + filename) as response:
                    book = load_workbook(BytesIO(response.read()))
                self.assertEqual(book.sheetnames, ['Summary', 'Run 1', 'Run 2', 'Run 3'])
                self.assertIsNone(book['Run 1']['G2'].value)
                self.assertEqual(book['Run 2']['G1'].value, 'Battery voltage (V)')
                self.assertEqual(book['Run 2']['G2'].value, 5.320)
                self.assertIsNone(book['Run 2']['G3'].value)
                self.assertIsNone(book['Run 2']['G4'].value)
                self.assertEqual(book['Run 2']['G62'].value, 5.020)
                for index, expected in enumerate([10, 20, 30], 1):
                    self.assertEqual({row[4] for row in list(book[f'Run {index}'].values)[1:]}, {expected})
                self.assertEqual(len(book['Summary']._charts[0].series), 2)
                book.close()
                with self.assertRaises(HTTPError):
                    self.post(url, resume, {'filename': filename})

    def test_pwm_sweep_workbook_and_interrupted_repeats(self):
        from openpyxl import load_workbook

        fake = FakeRobot()
        steps = [dict(type='pwm_sample', run=run, pwm=pwm, elapsed_ms=2001,
                      left_delta=run*pwm, right_delta=2*run*pwm,
                      left_rad_s=run*pwm/10, right_rad_s=run*pwm/5)
                 for run in (1, 2) for pwm in range(0, 301, 5)]
        with tempfile.TemporaryDirectory() as directory, DashboardServer(('127.0.0.1', 0), directory) as server:
            worker = threading.Thread(target=server.serve_forever, daemon=True)
            worker.start()
            url = f'http://127.0.0.1:{server.server_port}'

            def wait_status(expected):
                deadline = time.monotonic() + 5
                while time.monotonic() < deadline:
                    with urlopen(url + '/api/state') as response:
                        sweep = json.load(response)['robot']['pwm_sweep']
                    if sweep['status'] == expected:
                        return sweep
                    self.post(url, '/api/heartbeat', {})
                    time.sleep(.02)
                self.fail(f'Expected {expected}, observed {sweep}')

            start = '/api/robot/pwm-sweep/start'
            download = url + '/api/robot/pwm-sweep.xlsx'
            try:
                with urlopen(url + '/api/results/workbooks') as response:
                    self.assertEqual(json.load(response), [])
                fake.hello['pwm_sweep'] = True
                self.post(url, '/api/robot/connect', {'host': '127.0.0.1', 'port': fake.port})
                for runs in (0, True, 101, 1.5, '2'):
                    with self.assertRaises(HTTPError):
                        self.post(url, start, {'runs': runs})
                with self.assertRaises(HTTPError) as result:
                    urlopen(download)
                self.assertEqual(result.exception.code, 404)

                fake.sweep_events = [*steps, {'type': 'pwm_sweep_done'}]
                self.post(url, start, {'runs': 2})
                done = wait_status('completed')
                self.assertEqual((done['completed_steps'], done['total_steps']), (122, 122))
                self.assertIn('START pwm_sweep 2', fake.commands)
                with urlopen(download) as response:
                    data = response.read()
                    self.assertIn('attachment;', response.headers['Content-Disposition'])
                with urlopen(url + '/api/results/workbooks') as response:
                    saved, = json.load(response)
                with urlopen(url + '/api/results/workbooks/' + saved['filename']) as response:
                    self.assertEqual(response.read(), data)
                with BytesIO(data) as exported:
                    book = load_workbook(exported)
                    self.assertEqual(book.sheetnames, ['Summary', 'Run 1', 'Run 2'])
                    self.assertEqual(book['Run 2']['A62'].value, 300)
                    self.assertEqual(book['Run 2']['F62'].value, 120)
                    self.assertEqual(len(book['Summary']._charts[0].series), 2)
                    book.close()

                fake.sweep_events = steps[:1]
                self.post(url, start, {'runs': 1})
                self.post(url, '/api/robot/command', {'command': 'stop'})
                stopped = wait_status('cancelled')
                self.assertTrue(stopped['has_export'])
                empty, = stopped['resumable']
                self.assertEqual((empty['saved_runs'], empty['runs']), (0, 1))
                self.assertNotEqual(empty['filename'], saved['filename'])
                with urlopen(Request(url + '/api/results/workbooks/' + empty['filename'], method='DELETE')) as response:
                    self.assertEqual(response.status, 200)
                self.assertEqual(wait_status('cancelled')['resumable'], [])

                fake.sweep_events = [steps[1]]  # PWM 0 is missing.
                self.post(url, start, {'runs': 1})
                self.assertIn('out-of-order', wait_status('failed')['message'])
                with urlopen(download) as response:
                    self.assertEqual(response.read(), data)
                self.assertEqual(len(list(Path(directory).glob('*.xlsx'))), 1)
                with urlopen(Request(url + '/api/results/workbooks/' + saved['filename'], method='DELETE')) as response:
                    self.assertEqual(json.load(response), {'ok': True})
                self.assertFalse(wait_status('failed')['has_export'])
                with self.assertRaises(HTTPError) as missing:
                    urlopen(download)
                self.assertEqual(missing.exception.code, 404)
            finally:
                server.robot.disconnect()
                server.shutdown()
                worker.join()

    def test_saved_simulation_and_sweep_files_survive_a_fresh_session(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            run_id = '1' * 32
            simulation = root / run_id / 'results.xlsx'
            simulation.parent.mkdir()
            simulation.write_bytes(b'saved simulation')
            os.utime(simulation, (1, 1))
            sweep = root / ('pwm-sweep-' + '2' * 32 + '.xlsx')
            sweep.write_bytes(b'saved PWM sweep')
            # The workbook writer's temporary files and incomplete runs stay out of Results.
            (root / 'tmp-unfinished.xlsx').write_bytes(b'in progress')
            (root / ('3' * 32)).mkdir()
            with DashboardServer(('127.0.0.1', 0), root) as server:
                worker = threading.Thread(target=server.serve_forever, daemon=True)
                worker.start()
                url = f'http://127.0.0.1:{server.server_port}/api/results/workbooks'
                try:
                    with urlopen(url) as response:
                        files = json.load(response)
                    self.assertEqual([(file['kind'], file['filename']) for file in files], [
                        ('pwm_sweep', sweep.name), ('simulation', f'simulation-{run_id}.xlsx')])
                    self.assertGreater(files[0]['saved_at'], files[1]['saved_at'])
                    for file, path in zip(files, (sweep, simulation)):
                        with urlopen(f"{url}/{file['filename']}") as response:
                            self.assertEqual(response.read(), path.read_bytes())
                            self.assertEqual(response.headers.get_filename(), file['filename'])
                    with urlopen(Request(f'{url}/{sweep.name}', method='DELETE')) as response:
                        self.assertEqual(response.status, 200)
                    self.assertFalse(sweep.exists())
                    self.assertTrue(simulation.exists())
                    with urlopen(url) as response:
                        self.assertEqual(json.load(response), files[1:])
                    for name in (sweep.name, 'tmp-unfinished.xlsx'):
                        with self.assertRaises(HTTPError) as missing:
                            urlopen(f'{url}/{name}')
                        self.assertEqual(missing.exception.code, 404)
                finally:
                    server.shutdown()
                    worker.join()

    def test_delete_simulation_workbook_keeps_csv(self):
        with tempfile.TemporaryDirectory() as directory, DashboardServer(('127.0.0.1', 0), directory) as server:
            root = Path(directory)
            run_id = 'a' * 32
            folder = root / run_id
            folder.mkdir()
            workbook = folder / 'results.xlsx'
            workbook.write_bytes(b'saved workbook')
            csv = folder / 'results.csv'
            csv.write_bytes(b'saved CSV')
            server.simulation.workbook = workbook
            server.simulation.csv_bytes = csv.read_bytes()
            worker = threading.Thread(target=server.serve_forever, daemon=True)
            worker.start()
            url = f'http://127.0.0.1:{server.server_port}/api'
            target = f'{url}/results/workbooks/simulation-{run_id}.xlsx'
            try:
                for request, status in (
                    (Request(target, method='DELETE', headers={'Origin': 'https://example.com'}), 403),
                    (Request(f'{url}/results/workbooks/{run_id}/results.csv', method='DELETE'), 404),
                ):
                    with self.assertRaises(HTTPError) as rejected:
                        urlopen(request)
                    self.assertEqual(rejected.exception.code, status)
                with urlopen(f'{url}/results.xlsx') as response:
                    self.assertEqual(response.read(), workbook.read_bytes())
                with urlopen(Request(target, method='DELETE')) as response:
                    self.assertEqual(json.load(response), {'ok': True})
                self.assertFalse(workbook.exists())
                self.assertFalse(server.simulation.snapshot()['has_workbook'])
                with self.assertRaises(HTTPError) as missing:
                    urlopen(f'{url}/results.xlsx')
                self.assertEqual(missing.exception.code, 404)
                with urlopen(f'{url}/results.csv') as response:
                    self.assertEqual(response.read(), csv.read_bytes())
            finally:
                server.shutdown()
                worker.join()

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
                self.assertTrue(state['has_workbook'])
                self.assertTrue(service.workbook.read_bytes().startswith(b'PK'))
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
