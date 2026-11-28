/**
 * BoxEscapeSim — Processing Simulation for BoxEscape Stamp-C3 Firmware
 * Arena: 30 x 40 cm (400 x 300 mm) with a 15 cm (150 mm) centered opening
 * along the bottom longer (40 cm) side.
 *
 * Runs the exact 10 ms Controller_c + EscapePilot + OdometryModel_c logic
 * from firmware/BoxEscape/ (WHEEL_SEPARATION_MM = 85.40, STOP_EARLY_DEG = 4.0).
 */

BoxWorld world;
Robot_c robot;
TopIR_c topIR;
Controller_c controller;

final int STATUS_READY = 0;
final int STATUS_RUNNING = 1;
final int STATUS_PAUSED = 2;
final int STATUS_ESCAPED = 3;
final int STATUS_CONTACT = 4;
final int STATUS_STOPPED = 5;
final int STATUS_COMPLETE = 6;
final int STATUS_FAULT = 7;

int simStatus = STATUS_READY;
String simReason = "Ready for a simulated escape run.";
String lastActivePhase = "";
char activeCommand = 'E';

int speedMultiplier = 1;
boolean showBeams = true;
boolean showOdometryGhost = true;
boolean enableRightWallSteer = true;
boolean placingMode = false;

// Selected start pose
int presetIndex = 0; // 0=Wall 30mm, 1=Wall 20mm, 2=Centre, 3=Custom
float startX = 85.0f;
float startY = 80.0f;
float startHeadingDeg = 0.0f;

// Fixed-timestep 10 ms accumulator
long lastFrameWallMs = 0;
float accumulatorMs = 0.0f;

// Phase history log
ArrayList<String> phaseLog = new ArrayList<String>();
String prevLoggedPhase = "";

// Arena screen transform (updated on draw)
float arenaScale = 1.4f;
float arenaOriginX = 80.0f;
float arenaOriginY = 480.0f;

final int PANEL_W = 360;

class UIButton {
  String label;
  float x, y, w, h;
  boolean active;
  String action;
  UIButton(String l, float x, float y, float w, float h, boolean a, String act) {
    this.label = l; this.x = x; this.y = y; this.w = w; this.h = h; this.active = a; this.action = act;
  }
  boolean contains(float mx, float my) {
    return mx >= x && mx <= x + w && my >= y && my <= y + h;
  }
}

ArrayList<UIButton> buttons = new ArrayList<UIButton>();

void settings() {
  size(1140, 760);
}

void setup() {
  surface.setResizable(true);
  surface.setTitle("BoxEscape Processing Simulation — 30 x 40 cm (15 cm opening)");
  enableRightWallSteer = ES_RIGHT_WALL_DISTANCE_STEER;
  world = new BoxWorld();
  robot = new Robot_c(world);
  topIR = new TopIR_c(world);
  controller = new Controller_c();
  resetSimulation();
  lastFrameWallMs = millis();
}

void resetSimulation() {
  world.reset(startX, startY, startHeadingDeg);
  robot = new Robot_c(world);
  topIR = new TopIR_c(world);
  controller = new Controller_c();
  controller.initialise(robot, topIR);
  // Idle IR scan matching simulator/engine/sim.js
  world.clockMs = 50;
  controller.update(robot, topIR);
  simStatus = STATUS_READY;
  simReason = "Ready. Press SPACE or click 'Run Escape' to start.";
  lastActivePhase = "";
  activeCommand = 'E';
  accumulatorMs = 0.0f;
  phaseLog.clear();
  prevLoggedPhase = "";
}

