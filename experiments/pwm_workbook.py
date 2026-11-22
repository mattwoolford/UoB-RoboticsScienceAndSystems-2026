"""Excel export for repeated, equal-PWM wheel-speed sweeps."""
import math

from openpyxl import Workbook
from openpyxl.chart import Reference, ScatterChart, Series
from openpyxl.styles import Alignment, Font, PatternFill

if __package__:
    from .workbook_io import save_workbook_atomic
else:
    from workbook_io import save_workbook_atomic


def _header(sheet, row, labels, widths):
    sheet.sheet_view.showGridLines = False
    sheet.row_dimensions[row].height = 32
    for column, (label, width) in enumerate(zip(labels, widths), 1):
        cell = sheet.cell(row, column, label)
        cell.font = Font(name='Arial', size=10, bold=True, color='FFFFFF')
        cell.fill = PatternFill('solid', fgColor='243E56')
        cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
        sheet.column_dimensions[cell.column_letter].width = width


def write_pwm_workbook(path, runs, *, target_runs=None):
    """Save one ordered sheet per complete run, averaging each wheel at matching PWMs."""
    if not runs or not runs[0]:
        raise ValueError('A PWM workbook requires at least one completed run.')
    levels = [sample['pwm'] for sample in runs[0]]
    if levels != sorted(set(levels)):
        raise ValueError('PWM levels must increase in each run.')

    book = Workbook()
    summary = book.active
    summary.title = 'Summary'
    summary['A2'] = 'Wheel angular velocity by PWM'
    summary['A2'].font = Font(name='Arial', size=14, bold=True, color='243E56')
    progress = f'{len(runs)} completed run{"s" if len(runs) != 1 else ""}'
    if target_runs is not None:
        progress = f'{len(runs)} of {target_runs} run{"s" if target_runs != 1 else ""} complete'
    summary['A3'] = f'{progress} · 2 s samples'
    summary['A3'].font = Font(name='Arial', size=10, color='4F5E69')
    _header(summary, 5, ('PWM', 'Mean left (rad/s)', 'Mean right (rad/s)'), (12, 20, 20))
    summary.freeze_panes = 'A6'

    has_battery = any('battery_mv' in sample for run in runs for sample in run)
    labels = ['PWM', 'Sample time (ms)', 'Left Δ (counts)', 'Right Δ (counts)',
              'Left velocity (rad/s)', 'Right velocity (rad/s)']
    widths = [12, 20, 18, 18, 23, 23]
    if has_battery:
        labels.append('Battery voltage (V)')
        widths.append(20)
    for number, samples in enumerate(runs, 1):
        if [sample['pwm'] for sample in samples] != levels:
            raise ValueError(f'Run {number} has a different set or order of PWM steps.')
        sheet = book.create_sheet(f'Run {number}')
        _header(sheet, 1, labels, widths)
        sheet.freeze_panes = 'A2'
        for index, sample in enumerate(samples, 2):
            values = [sample[key] for key in
                      ('pwm', 'sample_ms', 'left_delta', 'right_delta', 'left_rad_s', 'right_rad_s')]
            if any(not math.isfinite(value) for value in values) or sample['sample_ms'] <= 0:
                raise ValueError(f'Run {number} contains an invalid sample at PWM {sample["pwm"]}.')
            mv = sample.get('battery_mv')
            if mv is not None:
                values.append(mv / 1000)
            sheet.append(values)
            if mv is not None:
                sheet.cell(index, 7).number_format = '0.000'
            for column in (5, 6):
                sheet.cell(index, column).number_format = '0.0000'

    for index, pwm in enumerate(levels, 2):
        row = [pwm]
        for column in ('E', 'F'):
            refs = ','.join(f"'{sheet.title}'!{column}{index}" for sheet in book.worksheets[1:])
            row.append(f'=AVERAGE({refs})')
        summary.append(row)
        for column in (2, 3):
            summary.cell(index + 4, column).number_format = '0.0000'

    chart = ScatterChart()
    chart.title = 'Mean wheel angular velocity'
    chart.x_axis.axPos = 'b'
    chart.x_axis.title = 'PWM'
    chart.x_axis.numFmt = '0'
    chart.x_axis.majorGridlines = None
    if len(levels) > 1:
        step = levels[1] - levels[0]
        chart.x_axis.scaling.min = levels[0]
        chart.x_axis.scaling.max = levels[-1]
        chart.x_axis.minorUnit = step
        chart.x_axis.majorUnit = step * math.ceil((len(levels) - 1) / 6)
        chart.x_axis.minorTickMark = 'out'
        chart.x_axis.majorTickMark = 'out'
    chart.y_axis.title = 'Angular velocity (rad/s)'
    chart.y_axis.numFmt = '0.0'
    chart.legend.position = 'b'
    chart.width, chart.height = 16, 10
    chart.scatterStyle = 'lineMarker'
    x_values = Reference(summary, min_col=1, min_row=6, max_row=summary.max_row)
    for column, name, color, marker in ((2, 'Left wheel', '0072B2', 'circle'),
                                         (3, 'Right wheel', 'D55E00', 'triangle')):
        y_values = Reference(summary, min_col=column, min_row=6, max_row=summary.max_row)
        series = Series(y_values, x_values, title=name)
        series.smooth = False
        series.graphicalProperties.line.solidFill = color
        series.marker.symbol = marker
        series.marker.size = 5
        series.marker.graphicalProperties.solidFill = color
        series.marker.graphicalProperties.line.solidFill = color
        chart.series.append(series)
    summary.add_chart(chart, 'E5')
    book.calculation.calcMode = 'auto'
    save_workbook_atomic(book, path)
