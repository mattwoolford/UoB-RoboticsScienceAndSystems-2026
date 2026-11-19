# Sterile straight-line experiment

Open `DigitalTwin.pde` in Processing (Java mode) and press Run. The default
mode calibrates the simulated motors, places the robot at `(0, 0, 0)` on a
**20 m straight black line**, then follows it for **30 seconds of simulation
time**. The line is 19 mm wide, extends from x = -500 to 19500 mm, and has its
centre at y = 0. Forward travel is +x.

The lower panel shows the latest timed measurements. A CSV containing all
**31 samples (0, 1, 2, 3, …, 30 seconds)** saves automatically to
`DigitalTwin/results/straight-line-<unique timestamp>.csv` when the run ends.
The robot stops at the final sample. Files have unique names to preserve trials.

- **R** restarts calibration and the experiment; any partial samples are saved.
- **E** exports the current samples, or retries a failed save.
- **T** toggles camera tracking; **+/-** zoom; **arrow keys** pan.
- **G** shows existing motor, sensor and encoder graphs.
- **M** cycles from the experiment to sandbox, live comparison, and back.
  Leaving the experiment saves any partial results. Sandbox uses the main
  project's current motor start/stop procedure; live comparison uses the legacy CSV TCP viewer. Use the new
  [dashboard](../dashboard/README.md) for the firmware’s JSON WiFi protocol.
  Live mode cannot be changed while a live run is in progress.

Read `signed_drift_mm` for lateral displacement of the robot centre from the
line: **positive = left, negative = right** when looking along +x.
`left_mm` and `right_mm` split this into nonnegative distances. `forward_mm`
is distance along the line, and `heading_rad` is the world heading.
`odometry_x_mm` / `odometry_y_mm` are the independent encoder-based estimate;
they are not used as ground truth for drift. The CSV also includes integer
wheel counts, applied PWM and controller mode (1 = following, 2 = searching,
3 = stopped). The t=0 sample is taken before the first driving command; the
last sample captures the command used for that interval, before stopping.

The clock starts **after calibration and repositioning**, immediately before
the first 10 ms driving interval. Sampling occurs at exact simulated-second
boundaries after integrating motion. Rendering and TCP cannot move these
sample boundaries. Under heavy rendering load the simulation may take longer
than 30 wall-clock seconds. `DURATION_MS` and `SAMPLE_INTERVAL_MS` in
`StraightLineExperiment.pde` configure the trial; the duration must be a
multiple of the sample interval, and that interval a multiple of the 10 ms
physics step. Keep the duration short enough to stay on the finite line
(at the default ideal speed, 30 s travels about 1687.5 mm).

## What is synchronised with `main`

- `Controller.pde` uses the same 10 ms update, 50 ms telemetry timer, line-follow PWM bias 45,
  gain 0.01, DN3 threshold 1400, and -35/+35 recovery with a 5 s timeout.
  Its motor start/stop test retains the same call-count boundary and uses
  `CONSTANT_PWM = 100`, matching the physical constant-run setting. Open-loop
  [simulation batches](../experiments/README.md) share this simulation constant.
  The experiment explicitly selects `main`'s existing line-following
  routine, which is currently disabled in the firmware's `update()`.
- `MotorCalibration.pde` ports the independent forward ramps: 300 ms per PWM
  step, at least three net encoder counts, maximum PWM 100, individual wheel
  stops, latched completion/failure, and start gating. As in `main`, detected
  thresholds are not added to subsequent line-following commands.
- `RobotSimulation.pde` truncates PWM towards zero to match `Robot.cpp` and
  exposes integer encoder counts. Model reads and writes always succeed.
- `OdometryModel.pde` ports `main/OdometryModel`: equal nominal 16 mm radii,
  90 mm separation, 358.3 counts/revolution, first-count baseline, first-order
  Euler integration, geometry validation and signed 32-bit count wrap handling.
  `DrivePhysics.pde` contains `DrivePhysics_c`, the separate continuous
  world-motion model. Sensor sampling, drawing and drift use its world pose.

The dashboard firmware adds remote test control and JSON telemetry. Hardware transport,
IMU, button feedback, and unused speed-monitor/ramp routines are not needed by
this experiment and have not been simulated.

## Interpretation and limits

This is a deterministic ideal baseline: identical linear motors (existing
250 mm/s at PWM 200 assumption), equal wheels, instantaneous motor response,
ideal reflectance, no slip, no added noise, and no initial heading or position
error. The straight surface is sampled analytically so pixel rounding cannot
introduce an artificial left/right asymmetry. Encoder/PWM quantisation is
retained because it is part of the interface being modelled.

**Zero lateral drift is expected and is a valid result.** The simulator cannot
predict physical drift without measured motor/geometry/traction parameters.
Matching controller logic does not make the ideal plant a calibrated replica
of the real robot. Calibration's detected threshold here reflects the
three-count observation window, not a modelled friction deadband.

`results/sterile-baseline.csv` is a verified headless run of this same sketch:
zero signed drift at every sample, including 3, 4 and 5 s. The continuous
forward distance can differ slightly from the analytical 56.25 mm/s result
because the model uses single-precision arithmetic.

## Verification

Run from the repository root with Processing 4 installed:

```sh
python3 tests/run_digital_twin_tests.py
```

The script compiles the complete PDE sketch using Processing, then executes
its actual Java classes without a window or network. It verifies two identical
30-second trials, sampling boundaries, motion duration, calibration gating,
PWM truncation, drift signs, recovery, main's start/stop boundary, odometry,
and CSV round-trip. Sign/recovery tests use separate fixtures; they do not add
any disturbance to the sterile trial. Use `--processing-resources PATH` to
specify a different Processing resources folder (containing `jdk` and
`modes/java`). To save a fresh baseline:

```sh
python3 tests/run_digital_twin_tests.py --output-csv /tmp/sterile-baseline.csv
```
