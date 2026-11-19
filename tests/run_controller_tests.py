"""Exercise the production controller with simulated motors; requires a C++ compiler."""
import json
from pathlib import Path
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]

with tempfile.TemporaryDirectory(prefix="robot-controller-") as directory:
    work = Path(directory)
    shutil.copy(ROOT / "main/DriftSettings.h", work)
    shutil.copy(ROOT / "tests/fake_drift_settings.cpp", work)
    for stem in ("Controller", "DriftCorrection", "MotorCalibration", "OdometryModel", "TaskTimer"):
        for suffix in (".cpp", ".h"):
            shutil.copy(ROOT / "main" / (stem + suffix), work)
    (work / "Arduino.h").write_text(r'''
#pragma once
#include <algorithm>
#include <cmath>
#include <cstdint>
#include <string>
using std::max;
inline unsigned long clock_ms = 0;
inline unsigned long millis() { return clock_ms; }
constexpr float TWO_PI = 6.28318530718f;
inline std::string String(int value) { return std::to_string(value); }
struct SerialMock {
  template<class... T> void print(T...) {}
  template<class... T> void println(T...) {}
  template<class... T> void printf(T...) {}
  explicit operator bool() const { return true; }
};
inline SerialMock Serial;
''')
    (work / "Robot.h").write_text(r'''
#pragma once
#include "Arduino.h"
struct Robot_c {
  struct { uint16_t reading[5] = {}; } surface;
  int16_t left = 0, right = 0;
  int32_t left_count = 0, right_count = 0;
  bool fail_stop = false, fail_encoders = false;
  unsigned commands = 0;
  unsigned long getMillis() { return millis(); }
  void getSurfaceSensors() {}
  void getPose() {}
  bool getEncoders() { return !fail_encoders; }
  int32_t getLeftEncoderCount() { return left_count; }
  int32_t getRightEncoderCount() { return right_count; }
  int16_t getLeftMotorPWM() { return left; }
  int16_t getRightMotorPWM() { return right; }
  bool setMotorPWM(float l, float r) {
    ++commands;
    if (fail_stop && l == 0 && r == 0) return false;
    left = l; right = r; return true;
  }
};
''')
    (work / "RobotWifiAP.h").write_text(r'''
#pragma once
struct RobotWifiAP_c { template<class... T> void printf(T...) {} };
''')
    (work / "test.cpp").write_text(r'''
#include "Controller.h"
#include <cassert>
#include <iostream>
void checkMotorTest(int left_threshold, int right_threshold, int left_pwm, int right_pwm) {
  Controller_c controller;
  Robot_c robot;
  RobotWifiAP_c server;
  auto tick = [&] {
    clock_ms += 10;
    // Exercise both the constant-run baseline and higher deadband compensation.
    if (robot.left >= left_threshold) ++robot.left_count;
    if (robot.right >= right_threshold) ++robot.right_count;
    controller.update(robot, server);
  };
  controller.setSignal(1);
  assert(controller.getSignal() == 0); // Cannot bypass calibration.
  for (int i = 0; i < 4000 && !controller.isReadyToStart(); ++i) tick();
  assert(controller.isReadyToStart());
  assert(robot.left == 0 && robot.right == 0);
  controller.setSignal(1);
  tick();
  assert(robot.left == left_pwm && robot.right == right_pwm);
  robot.fail_stop = true;
  for (int i = 0; i < 350; ++i) tick();
  assert(controller.getSignal() == 1); // Stop has not been acknowledged.
  assert(!controller.isReadyToStart());
  robot.fail_stop = false;
  tick();
  assert(robot.left == 0 && robot.right == 0);
  assert(controller.isReadyToStart());
  const auto commands = robot.commands;
  for (int i = 0; i < 1000; ++i) tick();
  assert(robot.commands == commands); // No automatic recalibration/movement.
  controller.setSignal(1);
  tick();
  assert(robot.left == left_pwm && robot.right == right_pwm); // Repeat without recalibrating.
}
int main() {
  checkMotorTest(60, 70, 100, 100);
  checkMotorTest(95, 100, 100, 105);
  std::cout << "Controller regression tests passed\n";
}
''')
    sources = [str(p) for p in work.glob("*.cpp") if p.name != "test.cpp"]

    def build_and_run(main, flags):
        binary = work / "test"
        subprocess.run(["c++", "-std=c++17", "-I", str(work), *flags, *sources,
                        str(main), "-o", str(binary)], check=True)
        return subprocess.check_output([str(binary)], text=True)

    print(build_and_run(work / "test.cpp", []).strip())
    results = []
    for master, recovery in ((0, 0), (0, 1), (1, 0), (1, 1)):
        flags = [f"-DROBOT_DRIFT_CORRECTION={master}",
                 f"-DROBOT_DRIFT_PATH_RECOVERY={recovery}"]
        output = build_and_run(ROOT / "tests/drift_controller.cpp", flags)
        results.append([json.loads(line) for line in output.splitlines()])
    disabled, recovery_only, basic, refined = results
    assert disabled == recovery_only, "Recovery must respect the master switch"
    for off, base, fast in zip(disabled, basic, refined):
        assert off["first_tick"] == 0
        assert 0 < fast["first_tick"] < base["first_tick"]
        assert fast["response_mm"] < base["response_mm"]
        assert base["final_mm"] < off["final_mm"], (base, off)
        assert fast["final_mm"] < min(base["final_mm"], fast["peak_mm"] * 0.5), fast
        if fast["disturbance"] == "persistent":
            # Sustained tracking with useful forward travel, even during the
            # last half-second, rules out a lucky endpoint or stopping in place.
            for corrected in (base, fast):
                assert corrected["tail_rad"] < off["tail_rad"] * 0.1
                assert corrected["tail_mm"] < off["tail_mm"] * 0.1
                assert corrected["forward_mm"] > off["forward_mm"]
        print(f'{fast["disturbance"].capitalize()} drift toward {fast["side"]}: basic/refined response '
              f'{base["first_tick"] * 10}/{fast["first_tick"] * 10} ms, '
              f'{base["response_mm"]:.1f}/{fast["response_mm"]:.1f} mm; '
              f'final offset off/basic/refined '
              f'{off["final_mm"]:.1f}/{base["final_mm"]:.1f}/{fast["final_mm"]:.1f} mm; '
              f'late peak heading {off["tail_rad"]:.3f}/{base["tail_rad"]:.3f}/{fast["tail_rad"]:.3f} rad; '
              f'forward {off["forward_mm"]:.1f}/{base["forward_mm"]:.1f}/{fast["forward_mm"]:.1f} mm')
