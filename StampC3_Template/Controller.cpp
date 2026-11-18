#include "Controller.h"
#define DEFAULT_TURN_MODE Controller_c::MODE_PIVOT_TURN

#define STARTING_TRIAL_ID 1
#define CONDITION_LABEL "Uncalibrated_Point"

#define WHEEL_RADIUS_R_MM 16.0f
#define WHEEL_SEPARATION_B_MM 90.0f
#define FIXED_TURN_PWM        50.0f   // Constant turning speed (PWM = 50)
#define LEAD_COMPENSATION_DEG  0.0f   // Advance cutoff angle (set e.g. 3.2f to eliminate coast-down overshoot)
#define SETTLE_INTEGRATE_MS 250   // 250 ms coast-down integration
#define READING_PAUSE_MS 5000     // 5000 ms pause at each step for student to note True_Deg
#define STALL_TIMEOUT_MS 10000    // 10s stall protection timeout
#define RTC_MAGIC_KEY 0x5E4D544D // Magic key "SEMTM"

RTC_DATA_ATTR static uint32_t rtc_magic = 0;
RTC_DATA_ATTR static StepRecord_t rtc_step_records[4];
RTC_DATA_ATTR static int rtc_recorded_steps_count = 0;
RTC_DATA_ATTR static int rtc_trial_id = STARTING_TRIAL_ID;
RTC_DATA_ATTR static bool rtc_has_completed_run = false;
RTC_DATA_ATTR static int rtc_turn_mode_int = 0; // 0 = Point, 1 = Pivot

const unsigned long Controller_c::UPDATE_INTERVAL_MS;
const unsigned long Controller_c::TELEMETRY_INTERVAL_MS;

Controller_c::Controller_c()
  : update_timer(UPDATE_INTERVAL_MS),
    telemetry_timer(TELEMETRY_INTERVAL_MS) {
  reset();
}

void Controller_c::reset() {
  signal = 0;
  last_serial_stream_ms = 0;

  // Check if RTC memory is valid across power resets
  if (rtc_magic != RTC_MAGIC_KEY) {
    // Fresh battery boot: initialize RTC variables
    rtc_magic = RTC_MAGIC_KEY;
    rtc_has_completed_run = false;
    rtc_recorded_steps_count = 0;
    rtc_trial_id = STARTING_TRIAL_ID;
    rtc_turn_mode_int = (DEFAULT_TURN_MODE == MODE_PIVOT_TURN ? 1 : 0);
  }

  trial_id = rtc_trial_id;
  turn_mode = (rtc_turn_mode_int == 1 ? MODE_PIVOT_TURN : MODE_POINT_TURN);

  current_step = 1;
  current_target_rad = 0.0f;
  current_target_deg = 0.0f;

  state_timer_ms = 0;
  step_start_ms = 0;
  in_position_start_ms = 0;

  snap_left_ticks = 0;
  snap_right_ticks = 0;
  snap_odom_deg = 0.0f;

  // If a completed run is currently stored in RTC RAM (e.g. plugged in after trial),
  // immediately enter STATE_COMPLETE and begin streaming every 2 seconds!
  if (rtc_has_completed_run) {
    state = STATE_COMPLETE;
  } else {
    state = STATE_IDLE;
  }

  // Initialize odometry parameters
  odometry.setWheelSeparationMm(WHEEL_SEPARATION_B_MM);
  odometry.setLeftWheelRadiusMm(WHEEL_RADIUS_R_MM);
  odometry.setRightWheelRadiusMm(WHEEL_RADIUS_R_MM);
}

uint8_t Controller_c::getSignal() const {
  return signal;
}

void Controller_c::setSignal(uint8_t requested_signal) {
  if (requested_signal == 0) {
    signal = 0;
    state = STATE_IDLE;
    return;
  }
  signal = 1;
}

void Controller_c::setTurnMode(TurnMode_e mode) {
  turn_mode = mode;
  rtc_turn_mode_int = (mode == MODE_PIVOT_TURN ? 1 : 0);
}

