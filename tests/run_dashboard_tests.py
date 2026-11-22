"""Compile production dashboard/controller code against deterministic transport/I2C fakes."""
from pathlib import Path
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]

# Keep this harness independent of ESP-IDF so lease and stop regressions can be
# checked without attaching a robot or issuing any physical motor commands.
with tempfile.TemporaryDirectory(prefix="robot-dashboard-") as directory:
    work = Path(directory)
    shutil.copy(ROOT / "main/DriftSettings.h", work)
    shutil.copy(ROOT / "tests/fake_drift_settings.cpp", work)
    for stem in ("Controller", "DriftCorrection", "RobotDashboard", "MotorCalibration", "OdometryModel", "TaskTimer"):
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
  struct { uint16_t reading[5] = {0, 0, 1500, 0, 0}; } surface;
  int16_t left = 0, right = 0;
  int32_t left_count = 0, right_count = 0;
  bool fail_stop = false, fail_drive = false, fail_encoders = false;
  unsigned long getMillis() { return millis(); }
  void getSurfaceSensors() {}
  void getPose() {}
  bool getEncoders() { return !fail_encoders; }
  int32_t getLeftEncoderCount() { return left_count; }
  int32_t getRightEncoderCount() { return right_count; }
  int16_t getLeftMotorPWM() { return left; }
  int16_t getRightMotorPWM() { return right; }
  bool setMotorPWM(float l, float r) {
    if ((fail_stop && l == 0 && r == 0) || (fail_drive && (l || r))) return false;
    left = l; right = r; return true;
  }
};
''')
    (work / "RobotWifiAP.h").write_text(r'''
#pragma once
#include "Arduino.h"
struct RobotWifiAP_c {
  bool connected = true;
  uint32_t generation = 1;
  uint32_t clientGeneration() const { return generation; }
  std::string input, output;
  template<class... T> void printf(T...) {}
  bool clientConnected() { return connected; }
  void disconnectClient() { connected = false; input.clear(); }
  size_t available() { return input.size(); }
  int read() { if (input.empty()) return -1; int c = input[0]; input.erase(0, 1); return c; }
  bool sendLine(const char* s) { output += s; output += '\n'; return true; }
  bool sendBuffer(const uint8_t* s, size_t n) { output.append((const char*)s, n); return true; }
};
''')
    (work / "test.cpp").write_text(r'''
