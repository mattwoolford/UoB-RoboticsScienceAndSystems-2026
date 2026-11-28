#include "Controller.h"
#include <cmath>
using namespace MotionSettings;
namespace {
constexpr float DEG_PER_RAD=57.2957795131f;
int cap(int v){return v>PWM_CAP?PWM_CAP:(v < -PWM_CAP?-PWM_CAP:v);}
int larger(int a,int b){return a>b?a:b;}
bool turnTooClose(const TopIRReading_t& r){
  return r.front<=TURN_TOO_CLOSE_RAW || r.back_left<=TURN_TOO_CLOSE_RAW || r.back_right<=TURN_TOO_CLOSE_RAW;
}
// Signed net movement since a baseline, including signed 32-bit counter wrap.
int64_t netCounts(int32_t count,int32_t base){
  int64_t d=int64_t(count)-int64_t(base);
  if(d>INT32_MAX)d-=int64_t(1)<<32;
  if(d<INT32_MIN)d+=int64_t(1)<<32;
  return d;
}
}

void Controller_c::initialise(Robot_c& r,TopIR_c& ir){
  ready_=false; mode_=IDLE; cal_=MotorCalibration_c();
  odo_.leftWheelRadiusMm=LEFT_RADIUS_MM; odo_.rightWheelRadiusMm=RIGHT_RADIUS_MM;
  odo_.wheelSeparationMm=WHEEL_SEPARATION_MM; odo_.encoderCountsPerRevolution=COUNTS_PER_REV;
  odo_.reset(); note_="Idle; ready for baseline escape";
  if(!r.setMotorPWM(0,0)) fault(r,"Initial stop not acknowledged; check motor power and I2C");
  ir.read(); lastTick_=r.getMillis(); tick_.resetTimer(lastTick_); irTick_.resetTimer(lastTick_);
}

bool Controller_c::movingOrCalibrating() const {return mode_!=IDLE && mode_!=FAULT;}
const char* Controller_c::modeName() const {
  switch(mode_){case IDLE:return "IDLE";case CALIBRATE:return "CALIBRATE";case STRAIGHT:return "STRAIGHT";
    case POINT:return "POINT";case POINT_CCW:return "POINT_CCW";case PIVOT:return "PIVOT";case ESCAPE:return "ESCAPE";default:return "FAULT";}
}
const char* Controller_c::phaseName() const {
  if(mode_==ESCAPE)return pilot_.stateName();
  if(mode_==POINT||mode_==POINT_CCW||mode_==PIVOT)return turnPhase_==TURNING?"turn":(turnPhase_==SETTLING?"coast":"read_protractor");
  return modeName();
}

void Controller_c::fault(Robot_c& r,const char* reason){
  mode_=FAULT; ready_=false; note_=reason;
  pilot_.stop(); r.setMotorPWM(0,0); cmdLeft_=cmdRight_=0;
  // FAULT retries the stop on every control tick; only explicit X can clear it.
}
void Controller_c::stop(Robot_c& r,const char* reason){
  if(mode_==CALIBRATE)ready_=false;
  if(!r.setMotorPWM(0,0)){fault(r,"Stop not acknowledged; retrying");return;}
  cmdLeft_=cmdRight_=0;mode_=IDLE;note_=reason;pilot_.stop();
}
bool Controller_c::takeBaseline(Robot_c& r){
  if(!r.getEncoders()){fault(r,"No fresh encoder baseline");return false;}
  if(!(std::isfinite(odo_.leftWheelRadiusMm)&&odo_.leftWheelRadiusMm>0 &&
       std::isfinite(odo_.rightWheelRadiusMm)&&odo_.rightWheelRadiusMm>0 &&
       std::isfinite(odo_.wheelSeparationMm)&&odo_.wheelSeparationMm>0 &&
       std::isfinite(odo_.encoderCountsPerRevolution)&&odo_.encoderCountsPerRevolution>0)){
    fault(r,"Invalid odometry geometry");return false;
  }
  startLeft_=leftCount_=r.getLeftEncoderCount(); startRight_=rightCount_=r.getRightEncoderCount();
  odo_.reset();odo_.update(leftCount_,rightCount_); // First update latches counts; movement starts afterwards.
  return true;
}
bool Controller_c::encoderTick(Robot_c& r,unsigned long now){
  if(!r.getEncoders()){fault(r,"Encoder read failed");return false;}
  int32_t l=r.getLeftEncoderCount(), h=r.getRightEncoderCount();
  if(l!=leftCount_||!cmdLeft_)lastLeft_=now;
  if(h!=rightCount_||!cmdRight_)lastRight_=now;
  leftCount_=l;rightCount_=h;
  if(!odo_.update(l,h)){fault(r,"Odometry did not update");return false;}
  if((cmdLeft_ && now-lastLeft_>=NO_TICKS_MS)||(cmdRight_ && now-lastRight_>=NO_TICKS_MS)){
    fault(r,"No encoder motion from a commanded wheel");return false;
  }
  return true;
}
bool Controller_c::drive(Robot_c& r,int l,int h,unsigned long now){
  l=cap(l);h=cap(h);
  if(!r.setMotorPWM(l,h)){fault(r,"Motor command not acknowledged");return false;}
  if(!cmdLeft_ && l)lastLeft_=now;
  if(!cmdRight_ && h)lastRight_=now;
  cmdLeft_=l;cmdRight_=h;return true;
}

