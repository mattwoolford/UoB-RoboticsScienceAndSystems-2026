import java.nio.file.Path;
import java.util.Random;
import processing.data.Table;
import processing.data.TableRow;

/** Open-loop drift trials using the compiled DigitalTwin motor and pose models. */
public class SimulationBatch {
  /** Constant equal demand: no calibration, line following, or heading feedback. */
  static class MechanicalDriftExperiment extends DigitalTwin.StraightLineExperiment {
    static final int DRIVE_PWM = 45;
    // Explicit sentinel: controller is present only for encoder telemetry.
    static final int OPEN_LOOP_MODE = -1;

    MechanicalDriftExperiment(DigitalTwin app) { app.super(); }

    @Override public void step(DigitalTwin.RobotSimulation_c robot,
                        DigitalTwin.Controller_c controller, int dtMs) {
      if (dtMs <= 0 || SAMPLE_INTERVAL_MS % dtMs != 0)
        throw new IllegalArgumentException("Physics step must divide sample interval");
      if (complete) return;
      if (!running) {
        robot.resetForRun(0, 0, 0, 0, 0);
        controller.odometry.reset();
        controller.odometry.update(0, 0);
        controller.mode = OPEN_LOOP_MODE;
        robot.setMotorPWM(DRIVE_PWM, DRIVE_PWM);
        startMs = robot.getMillis();
        running = true;
        record(robot, controller, 0);
        nextSampleMs = SAMPLE_INTERVAL_MS;
      }
      // Encoders are observed, never fed back into motor demand.
      robot.updatePhysics(dtMs);
      robot.advanceTime(dtMs);
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
  }

  /** Additional plant model, never installed into the sterile DigitalTwin. */
  static class NoisyRobot extends DigitalTwin.RobotSimulation_c {
    final Random random;
    final float imbalance, tauMs, wheelNoise, sensorNoise;
    float leftVelocity = 0, rightVelocity = 0;

    NoisyRobot(DigitalTwin app, long seed, float imbalance, float tauMs,
               float wheelNoise, float sensorNoise) {
      app.super(16, 90, null, 0, 0);
      random = new Random(seed);
      this.imbalance = imbalance;
      this.tauMs = tauMs;
      this.wheelNoise = wheelNoise;
      this.sensorNoise = sensorNoise;
    }

    @Override public void getSurfaceSensors() {
      super.getSurfaceSensors();
      for (int i = 0; i < surface.reading.length; i++) {
        surface.reading[i] = Math.max(0, Math.min(4095,
          surface.reading[i] + sensorNoise * (float)random.nextGaussian()));
      }
    }

    @Override public void updatePhysics(int dtMs) {
      motors.update();
      // Gains are 1-b/2 and 1+b/2. b>0 makes the right wheel faster.
      float leftTarget = motors.left.speedMmPerMs * (1 - imbalance / 2);
      float rightTarget = motors.right.speedMmPerMs * (1 + imbalance / 2);
      // Independent fractional velocity disturbances at each fixed 10 ms tick.
      // No additive motion at zero demand; this is not measurement noise.
      leftTarget *= 1 + wheelNoise * (float)random.nextGaussian();
      rightTarget *= 1 + wheelNoise * (float)random.nextGaussian();
      float alpha = tauMs == 0 ? 1 : (float)(1 - Math.exp(-dtMs / tauMs));
      leftVelocity += alpha * (leftTarget - leftVelocity);
      rightVelocity += alpha * (rightTarget - rightVelocity);
      odometry.update(leftVelocity * dtMs, rightVelocity * dtMs, wheelSeparationMm);
    }

    @Override public void resetForRun(float x, float y, float theta,
                                     float leftEncoder, float rightEncoder) {
      super.resetForRun(x, y, theta, leftEncoder, rightEncoder);
      leftVelocity = rightVelocity = 0;
    }
  }

