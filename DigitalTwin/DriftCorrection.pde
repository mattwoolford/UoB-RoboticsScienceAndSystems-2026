/** Encoder-only straight-run feedback, mirrored from the firmware. */
class DriftCorrection_c {
  final boolean recoverPath;
  final float MAX_TRIM_PWM = 30;
  final float LOOKAHEAD_MM = 75;
  final float HEADING_GAIN = 200;
  final float INTEGRAL_GAIN = 200;
  boolean started;
  float originX, originY, originHeading;
  float normalX, normalY;
  float integralPwm;
  long lastMs;

  DriftCorrection_c(boolean recoverPath) {
    this.recoverPath = recoverPath;
  }

  void reset() {
    started = false;
  }

  int update(OdometryModel_c odometry, long now) {
    RobotPose_c pose = odometry.pose;
    if (!started) {
      originX = pose.x;
      originY = pose.y;
      originHeading = pose.theta;
      if (recoverPath) {
        normalX = -sin(originHeading);
        normalY = cos(originHeading);
      }
      integralPwm = 0;
      lastMs = now;
      started = true;
      return 0;
    }

    float error = pose.theta - originHeading;
    if (recoverPath) {
      float crossTrack = (pose.x - originX) * normalX + (pose.y - originY) * normalY;
      error += atan2(crossTrack, LOOKAHEAD_MM);
    } else {
      float headingPerTick = PI * (odometry.leftWheelRadiusMm + odometry.rightWheelRadiusMm)
                             / (odometry.encoderCountsPerRevolution * odometry.wheelSeparationMm);
      if (abs(error) < 2.5 * headingPerTick) error = 0;
    }

    float dt = min((now - lastMs) * 0.001, 0.1);
    lastMs = now;
    float proportionalPwm = HEADING_GAIN * error;
    float candidate = integralPwm + INTEGRAL_GAIN * error * dt;
    float demand = proportionalPwm + candidate;
    if ((demand <= MAX_TRIM_PWM || error < 0) && (demand >= -MAX_TRIM_PWM || error > 0)) {
      integralPwm = constrain(candidate, -MAX_TRIM_PWM, MAX_TRIM_PWM);
    }
    float trim = constrain(proportionalPwm + integralPwm, -MAX_TRIM_PWM, MAX_TRIM_PWM);
    // Match C++ roundf at both positive and negative half-PWM boundaries.
    return trim < 0 ? -round(-trim) : round(trim);
  }
}
