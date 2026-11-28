# Physical box escape — verification record

**Physical evidence:** Test 0002 on the previous firmware recorded two left turns, then a stop after an unconfirmed opening; see [Test 0002 and the repeat procedure](../TRIAL_GUIDE.md#repeat-physical-test-0002). This recovery revision has not been tested on the physical robot. Verify and upload for the M5StampC3 and repeat without calibration.

## What the box model showed

The test calls the same C++ EscapePilot used by the sketch. It places a 100 mm circular body in a 400 × 350 mm box with a centred 150 mm opening. Its pass check uses the body's true position outside the box, independently of the pilot's own 'candidate' result. Clearance is the smallest simulated distance between the body and a wall or doorpost during a run.

| Start in model | Outcome with packaged settings | Minimum body clearance |
|---|---|---:|
| Beside the exit wall, wall on the right, 30 mm initial body clearance | Entire body outside at 6.30 s | 22.2 mm |
| Same heading, 20 mm initial body clearance | Entire body outside at 6.25 s | 18.1 mm |
| Room centre, facing the right-hand wall | Entire body outside at 21.65 s | 19.7 mm |

The old 700-count stop interrupted the second left turn. With the cutoff removed from the escape routine, the robot completes the turn and reaches the opening. The browser simulator, which also runs the motor controller and uses quantised encoder readings, reproduces the change: at 5.05 s the back-right sensor reads 472 and turning continues. The full browser run exits at 21.70 s with 20.19 mm minimum modelled clearance. Neither model is a physical trial.

**Why the exit detector uses an early mark:** in a second model run we moved the two back-right thresholds from 3450/3650 to 3950/4000 without remeasuring the offset. All three starts in this later-threshold sensitivity run hit a doorpost. The signal weakening tells you when to mark the axle; a stronger change confirms a candidate opening. Changing the mark changes how far the axle must travel before it turns. This model uses an approximate older IR curve, ideal rays and perfect wheel odometry. It does not establish a universal rear threshold or clearance, model motor friction/slip/coasting, or prove escape from arbitrary poses. The three scenarios are selected examples, not a success rate.

## What the integration tests check

The host build compiles the complete .ino and all the sketch's .cpp files against a simulated clock, ADC, motor/encoder middleware, and Wi-Fi transport. The harness checks both build settings for BOX_ESCAPE_ENABLE. It exercises boot without movement, nominal escape starts and the optional bench calibration, the IR pin order, turns with coasting, stops on bad feedback and command disconnect, and a full synthetic right-opening sequence. Reading sensor values, downloading a CSV or opening Trial Review must leave the motors idle. The two intentional motion actions on the dashboard are **Start trial** and **Stop trial**. The boxed geometry experiment above is a separate test of the pilot alone.

The trial-review checks cover recorded phases, stop and disconnect reasons, recording retention after a stop, and the overflow flag. The browser logic was exercised with simulator exports and constructed CSVs, including a turn crossing the ±180° heading boundary. These checks do not measure the accuracy of the real robot.

## Reproduce on a computer (optional)

From the `firmware` folder, with Python 3 and a C++17 compiler (GCC or Clang) on the command path; on Windows use your Python launcher in place of `python3`:

- `python3 tests/run.py` — compile and exercise the combined sketch with escape disabled and enabled.
- `python3 tests/pilot_box_demo.py` — run the three box starts and the later-threshold sensitivity test; add `--trace` to see phase changes.

The tests are developer tools for a computer. To upload the robot firmware and open its web dashboard, follow **START_HERE.md**.
