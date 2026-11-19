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


/** @brief Maintains telemetry transport and runs the controller repeatedly. */
void loop() {
  // Accept or maintain the optional Processing telemetry connection. The
  // controller continues to run even when no client is connected.
  server.update();

  
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

  bool button_state = robot.isButtonPressed();
  if( button_state == true ) {
    robot.playTone( Sound::BASE, 50 );
    delay(100);
    robot.playTone(
      static_cast<uint16_t>(Sound::transposeFrequency(Sound::BASE, Sound::Octave(2))),
      50
    );
  }

}
