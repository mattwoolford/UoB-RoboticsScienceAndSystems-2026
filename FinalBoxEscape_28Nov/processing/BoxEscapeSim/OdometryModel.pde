/**
 * Exact port of firmware/BoxEscape/OdometryModel.h & OdometryModel.cpp.
 * Uses signed 32-bit encoder counter wrap and first-order Euler integration.
 */
class OdometryModel_c {
  class Pose {
    float x = 0.0f;
    float y = 0.0f;
    float theta = 0.0f;
  }

  float leftWheelRadiusMm;
  float rightWheelRadiusMm;
  float wheelSeparationMm;
  float encoderCountsPerRevolution;
  Pose pose = new Pose();

  private boolean initialised = false;
  private int previousLeftCount = 0;
  private int previousRightCount = 0;

  OdometryModel_c() {
    this(16.0f, 90.0f, 358.3f);
  }

  OdometryModel_c(float wheelRadiusMm, float separationMm, float countsPerRevolution) {
    leftWheelRadiusMm = wheelRadiusMm;
    rightWheelRadiusMm = wheelRadiusMm;
    wheelSeparationMm = separationMm;
    encoderCountsPerRevolution = countsPerRevolution;
    reset(0.0f, 0.0f, 0.0f);
  }

  void setLeftWheelRadiusMm(float mm) { leftWheelRadiusMm = mm; }
  void setRightWheelRadiusMm(float mm) { rightWheelRadiusMm = mm; }

  void reset() { reset(0.0f, 0.0f, 0.0f); }

  void reset(float x, float y, float theta) {
    pose.x = x;
    pose.y = y;
    pose.theta = theta;
    initialised = false;
    previousLeftCount = 0;
    previousRightCount = 0;
  }

  boolean update(int leftCount, int rightCount) {
    if (!Float.isFinite(leftWheelRadiusMm) || leftWheelRadiusMm <= 0.0f ||
        !Float.isFinite(rightWheelRadiusMm) || rightWheelRadiusMm <= 0.0f ||
        !Float.isFinite(wheelSeparationMm) || wheelSeparationMm <= 0.0f ||
        !Float.isFinite(encoderCountsPerRevolution) || encoderCountsPerRevolution <= 0.0f) {
      return false;
    }

    if (!initialised) {
      previousLeftCount = leftCount;
      previousRightCount = rightCount;
      initialised = true;
      return false;
    }

    float deltaLeftCounts = (float) countChange(leftCount, previousLeftCount);
    float deltaRightCounts = (float) countChange(rightCount, previousRightCount);
    previousLeftCount = leftCount;
    previousRightCount = rightCount;

    float leftDistance = deltaLeftCounts * TWO_PI * leftWheelRadiusMm / encoderCountsPerRevolution;
    float rightDistance = deltaRightCounts * TWO_PI * rightWheelRadiusMm / encoderCountsPerRevolution;
    float distance = (leftDistance + rightDistance) / 2.0f;
    float deltaTheta = (rightDistance - leftDistance) / wheelSeparationMm;

    pose.x += distance * cos(pose.theta);
    pose.y += distance * sin(pose.theta);
    pose.theta += deltaTheta;
    return true;
  }

  long countChange(int current, int previous) {
    long difference = (long) current - (long) previous;
    long counterRange = 1L << 32;
    if (difference > Integer.MAX_VALUE) difference -= counterRange;
    if (difference < Integer.MIN_VALUE) difference += counterRange;
    return difference;
  }
}
