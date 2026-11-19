#include "Controller.h"
#include <cstring>

const unsigned long Controller_c::UPDATE_INTERVAL_MS;
const unsigned long Controller_c::TELEMETRY_INTERVAL_MS;
const unsigned long Controller_c::RECOVERY_TIMEOUT_MS;
const uint16_t Controller_c::LINE_THRESHOLD;
constexpr float Controller_c::BASE_PWM;
constexpr float Controller_c::CONSTANT_PWM;
constexpr float Controller_c::LINE_FOLLOW_GAIN;
constexpr float Controller_c::RECOVERY_LEFT_PWM;
constexpr float Controller_c::RECOVERY_RIGHT_PWM;

Controller_c::Controller_c()
  : update_timer(UPDATE_INTERVAL_MS),
    telemetry_timer(TELEMETRY_INTERVAL_MS) {
  reset();
}

void Controller_c::reset() {
  signal = 0;
  mode = WAITING;
  recovery_start_ms = 0;
  call_count = 0;
  left_motor_pwm = 0;
  right_motor_pwm = 0;
  last_speed_measurement_ms = 0;
  last_left_wheel_encoder_count = 0;
  last_right_wheel_encoder_count = 0;
  left_wheel_speed = 0;
  right_wheel_speed = 0;
  motor_calibration = MotorCalibration_c();
  motor_deadband_calibrated = false;
}

uint8_t Controller_c::getSignal() const {
  return signal;
}

bool Controller_c::isReadyToStart() const {
  return motor_deadband_calibrated && !motor_calibration.hasFailed()
      && signal == 0 && mode == WAITING;
}

void Controller_c::setSignal(uint8_t requested_signal) {
  if (requested_signal == 0) {
    reset();
    return;
  }

  if (isReadyToStart()) {
    signal = 1;
    mode = FOLLOWING_LINE;
    recovery_start_ms = 0;
  }
}

void Controller_c::update(Robot_c &robot, RobotWifiAP_c &server) {

  // Get the current count of milliseconds since the StampC3 was powered on.
  unsigned long now = robot.getMillis();

  // Check if our TaskTimer_c for the general controller update indicates
  // that it is the correct time to operate.  Note, we give the TaskTimer_c
  // the current count in milliseconds.
  // We do this because we don't want to query the robot faster than at 10ms
  // intervals.
  if (!update_timer.isReady(now)) {

    // TaskTimer_c says it is not ready, so we simply end this call to
    // the controller here by calling return.
    return;
  }

  // The TaskTimer_c was ready, so we now reset the TaskTimer_c so it
  // begins counting again.  We now run the remaining controller code.
  update_timer.resetTimer(now);

  // Ask the robot for latest information on surface reflectance sensors.
  robot.getSurfaceSensors();

  // Ask the robot for the latest encoder information, and then use this
  // to update the odometry on board the StampC3 (see OdometryModel.h).
  const bool encoders_fresh = robot.getEncoders();
  if (encoders_fresh) {
    odometry.update(robot.getLeftEncoderCount(), robot.getRightEncoderCount());
  }

  // Pose estimation from the Pololu 3Pi robot itself.
  robot.getPose();

  // Managed operation never falls through to legacy automatic calibration.
  if (dashboard_control) {
    // Lost encoder communication invalidates active motion and calibration.
    // Keep retrying any failed motor stop instead of driving on stale counts.
    if (!encoders_fresh && dashboardBusy()) {
      dashboard_fault = true;
      stopFromDashboard(robot);
    }
    updateDashboard(robot, now);
    return;
  }

  // main.ino owns button polling and latches the start through setSignal().
  // Do not poll here: the tone and controller must share the same button event.

  // Preserve automatic calibration on startup, while allowing sensor acquisition
  // and WiFi servicing to continue between PWM steps. Calibration exclusively
  // owns motor commands until both thresholds and the final stop are confirmed.
  if (!motor_deadband_calibrated) {
    const bool previously_failed = motor_calibration.hasFailed();
    motor_deadband_calibrated = motor_calibration.update(robot);

    // Calibration writes directly through Robot_c; keep controller caches aligned.
    left_motor_pwm = robot.getLeftMotorPWM();
    right_motor_pwm = robot.getRightMotorPWM();

    if (motor_deadband_calibrated) {
      Serial.print("Left motor deadband PWM: ");
      Serial.println(motor_calibration.getLeftDeadbandPWM());
      Serial.print("Right motor deadband PWM: ");
      Serial.println(motor_calibration.getRightDeadbandPWM());
    } else if (motor_calibration.hasFailed() && !previously_failed) {
      Serial.println("Motor calibration failed: I2C error or no movement by PWM limit.");
    }
    // Failed attempts keep receiving updates so their stop command is retried.
    // reset() prepares a fresh attempt; failure never enables driving routines.
  }

  // Driving routines may run only after calibration has successfully stopped.
  if (signal == 1 && motor_deadband_calibrated) {
    // runLineFollower(robot, now);
    motorStartStopTest(robot, now);
    // motorSpeedRampTest(robot, now);
    // monitorWheelSpeed(robot, now);
  }

  // Use another TaskTimer_c to limit how often we transmit telemetry data
  // on WiFi and Serial.
  if (telemetry_timer.isReady(now)) {
    telemetry_timer.resetTimer(now);
    // publishTelemetry(robot, server, now);

  }
}

