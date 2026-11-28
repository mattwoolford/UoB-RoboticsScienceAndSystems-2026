#pragma once

// Same settings consumed by the team's DriftCorrection class. This sketch
// takes them from MotionSettings.h instead of a separate ESP-IDF flash partition.
struct DriftSettings {
  bool correction = false;
  bool pathRecovery = false;
};
