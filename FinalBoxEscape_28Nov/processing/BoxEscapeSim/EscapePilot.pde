/**
 * Exact port of firmware/BoxEscape/EscapePilot.h & EscapePilot.cpp.
 */
class EscapePilot {
  final float RAD = 0.01745329252f;
  final float HALF_PI_RAD = 90.0f * RAD;
  final float TWO_PI_RAD = 360.0f * RAD;

  final int STAGE_IDLE = 0;
  final int STAGE_SEEK = 1;
  final int STAGE_TURN_LEFT = 2;
  final int STAGE_SETTLE_LEFT = 3;
  final int STAGE_ACQUIRE = 4;
  final int STAGE_FOLLOW = 5;
  final int STAGE_CENTRE = 6;
  final int STAGE_TURN_RIGHT = 7;
  final int STAGE_SETTLE_RIGHT = 8;
  final int STAGE_CROSS = 9;
  final int STAGE_CANDIDATE = 10;
  final int STAGE_FAULT = 11;

  final String[] STAGE_NAMES = {
    "IDLE", "SEEK", "TURN_LEFT", "SETTLE_LEFT", "ACQUIRE",
    "FOLLOW", "CENTRE", "TURN_RIGHT", "SETTLE_RIGHT", "CROSS", "CANDIDATE", "FAULT"
  };

  private int state = STAGE_IDLE;
  private int lp = 0, rp = 0;
  private String message = "Idle.";
  private long stateAt = 0, previousAt = 0, movingAt = 0, wallAt = 0, gapAt = 0;
  private float prevX = 0, prevY = 0, path = 0, statePath = 0, wallPath = 0, gapPath = 0;
  private float anchorX = 0, anchorY = 0, anchorTheta = 0, heading = 0, turnStart = 0, turnTarget = 0;
  private float edgeX = 0, edgeY = 0, edgeHeading = 0;
  private boolean wallSeen = false, wallArmed = false, edgeSeen = false, gapSeen = false;

  int left() { return lp; }
  int right() { return rp; }
  boolean done() { return state == STAGE_CANDIDATE; }
  boolean failed() { return state == STAGE_FAULT; }
  String stateName() { return STAGE_NAMES[state]; }
  String reason() { return message; }

  private float clip(float v, float lo, float hi) {
    return v < lo ? lo : (v > hi ? hi : v);
  }

  private float forwardFrom(float x, float y, float ox, float oy, float theta) {
    return (x - ox) * cos(theta) + (y - oy) * sin(theta);
  }

  void stop() {
    state = STAGE_IDLE;
    lp = rp = 0;
    message = "Stopped.";
  }

  private void fail(String why) {
    state = STAGE_FAULT;
    lp = rp = 0;
    message = why;
  }

  private void enter(int next, long now, float x, float y, float theta) {
    state = next;
    stateAt = movingAt = now;
    statePath = path;
    anchorX = x;
    anchorY = y;
    anchorTheta = theta;
    lp = rp = 0;
  }

  private void restartSearch(long now, float x, float y, float theta, String why) {
    wallSeen = wallArmed = edgeSeen = gapSeen = false;
    path = wallPath = gapPath = 0.0f;
    heading = theta;
    enter(STAGE_SEEK, now, x, y, theta);
    message = why;
  }

  void begin(long now, float x, float y, float theta) {
    stop();
    if (!Float.isFinite(x) || !Float.isFinite(y) || !Float.isFinite(theta)) {
      fail("Invalid odometry.");
      return;
    }
    if (!(ES_RIGHT_TARGET_RAW <= ES_RIGHT_WALL_RAW && ES_RIGHT_WALL_RAW < ES_RIGHT_EDGE_RAW &&
          ES_RIGHT_EDGE_RAW < ES_RIGHT_OPEN_RAW && ES_RIGHT_OPEN_RAW <= 4095 &&
          ES_FRONT_TURN_RAW < ES_EXIT_FRONT_CLEAR_RAW &&
          ES_EXIT_FRONT_CLEAR_RAW <= 4095)) {
      fail("Invalid IR threshold order.");
      return;
    }
    float halfSlack = (ES_OPENING_WIDTH_MM - ES_BODY_WIDTH_MM) / 2.0f;
    if (halfSlack <= ES_SIDE_MARGIN_MM || ES_EDGE_TO_AXLE_OFFSET_MM < 0.0f ||
        ES_OPENING_WIDTH_MM / 2.0f - ES_EDGE_TO_AXLE_OFFSET_MM < ES_GAP_CONFIRM_MM ||
        ES_CENTRE_TOL_MM >= halfSlack - ES_SIDE_MARGIN_MM) {
      fail("Check measured body, opening and edge offset.");
      return;
    }
    path = 0.0f;
    previousAt = now;
    prevX = x;
    prevY = y;
    heading = theta;
    wallSeen = wallArmed = edgeSeen = gapSeen = false;
    enter(STAGE_SEEK, now, x, y, theta);
    message = "Seek a wall.";
  }

