# Robot Lab dashboard

A local Vite / React / TypeScript dashboard for the actual Processing digital twin
and the Stamp C3 robot. A Python service compiles/runs the existing simulator and
bridges HTTP to the robot's WiFi TCP protocol. No Jupyter installation is needed.
The app runs on the computer connected to the robot; it is not a cloud service.

## Start

Requirements: Node.js 22.12+ (or 20.19+), pnpm 9.9.0, Python 3.10+, and Processing 4
with its bundled Java mode/JDK. The dashboard uses pnpm exclusively; its
`packageManager` field pins version 9.9.0 and `pnpm-lock.yaml` records dependency
versions. If Corepack is available, activate the pinned version once:

```sh
corepack enable
corepack prepare pnpm@9.9.0 --activate
```

If Corepack is unavailable, install pnpm 9.9.0 using your platform's pnpm
installation method before continuing. Install project dependencies once from
the repository root:

```sh
python3 -m venv experiments/.venv
experiments/.venv/bin/python -m pip install -r experiments/requirements.txt
pnpm --dir dashboard install --frozen-lockfile
```

Start the dashboard from its project directory:

```sh
cd dashboard
pnpm dev
```

Or run `pnpm --dir dashboard run dev` from the repository root. This single
command starts the Python API and Vite together. **Ctrl+C** stops both services,
including any simulation processes owned by the API; no separate backend
terminal is needed.

The launcher uses `experiments/.venv/bin/python` automatically
(`experiments/.venv/Scripts/python.exe` on Windows). Set `DASHBOARD_PYTHON` to a
different Python executable path if your dependencies are installed elsewhere.
On Windows, use that `Scripts/python.exe` path for the dependency installation
command above as well.

Open **http://127.0.0.1:5173**. Vite forwards `/api` to `127.0.0.1:8765`.
If Processing is installed elsewhere, set `PROCESSING_RESOURCES` before running
`pnpm dev`; the Python service inherits it. This directory must contain `jdk`
and `modes/java`; the default is
`/Applications/Processing.app/Contents/app/resources`.

For a built app without the Vite dev server, run from the repository root:

```sh
pnpm --dir dashboard run build
experiments/.venv/bin/python -m dashboard.server.app
```

Open **http://127.0.0.1:8765**; Python serves `dashboard/dist` and the API together.
Both servers bind loopback. Keep these services local; the robot is reached over
WiFi by the Python process, not directly by the browser.

## Run simulations

Choose **Virtual robot**, a candidate, trial count and seed. Run a single model,
all models sequentially, or all models in parallel. Sterile always runs once;
the other candidates use the requested count (1–100). All tests use the original
fixed 10 ms physics step, equal PWM 100/100, and 30 simulated seconds. The PWM comes
from `Controller_c.CONSTANT_PWM` in `DigitalTwin/Controller.pde`, matching the
physical constant-run setting. Dashboard PWM readings come from the selected
trial's actual Java samples, streamed once per simulated second. Headless runs are fast;
turn on the Processing window option to watch real-time motion (Space pauses).
Compilation happens before samples appear. While running, **Run simulation** is
replaced by **Stop simulation** in the same location. Stopping terminates all
child processes, including compilation and live windows.

Trajectory/drift plots identify a particular model and trial. Positive lateral
drift is left of the starting line. This is simulated world pose; the noise
candidates are illustrative and are not calibrated hardware predictions.

Successful selections save CSV and Excel files under `dashboard/results/<run-id>/`.
The download buttons export the latest successful selection during this API
session. Restarting the service clears its in-memory history; saved files remain.
A failed or cancelled job retains previous exports. The dashboard never overwrites
`experiments/data/straight_line_results.xlsx` or its physical observations.
The Excel export includes comparison formulas and an empty observation sheet.
The Python analysis utilities remain available for fitting measured observations.

## Connect the physical robot

1. Build and flash the firmware in `main` using the root README instructions.
2. On the computer running the API, join the selected robot’s WiFi network using
   that robot’s credentials. Robot names and WiFi network names can vary.
3. Choose **Physical robot**, enter that robot’s IP address and TCP port, and
   connect. **192.168.4.1:80** is the default for this firmware, not a requirement.
