"""Persistent Excel project: replace selected simulation sheets, retain observations."""
from pathlib import Path
import os
import re
import tempfile

import pandas as pd
from openpyxl import Workbook, load_workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

REAL_SHEET = 'real_world'
COMPARISON_SHEET = 'comparison'
REAL_COLUMNS = ['run_id', 'split', 'elapsed_s', 'centre_x_mm', 'centre_y_mm']
SAMPLE_COLUMNS = ['elapsed_s', 'signed_drift_mm', 'left_mm', 'right_mm',
                  'forward_mm', 'heading_rad', 'odometry_x_mm', 'odometry_y_mm',
                  'left_pwm', 'right_pwm', 'left_count', 'right_count', 'controller_mode',
                  'model_id', 'run_id', 'seed', 'centre_x_mm', 'centre_y_mm',
                  'gain_imbalance', 'motor_tau_ms', 'wheel_noise_fraction',
                  'sensor_noise_counts', 'drive_mode']


def validate_sheet_names(names):
    names = list(names)
    if (any(not isinstance(n, str) or not re.fullmatch(r'[A-Za-z0-9_-]{1,31}', n)
            or n.lower() in {REAL_SHEET, COMPARISON_SHEET, 'history'} for n in names)
            or len({n.lower() for n in names}) != len(names)):
        raise ValueError('Candidate sheet names must be unique (ignoring case), 1–31 '
                         'letters/digits/_/-, and not real_world, comparison or History.')
    return names


def _sheet(book, name, columns, frame=None):
    # Recreate only the selected sheet; shorter reruns cannot leave trailing rows.
    index = book.sheetnames.index(name) if name in book.sheetnames else len(book.sheetnames)
    if name in book.sheetnames:
        del book[name]
    sheet = book.create_sheet(name, index)
    sheet.append(columns)
    if frame is not None:
        for row in frame[columns].itertuples(index=False, name=None):
            sheet.append([None if pd.isna(value) else value for value in row])
    sheet.freeze_panes = 'A2'
    sheet.sheet_view.showGridLines = False
    sheet.auto_filter.ref = sheet.dimensions
    for cell in sheet[1]:
        cell.font = Font(name='Arial', bold=True, color='FFFFFF', size=10)
        cell.fill = PatternFill('solid', fgColor='243E56')
        cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
    sheet.row_dimensions[1].height = 32
    for i, column in enumerate(columns, 1):
        sheet.column_dimensions[get_column_letter(i)].width = max(16, min(28, len(column) + 2))
        for cells in sheet.iter_rows(min_row=2, min_col=i, max_col=i):
            cell = cells[0]
            cell.font = Font(name='Arial', size=10)
            cell.number_format = ('@' if column in {'seed', 'run_id', 'model_id', 'drive_mode'}
                                  else '0.0000' if column.endswith(('_mm', '_rad', '_fraction'))
                                  or column == 'gain_imbalance' else 'General')


def _save_atomic(book, path):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(suffix='.xlsx', dir=path.parent)
    os.close(fd)
    try:
        book.save(temporary)
        os.replace(temporary, path)
    finally:
        Path(temporary).unlink(missing_ok=True)
        book.close()


def comparison_rows(book):
    """Excel formulas compare final (30 s) samples, equally weighting each trial."""
    rows = []
    for sheet in book:
        if [c.value for c in sheet[1]] != SAMPLE_COLUMNS:
            continue
        row = len(rows) + 6
        last = max(32, sheet.max_row)
        prefix = "'" + sheet.title.replace("'", "''") + "'!"
        times = f'{prefix}$A$2:$A${last}'
        drift = f'{prefix}$B$2:$B${last}'
        forward = f'{prefix}$E$2:$E${last}'
        rows.append([
            sheet.title,
            f'=COUNTIFS({times},30)',
            f'=IF(B{row}=0,"",SUMIFS({drift},{times},30)/B{row})',
            f'=IF(B{row}=0,"",(SUMIFS({drift},{times},30,{drift},">=0")-SUMIFS({drift},{times},30,{drift},"<0"))/B{row})',
            f'=IF(B{row}<2,"",SQRT(SUMPRODUCT(({times}=30)*({drift}-N(C{row}))^2)/(B{row}-1)))',
            f'=IF(B{row}=0,"",SQRT(SUMPRODUCT(({times}=30)*{drift}*{drift})/B{row}))',
            f'=IF(B{row}=0,"",SUMIFS({forward},{times},30)/B{row})',
            f'=IF(B{row}=0,"No results",IF(B{row}=1,"Single trial","Repeated trials"))',
        ])
    return rows


