#pragma once
#include <stdint.h>
#define TWO_PI 6.2831853071795864769
#define INPUT 0
#define ADC_11db 0
struct rmt_data_t {uint32_t data;};
using esp_err_t=int;
static inline void analogReadResolution(int) {}
static inline void pinMode(int,int) {}
static inline void analogSetPinAttenuation(int,int) {}
struct String { String(int) {} };
inline String operator+(const char*,String s){return s;}
struct Trace { template<class... A> void printf(A...){} template<class A> void println(A){} };
inline Trace Serial;
extern unsigned long millis();
extern unsigned long micros();
extern int analogRead(unsigned char);
