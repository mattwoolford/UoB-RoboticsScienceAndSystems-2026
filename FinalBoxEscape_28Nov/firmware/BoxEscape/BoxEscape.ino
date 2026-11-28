// Physical Stamp-C3 + 3Pi robot. One controller owns motors; nothing drives at boot.
#include <Arduino.h>
#include <Wire.h>
#include <stdio.h>
#include <ctype.h>
#include "Robot.h"
#include "RobotWifiAP.h"
#include "TopIR.h"
#include "Controller.h"
#include "BoxDashboard.h"
#include "TrialRecorder.h"
#include <string.h>

// The robot serves a browser dashboard on port 80 and a text terminal on 8080.
RobotWifiAP_c server("BoxEscape", "BoxEscapePad", 8080);
Robot_c robot;
TopIR_c topIR;
Controller_c controller;

bool apStarted=false, remoteOwnsRun=false;
unsigned long lastOutput=0;
bool havePose=false; // The initial encoder baseline is acquired by a successful motion start.

static bool irPin(int pin) {
  return pin==TopIR_c::BACK_LEFT_PIN || pin==TopIR_c::FRONT_PIN || pin==TopIR_c::BACK_RIGHT_PIN;
}
static void say(const char* message) {
  Serial.println(message);
  if(apStarted && server.clientConnected()) server.trySendLine(message);
}
static void helpText() {
  say("# One letter + newline: ? help, H CSV header, C calibrate, S straight, T point 90 CW, L point 90 CCW, P pivot 90 CW");
  say("# G/V four point/pivot turns; E baseline escape (no calibration needed); X stop. Physical USER button stops.");
}
static void header() {
  say("ms,mode,phase,ir_start_us,scan_us,back_left_raw,front_raw,back_right_raw,left_ticks,right_ticks,x_mm,y_mm,theta_deg,left_pwm,right_pwm,left_start_pwm,right_start_pwm");
}
static void broadcastStatus() {
  const TopIRReading_t &r=topIR.reading;
  const OdometryModel_c &od=controller.odometry();
  const OdometryModel_c::Pose &p=od.pose;
  const TrialCalibration cal=escapeCalibration(controller);
  // These getters copy cached values; the dashboard never polls I2C or the ADC.
  BoxTelemetry t{(uint32_t)r.start_us,r.front,r.back_left,r.back_right,
    robot.getLeftMotorPWM(),robot.getRightMotorPWM(),robot.getLeftEncoderCount(),robot.getRightEncoderCount(),
    p.x,p.y,p.theta*57.2957795f,od.leftWheelRadiusMm,od.rightWheelRadiusMm,
    od.wheelSeparationMm,od.encoderCountsPerRevolution,cal.calibrated,havePose,cal.leftThreshold,cal.rightThreshold};
  publishBoxTelemetry(t);
  char row[240];
  snprintf(row,sizeof(row),"%lu,%s,%s,%lu,%lu,%u,%u,%u,%ld,%ld,%.1f,%.1f,%.1f,%d,%d,%d,%d",
    millis(),controller.modeName(),controller.phaseName(),r.start_us,r.scan_us,
    (unsigned)r.back_left,(unsigned)r.front,(unsigned)r.back_right,
    (long)t.leftTicks,(long)t.rightTicks,
    t.x,t.y,t.degrees,(int)t.leftPWM,(int)t.rightPWM,
    controller.leftThreshold(),controller.rightThreshold());
  say(row);
}
bool hardwareReady=false;
static const char* lastNote=nullptr;
static void reportChange() {
  const char* note=controller.note();
  if(!note || note==lastNote)return;
  lastNote=note;char text[175];snprintf(text,sizeof(text),"# %s",note);say(text);
}
// Return an immutable explanation if the requested start was refused.
static const char* dispatchLine(char key, bool remote) {
  if(key=='?'){helpText();return "";}
  if(key=='H'){header();return "";}
  if(!hardwareReady){say("# Check board selection: default I2C pins overlap top IR pins. Motion is locked.");return "Hardware locked. Check board selection.";}
  if(key!='X' && key!='C' && key!='S' && key!='P' && key!='T' && key!='L' && key!='G' && key!='V' && key!='E'){
    say("# Unknown command. Send ? on its own line.");return "Unknown command.";
  }
  bool before=controller.movingOrCalibrating();
  const bool newAttempt=(key=='E' && !strcmp(controller.modeName(),"IDLE"));
  uint32_t id=0;
  if(newAttempt && !reserveEscapeId(id)){
    const char* err="Trial number could not be saved. Experiment did not start.";
    say(err);return err;
  }
  const TrialCalibration cal=escapeCalibration(controller); // Snapshot before a rejected start can clear readiness.
  controller.command(key,robot,topIR);
  if(controller.movingOrCalibrating() && strcmp(controller.modeName(),"CALIBRATE"))havePose=true;
  if(newAttempt)beginEscapeRecord(controller,robot,topIR,id,cal);
  else observeEscapeRecord(controller,robot,topIR);
  if(!before && controller.movingOrCalibrating()) remoteOwnsRun=remote;
  if(!controller.movingOrCalibrating()) remoteOwnsRun=false;
  say(controller.note());
  return key=='E' && strcmp(controller.modeName(),"ESCAPE")?controller.note():"";
}
static void serviceWebCommand(){
  uint32_t previous=0,when=0;
  const char request=takeBoxRequest(previous,when);
  if(!request)return;
  const char* error="";
  if(request=='E'){
    // HTTP accepts asynchronously; recheck in the controller thread in case USB,
    // the button, or a TCP client changed the robot after this browser clicked.
    if(!hardwareReady || strcmp(controller.modeName(),"IDLE") || trialInfo().id!=previous)
      error="Start superseded. Review the current trial and try again when idle.";
    else if((uint32_t)(millis()-when)>1500)error="Start request expired. Press Start again.";
    else error=dispatchLine('E',false);  // Browser runs do not depend on the optional TCP terminal.
  }else if(request=='X'){
    if(hardwareReady)dispatchLine('X',false);
    if(!strcmp(controller.modeName(),"FAULT"))error=controller.note();
  }
  publishBoxMode(controller.modeName(),controller.phaseName(),controller.note());
  finishBoxRequest(error);
}
// Accept exactly one printable letter (or ?) per line. A pasted word or an HTTP
// request must never be interpreted as a sequence of motor commands.
char serialKey=0,tcpKey=0;
static void acceptByte(int value, char &slot, bool remote) {
  if(value<0) return;
  if(value=='\r'||value=='\n'){
    char key=slot;slot=0;if(key && key!='#')dispatchLine(key,remote);return;
  }
  if(slot || !(value=='?' || (value>='A'&&value<='Z') || (value>='a'&&value<='z')))slot='#';
  else slot=static_cast<char>(toupper(value));
}
void setup() {
  Serial.begin(115200);
  robot.initialise();
  robot.setMotorPWM(0,0);  // Stop before starting optional Wi-Fi.
  hardwareReady=!irPin(SDA) && !irPin(SCL);
  if(hardwareReady){
    topIR.initialise();
    controller.initialise(robot,topIR);
  }
  publishBoxMode(controller.modeName(),controller.phaseName(),controller.note());
  apStarted=server.begin();
  if(!hardwareReady)say("# LOCKED: selected board uses an IR pin for I2C. Check board and wiring.");
  else say("# BoxEscape ready: idle. Monitor at 115200; send one letter with newline.");
  if(apStarted){
    const auto ip=server.ip().toString();
    Serial.printf("# Wi-Fi TCP: %s:8080\n",ip.c_str());
    if(startBoxDashboard(hardwareReady))Serial.printf("# Web dashboard: http://%s/\n",ip.c_str());
    else Serial.println("# Web dashboard could not start; TCP remains available.");
  }
  helpText();header();
}
void loop() {
  // Check the old client before allowing the server to accept a replacement.
  if(apStarted && !server.clientConnected()){
    tcpKey=0;
    if(remoteOwnsRun && hardwareReady){
      controller.command('X',robot,topIR);
      observeEscapeRecord(controller,robot,topIR,true);
      remoteOwnsRun=false;
      Serial.println("# Wi-Fi control connection lost; stop requested.");
    }
  }
  if(apStarted)server.update();
  if(apStarted)serviceWebCommand();
  if(hardwareReady){controller.update(robot,topIR);observeEscapeRecord(controller,robot,topIR);reportChange();}
  else {static unsigned long lastStop=0;if(millis()-lastStop>=100){lastStop=millis();robot.setMotorPWM(0,0);}}
  if(hardwareReady && !controller.movingOrCalibrating())remoteOwnsRun=false;
  // Bounded input processing lets the controller return to its timers promptly.
  for(int n=0;n<24 && Serial.available();++n)acceptByte(Serial.read(),serialKey,false);
  for(int n=0;n<24 && apStarted && server.available();++n)acceptByte(server.read(),tcpKey,true);
  publishBoxMode(controller.modeName(),controller.phaseName(),controller.note());
  const unsigned long now=millis();
  if(hardwareReady && now-lastOutput>=200){lastOutput=now;broadcastStatus();}
}