#include "RobotDashboard.h"
#include <cassert>
#include <cstdio>
#include <cstring>
#include <iostream>
extern bool fail_settings_write;
int main() {
  Controller_c controller;
  Robot_c robot;
  RobotWifiAP_c server;
  RobotDashboard_c dashboard;
  int right_ticks = 1;
  controller.enableDashboardControl(robot);
  assert(controller.loadSettings());
  auto tick = [&] {
    clock_ms += 10;
    if (robot.left > 0) ++robot.left_count;
    if (robot.right > 0) robot.right_count += right_ticks;
    dashboard.update(robot, controller, server);
    controller.update(robot, server);
  };
  auto command = [&](std::string value) {
    const auto offset = server.output.size();
    server.input += value + "\n";
    tick();
    return server.output.substr(offset);
  };
  auto expectTelemetryPWM = [&](int left, int right) {
    const auto offset = server.output.size();
    for (int i = 0; i < 5; ++i) tick();
    const auto expected = "\"left_pwm\":" + std::to_string(left)
                        + ",\"right_pwm\":" + std::to_string(right) + ",";
    assert(server.output.substr(offset).find(expected) != std::string::npos);
  };
  for (int i = 0; i < 200; ++i) tick();
  assert(robot.left == 0 && robot.right == 0); // Boot never calibrates or moves.
  command("START open_loop");
  assert(server.output.find("hello_required") != std::string::npos);
  assert(command("SETTINGS 1 1").find("hello_required") != std::string::npos);
  assert(command("HELLO").find("\"drift_correction\":false,\"drift_path_recovery\":false") != std::string::npos);
  assert(dashboard.sessionActive());
  assert(server.output.find("\"protocol\":1") != std::string::npos);
  assert(command("SETTINGS 0 1").find("\"drift_correction\":false,\"drift_path_recovery\":true") != std::string::npos);
  assert(command("SETTINGS 2 0").find("invalid_settings") != std::string::npos);
  fail_settings_write = true;
  assert(command("SETTINGS 1 1").find("settings_write_failed") != std::string::npos);
  assert(command("HELLO").find("\"drift_correction\":false,\"drift_path_recovery\":true") != std::string::npos);
  fail_settings_write = false;
  // Sweep operates before calibration. Test both boundaries of the run count,
  // independent signed wheel rates, actual elapsed time, and the final stop.
  for (const char* invalid : {"", " 0", " 101", " -1", " 1.5", " 2x"}) {
    assert(command(std::string("START pwm_sweep") + invalid).find("\"ok\":false") != std::string::npos);
  }
  assert(command("START pwm_sweep 100").find("\"ok\":true") != std::string::npos);
  command("STOP");
  command("SETTINGS 1 1");
  assert(command("START pwm_sweep 2").find("\"ok\":true") != std::string::npos);
  assert(command("START motor_test").find("\"ok\":false") != std::string::npos);
  right_ticks = -2;
  for (int run = 1; run <= 2; ++run) {
    // Include rundown during settling and confirm the zero-PWM sample excludes
    // it. The rejected start above took one 10 ms tick in run 1.
    const auto settling_start = server.output.size();
    for (int i = (run == 1 ? 1 : 0); i < 200; ++i) {
      if (i % 50 == 0) server.input += "PING\n";
      ++robot.left_count;
      --robot.right_count;
      tick();
    }
    dashboard.update(robot, controller, server);
    assert(server.output.substr(settling_start).find("pwm_sample") == std::string::npos);
    for (int pwm = 0; pwm <= 300; pwm += 5) {
      assert(robot.left == pwm && robot.right == pwm);
      for (int step = 0; step < 200; ++step) {
        if (step % 50 == 0) server.input += "PING\n";
        if (run == 2 && pwm == 5 && step == 199) clock_ms += 7;
        tick();
      }
      const auto offset = server.output.size();
      dashboard.update(robot, controller, server);
      auto packet = server.output.substr(offset);
      int recorded_run, recorded_pwm, elapsed, left, right;
      double left_speed, right_speed;
      assert(std::sscanf(packet.c_str(),
          "{\"type\":\"pwm_sample\",\"run\":%d,\"pwm\":%d,\"elapsed_ms\":%d,"
          "\"left_delta\":%d,\"right_delta\":%d,\"left_rad_s\":%lf,\"right_rad_s\":%lf}",
          &recorded_run, &recorded_pwm, &elapsed, &left, &right, &left_speed, &right_speed) == 7);
      assert(recorded_run == run && recorded_pwm == pwm);
      assert(elapsed == (run == 2 && pwm == 5 ? 2007 : 2000));
      assert(left == (pwm == 0 ? 0 : 200) && right == left * right_ticks);
      const double factor = 2 * M_PI * 1000 / (358.3 * elapsed);
      assert(std::abs(left_speed - left * factor) < 1e-5);
      assert(std::abs(right_speed - right * factor) < 1e-5);
      const bool done = packet.find("{\"type\":\"pwm_sweep_done\"}") != std::string::npos;
      assert(done == (run == 2 && pwm == 300));
    }
  }
  assert(!controller.dashboardBusy() && robot.left == 0 && robot.right == 0);
  right_ticks = 1;
  command("START pwm_sweep 1");
  for (int i = 0; i < 410; ++i) {
    if (i % 50 == 0) server.input += "PING\n";
    tick();
  }
  assert(robot.left == 5);
  command("STOP");
  assert(!controller.dashboardBusy() && robot.left == 0 && robot.right == 0);
  command("START pwm_sweep 1");
  robot.fail_encoders = true;
  const auto interrupted = server.output.size();
  tick();
  assert(std::strcmp(controller.dashboardState(), "fault") == 0);
  assert(!controller.dashboardBusy() && robot.left == 0 && robot.right == 0);
  assert(server.output.substr(interrupted).find("pwm_sweep_done") == std::string::npos);
  robot.fail_encoders = false;
  // A fresh calibration clears a sensor fault, then STOP leaves it uncalibrated.
  command("CALIBRATE");
  command("STOP");
  command("SETTINGS 0 1");
  command("START line_follow");
  assert(robot.left == 0); // Calibration required for closed-loop/motor test.
  command("START open_loop");
  assert(robot.left == 100 && robot.right == 100);
  expectTelemetryPWM(100, 100);
  robot.fail_stop = true;
  command("STOP");
  assert(std::strcmp(controller.dashboardState(), "stopping") == 0);
  expectTelemetryPWM(100, 100); // A failed stop still reports the acknowledged drive.
  command("START open_loop");
  assert(std::strcmp(controller.dashboardState(), "stopping") == 0);
  robot.fail_stop = false;
  tick();
  assert(robot.left == 0 && robot.right == 0);
  expectTelemetryPWM(0, 0);
  for (int i = 0; i < 40; ++i) tick();
  assert(robot.left == 0); // Stop cannot trigger automatic calibration.
  assert(robot.setMotorPWM(137, -62));
  expectTelemetryPWM(137, -62); // Report the robot's commands, not a run default.
  command("STOP");
  command("START open_loop");
  for (int i = 0; i < 151; ++i) tick();
  assert(robot.left == 0 && !dashboard.sessionActive() && !server.connected);
  server.connected = true;
  command("HELLO");
  command(std::string(120, 'x') + "START open_loop");
  tick();
  assert(robot.left == 0);
  assert(server.output.find("line_too_long_or_invalid") != std::string::npos);
  command("CALIBRATE");
  for (int i = 0; i < 35; ++i) tick();
  assert(robot.left > 0);
  server.connected = false;
  tick();
  assert(robot.left == 0 && robot.right == 0); // Disconnect stops calibration too.
  server.connected = true;
  command("HELLO");
  command("CALIBRATE");
  for (int i = 0; i < 100 && !controller.dashboardReady(); ++i) {
    if (i % 30 == 0) command("PING");
    tick();
  }
  assert(controller.dashboardReady());
  command("START line_follow");
  assert(robot.left == 45 && robot.right == 45);
  robot.surface.reading[1] = 1000;
  tick();
  assert(robot.left == 35 && robot.right == 55); // Variable-PWM tuning is unchanged.
  expectTelemetryPWM(35, 55);
  command("STOP");
  robot.surface.reading[1] = 0;
  command("START motor_test");
  assert(robot.left == 100 && robot.right == 100);
  expectTelemetryPWM(100, 100);
  assert(command("SETTINGS 1 1").find("\"drift_correction\":true,\"drift_path_recovery\":true") != std::string::npos);
  robot.right_count += 5;
  tick();
  assert(robot.left == robot.right);  // A save cannot change steering mid-run.
  command("STOP");
  command("START motor_test");
  ++robot.right_count;
  tick();
  assert(robot.left > robot.right);   // New run uses saved path recovery on first tick of mismatch.
  command("STOP");
  command("SETTINGS 1 0");
  command("START motor_test");
  ++robot.right_count;
  tick();
  assert(robot.left == robot.right);  // Basic mode waits for a larger difference.
  robot.right_count += 4;
  tick();
  assert(robot.left > robot.right);
  Controller_c rebooted;
  assert(rebooted.loadSettings());
  rebooted.reset();
  assert(rebooted.savedDriftSettings()->correction && !rebooted.savedDriftSettings()->pathRecovery);
  command("STOP");
  command("START open_loop");
  for (int i = 0; i < 3100; ++i) {
    if (i % 30 == 0) command("PING");
    tick();
  }
  assert(robot.left == 0 && !controller.dashboardBusy()); // Firmware deadline.
  command("START open_loop");
  ++server.generation;
  command("PING");
  assert(robot.left == 0 && !dashboard.sessionActive()); // Replacement cannot inherit lease.
  command("HELLO");
  command("START open_loop");
  robot.fail_drive = true;
  tick();
  assert(robot.left == 0);
  assert(std::strcmp(controller.dashboardState(), "fault") == 0);
  assert(!controller.startFromDashboard(robot, "open_loop"));
  assert(server.output.find("\"pose_source\":\"odometry\"") != std::string::npos);
  assert(server.output.find("\"sensors\":[0,0,1500,0,0]") != std::string::npos);
  std::cout << "Dashboard firmware regression tests passed\n";
}
''')
    sources = [str(path) for path in work.glob("*.cpp")]
    subprocess.run(["c++", "-std=c++17", "-I", str(work), *sources,
                    "-o", str(work / "test")], check=True)
    subprocess.run([str(work / "test")], check=True)
