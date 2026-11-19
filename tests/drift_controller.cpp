// Compiled in each feature configuration by run_controller_tests.py.
#include "Controller.h"

#include <cassert>
#include <cmath>
#include <cstring>
#include <iostream>

struct Fixture {
  Controller_c controller;
  Robot_c robot;
  RobotWifiAP_c server;

  void tick() {
    clock_ms += 10;
    controller.update(robot, server);
  }

  void calibrate(bool dashboard) {
    if (dashboard) {
      controller.enableDashboardControl(robot);
      assert(controller.calibrateFromDashboard());
    }
    for (int i = 0; i < 500 && !controller.isReadyToStart(); ++i) {
      if (robot.left > 0) ++robot.left_count;
      if (robot.right > 0) ++robot.right_count;
      tick();
    }
    assert(controller.isReadyToStart());
  }
};

void checkLegacyMotorTest() {
  Fixture f;
  f.calibrate(false);
  f.controller.setSignal(1);
  f.tick();
  assert(f.robot.left == 100 && f.robot.right == 100);
  for (int i = 0; i < 25; ++i) {
    f.robot.left_count += 3;
    f.robot.right_count += 4;
    f.tick();
  }
  if (ROBOT_DRIFT_CORRECTION) assert(f.robot.left > f.robot.right);
  else assert(f.robot.left == 100 && f.robot.right == 100);
}

// Return a hardware-style signed 32-bit counter crossing its positive limit.
int32_t encoderCount(double distance, int32_t origin) {
  constexpr double mmPerCount = 2.0 * 3.141592653589793 * 16.0 / 358.3;
  int64_t count = origin + std::llround(distance / mmPerCount);
  if (count > INT32_MAX) count -= int64_t(1) << 32;
  return int32_t(count);
}

void runDisturbance(bool driftLeft, bool persistent) {
  Fixture f;
  f.calibrate(true);
  const int32_t leftOrigin = INT32_MAX - 5, rightOrigin = 900;
  f.robot.left_count = leftOrigin;
  f.robot.right_count = rightOrigin;
  assert(f.controller.startFromDashboard(f.robot, "motor_test"));
  f.tick();
  assert(f.robot.left == 100 && f.robot.right == 100);

  // Independent physical pose. Only integer encoder readings reach the robot
  // controller. The transient disturbance lasts for the first 400 ms.
  double left = 0, right = 0, heading = 0, x = 0, y = 0, peak = 0, responseMm = 0;
  double tailHeading = 0, tailOffset = 0;
  int firstTick = 0;
  for (int i = 1; i <= 298; ++i) {
    double dl = f.robot.left * 0.0125;
    double dr = f.robot.right * 0.0125;
    if (persistent || i <= 40) {
      if (driftLeft) dl *= 0.75;
      else dr *= 0.75;
    }
    left += dl;
    right += dr;
    const double yaw = (dr - dl) / 90.0;
    x += (dl + dr) * 0.5 * std::cos(heading + yaw * 0.5);
    y += (dl + dr) * 0.5 * std::sin(heading + yaw * 0.5);
    heading += yaw;
    peak = std::max(peak, std::abs(y));
    if (i > 248) {  // Largest residual errors over the final half-second.
      tailHeading = std::max(tailHeading, std::abs(heading));
      tailOffset = std::max(tailOffset, std::abs(y));
    }
    f.robot.left_count = encoderCount(left, leftOrigin);
    f.robot.right_count = encoderCount(right, rightOrigin);
    f.tick();
    assert(f.robot.left > 0 && f.robot.right > 0);
    if (f.robot.left != f.robot.right && firstTick == 0) {
      assert(driftLeft == (f.robot.left > f.robot.right));
      firstTick = i;
      responseMm = (left + right) * 0.5;
    }
  }
  std::cout << "{\"disturbance\":\"" << (persistent ? "persistent" : "transient")
            << "\",\"side\":\"" << (driftLeft ? "left" : "right")
            << "\",\"first_tick\":" << firstTick << ",\"response_mm\":" << responseMm
            << ",\"peak_mm\":" << peak << ",\"final_mm\":" << std::abs(y)
            << ",\"tail_rad\":" << tailHeading << ",\"tail_mm\":" << tailOffset
            << ",\"forward_mm\":" << x << "}\n";
  f.tick();  // 3 s firmware deadline.
  assert(f.robot.left == 0 && f.robot.right == 0);
  assert(f.controller.startFromDashboard(f.robot, "motor_test"));
  f.tick();
  assert(f.robot.left == 100 && f.robot.right == 100);  // Fresh run baseline.
  assert(f.controller.stopFromDashboard(f.robot));
  assert(f.controller.startFromDashboard(f.robot, "open_loop"));
  for (int i = 0; i < 30; ++i) {
    f.robot.right_count += 4;
    f.tick();
    assert(f.robot.left == 100 && f.robot.right == 100);
  }
  assert(f.controller.stopFromDashboard(f.robot));
  f.robot.surface.reading[2] = 1500;
  f.robot.surface.reading[1] = 1000;
  assert(f.controller.startFromDashboard(f.robot, "line_follow"));
  for (int i = 0; i < 20; ++i) {
    f.robot.right_count += 5;
    f.tick();
    assert(f.robot.left == 35 && f.robot.right == 55); // Intentional steering.
  }
  f.robot.surface.reading[2] = 0;
  f.tick();
  assert(f.robot.left == -35 && f.robot.right == 35);  // Search rotation.
  assert(f.controller.stopFromDashboard(f.robot));
  assert(f.controller.startFromDashboard(f.robot, "motor_test"));
  f.robot.fail_encoders = true;
  f.tick();
  assert(f.robot.left == 0 && f.robot.right == 0);
  assert(std::strcmp(f.controller.dashboardState(), "fault") == 0);
}

int main() {
  checkLegacyMotorTest();
  for (bool persistent : {false, true}) {
    runDisturbance(true, persistent);
    runDisturbance(false, persistent);
  }
}
