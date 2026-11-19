"""Compile DigitalTwin once and run live or headless experiment batches."""
from collections import deque
from contextlib import AbstractContextManager
import json
import math
import os
from pathlib import Path
import queue
import subprocess
import tempfile
import threading
import time

DEFAULT_PROCESSING = Path('/Applications/Processing.app/Contents/app/resources')


def select_candidates(candidates, mode='all_sequential', selected='balanced_low'):
    """Return the models to execute, including the baseline in both all modes."""
    if mode not in {'single', 'all_sequential', 'all_parallel'}:
        raise ValueError('mode must be single, all_sequential or all_parallel.')
    models = [dict(model_id='sterile'), *(dict(c) for c in candidates)]
    ids = [c['model_id'] for c in models]
    if any(not isinstance(name, str) or not name or
           any(char not in 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-' for char in name)
           for name in ids):
        raise ValueError('Candidate IDs must contain only letters, digits, underscores or hyphens.')
    if len(set(ids)) != len(ids):
        raise ValueError('Candidate model IDs must be unique; sterile is reserved.')
    if mode == 'single':
        if selected not in ids:
            raise ValueError(f'Unknown candidate {selected!r}; choose from {", ".join(ids)}.')
        return [c for c in models if c['model_id'] == selected]
    return models


class SimulationCancelled(RuntimeError):
    """Raised after all child processes have stopped on explicit cancellation."""


class SimulationRunner(AbstractContextManager):
    def __init__(self, root, processing_resources=DEFAULT_PROCESSING, *, live=False,
                 progress_callback=None, cancel_event=None):
        """Stream actual samples to a callback and honour an optional threading.Event.

        Callbacks run serially on the caller's thread, including parallel batches.
        The event can cancel compilation as well as headless/live simulation.
        """
        self.root = Path(root).resolve()
        self.resources = Path(processing_resources).resolve()
        self.temporary = None
        self.live = live
        self.progress_callback = progress_callback
        self.cancel_event = cancel_event

    def _check_cancelled(self):
        """Reject further launches and stop active children once cancellation is set."""
        if self.cancel_event is not None and self.cancel_event.is_set():
            raise SimulationCancelled('Simulation cancelled.')

    @staticmethod
    def _read_output(stream, lines):
        """Drain pipes continuously so a verbose Java child cannot deadlock."""
        try:
            for line in stream:
                lines.put(line)
        finally:
            lines.put(None)

    def _execute(self, commands):
        """Supervise commands together, cleaning up all children on any failure.

        Each tuple contains arguments, timeout seconds (or None), and an optional
        expected CSV path. Reader threads only drain pipes; callbacks and errors
        are handled here so they share the same cancellation/cleanup boundary.
        """
        jobs = []
        try:
            for arguments, timeout, output in commands:
                self._check_cancelled()
                process = subprocess.Popen([str(a) for a in arguments], cwd=self.root,
                                           stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                                           text=True, encoding='utf-8', errors='replace')
                lines = queue.Queue()
                reader = threading.Thread(target=self._read_output,
                                          args=(process.stdout, lines), daemon=True)
                job = dict(process=process, lines=lines, reader=reader,
                           log=deque(maxlen=500), eof=False, done=False,
                           started=time.monotonic(), timeout=timeout, output=output)
                jobs.append(job)
                reader.start()
            while any(not job['done'] for job in jobs):
                self._check_cancelled()
                for job in jobs:
                    if job['done']:
                        continue
                    # A bounded drain keeps cancellation responsive during large batches.
                    for _ in range(4096):
                        try:
                            line = job['lines'].get_nowait()
                        except queue.Empty:
                            break
                        if line is None:
                            job['eof'] = True
                            break
                        if line.startswith('DASHBOARD_SAMPLE '):
                            if self.progress_callback is not None:
                                self.progress_callback(json.loads(line[len('DASHBOARD_SAMPLE '):]))
                        else:
                            job['log'].append(line)
                    code = job['process'].poll()
                    if code is not None and job['eof']:
                        if code:
                            raise RuntimeError(f"Simulation command failed (exit {code}):\n"
                                               + ''.join(job['log']))
                        if job['output'] is not None:
                            self._check_output(job['output'])
                        job['done'] = True
                    elif job['timeout'] is not None and time.monotonic() - job['started'] > job['timeout']:
                        raise TimeoutError('Simulation command timed out.')
                if any(not job['done'] for job in jobs):
                    time.sleep(.02)
            self._check_cancelled()
            return [''.join(job['log']).strip() for job in jobs]
        finally:
            # Cancel every unfinished child first; then reap them and close pipes.
            for job in jobs:
                if job['process'].poll() is None:
                    job['process'].terminate()
            for job in jobs:
                process = job['process']
                try:
                    process.wait(timeout=2)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait()
                if job['reader'].ident is not None:
                    job['reader'].join(timeout=2)
                process.stdout.close()

    def _command(self, arguments, *, timeout=180):
        """Use the same cancellable supervision for compilation and single jobs."""
        return self._execute([(arguments, timeout, None)])[0]

    def __enter__(self):
        self.java = self.resources / 'jdk/bin/java'
        javac = self.resources / 'jdk/bin/javac'
        mode = self.resources / 'modes/java/mode'
        net = self.resources / 'modes/java/libraries/net/library/net.jar'
        for path in (self.java, javac, mode, net):
            if not path.exists():
                raise FileNotFoundError(f'Processing resource missing: {path}; set PROCESSING_RESOURCES.')
        self.temporary = tempfile.TemporaryDirectory(prefix='drift-simulation-')
        build = Path(self.temporary.name) / 'build'
        try:
            self._command([self.java, '-Djava.awt.headless=true',
                           f'-Dcompose.application.resources.dir={self.resources}',
                           '-cp', mode / '*', 'processing.mode.java.Commander',
                           f'--sketch={self.root / "DigitalTwin"}', f'--output={build}', '--build'])
            self.classpath = os.pathsep.join(map(str, (build, mode / '*', net)))
            self._command([javac, '-cp', self.classpath, '-d', build,
                           self.root / 'experiments/SimulationBatch.java'])
        except BaseException:
            self.temporary.cleanup()
            raise
        return self

    def run(self, output, model_id='sterile', runs=1, seed=2026,
            gain_imbalance=0.0, motor_tau_ms=0.0,
            wheel_noise_fraction=0.0, sensor_noise_counts=0.0):
        output, command = self._prepare_run(output, model_id, runs, seed, gain_imbalance,
                                           motor_tau_ms, wheel_noise_fraction, sensor_noise_counts)
        self._announce(model_id, runs)
        message = self._command(command, timeout=None if self.live else 180)
        self._check_output(output)
        return message

    def _prepare_run(self, output, model_id='sterile', runs=1, seed=2026,
                     gain_imbalance=0.0, motor_tau_ms=0.0,
                     wheel_noise_fraction=0.0, sensor_noise_counts=0.0):
        if self.temporary is None:
            raise RuntimeError('Use SimulationRunner inside a with block.')
        values = (gain_imbalance, motor_tau_ms, wheel_noise_fraction, sensor_noise_counts)
        if not all(math.isfinite(v) for v in values):
            raise ValueError('Model parameters must be finite.')
        if not isinstance(runs, int) or not 1 <= runs <= 1000:
            raise ValueError('runs must be an integer from 1 to 1000.')
        if not isinstance(seed, int) or not 0 <= seed <= 2**63 - runs:
            raise ValueError('seed must fit in a nonnegative Java long, including run offsets.')
        if abs(gain_imbalance) >= 2 or min(values[1:]) < 0:
            raise ValueError('Both gains must be positive; time constant/noise must be nonnegative.')
        if not isinstance(model_id, str) or not model_id or any(
                char not in 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-'
                for char in model_id):
            raise ValueError('Model IDs must contain letters, digits, underscores or hyphens.')
        if model_id == 'sterile' and any(values):
            raise ValueError('The sterile model cannot have noise, lag or imbalance.')
        output = Path(output).resolve()
        if output.exists():
            raise FileExistsError(f'Refusing to replace existing results: {output}')
        output.parent.mkdir(parents=True, exist_ok=True)
        command = [self.java, f'-Djava.awt.headless={str(not self.live).lower()}',
                   f'-Ddashboard.stream={str(self.progress_callback is not None).lower()}',
                   '-cp', self.classpath, 'SimulationBatch', output, model_id, runs, seed,
                   *values, *(['--live'] if self.live else [])]
        return output, command

    def _announce(self, model_id, runs):
        if self.live:
            print(f'Opening Processing: {model_id}, {runs} trial(s), real time. '
                  'Space pauses; close the window to cancel.', flush=True)

    @staticmethod
    def _check_output(output):
        if not output.is_file():
            raise RuntimeError('Simulation ended before the batch CSV was saved. '
                               'The Processing window may have been closed; rerun the batch.')

    def run_candidates(self, directory, candidates, *, mode='all_sequential',
                       selected='balanced_low', runs=24, seed=2026):
        """Run one model or all models; parallelism is between candidates, not seeds.

        A failure, closed window or cancellation stops unfinished processes.
        Completed CSVs remain available; results are returned in candidate order.
        """
        models = select_candidates(candidates, mode, selected)
        jobs = []
        # Validate the entire selection before launching any simulation.
        for model in models:
            count = 1 if model['model_id'] == 'sterile' else runs
            output, command = self._prepare_run(
                Path(directory) / (model['model_id'] + '.csv'), runs=count, seed=seed, **model)
            jobs.append((model, count, output, command))
        if mode != 'all_parallel':
            for model, count, output, command in jobs:
                self._announce(model['model_id'], count)
                message = self._command(command, timeout=None if self.live else 180)
                self._check_output(output)
                print(message, flush=True)
        else:
            commands = []
            for index, (model, count, output, command) in enumerate(jobs):
                self._announce(model['model_id'], count)
                if self.live:
                    command = [command[0], f'-Ddrift.window.index={index}', *command[1:]]
                commands.append((command, None if self.live else 180, output))
            for message in self._execute(commands):
                print(message, flush=True)
        return [output for _, _, output, _ in jobs]

    def run_workbook(self, workbook, candidates, *, mode='all_sequential',
                     selected='balanced_low', runs=24, seed=2026):
        """Replace selected sheets after every selected simulation succeeds.

        Parallel Java jobs write separate temporary CSVs; only this parent writes
        Excel, once. Failed/cancelled runs leave previous sheet data intact.
        """
        import pandas as pd
        from workbook_results import ensure_workbook, write_simulations
        select_candidates(candidates, mode, selected)
        ensure_workbook(workbook, candidates)
        with tempfile.TemporaryDirectory(prefix='drift-export-') as directory:
            paths = self.run_candidates(directory, candidates, mode=mode,
                                        selected=selected, runs=runs, seed=seed)
            frames = {path.stem: pd.read_csv(path, dtype={'seed': str}) for path in paths}
            self._check_cancelled()
            write_simulations(workbook, frames)
        return list(frames)

    def __exit__(self, *exc):
        if self.temporary:
            self.temporary.cleanup()
            self.temporary = None
