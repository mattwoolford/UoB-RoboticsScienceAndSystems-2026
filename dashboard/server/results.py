"""Discover completed Excel exports in the dashboard results directory."""
from datetime import datetime, timezone
import re


def workbook_available(path):
    return path is not None and not path.parent.is_symlink() and not path.is_symlink() and path.is_file()


def workbook_path(directory, filename):
    """Map a download name to one of the two layouts written by the dashboard."""
    match = re.fullmatch(r'(pwm-sweep|simulation)-([0-9a-f]{32})\.xlsx', filename)
    if not match:
        return None
    kind, run_id = match.groups()
    path = directory / run_id / 'results.xlsx' if kind == 'simulation' else directory / filename
    return path if workbook_available(path) else None


def list_workbooks(directory):
    files = []
    for entry in directory.glob('*'):
        if entry.name.startswith('pwm-sweep-'):
            kind, filename = 'pwm_sweep', entry.name
        elif entry.is_dir():
            kind, filename = 'simulation', f'simulation-{entry.name}.xlsx'
        else:
            continue
        path = workbook_path(directory, filename)
        if path is None:
            continue
        try:
            saved = datetime.fromtimestamp(path.stat().st_mtime, timezone.utc)
        except FileNotFoundError:
            continue
        files.append(dict(kind=kind, filename=filename, saved_at=saved.isoformat()))
    return sorted(files, key=lambda file: (file['saved_at'], file['filename']), reverse=True)
