# Physical box escape · combined Stamp-C3 template

The physical robot stays idle on power-up. **Start trial** on the robot’s web dashboard starts the baseline escape and the recording together. Escape is enabled in this package. No motor calibration, terminal command or code change is needed for that first run. Start from a fresh boot when comparing uncalibrated runs.

## Upload from a laptop

1. Extract the ZIP. In Arduino IDE on Windows, macOS or Linux, open **firmware/BoxEscape/BoxEscape.ino**. Keep every file in that sketch folder. Connect the robot by USB with a data cable.
2. Select the **M5StampC3** board configuration used with the course template and the USB port for this robot. If the board is missing, install the course's ESP32-compatible board support before uploading. Keep the known working USB settings for this hardware (the original setup used **USB CDC on Boot: Disabled**, where available).
3. Click **Verify**, then **Upload**. Open **Serial Monitor** at **115200 baud** and press the Stamp-C3 **RESET** button. A successful web startup prints a line like `# Web dashboard: http://192.168.4.1/`. The separate `# Wi-Fi TCP:` line refers to the text terminal.

## Run the physical baseline

1. On the laptop, tablet or phone used to operate the robot, join **BoxEscape**, password **BoxEscapePad**. Stay connected even if the device reports no internet. Open the **Web dashboard** address printed in Serial Monitor (usually `http://192.168.4.1/`, without `:8080`).
2. Put the powered robot on the marked start pose. Check the live front and rear IR readings and start your camera if recording video. **Start trial** commands actual robot motion. Do not send `C`: the experiment uses the supplied motor commands, sensor thresholds and nominal wheel geometry. Taking a fresh encoder baseline at the start simply sets the odometry origin.
3. Press **Start trial** once. Watch for the test number and running state. A live CSV snapshot is available; the finished file includes the final state and recorded reason.
4. Let the pilot finish, or press **Stop trial**. The physical **USER** button also requests a stop during motion; it is not a start button. If the browser disconnects during a web-started run, use the physical stop if needed. Keep the power switch reachable. A software stop needs a working connection to the motor board.
5. Leave the dashboard connected until the finished CSV is archived. Keep the numbered download (e.g. `box-escape-test-0001.csv`); if your browser blocks an automatic download, use the download link beside that trial. Reposition at the mark, then press **Start trial** for the next attempt.

Use **Calibration & telemetry** to see what the controller knows. The live x/y/heading values are estimated from encoder ticks with nominal wheel dimensions; they are relative to the start and are not an independent measurement of the body's position. The back-left, front and back-right IR values are raw counts evaluated against the existing thresholds. No fresh IR distance calibration runs. Forward motor thresholds are measured only after an explicit `C`; unknown is expected at startup. The CSV records whether that check had been run. To investigate an unexpected motion, open the finished trial in **Review** and compare its **Why did the trial end?** evidence with the video from that run.

Each final CSV is saved by the dashboard in **that browser**. A different laptop or a cleared browser profile does not have the archive. If browser storage fails, save the finished file manually before continuing. The robot’s test counter survives a normal reset; the robot’s in-memory trace does not. If the connection drops, reconnect before another trial or reset to recover its latest trace. The tracker never starts the motors merely because you open a page.

An unconfirmed opening is now logged as a retry: the robot discards that edge, searches for a wall again and keeps the same trial number. Ordinary escape searching has no overall time or travel cutoff. Use **Stop trial** to end a run if the robot keeps circling. The controller can still stop if it loses valid feedback or cannot carry out a motion command.

If a trial ends in **FAULT**, save the CSV, read the controller reason and correct the cause. Use **Stop trial** (or send `X` in the terminal) to clear the fault after inspection before starting again. A failed attempt is useful baseline evidence; do not change the gains or geometry until you have recorded it. If the board reports the IR/I²C pins overlap, correct the selected board or wiring first. If no numbered test is created, read the dashboard’s control message.

## Optional bench experiments, after the baseline

These tests are separate from an escape trial. Use USB Serial Monitor at **115200 baud**, line ending **Newline**; `?` shows commands, `H` prints column names. Motors and odometry can be tested from any supported computer.