void startCommand(char cmd) {
  cmd = Character.toUpperCase(cmd);
  if (simStatus == STATUS_RUNNING) return;
  resetSimulation();
  activeCommand = cmd;
  placingMode = false;

  if (cmd != 'E' && cmd != 'C') {
    // Run virtual motor calibration C first just like sim.js _bench()
    BoxWorld bench = new BoxWorld();
    bench.physicalCoastMode = world.physicalCoastMode;
    bench.reset(ARENA_W_MM / 2.0f, ARENA_H_MM / 2.0f, 0.0f);
    Robot_c benchRobot = new Robot_c(bench);
    TopIR_c benchIR = new TopIR_c(bench);
    Controller_c benchCtrl = controller;
    // Actually run C on real controller against bench world, then re-baseline at start pose
    long savedClock = world.clockMs;
    Robot_c origR = robot;
    TopIR_c origIR = topIR;
    controller.command('C', benchRobot, benchIR);
    boolean calOk = false;
    for (int t = 0; t < 40000; t += 10) {
      if (controller.calibrated()) { calOk = true; break; }
      if (controller.modeName().equals("FAULT")) break;
      bench.step(benchRobot.getLeftMotorPWM(), benchRobot.getRightMotorPWM(), 10);
      controller.update(benchRobot, benchIR);
    }
    if (!calOk) {
      simStatus = STATUS_FAULT;
      simReason = "Motor calibration did not complete.";
      return;
    }
    world.clockMs = bench.clockMs;
    robot = origR;
    topIR = origIR;
  }

  world.clockMs += 50;
  controller.update(robot, topIR);
  controller.command(cmd, robot, topIR);
  simReason = controller.note();
  lastActivePhase = controller.phaseName();
  String mode = controller.modeName();
  if (mode.equals("IDLE") || mode.equals("FAULT")) {
    simStatus = mode.equals("FAULT") ? STATUS_FAULT : STATUS_STOPPED;
    return;
  }
  simStatus = STATUS_RUNNING;
  logPhaseIfChanged();
}

void stopSimulation() {
  if (simStatus != STATUS_RUNNING && simStatus != STATUS_PAUSED) return;
  lastActivePhase = controller.phaseName();
  controller.command('X', robot, topIR);
  simStatus = STATUS_STOPPED;
  simReason = "Stopped by operator.";
  logPhaseIfChanged();
}

void stepSimulation10ms() {
  if (simStatus != STATUS_RUNNING) return;
  lastActivePhase = controller.phaseName();
  world.step(robot.getLeftMotorPWM(), robot.getRightMotorPWM(), 10);
  controller.update(robot, topIR);
  String mode = controller.modeName();
  String note = controller.note();

  if (world.contact) {
    simStatus = STATUS_CONTACT;
    simReason = "Robot body touched a wall or doorpost during " + lastActivePhase + ".";
    controller.command('X', robot, topIR);
  } else if (mode.equals("FAULT")) {
    simStatus = STATUS_FAULT;
    simReason = note;
  } else if (mode.equals("IDLE")) {
    if (activeCommand == 'E') {
      boolean candidate = note.toLowerCase().contains("candidate");
      if (candidate && world.outside()) {
        simStatus = STATUS_ESCAPED;
        simReason = "Whole body cleared the 15 cm doorway; motors stopped.";
      } else if (candidate) {
        simStatus = STATUS_STOPPED;
        simReason = "Controller finished crossing, but body did not clear the doorway.";
      } else {
        simStatus = STATUS_STOPPED;
        simReason = note;
      }
    } else if (activeCommand == 'C') {
      simStatus = controller.calibrated() ? STATUS_COMPLETE : STATUS_STOPPED;
      simReason = note;
    } else if (note.toLowerCase().contains("wall") || note.toLowerCase().contains("obstacle") ||
               note.toLowerCase().contains("stopped") || note.toLowerCase().contains("blocked")) {
      simStatus = STATUS_STOPPED;
      simReason = note;
    } else {
      simStatus = STATUS_COMPLETE;
      simReason = note;
    }
  } else {
    simReason = note;
    lastActivePhase = controller.phaseName();
  }
  logPhaseIfChanged();
}

