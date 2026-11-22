"""Durable completed PWM runs and their downloadable Excel checkpoint."""
import contextlib
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
import shutil
import tempfile
import threading
import uuid
from xml.etree import ElementTree
from zipfile import BadZipFile, ZipFile

from .results import workbook_available

if os.name == 'nt':
    import msvcrt
else:
    import fcntl

try:
    from experiments.pwm_workbook import write_pwm_workbook
except ImportError:
    write_pwm_workbook = None


def _sync_directory(path):
    if os.name != 'nt':
        fd = os.open(path, os.O_RDONLY)
        try:
            os.fsync(fd)
        finally:
            os.close(fd)


def _write_json(path, value):
    """Readers see either a whole committed run or its predecessor."""
    fd, temporary = tempfile.mkstemp(dir=path.parent, suffix='.tmp')
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as stream:
            json.dump(value, stream, separators=(',', ':'), allow_nan=False)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
        _sync_directory(path.parent)
    finally:
        Path(temporary).unlink(missing_ok=True)


def _published_runs(path):
    if not workbook_available(path):
        return 0
    try:
        with ZipFile(path) as archive:
            workbook = ElementTree.fromstring(archive.read('xl/workbook.xml'))
        names = [sheet.get('name') for sheet in workbook.findall('{*}sheets/{*}sheet')]
        expected = ['Summary'] + [f'Run {i}' for i in range(1, len(names))]
        return len(names) - 1 if names == expected else 0
    except (OSError, BadZipFile, KeyError, ElementTree.ParseError):
        # The journal can still restore a workbook that was damaged or is unavailable.
        return 0