  /** Shared fixed-step execution and CSV collection for both launch modes. */
  static class Batch {
    final DigitalTwin app;
    final Path output;
    final String model;
    final int runs;
    final long seed;
    final float imbalance, tau, wheelNoise, sensorNoise;
    int run = 0, steps = 0;
    boolean complete = false;
    DigitalTwin.StraightLineExperiment experiment;
    DigitalTwin.Controller_c controller;
    DigitalTwin.RobotSimulation_c robot;
    Table combined;

    Batch(DigitalTwin app, String[] args) {
      this.app = app;
      output = Path.of(args[0]).toAbsolutePath();
      model = args[1];
      runs = Integer.parseInt(args[2]);
      seed = Long.parseLong(args[3]);
      imbalance = Float.parseFloat(args[4]);
      tau = Float.parseFloat(args[5]);
      wheelNoise = Float.parseFloat(args[6]);
      sensorNoise = Float.parseFloat(args[7]);
      startTrial();
    }

    void startTrial() {
      steps = 0;
      experiment = new MechanicalDriftExperiment(app);
      controller = app.new Controller_c();
      robot = model.equals("sterile")
        ? app.new RobotSimulation_c(16, 90, null, 0, 0)
        : new NoisyRobot(app, seed + run, imbalance, tau, wheelNoise, sensorNoise);
      robot.straightLine = experiment;
    }

    void step() {
      if (complete) return;
      experiment.step(robot, controller, 10);
      steps++;
      if (!experiment.complete) {
        if (steps >= 6000) throw new IllegalStateException("Trial exceeded 60 s limit");
        return;
      }
      collectTrial();
      if (run + 1 == runs) {
        if (!app.saveTable(combined, output.toString()))
          throw new IllegalStateException("CSV save failed");
        complete = true;
        System.out.println(model + ": " + runs + " runs, " + combined.getRowCount()
          + " rows -> " + output.getFileName());
      } else {
        run++;
        startTrial();
      }
    }

    void collectTrial() {
      if (combined == null) {
        combined = new Table();
        for (String column : experiment.samples.getColumnTitles()) combined.addColumn(column);
        for (String column : new String[]{"model_id", "run_id", "seed", "centre_x_mm", "centre_y_mm",
             "gain_imbalance", "motor_tau_ms", "wheel_noise_fraction", "sensor_noise_counts", "drive_mode"})
          combined.addColumn(column);
      }
      for (TableRow source : experiment.samples.rows()) {
        TableRow row = combined.addRow();
        for (String column : experiment.samples.getColumnTitles()) row.setString(column, source.getString(column));
        row.setString("model_id", model);
        row.setString("drive_mode", "open_loop_equal_pwm");
        row.setString("run_id", model + "-" + String.format("%03d", run));
        row.setString("seed", Long.toString(seed + run));
        row.setFloat("centre_x_mm", source.getFloat("forward_mm"));
        row.setFloat("centre_y_mm", source.getFloat("signed_drift_mm"));
        row.setFloat("gain_imbalance", imbalance);
        row.setFloat("motor_tau_ms", tau);
        row.setFloat("wheel_noise_fraction", wheelNoise);
        row.setFloat("sensor_noise_counts", sensorNoise);
      }
    }
  }

  /** Processing window using the same PDE drawing and model instances as CSV export. */
  public static class LiveView extends DigitalTwin {
    final String[] batchArgs;
    Batch batch;
    long previousNanos, accumulatorNanos;
    boolean paused = false, tracking = true;
    float zoom = 1.5f;
    float cameraX = 0, cameraY = 0;

    LiveView(String[] args) { batchArgs = args; }

    @Override public void setup() {
      surface.setResizable(true);
      surface.setTitle("Processing | Straight-line experiments | " + batchArgs[1]);
      int windowIndex = Integer.getInteger("drift.window.index", 0);
      surface.setLocation(60 + windowIndex * 50, 60 + windowIndex * 40);
      frameRate(60);
      ellipseMode(RADIUS);
      strokeJoin(ROUND);
      batch = new Batch(this, batchArgs);
      previousNanos = System.nanoTime();
    }

