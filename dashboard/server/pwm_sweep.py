"""Collect firmware-timed wheel measurements and checkpoint each complete run."""
from concurrent.futures import ThreadPoolExecutor
import math
from queue import Empty, Queue
import re
import threading

from .results import workbook_available
from .sweep_store import SweepStore


def sweep_id(filename):
    match = re.fullmatch(r'pwm-sweep-([0-9a-f]{32})\.xlsx', filename) if isinstance(filename, str) else None
    if not match:
        raise ValueError('Choose a saved PWM sweep to resume.')
    return match[1]


class PwmSweep:
    """The TCP reader delivers events under the robot lock. Only the writer touches Excel."""

    levels = range(0, 301, 5)

    def __init__(self, lock, output_directory, stop_robot):
        self.lock = lock
        self.store = SweepStore(output_directory)
        self.stop_robot = stop_robot
        self.workbook = None
        self.worker = None
        self.recording = False
        self.state = dict(status='idle', message='', runs=0, completed_steps=0, total_steps=0,
                          saved_runs=0, filename=None)
        self.publish_error = ''

    def snapshot(self):
        result = {**self.state, 'has_export': workbook_available(self.workbook)}
        if self.publish_error and self.state['status'] == 'running':
            result['message'] = self.publish_error
        return result

    def resumable(self):
        return [dict(filename=self.store.workbook(batch['id']).name, runs=batch['runs'],
                     saved_runs=batch['saved_runs'], saved_at=batch['saved_at'])
                for batch in self.store.unfinished()]

    def claim(self, runs, batch_id):
        """Take exclusive ownership outside the robot lock, before sending START."""
        if batch_id is None:
            return dict(id=self.store.create(runs), runs=runs, saved_runs=0, published_runs=0)
        self.store.require_exporter()
        self.store.acquire(batch_id)
        try:
            return self.store.describe(batch_id)
        except Exception:
            self.store.release(batch_id)
            raise

    def begin(self, batch):
        workbook = self.store.workbook(batch['id'])
        queue = Queue()
        journal = threading.Thread(target=self._write, args=(batch, queue), name='pwm-journal')
        try:
            journal.start()
        except RuntimeError as error:
            raise ValueError('Could not start the PWM checkpoint writer.') from error
        # The caller holds the robot lock until the new batch is fully initialized.
        self.worker = journal
        self.queue = queue
        self.offset = batch['saved_runs']
        self.samples = []
        self.recording = False
        self.publish_error = ''
        if batch['published_runs']:
            self.workbook = workbook
        self.state.update(status='running', message='Waiting for robot acknowledgement.', filename=workbook.name,
                          runs=batch['runs'], completed_steps=self.offset * len(self.levels),
                          total_steps=batch['runs'] * len(self.levels), saved_runs=batch['published_runs'])

    def acknowledge_start(self):
        if self.state['status'] == 'running':
            self.recording = True
            self.state['message'] = f"Starting run {self.offset + 1} at PWM 0."

    def interrupt(self, status, message):
        if self.state['status'] == 'running':
            self._end(status, message)

    def sample(self, record):
        if not self.recording:
            return
        index = self.state['completed_steps']
        run, step = divmod(index, len(self.levels))
        fields = ('run', 'pwm', 'elapsed_ms', 'left_delta', 'right_delta')
        if (any(type(record.get(key)) is not int for key in fields) or
                run >= self.state['runs'] or record['run'] != run - self.offset + 1 or
                record['pwm'] != self.levels[step] or record['elapsed_ms'] < 2000):
            raise ValueError('Missing, out-of-order or invalid PWM step from robot.')
        for key in ('left_rad_s', 'right_rad_s'):
            value = record.get(key)
            if type(value) not in (float, int) or not math.isfinite(value):
                raise ValueError('Invalid angular velocity from robot.')
        sample = dict(pwm=record['pwm'], sample_ms=record['elapsed_ms'],
                      left_delta=record['left_delta'], right_delta=record['right_delta'],
                      left_rad_s=record['left_rad_s'], right_rad_s=record['right_rad_s'])
        if 'battery_mv' in record:
            mv = record['battery_mv']
            # A missing voltage must not invalidate the wheel measurement.
            sample['battery_mv'] = mv if type(mv) is int and 0 <= mv <= 65535 else None
        self.samples.append(sample)
        self.state['completed_steps'] = index + 1
        self.state['message'] = f"Recorded run {run + 1} of {self.state['runs']} at PWM {record['pwm']}."
        if len(self.samples) == len(self.levels):
            self.queue.put((run + 1, self.samples))
            self.samples = []

    def finish(self):
        if not self.recording:
            return
        if self.state['completed_steps'] != self.state['total_steps']:
            raise ValueError('Robot ended its PWM sweep with missing steps.')
        self.finish_export()

    def finish_export(self):
        self._end('completed', 'PWM sweep complete. Workbook saved.')

    def _end(self, status, message):
        self.recording = False
        self.samples = []
        self.state.update(status='saving', message='Finishing the PWM checkpoint…')
        # FIFO ordering drains completed runs before making the session resumable.
        self.queue.put((None, (status, message)))

    def _publish(self, batch_id):
        count = self.store.publish(batch_id)
        with self.lock:
            self.state['saved_runs'] = count
            self.workbook = self.store.workbook(batch_id)
            self.publish_error = ''
        return count

    def _try_publish(self, batch_id, durable, published):
        try:
            return self._publish(batch_id)
        except Exception as error:
            # Excel can temporarily lock the file. Keep collecting and retry on the next run.
            with self.lock:
                self.publish_error = (f'Run {durable} saved for recovery. Could not update Excel: {error}. '
                                      'The dashboard will retry.')
            return published

    def _publish_checkpoints(self, batch, updates):
        """Coalesce a backlog into the latest workbook while journal commits continue."""
        batch_id = batch['id']
        published = batch['published_runs']
        while True:
            durable, final = updates.get()
            while not final:
                try:
                    durable, final = updates.get_nowait()
                except Empty:
                    break
            if published < durable:
                published = self._try_publish(batch_id, durable, published)
            if final:
                if published < durable:
                    self._publish(batch_id)
                return

    def _write_failed(self, error, durable):
        with self.lock:
            message = (f'Could not finish the PWM checkpoint: {error}. '
                       f"{durable} of {self.state['runs']} runs were saved for recovery.")
            needs_stop = self.state['status'] == 'running'
            self.recording = False
            self.samples = []
            self.state.update(status='saving', message=message)
        if needs_stop:
            try:
                self.stop_robot()
            except (OSError, ValueError):
                pass  # A disconnected robot also stops on its firmware lease.
        return message

    def _write(self, batch, queue):
        batch_id = batch['id']
        durable = batch['saved_runs']
        try:
            with ThreadPoolExecutor(max_workers=1, thread_name_prefix='pwm-excel') as executor:
                updates = Queue()
                writer = executor.submit(self._publish_checkpoints, batch, updates)
                if durable > batch['published_runs']:
                    updates.put((durable, False))
                try:
                    while True:
                        number, data = queue.get()
                        if number is None:
                            status, message = data
                            break
                        self.store.save_run(batch_id, number, data)
                        durable = number
                        updates.put((durable, False))
                except Exception as error:
                    # Stop promptly on journal failure, even if Excel is still serializing.
                    status, message = 'failed', self._write_failed(error, durable)
                finally:
                    updates.put((durable, True))
                writer.result()
            if durable == batch['runs']:
                self.store.discard(batch_id)
        except Exception as error:
            status, message = 'failed', self._write_failed(error, durable)
        finally:
            try:
                self.store.release(batch_id)
            except OSError as error:
                status, message = 'failed', f'Could not release the PWM checkpoint: {error}'
        with self.lock:
            self.publish_error = ''
            self.state.update(status=status, message=message)
