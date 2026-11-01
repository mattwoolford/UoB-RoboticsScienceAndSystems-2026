#include "Controller.h"

const unsigned long Controller_c::UPDATE_INTERVAL_MS;
const unsigned long Controller_c::TELEMETRY_INTERVAL_MS;
const unsigned long Controller_c::RECOVERY_TIMEOUT_MS;
const uint16_t Controller_c::LINE_THRESHOLD;
constexpr float Controller_c::BASE_PWM;
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
  motor_pwm = 0;
  left_motor_pwm = 0;
  right_motor_pwm = 0;
  last_speed_measurement_ms = 0;
  last_left_wheel_encoder_count = 0;
  last_right_wheel_encoder_count = 0;
  left_wheel_speed = 0;
  right_wheel_speed = 0;
}

uint8_t Controller_c::getSignal() const {
  return signal;
}

void Controller_c::setSignal(uint8_t requested_signal) {
  if (requested_signal == 0) {
    reset();
    return;
  }

  if (signal == 0) {
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
  if (robot.getEncoders()) {
    odometry.update(robot.getLeftEncoderCount(), robot.getRightEncoderCount());
  }

  // Pose estimation from the Pololu 3Pi robot itself.
  robot.getPose();

  // While waiting, a button press sets signal to 1 and starts the physical
  // robot's line follower, even without Processing connected. The transmitted
  // signal also starts an armed Digital Twin live comparison. This is a start
  // control, not a start/stop toggle; further presses are ignored while signal is 1.
  if (signal == 0) {
    if (robot.isButtonPressed()) {
      setSignal(1);
    }
  }

  // The user has started the demonstration, so we run the line following
  // controller code.
  if (signal == 1) {
    // runLineFollower(robot, now);
    // motorStartStopTest(robot, now);
    // motorSpeedRampTest(robot, now);
    monitorWheelSpeed(robot, now);
  }

  // Use another TaskTimer_c to limit how often we transmit telemetry data
  // on WiFi and Serial.
  if (telemetry_timer.isReady(now)) {
    telemetry_timer.resetTimer(now);
    publishTelemetry(robot, server, now);

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

    // Turn the motors off
    setMotorPWM(robot, 0, 0);

    // Register that the function has completed
    setSignal(0);

    // Stop test
    return;
  }

  // Start / continue test

  // Increment call count
  call_count++;

  // Set the motors on
  setMotorPWM(robot, BASE_PWM, BASE_PWM);

}

void Controller_c::motorSpeedRampTest(Robot_c &robot, unsigned long now) {

  int duration_ms = 10000;

  // Check call count to determine duration of function
  if (call_count > duration_ms / UPDATE_INTERVAL_MS) {

    // Turn the motors off
    robot.setMotorPWM(0, 0);

    // Register that the function has completed
    setSignal(0);

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
