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

## DigitalTwin straight-line experiment

Open `DigitalTwin/DigitalTwin.pde` in Processing to run a sterile 30-second
straight-line trial, with signed lateral drift exported every simulated second.
See [the experiment instructions](DigitalTwin/README.md) for controls, CSV
columns, synchronisation with `main`, and model assumptions.

For repeatable Python-driven runs, CSV analysis, matplotlib plots, and comparison
with noisy models and physical observations, open
[the straight-line drift notebook](experiments/StraightLineDrift.ipynb).
[Notebook setup](experiments/README.md) includes dependencies and the observation
CSV format.