void Controller_c::toggleTurnMode() {
  if (turn_mode == MODE_POINT_TURN) {
    setTurnMode(MODE_PIVOT_TURN);
    Serial.println(">>> Mode switched to: PIVOT TURN (Left +50, Right 0)");
  } else {
    setTurnMode(MODE_POINT_TURN);
    Serial.println(">>> Mode switched to: POINT TURN (Left +50, Right -50)");
  }
}

void Controller_c::setModeLED(Robot_c &robot) {
  if (state == STATE_COMPLETE) {
    robot.setLED(80, 0, 100, 50); // Purple = Trial Complete, outputting data
  } else if (turn_mode == MODE_POINT_TURN) {
    robot.setLED(80, 80, 80, 50); // White = Point Turn Mode
  } else {
    robot.setLED(90, 70, 0, 50);  // Amber = Pivot Turn Mode
  }
}

void Controller_c::printHelpMenu() {
  Serial.println("\n=======================================================");
  Serial.println("   SEMTM0043 ASSESSMENT 1: ODOMETRY TURNING ANGLE     ");
  Serial.println("=======================================================");
  Serial.printf("   Current Mode:      %s\n", (turn_mode == MODE_POINT_TURN ? "POINT TURN" : "PIVOT TURN"));
  Serial.printf("   Trial ID:          %d\n", trial_id);
  Serial.printf("   Condition Label:   %s\n", CONDITION_LABEL);
  Serial.printf("   Wheel Separation:  %.2f mm | Radius: %.2f mm\n", odometry.wheelSeparationMm, odometry.leftWheelRadiusMm);
  Serial.printf("   Turn Controller:   Fixed PWM = %.0f | Lead Comp = %.2f deg\n", FIXED_TURN_PWM, LEAD_COMPENSATION_DEG);
  Serial.printf("   Completed Run in RAM: %s\n", (rtc_has_completed_run ? "YES (Streaming every 2s)" : "NO"));
  Serial.println("-------------------------------------------------------");
  Serial.println("Serial Commands:");
  Serial.println("  [1] Select Point Turn Mode");
  Serial.println("  [2] Select Pivot Turn Mode");
  Serial.println("  [n] Arm Next Trial (clears RAM buffer, advances Trial ID)");
  Serial.println("  [s] Start 4-Step Run (or press physical StampC3 button)");
  Serial.println("  [r] Reset Trial ID to 1");
  Serial.println("  [p] Print stored RAM results immediately");
  Serial.println("  [?] Display this Menu");
  Serial.println("=======================================================\n");
}

void Controller_c::printStoredResults() {
  Serial.println("\n=======================================================");
  Serial.printf("   TRIAL %d RESULTS (%s) - STORED IN RAM\n",
                rtc_trial_id,
                (turn_mode == MODE_POINT_TURN ? "POINT TURN" : "PIVOT TURN"));
  Serial.println("=======================================================");
  Serial.println("CSV_DATA (Copy into Excel Sheet 1):");
  Serial.println("Trial_ID,Turn_Mode,Step,Target_Deg,Left_Ticks,Right_Ticks,Odom_Deg");
  for (int i = 0; i < 4; i++) {
    Serial.printf("%d,%s,%d,%.1f,%ld,%ld,%.2f\n",
                  rtc_step_records[i].trial_id,
                  rtc_step_records[i].turn_mode,
                  rtc_step_records[i].step,
                  rtc_step_records[i].target_deg,
                  (long)rtc_step_records[i].left_ticks,
                  (long)rtc_step_records[i].right_ticks,
                  rtc_step_records[i].odom_deg);
  }
  Serial.println("-------------------------------------------------------");
  Serial.printf(">>> Results output every 2s. Press StampC3 button or send 'n' to arm Trial %d! <<<\n", rtc_trial_id + 1);
  Serial.println("=======================================================");
}

void Controller_c::armNextTrial(Robot_c &robot) {
  rtc_trial_id++;
  trial_id = rtc_trial_id;
  rtc_has_completed_run = false;
  rtc_recorded_steps_count = 0;
  state = STATE_IDLE;
  signal = 0;
  setModeLED(robot);

  Serial.println("\n*************************************************************");
  Serial.printf(">>> ARMED FOR TRIAL %d! <<<\n", trial_id);
  Serial.println(">>> Unplug USB, align robot at 0.0° on protractor, and press button! <<<");
  Serial.println("*************************************************************\n");
}

