#include "Controller.cpp"
#include "EscapePilot.cpp"
#include "DriftCorrection.cpp"
#include "MotorCalibration.cpp"
#include "TopIR.cpp"
#include "OdometryModel.cpp"
#include "TaskTimer.cpp"
struct VHW{int t,left,right,adc[5],lp,rp;};
static VHW hw;
unsigned long millis(){return hw.t;}
unsigned long micros(){return hw.t*1000u;}
int analogRead(unsigned char p){return hw.adc[p];}
Robot_c::Robot_c(){}
unsigned long Robot_c::getMillis(){return millis();}
bool Robot_c::isButtonPressed(){return false;}
bool Robot_c::getEncoders(){return true;}
int32_t Robot_c::getLeftEncoderCount(){return hw.left;}
int32_t Robot_c::getRightEncoderCount(){return hw.right;}
bool Robot_c::setMotorPWM(float l,float r){hw.lp=(int)l; hw.rp=(int)r;return true;}
static Robot_c robot;
static TopIR_c ir;
static Controller_c controller;
extern "C" void init(){
    hw.adc[0]=hw.adc[1]=hw.adc[4]=4095; ir.initialise();
    controller=Controller_c();
    controller.initialise(robot,ir);
}
extern "C" void inputs(int l,int r,int a,int b,int c){hw.left=l;hw.right=r;hw.adc[0]=a;hw.adc[1]=b;hw.adc[4]=c;}
extern "C" void command(int key){controller.command((char)key,robot,ir);}
extern "C" void tick(int now){hw.t=now;controller.update(robot,ir);}
extern "C" const char *mode(){return controller.modeName();}
extern "C" const char *phase(){return controller.phaseName();}
extern "C" const char *note(){return controller.note();}
extern "C" int calibrated(){return controller.calibrated();}
extern "C" int leftPWM(){return hw.lp;}
extern "C" int rightPWM(){return hw.rp;}
extern "C" int leftThreshold(){return controller.leftThreshold();}
extern "C" int rightThreshold(){return controller.rightThreshold();}
extern "C" int backLeft(){return ir.reading.back_left;}
extern "C" int front(){return ir.reading.front;}
extern "C" int backRight(){return ir.reading.back_right;}
extern "C" float x(){return controller.odometry().pose.x;}
extern "C" float y(){return controller.odometry().pose.y;}
extern "C" float theta(){return controller.odometry().pose.theta;}
