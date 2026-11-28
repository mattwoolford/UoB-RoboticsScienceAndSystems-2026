/**
 * Exact port of firmware/BoxEscape/DriftSettings.h & DriftCorrection.cpp.
 */
class DriftSettings {
  boolean correction = false;
  boolean pathRecovery = false;
}

class DriftCorrection_c {
  final float HEADING_GAIN = 200.0f;
  final float INTEGRAL_GAIN = 200.0f;
  final float MAX_TRIM_PWM = 30.0f;

  private DriftSettings run_settings = new DriftSettings();
  private OdometryModel_c.Pose origin = null;
  private float normal_x = 0.0f;
  private float normal_y = 0.0f;
  private long last_ms = 0;
  private float integral_pwm = 0.0f;
  private boolean tracking = false;

  void beginRun(DriftSettings settings) {
    run_settings = settings;
    tracking = false;
    integral_pwm = 0.0f;
  }

  float trimPWM(OdometryModel_c odometry, long now) {
    if (!run_settings.correction) return 0.0f;
    OdometryModel_c.Pose pose = odometry.pose;
    if (!tracking) {
      origin = odometry.new Pose();
      origin.x = pose.x;
      origin.y = pose.y;
      origin.theta = pose.theta;
      if (run_settings.pathRecovery) {
        normal_x = -sin(origin.theta);
        normal_y = cos(origin.theta);
      }
      last_ms = now;
      integral_pwm = 0.0f;
      tracking = true;
      return 0.0f;
    }

    float error = pose.theta - origin.theta;
    if (run_settings.pathRecovery) {
      float LOOKAHEAD_MM = 75.0f;
      float cross_track_mm = (pose.x - origin.x) * normal_x + (pose.y - origin.y) * normal_y;
      error += atan2(cross_track_mm, LOOKAHEAD_MM);
    } else {
      float PI_F = 3.14159265f;
      float tick_angle = PI_F * (odometry.leftWheelRadiusMm + odometry.rightWheelRadiusMm)
                         / (odometry.encoderCountsPerRevolution * odometry.wheelSeparationMm);
      if (abs(error) < 2.5f * tick_angle) error = 0.0f;
    }

    float dt = min((now - last_ms) * 0.001f, 0.1f);
    last_ms = now;
    float proportional = HEADING_GAIN * error;
    float candidate = integral_pwm + INTEGRAL_GAIN * error * dt;
    float demand = proportional + candidate;
    if ((demand <= MAX_TRIM_PWM || error < 0.0f) && (demand >= -MAX_TRIM_PWM || error > 0.0f)) {
      integral_pwm = max(-MAX_TRIM_PWM, min(candidate, MAX_TRIM_PWM));
    }
    return cppRoundf(max(-MAX_TRIM_PWM, min(proportional + integral_pwm, MAX_TRIM_PWM)));
  }
}