void Controller_c::handleSerialCommands(Robot_c &robot) {
  while (Serial.available() > 0) {
    char c = Serial.read();
    if (c == '\n' || c == '\r' || c == ' ') continue;

    if (c == 'n' || c == 'N') {
      armNextTrial(robot);
    } else if (c == '1') {
      setTurnMode(MODE_POINT_TURN);
      Serial.println(">>> Selected: POINT TURN (+50, -50)");
      setModeLED(robot);
    } else if (c == '2' || c == 'v' || c == 'V') {
      setTurnMode(MODE_PIVOT_TURN);
      Serial.println(">>> Selected: PIVOT TURN (+50, 0)");
      setModeLED(robot);
    } else if (c == 's' || c == 'S') {
      if (state == STATE_COMPLETE) {
        armNextTrial(robot);
      }
      setSignal(1);
    } else if (c == 'r' || c == 'R') {
      rtc_trial_id = 1;
      trial_id = 1;
      rtc_has_completed_run = false;
      state = STATE_IDLE;
      signal = 0;
      setModeLED(robot);
      Serial.println(">>> Trial ID reset to 1.");
    } else if (c == 'p' || c == 'P') {
      printStoredResults();
    } else if (c == '?' || c == 'h' || c == 'H') {
      printHelpMenu();
    } else if (c == 'x' || c == 'X') {
      robot.setMotorPWM(0, 0);
      state = STATE_IDLE;
      signal = 0;
      in_position_start_ms = 0;
      Serial.println(">>> Motors halted.");
    }
  }
}

void Controller_c::handleButtonPress(Robot_c &robot, unsigned long now) {
  if (robot.isButtonPressed()) {
    // If in STATE_COMPLETE: button press arms the next trial!
    if (state == STATE_COMPLETE) {
      armNextTrial(robot);
    }
    // If in STATE_IDLE: button press starts the 4-step run!
    else if (state == STATE_IDLE) {
      setSignal(1);
    }
    // If running: emergency stop
    else if (state == STATE_TURNING) {
      robot.setMotorPWM(0, 0);
      state = STATE_IDLE;
      signal = 0;
      in_position_start_ms = 0;
      Serial.println("\n>>> Run aborted by button press! Motors halted.");
    }
  }
}

void Controller_c::update(Robot_c &robot, RobotWifiAP_c &server) {
  unsigned long now = robot.getMillis();

  if (!update_timer.isReady(now)) {
    return;
  }
  update_timer.resetTimer(now);

  // Check incoming Serial commands and button inputs
  handleSerialCommands(robot);
  handleButtonPress(robot, now);

  // Execute the turn state machine
  runStateMachine(robot, now);

  if (telemetry_timer.isReady(now)) {
    telemetry_timer.resetTimer(now);
    // publishTelemetry(robot, server, now);
  }
}

