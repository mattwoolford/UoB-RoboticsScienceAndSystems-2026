#pragma once
#include <stdint.h>
#include "EscapeSettings.h"

// Single-box pilot. Inputs: top IR and wheel odometry only. Outputs: requested
// PWM. Controller owns sensor acquisition, I2C writes, button and arming.
class EscapePilot {
 public:
  void begin(uint32_t nowMs, float xMm, float yMm, float thetaRad);
  void update(uint32_t nowMs, float xMm, float yMm, float thetaRad,
              uint16_t backLeft, uint16_t front, uint16_t backRight);
  int left() const { return lp; }
  int right() const { return rp; }
  bool done() const { return state == CANDIDATE; }
  bool failed() const { return state == FAULT; }
  void stop();
  const char* stateName() const;
  const char* reason() const { return message; }
 private:
  enum Stage { IDLE, SEEK, TURN_LEFT, SETTLE_LEFT, ACQUIRE, FOLLOW, CENTRE,
               TURN_RIGHT, SETTLE_RIGHT, CROSS, CANDIDATE, FAULT };
  Stage state = IDLE;
  int lp = 0, rp = 0;
  const char* message = "Idle.";
  uint32_t stateAt=0, previousAt=0, movingAt=0, wallAt=0, gapAt=0;
  float prevX=0, prevY=0, path=0, statePath=0, wallPath=0, gapPath=0;
  float anchorX=0, anchorY=0, anchorTheta=0, heading=0, turnStart=0, turnTarget=0;
  float edgeX=0, edgeY=0, edgeHeading=0;
  bool wallSeen=false, wallArmed=false, edgeSeen=false, gapSeen=false;
  void enter(Stage next, uint32_t now, float x, float y, float theta);
  void restartSearch(uint32_t now,float x,float y,float theta,const char* why);
  void fail(const char* why);
  void startTurn(bool toExit, uint32_t now, float x, float y, float theta);
  void steer(float theta, float target);
};
