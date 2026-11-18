"""Excel round-trip, replacement, and physical-data preservation checks."""
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import pandas as pd
from openpyxl import load_workbook

from analysis import load_observations
from simulation_runner import SimulationRunner
from workbook_results import ensure_workbook, read_simulations, validate_sheet_names

ROOT = Path(__file__).resolve().parents[1]


class WorkbookChecks(unittest.TestCase):
    def test_replace_preserve_and_failure(self):
        candidates = [dict(model_id='noisy', wheel_noise_fraction=.02)]
        with tempfile.TemporaryDirectory() as folder, SimulationRunner(ROOT) as runner:
            path = Path(folder) / 'results.xlsx'
            ensure_workbook(path, candidates)
            book = load_workbook(path)
            sheet = book['real_world']
            for time in [3, 4, 5]:
                sheet.append(['001', 'train', time, time * 50, 1.5])
            sheet['A2'].number_format = '@'
            book.save(path)
            book.close()
            runner.run_workbook(path, candidates, runs=2, mode='all_parallel', seed=2**60)
            before = read_simulations(path, ['sterile', 'noisy'])
            self.assertEqual(len(before), 93)
            book = load_workbook(path)
            self.assertIn('comparison', book.sheetnames)
            self.assertIn("'noisy'!$A$2:$A$63", book['comparison']['B7'].value)
            book.close()
            self.assertEqual(set(before.seed), {2**60, 2**60 + 1})
            observations = load_observations(path, [3, 4, 5])
            self.assertEqual(observations.run_id.tolist(), ['001'] * 3)
            runner.run_workbook(path, candidates, mode='single', selected='noisy', runs=1, seed=55)
            after = read_simulations(path, ['sterile', 'noisy'])
            self.assertEqual(len(after), 62)
            book = load_workbook(path)
            self.assertIn("'noisy'!$A$2:$A$32", book['comparison']['B7'].value)
            self.assertNotIn('#REF!', book['comparison']['D7'].value)
            self.assertEqual(book.calculation.calcMode, 'auto')
            book.close()
            self.assertEqual(set(after.loc[after.model_id == 'noisy', 'seed']), {55})
            pd.testing.assert_frame_equal(before[before.model_id == 'sterile'],
                                          after[after.model_id == 'sterile'])
            pd.testing.assert_frame_equal(observations, load_observations(path, [3, 4, 5]))
            saved = path.read_bytes()
            with patch.object(runner, 'run_candidates', side_effect=RuntimeError('cancelled')):
                with self.assertRaises(RuntimeError):
                    runner.run_workbook(path, candidates)
            self.assertEqual(saved, path.read_bytes())
            self.assertEqual(list(Path(folder).glob('*.csv')), [])

    def test_template_and_names(self):
        with tempfile.TemporaryDirectory() as folder:
            path = ensure_workbook(Path(folder) / 'blank.xlsx', [])
            self.assertTrue(load_observations(path, [3, 4, 5]).empty)
            self.assertTrue(read_simulations(path, ['sterile']).empty)
        for names in [['real_world'], ['comparison'], ['a', 'A'], ['x'*32], ['History']]:
            with self.assertRaises(ValueError):
                validate_sheet_names(names)


if __name__ == '__main__':
    unittest.main()
