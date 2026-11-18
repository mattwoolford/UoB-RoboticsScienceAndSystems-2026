/** Encoder-based Euler estimate ported from main/OdometryModel.{h,cpp}.
 * Kept separate from DrivePhysics_c so drift is measured against world truth.
 */
class OdometryModel_c {
  float leftWheelRadiusMm = 16.0;
  float rightWheelRadiusMm = 16.0;
  float wheelSeparationMm = 90.0;
  float encoderCountsPerRevolution = 358.3;
  RobotPose_c pose = new RobotPose_c();
  boolean initialised = false;
  int previousLeftCount = 0, previousRightCount = 0;

  void setLeftWheelRadiusMm(float mm) { leftWheelRadiusMm = mm; }
  void setRightWheelRadiusMm(float mm) { rightWheelRadiusMm = mm; }
  void reset(float x, float y, float theta) {
    pose.x = x; pose.y = y; pose.theta = theta;
    initialised = false;
    previousLeftCount = previousRightCount = 0;
  }
  void reset() { reset(0, 0, 0); }

  boolean update(int leftCount, int rightCount) {
    if (!Float.isFinite(leftWheelRadiusMm) || leftWheelRadiusMm <= 0
      || !Float.isFinite(rightWheelRadiusMm) || rightWheelRadiusMm <= 0
      || !Float.isFinite(wheelSeparationMm) || wheelSeparationMm <= 0
      || !Float.isFinite(encoderCountsPerRevolution) || encoderCountsPerRevolution <= 0)
      return false;
    if (!initialised) {
      previousLeftCount = leftCount; previousRightCount = rightCount;
      initialised = true;
      return false;
    }
    float dl = countChange(leftCount, previousLeftCount) * TWO_PI
      * leftWheelRadiusMm / encoderCountsPerRevolution;
    float dr = countChange(rightCount, previousRightCount) * TWO_PI
      * rightWheelRadiusMm / encoderCountsPerRevolution;
    previousLeftCount = leftCount; previousRightCount = rightCount;
    float distance = (dl + dr) / 2.0;
    pose.x += distance * cos(pose.theta);
    pose.y += distance * sin(pose.theta);
    pose.theta += (dr - dl) / wheelSeparationMm;
    return true;
  }
  long countChange(int current, int previous) {
    long difference = (long)current - previous;
    if (difference > Integer.MAX_VALUE) difference -= 1L << 32;
    if (difference < Integer.MIN_VALUE) difference += 1L << 32;
    return difference;
  }
}