void Controller_c::command(char key,Robot_c& r,TopIR_c& ir){
  if(key>='a' && key<='z')key-=('a'-'A');
  if(key=='X'){stop(r,"Stopped by operator");return;}
  if(mode_!=IDLE)return; // Never switch from one active motor producer into another.
  const unsigned long now=r.getMillis();
  if(key=='C'){
    if(!r.setMotorPWM(0,0)){fault(r,"Cannot stop to start calibration");return;}
    ready_=false;cmdLeft_=cmdRight_=0;cal_=MotorCalibration_c();mode_=CALIBRATE;
    note_="Measuring forward starting PWM";lastTick_=now;tick_.resetTimer(now);return;
  }
  if(key!='S' && key!='T' && key!='L' && key!='P' && key!='G' && key!='V' && key!='E')return;
  if(key=='E' && !BOX_ESCAPE_ENABLE){note_="E disabled in MotionSettings.h";return;}
  // Escape uses the preset PWM unchanged. Other bench experiments use measured thresholds.
  if(key!='E' && !ready_){note_="Run C calibration first";return;}
  if(key=='E' && ready_){
    const int minDrive=EscapeSettings::DRIVE_PWM-EscapeSettings::MAX_STEER_PWM;
    const int minCmd=minDrive<EscapeSettings::TURN_PWM?minDrive:EscapeSettings::TURN_PWM;
    if(larger(leftThreshold(),rightThreshold())>=minCmd){
      note_="Escape PWM too low for measured deadband; tune before running";return;
    }
  }else if(key!='E' && key!='S' && (leftThreshold()>=TURN_PWM ||
             ((key=='T'||key=='L'||key=='G')&&rightThreshold()>=TURN_PWM))){
    note_="Turn PWM too low for measured forward deadband";return;
  }
  if(!takeBaseline(r))return;
  ir.read();irTick_.resetTimer(now);
  start_=phaseStart_=lastLeft_=lastRight_=lastTick_=now;tick_.resetTimer(now);
  stepHeading_=odo_.pose.theta;quarter_=1;quarters_=(key=='G'||key=='V')?4:1;turnPhase_=TURNING;
  if(key=='S'){
    if(ir.reading.front<=STRAIGHT_NEAR_FRONT){note_="Front too close to start straight test";return;}
    DriftSettings s;s.correction=STRAIGHT_CORRECTION;s.pathRecovery=STRAIGHT_PATH_RECOVERY;
    drift_.beginRun(s);mode_=STRAIGHT;note_="Bounded straight test";
  }else if(key=='E'){
    pilot_.begin(now,odo_.pose.x,odo_.pose.y,odo_.pose.theta);mode_=ESCAPE;note_="Single-box trial";
  }else{
    if(turnTooClose(ir.reading)){note_="Turn test blocked: obstacle very close";return;}
    mode_=key=='L'?POINT_CCW:((key=='T'||key=='G')?POINT:PIVOT);
    note_=mode_==POINT_CCW?"Counterclockwise turn test":"Clockwise turn test";
  }
}

