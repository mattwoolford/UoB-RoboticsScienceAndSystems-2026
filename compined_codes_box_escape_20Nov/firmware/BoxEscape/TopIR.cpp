#include "TopIR.h"

void TopIR_c::initialise() {
  // Keep raw readings on the 0–4095 scale used to calibrate these sensors.
  analogReadResolution(12);
  const uint8_t pins[] = {BACK_LEFT_PIN, FRONT_PIN, BACK_RIGHT_PIN};
  for (uint8_t i = 0; i < 3; ++i) {
    pinMode(pins[i], INPUT);
    analogSetPinAttenuation(pins[i], ADC_11db);
  }
}

uint16_t TopIR_c::readPin(uint8_t pin) {
  // Retain the old monitor's discarded conversion after changing channels.
  // Keep the next single conversion so variation is not hidden by averaging.
  analogRead(pin);
  return static_cast<uint16_t>(analogRead(pin));
}

void TopIR_c::read() {
  reading.start_us = micros();
  // The channels are sampled sequentially, not at exactly the same instant.
  reading.back_left = readPin(BACK_LEFT_PIN);
  reading.front = readPin(FRONT_PIN);
  reading.back_right = readPin(BACK_RIGHT_PIN);
  reading.scan_us = micros() - reading.start_us;
}