void logPhaseIfChanged() {
  String ph = controller.modeName() + ":" + controller.phaseName();
  if (!ph.equals(prevLoggedPhase)) {
    prevLoggedPhase = ph;
    String line = nf(world.clockMs / 1000.0f, 0, 2) + "s  " + controller.phaseName() + " — " + simReason;
    phaseLog.add(line);
    if (phaseLog.size() > 10) phaseLog.remove(0);
  }
}

void choosePreset(int idx) {
  if (simStatus == STATUS_RUNNING || simStatus == STATUS_PAUSED) return;
  presetIndex = idx;
  placingMode = false;
  if (idx == 0) { startX = 85.0f; startY = 80.0f; startHeadingDeg = 0.0f; }
  else if (idx == 1) { startX = 85.0f; startY = 70.0f; startHeadingDeg = 0.0f; }
  else if (idx == 2) { startX = 200.0f; startY = 150.0f; startHeadingDeg = 0.0f; }
  resetSimulation();
}

void draw() {
  long wallNow = millis();
  long dtWall = wallNow - lastFrameWallMs;
  lastFrameWallMs = wallNow;
  if (dtWall > 85) dtWall = 85;
  if (simStatus == STATUS_RUNNING) {
    accumulatorMs += dtWall * speedMultiplier;
    int guard = 0;
    while (accumulatorMs >= 10.0f && simStatus == STATUS_RUNNING && guard < 40) {
      stepSimulation10ms();
      accumulatorMs -= 10.0f;
      guard++;
    }
  }

  background(242, 244, 240);
  computeArenaTransform();
  drawArena();
  drawControlPanel();
}

void computeArenaTransform() {
  float viewW = max(200.0f, width - PANEL_W - 60.0f);
  float viewH = max(200.0f, height - 100.0f);
  // Fit x in [-40, 440] (480 mm) and y in [-140, 340] (480 mm)
  arenaScale = min(viewW / 490.0f, viewH / 490.0f);
  float centerX = (width - PANEL_W) / 2.0f;
  float centerY = height / 2.0f;
  // Map world center (200, 100) to canvas center so room + exit apron fit nicely
  arenaOriginX = centerX - 200.0f * arenaScale;
  arenaOriginY = centerY + 100.0f * arenaScale;
}

float wx(float xMm) { return arenaOriginX + xMm * arenaScale; }
float wy(float yMm) { return arenaOriginY - yMm * arenaScale; } // +y is UP in world coords