bool Controller_c::lineDetected(const Robot_c &robot) const {
  // Note: only using the central sensor to detect a line.
  if (robot.surface.reading[2] >= LINE_THRESHOLD) {
    return true;
  }

  return false;
}

void Controller_c::monitorWheelSpeed(Robot_c &robot, unsigned long now, float sampling_rate_hz) {

  float ONE_SECOND = 1000.0;

  // Define wheel radius
  int wheel_diameter_mm = 32;
  float wheel_circumference = M_PI * wheel_diameter_mm;

  // Define what the sampling rate is in ms
  float sampling_period_ms = ONE_SECOND / sampling_rate_hz;

  // calculate time interval from last speed measurement
  auto delta_ms = static_cast<float>(now - last_speed_measurement_ms);

  if (delta_ms >= sampling_period_ms) {

    float encoder_counts_per_wheel_turn = 358.3;

    // calculate difference in encoder counts
    int32_t left_delta_count = last_left_wheel_encoder_count - robot.getLeftEncoderCount();
    int32_t right_delta_count = last_right_wheel_encoder_count - robot.getRightEncoderCount();

    // save the current encoder count as the "last count"
    // for next time this function runs.
    last_left_wheel_encoder_count = robot.getLeftEncoderCount();
    last_right_wheel_encoder_count = robot.getRightEncoderCount();

    float left_wheel_distance = left_delta_count * wheel_circumference / encoder_counts_per_wheel_turn;
    float right_wheel_distance = right_delta_count * wheel_circumference / encoder_counts_per_wheel_turn;

    // Calculate mm/s
    left_wheel_speed = left_wheel_distance * ONE_SECOND / delta_ms;
    right_wheel_speed = right_wheel_distance * ONE_SECOND / delta_ms;

    // Save the speed measurement time for next time this function runs.
    last_speed_measurement_ms = now;

    // Report speed to 3 decimal places
    Serial.println(left_wheel_speed, 3);

  }

}

void Controller_c::motorStartStopTest(Robot_c &robot, unsigned long now) {

  int duration_ms = 3000;

  // Check call count to determine duration of function
  if (call_count > duration_ms / UPDATE_INTERVAL_MS) {

    finishMotorTest(robot);

    // Stop test
    return;
  }

  // Start / continue test

  // Increment call count
  call_count++;

  // Set the motors on
  // A fixed PWM can be below the starting threshold measured on this robot.
  setMotorPWM(robot,
              max(CONSTANT_PWM, motor_calibration.getLeftDeadbandPWM() + 5.0f),
              max(CONSTANT_PWM, motor_calibration.getRightDeadbandPWM() + 5.0f));

}

void Controller_c::motorSpeedRampTest(Robot_c &robot, unsigned long now) {

  int duration_ms = 10000;

  // Check call count to determine duration of function
  if (call_count > duration_ms / UPDATE_INTERVAL_MS) {

    finishMotorTest(robot);

    // Stop test
    return;
  }

  // Start / continue test

  // Increment call count
  call_count++;

  int ramps = 10;
  float pwm_interval = 25.0;
  float pwm_setting;

  for (int i = 0; i < ramps * 2; i++) {

    if (call_count >= (duration_ms * i / (ramps * 2)) / UPDATE_INTERVAL_MS) {

      if (i > ramps) {
        // Slow down
        pwm_setting = pwm_setting - pwm_interval;
      }
      else {
        // Speed up
        pwm_setting = BASE_PWM + pwm_interval * i;
      }


      setMotorPWM(robot, pwm_setting, pwm_setting);

    }

  }

}

