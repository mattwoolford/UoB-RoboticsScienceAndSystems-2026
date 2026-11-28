/**
 * Firmware settings mirrored verbatim from:
 *   - firmware/BoxEscape/MotionSettings.h
 *   - firmware/BoxEscape/EscapeSettings.h
 * Plus arena geometry for the 30 x 40 cm box with a 15 cm opening.
 */

// --- Arena geometry (30 x 40 cm = 300 x 400 mm, 150 mm opening on a 400 mm side) ---
final float ARENA_W_MM = 400.0f;
final float ARENA_H_MM = 300.0f;
final float OPENING_LEFT_MM = 125.0f;   // (400 - 150) / 2
final float OPENING_RIGHT_MM = 275.0f;  // 125 + 150
final float ROBOT_RADIUS_MM = 50.0f;

// --- MotionSettings.h ---
final boolean BOX_ESCAPE_ENABLE = true;

final float MS_LEFT_RADIUS_MM = 16.0f;
final float MS_RIGHT_RADIUS_MM = 16.0f;
final float MS_WHEEL_SEPARATION_MM = 85.40f;
final float MS_COUNTS_PER_REV = 358.3f;

final long MS_CONTROL_MS = 10;
final long MS_IR_MS = 50;
final long MS_MAX_CONTROL_GAP_MS = 300;
final long MS_NO_TICKS_MS = 1000;
final int MS_PWM_CAP = 135;
final int MS_STRAIGHT_PWM = 100;
final int MS_START_MARGIN_PWM = 5;
final float MS_STRAIGHT_MAX_MM = 100.0f;
final long MS_STRAIGHT_MAX_MS = 3000;
final int MS_STRAIGHT_NEAR_FRONT = 3000;
final boolean MS_STRAIGHT_CORRECTION = false;
final boolean MS_STRAIGHT_PATH_RECOVERY = false;
final int MS_TURN_PWM = 50;
final int MS_TURN_TOO_CLOSE_RAW = 700;
final float MS_WRONG_TURN_DEG = 10.0f;
final float MS_TURN_LEAD_DEG = 0.0f;
final long MS_TURN_LIMIT_MS = 10000;
final long MS_SETTLE_MS = 250;
final long MS_READ_PAUSE_MS = 5000;

// --- EscapeSettings.h ---
final int ES_DRIVE_PWM = 55;
final int ES_TURN_PWM = 50;
final int ES_MAX_STEER_PWM = 8;
final int ES_FRONT_TURN_RAW = 2200;
final int ES_RIGHT_TARGET_RAW = 3000;
final int ES_RIGHT_WALL_RAW = 3350;
final int ES_RIGHT_EDGE_RAW = 3450;
final int ES_RIGHT_OPEN_RAW = 3650;
final int ES_EXIT_FRONT_CLEAR_RAW = 3950;
final long ES_WALL_CONFIRM_MS = 150;
final long ES_GAP_CONFIRM_MS = 100;
final float ES_WALL_TRACK_MM = 30.0f;
final float ES_GAP_CONFIRM_MM = 5.0f;

final float ES_BODY_WIDTH_MM = 100.0f;
final float ES_OPENING_WIDTH_MM = 150.0f;
final float ES_SIDE_MARGIN_MM = 10.0f;
final float ES_EDGE_TO_AXLE_OFFSET_MM = 60.0f;
final float ES_EXIT_TRAVEL_MM = 200.0f;
final float ES_ACQUIRE_LIMIT_MM = 90.0f;
final long ES_TURN_LIMIT_MS = 6000;
final long ES_SETTLE_MS = 250;
final long ES_OBSERVATION_LIMIT_MS = 300;
final long ES_STALL_MS = 1800;
final float ES_STOP_EARLY_DEG = 4.0f;
final float ES_SETTLED_TOL_DEG = 10.0f;
final float ES_CENTRE_TOL_MM = 3.0f;
final boolean ES_RIGHT_WALL_DISTANCE_STEER = true;

// C++ lroundf equivalent (rounds half away from zero)
int cppLroundf(float v) {
  return v >= 0.0f ? (int)(v + 0.5f) : (int)(v - 0.5f);
}

// C++ roundf equivalent
float cppRoundf(float v) {
  return v >= 0.0f ? floor(v + 0.5f) : ceil(v - 0.5f);
}