void drawArena() {
  // Arena floor & exit apron
  pushStyle();
  noStroke();
  fill(252, 253, 250);
  rect(wx(0), wy(ARENA_H_MM), ARENA_W_MM * arenaScale, ARENA_H_MM * arenaScale);
  // Outside exit zone highlight
  fill(226, 242, 232);
  rect(wx(OPENING_LEFT_MM), wy(0), (OPENING_RIGHT_MM - OPENING_LEFT_MM) * arenaScale, 110.0f * arenaScale);

  // 50 mm grid
  stroke(230, 234, 228);
  strokeWeight(1);
  for (int gx = 0; gx <= 400; gx += 50) line(wx(gx), wy(0), wx(gx), wy(ARENA_H_MM));
  for (int gy = 0; gy <= 300; gy += 50) line(wx(0), wy(gy), wx(ARENA_W_MM), wy(gy));

  // Safe placement zone indicator when placing
  if (placingMode) {
    stroke(24, 110, 90, 140);
    strokeWeight(1.5f);
    fill(24, 110, 90, 18);
    rect(wx(ROBOT_RADIUS_MM), wy(ARENA_H_MM - ROBOT_RADIUS_MM),
         (ARENA_W_MM - 2 * ROBOT_RADIUS_MM) * arenaScale,
         (ARENA_H_MM - 2 * ROBOT_RADIUS_MM) * arenaScale);
  }

  // Doorway dashed threshold line
  stroke(24, 140, 100, 140);
  strokeWeight(1.5f);
  line(wx(OPENING_LEFT_MM), wy(0), wx(OPENING_RIGHT_MM), wy(0));

  // Walls
  stroke(38, 48, 44);
  strokeWeight(max(3.0f, 4.0f * arenaScale * 0.7f));
  strokeCap(SQUARE);
  for (int i = 0; i < world.WALLS.length; i++) {
    line(wx(world.WALLS[i][0]), wy(world.WALLS[i][1]),
         wx(world.WALLS[i][2]), wy(world.WALLS[i][3]));
  }

  // Dimension labels
  fill(85, 100, 94);
  textSize(12);
  textAlign(CENTER, BOTTOM);
  text("40 cm (400 mm)", wx(200), wy(ARENA_H_MM) - 8);
  textAlign(CENTER, TOP);
  text("15 cm (150 mm) opening", wx(200), wy(0) + 12);
  pushMatrix();
  translate(wx(0) - 14, wy(150));
  rotate(-HALF_PI);
  textAlign(CENTER, BOTTOM);
  text("30 cm (300 mm)", 0, 0);
  popMatrix();

  // Trail
  if (world.trail.size() > 1) {
    noFill();
    stroke(34, 130, 112, 180);
    strokeWeight(2.0f);
    beginShape();
    for (int i = 0; i < world.trail.size(); i++) {
      PVector p = world.trail.get(i);
      vertex(wx(p.x), wy(p.y));
    }
    endShape();
  }

  // IR sensor fans
  if (showBeams) {
    color[] sc = { color(120, 102, 168), color(57, 135, 162), color(181, 103, 54) };
    for (int s = 0; s < 3; s++) {
      ArrayList<IRBeam> sb = new ArrayList<IRBeam>();
      for (int i = 0; i < world.beams.size(); i++) {
        if (world.beams.get(i).sensorIdx == s) sb.add(world.beams.get(i));
      }
      if (sb.size() > 0) {
        fill(red(sc[s]), green(sc[s]), blue(sc[s]), 30);
        noStroke();
        beginShape();
        vertex(wx(sb.get(0).x1), wy(sb.get(0).y1));
        for (int i = 0; i < sb.size(); i++) {
          vertex(wx(sb.get(i).x2), wy(sb.get(i).y2));
        }
        endShape(CLOSE);
        for (int i = 0; i < sb.size(); i++) {
          IRBeam b = sb.get(i);
          if (b.central) {
            stroke(sc[s], 210);
            strokeWeight(1.5f);
            line(wx(b.x1), wy(b.y1), wx(b.x2), wy(b.y2));
            if (b.hit) {
              noStroke();
              fill(sc[s]);
              ellipse(wx(b.x2), wy(b.y2), 5, 5);
            }
          }
        }
      }
    }
  }

  // Odometry ghost pose (projected into arena frame from start pose)
  if (showOdometryGhost && !activeCommandIsCalibrate()) {
    OdometryModel_c.Pose op = controller.odometry().pose;
    float h0 = radians(startHeadingDeg);
    float ox = startX + cos(h0) * op.x - sin(h0) * op.y;
    float oy = startY + sin(h0) * op.x + cos(h0) * op.y;
    float oa = h0 + op.theta;
    noFill();
    stroke(220, 110, 35, 170);
    strokeWeight(1.8f);
    ellipse(wx(ox), wy(oy), ROBOT_RADIUS_MM * 2 * arenaScale, ROBOT_RADIUS_MM * 2 * arenaScale);
    line(wx(ox), wy(oy), wx(ox + 38 * cos(oa)), wy(oy + 38 * sin(oa)));
  }

  // True robot body
  float rx = wx(world.x), ry = wy(world.y);
  float rPix = ROBOT_RADIUS_MM * arenaScale;
  fill(world.contact ? color(238, 175, 165) : color(198, 218, 224));
  stroke(world.contact ? color(175, 45, 30) : color(26, 72, 64));
  strokeWeight(2.2f);
  ellipse(rx, ry, rPix * 2, rPix * 2);

  // Heading arrow
  float hx = wx(world.x + 36 * cos(world.theta));
  float hy = wy(world.y + 36 * sin(world.theta));
  stroke(22, 100, 84);
  strokeWeight(3.0f);
  line(rx, ry, hx, hy);
  noStroke();
  fill(22, 100, 84);
  ellipse(hx, hy, 6, 6);

  // Sensor mount dots
  int[] sides = { 1, 0, -1 };
  color[] sc = { color(120, 102, 168), color(57, 135, 162), color(181, 103, 54) };
  for (int i = 0; i < 3; i++) {
    float sa = world.theta + radians(135.0f * sides[i]);
    fill(sc[i]);
    ellipse(wx(world.x + ROBOT_RADIUS_MM * cos(sa)), wy(world.y + ROBOT_RADIUS_MM * sin(sa)), 6, 6);
  }
  popStyle();
}

