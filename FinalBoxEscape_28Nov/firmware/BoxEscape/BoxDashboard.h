#pragma once
#include <stdint.h>

// HTTP serves snapshots and queues button presses; only loop() drives the robot.
bool startBoxDashboard(bool sensorsEnabled);
struct BoxTelemetry {
  uint32_t stamp;
  uint16_t front,left,right;
  int16_t leftPWM,rightPWM;
  int32_t leftTicks,rightTicks;
  float x,y,degrees,leftRadius,rightRadius,separation,countsPerRev;
  bool calibrated,hasPose;
  int leftThreshold,rightThreshold;
};
void publishBoxTelemetry(const BoxTelemetry& sample);

void publishBoxMode(const char* mode,const char* phase,const char* note);
char takeBoxRequest(uint32_t& previous,uint32_t& when);
void finishBoxRequest(const char* error);