void Controller_c::runStateMachine(Robot_c &robot, unsigned long now) {
  // --------------------------------------------------------------------
  // STATE 0: IDLE (Unplugged, waiting on workbench for button press)
  // --------------------------------------------------------------------
  if (state == STATE_IDLE) {
    robot.setMotorPWM(0, 0);
    setModeLED(robot);

    if (signal == 1) {
      // Zero encoders and odometry pose at the start of the trial
      if (robot.getEncoders()) {
        odometry.reset(0.0f, 0.0f, 0.0f);
      }
      odometry.setWheelSeparationMm(WHEEL_SEPARATION_B_MM);
      odometry.setLeftWheelRadiusMm(WHEEL_RADIUS_R_MM);
      odometry.setRightWheelRadiusMm(WHEEL_RADIUS_R_MM);

      current_step = 1;
      current_target_deg = -90.0f;
      current_target_rad = -1.5707963f; // -PI/2
      rtc_has_completed_run = false;
      rtc_recorded_steps_count = 0;

      state = STATE_TURNING;
      step_start_ms = now;
      in_position_start_ms = 0;
      robot.setLED(0, 100, 0, 50); // Green = Actively turning

      Serial.println("\n=======================================================");
      Serial.printf("   STARTING TRIAL %d: %s\n", trial_id, (turn_mode == MODE_POINT_TURN ? "POINT TURN" : "PIVOT TURN"));
      Serial.printf("   Condition: %s | Model b = %.2f mm | Radius = %.2f mm\n", CONDITION_LABEL, odometry.wheelSeparationMm, odometry.leftWheelRadiusMm);
      Serial.printf("   Actuation: Constant PWM = %.0f | Lead Comp = %.2f deg\n", FIXED_TURN_PWM, LEAD_COMPENSATION_DEG);
      Serial.println("=======================================================");
      Serial.printf(">>> TURNING TO STEP 1 (Target: %.1f°) <<<\n", current_target_deg);
    }
    return;
  }

  // --------------------------------------------------------------------
  // STATE 1: TURNING (Rotate at constant 40 PWM until target threshold)
  // --------------------------------------------------------------------
  if (state == STATE_TURNING) {
    // Read encoders and update odometry every 10 ms cycle
    if (robot.getEncoders()) {
      odometry.update(robot.getLeftEncoderCount(), robot.getRightEncoderCount());
    }

    // Safety stall timeout (10 seconds per step)
    if (now - step_start_ms >= STALL_TIMEOUT_MS) {
      robot.setMotorPWM(0, 0);
      Serial.println("\n>>> [WARNING] Stall timeout exceeded! Motors halted.");
      state = STATE_SETTLE;
      state_timer_ms = now;
      return;
    }

    // Target threshold with optional lead compensation:
    // Clockwise turns: target is negative (e.g. -1.5708 rad for -90 deg).
    // Adding positive lead_rad triggers early cutoff to account for coasting if desired.
    float lead_rad = LEAD_COMPENSATION_DEG * (PI / 180.0f);
    float cutoff_threshold_rad = current_target_rad + lead_rad;

    if (odometry.pose.theta <= cutoff_threshold_rad) {
      robot.setMotorPWM(0, 0); // Immediately cut motor power
      state = STATE_SETTLE;
      state_timer_ms = now;
    } else {
      robot.setLED(0, 100, 0, 50); // Green = Turning
      if (turn_mode == MODE_POINT_TURN) {
        // Point turn: Left wheel forward (+), Right wheel reverse (-)
        robot.setMotorPWM(FIXED_TURN_PWM, -FIXED_TURN_PWM);
      } else {
        // Single-wheel pivot turn: Left wheel forward (+), Right wheel locked (0)
        robot.setMotorPWM(FIXED_TURN_PWM, 0.0f);
      }
    }
    return;
  }

  // --------------------------------------------------------------------
  // STATE 2: SETTLE (250 ms coast-down odometry integration)
  // --------------------------------------------------------------------
  if (state == STATE_SETTLE) {
    // Motors off, but continue integrating encoders to capture coast-down
    robot.setMotorPWM(0, 0);
    if (robot.getEncoders()) {
      odometry.update(robot.getLeftEncoderCount(), robot.getRightEncoderCount());
    }

    if (now - state_timer_ms >= SETTLE_INTEGRATE_MS) {
      // Snapshot settled encoder counts and final odometry heading
      snap_left_ticks = robot.getLeftEncoderCount();
      snap_right_ticks = robot.getRightEncoderCount();
      snap_odom_deg = odometry.pose.theta * (180.0f / PI);

      // STORE IN RTC RAM BUFFER (Survives USB plug-in and resets!)
      if (current_step >= 1 && current_step <= 4) {
        int idx = current_step - 1;
        rtc_step_records[idx].trial_id = trial_id;
        strcpy(rtc_step_records[idx].turn_mode, (turn_mode == MODE_POINT_TURN ? "Point" : "Pivot"));
        rtc_step_records[idx].step = current_step;
        rtc_step_records[idx].target_deg = -90.0f * current_step;
        rtc_step_records[idx].left_ticks = snap_left_ticks;
        rtc_step_records[idx].right_ticks = snap_right_ticks;
        rtc_step_records[idx].odom_deg = snap_odom_deg;
        rtc_recorded_steps_count = current_step;
      }

      // Also print live if Serial happens to be connected
      Serial.printf("%d,%s,%d,%.1f,%ld,%ld,%.2f\n",
                    trial_id,
                    (turn_mode == MODE_POINT_TURN ? "Point" : "Pivot"),
                    current_step,
                    -90.0f * current_step,
                    (long)snap_left_ticks,
                    (long)snap_right_ticks,
                    snap_odom_deg);

      Serial.println("*************************************************************");
      Serial.printf(">>> STEP %d REACHED! Target: %.1f° | Settled Odom_Deg: %.2f° <<<\n", current_step, current_target_deg, snap_odom_deg);
      Serial.println(">>> MOTORS PAUSED: Read and record True_Deg on protractor! (5s) <<<");
      Serial.println("*************************************************************\n");

      robot.setLED(100, 80, 0, 50); // Yellow/Amber = Reading window
      state = STATE_PAUSE_READ;
      state_timer_ms = now;
    }
    return;
  }

  // --------------------------------------------------------------------
  // STATE 3: PAUSE_READ (5000 ms pause for student to read protractor)
  // --------------------------------------------------------------------
  if (state == STATE_PAUSE_READ) {
    robot.setMotorPWM(0, 0);

    if (now - state_timer_ms >= READING_PAUSE_MS) {
      if (current_step < 4) {
        current_step++;
        // Target exact cardinal multiple (-90°, -180°, -270°, -360°)
        // Eliminates accumulated drift from previous steps:
        current_target_deg = -90.0f * (float)current_step;
        current_target_rad = current_target_deg * (PI / 180.0f);

        state = STATE_TURNING;
        step_start_ms = now;
        in_position_start_ms = 0;
        robot.setLED(0, 100, 0, 50); // Green
        Serial.printf(">>> Resuming: Turning to Step %d (Target: %.1f°) <<<\n", current_step, current_target_deg);
      } else {
        // Step 4 finished! Mark trial completed in RTC RAM
        rtc_has_completed_run = true;
        rtc_trial_id = trial_id;
        state = STATE_COMPLETE;
        last_serial_stream_ms = now - SERIAL_STREAM_INTERVAL_MS; // Trigger immediate first print
      }
    }
    return;
  }

  // --------------------------------------------------------------------
  // STATE 4: COMPLETE (All 4 steps finished: stream results every 2 seconds)
  // --------------------------------------------------------------------
  if (state == STATE_COMPLETE) {
    robot.setMotorPWM(0, 0);
    robot.setLED(80, 0, 100, 50); // Purple = Complete, outputting via Serial

    // Output stored encoder results every 2 seconds (2000 ms) via Serial
    if (now - last_serial_stream_ms >= SERIAL_STREAM_INTERVAL_MS) {
      last_serial_stream_ms = now;
      printStoredResults();
    }
    return;
  }
}

