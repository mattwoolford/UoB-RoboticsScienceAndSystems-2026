"""Shared atomic save for experiment workbooks."""
import os
from pathlib import Path
import tempfile


def save_workbook_atomic(book, path):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(suffix='.xlsx', dir=path.parent)
    try:
        with os.fdopen(fd, 'wb') as stream:
            book.save(stream)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    finally:
        Path(temporary).unlink(missing_ok=True)
        book.close()
