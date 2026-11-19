# Straight-line drift notebook

Open **[StraightLineDrift.ipynb](StraightLineDrift.ipynb)** and select the local
`experiments/.venv/bin/python` interpreter. Use Run All to watch the experiments
in a live **Processing sketch window**, then generate pandas tables and
matplotlib figures from the completed batches.

From the repository root, if the environment needs recreating:

```sh
python3 -m venv experiments/.venv
experiments/.venv/bin/python -m pip install -r experiments/requirements.txt
```

Processing 4 must be installed. The notebook's `PROCESSING_RESOURCES` setting
points at its bundled JDK and Java mode; the default matches this Mac's installed
Processing. No physical robot or TCP connection is required. The Python runner
compiles the actual PDE sketch once per session and opens the window automatically;
you do not need to press Run in the Processing editor separately.

`LIVE_PROCESSING = True` in the setup cell enables real-time rendering. Each
batch shows open-loop robot motion, model name, trial number, seed, elapsed
time and centrepoint drift samples. Trials within each candidate advance automatically.

Run the separate **Choose what to run** cell to display a numbered text menu:

```text
Simulation run menu
  1. Run one candidate
  2. Run all candidates sequentially
  3. Run all candidates in parallel
  0. Cancel
```

Type a number in the notebook's input prompt and press **Enter**. Option 1
opens a second numbered menu for the candidate. Enter **0** or **q** at either
prompt to cancel. Run All pauses for your answers, then continues to the
simulation. The menu logic lives in `run_menu.py`, keeping it out of the core
simulation cell. `N_RUNS` remains in the candidate-parameters cell; set it to 1
for a quick preview.

The menu can be the **first cell run in a fresh kernel**. It loads missing
imports, paths and default candidates from `experiment_setup.py`, preserving
settings you have already changed. After choosing, run section 3 and the
remaining analysis cells. Running setup and candidate parameters first remains
useful when you want to customise the trial count or noise parameters.

| Option | What runs |
| --- | --- |
| 1 — single | Only the chosen candidate, in one window |
| 2 — sequential | Sterile, then each noisy candidate in turn |
| 3 — parallel | Sterile and all four noisy candidates concurrently, in five windows |

Available selections: `sterile`, `balanced_low`, `balanced_high`, `right_fast`,
and `left_fast`. Sterile always runs once. Parallelism is between candidates;
the seeds within each candidate run sequentially. Windows are offset so their
titles remain accessible; move them to arrange your view. Pause affects only
the focused window.

To change the selection, rerun the menu cell and section 3 onwards, or Run All.
Every successful execution replaces the selected simulation sheets in the same Excel workbook. Plots, summaries,
and physical scoring use only the models selected for that execution; a single
model is evaluated without claiming it beats unexecuted candidates.

- **Space** pauses/resumes the experiment.
- **T** toggles camera tracking (enabled initially).
- **+/-** zoom; **arrow keys** pan and disable tracking.
- Closing an unfinished window cancels the selection and raises an error in the notebook.
  The workbook is saved only after all selected batches finish; a failed or
  cancelled selection leaves previous workbook data intact. Failures or notebook interruption also stop
  every unfinished Java process, including parallel windows.

The default 97 trials take roughly **49 minutes sequentially**, or **12 minutes in parallel** if the computer keeps up. Set
`N_RUNS = 1` for a preview: about three minutes for all sequentially, or 30 seconds
for a single candidate or all in parallel. Set `LIVE_PROCESSING = False` to run quickly without
a window. Rendering uses the same fixed 10 ms physics steps and seed sequences
as headless execution, so it does not change recorded results. Pausing or slow
rendering can make wall-clock execution longer.

Python callers can enable the same view with
`SimulationRunner(ROOT, PROCESSING_RESOURCES, live=True)`; the runner's API
defaults to headless mode for scripts and regression checks.

The batch-selection API is `simulation.run_workbook(WORKBOOK, CANDIDATES,
mode=RUN_MODE, selected=SELECTED_CANDIDATE, runs=N_RUNS, seed=BASE_SEED)`.

