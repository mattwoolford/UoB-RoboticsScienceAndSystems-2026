#include "TrialRecorder.h"
#include "Controller.h"
#include <Arduino.h>
#include <freertos/FreeRTOS.h>
#include <nvs.h>
#include <stdio.h>
#include <string.h>

namespace {
// Enough for ~102 s at 5 Hz before event rows; long runs wrap and announce omitted early rows via trimmed=1.
constexpr uint32_t CAPACITY=512, PERIOD_MS=200;
enum State { EMPTY, ACTIVE, FINISHED, REJECTED };
struct Sample {
  uint32_t ms;
  const char *mode,*phase,*reason,*event; // All controller labels/reasons are static literals.
  float x,y,deg;
  int32_t leftTicks,rightTicks;
  uint16_t front,left,right;
  int16_t leftPwm,rightPwm;
};
Sample ring[CAPACITY];
portMUX_TYPE guard=portMUX_INITIALIZER_UNLOCKED;
uint32_t runId=0, count=0;
State state=EMPTY;
TrialCalibration trialCal{false,-1,-1};
// These variables are private to the single Arduino loop, never read by the HTTP task.
bool capturing=false;
uint32_t started=0,lastAt=0;
const char *lastMode=nullptr,*lastPhase=nullptr,*lastNote=nullptr;

Sample readCached(const Controller_c& c, Robot_c& r, const TopIR_c& ir, uint32_t now,const char* event) {
  const auto& p=c.odometry().pose;
  return {now-started,c.modeName(),c.phaseName(),c.note(),event,p.x,p.y,p.theta*57.2957795f,
          r.getLeftEncoderCount(),r.getRightEncoderCount(),ir.reading.front,ir.reading.back_left,ir.reading.back_right,
          r.getLeftMotorPWM(),r.getRightMotorPWM()};
}
void remember(const Sample& row,State next,uint32_t newId=0,const TrialCalibration* newCal=nullptr) {
  portENTER_CRITICAL(&guard);
  if(newId){runId=newId;count=0;trialCal=*newCal;}
  ring[count%CAPACITY]=row;++count;state=next;
  portEXIT_CRITICAL(&guard);
  lastMode=row.mode;lastPhase=row.phase;lastNote=row.reason;
}
bool appendQuoted(char*& out,const char* end,const char* s){
  if(end-out<2)return false;
  *out++='"';
  for(;*s;++s){
    if(end-out<2)return false;
    if(*s=='"')*out++='"';
    *out++=*s;
  }
  if(out>=end)return false;
  *out++='"';return true;
}
const char* stateName(State s){return s==EMPTY?"empty":s==ACTIVE?"active":s==FINISHED?"finished":"rejected";}
int formatRow(char* buf,size_t cap,const Sample& r,uint32_t id,bool trimmed,State s,const TrialCalibration& cal){
  char* p=buf; const char* end=buf+cap;
  int n=snprintf(p,end-p,"%lu,",(unsigned long)r.ms);
  if(n<0||n>=end-p)return -1;
  p+=n;
  if(!appendQuoted(p,end,r.mode)||p>=end)return -1;
  *p++=',';
  if(!appendQuoted(p,end,r.phase))return -1;
  n=snprintf(p,end-p,",%u,%u,%u,%d,%d,%ld,%ld,%.3f,%.3f,%.3f,",
      (unsigned)r.front,(unsigned)r.left,(unsigned)r.right,(int)r.leftPwm,(int)r.rightPwm,
      (long)r.leftTicks,(long)r.rightTicks,(double)r.x,(double)r.y,(double)r.deg);
  if(n<0||n>=end-p)return -1;
  p+=n;
  if(!appendQuoted(p,end,r.reason))return -1;
  n=snprintf(p,end-p,",%lu,%u,%s,%s,%s,%u,%d,%d,existing_raw_thresholds,nominal_geometry,opening_retry_v1\r\n",
      (unsigned long)id,(unsigned)trimmed,stateName(s),r.event,
      cal.calibrated?"nominal_with_prior_motor_check":"nominal_no_calibration",
      (unsigned)cal.calibrated,cal.leftThreshold,cal.rightThreshold);
  if(n<0||n>=end-p)return -1;
  return (int)(p-buf)+n;
}
}

TrialInfo trialInfo(){
  portENTER_CRITICAL(&guard);
  const TrialInfo info{runId,stateName(state),count<CAPACITY?count:CAPACITY};
  portEXIT_CRITICAL(&guard);
  return info;
}

bool reserveEscapeId(uint32_t& nextId){
  // NVS is the same non-volatile store used by Arduino Preferences. The
  // native get result distinguishes a new key from storage or type errors.
  nextId=0;
  nvs_handle_t h;
  if(nvs_open("box-trials",NVS_READWRITE,&h)!=ESP_OK)return false;
  uint32_t previous=0;
  esp_err_t err=nvs_get_u32(h,"last-id",&previous);
  if(err==ESP_ERR_NVS_NOT_FOUND){previous=0;err=ESP_OK;}
  if(err==ESP_OK && previous!=UINT32_MAX){
    const uint32_t candidate=previous+1;
    if(nvs_set_u32(h,"last-id",candidate)==ESP_OK && nvs_commit(h)==ESP_OK)
      nextId=candidate;
  }
  nvs_close(h);
  return nextId!=0;
}