class SweepStore:
    def __init__(self, directory):
        self.directory = Path(directory)
        self.journals = self.directory / '.pwm-sweeps'
        self.claims = {}
        self.lock = threading.RLock()

    def _directory(self, batch_id):
        if not isinstance(batch_id, str) or not re.fullmatch(r'[a-f0-9]{32}', batch_id):
            raise ValueError('Invalid PWM sweep identifier.')
        directory = self.journals / batch_id
        if self.journals.is_symlink() or directory.is_symlink():
            raise ValueError('Invalid PWM checkpoint directory.')
        return directory

    def workbook(self, batch_id):
        self._directory(batch_id)
        return self.directory / f'pwm-sweep-{batch_id}.xlsx'

    @staticmethod
    def require_exporter():
        if write_pwm_workbook is None:
            raise ValueError('Install the experiment workbook dependencies and restart the dashboard.')

    def create(self, runs):
        self.require_exporter()
        if type(runs) is not int or not 1 <= runs <= 100:
            raise ValueError('Sweep runs must be an integer between 1 and 100.')
        batch_id = uuid.uuid4().hex
        directory = self._directory(batch_id)
        directory.mkdir(parents=True)
        # A journal is discoverable only after its manifest is committed under the lock.
        try:
            self._claim(batch_id)
            _write_json(directory / 'target.json', runs)
            _sync_directory(self.journals)
            _sync_directory(self.directory)
        except BaseException:
            shutil.rmtree(directory, ignore_errors=True)
            self.release(batch_id)
            raise
        return batch_id

    def _claim(self, batch_id):
        with self.lock:
            message = 'This PWM sweep is already in use by a dashboard.'
            if batch_id in self.claims:
                raise ValueError(message)
            # A sibling lock keeps the journal removable while claimed on Windows.
            path = self._directory(batch_id).with_suffix('.lock')
            if path.is_symlink():
                raise ValueError('Invalid PWM checkpoint lock file.')
            handle = path.open('a+b')
            try:
                if os.name == 'nt':
                    handle.seek(0)
                    msvcrt.locking(handle.fileno(), msvcrt.LK_NBLCK, 1)
                else:
                    fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except OSError as error:
                handle.close()
                raise ValueError(message) from error
            try:
                handle.truncate(1)
            except OSError:
                handle.close()
                raise
            self.claims[batch_id] = handle

    def acquire(self, batch_id):
        directory = self._directory(batch_id)
        if not (directory / 'target.json').is_file():
            raise ValueError('This PWM sweep is no longer available to resume.')
        self._claim(batch_id)
        if not (directory / 'target.json').is_file():
            self.release(batch_id)
            raise ValueError('This PWM sweep is no longer available to resume.')

    def release(self, batch_id):
        with self.lock:
            handle = self.claims.pop(batch_id, None)
            if handle is not None:
                try:
                    # Even on a full/read-only disk the kernel lock must be released;
                    # a leftover marker is handled by the same probe as a process crash.
                    with contextlib.suppress(OSError):
                        handle.truncate(0)
                finally:
                    handle.close()
                # UUIDs are never reused. Once the journal is gone there can be no new owner.
                directory = self._directory(batch_id)
                if not directory.exists():
                    with contextlib.suppress(OSError):
                        directory.with_suffix('.lock').unlink(missing_ok=True)

    def _owned(self, batch_id):
        directory = self._directory(batch_id)
        if batch_id not in self.claims:
            raise ValueError('Claim the PWM sweep before modifying it.')
        return directory

    def _progress(self, batch_id):
        directory = self._directory(batch_id)
        manifest = directory / 'target.json'
        target = json.loads(manifest.read_text(encoding='utf-8'))
        committed = sorted(directory.glob('run-*.json'))
        if type(target) is not int or not 1 <= target <= 100 or len(committed) > target:
            raise ValueError('Invalid PWM sweep run count on disk.')
        if any(path.name != f'run-{i:03d}.json' for i, path in enumerate(committed, 1)):
            raise ValueError('A completed PWM run is missing from disk.')
        latest = committed[-1] if committed else manifest
        saved_at = datetime.fromtimestamp(latest.stat().st_mtime, timezone.utc)
        return dict(id=batch_id, runs=target, saved_runs=len(committed), saved_at=saved_at.isoformat())

    def describe(self, batch_id):
        state = self._progress(batch_id)
        published = _published_runs(self.workbook(batch_id))
        state['published_runs'] = published if published <= state['saved_runs'] else 0
        return state

    def _busy(self, batch_id):
        # Normal release clears the marker. A nonempty marker needs a kernel-lock
        # probe because the previous owner may have crashed before clearing it.
        path = self._directory(batch_id).with_suffix('.lock')
        try:
            if not path.stat().st_size:
                return False
            with path.open('rb') as handle:
                try:
                    if os.name == 'nt':
                        msvcrt.locking(handle.fileno(), msvcrt.LK_NBRLCK, 1)
                    else:
                        fcntl.flock(handle, fcntl.LOCK_SH | fcntl.LOCK_NB)
                except OSError:
                    return True
            return False
        except FileNotFoundError:
            return False

    def unfinished(self):
        batches = []
        for manifest in self.journals.glob('*/target.json'):
            batch_id = manifest.parent.name
            try:
                if not self._busy(batch_id):
                    batches.append(self._progress(batch_id))
            except (ValueError, OSError):
                # A damaged journal or a concurrent completion affects only this batch.
                continue
        return sorted(batches, key=lambda batch: (batch['saved_at'], batch['id']), reverse=True)

    def save_run(self, batch_id, number, samples):
        """Commit the small run journal before starting any Excel work."""
        directory = self._owned(batch_id)
        target = json.loads((directory / 'target.json').read_text(encoding='utf-8'))
        if type(number) is not int or not 1 <= number <= target:
            raise ValueError('Invalid PWM run number.')
        path = directory / f'run-{number:03d}.json'
        if path.exists():
            if json.loads(path.read_text(encoding='utf-8')) == samples:
                return
            raise ValueError(f'PWM run {number} has already been recorded.')
        if number > 1 and not (directory / f'run-{number - 1:03d}.json').is_file():
            raise ValueError('A previous PWM run is missing.')
        _write_json(path, samples)

    def publish(self, batch_id):
        """Only the export worker calls this. Readers can download the previous file throughout."""
        self.require_exporter()
        directory = self._owned(batch_id)
        # The journal writer can append while a directory is being enumerated.
        # Read a contiguous prefix explicitly so sheet N always contains run N.
        count = sum(1 for _ in directory.glob('run-*.json'))
        runs = [json.loads((directory / f'run-{i:03d}.json').read_text(encoding='utf-8'))
                for i in range(1, count + 1)]
        target = json.loads((directory / 'target.json').read_text(encoding='utf-8'))
        path = self.workbook(batch_id)
        write_pwm_workbook(path, runs, target_runs=target)
        _sync_directory(self.directory)
        return len(runs)

    def discard(self, batch_id):
        directory = self._owned(batch_id)
        retired = directory.with_suffix('.retired')
        directory.rename(retired)
        _sync_directory(self.journals)
        shutil.rmtree(retired)

    def delete_workbook(self, batch_id):
        """Delete the resumable journal along with its workbook, or a legacy workbook alone."""
        path = self.workbook(batch_id)
        directory = self._directory(batch_id)
        if not (directory / 'target.json').is_file():
            if not workbook_available(path):
                raise FileNotFoundError(path.name)
            path.unlink()
            return
        self.acquire(batch_id)
        try:
            if path.exists() and not workbook_available(path):
                raise ValueError('Invalid PWM workbook path.')
            path.unlink(missing_ok=True)
            self.discard(batch_id)
        finally:
            self.release(batch_id)