boolean activeCommandIsCalibrate() {
  return activeCommand == 'C';
}

void drawControlPanel() {
  buttons.clear();
  float px = width - PANEL_W;
  pushStyle();
  noStroke();
  fill(252, 253, 251);
  rect(px, 0, PANEL_W, height);
  stroke(214, 222, 216);
  strokeWeight(1);
  line(px, 0, px, height);

  float x0 = px + 16;
  float cw = PANEL_W - 32;
  float y = 16;

  // Title + status badge
  fill(26, 44, 38);
  textAlign(LEFT, TOP);
  textSize(15);
  text("BoxEscape Sim · 30 × 40 cm", x0, y);

  String stText = statusLabel();
  color badgeBg = simStatus == STATUS_ESCAPED ? color(210, 240, 222) :
                  (simStatus == STATUS_CONTACT || simStatus == STATUS_FAULT) ? color(248, 220, 214) :
                  (simStatus == STATUS_RUNNING) ? color(218, 236, 244) : color(234, 238, 234);
  color badgeFg = simStatus == STATUS_ESCAPED ? color(12, 98, 68) :
                  (simStatus == STATUS_CONTACT || simStatus == STATUS_FAULT) ? color(152, 42, 28) :
                  (simStatus == STATUS_RUNNING) ? color(18, 88, 120) : color(52, 68, 62);
  noStroke();
  fill(badgeBg);
  rect(x0 + cw - 92, y - 2, 92, 22, 5);
  fill(badgeFg);
  textAlign(CENTER, CENTER);
  textSize(11);
  text(stText, x0 + cw - 46, y + 9);
  y += 28;

  // Phase & reason
  textAlign(LEFT, TOP);
  fill(20, 92, 76);
  textSize(12);
  text("Mode: " + controller.modeName() + "   Phase: " + controller.phaseName(), x0, y);
  y += 18;
  fill(60, 76, 70);
  textSize(11);
  text(simReason, x0, y, cw, 34);
  y += 38;

  // Run buttons
  float bw3 = (cw - 12) / 3.0f;
  String runLabel = (simStatus == STATUS_RUNNING) ? "Pause" : (simStatus == STATUS_PAUSED ? "Resume" : "Run Escape");
  addButton(runLabel, x0, y, bw3, 28, simStatus == STATUS_RUNNING, "run");
  addButton("Stop (X)", x0 + bw3 + 6, y, bw3, 28, false, "stop");
  addButton("Reset (R)", x0 + 2 * (bw3 + 6), y, bw3, 28, false, "reset");
  y += 36;

  // Presets & Place
  fill(80, 94, 88);
  textSize(11);
  text("Start pose  (heading " + nf(startHeadingDeg, 0, 0) + "° · use [ / ] to rotate)", x0, y);
  y += 16;
  float bw4 = (cw - 18) / 4.0f;
  addButton("Wall 30", x0, y, bw4, 24, !placingMode && presetIndex == 0, "p0");
  addButton("Wall 20", x0 + bw4 + 6, y, bw4, 24, !placingMode && presetIndex == 1, "p1");
  addButton("Centre", x0 + 2 * (bw4 + 6), y, bw4, 24, !placingMode && presetIndex == 2, "p2");
  addButton("Place", x0 + 3 * (bw4 + 6), y, bw4, 24, placingMode, "place");
  y += 30;

  // Heading adjust + Speed
  float bw5 = (cw - 24) / 5.0f;
  addButton("-15°", x0, y, bw5, 22, false, "rot-");
  addButton("+15°", x0 + bw5 + 6, y, bw5, 22, false, "rot+");
  addButton("1x", x0 + 2 * (bw5 + 6), y, bw5, 22, speedMultiplier == 1, "spd1");
  addButton("2x", x0 + 3 * (bw5 + 6), y, bw5, 22, speedMultiplier == 2, "spd2");
  addButton("4x", x0 + 4 * (bw5 + 6), y, bw5, 22, speedMultiplier == 4, "spd4");
  y += 30;

  // Physics & Visual toggles
  float bw2 = (cw - 6) / 2.0f;
  addButton(world.physicalCoastMode ? "Phys: 3Pi Coast" : "Phys: Ideal 0°", x0, y, bw2, 22, world.physicalCoastMode, "coast");
  addButton(world.measuredFrontIR ? "IR: Measured Front" : "IR: Reference", x0 + bw2 + 6, y, bw2, 22, world.measuredFrontIR, "ircurve");
  y += 26;
  addButton(world.unevenWheels ? "Slip: 6% R Slip" : "Slip: Even Wheels", x0, y, bw2, 22, world.unevenWheels, "slip");
  addButton(showBeams ? "IR Beams: ON" : "IR Beams: OFF", x0 + bw2 + 6, y, bw2, 22, showBeams, "beams");
  y += 26;
  addButton(enableRightWallSteer ? "R-Wall Steer: ON" : "R-Wall Steer: OFF", x0, y, bw2, 22, enableRightWallSteer, "wallsteer");
  addButton(showOdometryGhost ? "Odom Ghost: ON" : "Odom Ghost: OFF", x0 + bw2 + 6, y, bw2, 22, showOdometryGhost, "ghost");
  y += 28;

  // Bench commands
  textAlign(LEFT, TOP);
  fill(80, 94, 88);
  textSize(11);
  text("Bench commands (auto-calibrates C before S/T/L/P):", x0, y);
  y += 15;
  addButton("C", x0, y, bw5, 22, false, "cmdC");
  addButton("S", x0 + bw5 + 6, y, bw5, 22, false, "cmdS");
  addButton("T 90R", x0 + 2 * (bw5 + 6), y, bw5, 22, false, "cmdT");
  addButton("L 90L", x0 + 3 * (bw5 + 6), y, bw5, 22, false, "cmdL");
  addButton("P Piv", x0 + 4 * (bw5 + 6), y, bw5, 22, false, "cmdP");
  y += 28;

  // Telemetry values
  textAlign(LEFT, TOP);
  stroke(224, 230, 226);
  line(x0, y, x0 + cw, y);
  y += 8;
  noStroke();
  fill(35, 48, 44);
  textSize(11.5f);
  text("Time: " + nf(world.clockMs / 1000.0f, 0, 2) + " s    PWM L/R: " +
       robot.getLeftMotorPWM() + " / " + robot.getRightMotorPWM(), x0, y);
  y += 17;
  text("Ticks L/R: " + world.leftTicks() + " / " + world.rightTicks() +
       "    Min clr: " + nf(world.minClearanceMm, 0, 1) + " mm", x0, y);
  y += 17;

  float trueDeg = degrees(world.theta);
  OdometryModel_c.Pose op = controller.odometry().pose;
  float h0 = radians(startHeadingDeg);
  float ox = startX + cos(h0) * op.x - sin(h0) * op.y;
  float oy = startY + sin(h0) * op.x + cos(h0) * op.y;
  float oa = startHeadingDeg + degrees(op.theta);
  text("True (x,y,θ):  " + nf(world.x, 0, 1) + ", " + nf(world.y, 0, 1) + ", " + nf(trueDeg, 0, 1) + "°", x0, y);
  y += 16;
  text("Odom (x,y,θ):  " + nf(ox, 0, 1) + ", " + nf(oy, 0, 1) + ", " + nf(oa, 0, 1) + "°", x0, y);
  y += 16;
  fill(85, 100, 94);
  textSize(10.5f);
  text("Params: sep=" + nf(MS_WHEEL_SEPARATION_MM, 0, 2) + "mm  stopEarly=" + nf(ES_STOP_EARLY_DEG, 0, 1) + "°  loop=" + MS_CONTROL_MS + "ms", x0, y);
  y += 20;

  // IR bars
  drawIRBar("Back-Left", topIR.reading.back_left, color(120, 102, 168), x0, y, cw); y += 22;
  drawIRBar("Front",     topIR.reading.front,     color(57, 135, 162),  x0, y, cw); y += 22;
  drawIRBar("Back-Right",topIR.reading.back_right,color(181, 103, 54),  x0, y, cw); y += 28;

  // Phase log
  textAlign(LEFT, TOP);
  stroke(224, 230, 226);
  line(x0, y, x0 + cw, y);
  y += 7;
  noStroke();
  fill(80, 94, 88);
  textSize(11);
  text("Phase transitions:", x0, y);
  y += 15;
  fill(45, 58, 52);
  textSize(10.5f);
  for (int i = 0; i < phaseLog.size() && y < height - 16; i++) {
    text(phaseLog.get(i), x0, y, cw, 16);
    y += 16;
  }

  popStyle();
}

