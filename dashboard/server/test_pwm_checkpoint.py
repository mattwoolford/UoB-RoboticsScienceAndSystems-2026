"""Run-boundary recovery and acquisition concurrency without a physical robot."""
import tempfile
import threading
import time
import unittest
from unittest.mock import patch

from openpyxl import load_workbook

from .pwm_sweep import PwmSweep
from .robot import RobotService


def record_run(sweep, number):
    with sweep.lock:
        for pwm in sweep.levels:
            sweep.sample(dict(run=number, pwm=pwm, elapsed_ms=2000, left_delta=pwm, right_delta=pwm,
                              left_rad_s=number + pwm / 10, right_rad_s=number + pwm / 5))


def start(sweep, count):
    batch = sweep.claim(count, None)
    with sweep.lock:
        sweep.begin(batch)
        sweep.acknowledge_start()
    return batch['id']


class CheckpointChecks(unittest.TestCase):
    def test_slow_excel_writer_allows_next_run_and_final_export_recovery_offline(self):
        entered_writer = threading.Event()
        release_writer = threading.Event()
        writer_timed_out = threading.Event()

        def locked_excel(_batch_id):
            entered_writer.set()
            if not release_writer.wait(5):
                writer_timed_out.set()
            raise PermissionError('Excel has the file open')

        with tempfile.TemporaryDirectory() as directory:
            stopped = threading.Event()
            sweep = PwmSweep(threading.RLock(), directory, stopped.set)
            with patch.object(sweep.store, 'publish', side_effect=locked_excel):
                batch_id = start(sweep, 2)
                try:
                    record_run(sweep, 1)
                    self.assertTrue(entered_writer.wait(2))
                    record_run(sweep, 2)
                    deadline = time.monotonic() + 2
                    while sweep.store.describe(batch_id)['saved_runs'] < 2 and time.monotonic() < deadline:
                        time.sleep(0.01)
                    self.assertEqual(sweep.store.describe(batch_id)['saved_runs'], 2)
                    with sweep.lock:
                        self.assertEqual(sweep.state['completed_steps'], 122)
                        self.assertEqual(sweep.state['saved_runs'], 0)
                        sweep.finish()
                finally:
                    release_writer.set()
                    with sweep.lock:
                        sweep.interrupt('cancelled', 'Test finished')
                    sweep.worker.join(5)
                self.assertEqual(sweep.snapshot()['status'], 'failed')
                self.assertIn('Excel has the file open', sweep.snapshot()['message'])
                self.assertFalse(stopped.is_set())
                self.assertFalse(writer_timed_out.is_set())

            # A new backend can finish this batch entirely offline.
            robot = RobotService(directory)
            candidate, = robot.snapshot()['pwm_sweep']['resumable']
            self.assertEqual(candidate['saved_runs'], 2)
            robot.resume_pwm_sweep(candidate['filename'])
            robot.sweep.worker.join(5)
            state = robot.snapshot()['pwm_sweep']
            self.assertEqual((state['status'], state['saved_runs'], state['resumable']), ('completed', 2, []))
            workbook = load_workbook(sweep.store.workbook(batch_id))
            try:
                self.assertEqual(workbook.sheetnames, ['Summary', 'Run 1', 'Run 2'])
                self.assertEqual(workbook['Run 2']['E2'].value, 2)
            finally:
                workbook.close()

    def test_journal_failure_requests_stop_and_keeps_prior_run(self):
        with tempfile.TemporaryDirectory() as directory:
            stopped = threading.Event()
            sweep = PwmSweep(threading.RLock(), directory, stopped.set)
            save = sweep.store.save_run
            publish = sweep.store.publish
            entered_writer = threading.Event()
            release_writer = threading.Event()

            def slow_excel(batch_id):
                entered_writer.set()
                if not release_writer.wait(5):
                    raise RuntimeError('Stop waited for Excel')
                return publish(batch_id)

            def disk_full(batch_id, number, records):
                if number == 2:
                    raise OSError('Disk full')
                save(batch_id, number, records)

            with (patch.object(sweep.store, 'save_run', side_effect=disk_full),
                  patch.object(sweep.store, 'publish', side_effect=slow_excel)):
                start(sweep, 3)
                try:
                    record_run(sweep, 1)
                    self.assertTrue(entered_writer.wait(2))
                    record_run(sweep, 2)
                    self.assertTrue(stopped.wait(3))
                finally:
                    release_writer.set()
                    with sweep.lock:
                        sweep.interrupt('cancelled', 'Test finished')
                    sweep.worker.join(5)
            self.assertEqual(sweep.snapshot()['status'], 'failed')
            self.assertIn('Disk full', sweep.snapshot()['message'])
            candidate, = sweep.resumable()
            self.assertEqual((candidate['runs'], candidate['saved_runs']), (3, 1))
