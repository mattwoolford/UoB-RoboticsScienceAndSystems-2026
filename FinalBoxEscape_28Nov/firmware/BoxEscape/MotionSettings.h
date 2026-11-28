#ifndef BOX_MOTION_SETTINGS_H
#define BOX_MOTION_SETTINGS_H

// Allow the baseline escape trial from idle. Set to 0 to lock out escape for bench work.
#ifndef BOX_ESCAPE_ENABLE
#define BOX_ESCAPE_ENABLE 1
#endif

namespace MotionSettings {
  // Paul’s nominal geometry; replace only with physical calibration results.
  constexpr float LEFT_RADIUS_MM = 16.0f, RIGHT_RADIUS_MM = 16.0f;
  constexpr float WHEEL_SEPARATION_MM = 85.40f, COUNTS_PER_REV = 358.3f;

  constexpr unsigned long CONTROL_MS = 10, IR_MS = 50;
  constexpr unsigned long MAX_CONTROL_GAP_MS = 300, NO_TICKS_MS = 1000;
  constexpr int PWM_CAP = 135;     // S permits up to 105 base + 30 trim.
  constexpr int STRAIGHT_PWM = 100, START_MARGIN_PWM = 5;
  constexpr float STRAIGHT_MAX_MM = 100.0f;
  constexpr unsigned long STRAIGHT_MAX_MS = 3000;
  constexpr int STRAIGHT_NEAR_FRONT = 3000; // provisional; verify in your enclosure.
  constexpr bool STRAIGHT_CORRECTION = false, STRAIGHT_PATH_RECOVERY = false;
  constexpr int TURN_PWM = 50;
  constexpr unsigned TURN_TOO_CLOSE_RAW = 700; // emergency near limit, any top IR during turn tests.
  constexpr float WRONG_TURN_DEG = 10.0f;      // wrong-way heading change since this quarter started.
  constexpr float TURN_LEAD_DEG = 0.0f; // measure coasting before increasing.
  constexpr unsigned long TURN_LIMIT_MS = 10000, SETTLE_MS = 250, READ_PAUSE_MS = 5000;
}
#endif