void drawIRBar(String name, int val, color c, float x, float y, float w) {
  fill(45, 58, 52);
  textAlign(LEFT, CENTER);
  textSize(11);
  text(name, x, y + 8);
  float barX = x + 72;
  float barW = w - 116;
  noStroke();
  fill(232, 236, 232);
  rect(barX, y + 3, barW, 10, 4);
  float frac = constrain((4095.0f - val) / 4095.0f, 0.0f, 1.0f);
  fill(c);
  rect(barX, y + 3, barW * frac, 10, 4);
  fill(35, 48, 44);
  textAlign(RIGHT, CENTER);
  text(str(val), x + w, y + 8);
}

void addButton(String label, float x, float y, float w, float h, boolean active, String action) {
  buttons.add(new UIButton(label, x, y, w, h, active, action));
  stroke(active ? color(30, 120, 96) : color(194, 204, 198));
  strokeWeight(1);
  fill(active ? color(222, 240, 230) : color(246, 248, 246));
  rect(x, y, w, h, 5);
  fill(active ? color(14, 80, 62) : color(40, 52, 46));
  textAlign(CENTER, CENTER);
  textSize(11);
  text(label, x + w / 2.0f, y + h / 2.0f);
  textAlign(LEFT, TOP);
}

String statusLabel() {
  switch (simStatus) {
    case STATUS_READY: return "READY";
    case STATUS_RUNNING: return "RUNNING";
    case STATUS_PAUSED: return "PAUSED";
    case STATUS_ESCAPED: return "ESCAPED";
    case STATUS_CONTACT: return "CONTACT";
    case STATUS_STOPPED: return "STOPPED";
    case STATUS_COMPLETE: return "COMPLETE";
    case STATUS_FAULT: return "FAULT";
    default: return "IDLE";
  }
}