- `C` explicitly moves the wheels to measure each motor’s minimum forward starting power. Wait for **Forward wheel thresholds measured**. It is **not** started by the dashboard.
- After `C`, use `S` for a bounded straight trial (up to 100 mm estimated or 3 seconds), `T` or `L` for clockwise/anticlockwise quarter turns, and `P` for a pivot. `G`/`V` are four-turn tests. Use the ruler or protractor to measure what the body did.
- If you ran `C` and want a new **uncalibrated** baseline, archive the latest trial first and reset; do not run `C` again. Keep the baseline settings and copies of the logs you compare.

Open the dashboard’s **Review a trial** link or [review/index.html](../review/index.html) offline to compare your numbered CSV with a simulation. See the [paired trial guide](../TRIAL_GUIDE.md).

## Measurements for later improvements

| Where | Measure this | Use it for |
|---|---|---|
| MotionSettings.h · wheel radii and separation | Ruler distance versus the S test’s encoder distance; both left and right turn angles on the real floor, including coasting | Correct persistent errors before using odometry for centring and 90° turns. The starting values (16 mm radii, 90 mm separation, 358.3 counts/rev) are nominal. |
| MotionSettings.h and EscapeSettings.h · drive/turn PWM | Independent C starting thresholds, forward and reverse wheel response, and stopping distance. Reverse deadband is **not** measured by C. | Pick the lowest repeatable speed that still turns both ways and responds before contact. If you explicitly ran C, the pilot checks whether its lowest forward power exceeds those measured thresholds. A fresh uncalibrated run does not perform this check; an unsuccessful move is still logged. Straight-test drift correction is optional and off by default; it does not steer the escape pilot. |
| EscapeSettings.h · front turn and exit clearance thresholds | With the actual cardboard facing the front, measure raw values at the clearance needed to turn without touching. Check the worst case while moving slowly. | Turn with space left for braking and rotation. Your measured front 50 mm run was about 3022; the 100 mm run was about 3902. Those are reference observations, not universal thresholds. |
| EscapeSettings.h · right wall / right open / right target | Manually roll the robot along the solid right wall, through a corner, then past the opening at the same lateral clearance. Sample the **back-right** sensor, with hands away. Repeat. | Pick separate *wall present* and *opening* bands from this sensor. The observed corner value around 2500 and straight-wall value around 3000 are starting evidence. Front-sensor range tests cannot calibrate a rear corner sensor. |
| EscapeSettings.h · opening, body, edge-to-axle offset, exit travel | Measure the **full** opening width, widest body width and the effective edge offset for the selected right-sensor threshold. Mark the axle position against the actual near jamb as the reading changes. Measure the travel required for the rear of the robot to clear the outside face. | Centre the axle before turning. A rear-facing diagonal sensor can still see the near jamb after the axle has passed it. Recheck this offset whenever the threshold, wall angle or following clearance changes. A rule tuned to the wrong offset can turn into the far jamb. |
| First escape result | Log start pose, settings, pass/fail, contact, closest corner, and where the axle turned. Keep physical and simulation results separate. | CANDIDATE = pilot finished its bounded exit movement. Only direct observation confirms escape. A fault or contact is a test result, not a reason to relax all the limits. |

### Where does the robot actually turn?

The right sensor faces diagonally backwards. By the time it reads 4095 at a doorway, the axle may already be past the centre. The pilot first tracks solid wall (at or below **3350**), marks the axle when the right reading rises to **3450**, then confirms the gap at or above **3650** for at least **100 ms** and **5 mm** of forward travel. These three numbers are trial settings for the rear-right sensor; measure them on your cardboard.

With the motors idle, roll along the wall slowly enough to see the change in the monitor. Tape a mark at the near doorpost and another where the axle is when the reading first crosses the selected edge value. Measure **along the wall**, not from the sensor to the cardboard. That distance is `EDGE_TO_AXLE_OFFSET_MM` (positive if the axle has passed the near post). With the supplied placeholders, the target is **150 / 2 − 60 = 15 mm** beyond that first mark. If measuring shows the axle is already at or beyond the centre before confirmation, change how early you mark the edge or change your approach; a forward-only move cannot correct that position.

