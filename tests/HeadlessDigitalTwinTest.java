import processing.data.Table;
import processing.data.TableRow;

/** Runs the actual Processing-compiled model without a window or TCP. */
public class HeadlessDigitalTwinTest {
  static void check(boolean condition, String message) {
    if (!condition) throw new AssertionError(message);
  }
  static void near(float actual, float expected, float tolerance, String message) {
    check(Math.abs(actual - expected) <= tolerance, message + ": " + actual + " != " + expected);
  }
  static DigitalTwin.StraightLineExperiment trial(DigitalTwin app) {
    var trial = app.new StraightLineExperiment();
    var robot = app.new RobotSimulation_c(16, 90, null, 0, 0);
    robot.straightLine = trial;
    var controller = app.new Controller_c();
    controller.setSignal(1);
    check(controller.getSignal() == 0, "Start must be rejected before calibration");
    for (int i = 0; i < 10000 && !trial.complete; i++) trial.step(robot, controller, 10);
    check(trial.complete, "Trial must finish");
    check(trial.startMs > 0, "Calibration must precede the trial clock");
    check(controller.motor_calibration.getLeftDeadbandPWM() > 0, "Calibration measured threshold");
    check(controller.motor_calibration.getLeftDeadbandPWM() == controller.motor_calibration.getRightDeadbandPWM(), "Symmetric calibration");
    check(trial.samples.getRowCount() == 31, "Exactly 0 through 30 seconds");
    for (int i = 0; i <= 30; i++) {
      TableRow row = trial.samples.getRow(i);
      near(row.getFloat("elapsed_s"), i, 0, "Exact sampling boundary");
      near(row.getFloat("signed_drift_mm"), 0, 0, "No manufactured lateral drift");
      near(row.getFloat("forward_mm"), i * 56.25f, .1f, "Full travel interval");
      near(row.getFloat("odometry_y_mm"), 0, 0, "No estimated lateral drift");
      near(row.getFloat("odometry_x_mm"), row.getFloat("forward_mm"), .4f, "Encoder quantisation only");
      check(row.getInt("controller_mode") == controller.FOLLOWING, "Line retained throughout");
    }
    check(robot.getLeftMotorPWM() == 0 && robot.getRightMotorPWM() == 0, "Stop after final sample");
    float finalX = robot.odometry.pose.x;
    trial.step(robot, controller, 10);
    near(robot.odometry.pose.x, finalX, 0, "Completed run frozen");
    robot.setMotorPWM(45.9f, -35.9f);
    check(robot.getLeftMotorPWM() == 45 && robot.getRightMotorPWM() == -35, "Firmware PWM truncation");
    return trial;
  }
  public static void main(String[] args) {
    var app = new DigitalTwin();
    var first = trial(app);
    var second = trial(app);
    for (int i = 0; i < first.samples.getRowCount(); i++) {
      for (String column : first.samples.getColumnTitles())
        check(first.samples.getRow(i).getString(column).equals(second.samples.getRow(i).getString(column)), "Identical repeated trial");
    }
    // Fixtures below verify sign and recovery; they are NOT disturbances in the trial.
    var robot = app.new RobotSimulation_c(16, 90, null, 0, 0);
    var controller = app.new Controller_c();
    var fixture = app.new StraightLineExperiment();
    robot.odometry.pose.y = 12;
    fixture.record(robot, controller, 3000);
    robot.odometry.pose.y = -7;
    fixture.record(robot, controller, 4000);
    near(fixture.samples.getRow(0).getFloat("left_mm"), 12, 0, "Positive means left");
    near(fixture.samples.getRow(1).getFloat("right_mm"), 7, 0, "Negative means right");
    controller.mode = controller.FOLLOWING;
    robot.surface.reading[2] = 400;
    controller.runLineFollower(robot, 0);
    check(controller.mode == controller.SEARCHING && robot.getLeftMotorPWM() == -35, "Recovery command");
    controller.runLineFollower(robot, 4990);
    check(controller.mode == controller.SEARCHING, "Recovery before timeout");
    controller.runLineFollower(robot, 5000);
    check(controller.mode == controller.STOPPED && robot.getLeftMotorPWM() == 0, "Recovery timeout");
    controller = app.new Controller_c();
    for (int i = 0; i < 301; i++) controller.motorStartStopTest(robot, i * 10);
    check(robot.getLeftMotorPWM() == 100 && robot.getRightMotorPWM() == 100,
      "Main start/stop PWM and call-count boundary");
    controller.motorStartStopTest(robot, 3010);
    check(robot.getLeftMotorPWM() == 0, "Main start/stop stops");
    var odometry = app.new OdometryModel_c();
    check(!odometry.update(123, 123), "First counts establish baseline");
    near(odometry.pose.x, 0, 0, "No initial phantom motion");
    odometry.update(133, 133);
    near(odometry.pose.x, 10 * (float)(2 * Math.PI) * 16 / 358.3f, .0001f, "Main Euler estimate");
    check(odometry.countChange(Integer.MIN_VALUE, Integer.MAX_VALUE) == 1, "Forward count wrap");
    check(odometry.countChange(Integer.MAX_VALUE, Integer.MIN_VALUE) == -1, "Reverse count wrap");
    odometry.leftWheelRadiusMm = Float.NaN;
    check(!odometry.update(134, 134), "Invalid geometry rejected");
    // Exercise actual application controls/timing without rendering a window.
    var ui = new DigitalTwin() {
      public void ellipseMode(int mode) { }
      public void strokeJoin(int join) { }
      public processing.core.PImage loadImage(String path) { return null; }
    };
    var simulator = ui.new Simulator(ui, 135, 0);
    check(simulator.simulatorMode == simulator.STRAIGHT_LINE, "Default experiment mode");
    simulator.experiment.outputPath = args[1] + "/partial.csv";
    for (int i = 0; i < 40; i++) {
      simulator.lastSimulationUpdateMs = ui.millis() - 100;
      simulator.updateRobotModel();
    }
    check(simulator.experiment.running, "Application completes calibration and starts");
    simulator.handleKey('r', 0);
    check(simulator.experiment.samples.getRowCount() == 0 && simulator.robot.getMillis() == 0,
      "Restart clears samples and clock");
    check(simulator.robot.getLeftMotorPWM() == 0, "Restart stops motors");
    simulator.handleKey('m', 0);
    check(simulator.simulatorMode == simulator.SANDBOX && simulator.robot.straightLine == null,
      "Sandbox restores original surface");
    simulator.handleKey('m', 0);
    check(simulator.simulatorMode == simulator.LIVE_COMPARISON, "Live mode selected");
    simulator.handleKey('m', 0);
    check(simulator.simulatorMode == simulator.STRAIGHT_LINE && simulator.robot.straightLine == simulator.experiment,
      "Return to fresh experiment");
    first.outputPath = args[0];
    first.exportCsv();
    Table loaded = app.loadTable(args[0], "header");
    check(loaded != null && loaded.getRowCount() == 31, "CSV round trip");
    System.out.println("PASS: 2 identical 30-second trials, exact sample times, signed drift, calibration, PWM, recovery, main start/stop, odometry, CSV");
  }
}
