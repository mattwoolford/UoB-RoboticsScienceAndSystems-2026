/**
 * Physical 30 x 40 cm (400 x 300 mm) box world, TopIR raycast model,
 * physical wheel/encoder dynamics, and Robot_c / TopIR_c hardware bindings.
 */
class TopIRReading_t {
  long start_us = 0;
  long scan_us = 0;
  int back_left = 4095;
  int front = 4095;
  int back_right = 4095;
}

class IRBeam {
  int sensorIdx; // 0=back_left, 1=front, 2=back_right
  float x1, y1, x2, y2;
  boolean central;
  boolean hit;
}

class BoxWorld {
  // 400 x 300 mm box with centered 150 mm opening [125, 275] on y = 0 longer side
  final float[][] WALLS = {
    { 0.0f, 0.0f, OPENING_LEFT_MM, 0.0f },
    { OPENING_RIGHT_MM, 0.0f, ARENA_W_MM, 0.0f },
    { ARENA_W_MM, 0.0f, ARENA_W_MM, ARENA_H_MM },
    { ARENA_W_MM, ARENA_H_MM, 0.0f, ARENA_H_MM },
    { 0.0f, ARENA_H_MM, 0.0f, 0.0f }
  };

  // Sensor curves from simulator/engine/world.js
  final float[][] REFERENCE_CURVE = {
    {5, 260}, {10, 390}, {50, 3500}, {100, 4085}, {120, 4095}
  };
  final float[][] MEASURED_CURVE = {
    {5, 260}, {10, 390}, {50, 3022}, {100, 3902}, {120, 4041}, {130, 4095}
  };

  final float ticksPerMm = MS_COUNTS_PER_REV / (TWO_PI * 16.0f);

  float x = 85.0f, y = 80.0f, theta = 0.0f;
  float startX = 85.0f, startY = 80.0f, startHeadingDeg = 0.0f;
  float leftDistMm = 0.0f, rightDistMm = 0.0f;
  float leftVelMmPerS = 0.0f, rightVelMmPerS = 0.0f;
  float minClearanceMm = 30.0f;
  boolean contact = false;
  boolean crossed = false;
  long clockMs = 0;

  // Physics options
  boolean physicalCoastMode = true; // true: physical ~188 deg/s & ~4 deg coast; false: world.js ideal instant
  boolean measuredFrontIR = false;
  boolean unevenWheels = false;     // 6% right-wheel slip

  int lastBackLeft = 4095, lastFront = 4095, lastBackRight = 4095;
  ArrayList<IRBeam> beams = new ArrayList<IRBeam>();
  ArrayList<PVector> trail = new ArrayList<PVector>();

  boolean validStart(float sx, float sy) {
    return Float.isFinite(sx) && Float.isFinite(sy) &&
           sx >= ROBOT_RADIUS_MM && sx <= ARENA_W_MM - ROBOT_RADIUS_MM &&
           sy >= ROBOT_RADIUS_MM && sy <= ARENA_H_MM - ROBOT_RADIUS_MM &&
           clearance(sx, sy) >= -1e-6f;
  }

  void reset(float sx, float sy, float headingDeg) {
    if (!validStart(sx, sy)) {
      sx = ARENA_W_MM / 2.0f;
      sy = ARENA_H_MM / 2.0f;
    }
    startX = sx;
    startY = sy;
    startHeadingDeg = headingDeg;
    x = sx;
    y = sy;
    theta = radians(headingDeg);
    leftDistMm = 0.0f;
    rightDistMm = 0.0f;
    leftVelMmPerS = 0.0f;
    rightVelMmPerS = 0.0f;
    minClearanceMm = clearance(x, y);
    contact = false;
    crossed = false;
    clockMs = 0;
    trail.clear();
    trail.add(new PVector(x, y));
    sense(true);
  }

