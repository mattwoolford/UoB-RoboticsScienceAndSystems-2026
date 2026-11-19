"""Run the real Java digital twin in a cancellable background job."""
from collections import deque
from pathlib import Path
import copy
import os
import sys
import tempfile
import threading
import uuid

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'experiments'))
from experiment_setup import default_candidates, LABELS
from simulation_runner import SimulationRunner, select_candidates

DESCRIPTIONS = {
    'sterile': 'Ideal equal wheels; deterministic baseline.',
    'balanced_low': 'Balanced motors with 2% wheel-speed noise.',
    'balanced_high': 'Balanced motors with 8% wheel-speed noise.',
    'right_fast': 'Right wheel gain higher by 1.5%.',
    'left_fast': 'Left wheel gain higher by 1.5%.',
}
CANDIDATES = [dict(model_id=name, label=LABELS[name], description=description)
              for name, description in DESCRIPTIONS.items()]


class SimulationService:
    """Own one active job; publish results only after all selected models succeed."""

    def __init__(self, output_directory=None):
        self.lock = threading.RLock()
        self.cancel_event = threading.Event()
        self.thread = None
        self.output = Path(output_directory or ROOT / 'dashboard/results')
        self.csv_bytes = None
        self.xlsx_bytes = None
        self.samples = deque(maxlen=16000)
        self.state = dict(status='idle', message='Ready to run a simulation.', models=[],
                          progress=0, summary=[], run_id=None)

    def snapshot(self):
        """Copy under a lock so HTTP threads never observe partial sample updates."""
        with self.lock:
            return {**copy.deepcopy(self.state), 'samples': list(self.samples),
                    'has_exports': self.csv_bytes is not None}

    def start(self, options):
        """Validate bounded workload before creating the worker thread."""
        mode = options.get('mode', 'single')
        selected = options.get('selected', 'sterile')
        runs, seed = options.get('runs', 1), options.get('seed', 2026)
        live = options.get('live', False)
        if type(runs) is not int or not 1 <= runs <= 100:
            raise ValueError('Trials must be an integer between 1 and 100.')
        if type(seed) is not int or not 0 <= seed <= 2**53 - 101:
            raise ValueError('Seed must be a nonnegative safe integer.')
        if type(live) is not bool:
            raise ValueError('live must be a boolean.')
        models = select_candidates(default_candidates(), mode, selected)
        expected = sum(1 if m['model_id'] == 'sterile' else runs for m in models) * 31
        with self.lock:
            if self.thread and self.thread.is_alive():
                raise ValueError('A simulation is already running.')
            self.cancel_event = threading.Event()
            self.samples.clear()
            self.state = dict(status='running', message='Compiling the Processing digital twin…',
                              models=[m['model_id'] for m in models], progress=0, summary=[],
                              run_id=uuid.uuid4().hex)
            self.thread = threading.Thread(target=self._run,
                args=(mode, selected, runs, seed, live, expected), daemon=True)
            self.thread.start()

    def cancel(self):
        """The runner terminates and reaps every child before marking cancellation."""
        with self.lock:
            if self.state['status'] == 'running':
                self.cancel_event.set()
                self.state['message'] = 'Stopping simulation processes…'

    def _run(self, mode, selected, runs, seed, live, expected):
        """Stream true samples, then atomically save a new per-selection workbook."""
        def sample(record):
            with self.lock:
                self.samples.append(record)
                self.state['progress'] = min(.99, len(self.samples) / expected)
                self.state['message'] = f"Running {record['model_id']} · {record['run_id']}"
        try:
            import pandas as pd
            from workbook_results import ensure_workbook, write_simulations
            resources = os.environ.get('PROCESSING_RESOURCES',
                                       '/Applications/Processing.app/Contents/app/resources')
            with tempfile.TemporaryDirectory(prefix='dashboard-run-') as temporary:
                with SimulationRunner(ROOT, resources, live=live, progress_callback=sample,
                                      cancel_event=self.cancel_event) as runner:
                    paths = runner.run_candidates(temporary, default_candidates(), mode=mode,
                                                  selected=selected, runs=runs, seed=seed)
                frames = {path.stem: pd.read_csv(path, dtype={'seed': str}) for path in paths}
                combined = pd.concat(frames.values(), ignore_index=True)
                summary = []
                for model, frame in frames.items():
                    final = frame[frame.elapsed_s == 30]
                    summary.append(dict(model_id=model, runs=len(final),
                        mean_drift_mm=float(final.signed_drift_mm.mean()),
                        rms_drift_mm=float((final.signed_drift_mm ** 2).mean() ** .5),
                        mean_forward_mm=float(final.forward_mm.mean())))
                workbook = Path(temporary) / 'results.xlsx'
                ensure_workbook(workbook, default_candidates())
                write_simulations(workbook, frames)
                csv_data = combined.to_csv(index=False).encode()
                xlsx_data = workbook.read_bytes()
                # Cancellation and publication share the lock: no cancelled batch can commit.
                with self.lock:
                    if self.cancel_event.is_set():
                        raise InterruptedError('Simulation cancelled.')
                    destination = self.output / self.state['run_id']
                    destination.mkdir(parents=True, exist_ok=False)
                    (destination / 'results.csv').write_bytes(csv_data)
                    (destination / 'results.xlsx').write_bytes(xlsx_data)
                    self.csv_bytes, self.xlsx_bytes = csv_data, xlsx_data
                    self.state.update(status='completed', progress=1, summary=summary,
                                      message='All selected trials completed. Results saved.')
        except Exception as error:
            with self.lock:
                cancelled = self.cancel_event.is_set()
                self.state.update(status='cancelled' if cancelled else 'failed',
                                  message='Simulation cancelled; previous exports retained.' if cancelled
                                  else str(error))

    def close(self):
        """Stop child processes before the local API exits."""
        self.cancel()
        if self.thread:
            self.thread.join(timeout=10)
