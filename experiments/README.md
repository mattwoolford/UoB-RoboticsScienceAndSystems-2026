# Simulation and experiment engine

Use the [React dashboard](../dashboard/README.md) to select simulation models,
run batches, watch actual simulated samples and compare results. The previous
Jupyter notebook and its interactive text menu have been removed. The dashboard
uses these Python/Java modules directly; no notebook kernel is required.

## Setup

From the repository root:

```sh
python3 -m venv experiments/.venv
experiments/.venv/bin/python -m pip install -r experiments/requirements.txt
```

Install Processing 4. The default resource directory is
`/Applications/Processing.app/Contents/app/resources`; configure
`PROCESSING_RESOURCES` for the dashboard when Processing is elsewhere. It must
contain `jdk` and `modes/java`. Python library callers can pass the directory to
`SimulationRunner` explicitly. The runner compiles the actual DigitalTwin PDE
classes into a temporary directory before starting a selection.

## Models and measurements

Available models are `sterile`, `balanced_low`, `balanced_high`, `right_fast`
and `left_fast`. `experiment_setup.py` holds the shared candidate definitions.
The sterile baseline always runs once; noisy models use the selected trial count
and successive deterministic seeds. Parallel execution runs candidates in
separate Java processes. Trials within each candidate remain sequential.

All these batches use `MechanicalDriftExperiment`: constant equal PWM **45 / 45**
for 30 seconds, starting from rest, with no calibration, compensation or steering.
Rows identify `drive_mode=open_loop_equal_pwm` and `controller_mode=-1`.
The standalone Processing sketch's line-following experiment is a separate
protocol; its results should not be pooled with these mechanical drift trials.

Samples are recorded at exactly 0–30 simulated seconds (31 rows per trial).
Drift is measured from the axle/body centrepoint to the reference line using
simulated world position, in millimetres: positive is left, negative is right.
Encoder odometry is a separate estimate. Real-robot dashboard telemetry provides
odometry, not measured ground-truth centrepoint drift.

The noisy candidates illustrate motor lag, gain imbalance and independent
wheel-speed disturbance; they are not calibrated claims about hardware. Sensor
noise has no effect on these open-loop trials. Identical models and seeds produce
identical samples in headless and live Processing modes. Rendering, streaming and
pausing never change the fixed 10 ms physics step.

## Python API

```python
from pathlib import Path
from experiment_setup import default_candidates
from simulation_runner import SimulationRunner

root = Path(__file__).resolve().parents[1]
with SimulationRunner(root) as simulation:
    simulation.run_workbook(
        root / "experiments/data/straight_line_results.xlsx",
        default_candidates(), mode="all_parallel", runs=24, seed=2026,
    )
```

`mode` may be `single`, `all_sequential`, or `all_parallel`; `selected="right_fast"`
selects a model in single mode. `run_candidates(directory, candidates, ...)`
returns CSV paths instead of updating a workbook. `run(path, ...)` runs one model
with explicit parameters. Existing CSVs are never overwritten by the low-level
runner.

Set `live=True` on `SimulationRunner` to open actual Processing windows, one per
active candidate. Space pauses/resumes the focused window; T tracks the robot;
+/- zoom; arrow keys pan. Closing an unfinished window fails the selection and
stops the other unfinished processes. A 30-second live trial takes at least 30
wall-clock seconds; headless mode computes the same samples as fast as possible.

For monitoring, pass `progress_callback=callback`. It receives a dictionary for
each actual recorded sample, including model/run IDs, time, world pose, PWM and
encoder counts. Callbacks run serially on the calling thread, even for parallel
batches. Pass a `threading.Event` as `cancel_event`; setting it stops compilation
or running children and raises `SimulationCancelled` after they have been reaped.
The optional Java property `-Ddashboard.stream=true` enables the underlying
newline `DASHBOARD_SAMPLE {json}` protocol. Ordinary CSV callers need no streaming.

## Results and physical observations

`data/straight_line_results.xlsx` retains one sheet per model and `real_world`.
Successful workbook writes replace selected model sheets atomically, preserve
unselected models and physical observations, and rebuild the `comparison` sheet.
Failed or cancelled batches leave prior results intact. Close Excel before
writing results. The comparison sheet uses each trial's 30-second sample to
calculate counts, signed/absolute mean drift, sample SD, RMS drift and forward
travel. Unselected models can contain older data.

For physical observations, enter `run_id`, `split`, `elapsed_s`, `centre_x_mm`,
`centre_y_mm` under the existing `real_world` headers. Assign complete runs to
`train` or `test` before fitting. The `analysis.py` library retains line-frame
projection, observation validation and CRPS model scoring. Physical ground truth
must come from measured positions; dashboard odometry is not substituted for it.
Missing physical observations remain missing.

## Verification

From the repository root:

```sh
cd experiments
.venv/bin/python -m unittest test_experiment test_workbook_results
```

These checks cover deterministic simulations, streamed samples against CSVs,
parallel failure/cancellation cleanup, analysis and workbook preservation.
To also compare live and headless CSVs over two trials (opens a window, ~60 s):

```sh
TEST_LIVE_PROCESSING=1 .venv/bin/python -m unittest test_experiment test_workbook_results
```