  float clearance(float px, float py) {
    float d = 1e9f;
    for (int i = 0; i < WALLS.length; i++) {
      float ax = WALLS[i][0], ay = WALLS[i][1];
      float bx = WALLS[i][2], by = WALLS[i][3];
      float vx = bx - ax, vy = by - ay;
      float u = constrain(((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy), 0.0f, 1.0f);
      float dist = dist(px, py, ax + u * vx, ay + u * vy);
      if (dist < d) d = dist;
    }
    return d - ROBOT_RADIUS_MM;
  }

  boolean outside() {
    return crossed && y < -ROBOT_RADIUS_MM && !contact;
  }

  int leftTicks() { return round(leftDistMm * ticksPerMm); }
  int rightTicks() { return round(rightDistMm * ticksPerMm); }

  float ray(float ox, float oy, float angle) {
    float dx = cos(angle), dy = sin(angle);
    float near = 1e9f;
    for (int i = 0; i < WALLS.length; i++) {
      float ax = WALLS[i][0], ay = WALLS[i][1];
      float bx = WALLS[i][2], by = WALLS[i][3];
      float vx = bx - ax, vy = by - ay;
      float den = dx * vy - dy * vx;
      if (abs(den) < 1e-7f) continue;
      float qx = ax - ox, qy = ay - oy;
      float t = (qx * vy - qy * vx) / den;
      float u = (qx * dy - qy * dx) / den;
      if (t >= 0.0f && u >= 0.0f && u <= 1.0f && t < near) {
        near = t;
      }
    }
    return near;
  }

  float rawFromCurve(float d, float[][] curve) {
    if (d <= curve[0][0]) return curve[0][1];
    for (int i = 1; i < curve.length; i++) {
      float x1 = curve[i][0], y1 = curve[i][1];
      float x0 = curve[i - 1][0], y0 = curve[i - 1][1];
      if (d <= x1) return y0 + (d - x0) * (y1 - y0) / (x1 - x0);
    }
    return 4095.0f;
  }

  void sense(boolean updateBeams) {
    if (updateBeams) beams.clear();
    int[] sides = { 1, 0, -1 }; // back_left (+135), front (0), back_right (-135)
    for (int sIdx = 0; sIdx < 3; sIdx++) {
      int side = sides[sIdx];
      float a = theta + radians(135.0f * side);
      float ox = x + ROBOT_RADIUS_MM * cos(a);
      float oy = y + ROBOT_RADIUS_MM * sin(a);
      float[][] curve = (side == 0 && measuredFrontIR) ? MEASURED_CURVE : REFERENCE_CURVE;
      float maxRange = curve[curve.length - 1][0];
      float strength = 0.0f;
      float weights = 0.0f;

      for (int i = 0; i < 9; i++) {
        float fraction = i / 4.0f - 1.0f;
        float offset = radians(fraction * (side != 0 ? 25.0f : 15.0f));
        float w = 1.0f - abs(fraction) / 2.0f;
        float angle = a + offset;
        float d = ray(ox, oy, angle);
        float projected = d * cos(offset);
        strength += w * (4095.0f - rawFromCurve(projected, curve));
        weights += w;
        if (updateBeams) {
          IRBeam b = new IRBeam();
          b.sensorIdx = sIdx;
          b.x1 = ox;
          b.y1 = oy;
          b.hit = projected < maxRange;
          float range = min(d, maxRange / cos(offset));
          b.x2 = ox + range * cos(angle);
          b.y2 = oy + range * sin(angle);
          b.central = (i == 4);
          beams.add(b);
        }
      }
      float scale = (side != 0) ? 2.437f : 1.0f;
      int val = round(constrain(4095.0f - (strength / weights) * scale, 0.0f, 4095.0f));
      if (sIdx == 0) lastBackLeft = val;
      else if (sIdx == 1) lastFront = val;
      else lastBackRight = val;
    }
  }

  void step(int leftPWM, int rightPWM, int dtMs) {
    // Substep at 1 ms so first-order coasting & collision are smooth
    int substeps = max(1, dtMs);
    float dt = (dtMs / (float) substeps) / 1000.0f;
    float trackMm = MS_WHEEL_SEPARATION_MM;
    float gainMmPerSPerPwm = physicalCoastMode ? 2.80f : 1.25f;
    float tauS = physicalCoastMode ? 0.021f : 0.0f; // ~4.0 deg coast at ~188 deg/s

    for (int k = 0; k < substeps; k++) {
      clockMs += (dtMs / substeps);
      if (contact) continue;

      float targetL = abs(leftPWM) >= 8 ? leftPWM * gainMmPerSPerPwm : 0.0f;
      float targetR = abs(rightPWM) >= 12 ? rightPWM * gainMmPerSPerPwm : 0.0f;

      if (tauS > 0.0f) {
        float alpha = 1.0f - exp(-dt / tauS);
        leftVelMmPerS += (targetL - leftVelMmPerS) * alpha;
        rightVelMmPerS += (targetR - rightVelMmPerS) * alpha;
      } else {
        leftVelMmPerS = targetL;
        rightVelMmPerS = targetR;
      }

      float ll = leftVelMmPerS * dt;
      float rr = rightVelMmPerS * dt;
      leftDistMm += ll;
      rightDistMm += rr;

      float rg = rr * (unevenWheels ? 0.94f : 1.0f);
      float d = (ll + rg) / 2.0f;
      float da = (rg - ll) / trackMm;
      float sinc = abs(da) > 1e-6f ? sin(da / 2.0f) / (da / 2.0f) : 1.0f;
      float nx = x + d * sinc * cos(theta + da / 2.0f);
      float ny = y + d * sinc * sin(theta + da / 2.0f);

      if (y >= 0.0f && ny < 0.0f) {
        float tx = x + (nx - x) * y / (y - ny);
        if (tx >= OPENING_LEFT_MM && tx <= OPENING_RIGHT_MM) {
          crossed = true;
        }
      }

      x = nx;
      y = ny;
      theta += da;

      float c = clearance(x, y);
      if (c < minClearanceMm) minClearanceMm = c;
      if (c < -1e-5f) contact = true;
    }

    if (trail.size() == 0) {
      trail.add(new PVector(x, y));
    } else {
      PVector last = trail.get(trail.size() - 1);
      if (dist(last.x, last.y, x, y) >= 1.5f) {
        if (trail.size() < 4000) trail.add(new PVector(x, y));
      }
    }
    sense(true);
  }
}

class TopIR_c {
  TopIRReading_t reading = new TopIRReading_t();
  private BoxWorld world;