4. Use **Calibrate** before motor-test or line-follow runs. Calibration moves the
   wheels. An equal-PWM open-loop run starts without calibration and uses the
   firmware’s `Controller_c::CONSTANT_PWM` setting in
   [`main/Controller.h`](../main/Controller.h) for up to 30 seconds. Physical PWM is
   configured independently of the simulation protocol; check the motor telemetry
   for the PWM commands acknowledged by the connected robot.
5. Select a procedure and start. **Stop robot** appears directly below the
   calibration/start controls. It is enabled only while connected with active
   calibration, driving, or an unconfirmed motor stop; idle/disconnected robots
   cannot be stopped. A stop request keeps the WiFi connection open for monitoring; check
   the robot state and zero PWM to confirm it has stopped.

The dashboard connects only to the entered IP address and TCP port. It checks
protocol version 1 and valid telemetry; it does not inspect the WiFi SSID or match
the robot name in the handshake. Every interchangeable robot must run compatible
dashboard firmware. When swapping robots, disconnect in the dashboard, join the
replacement robot’s network, update the address/port if needed, and reconnect.
A new connection clears the previous robot’s telemetry and trajectory.

The access-point name and password in `main/main.ino` configure the network that
that particular firmware advertises (currently `robot-matt` / `abcde123`). They
are not dashboard connection requirements; use the credentials of the robot you
are actually connecting to. Network selection is handled by the computer’s WiFi
settings, not by the web app.

The firmware boots stopped. Outside a dashboard session, the first local button
press requests calibration; the next starts the existing motor test. While the
dashboard owns a session, the button does not start another procedure.
Motor-test runs last about 3 seconds; line-follow runs are bounded to 30 seconds
and retain the 5-second line-search timeout. A new start resets trial odometry.
Remote calibration and driving stop on TCP disconnect or a 1.5-second firmware
heartbeat timeout. The API only supplies heartbeats while a visible dashboard
keeps its browser lease alive. Closing/hiding the tab or losing the API therefore
stops remote operation and requires reconnecting; it never resumes by itself.
A failed I2C stop is retried and displayed as `stopping`, blocking new starts.

Hardware plots show **encoder odometry**, not independently measured physical
drift. Both PWM readings come directly from robot telemetry and update when the
firmware setting or command changes, including zero when a stop succeeds. PWM is
the acknowledged command, not measured wheel speed. Sensor readings
are cached I2C values. The UI does not infer ground truth or a battery reading.
Only one TCP client can own the robot; close the old Processing live-comparison
connection before connecting the dashboard.

## Project structure

- `src/components/`: focused controls, telemetry, plots and result views.
- `src/hooks/`: polling, browser lease and action lifecycle.
- `src/`: typed API contracts, entry point and shared styles.
- `server/app.py`: bounded local HTTP routes and static build serving.
- `server/simulations.py`: background jobs, samples, summaries and exports.
- `server/robot.py`: TCP framing, handshake, acknowledgements and leases.
- `../experiments/`: shared Java runner, model defaults and analysis utilities.
- `../main/RobotDashboard.*`: firmware command framing and JSON telemetry.

## Protocol and verification

The TCP protocol is newline framed ASCII commands with JSON replies. Send `HELLO`
to take control; expect `{"type":"hello","protocol":1,...}`. Send `PING` every
400 ms (no reply), `CALIBRATE`, `START open_loop`, `START line_follow`,
`START motor_test`, or `STOP`. Command acknowledgements contain `type: "ack"`,
`command`, `ok`, and `error`. Telemetry is emitted every 50 ms and includes device
uptime, odometry, encoder counts, PWM, five reflectance readings, readiness and
controller state. `STOP` is accepted even before `HELLO`. The API returns after
sending STOP; telemetry confirms the resulting state, including failed I2C stops.

Run from the repository root:

```sh
pnpm --dir dashboard run build
experiments/.venv/bin/python -m unittest dashboard.server.test_server -v
(cd experiments && .venv/bin/python -m unittest test_experiment test_workbook_results)
python3 tests/run_dashboard_tests.py
python3 tests/run_controller_tests.py
python3 tests/run_digital_twin_tests.py
```

The backend tests exercise real loopback HTTP/TCP sockets, fragmented records,
acknowledgement rejection, absent-browser stops, input validation and a real Java
simulation/export. Firmware tests use host-side hardware stubs. A firmware build
and these tests do not replace checking WiFi and motor behaviour on the robot.
