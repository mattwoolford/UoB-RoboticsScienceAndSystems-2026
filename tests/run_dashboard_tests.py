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
    for stem in ("Controller", "RobotDashboard", "MotorCalibration", "OdometryModel", "TaskTimer"):
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
#include <cstring>
#include <iostream>
int main() {
  Controller_c controller;
  Robot_c robot;
  RobotWifiAP_c server;
  RobotDashboard_c dashboard;
  controller.enableDashboardControl(robot);
  auto tick = [&] {
    clock_ms += 10;
    if (robot.left > 0) ++robot.left_count;
    if (robot.right > 0) ++robot.right_count;
    dashboard.update(robot, controller, server);
    controller.update(robot, server);
  };
  auto command = [&](std::string value) { server.input += value + "\n"; tick(); };
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
  command("HELLO");
  assert(dashboard.sessionActive());
  assert(server.output.find("\"protocol\":1") != std::string::npos);
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
