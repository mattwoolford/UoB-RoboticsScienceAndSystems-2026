/**
 * Exact port of firmware/BoxEscape/Controller.h & Controller.cpp.
 * Uses 10 ms control loop (including EscapePilot updates) and 50 ms IR sweeps.
 */
class Controller_c {
  final float DEG_PER_RAD = 57.2957795131f;

  final int MODE_IDLE = 0;
  final int MODE_CALIBRATE = 1;
  final int MODE_STRAIGHT = 2;
  final int MODE_POINT = 3;
  final int MODE_POINT_CCW = 4;
  final int MODE_PIVOT = 5;
  final int MODE_ESCAPE = 6;
  final int MODE_FAULT = 7;

  final String[] MODE_NAMES = {
    "IDLE", "CALIBRATE", "STRAIGHT", "POINT", "POINT_CCW", "PIVOT", "ESCAPE", "FAULT"
  };

  final int TP_TURNING = 0;
  final int TP_SETTLING = 1;
  final int TP_READING = 2;

  private int mode_ = MODE_IDLE;
  private int turnPhase_ = TP_TURNING;
  private MotorCalibration_c cal_ = new MotorCalibration_c();
  private OdometryModel_c odo_ = new OdometryModel_c();
  private DriftCorrection_c drift_ = new DriftCorrection_c();
  private EscapePilot pilot_ = new EscapePilot();
  private TaskTimer_c tick_ = new TaskTimer_c(MS_CONTROL_MS);
  private TaskTimer_c irTick_ = new TaskTimer_c(MS_IR_MS);
  private String note_ = "Initialising";
  private boolean ready_ = false;
  private int quarter_ = 1, quarters_ = 1, cmdLeft_ = 0, cmdRight_ = 0;
  private float stepHeading_ = 0.0f;
  private long start_ = 0, phaseStart_ = 0, lastTick_ = 0, lastLeft_ = 0, lastRight_ = 0;
  private int leftCount_ = 0, rightCount_ = 0, startLeft_ = 0, startRight_ = 0;

  boolean movingOrCalibrating() { return mode_ != MODE_IDLE && mode_ != MODE_FAULT; }
  boolean calibrated() { return ready_; }
  int leftThreshold() { return cal_.getLeftDeadbandPWM(); }
  int rightThreshold() { return cal_.getRightDeadbandPWM(); }
  OdometryModel_c odometry() { return odo_; }
  String modeName() { return MODE_NAMES[mode_]; }
  String note() { return note_; }

  String phaseName() {
    if (mode_ == MODE_ESCAPE) return pilot_.stateName();
    if (mode_ == MODE_POINT || mode_ == MODE_POINT_CCW || mode_ == MODE_PIVOT) {
      return turnPhase_ == TP_TURNING ? "turn" : (turnPhase_ == TP_SETTLING ? "coast" : "read_protractor");
    }
    return modeName();
  }

  private int cap(int v) { return v > MS_PWM_CAP ? MS_PWM_CAP : (v < -MS_PWM_CAP ? -MS_PWM_CAP : v); }
  private int larger(int a, int b) { return a > b ? a : b; }

  private boolean turnTooClose(TopIRReading_t r) {
    return r.front <= MS_TURN_TOO_CLOSE_RAW || r.back_left <= MS_TURN_TOO_CLOSE_RAW || r.back_right <= MS_TURN_TOO_CLOSE_RAW;
  }

  private long netCounts(int count, int base) {
    long d = (long) count - (long) base;
    long range = 1L << 32;
    if (d > Integer.MAX_VALUE) d -= range;
    if (d < Integer.MIN_VALUE) d += range;
    return d;
  }