void Controller_c::finishMotorTest(Robot_c &robot) {
  // Retry a failed stop on the next update, without resuming the test.
  if (!robot.setMotorPWM(0, 0)) return;
  left_motor_pwm = 0;
  right_motor_pwm = 0;
  call_count = 0;
  signal = 0;
  mode = WAITING;
  // Keep the calibration: reset()/setSignal(0) would start another motor ramp.
}

void Controller_c::runLineFollower(Robot_c &robot, unsigned long now) {
  bool line_detected = lineDetected(robot);

  if (!line_detected && mode == FOLLOWING_LINE) {
    mode = SEARCHING_FOR_LINE;
    recovery_start_ms = now;
  }

  if (mode == SEARCHING_FOR_LINE) {
    if (line_detected) {
      mode = FOLLOWING_LINE;
    } else if (now - recovery_start_ms >= RECOVERY_TIMEOUT_MS) {
      mode = STOPPED;
    }
  }

  if (mode == STOPPED) {
    robot.setMotorPWM(0, 0);
    return;
  }

  if (mode == SEARCHING_FOR_LINE) {
    robot.setMotorPWM(RECOVERY_LEFT_PWM, RECOVERY_RIGHT_PWM);
    return;
  }

  float error = (float)robot.surface.reading[1] - (float)robot.surface.reading[3];
  float turn = error * LINE_FOLLOW_GAIN;
  robot.setMotorPWM(BASE_PWM - turn, BASE_PWM + turn);
}

void Controller_c::setMotorPWM(Robot_c &robot, float left_pwm, float right_pwm) {
  left_motor_pwm = left_pwm;
  right_motor_pwm = right_pwm;
  robot.setMotorPWM(left_pwm, right_pwm);
}

void Controller_c::publishTelemetry(Robot_c &robot, RobotWifiAP_c &server, unsigned long timestamp_ms) {
  server.printf(
    "%lu,%.2f,%.2f,%.5f,%d,%d,%ld,%ld,%u,%u,%u,%u,%u,%u\n",
    timestamp_ms,
    odometry.pose.x,
    odometry.pose.y,
    odometry.pose.theta,
    robot.getLeftMotorPWM(),
    robot.getRightMotorPWM(),
    (long)robot.getLeftEncoderCount(),
    (long)robot.getRightEncoderCount(),
    robot.surface.reading[0],
    robot.surface.reading[1],
    robot.surface.reading[2],
    robot.surface.reading[3],
    robot.surface.reading[4],
    signal
  );
  if ( Serial ) { // If serial is connected
    Serial.printf(
      "%lu,%.2f,%.2f,%.5f,%d,%d,%ld,%ld,%u,%u,%u,%u,%u,%u\n",
      timestamp_ms,
      odometry.pose.x,
      odometry.pose.y,
      odometry.pose.theta,
      robot.getLeftMotorPWM(),
      robot.getRightMotorPWM(),
      (long)robot.getLeftEncoderCount(),
      (long)robot.getRightEncoderCount(),
      robot.surface.reading[0],
      robot.surface.reading[1],
      robot.surface.reading[2],
      robot.surface.reading[3],
      robot.surface.reading[4],
      signal
    );
  }
}


void Controller_c::enableDashboardControl(Robot_c &robot) {
  dashboard_control = true;
  dashboard_action = DashboardAction::IDLE;
  dashboard_fault = false;
  // Establish a stopped baseline even if the middleware retained an old command.
  stopFromDashboard(robot);
}

bool Controller_c::dashboardBusy() const {
  return dashboard_stop_pending || dashboard_action != DashboardAction::IDLE;
}

bool Controller_c::dashboardReady() const {
  return !dashboardBusy() && motor_deadband_calibrated && !dashboard_fault;
}

const char* Controller_c::dashboardState() const {
  if (dashboard_stop_pending) return "stopping";
  if (dashboard_fault) return "fault";
  switch (dashboard_action) {
    case DashboardAction::CALIBRATING: return "calibrating";
    case DashboardAction::OPEN_LOOP: return "open_loop";
    case DashboardAction::LINE_FOLLOW: return "line_follow";
    case DashboardAction::MOTOR_TEST: return "motor_test";
    default: return motor_deadband_calibrated ? "ready" : "idle";
  }
}

bool Controller_c::stopFromDashboard(Robot_c &robot) {
  // Clear the action before attempting I2C: a failed stop can only be retried,
  // never followed by another driving command or an automatic calibration.
  dashboard_action = DashboardAction::IDLE;
  signal = 0;
  mode = WAITING;
  call_count = 0;
  dashboard_stop_pending = !robot.setMotorPWM(0, 0);
  if (!dashboard_stop_pending) left_motor_pwm = right_motor_pwm = 0;
  return !dashboard_stop_pending;
}