// ======================================================================
// PRESERVED LEGACY IMPLEMENTATIONS
// ======================================================================
void Controller_c::reportOdometry(Robot_c &robot, unsigned long now) {
  Serial.print(now); Serial.print(",");
  Serial.print(robot.getLeftEncoderCount()); Serial.print(",");
  Serial.print(robot.getRightEncoderCount()); Serial.print(",");
  Serial.print(odometry.pose.x); Serial.print(",");
  Serial.print(odometry.pose.y); Serial.print(",");
  Serial.println(odometry.pose.theta);
}

void Controller_c::reportOdometryTranslation(Robot_c &robot, unsigned long now) {
  robot.getMotionStatus();
  if (robot.motion_status.state == MOTION_STATUS_IDLE) {
    robot.startMoveDistance(100);
  } else if (robot.motion_status.state == MOTION_STATUS_COMPLETE) {
    setSignal(0);
  }
}

bool Controller_c::lineDetected(const Robot_c &robot) const {
  return (robot.surface.reading[2] >= 1400);
}

void Controller_c::runLineFollower(Robot_c &robot, unsigned long now) {
  robot.setMotorPWM(0, 0);
}

void Controller_c::publishTelemetry(Robot_c &robot, RobotWifiAP_c &server, unsigned long timestamp_ms) {
}