  private void startTurn(boolean toExit, long now, float x, float y, float theta) {
    turnStart = theta;
    turnTarget = theta + (toExit ? -HALF_PI_RAD : HALF_PI_RAD);
    enter(toExit ? STAGE_TURN_RIGHT : STAGE_TURN_LEFT, now, x, y, theta);
    wallArmed = wallSeen = edgeSeen = gapSeen = false;
    message = toExit ? "Turn into candidate opening." : "Turn left to keep wall on right.";
  }

  private void steer(float theta, float target) {
    float err = (float) Math.IEEEremainder(target - theta, TWO_PI_RAD);
    int trim = cppLroundf(clip(42.0f * err, -ES_MAX_STEER_PWM, ES_MAX_STEER_PWM));
    lp = ES_DRIVE_PWM - trim;
    rp = ES_DRIVE_PWM + trim;
  }

  void update(long now, float x, float y, float theta,
              int backLeft, int front, int backRight) {
    if (state == STAGE_IDLE || state == STAGE_FAULT || state == STAGE_CANDIDATE) return;
    if (!Float.isFinite(x) || !Float.isFinite(y) || !Float.isFinite(theta)) {
      fail("Invalid odometry.");
      return;
    }
    if (now - previousAt > ES_OBSERVATION_LIMIT_MS) {
      fail("Observation timeout.");
      return;
    }
    path += (float) Math.hypot(x - prevX, y - prevY);
    prevX = x;
    prevY = y;
    previousAt = now;

    if (state == STAGE_TURN_LEFT || state == STAGE_TURN_RIGHT) {
      float sign = state == STAGE_TURN_LEFT ? 1.0f : -1.0f;
      float travel = sign * (theta - turnStart);
      if (travel < -10.0f * RAD) {
        fail("Turn moved in the wrong direction.");
        return;
      }
      if (now - stateAt > ES_TURN_LIMIT_MS) {
        fail("Turn timeout.");
        return;
      }
      if (travel >= HALF_PI_RAD - ES_STOP_EARLY_DEG * RAD) {
        enter(state == STAGE_TURN_LEFT ? STAGE_SETTLE_LEFT : STAGE_SETTLE_RIGHT, now, x, y, theta);
        return;
      }
      lp = sign > 0 ? -ES_TURN_PWM : ES_TURN_PWM;
      rp = -lp;
      return;
    }

    if (state == STAGE_SETTLE_LEFT || state == STAGE_SETTLE_RIGHT) {
      lp = rp = 0;
      if (now - stateAt < ES_SETTLE_MS) return;
      if (abs(turnTarget - theta) > ES_SETTLED_TOL_DEG * RAD) {
        restartSearch(now, x, y, theta, "Retry: turn settled outside tolerance; seek a wall.");
        return;
      }
      boolean exiting = (state == STAGE_SETTLE_RIGHT);
      heading = theta;
      if (exiting && front < ES_EXIT_FRONT_CLEAR_RAW) {
        restartSearch(now, x, y, theta, "Retry: no clearance after exit turn; seek a wall.");
        return;
      }
      enter(exiting ? STAGE_CROSS : STAGE_ACQUIRE, now, x, y, theta);
      message = exiting ? "Crossing candidate opening." : "Reacquiring right wall.";
      return;
    }

    if (lp > 0 && rp > 0 && now - movingAt >= ES_STALL_MS) {
      if (forwardFrom(x, y, anchorX, anchorY, anchorTheta) < 2.0f) {
        fail("No forward progress.");
        return;
      }
      anchorX = x;
      anchorY = y;
      anchorTheta = theta;
      movingAt = now;
    }

    if (state == STAGE_CROSS) {
      if (front <= ES_FRONT_TURN_RAW) {
        restartSearch(now, x, y, theta, "Retry: obstacle in exit path; seek a wall.");
        return;
      }
      if (forwardFrom(x, y, edgeX, edgeY, heading) >= ES_EXIT_TRAVEL_MM) {
        enter(STAGE_CANDIDATE, now, x, y, theta);
        message = "Candidate exit; verify whole body outside.";
        return;
      }
      steer(theta, heading);
      return;
    }

    if (state == STAGE_CENTRE) {
      if (front <= ES_FRONT_TURN_RAW) {
        restartSearch(now, x, y, theta, "Retry: obstructed while centring; seek a wall.");
        return;
      }
      if (backRight < ES_RIGHT_OPEN_RAW) {
        restartSearch(now, x, y, theta, "Retry: candidate gap did not stay open; seek a wall.");
        return;
      }
      float d = forwardFrom(x, y, edgeX, edgeY, edgeHeading);
      float centre = ES_OPENING_WIDTH_MM / 2.0f - ES_EDGE_TO_AXLE_OFFSET_MM;
      float slack = (ES_OPENING_WIDTH_MM - ES_BODY_WIDTH_MM) / 2.0f - ES_SIDE_MARGIN_MM;
      if (d > centre + slack) {
        restartSearch(now, x, y, theta, "Retry: overshot opening centre; seek a wall.");
        return;
      }
      if (d >= centre - ES_CENTRE_TOL_MM) {
        edgeX = x;
        edgeY = y;
        startTurn(true, now, x, y, theta);
        return;
      }
      steer(theta, edgeHeading);
      return;
    }

    if (front <= ES_FRONT_TURN_RAW) {
      startTurn(false, now, x, y, theta);
      return;
    }

    if (state == STAGE_SEEK || state == STAGE_ACQUIRE) {
      if (backRight <= ES_RIGHT_WALL_RAW) {
        if (!wallSeen) {
          wallSeen = true;
          wallAt = now;
          wallPath = path;
        }
        if (now - wallAt >= ES_WALL_CONFIRM_MS) {
          heading = theta;
          wallArmed = false;
          enter(STAGE_FOLLOW, now, x, y, theta);
          message = "Following right wall.";
          return;
        }
      } else {
        wallSeen = false;
      }
      if (state == STAGE_ACQUIRE && path - statePath >= ES_ACQUIRE_LIMIT_MM) {
        restartSearch(now, x, y, theta, "Retry: right wall not reacquired; seek a wall.");
        return;
      }
      steer(theta, heading);
      return;
    }

    if (state == STAGE_FOLLOW) {
      if (backRight <= ES_RIGHT_WALL_RAW) {
        if (!wallSeen) {
          wallSeen = true;
          wallAt = now;
          wallPath = path;
        }
        if (now - wallAt >= ES_WALL_CONFIRM_MS && path - wallPath >= ES_WALL_TRACK_MM) {
          wallArmed = true;
        }
      } else {
        wallSeen = false;
      }
      if (backRight >= ES_RIGHT_EDGE_RAW && wallArmed) {
        if (!edgeSeen) {
          edgeSeen = true;
          edgeX = x;
          edgeY = y;
          edgeHeading = theta;
        }
        float d = forwardFrom(x, y, edgeX, edgeY, edgeHeading);
        float centre = ES_OPENING_WIDTH_MM / 2.0f - ES_EDGE_TO_AXLE_OFFSET_MM;
        float slack = (ES_OPENING_WIDTH_MM - ES_BODY_WIDTH_MM) / 2.0f - ES_SIDE_MARGIN_MM;
        if (d > centre + slack) {
          restartSearch(now, x, y, theta, "Retry: opening not confirmed before centring window ended; seek a wall.");
          return;
        }
        if (backRight >= ES_RIGHT_OPEN_RAW) {
          if (!gapSeen) {
            gapSeen = true;
            gapAt = now;
            gapPath = d;
          }
          if (now - gapAt >= ES_GAP_CONFIRM_MS && d - gapPath >= ES_GAP_CONFIRM_MM) {
            enter(STAGE_CENTRE, now, x, y, theta);
            message = "Centring on candidate opening.";
            return;
          }
        } else {
          gapSeen = false;
        }
        steer(theta, edgeHeading);
        return;
      }
      if (backRight >= ES_RIGHT_OPEN_RAW && !wallArmed) {
        restartSearch(now, x, y, theta, "Retry: right wall lost before tracking was established; seek a wall.");
        return;
      }
      edgeSeen = gapSeen = false;
      float shift = enableRightWallSteer ? clip((ES_RIGHT_TARGET_RAW - (float) backRight) * 0.00016f, -0.18f, 0.18f) : 0.0f;
      steer(theta, heading + shift);
    }
  }
}
