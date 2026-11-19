"""Line-framed TCP adapter with separate browser and firmware safety leases."""
from collections import deque
import copy
import errno
import ipaddress
import json
import math
import socket
import threading
import time
import uuid


def drift_settings(values):
    """Only accept actual booleans for the two persisted firmware flags."""
    keys = ('drift_correction', 'drift_path_recovery')
    if not isinstance(values, dict) or any(type(values.get(key)) is not bool for key in keys):
        raise ValueError('Both drift feature flags must be boolean values.')
    return {key: values[key] for key in keys}


def connection_error_message(error, host, port):
    """Translate transport errors without pretending to know the network's cause."""
    endpoint = f'{host}:{port}'
    permission_hint = (
        'On macOS, check System Settings > Privacy & Security > Local Network '
        'for the app running pnpm dev (for example, Terminal or CLion), then restart dev.'
    )
    if isinstance(error, OSError) and error.errno in {errno.EHOSTUNREACH, errno.ENETUNREACH}:
        return (
            f'Cannot reach robot at {endpoint}: {error}. '
            'Connect the computer running the Python backend to the selected robot’s '
            'WiFi network, confirm its IP, and check whether a VPN is routing '
            f'the connection elsewhere. {permission_hint}'
        )
    if isinstance(error, OSError) and error.errno == errno.ECONNREFUSED:
        return (
            f'Connection refused by {endpoint}: {error}. '
            'Confirm the IP and TCP port (normally 192.168.4.1:80), and that the '
            'robot is powered on with the dashboard firmware running.'
        )
    if isinstance(error, (TimeoutError, socket.timeout)):
        return (
            f'Connection to robot at {endpoint} timed out: {error}. '
            'Check robot power, the computer’s robot-WiFi connection, the IP and '
            'port, and any VPN or network filter that could block the connection.'
        )
    if isinstance(error, OSError) and error.errno in {errno.EACCES, errno.EPERM}:
        return f'Network access to {endpoint} was denied: {error}. {permission_hint}'
    # Keep protocol/handshake failures intact: networking advice would obscure them.
    return str(error)


