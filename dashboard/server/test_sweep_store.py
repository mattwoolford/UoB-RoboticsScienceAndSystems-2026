"""PWM workbook checkpoints remain usable across export failures and process restarts."""
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

from openpyxl import load_workbook

from .sweep_store import SweepStore


def samples(number):
    return [dict(pwm=pwm, sample_ms=2000, left_delta=number, right_delta=-number,
                 left_rad_s=number + pwm / 100, right_rad_s=-number)
            for pwm in range(0, 301, 5)]


class SweepStoreTests(unittest.TestCase):
    def test_resume_with_workbook_one_run_behind_journal(self):
        with tempfile.TemporaryDirectory() as folder:
            store = SweepStore(folder)
            batch = store.create(3)
            first = samples(1)
            store.save_run(batch, 1, first)
            self.assertEqual(store.publish(batch), 1)
            path = store.workbook(batch)
            previous = path.read_bytes()
            store.save_run(batch, 2, samples(2))
            with patch('dashboard.server.sweep_store.write_pwm_workbook', side_effect=PermissionError):
                with self.assertRaises(PermissionError):
                    store.publish(batch)
            self.assertEqual(path.read_bytes(), previous)
            store.release(batch)

            restarted = SweepStore(folder)
            state, = restarted.unfinished()
            self.assertEqual((state['id'], state['saved_runs']), (batch, 2))
            restarted.acquire(batch)
            self.assertEqual(restarted.describe(batch)['published_runs'], 1)
            restarted.save_run(batch, 2, samples(2))
            with self.assertRaises(ValueError):
                restarted.save_run(batch, 2, first)
            restarted.save_run(batch, 3, samples(3))
            self.assertEqual(restarted.publish(batch), 3)
            restarted.discard(batch)
            restarted.release(batch)
            self.assertEqual(restarted.unfinished(), [])
            book = load_workbook(path)
            self.assertEqual(book.sheetnames, ['Summary', 'Run 1', 'Run 2', 'Run 3'])
            self.assertEqual(book['Summary']['A3'].value, '3 of 3 runs complete · 2 s samples')
            self.assertEqual(book['Summary']['B6'].value, "=AVERAGE('Run 1'!E2,'Run 2'!E2,'Run 3'!E2)")
            self.assertEqual(book['Run 3']['E62'].value, 6)
            book.close()
            restarted.delete_workbook(batch)
            self.assertFalse(path.exists())

    def test_claims_survive_contention_and_expire_on_process_death(self):
        with tempfile.TemporaryDirectory() as folder:
            code = (
                "import os, sys; from dashboard.server.sweep_store import SweepStore; "
                "store = SweepStore(sys.argv[1]); print(store.create(5), flush=True); os._exit(0)"
            )
            batch = subprocess.check_output([sys.executable, '-c', code, folder], text=True).strip()
            first, second = SweepStore(folder), SweepStore(folder)
            self.assertEqual([job['id'] for job in first.unfinished()], [batch])
            first.acquire(batch)
            self.assertEqual(second.unfinished(), [])
            with self.assertRaisesRegex(ValueError, 'already in use'):
                second.delete_workbook(batch)
            with self.assertRaisesRegex(ValueError, 'already in use'):
                second.acquire(batch)
            first.release(batch)
            # An abandoned sweep can be discarded even before the first workbook exists.
            second.delete_workbook(batch)
            self.assertEqual(first.unfinished(), [])
            with self.assertRaises(FileNotFoundError):
                first.delete_workbook(batch)

    def test_broken_manifest_does_not_hide_other_interrupted_batches(self):
        with tempfile.TemporaryDirectory() as folder:
            store = SweepStore(folder)
            broken = store.create(2)
            store.release(broken)
            (store.journals / broken / 'target.json').write_text('damaged', encoding='utf-8')
            recoverable = store.create(4)
            store.release(recoverable)
            self.assertEqual([job['id'] for job in store.unfinished()], [recoverable])


if __name__ == '__main__':
    unittest.main()
