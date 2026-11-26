#pragma once
#include <stdint.h>

// Provisional values for the SINGLE rectangular cardboard box, in mm/raw ADC.
// 4095 = weak/no return; these are decision thresholds, not a distance model.
namespace EscapeSettings {
constexpr int DRIVE_PWM = 55, TURN_PWM = 50, MAX_STEER_PWM = 8;
constexpr uint16_t FRONT_TURN_RAW = 2200;
constexpr uint16_t RIGHT_TARGET_RAW = 3000, RIGHT_WALL_RAW = 3350;
// Detect a rising edge while the axle can still centre on a narrow opening.
// Neither threshold proves open space. FULL scale can arrive too late.
constexpr uint16_t RIGHT_EDGE_RAW = 3450, RIGHT_OPEN_RAW = 3650;
constexpr uint16_t EXIT_FRONT_CLEAR_RAW = 3950; // minimum front reading after turning
constexpr uint32_t WALL_CONFIRM_MS = 150, GAP_CONFIRM_MS = 100;
constexpr float WALL_TRACK_MM = 30.0f, GAP_CONFIRM_MM = 5.0f;

// Measure all four on YOUR robot/box. Positive OFFSET means the axle has
// already passed the near edge when the rear-right sensor first crosses RIGHT_EDGE_RAW.
constexpr float BODY_WIDTH_MM = 100.0f, OPENING_WIDTH_MM = 150.0f;
constexpr float SIDE_MARGIN_MM = 10.0f, EDGE_TO_AXLE_OFFSET_MM = 60.0f;
constexpr float EXIT_TRAVEL_MM = 200.0f; // axle travel after turning toward opening
constexpr float ACQUIRE_LIMIT_MM = 90.0f; // Switch to a fresh wall search if necessary.
constexpr uint32_t TURN_LIMIT_MS = 6000, SETTLE_MS = 250;
constexpr uint32_t OBSERVATION_LIMIT_MS = 300, STALL_MS = 1800;
constexpr float STOP_EARLY_DEG = 4.0f;  // measured turn coasting (3.2-5.3 deg at PWM 50)
constexpr float SETTLED_TOL_DEG = 10.0f, CENTRE_TOL_MM = 3.0f;
}
