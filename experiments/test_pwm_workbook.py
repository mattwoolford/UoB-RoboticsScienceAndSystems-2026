"""Check the sheet layout, wheel means, and XY chart in the saved workbook."""
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from openpyxl import load_workbook
from openpyxl.chart import ScatterChart

from pwm_workbook import write_pwm_workbook


def sample(pwm, left, right):
    return dict(pwm=pwm, sample_ms=2000, left_delta=left * 100, right_delta=right * 100,
                left_rad_s=left, right_rad_s=right)


class PwmWorkbookTests(unittest.TestCase):
    def test_runs_and_chart_references(self):
        runs = [[sample(pwm, pwm / 10, pwm / 5) for pwm in range(0, 301, 5)],
                [sample(pwm, pwm / 5, pwm / 4) for pwm in range(0, 301, 5)]]
        with TemporaryDirectory() as directory:
            path = Path(directory) / 'sweep.xlsx'
            for count in (1, 2):
                with self.subTest(count=count):
                    write_pwm_workbook(path, runs[:count])
                    book = load_workbook(path)
                    self.assertEqual(book.sheetnames, ['Summary', 'Run 1', 'Run 2'][:count + 1])
                    summary = book['Summary']
                    for index in range(count):
                        row = list(book[f'Run {index + 1}'].values)[-1]
                        result = runs[index][-1]
                        self.assertEqual(row, (300, 2000, result['left_delta'], result['right_delta'],
                                               result['left_rad_s'], result['right_rad_s']))
                    for row, pwm in enumerate(range(0, 301, 5), 6):
                        self.assertEqual(summary[f'A{row}'].value, pwm)
                        for output, source in (('B', 'E'), ('C', 'F')):
                            refs = ','.join(f"'Run {i + 1}'!{source}{row - 4}"
                                            for i in range(count))
                            self.assertEqual(summary[f'{output}{row}'].value, f'=AVERAGE({refs})')
                    chart, = summary._charts
                    self.assertIsInstance(chart, ScatterChart)
                    self.assertEqual(chart.x_axis.axPos, 'b')
                    self.assertEqual(chart.x_axis.scaling.min, 0)
                    self.assertEqual(chart.x_axis.scaling.max, 300)
                    self.assertEqual(chart.x_axis.minorUnit, 5)
                    self.assertEqual(chart.x_axis.minorTickMark, 'out')
                    self.assertEqual(chart.x_axis.majorUnit, 50)
                    self.assertEqual(chart.y_axis.axPos, 'l')
                    self.assertEqual(len(chart.series), 2)
                    for series, column in zip(chart.series, 'BC'):
                        self.assertEqual(series.xVal.numRef.f, "'Summary'!$A$6:$A$66")
                        self.assertEqual(series.yVal.numRef.f, f"'Summary'!${column}$6:${column}$66")
                    book.close()

    def test_incomplete_or_misaligned_runs_preserve_previous_workbook(self):
        complete = [sample(0, 0, 0), sample(20, 2, 3)]
        with TemporaryDirectory() as directory:
            path = Path(directory) / 'sweep.xlsx'
            write_pwm_workbook(path, [complete])
            saved = path.read_bytes()
            for second_run in ([], list(reversed(complete)), [complete[0], sample(40, 2, 3)],
                               [complete[0], sample(20, float('nan'), 2)]):
                with self.subTest(second_run=second_run):
                    with self.assertRaises(ValueError):
                        write_pwm_workbook(path, [complete, second_run])
                    self.assertEqual(path.read_bytes(), saved)


if __name__ == '__main__':
    unittest.main()