  void initialise(Robot_c r, TopIR_c ir) {
    ready_ = false;
    mode_ = MODE_IDLE;
    cal_ = new MotorCalibration_c();
    odo_.leftWheelRadiusMm = MS_LEFT_RADIUS_MM;
    odo_.rightWheelRadiusMm = MS_RIGHT_RADIUS_MM;
    odo_.wheelSeparationMm = MS_WHEEL_SEPARATION_MM;
    odo_.encoderCountsPerRevolution = MS_COUNTS_PER_REV;
    odo_.reset();
    note_ = "Idle; ready for baseline escape";
    if (!r.setMotorPWM(0, 0)) fault(r, "Initial stop not acknowledged; check motor power and I2C");
    ir.read();
    lastTick_ = r.getMillis();
    tick_.resetTimer(lastTick_);
    irTick_.resetTimer(lastTick_);
  }

  private void fault(Robot_c r, String reason) {
    mode_ = MODE_FAULT;
    ready_ = false;
    note_ = reason;
    pilot_.stop();
    r.setMotorPWM(0, 0);
    cmdLeft_ = cmdRight_ = 0;
  }

  private void stop(Robot_c r, String reason) {
    if (mode_ == MODE_CALIBRATE) ready_ = false;
    if (!r.setMotorPWM(0, 0)) {
      fault(r, "Stop not acknowledged; retrying");
      return;
    }
    cmdLeft_ = cmdRight_ = 0;
    mode_ = MODE_IDLE;
    note_ = reason;
    pilot_.stop();
  }

  private boolean takeBaseline(Robot_c r) {
    if (!r.getEncoders()) {
      fault(r, "No fresh encoder baseline");
      return false;
    }
    if (!(Float.isFinite(odo_.leftWheelRadiusMm) && odo_.leftWheelRadiusMm > 0 &&
          Float.isFinite(odo_.rightWheelRadiusMm) && odo_.rightWheelRadiusMm > 0 &&
          Float.isFinite(odo_.wheelSeparationMm) && odo_.wheelSeparationMm > 0 &&
          Float.isFinite(odo_.encoderCountsPerRevolution) && odo_.encoderCountsPerRevolution > 0)) {
      fault(r, "Invalid odometry geometry");
      return false;
    }
    startLeft_ = leftCount_ = r.getLeftEncoderCount();
    startRight_ = rightCount_ = r.getRightEncoderCount();
    odo_.reset();
    odo_.update(leftCount_, rightCount_);
    return true;
  }

  private boolean encoderTick(Robot_c r, long now) {
    if (!r.getEncoders()) {
      fault(r, "Encoder read failed");
      return false;
    }
    int l = r.getLeftEncoderCount();
    int h = r.getRightEncoderCount();
    if (l != leftCount_ || cmdLeft_ == 0) lastLeft_ = now;
    if (h != rightCount_ || cmdRight_ == 0) lastRight_ = now;
    leftCount_ = l;
    rightCount_ = h;
    if (!odo_.update(l, h)) {
      fault(r, "Odometry did not update");
      return false;
    }
    if ((cmdLeft_ != 0 && now - lastLeft_ >= MS_NO_TICKS_MS) ||
        (cmdRight_ != 0 && now - lastRight_ >= MS_NO_TICKS_MS)) {
      fault(r, "No encoder motion from a commanded wheel");
      return false;
    }
    return true;
  }

  private boolean drive(Robot_c r, int l, int h, long now) {
    l = cap(l);
    h = cap(h);
    if (!r.setMotorPWM(l, h)) {
      fault(r, "Motor command not acknowledged");
      return false;
    }
    if (cmdLeft_ == 0 && l != 0) lastLeft_ = now;
    if (cmdRight_ == 0 && h != 0) lastRight_ = now;
    cmdLeft_ = l;
    cmdRight_ = h;
    return true;
  }