bool Controller_c::calibrateFromDashboard() {
  if (!dashboard_control || dashboardBusy()) return false;
  motor_calibration = MotorCalibration_c();
  motor_deadband_calibrated = false;
  dashboard_fault = false;
  dashboard_action = DashboardAction::CALIBRATING;
  // Calibration itself has a finite PWM limit, allowing its full 30.3 s ramp.
  return true;
}

bool Controller_c::startFromDashboard(Robot_c &robot, const char* test) {
  if (!dashboard_control || dashboardBusy() || dashboard_fault) return false;
  DashboardAction requested;
  if (std::strcmp(test, "open_loop") == 0) requested = DashboardAction::OPEN_LOOP;
  else if (std::strcmp(test, "line_follow") == 0) requested = DashboardAction::LINE_FOLLOW;
  else if (std::strcmp(test, "motor_test") == 0) requested = DashboardAction::MOTOR_TEST;
  else return false;
  if (requested != DashboardAction::OPEN_LOOP && !motor_deadband_calibrated) return false;
  // Refresh the count baseline while stopped, so calibration travel is excluded.
  if (!robot.getEncoders() || !robot.setMotorPWM(0, 0)) {
    dashboard_fault = true;
    stopFromDashboard(robot);
    return false;
  }
  odometry.reset();
  odometry.update(robot.getLeftEncoderCount(), robot.getRightEncoderCount());
  dashboard_started_ms = robot.getMillis();
  call_count = 0;
  recovery_start_ms = 0;
  mode = FOLLOWING_LINE;
  signal = 1;
  dashboard_action = requested;
  return true;
}

void Controller_c::updateDashboard(Robot_c &robot, unsigned long now) {
  if (dashboard_stop_pending) {
    stopFromDashboard(robot);
    return;
  }
  if (dashboard_action == DashboardAction::IDLE) return;
  if (dashboard_action == DashboardAction::CALIBRATING) {
    motor_deadband_calibrated = motor_calibration.update(robot);
    if (motor_calibration.hasFailed()) {
      dashboard_fault = true;
      stopFromDashboard(robot);
    } else if (motor_deadband_calibrated) {
      dashboard_action = DashboardAction::IDLE;
    }
    return;
  }
  // Every driving test has a firmware deadline, independent of the bridge.
  const unsigned long duration = dashboard_action == DashboardAction::MOTOR_TEST ? 3000UL : 30000UL;
  if (now - dashboard_started_ms >= duration) {
    stopFromDashboard(robot);
    return;
  }
  float left = CONSTANT_PWM, right = CONSTANT_PWM;
  if (dashboard_action == DashboardAction::MOTOR_TEST) {
    left = max(CONSTANT_PWM, motor_calibration.getLeftDeadbandPWM() + 5.0f);
    right = max(CONSTANT_PWM, motor_calibration.getRightDeadbandPWM() + 5.0f);
  } else if (dashboard_action == DashboardAction::LINE_FOLLOW) {
    // Match the existing nominal line follower while checking every motor write.
    if (!lineDetected(robot) && mode == FOLLOWING_LINE) {
      mode = SEARCHING_FOR_LINE;
      recovery_start_ms = now;
    }
    if (mode == SEARCHING_FOR_LINE) {
      if (lineDetected(robot)) mode = FOLLOWING_LINE;
      else if (now - recovery_start_ms >= RECOVERY_TIMEOUT_MS) {
        stopFromDashboard(robot);
        return;
      }
    }
    if (mode == SEARCHING_FOR_LINE) {
      left = RECOVERY_LEFT_PWM;
      right = RECOVERY_RIGHT_PWM;
    } else {
      const float error = float(robot.surface.reading[1]) - float(robot.surface.reading[3]);
      left = BASE_PWM - error * LINE_FOLLOW_GAIN;
      right = BASE_PWM + error * LINE_FOLLOW_GAIN;
    }
  }
  // Open-loop intentionally bypasses deadband compensation and steering. Its
  // physical PWM is configured independently of the simulation's drive setting.
  // A failed write latches a fault.
  if (!robot.setMotorPWM(left, right)) {
    dashboard_fault = true;
    stopFromDashboard(robot);
  } else {
    left_motor_pwm = left;
    right_motor_pwm = right;
  }
}