void Controller_c::turnTick(Robot_c& r,unsigned long now){
  const int sign=mode_==POINT_CCW?1:-1; // positive heading is counterclockwise.
  const float target=sign*90.0f*quarter_;
  if(turnPhase_==READING){
    if(now-phaseStart_>=READ_PAUSE_MS){++quarter_;stepHeading_=odo_.pose.theta;turnPhase_=TURNING;phaseStart_=now;}
    return;
  }
  if(turnPhase_==SETTLING){
    if(now-phaseStart_<SETTLE_MS)return;
    Serial.printf("turn_result,%s,%d,%.1f,%ld,%ld,%.2f\n",modeName(),quarter_,target,
      (long)leftCount_,(long)rightCount_,(double)(odo_.pose.theta*DEG_PER_RAD));
    if(quarter_==quarters_){stop(r,"Turn complete; compare estimated angle with protractor");}
    else {turnPhase_=READING;phaseStart_=now;note_="Record physical angle; next step in five seconds";}
    return;
  }
  if(sign*(odo_.pose.theta-stepHeading_)*DEG_PER_RAD < -WRONG_TURN_DEG){
    fault(r,"Turn moved opposite to commanded direction");return;
  }
  if(now-phaseStart_>=TURN_LIMIT_MS){fault(r,"Turn timed out");return;}
  if(sign*odo_.pose.theta*DEG_PER_RAD >= sign*target-TURN_LEAD_DEG){
    if(drive(r,0,0,now)){turnPhase_=SETTLING;phaseStart_=now;note_="Measuring coast-down";}
  }else{
    note_=sign>0?"Turning counterclockwise":"Turning clockwise";
    drive(r,-sign*TURN_PWM,mode_==PIVOT?0:sign*TURN_PWM,now);
  }
}

void Controller_c::update(Robot_c& r,TopIR_c& ir){
  const unsigned long now=r.getMillis();
  if(r.isButtonPressed() && movingOrCalibrating()){stop(r,"Stopped by robot button");return;}
  if(!tick_.isReady(now))return;
  tick_.resetTimer(now);
  const unsigned long gap=now-lastTick_;lastTick_=now;
  const bool newIR=irTick_.isReady(now);
  if(newIR){ir.read();irTick_.resetTimer(now);}
  if(mode_==FAULT){r.setMotorPWM(0,0);return;}
  if(mode_==IDLE)return;
  if(gap>MAX_CONTROL_GAP_MS){fault(r,"Control update late");return;}
  if(mode_==CALIBRATE){
    if(cal_.update(r)){ready_=true;mode_=IDLE;note_="Forward wheel thresholds measured";}
    else if(cal_.hasFailed())fault(r,"Calibration failed; check motors and encoders");
    return; // Calibration owns encoder polling and PWM until both wheels stop.
  }
  if(!encoderTick(r,now))return;
  if(mode_==POINT||mode_==POINT_CCW||mode_==PIVOT){
    if(newIR && turnTooClose(ir.reading)){stop(r,"Turn test stopped: obstacle very close");return;}
    turnTick(r,now);return;
  }
  if(mode_==STRAIGHT){
    if(netCounts(leftCount_,startLeft_) < -2 || netCounts(rightCount_,startRight_) < -2){
      fault(r,"Wheel counts reversed during straight command");return;
    }
    if(ir.reading.front<=STRAIGHT_NEAR_FRONT){stop(r,"Straight test stopped: front wall");return;}
    if(std::hypot(odo_.pose.x,odo_.pose.y)>=STRAIGHT_MAX_MM || now-start_>=STRAIGHT_MAX_MS){
      stop(r,"Straight test complete");return;
    }
    const int trim=(int)drift_.trimPWM(odo_,now);
    drive(r,larger(STRAIGHT_PWM,leftThreshold()+START_MARGIN_PWM)+trim,
            larger(STRAIGHT_PWM,rightThreshold()+START_MARGIN_PWM)-trim,now);return;
  }
  if(mode_==ESCAPE){
    pilot_.update(now,odo_.pose.x,odo_.pose.y,odo_.pose.theta,ir.reading.back_left,ir.reading.front,ir.reading.back_right);
    if(pilot_.failed()){fault(r,pilot_.reason());return;}
    if(pilot_.done()){stop(r,pilot_.reason());return;}
    note_=pilot_.reason();drive(r,pilot_.left(),pilot_.right(),now);
  }
}