  void command(char key, Robot_c r, TopIR_c ir) {
    key = Character.toUpperCase(key);
    if (key == 'X') {
      stop(r, "Stopped by operator");
      return;
    }
    if (mode_ != MODE_IDLE) return;
    long now = r.getMillis();
    if (key == 'C') {
      if (!r.setMotorPWM(0, 0)) {
        fault(r, "Cannot stop to start calibration");
        return;
      }
      ready_ = false;
      cmdLeft_ = cmdRight_ = 0;
      cal_ = new MotorCalibration_c();
      mode_ = MODE_CALIBRATE;
      note_ = "Measuring forward starting PWM";
      lastTick_ = now;
      tick_.resetTimer(now);
      return;
    }
    if (key != 'S' && key != 'T' && key != 'L' && key != 'P' && key != 'G' && key != 'V' && key != 'E') return;
    if (key == 'E' && !BOX_ESCAPE_ENABLE) {
      note_ = "E disabled in MotionSettings.h";
      return;
    }
    if (key != 'E' && !ready_) {
      note_ = "Run C calibration first";
      return;
    }
    if (key == 'E' && ready_) {
      int minDrive = ES_DRIVE_PWM - ES_MAX_STEER_PWM;
      int minCmd = minDrive < ES_TURN_PWM ? minDrive : ES_TURN_PWM;
      if (larger(leftThreshold(), rightThreshold()) >= minCmd) {
        note_ = "Escape PWM too low for measured deadband; tune before running";
        return;
      }
    } else if (key != 'E' && key != 'S' && (leftThreshold() >= MS_TURN_PWM ||
               ((key == 'T' || key == 'L' || key == 'G') && rightThreshold() >= MS_TURN_PWM))) {
      note_ = "Turn PWM too low for measured forward deadband";
      return;
    }

    if (!takeBaseline(r)) return;
    ir.read();
    irTick_.resetTimer(now);
    start_ = phaseStart_ = lastLeft_ = lastRight_ = lastTick_ = now;
    tick_.resetTimer(now);
    stepHeading_ = odo_.pose.theta;
    quarter_ = 1;
    quarters_ = (key == 'G' || key == 'V') ? 4 : 1;
    turnPhase_ = TP_TURNING;

    if (key == 'S') {
      if (ir.reading.front <= MS_STRAIGHT_NEAR_FRONT) {
        note_ = "Front too close to start straight test";
        return;
      }
      DriftSettings s = new DriftSettings();
      s.correction = MS_STRAIGHT_CORRECTION;
      s.pathRecovery = MS_STRAIGHT_PATH_RECOVERY;
      drift_.beginRun(s);
      mode_ = MODE_STRAIGHT;
      note_ = "Bounded straight test";
    } else if (key == 'E') {
      pilot_.begin(now, odo_.pose.x, odo_.pose.y, odo_.pose.theta);
      mode_ = MODE_ESCAPE;
      note_ = "Single-box trial";
    } else {
      if (turnTooClose(ir.reading)) {
        note_ = "Turn test blocked: obstacle very close";
        return;
      }
      mode_ = (key == 'L') ? MODE_POINT_CCW : ((key == 'T' || key == 'G') ? MODE_POINT : MODE_PIVOT);
      note_ = (mode_ == MODE_POINT_CCW) ? "Counterclockwise turn test" : "Clockwise turn test";
    }
  }

