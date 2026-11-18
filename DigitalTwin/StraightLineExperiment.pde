/** Deterministic closed-loop trial. All distances are millimetres.
 * Travel is along +x at y=0, so positive cross-track error means LEFT.
 * No noise, wheel imbalance, initial offset, slip, or timing jitter is added.
 */
class StraightLineExperiment {
  final int DURATION_MS = 30000;
  final int SAMPLE_INTERVAL_MS = 1000;
  final float LINE_START_X = -500;
  final float LINE_END_X = 19500;
  final float LINE_WIDTH_MM = 19;
  boolean running = false, complete = false;
  long startMs = 0;
  int nextSampleMs = 0;
  Table samples = new Table();
  String exportStatus = "CSV will be saved automatically on completion";
  String outputPath;

  StraightLineExperiment() {
    String[] columns = {"elapsed_s", "signed_drift_mm", "left_mm", "right_mm",
      "forward_mm", "heading_rad", "odometry_x_mm", "odometry_y_mm",
      "left_pwm", "right_pwm", "left_count", "right_count", "controller_mode"};
    for (String column : columns) samples.addColumn(column);
    outputPath = "results/straight-line-"
      + new java.text.SimpleDateFormat("yyyyMMdd-HHmmss-SSS").format(new java.util.Date())
      + "-" + Long.toHexString(System.nanoTime()) + ".csv";
  }

  // Called once per fixed step; both wall-clock UI and headless checks use this.
  void step(RobotSimulation_c robot, Controller_c controller, int dtMs) {
    if (dtMs <= 0 || SAMPLE_INTERVAL_MS <= 0 || DURATION_MS <= 0
      || SAMPLE_INTERVAL_MS % dtMs != 0 || DURATION_MS % SAMPLE_INTERVAL_MS != 0)
      throw new IllegalArgumentException("Trial duration must be a multiple of the sample interval, and samples a multiple of the physics step");
    if (complete) return;
    if (!running) {
      controller.update(robot);
      robot.updatePhysics(dtMs);
      robot.advanceTime(dtMs);
      if (!controller.isReadyToStart()) return;
      // Calibration travel is excluded. Keep its measured thresholds, but place
      // both truth and estimated pose on the line with fresh encoder baselines.
      robot.resetForRun(0, 0, 0, 0, 0);
      controller.odometry.reset();
      controller.odometry.update(0, 0);
      controller.procedure = controller.LINE_FOLLOW;
      controller.setSignal(1);
      controller.update_timer.resetTimer(robot.getMillis() - controller.UPDATE_INTERVAL_MS);
      robot.getSurfaceSensors();
      startMs = robot.getMillis();
      running = true;
      record(robot, controller, 0);
      nextSampleMs = SAMPLE_INTERVAL_MS;
      return;
    }
    // Apply the command at the BEGINNING of [t, t+dt], then measure at its end.
    controller.update(robot);
    robot.updatePhysics(dtMs);
    robot.advanceTime(dtMs);
    // Acquire at the sample boundary; the next control acquisition sees the
    // same counts and therefore cannot double-count this travel.
    controller.odometry.update(robot.getLeftEncoderCount(), robot.getRightEncoderCount());
    int elapsedMs = (int)(robot.getMillis() - startMs);
    if (elapsedMs == nextSampleMs) {
      record(robot, controller, elapsedMs);
      nextSampleMs += SAMPLE_INTERVAL_MS;
    }
    if (elapsedMs >= DURATION_MS) {
      robot.setMotorPWM(0, 0);
      robot.motors.update();
      running = false;
      complete = true;
    }
  }

  void record(RobotSimulation_c robot, Controller_c controller, int elapsedMs) {
    TableRow row = samples.addRow();
    float drift = robot.odometry.pose.y;
    row.setFloat("elapsed_s", elapsedMs / 1000.0);
    row.setFloat("signed_drift_mm", drift);
    row.setFloat("left_mm", drift > 0 ? drift : 0);
    row.setFloat("right_mm", drift < 0 ? -drift : 0);
    row.setFloat("forward_mm", robot.odometry.pose.x);
    row.setFloat("heading_rad", robot.odometry.pose.theta);
    row.setFloat("odometry_x_mm", controller.odometry.pose.x);
    row.setFloat("odometry_y_mm", controller.odometry.pose.y);
    row.setInt("left_pwm", robot.getLeftMotorPWM());
    row.setInt("right_pwm", robot.getRightMotorPWM());
    row.setInt("left_count", robot.getLeftEncoderCount());
    row.setInt("right_count", robot.getRightEncoderCount());
    row.setInt("controller_mode", controller.mode);
  }

  void exportCsv() {
    try {
      boolean saved = saveTable(samples, outputPath);
      exportStatus = saved ? "Saved: " + outputPath : "CSV save failed; press E to retry";
    } catch (RuntimeException error) {
      exportStatus = "CSV save failed; press E to retry: " + error.getMessage();
    }
    println(exportStatus);
  }

  void drawSurface() {
    pushStyle();
    rectMode(CORNER); noStroke(); fill(255);
    rect(LINE_START_X, -1000, LINE_END_X - LINE_START_X, 2000);
    fill(0);
    rect(LINE_START_X, -LINE_WIDTH_MM / 2, LINE_END_X - LINE_START_X, LINE_WIDTH_MM);
    popStyle();
  }

  void drawPanel(RobotSimulation_c robot, Controller_c controller, int availableWidth) {
    pushStyle();
    float panelHeight = 240;
    float top = height - panelHeight - 12;
    noStroke(); fill(255, 245); rectMode(CORNER);
    rect(12, top, availableWidth, panelHeight, 5);
    fill(30); textSize(13);
    String state = complete ? "Complete" : running ? "Running" :
      controller.motor_calibration.hasFailed() ? "Calibration FAILED" : "Calibrating motors";
    text("Straight line | " + state + " | R: restart   E: export CSV", 22, top + 22);
    text("Drift: +left / -right (mm), world position. Duration: " + DURATION_MS / 1000.0
      + " s; samples: " + SAMPLE_INTERVAL_MS / 1000.0 + " s.", 22, top + 44);
    int first = max(0, samples.getRowCount() - 8);
    text("Time (s)          Drift (mm)          Forward (mm)", 22, top + 68);
    for (int i = first; i < samples.getRowCount(); i++) {
      TableRow row = samples.getRow(i);
      text(nf(row.getFloat("elapsed_s"), 0, 0), 22, top + 88 + (i - first) * 16);
      text(nf(row.getFloat("signed_drift_mm"), 0, 4), 130, top + 88 + (i - first) * 16);
      text(nf(row.getFloat("forward_mm"), 0, 2), 260, top + 88 + (i - first) * 16);
    }
    text(exportStatus, 22, top + 220, availableWidth - 20, 20);
    popStyle();
  }
}