COMPARISON_HEADERS = ['Candidate', 'Trials at 30 s', 'Mean signed drift (mm)',
                      'Mean absolute drift (mm)', 'Drift SD (mm)', 'RMS drift (mm)',
                      'Mean forward travel (mm)', 'Status']
COMPARISON_NOTES = [
    'Final position at 30 s. Positive drift is left; negative drift is right.',
    'All stored candidates are compared. Unselected sheets may contain results from earlier runs.',
    'Lower absolute/RMS drift means straighter travel, not a better fit to hardware. SD needs at least two trials.',
]


def refresh_comparison(book):
    """Rebuild formula bounds after overwrites; Excel recalculates when opened."""
    from openpyxl.workbook.properties import CalcProperties
    rows = comparison_rows(book)
    if COMPARISON_SHEET in book.sheetnames:
        del book[COMPARISON_SHEET]
    sheet = book.create_sheet(COMPARISON_SHEET)
    sheet.sheet_view.showGridLines = False
    sheet['A1'] = 'Candidate comparison'
    sheet['A1'].font = Font(name='Arial', size=14, bold=True)
    for index, note in enumerate(COMPARISON_NOTES, 2):
        sheet.cell(index, 1, note)
    sheet.append(COMPARISON_HEADERS)
    for values in rows:
        sheet.append(values)
    for cell in sheet[5]:
        cell.font = Font(name='Arial', size=10, bold=True, color='FFFFFF')
        cell.fill = PatternFill('solid', fgColor='243E56')
        cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
    sheet.row_dimensions[5].height = 36
    for column in range(1, 9):
        sheet.column_dimensions[get_column_letter(column)].width = 25 if column != 2 else 16
    for cells in sheet.iter_rows(min_row=6, max_row=5 + len(rows)):
        for cell in cells:
            cell.font = Font(name='Arial', size=10)
            if 3 <= cell.column <= 7:
                cell.number_format = '0.0000'
    book.calculation = CalcProperties(calcId=0, fullCalcOnLoad=True, forceFullCalc=True,
                                     calcMode='auto')


def ensure_workbook(path, candidates):
    """Create missing template sheets, never clear existing observations/results."""
    names = validate_sheet_names(['sterile', *(c['model_id'] for c in candidates)])
    path = Path(path)
    book = load_workbook(path) if path.exists() else Workbook()
    if not path.exists():
        book.remove(book.active)
    changed = False
    for name in [*names, REAL_SHEET]:
        if name not in book.sheetnames:
            _sheet(book, name, REAL_COLUMNS if name == REAL_SHEET else SAMPLE_COLUMNS)
            changed = True
    if changed or COMPARISON_SHEET not in book.sheetnames:
        refresh_comparison(book)
        _save_atomic(book, path)
    else:
        book.close()
    return path


def write_simulations(path, frames):
    """Commit a completed selection in one save; preserve every other sheet."""
    validate_sheet_names(frames)
    for name, frame in frames.items():
        if set(SAMPLE_COLUMNS) - set(frame.columns) or frame.empty:
            raise ValueError(f'{name}: incomplete simulation data')
        if not frame.model_id.eq(name).all():
            raise ValueError(f'{name}: model IDs do not match the sheet')
    book = load_workbook(path)
    for name, frame in frames.items():
        frame = frame.copy()
        # Excel numeric cells retain only 15 significant digits. Seeds are identifiers.
        frame['seed'] = frame.seed.map(str)
        _sheet(book, name, SAMPLE_COLUMNS, frame)
    refresh_comparison(book)
    _save_atomic(book, path)


def read_simulations(path, model_ids):
    names = validate_sheet_names(model_ids)
    frames = pd.read_excel(path, sheet_name=names, engine='openpyxl',
                           dtype={'seed': 'int64', 'run_id': str})
    return pd.concat(frames.values(), ignore_index=True)