The notebook runs one sterile trial and 24 seeded trials for each of four
illustrative noisy candidates. Noise is implemented only by
`SimulationBatch.java` in this folder. It does not modify the sterile
`DigitalTwin` or the firmware. Motor lag, gain imbalance, wheel-speed noise and
sensor noise are API parameters, not calibrated claims about hardware. Sensor
noise is inactive in open-loop trials and defaults to zero.

The notebook uses `MechanicalDriftExperiment`: constant equal PWM **45 / 45**
for 30 seconds, starting from rest, with no calibration or feedback. It reuses
DigitalTwin physics and recording but never invokes the line-following controller.
Workbook rows include `drive_mode=open_loop_equal_pwm` and `controller_mode=-1`.
The drawn line is only a reference for the initial heading. Physical trials must
use the same equal-PWM protocol with steering and motor compensation disabled.
Earlier line-following CSVs are not comparable and should not be pooled.

Drift is measured from the **axle/body centrepoint** to the line centre.
Positive = left; negative = right; units are millimetres. World pose provides
simulated ground truth. Forward sensors and estimated odometry are not the
centrepoint measurement.

The persistent project is **`data/straight_line_results.xlsx`**, initially empty:

- `sterile`, `balanced_low`, `balanced_high`, `right_fast`, `left_fast`: one row per
  one-second sample, including run ID, seed, centre position, drift and parameters.
- `real_world`: enter `run_id`, `split`, `elapsed_s`, `centre_x_mm`, `centre_y_mm`
  from row 2. Keep the headers unchanged. Choose `train` or `test` for each run.

The `comparison` sheet compares all stored candidates at 30 seconds using Excel
formulas: number of trials, mean signed and absolute drift, sample standard
deviation, RMS drift, and mean forward travel. Missing results stay blank; SD
requires at least two trials. Its formulas are rebuilt after each successful
simulation write and recalculate on opening Excel (and when source values change).
Only 30-second rows contribute, so each completed trial has equal weight.
Unselected candidates can contain older results. Lower absolute/RMS drift means
straighter travel, not necessarily a better model of the physical robot.

Close Excel before running a batch. Successful runs replace all rows in the selected
candidate sheets, including removal of excess rows from longer prior batches.
Unselected candidates and the entire `real_world` sheet are preserved. Parallel
simulations use separate temporary CSVs internally; the parent process commits
Excel once, atomically, after success. Temporary CSVs are removed afterwards.
The low-level CSV runner remains available for simulation regression checks.

The notebook reads back the selected Excel sheets for analysis. Summaries, fit
scores and residuals are displayed in the notebook; plots and the current
selection's `manifest.json` overwrite files in `results/latest/`. That manifest
covers the most recent selection, not older unselected sheets. Seeds and model
parameters are retained on every simulation row. Archive the workbook and latest
figures together if a run needs to be retained before the next overwrite.

To fit against hardware, enter measured centrepoint coordinates in `real_world`.
Assign entire runs to `train` or `test` before fitting. The notebook explains
line-frame projection, sample alignment, CRPS selection, held-out evaluation,
and the limits of a finite candidate search. Missing physical data are never
replaced with synthetic observations. The default fitting times are 3–30 s;
change `FIT_TIMES` if your measurements cover fewer seconds.

Regression checks (synthetic fixtures are only tests):

```sh
.venv/bin/python -m unittest test_experiment test_workbook_results
```

To also check real-time pacing and identical live/headless CSVs across two
trials (opens a window and takes about 60 seconds):

```sh
TEST_LIVE_PROCESSING=1 .venv/bin/python -m unittest test_experiment test_workbook_results
```

For unattended terminal execution, set `INTERACTIVE_SELECTION = False` in the
menu cell and choose `RUN_MODE, SELECTED_CANDIDATE` in its `else` branch (for
example, `"single", "right_fast"` or `"all_parallel", None`). Also set
`LIVE_PROCESSING = False` for fast execution. Then re-execute and save:

```sh
.venv/bin/python -m jupyter nbconvert --execute --to notebook \
  --inplace StraightLineDrift.ipynb --ExecutePreprocessor.timeout=-1
```