void handleAction(String action) {
  if (action.equals("run")) {
    if (simStatus == STATUS_RUNNING) { simStatus = STATUS_PAUSED; simReason = "Paused."; }
    else if (simStatus == STATUS_PAUSED) { simStatus = STATUS_RUNNING; }
    else startCommand('E');
  } else if (action.equals("stop")) stopSimulation();
  else if (action.equals("reset")) { if (simStatus != STATUS_RUNNING && simStatus != STATUS_PAUSED) { placingMode = false; resetSimulation(); } }
  else if (action.equals("p0")) choosePreset(0);
  else if (action.equals("p1")) choosePreset(1);
  else if (action.equals("p2")) choosePreset(2);
  else if (action.equals("place")) {
    if (simStatus != STATUS_RUNNING && simStatus != STATUS_PAUSED) {
      placingMode = !placingMode;
      simReason = placingMode ? "Click inside the box (>= 50 mm from walls) to place the robot." : "Placement cancelled.";
    }
  } else if (action.equals("rot-")) { if (simStatus != STATUS_RUNNING && simStatus != STATUS_PAUSED) { startHeadingDeg = ((startHeadingDeg - 15 + 540) % 360) - 180; resetSimulation(); } }
  else if (action.equals("rot+")) { if (simStatus != STATUS_RUNNING && simStatus != STATUS_PAUSED) { startHeadingDeg = ((startHeadingDeg + 15 + 540) % 360) - 180; resetSimulation(); } }
  else if (action.equals("spd1")) speedMultiplier = 1;
  else if (action.equals("spd2")) speedMultiplier = 2;
  else if (action.equals("spd4")) speedMultiplier = 4;
  else if (action.equals("coast")) { world.physicalCoastMode = !world.physicalCoastMode; if (simStatus == STATUS_READY) resetSimulation(); }
  else if (action.equals("ircurve")) { world.measuredFrontIR = !world.measuredFrontIR; if (simStatus == STATUS_READY) resetSimulation(); }
  else if (action.equals("slip")) { world.unevenWheels = !world.unevenWheels; if (simStatus == STATUS_READY) resetSimulation(); }
  else if (action.equals("beams")) showBeams = !showBeams;
  else if (action.equals("wallsteer")) enableRightWallSteer = !enableRightWallSteer;
  else if (action.equals("ghost")) showOdometryGhost = !showOdometryGhost;
  else if (action.equals("cmdC")) startCommand('C');
  else if (action.equals("cmdS")) startCommand('S');
  else if (action.equals("cmdT")) startCommand('T');
  else if (action.equals("cmdL")) startCommand('L');
  else if (action.equals("cmdP")) startCommand('P');
}

