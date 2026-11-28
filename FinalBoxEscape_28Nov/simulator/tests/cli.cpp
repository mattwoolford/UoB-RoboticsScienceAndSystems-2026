// Drive the exact native controllers from the JS arena, independently from the
// JS executable backend. No Arduino sketch or fake hardware files are modified.
#include "Arduino.h"
#include "Controller.h"
#include <iostream>
#include <iomanip>
int main(){
  using namespace std; Robot_c r; TopIR_c ir; Controller_c c;
  r.initialise();ir.initialise();hw::ms=0;c.initialise(r,ir);
  auto emit=[&](){auto p=c.odometry().pose;
    cout<<c.modeName()<<"|"<<c.phaseName()<<"|"<<c.note()<<"|"<<hw::left<<"|"<<hw::right<<"|"<<c.calibrated()<<"|"
        <<c.leftThreshold()<<"|"<<c.rightThreshold()<<"|"<<setprecision(14)<<p.x<<"|"<<p.y<<"|"<<p.theta<<"|"<<ir.reading.back_left<<"|"<<ir.reading.front<<"|"<<ir.reading.back_right<<'\n'<<flush;
  };
  emit();
  unsigned long now; char kind; int l,rr,a,b,e,k;
  while(cin>>kind>>now>>l>>rr>>a>>b>>e>>k){
    hw::leftCount=l;hw::rightCount=rr;hw::adc[0]=a;hw::adc[1]=b;hw::adc[4]=e;
    if(kind=='c')c.command(static_cast<char>(k),r,ir);
    else {hw::ms=now;c.update(r,ir);}
    emit();
  }
}
