#ifndef TOP_IR_H
#define TOP_IR_H

#include <Arduino.h>

// One sweep of the THREE outward-facing IR inputs, not the five DN sensors.
// Values are raw ADC counts. They are not calibrated distances.
struct TopIRReading_t {
  unsigned long start_us = 0;
  unsigned long scan_us = 0;
  uint16_t back_left = 0;
  uint16_t front = 0;
  uint16_t back_right = 0;
};

// Small hardware component, following the template's class/interface style.
// It does not command motors, print data, filter readings or identify exits.
class TopIR_c {
 public:
  // Mapping established in Hamad's earlier physical tests.
  static const uint8_t BACK_LEFT_PIN = 0;   // A_G0
  static const uint8_t FRONT_PIN = 1;       // A_G1
  static const uint8_t BACK_RIGHT_PIN = 4;  // A_G4

  TopIRReading_t reading;

  void initialise();  // Call once from setup(), after robot.initialise().
  void read();        // Acquire a new sweep when the controller requests it.

 private:
  uint16_t readPin(uint8_t pin);
};

#endif
