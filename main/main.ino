#include <Arduino.h>
#include <Wire.h>

#include "RobotWifiAP.h"
#include "Sound.h"

/** @brief WiFi access-point and TCP server used for optional telemetry. */
RobotWifiAP_c server("robot-matt", "abcde123", 80);

#include "Robot.h"
#include "RobotIMU.h"
#include "Controller.h"


/** @brief Hardware-facing interface to the Pololu robot. */
Robot_c robot;
/** @brief Direct interface to the 3Pi+ accelerometer, gyro, and magnetometer. */
RobotIMU_c imu;
/** @brief Supplied nominal line-following controller. */
Controller_c controller;


/** @brief Initialises serial, WiFi, IMU, and the supplied robot-controller baseline. */
void setup() {

  Serial.begin(115200);
  server.begin();

  robot.initialise();
//  robot.initialise("team name");


  // Robot_c starts the shared I2C bus before RobotIMU_c uses it. IMU readings
  // come directly from the sensor ICs and do not pass through the middleware.
  if (!imu.initialise() ) {
    Serial.println("Warning: LSM6DS33 IMU was not detected.");
    robot.setLED( 90, 50, 0, 100 ); // orange warning
  }

}


/**
 * @brief Handles the start button and advances its non-blocking two-note feedback.
 * Call once per loop. This owns button polling so the start request and tone use
 * the same event, and retains the pending second note between calls.
 */
static void updateStartButtonFeedback() {
  // Read the debounced button once: a second read would consume the same
  // debounce interval and could miss the press. Check readiness at the time of
  // the press; a rejected start must not run later when calibration finishes.
  static bool second_note_pending = false;
  static uint16_t second_note_frequency = 0;
  static unsigned long first_note_started_ms = 0;
  constexpr unsigned long NOTE_DURATION_MS = 50;
  if (robot.isButtonPressed()) {
    if (!second_note_pending) {
      const bool ready = controller.isReadyToStart();
      if (ready) controller.setSignal(1);

      // Rising octave confirms an accepted start; falling octave reports that
      // calibration is incomplete/failed or the procedure has already started.
      // Store this result now, rather than rechecking after the first beep.
      second_note_frequency = static_cast<uint16_t>(Sound::transposeFrequency(
        Sound::BASE, Sound::Octave(ready ? 1 : -1)));
      second_note_pending = robot.playTone(Sound::BASE, NOTE_DURATION_MS);
      first_note_started_ms = millis();
    }
  }

  // The buzzer request does not wait for playback. Schedule the next note on a
  // later loop instead of overwriting the first note immediately or using delay().
  // Unsigned elapsed-time subtraction remains valid when millis() wraps around.
  if (second_note_pending && millis() - first_note_started_ms >= NOTE_DURATION_MS) {
    robot.playTone(
      second_note_frequency,
      NOTE_DURATION_MS
    );
    second_note_pending = false;
  }
}


/** @brief Maintains telemetry transport and runs the controller repeatedly. */
void loop() {
  // Accept or maintain the optional Processing telemetry connection. The
  // controller continues to run even when no client is connected.
  server.update();

  updateStartButtonFeedback();

  // Run an iteration of the robot controller code.
  // Develop controller routines in Controller.cpp; edit parameters in Controller.h.
  controller.update(robot, server);

  // Toggle the LED every second without pausing controller or WiFi updates.
  static unsigned long lastFlash = 0;
  static bool ledOn = false;

  if (const unsigned long now = millis(); now - lastFlash >= 1000UL) {
    lastFlash = now;
    ledOn = !ledOn;
    robot.setLED(50, 255, 25, ledOn ? 100 : 0);
  }

}
