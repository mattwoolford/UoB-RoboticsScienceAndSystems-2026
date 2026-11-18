"""Compile DigitalTwin once and run live or headless experiment batches."""
from contextlib import AbstractContextManager
import math
import os
from pathlib import Path
import subprocess
import tempfile
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


class SimulationRunner(AbstractContextManager):
    def __init__(self, root, processing_resources=DEFAULT_PROCESSING, *, live=False):
        self.root = Path(root).resolve()
        self.resources = Path(processing_resources).resolve()
        self.temporary = None
        self.live = live

    def _command(self, arguments, *, timeout=180):
        result = subprocess.run([str(a) for a in arguments], cwd=self.root,
                                text=True, capture_output=True, timeout=timeout)
        if result.returncode:
            raise RuntimeError(f"Simulation command failed (exit {result.returncode}):\n"
                               f"{result.stdout}\n{result.stderr}")
        return result.stdout.strip()

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
        except Exception:
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
        if not model_id or model_id == 'sterile' and any(values):
            raise ValueError('The sterile model cannot have noise, lag or imbalance.')
        output = Path(output).resolve()
        if output.exists():
            raise FileExistsError(f'Refusing to replace existing results: {output}')
        output.parent.mkdir(parents=True, exist_ok=True)
        command = [self.java, f'-Djava.awt.headless={str(not self.live).lower()}',
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

        A failure, closed window or notebook interrupt stops unfinished processes.
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
            processes, logs = [], []
            try:
                for index, (model, count, output, command) in enumerate(jobs):
                    self._announce(model['model_id'], count)
                    if self.live:
                        command = [command[0], f'-Ddrift.window.index={index}', *command[1:]]
                    # File-backed logs avoid blocking on a full pipe while other jobs run.
                    log = tempfile.TemporaryFile(mode='w+')
                    logs.append(log)
                    process = subprocess.Popen([str(a) for a in command], cwd=self.root,
                                               stdout=log, stderr=subprocess.STDOUT, text=True)
                    processes.append((process, log, output, time.monotonic()))
                pending = list(processes)
                while pending:
                    for job in pending[:]:
                        process, log, output, started = job
                        code = process.poll()
                        if code is None:
                            if not self.live and time.monotonic() - started > 180:
                                raise TimeoutError(f'Simulation timed out: {output.stem}')
                            continue
                        log.seek(0)
                        message = log.read().strip()
                        if code:
                            raise RuntimeError(f'Simulation {output.stem} failed (exit {code}):\n{message}')
                        self._check_output(output)
                        print(message, flush=True)
                        pending.remove(job)
                    if pending:
                        time.sleep(.05)
            finally:
                # This also runs on KeyboardInterrupt and launch/CSV failures.
                for process, _, _, _ in processes:
                    if process.poll() is None:
                        process.terminate()
                for process, _, _, _ in processes:
                    try:
                        process.wait(timeout=2)
                    except subprocess.TimeoutExpired:
                        process.kill()
                        process.wait()
                for log in logs:
                    log.close()
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
            write_simulations(workbook, frames)
        return list(frames)

    def __exit__(self, *exc):
        if self.temporary:
            self.temporary.cleanup()
            self.temporary = None
