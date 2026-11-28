#pragma once
// Host-only deterministic clock, Serial, ADC and LED shims.
#include <algorithm>
#include <cmath>
#include <cstdint>
#include <cstdio>
#include <cstring>
#include <deque>
#include <string>
#include <vector>
#include <utility>
using std::max; using std::min; using std::isfinite;
using byte=uint8_t; using esp_err_t=int; using rmt_reserve_memsize_t=int;
struct rmt_data_t{unsigned level0,duration0,level1,duration1;};
constexpr int RMT_MEM_NUM_BLOCKS_1=1,RMT_TX_MODE=1,RMT_WAIT_FOR_EVER=-1;
constexpr float PI=3.14159265358979323846f,TWO_PI=2*PI;
inline uint8_t SDA=8,SCL=9; // Per-process fake board selection, including a pin collision.
constexpr int INPUT=1, INPUT_PULLUP=2, LOW=0, HIGH=1, ADC_11db=3;
#define F(s) s
#define PROGMEM
template<class A,class B,class C>A constrain(A a,B b,C c){return std::clamp(a,(A)b,(A)c);}
template<class T>std::string String(T v){return std::to_string(v);}
namespace hw {
inline unsigned long ms=0; inline int adc[8]={4095,4095,4095,4095,4095,4095,4095,4095};
inline int32_t leftCount=0,rightCount=0;inline int16_t left=0,right=0;
inline int stopAttempts=0;inline bool encodersOK=true,stopOK=true,motorOK=true,button=false;
inline std::vector<std::pair<int,int>> commands;
inline std::deque<char> serialIn, tcpIn;inline bool tcpConnected=false;
}
inline unsigned long millis(){return hw::ms;}inline unsigned long micros(){return 1000UL*hw::ms;}
inline int analogRead(int pin){return hw::adc[pin];}inline void analogReadResolution(int){}
inline void analogSetPinAttenuation(int,int){} inline void pinMode(int,int){}
inline int digitalRead(int){return hw::button?LOW:HIGH;}
inline bool rmtInit(int,int,int,int){return true;} inline int rmtWrite(int,rmt_data_t*,int,int){return 0;}
inline void delay(unsigned long ms){hw::ms+=ms;}inline void delayMicroseconds(unsigned int){}
struct SerialStub{unsigned baud=0;void begin(unsigned rate){baud=rate;}int available()const{return hw::serialIn.size();}
 int read(){if(!available())return -1; auto c=hw::serialIn.front();hw::serialIn.pop_front();return c;}
 template<class... A>void print(A const&...){}template<class... A>void println(A const&...){}template<class... A>int printf(A const&...){return 0;}
};inline SerialStub Serial;
