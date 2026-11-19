// Simulated robot flash survives Controller_c construction and reset in host tests.
#include "DriftSettings.h"

static DriftSettings flash{};
bool fail_settings_write = false;

bool loadDriftSettings(DriftSettings& settings) {
  settings = flash;
  return true;
}

bool saveDriftSettings(const DriftSettings& settings) {
  if (fail_settings_write) return false;
  flash = settings;
  return true;
}
