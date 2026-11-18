/** Same independent PWM ramp and start gating as main/MotorCalibration.cpp.
 * The sterile model acknowledges every command/read; no I2C errors are injected.
 * These measured thresholds are retained, not added to driving PWM, as in main.
 */
class MotorCalibration_c {
  final int MAX_PWM = 100;
  final int STEP_MS = 300;
  int left_deadband_pwm = -1, right_deadband_pwm = -1;
  int pwm = 0, left_start = 0, right_start = 0;
  long step_started = 0;
  boolean started = false, failed = false, complete = false;

  boolean hasFailed() { return failed; }
  int getLeftDeadbandPWM() { return left_deadband_pwm; }
  int getRightDeadbandPWM() { return right_deadband_pwm; }

  boolean update(RobotSimulation_c robot) {
    if (complete) return true;
    if (failed) { robot.setMotorPWM(0, 0); return false; }
    if (!started) {
      if (!robot.setMotorPWM(0, 0)) { failed = true; return false; }
      started = true;
      step_started = robot.getMillis();
      return false;
    }
    if (robot.getMillis() - step_started < STEP_MS) return false;
    if (!robot.getEncoders()) {
      failed = true; robot.setMotorPWM(0, 0); return false;
    }
    int left = robot.getLeftEncoderCount(), right = robot.getRightEncoderCount();
    long dl = Integer.toUnsignedLong(left - left_start);
    long dr = Integer.toUnsignedLong(right - right_start);
    if (pwm > 0) {
      if (left_deadband_pwm < 0 && dl >= 3 && dl <= 0xfffffffdL) left_deadband_pwm = pwm;
      if (right_deadband_pwm < 0 && dr >= 3 && dr <= 0xfffffffdL) right_deadband_pwm = pwm;
    }
    if (left_deadband_pwm >= 0 && right_deadband_pwm >= 0) {
      complete = robot.setMotorPWM(0, 0);
      failed = !complete;
      return complete;
    }
    if (pwm >= MAX_PWM) {
      failed = true; robot.setMotorPWM(0, 0); return false;
    }
    ++pwm;
    left_start = left; right_start = right;
    if (!robot.setMotorPWM(left_deadband_pwm < 0 ? pwm : 0,
      right_deadband_pwm < 0 ? pwm : 0)) {
      failed = true; robot.setMotorPWM(0, 0); return false;
    }
    step_started = robot.getMillis();
    return false;
  }
}