For the first physical trial, use a start beside the exit wall with enough solid wall ahead to establish a track. The escape routine has no universal low-IR stop. A low back-right reading during a corner turn no longer interrupts the turn. The front still triggers a wall turn during normal driving and can block a crossing. The separate point/pivot bench tests keep their own near-obstacle check. Try the centre start after the wall-aligned run and compare the corner clearances. Check the whole body is outside before recording a pass.

## Code map

| Files | Origin and role |
|---|---|
| TopIR.h / .cpp | Hamad’s Stage 1 sensor driver, unchanged: GPIO0 back left, GPIO1 front, GPIO4 back right. One discarded ADC conversion followed by a retained raw reading. The controller keeps reading throughout the run instead of stopping at 200 samples. |
| Robot.h / .cpp, i2c_datatypes.h, TaskTimer.*, OdometryModel.* | Template interfaces taken from the group motors snapshot, including the low-level PWM driver and Paul’s encoder pose model. One shared odometry instance and fresh encoder readings during motion. No bottom-sensor navigation or IMU is used. |
| MotorCalibration.*, DriftCorrection.* | Group’s physical motor components. Calibration is exclusive: escape and straight-driving code cannot issue commands during its wheel ramps. DriftSettings.h holds plain sketch settings rather than requiring the ESP-IDF flash partition/dashboard. |
| Controller.*, MotionSettings.h | One motion controller and user-adjustable bench settings. Adapts the odometry branch’s point/pivot and four-quarter-turn protocol to Paul’s existing model and fixes the missing declarations/setter problem. The tests stream results live; the branch’s reset-retained trial buffer is not included. |
| EscapePilot.*, EscapeSettings.h | New single-box controller. Uses the three IR readings and relative wheel odometry to request left/right PWM; only the outer controller actually writes the motors. |
| RobotWifiAP.*, BoxEscape.ino | Wi-Fi access point and raw text console on port 8080. The sketch starts both services, parses terminal commands and publishes live telemetry. |
| BoxDashboard.*, TrialRecorder.* | HTTP dashboard on port 80 with Start/Stop, automatic escape recording and numbered CSV export. The separate trial review is read-only. |

## Untethered terminal (optional)

For commands over Wi-Fi, use a **text TCP client** in client mode on a laptop or mobile device. Join the same robot network and use the IP and port printed on the **Wi-Fi TCP** line (normally `192.168.4.1:8080`). Send one letter plus a newline: **?** for help, **H** for column names. Only one terminal controls the robot at a time. The web dashboard on port 80 is independent of the terminal. Network credentials are defined in `BoxEscape.ino`. For group sessions use the dashboard for each start so the previous final CSV is archived before another trial. The same one-letter `E` escape command remains available for terminal users.

If a run was started by a TCP terminal and loses that client, the sketch requests a stop when it detects the disconnect. A radio dropout may take time to detect; the physical stop and power switch remain important. Detailed turn-result rows appear on USB serial; the TCP stream includes mode, phase, raw counts and estimated angle.

## Sources

- [Team motors firmware](https://github.com/mattwoolford/UoB-RoboticsScienceAndSystems-2026/tree/9e5308ab613201c89afcda7876d7bfde7c565416/main)
- [Team turn experiment](https://github.com/mattwoolford/UoB-RoboticsScienceAndSystems-2026/blob/017fafc924f0b7841f97e30c07da0ee14de1fafc/StampC3_Template/Controller.cpp)
- [Paul’s original Stamp-C3 template](https://github.com/paulodowd/RoboticsScienceAndSystems/tree/2dd585408a3e0a2f389c8e56dc42f4b960d3cb71/StampC3_Template)
- Hamad_TopIR_Stage1.zip and ruler measurements supplied by Hamad.

See TEST_RESULTS.md for what was tested off-board and what still requires the actual robot. The tests/ directory is for a computer; it belongs outside the Arduino sketch folder. The sketch is supplied under the included GPL licence; the original LED-code notice is in BoxEscape/.
