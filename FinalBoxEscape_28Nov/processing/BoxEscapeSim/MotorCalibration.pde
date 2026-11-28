/**
 * Exact port of firmware/BoxEscape/MotorCalibration.h & MotorCalibration.cpp.
 */
class MotorCalibration_c {
  final int MAX_PWM = 100;
  final long STEP_MS = 300;

  private int left_deadband_pwm = -1;
  private int right_deadband_pwm = -1;
  private int pwm = 0;
  private int left_start = 0;
  private int right_start = 0;
  private long step_started = 0;
  private boolean started = false;
  private boolean failed = false;
  private boolean complete = false;

  boolean hasFailed() { return failed; }
  int getLeftDeadbandPWM() { return left_deadband_pwm; }
  int getRightDeadbandPWM() { return right_deadband_pwm; }

  boolean update(Robot_c robot) {
    if (complete) return true;

    if (failed) {
      robot.setMotorPWM(0, 0);
      return false;
    }

    if (!started) {
      if (!robot.setMotorPWM(0, 0)) {
        failed = true;
        return false;
      }
      started = true;
      step_started = robot.getMillis();
      return false;
    }

    if (robot.getMillis() - step_started < STEP_MS) return false;

    if (!robot.getEncoders()) {
      failed = true;
      robot.setMotorPWM(0, 0);
      return false;
    }

    int left = robot.getLeftEncoderCount();
    int right = robot.getRightEncoderCount();

    long left_delta = ((long) left - (long) left_start) & 0xFFFFFFFFL;
    long right_delta = ((long) right - (long) right_start) & 0xFFFFFFFFL;
    long maxNegTwo = 0xFFFFFFFFL - 2L;

    if (pwm > 0) {
      if (left_deadband_pwm < 0 && left_delta >= 3 && left_delta <= maxNegTwo) {
        left_deadband_pwm = pwm;
      }
      if (right_deadband_pwm < 0 && right_delta >= 3 && right_delta <= maxNegTwo) {
        right_deadband_pwm = pwm;
      }
    }

    if (left_deadband_pwm >= 0 && right_deadband_pwm >= 0) {
      complete = robot.setMotorPWM(0, 0);
      failed = !complete;
      return complete;
    }

    if (pwm >= MAX_PWM) {
      failed = true;
      robot.setMotorPWM(0, 0);
      return false;
    }

    ++pwm;
    left_start = left;
    right_start = right;

    if (!robot.setMotorPWM(left_deadband_pwm < 0 ? pwm : 0,
                           right_deadband_pwm < 0 ? pwm : 0)) {
      failed = true;
      robot.setMotorPWM(0, 0);
      return false;
    }

    step_started = robot.getMillis();
    return false;
  }
}