  TopIR_c(BoxWorld w) { world = w; }
  void initialise() { }
  void read() {
    world.sense(false);
    reading.start_us = world.clockMs * 1000L;
    reading.back_left = world.lastBackLeft;
    reading.front = world.lastFront;
    reading.back_right = world.lastBackRight;
    reading.scan_us = 180;
  }
}

class Robot_c {
  private BoxWorld world;
  private int encLeft = 0, encRight = 0;
  private int pwmLeft = 0, pwmRight = 0;
  private boolean buttonFlag = false;

  Robot_c(BoxWorld w) { world = w; }
  void initialise() { }
  long getMillis() { return world.clockMs; }
  boolean isButtonPressed() {
    boolean b = buttonFlag;
    buttonFlag = false;
    return b;
  }
  void pressStopButton() { buttonFlag = true; }

  boolean getEncoders() {
    encLeft = world.leftTicks();
    encRight = world.rightTicks();
    return true;
  }
  int getLeftEncoderCount() { return encLeft; }
  int getRightEncoderCount() { return encRight; }
  int getLeftMotorPWM() { return pwmLeft; }
  int getRightMotorPWM() { return pwmRight; }

  boolean setMotorPWM(float l, float r) {
    pwmLeft = (int) l;
    pwmRight = (int) r;
    return true;
  }
}
