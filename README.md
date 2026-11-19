# Robotics Science And Systems

### Team Ctrl+Alt+Elite

- Arnav Nair
- Hamad Alkhataf
- Jakub Wrzyszcz
- Matt Woolford

This repository contains the group work for the 2026 Robotics Science and Systems module at the University of Bristol.

## Building the robot firmware

The `main` folder contains firmware for the M5Stack Stamp C3 (ESP32-C3)
attached to the 3Pi+ robot. The CMake build uses ESP-IDF 6.1, with Arduino
as an ESP-IDF component because the firmware uses Arduino, Wire and WiFi APIs.
PlatformIO is not required.

Activate the installed ESP-IDF environment and build:

```sh
source /Users/mattwoolford/.espressif/v6.1/esp-idf/export.sh
idf.py build
```

Alternatively, after activating that environment, use CMake directly:

```sh
cmake -S . -B build -G Ninja
cmake --build build
```

The first configuration needs internet access to download the pinned Arduino
ESP32 component, its dependencies, and the Pololu LSM6 and LIS3MDL libraries.
The Arduino revision is pinned to one declaring ESP-IDF 6.1 support and fetched
as a SHA-256-verified source archive, avoiding a large Git history download.
ESP-IDF registers it as a local component and resolves its remaining dependencies
through the component manager. Downloads are cached between builds; avoid deleting
the build directory unless you need a clean configuration.
`main/main.ino` is compiled directly as C++, with its own entry in the compile
database for IDE reference resolution; Arduino autostart calls its `setup()` and
`loop()` functions. All existing
`main/*.cpp` files are registered in `main/CMakeLists.txt`; add new source files
there as the project grows. `DigitalTwin` is not part of this build.

Build outputs include `build/RoboticsScienceAndSystems.elf` and `.bin`.
To flash and monitor a connected Stamp C3 (substitute its serial port):

```sh
idf.py -p /dev/cu.usbserial-XXXX flash monitor
```

In CLion, configure the CMake toolchain environment using the ESP-IDF
`export.sh` script, use Ninja, and reload CMake with a fresh build directory.
The project defaults to ESP32-C3. An exported `IDF_PATH` takes precedence over
the local installation fallback in `CMakeLists.txt`.

`sdkconfig.defaults` enables Arduino autostart, a 1 kHz FreeRTOS tick, the
Wire/Network/WiFi libraries, and 4 MB flash. Use `idf.py menuconfig` for local
configuration changes. Commit the generated `dependencies.lock` when updating
managed dependencies to preserve their resolved versions.

### Encoder drift correction

After connecting, open **Physical robot → Settings**, choose **Encoder drift
correction** and **Path recovery**, and select **Save settings**. The robot
saves both values in flash and reports them back to the dashboard. They apply
to the next three-second **Motor start / stop** test, whether started from the
dashboard or the local button. Power cycles, disconnects and subsequent runs
preserve the saved values. You can turn either flag on or off independently.

| `ROBOT_DRIFT_CORRECTION` | `ROBOT_DRIFT_PATH_RECOVERY` | Motor test behaviour |
| --- | --- | --- |
| OFF | Either | Uses the original forward PWM for each wheel. |
| ON | OFF | Holds the starting heading. With nominal wheels, feedback begins at three net counts of difference between the encoders. |
| ON | ON | Can react to one count of difference on the next 10 ms control update and steers back toward the starting line. |

The CMake options set the defaults after a firmware flash. Both default to
`OFF`. For example, this builds firmware with both defaults enabled.

```sh
idf.py -DROBOT_DRIFT_CORRECTION=ON -DROBOT_DRIFT_PATH_RECOVERY=ON build
```

Use `idf.py flash` for the first upgrade so the robot receives the new partition
table. After that, both `idf.py flash` and `idf.py app-flash` write the dedicated
`robot_settings` partition, restoring the build defaults even when reflashing
the same firmware. For an existing build configuration that uses the former
single-app-large partition table, select
**Partition Table → Partition Table → Custom partition table CSV** in
`idf.py menuconfig`, use `partitions.csv`, then run `idf.py flash`.
Calibration, line following and the equal-PWM experiment use their own motor
commands.

The controller uses wheel travel from encoder odometry to estimate heading.
Path recovery also measures the signed lateral offset from the axle's position
and heading at the first drive command. It aims 75 mm ahead along that line.
Both modes limit steering to ±30 PWM per wheel and learn a trim for a sustained
motor imbalance over the run. Wheel slip or a sideways push that produces no
encoder difference can leave a physical offset the controller cannot observe.
The gains and lookahead are in [DriftCorrection.cpp](main/DriftCorrection.cpp).

## DigitalTwin straight-line experiment

Open `DigitalTwin/DigitalTwin.pde` in Processing to run a sterile 30-second
straight-line trial, with signed lateral drift exported every simulated second.
See [the experiment instructions](DigitalTwin/README.md) for controls, CSV
columns, synchronisation with `main`, and model assumptions.

## Web dashboard

Use the [Robot Lab dashboard](dashboard/README.md) to run single or batch simulation
trials, inspect live trajectories and drift, download CSV/Excel results, and
connect to the real robot over WiFi. The app uses Vite, React and TypeScript with
a local Python simulation/TCP bridge. It replaces the Jupyter notebook setup.

The robot now boots stopped and supports explicit calibration, bounded test runs,
telemetry and connection-loss stopping. See the dashboard guide for installation,
WiFi credentials, firmware behaviour, and verification commands.
