"""Connection diagnostics preserve the OS cause without touching a robot/socket."""
import errno
import unittest
from unittest.mock import patch

from .robot import RobotService, connection_error_message


class ConnectionErrorChecks(unittest.TestCase):
    def test_network_failures_have_actionable_messages_and_original_causes(self):
        # Exercise connect's public error and state rather than only its formatter.
        cases = [
            (OSError(errno.EHOSTUNREACH, 'No route to host'), 'selected robot', 'Local Network'),
            (OSError(errno.ENETUNREACH, 'Network unreachable'), 'VPN', 'Local Network'),
            (ConnectionRefusedError(errno.ECONNREFUSED, 'Connection refused'), 'TCP port', 'firmware'),
            (TimeoutError('timed out'), 'timed out', 'robot power'),
            (PermissionError(errno.EACCES, 'Permission denied'), 'denied', 'Local Network'),
            (PermissionError(errno.EPERM, 'Operation not permitted'), 'denied', 'CLion'),
        ]
        for error, first, second in cases:
            with self.subTest(error=error), patch('dashboard.server.robot.socket.create_connection', side_effect=error):
                service = RobotService()
                with self.assertRaises(ValueError) as result:
                    service.connect()
                message = str(result.exception)
                self.assertIn('192.168.4.1:80', message)
                self.assertIn(str(error), message)
                self.assertIn(first, message)
                self.assertIn(second, message)
                self.assertIs(result.exception.__cause__, error)
                self.assertEqual(service.snapshot()['status'], 'error')
                self.assertEqual(service.snapshot()['message'], message)
                self.assertIsNone(service.sock)

    def test_protocol_error_is_not_rewritten_as_network_failure(self):
        error = ValueError('Robot did not provide protocol v1 HELLO and telemetry.')
        self.assertEqual(connection_error_message(error, '192.168.4.1', 80), str(error))


if __name__ == '__main__':
    unittest.main()
