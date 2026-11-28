#pragma once
#include "Arduino.h"
struct IPAddress{std::string toString()const{return "192.168.4.1";}};
constexpr int WIFI_AP=2;
struct WiFiStub{void mode(int){}bool softAP(const char*,const char*){return true;}
 IPAddress softAPIP()const{return {};}int softAPgetStationNum()const{return 0;}};inline WiFiStub WiFi;
class WiFiClient{bool valid=false;public:WiFiClient(bool v=false):valid(v){}explicit operator bool()const{return valid;}
 int fd() const{return 1;}bool connected(){return valid&&hw::tcpConnected;}void stop(){valid=false;}void setNoDelay(bool){}
 int available(){return hw::tcpIn.size();}int read(){if(hw::tcpIn.empty())return -1;auto c=hw::tcpIn.front();hw::tcpIn.pop_front();return c;}
 size_t print(const char* s){return strlen(s);}size_t write(const uint8_t*,size_t n){return n;}};
struct WiFiServer{explicit WiFiServer(uint16_t){}void begin(){}void setNoDelay(bool){}WiFiClient accept(){return WiFiClient(hw::tcpConnected);}};
