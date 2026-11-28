#ifndef BOX_ESCAPE_CONTROLLER_H
#define BOX_ESCAPE_CONTROLLER_H
#include "Robot.h"
#include "TaskTimer.h"
#include "OdometryModel.h"
#include "MotorCalibration.h"
#include "DriftCorrection.h"
#include "TopIR.h"
#include "EscapePilot.h"
#include "MotionSettings.h"

// One owner of the wheels: the bench tests and the escape pilot never run together.
class Controller_c {
 public:
  void initialise(Robot_c& robot, TopIR_c& ir);   // Hardware is already initialised.
  void update(Robot_c& robot, TopIR_c& ir);
  void command(char key, Robot_c& robot, TopIR_c& ir);
  bool movingOrCalibrating() const;
  bool calibrated() const {return ready_;}
  int leftThreshold() const {return cal_.getLeftDeadbandPWM();}
  int rightThreshold() const {return cal_.getRightDeadbandPWM();}
  const OdometryModel_c& odometry() const {return odo_;}
  const char* modeName() const;
  const char* phaseName() const;
  const char* note() const {return note_;}
 private:
  enum Mode { IDLE,CALIBRATE,STRAIGHT,POINT,POINT_CCW,PIVOT,ESCAPE,FAULT };
  enum TurnPhase { TURNING,SETTLING,READING };
  Mode mode_=IDLE;
  TurnPhase turnPhase_=TURNING;
  MotorCalibration_c cal_;
  OdometryModel_c odo_;
  DriftCorrection_c drift_;
  EscapePilot pilot_;
  TaskTimer_c tick_{MotionSettings::CONTROL_MS},irTick_{MotionSettings::IR_MS};
  const char* note_="Initialising";
  bool ready_=false;
  int quarter_=1,quarters_=1,cmdLeft_=0,cmdRight_=0;
  float stepHeading_=0;
  unsigned long start_=0,phaseStart_=0,lastTick_=0,lastLeft_=0,lastRight_=0;
  int32_t leftCount_=0,rightCount_=0,startLeft_=0,startRight_=0;
  bool takeBaseline(Robot_c& robot);
  bool encoderTick(Robot_c& robot,unsigned long now);
  bool drive(Robot_c& robot,int left,int right,unsigned long now);
  void fault(Robot_c& robot,const char* reason);
  void stop(Robot_c& robot,const char* reason);
  void turnTick(Robot_c& robot,unsigned long now);
};
#endif