    @Override public void draw() {
      try {
        long now = System.nanoTime();
        // Bound catch-up after OS stalls; never skip or change a physics tick.
        if (!paused) accumulatorNanos += Math.min(now - previousNanos, 100_000_000L);
        previousNanos = now;
        while (!paused && accumulatorNanos >= 10_000_000L && !batch.complete) {
          batch.step();
          accumulatorNanos -= 10_000_000L;
        }
        drawTrial();
        if (batch.complete) exit();
      } catch (RuntimeException error) {
        error.printStackTrace();
        System.exit(1);
      }
    }

    void drawTrial() {
      background(228);
      var pose = batch.robot.odometry.pose;
      if (tracking) { cameraX = pose.x; cameraY = pose.y; }
      pushMatrix();
      translate(width / 2f, height * .42f);
      scale(zoom, -zoom);
      translate(-cameraX, -cameraY);
      batch.experiment.drawSurface();
      stroke(70, 150, 210); strokeWeight(1 / zoom);
      line(cameraX - width / zoom, 0, cameraX + width / zoom, 0);
      batch.robot.draw();
      popMatrix();

      noStroke(); fill(248, 248, 248); rect(0, 0, width, 105);
      fill(30); textSize(18);
      text(batch.model + "   |   Trial " + (batch.run + 1) + " / " + batch.runs
        + "   |   Seed " + (batch.seed + batch.run), 20, 28);
      textSize(14);
      String state = batch.complete ? "Complete" : paused ? "Paused" :
        "Open-loop equal PWM (45 / 45)";
      float elapsed = batch.experiment.samples.getRowCount() == 0 ? 0 :
        (batch.robot.getMillis() - batch.experiment.startMs) / 1000f;
      text(state + "   |   " + nf(elapsed, 0, 2) + " / 30.00 s   |   1x real time", 20, 54);
      text("Space: pause/resume   T: track robot   +/-: zoom   Arrows: pan   Close window: cancel batch",
        20, 80);

      float top = height - 250;
      fill(248); rect(0, top, width, 250);
      fill(30); textSize(14);
      text("Centrepoint drift: " + nf(pose.y, 0, 4) + " mm (+left / -right)"
        + "   |   Forward: " + nf(pose.x, 0, 2) + " mm", 20, top + 25);
      text("Time (s)           Drift (mm)           Forward (mm)", 20, top + 55);
      Table samples = batch.experiment.samples;
      int first = Math.max(0, samples.getRowCount() - 8);
      for (int i = first; i < samples.getRowCount(); i++) {
        TableRow row = samples.getRow(i);
        float y = top + 80 + (i - first) * 18;
        text(nf(row.getFloat("elapsed_s"), 0, 0), 20, y);
        text(nf(row.getFloat("signed_drift_mm"), 0, 4), 135, y);
        text(nf(row.getFloat("forward_mm"), 0, 2), 270, y);
      }
      text("Trials advance automatically. CSV saves after all " + batch.runs + " trials.", 20, top + 235);
    }

    @Override public void keyPressed() {
      if (key == ' ') {
        paused = !paused;
        previousNanos = System.nanoTime();
      }
      if (key == 't' || key == 'T') tracking = !tracking;
      if (key == '+' || key == '=') zoom = Math.min(4, zoom * 1.2f);
      if (key == '-') zoom = Math.max(.25f, zoom / 1.2f);
      if (key == CODED) {
        if (keyCode == LEFT || keyCode == RIGHT || keyCode == UP || keyCode == DOWN) tracking = false;
        if (keyCode == LEFT) cameraX -= 50 / zoom;
        if (keyCode == RIGHT) cameraX += 50 / zoom;
        if (keyCode == UP) cameraY += 50 / zoom;
        if (keyCode == DOWN) cameraY -= 50 / zoom;
      }
    }
  }

  public static void main(String[] args) {
    if (args.length == 9 && args[8].equals("--live")) {
      processing.core.PApplet.runSketch(new String[]{"SimulationBatch"}, new LiveView(args));
    } else {
      Batch batch = new Batch(new DigitalTwin(), args);
      while (!batch.complete) batch.step();
    }
  }
}