TrialCalibration escapeCalibration(const Controller_c& c){
  if(!c.calibrated())return {false,-1,-1};
  return {true,c.leftThreshold(),c.rightThreshold()};
}
void beginEscapeRecord(const Controller_c& c,Robot_c& r,const TopIR_c& ir,uint32_t id,TrialCalibration calibration){
  started=lastAt=millis();
  capturing=strcmp(c.modeName(),"ESCAPE")==0;
  remember(readCached(c,r,ir,started,capturing?"start":"rejected"),capturing?ACTIVE:REJECTED,id,&calibration);
}
void observeEscapeRecord(const Controller_c& c,Robot_c& r,const TopIR_c& ir,bool tcpLost){
  if(!capturing)return;
  const uint32_t now=millis();
  const char *mode=c.modeName(),*phase=c.phaseName(),*note=c.note();
  const bool changed=(mode!=lastMode || phase!=lastPhase || note!=lastNote);
  if(!tcpLost && !changed && now-lastAt<PERIOD_MS)return;
  lastAt=now;capturing=(strcmp(mode,"ESCAPE")==0);
  const char* event=tcpLost?"tcp_disconnect":!capturing?"finish":changed?"change":"sample";
  remember(readCached(c,r,ir,now,event),capturing?ACTIVE:FINISHED);
}

esp_err_t serveTrialCsv(httpd_req_t* req){
  static const char fields[]="real_ms,mode,phase,front_raw,back_left_raw,back_right_raw,left_pwm,right_pwm,"
    "left_ticks,right_ticks,x_mm,y_mm,theta_deg,reason,run_id,trimmed,run_state,event,escape_settings,"
    "motor_calibrated_at_start,left_threshold_pwm,right_threshold_pwm,sensor_settings,odometry_settings,pilot_revision\r\n";
  portENTER_CRITICAL(&guard); const uint32_t id=runId, rows=count;const State phase=state;
  const TrialCalibration calibration=trialCal;portEXIT_CRITICAL(&guard);
  httpd_resp_set_hdr(req,"Cache-Control","no-store");
  // An explicit id prevents a slow browser from archiving a subsequent trial
  // under a previous trial's filename. Only accept a complete decimal id.
  if(httpd_req_get_url_query_len(req)){
    char query[24]; bool valid=false; uint32_t requested=0;
    if(httpd_req_get_url_query_str(req,query,sizeof(query))==ESP_OK &&
       strncmp(query,"id=",3)==0 && query[3]){
      valid=true;
      for(const char* q=query+3;*q;++q){
        if(*q<'0' || *q>'9'){valid=false;break;}
        const uint32_t digit=static_cast<uint32_t>(*q-'0');
        if(requested>(UINT32_MAX-digit)/10){valid=false;break;}
        requested=requested*10+digit;
      }
    }
    if(!valid || !requested){
      httpd_resp_set_status(req,"400 Bad Request");
      return httpd_resp_sendstr(req,"Expected ?id= followed by a positive trial number.");
    }
    if(requested!=id){
      httpd_resp_set_status(req,"404 Not Found");
      return httpd_resp_sendstr(req,"This trial is not in robot memory.");
    }
  }
  char disp[80],idText[12];
  snprintf(disp,sizeof(disp),"attachment; filename=\"box-escape-test-%04lu%s.csv\"",
      (unsigned long)id,phase==ACTIVE?"-partial":"");
  snprintf(idText,sizeof(idText),"%lu",(unsigned long)id);
  httpd_resp_set_type(req,"text/csv; charset=utf-8");
  httpd_resp_set_hdr(req,"Content-Disposition",disp);
  httpd_resp_set_hdr(req,"X-Trial-Id",idText);
  httpd_resp_set_hdr(req,"X-Trial-State",stateName(phase));
  if(httpd_resp_send_chunk(req,fields,sizeof(fields)-1)!=ESP_OK)return ESP_FAIL;
  // Snapshot the row range, then release the lock before formatting or touching a socket.
  // Abort a stale download if a new run starts or a ring slot is overwritten during export.
  char payload[1024];size_t used=0;
  for(uint32_t i=rows>CAPACITY?rows-CAPACITY:0;i<rows;++i){
    Sample row{};
    portENTER_CRITICAL(&guard);
    bool present=(id==runId && count-i<=CAPACITY);
    if(present)row=ring[i%CAPACITY];
    portEXIT_CRITICAL(&guard);
    if(!present)return ESP_FAIL;
    // Leave enough room for one whole row; batch writes for slow Wi-Fi clients.
    if(sizeof(payload)-used<448){
      if(httpd_resp_send_chunk(req,payload,used)!=ESP_OK)return ESP_FAIL;
      used=0;
    }
    int len=formatRow(payload+used,sizeof(payload)-used,row,id,rows>CAPACITY,phase,calibration);
    if(len<0)return ESP_FAIL;
    used+=static_cast<size_t>(len);
  }
  if(used && httpd_resp_send_chunk(req,payload,used)!=ESP_OK)return ESP_FAIL;
  return httpd_resp_send_chunk(req,nullptr,0);
}
