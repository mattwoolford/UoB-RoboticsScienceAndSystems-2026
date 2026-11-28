#pragma once
#include "Arduino.h"
#include "i2c_datatypes.h"
struct WireFake{
 std::vector<uint8_t> tx,rx; RobotRegister_t selector=REGISTER_NULL; uint16_t timeout=0;
 void begin(){}void setClock(unsigned){}void setTimeOut(uint16_t t){timeout=t;}
 void beginTransmission(int){tx.clear();}size_t write(const uint8_t* p,size_t size){tx.assign(p,p+size);return size;}
 uint8_t endTransmission(){
  if(tx.size()==1){selector=tx[0];return 0;}
  if(selector==REGISTER_SET_MOTORS&&tx.size()==sizeof(RobotMotors_t)){
   RobotMotors_t req{};memcpy(&req,tx.data(),tx.size()); bool stop=req.pwm[0]==0&&req.pwm[1]==0;
   if(stop){++hw::stopAttempts;}if(!hw::motorOK||(stop&&!hw::stopOK))return 1;
   hw::left=req.pwm[0];hw::right=req.pwm[1];hw::commands.emplace_back(hw::left,hw::right);
  }return 0;
 }
 size_t requestFrom(int,size_t n){rx.clear();if(selector==REGISTER_GET_ENCODERS){
   if(!hw::encodersOK)return 0;
   RobotEncoders_t v{{hw::leftCount,hw::rightCount}};auto* b=reinterpret_cast<uint8_t*>(&v);
   rx.assign(b,b+sizeof(v));return rx.size();
  }rx.assign(n,0);return n;}
 size_t available()const{return rx.size();}int read(){if(rx.empty())return -1;int c=rx.front();rx.erase(rx.begin());return c;}
 size_t readBytes(uint8_t* p,size_t n){n=std::min(n,rx.size());std::copy_n(rx.begin(),n,p);rx.erase(rx.begin(),rx.begin()+n);return n;}
};inline WireFake Wire;