class RobotService:
    """Maintain one hardware connection; never keep moving for an absent browser."""

    def __init__(self):
        self.lock = threading.RLock()
        self.write_lock = threading.RLock()
        self.stop_generation = 0
        self.command_lock = threading.Lock()
        self.sock = None
        self.thread = None
        self.stop_event = threading.Event()
        self.hello_event = threading.Event()
        self.telemetry_event = threading.Event()
        self.ack_event = threading.Event()
        self.pending = None
        self.ack = None
        self.last_browser = 0
        self.last_telemetry = 0
        self.state = dict(status='disconnected', message='Connect to the robot WiFi first.',
                          telemetry=None, settings=None, connection_id=None)
        self.history = deque(maxlen=600)

    def snapshot(self):
        """Return a consistent, bounded history for browser plots."""
        with self.lock:
            return {**copy.deepcopy(self.state), 'history': list(self.history)}

    def heartbeat(self):
        """Only explicit browser heartbeats renew the motor-control lease."""
        with self.lock:
            self.last_browser = time.monotonic()

    def connect(self, host='192.168.4.1', port=80):
        """Only numeric local-network addresses are accepted; verify protocol v1."""
        address = ipaddress.ip_address(host)
        if not (address.is_private or address.is_loopback) or address.is_unspecified or address.is_multicast:
            raise ValueError('Use the robot’s local WiFi IP address.')
        if type(port) is not int or not 1 <= port <= 65535:
            raise ValueError('Port must be an integer between 1 and 65535.')
        with self.command_lock:
            self.disconnect()
            with self.lock:
                self.state.update(status='connecting', message='Opening robot connection…', telemetry=None)
                self.history.clear()
            try:
                connection = socket.create_connection((str(address), port), timeout=2)
                connection.settimeout(.1)
                self.sock = connection
                self.stop_event = threading.Event()
                self.hello_event.clear()
                self.telemetry_event.clear()
                self.heartbeat()
                self.last_telemetry = time.monotonic()
                self.thread = threading.Thread(target=self._listen, args=(connection,), daemon=True)
                self.thread.start()
                self._send('HELLO')
                if not self.hello_event.wait(1) or not self.telemetry_event.wait(1):
                    raise ValueError('Robot did not provide protocol v1 HELLO and telemetry. Flash the dashboard firmware.')
                with self.lock:
                    if self.state['status'] == 'error':
                        raise ValueError(self.state['message'])
                    self.state.update(status='connected', message=f'Connected to {address}:{port} over WiFi.',
                                      connection_id=uuid.uuid4().hex)
            except Exception as error:
                self.disconnect()
                message = connection_error_message(error, str(address), port)
                with self.lock:
                    self.state.update(status='error', message=message)
                raise ValueError(message) from error

    def _send(self, line):
        """Serialize complete lines so heartbeats cannot split motor commands."""
        with self.write_lock:
            if self.sock is None:
                raise ValueError('Robot is disconnected.')
            self.sock.sendall((line + '\n').encode('ascii'))

    def command(self, command, procedure=None):
        """Wait for firmware acknowledgement, never report an unconfirmed start."""
        commands = {'stop': 'STOP', 'calibrate': 'CALIBRATE', 'start': 'START'}
        if command not in commands:
            raise ValueError('Unknown robot command.')
        if command == 'start' and procedure not in {'open_loop', 'line_follow', 'motor_test'}:
            raise ValueError('Unknown robot procedure.')
        wire = commands[command]
        # STOP bypasses pending start/calibration acknowledgements for prompt delivery.
        if command == 'stop':
            with self.write_lock:
                self.stop_generation += 1
                self._send('STOP')
            return
        self._request(wire, wire + (' ' + procedure if command == 'start' else ''))

    def set_settings(self, options):
        """Save both flags on the same robot connection that supplied the draft."""
        settings = drift_settings(options)
        connection_id = options.get('connection_id')
        if not isinstance(connection_id, str) or not connection_id:
            raise ValueError('Robot settings require the current connection ID.')
        line = 'SETTINGS {} {}'.format(int(settings['drift_correction']), int(settings['drift_path_recovery']))
        return self._request('SETTINGS', line, connection_id)['settings']

    def _request(self, wire, line, connection_id=None):
        """Serialize acknowledged commands while keeping STOP available."""
        with self.write_lock:
            generation = self.stop_generation
        with self.command_lock:
            with self.lock:
                if self.state['status'] != 'connected':
                    raise ValueError('Connect the robot before sending commands.')
                if connection_id is not None:
                    if self.state['connection_id'] != connection_id:
                        raise ValueError('The robot connection changed. Reopen Settings and try again.')
                    if self.state['settings'] is None:
                        raise ValueError('Connected firmware does not support drift settings.')
                if time.monotonic() - self.last_browser > 1.2:
                    raise ValueError('Browser heartbeat expired; reconnect the robot.')
                self.pending, self.ack = wire, None
                self.ack_event.clear()
            try:
                with self.write_lock:
                    if generation != self.stop_generation:
                        raise ValueError('Command cancelled by Stop.')
                    self._send(line)
                if not self.ack_event.wait(2):
                    # A lost ACK must not leave motion running with an ambiguous UI.
                    self.disconnect()
                    raise ValueError('Robot acknowledgement timed out; disconnected and stop requested.')
                if self.ack.get('ok') is not True:
                    raise ValueError(self.ack.get('error', 'Robot rejected the command.'))
                if wire == 'START':
                    # Each start resets firmware odometry; never join separate trial paths.
                    with self.lock:
                        self.history.clear()
                return self.ack
            finally:
                with self.lock:
                    self.pending = None

    def _record(self, record):
        """Reject malformed/nonfinite telemetry before it can poison charts or JSON."""
        # Compatibility is determined by protocol version, never the optional
        # robot label or WiFi SSID. Different robots can share the same AP address.
        if record.get('type') == 'hello' and record.get('protocol') == 1:
            with self.lock:
                self.state['settings'] = (drift_settings(record['settings'])
                                          if record.get('settings') is not None else None)
                self.hello_event.set()
        elif record.get('type') == 'ack':
            with self.lock:
                if record.get('command') == self.pending:
                    if self.pending == 'SETTINGS' and record.get('ok') is True:
                        self.state['settings'] = drift_settings(record.get('settings'))
                        record['settings'] = self.state['settings']
                    self.ack = record
                    self.ack_event.set()
        elif record.get('type') == 'telemetry':
            fields = ('timestamp_ms', 'x_mm', 'y_mm', 'heading_rad', 'left_pwm',
                      'right_pwm', 'left_count', 'right_count')
            values = [record.get(key) for key in fields]
            sensors = record.get('sensors', [])
            if not isinstance(sensors, list) or len(sensors) != 5:
                raise ValueError('Invalid robot sensor telemetry.')
            if any(type(v) not in (float, int) or not math.isfinite(v) for v in values + sensors):
                raise ValueError('Invalid numeric robot telemetry.')
            if not isinstance(record.get('state'), str) or type(record.get('ready')) is not bool:
                raise ValueError('Invalid robot state telemetry.')
            record['pose_source'] = 'odometry'
            with self.lock:
                self.state['telemetry'] = record
                self.history.append(record)
                self.last_telemetry = time.monotonic()
                self.telemetry_event.set()

    def _listen(self, connection):
        """Frame partial TCP reads and enforce both client and telemetry timeouts."""
        buffer = b''
        last_ping = 0
        try:
            while not self.stop_event.is_set():
                now = time.monotonic()
                if now - self.last_browser > 1.5:
                    raise ValueError('Browser heartbeat lost; robot stopped. Reconnect to resume.')
                if now - self.last_telemetry > 2:
                    raise ValueError('Robot telemetry timed out; stop requested.')
                if now - last_ping >= .4:
                    self._send('PING')
                    last_ping = now
                try:
                    data = connection.recv(4096)
                except socket.timeout:
                    continue
                if not data:
                    raise ValueError('Robot connection closed.')
                buffer += data
                while b'\n' in buffer:
                    line, buffer = buffer.split(b'\n', 1)
                    if len(line) > 4096:
                        raise ValueError('Robot message exceeded protocol size.')
                    record = json.loads(line)
                    if not isinstance(record, dict):
                        raise ValueError('Invalid robot protocol message.')
                    self._record(record)
                if len(buffer) > 4096:
                    raise ValueError('Robot message exceeded protocol size.')
        except (OSError, ValueError) as error:
            if not self.stop_event.is_set():
                with self.lock:
                    self.state.update(status='error', message=str(error), settings=None, connection_id=None)
        finally:
            with self.write_lock:
                try:
                    connection.sendall(b'STOP\n')
                except OSError:
                    pass
                connection.close()
            with self.lock:
                if self.pending and not self.ack_event.is_set():
                    self.ack = {'ok': False, 'error': 'Robot disconnected; stop requested.'}
                    self.ack_event.set()

    def disconnect(self):
        """Request an immediate stop, then drop TCP so firmware also sees lease loss."""
        self.stop_event.set()
        try:
            if self.sock:
                self._send('STOP')
                self.sock.shutdown(socket.SHUT_RDWR)
        except (OSError, ValueError):
            pass
        if self.thread and self.thread is not threading.current_thread():
            self.thread.join(timeout=3)
        if self.sock:
            self.sock.close()
        self.sock = None
        with self.lock:
            self.state.update(status='disconnected', message='Robot disconnected.', telemetry=None,
                              settings=None, connection_id=None)
            self.history.clear()