  private void turnTick(Robot_c r, long now) {
    int sign = (mode_ == MODE_POINT_CCW) ? 1 : -1;
    float target = sign * 90.0f * quarter_;
    if (turnPhase_ == TP_READING) {
      if (now - phaseStart_ >= MS_READ_PAUSE_MS) {
        ++quarter_;
        stepHeading_ = odo_.pose.theta;
        turnPhase_ = TP_TURNING;
        phaseStart_ = now;
      }
      return;
    }
    if (turnPhase_ == TP_SETTLING) {
      if (now - phaseStart_ < MS_SETTLE_MS) return;
      if (quarter_ == quarters_) {
        stop(r, "Turn complete; compare estimated angle with protractor");
      } else {
        turnPhase_ = TP_READING;
        phaseStart_ = now;
        note_ = "Record physical angle; next step in five seconds";
      }
      return;
    }
    if (sign * (odo_.pose.theta - stepHeading_) * DEG_PER_RAD < -MS_WRONG_TURN_DEG) {
      fault(r, "Turn moved opposite to commanded direction");
      return;
    }
    if (now - phaseStart_ >= MS_TURN_LIMIT_MS) {
      fault(r, "Turn timed out");
      return;
    }
    if (sign * odo_.pose.theta * DEG_PER_RAD >= sign * target - MS_TURN_LEAD_DEG) {
      if (drive(r, 0, 0, now)) {
        turnPhase_ = TP_SETTLING;
        phaseStart_ = now;
        note_ = "Measuring coast-down";
      }
    } else {
      note_ = sign > 0 ? "Turning counterclockwise" : "Turning clockwise";
      drive(r, -sign * MS_TURN_PWM, mode_ == MODE_PIVOT ? 0 : sign * MS_TURN_PWM, now);
    }
  }

  void update(Robot_c r, TopIR_c ir) {
    long now = r.getMillis();
    if (r.isButtonPressed() && movingOrCalibrating()) {
      stop(r, "Stopped by robot button");
      return;
    }
    if (!tick_.isReady(now)) return;
    tick_.resetTimer(now);
    long gap = now - lastTick_;
    lastTick_ = now;
    boolean newIR = irTick_.isReady(now);
    if (newIR) {
      ir.read();
      irTick_.resetTimer(now);
    }
    if (mode_ == MODE_FAULT) {
      r.setMotorPWM(0, 0);
      return;
    }
    if (mode_ == MODE_IDLE) return;
    if (gap > MS_MAX_CONTROL_GAP_MS) {
      fault(r, "Control update late");
      return;
    }
    if (mode_ == MODE_CALIBRATE) {
      if (cal_.update(r)) {
        ready_ = true;
        mode_ = MODE_IDLE;
        note_ = "Forward wheel thresholds measured";
      } else if (cal_.hasFailed()) {
        fault(r, "Calibration failed; check motors and encoders");
      }
      return;
    }
    if (!encoderTick(r, now)) return;
    if (mode_ == MODE_POINT || mode_ == MODE_POINT_CCW || mode_ == MODE_PIVOT) {
      if (newIR && turnTooClose(ir.reading)) {
        stop(r, "Turn test stopped: obstacle very close");
        return;
      }
      turnTick(r, now);
      return;
    }
    if (mode_ == MODE_STRAIGHT) {
      if (netCounts(leftCount_, startLeft_) < -2 || netCounts(rightCount_, startRight_) < -2) {
        fault(r, "Wheel counts reversed during straight command");
        return;
      }
      if (ir.reading.front <= MS_STRAIGHT_NEAR_FRONT) {
        stop(r, "Straight test stopped: front wall");
        return;
      }
      if ((float) Math.hypot(odo_.pose.x, odo_.pose.y) >= MS_STRAIGHT_MAX_MM || now - start_ >= MS_STRAIGHT_MAX_MS) {
        stop(r, "Straight test complete");
        return;
      }
      int trim = (int) drift_.trimPWM(odo_, now);
      drive(r, larger(MS_STRAIGHT_PWM, leftThreshold() + MS_START_MARGIN_PWM) + trim,
               larger(MS_STRAIGHT_PWM, rightThreshold() + MS_START_MARGIN_PWM) - trim, now);
      return;
    }
    if (mode_ == MODE_ESCAPE) {
      pilot_.update(now, odo_.pose.x, odo_.pose.y, odo_.pose.theta,
                    ir.reading.back_left, ir.reading.front, ir.reading.back_right);
      if (pilot_.failed()) {
        fault(r, pilot_.reason());
        return;
      }
      if (pilot_.done()) {
        stop(r, pilot_.reason());
        return;
      }
      note_ = pilot_.reason();
      drive(r, pilot_.left(), pilot_.right(), now);
    }
  }
}