void mousePressed() {
  for (int i = 0; i < buttons.size(); i++) {
    if (buttons.get(i).contains(mouseX, mouseY)) {
      handleAction(buttons.get(i).action);
      return;
    }
  }
  if (placingMode && mouseX < width - PANEL_W && simStatus != STATUS_RUNNING && simStatus != STATUS_PAUSED) {
    float mxMm = (mouseX - arenaOriginX) / arenaScale;
    float myMm = (arenaOriginY - mouseY) / arenaScale;
    if (world.validStart(mxMm, myMm)) {
      startX = round(mxMm);
      startY = round(myMm);
      presetIndex = 3;
      placingMode = false;
      resetSimulation();
    } else {
      simReason = "Too close to wall! Pick a point at least 50 mm inside the 30x40 cm box.";
    }
  }
}

void keyPressed() {
  if (key == ' ') handleAction("run");
  else if (key == 'e' || key == 'E') startCommand('E');
  else if (key == 'x' || key == 'X') stopSimulation();
  else if (key == 'r' || key == 'R') handleAction("reset");
  else if (key == '1') choosePreset(0);
  else if (key == '2') choosePreset(1);
  else if (key == '3') choosePreset(2);
  else if (key == '[') handleAction("rot-");
  else if (key == ']') handleAction("rot+");
  else if (key == 'b' || key == 'B') showBeams = !showBeams;
  else if (key == 'm' || key == 'M') handleAction("coast");
  else if (key == 'i' || key == 'I') handleAction("ircurve");
  else if (key == 'u' || key == 'U') handleAction("slip");
  else if (key == 'w' || key == 'W') handleAction("wallsteer");
  else if (key == 'g' || key == 'G') showOdometryGhost = !showOdometryGhost;
  else if (key == 'c' || key == 'C') startCommand('C');
  else if (key == 's' || key == 'S') startCommand('S');
  else if (key == 't' || key == 'T') startCommand('T');
  else if (key == 'l' || key == 'L') startCommand('L');
  else if (key == 'p' || key == 'P') startCommand('P');
}
