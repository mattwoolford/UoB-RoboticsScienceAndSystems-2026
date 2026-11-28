#include "BoxDashboard.h"
#include <Arduino.h>
#include <esp_http_server.h>
#include <freertos/FreeRTOS.h>
#include <stdio.h>
#include <string.h>
#include <cmath>
#include "DashboardPage.h"
#include "TrialRecorder.h"
#include "TrialReviewPage.h"

namespace {
struct Snapshot {
  BoxTelemetry t;
  uint32_t published;
  bool available;
};
Snapshot last{};
portMUX_TYPE guard = portMUX_INITIALIZER_UNLOCKED;
bool sensorsEnabled = false; // Set before starting the HTTP task and never changed.
constexpr uint32_t FRESH_MS = 1500;

// The HTTP task queues a request. Only the sketch loop operates the controller.
struct Controls {
  const char* mode="BOOT";
  const char* phase="BOOT";
  const char* note="Starting";
  const char* error="";
  char queued=0, inFlight=0;
  uint32_t previous=0, when=0;
};
Controls control{};
char chipId[24]="host-device";
const char* tf(bool b){return b?"true":"false";}
bool pending(const Controls& c){return c.queued || c.inFlight;}

// All source strings are firmware literals. Quote them for JSON even if future notes contain punctuation.
void jsonText(char* dest,size_t size,const char* src) {
  size_t n=0;
  for(const unsigned char* s=(const unsigned char*)src;*s && n+2<size;++s){
    if(*s=='"' || *s=='\\')dest[n++]='\\';
    dest[n++]=*s>=32?(char)*s:' ';
  }
  dest[n]=0;
}
esp_err_t message(httpd_req_t* req,const char* status,const char* text){
  char json[220];
  snprintf(json,sizeof(json),"{\"message\":\"%s\"}",text);
  httpd_resp_set_status(req,status);
  httpd_resp_set_type(req,"application/json");
  httpd_resp_set_hdr(req,"Cache-Control","no-store");
  return httpd_resp_sendstr(req,json);
}
bool fromControls(httpd_req_t* req){
  char h[4]={};
  return httpd_req_get_hdr_value_str(req,"X-BoxEscape-Control",h,sizeof(h))==ESP_OK && !strcmp(h,"1");
}
bool previousTrial(httpd_req_t* req,uint32_t& id){
  char value[12]={};
  if(httpd_req_get_hdr_value_str(req,"X-BoxEscape-Previous",value,sizeof(value))!=ESP_OK || !value[0])return false;
  uint32_t n=0;
  for(const char* p=value;*p;++p){
    if(*p<'0'||*p>'9')return false;
    unsigned d=*p-'0';
    if(n>(UINT32_MAX-d)/10)return false;
    n=n*10+d;
  }
  id=n;return true;
}
esp_err_t postStart(httpd_req_t* req){
  if(!fromControls(req))return message(req,"403 Forbidden","Use the Start trial button on the robot dashboard.");
  uint32_t previous;
  if(!previousTrial(req,previous))return message(req,"400 Bad Request","Missing or invalid trial number. Refresh the dashboard.");
  const auto trial=trialInfo();
  if(trial.id!=previous)return message(req,"409 Conflict","Trial has changed. Refresh the dashboard.");
  const uint32_t now=millis();
  portENTER_CRITICAL(&guard);
  const bool allowed=sensorsEnabled && !pending(control) && !strcmp(control.mode,"IDLE") && strcmp(trial.state,"active");
  if(allowed){control.queued='E';control.previous=previous;control.when=now;control.error="";}
  portEXIT_CRITICAL(&guard);
  return allowed?message(req,"202 Accepted","Start queued."):message(req,"409 Conflict","Not idle or another request is pending. Check status.");
}
esp_err_t postStop(httpd_req_t* req){
  if(!fromControls(req))return message(req,"403 Forbidden","Use the Stop trial button on the robot dashboard.");
  portENTER_CRITICAL(&guard);
  bool allowed=sensorsEnabled;
  if(allowed){control.queued='X';control.error="";} // Replace any waiting start.
  portEXIT_CRITICAL(&guard);
  return allowed?message(req,"202 Accepted","Stop queued."):message(req,"409 Conflict","Hardware locked; check Serial Monitor.");
}
esp_err_t indexPage(httpd_req_t* req) {
  httpd_resp_set_type(req,"text/html; charset=utf-8");
  httpd_resp_set_hdr(req,"Cache-Control","no-store");
  return httpd_resp_send(req,PAGE,sizeof(PAGE)-1);
}
esp_err_t reviewPage(httpd_req_t* req) {
  httpd_resp_set_type(req,"text/html; charset=utf-8");
  httpd_resp_set_hdr(req,"Cache-Control","no-store");
  return httpd_resp_send(req,TRIAL_REVIEW_PAGE,sizeof(TRIAL_REVIEW_PAGE)-1);
}
esp_err_t statusPage(httpd_req_t* req) {
  portENTER_CRITICAL(&guard);
  const Snapshot s=last;
  const Controls c=control;
  portEXIT_CRITICAL(&guard);
  const auto trial=trialInfo();
  const char* state=!sensorsEnabled?"locked":!s.available?"waiting":
                    (uint32_t)(millis()-s.published)>FRESH_MS?"stale":"live";
  char json[1600],note[200],err[180];
  jsonText(note,sizeof(note),c.note);
  jsonText(err,sizeof(err),c.error);
  const bool idle=!strcmp(c.mode,"IDLE"),started=!strcmp(trial.state,"active");
  const bool fresh=!strcmp(state,"live");
  const BoxTelemetry& t=s.t;
  // Each group is emitted as JSON null when readings are unavailable/stale.
  // At IDLE, pose is the latest wheel estimate, never an independent ground truth.
  char ir[95],motors[80],pose[185],geometry[200];
  if(fresh)snprintf(ir,sizeof(ir),"\"front\":%u,\"left\":%u,\"right\":%u",t.front,t.left,t.right);
  else strcpy(ir,"\"front\":null,\"left\":null,\"right\":null");
  if(fresh && strcmp(c.mode,"FAULT"))snprintf(motors,sizeof(motors),"\"left_pwm\":%d,\"right_pwm\":%d",t.leftPWM,t.rightPWM);
  else strcpy(motors,"\"left_pwm\":null,\"right_pwm\":null");
  if(fresh && strcmp(c.mode,"FAULT") && t.hasPose && std::isfinite(t.x) && std::isfinite(t.y) && std::isfinite(t.degrees)){
    snprintf(pose,sizeof(pose),"\"left_ticks\":%ld,\"right_ticks\":%ld,\"x_mm\":%.1f,\"y_mm\":%.1f,\"theta_deg\":%.2f",
      (long)t.leftTicks,(long)t.rightTicks,(double)t.x,(double)t.y,(double)t.degrees);
  }else strcpy(pose,"\"left_ticks\":null,\"right_ticks\":null,\"x_mm\":null,\"y_mm\":null,\"theta_deg\":null");
  if(s.available && std::isfinite(t.leftRadius) && std::isfinite(t.rightRadius) &&
      std::isfinite(t.separation) && std::isfinite(t.countsPerRev)){
    snprintf(geometry,sizeof(geometry),"\"left_radius_mm\":%.3f,\"right_radius_mm\":%.3f,\"wheel_separation_mm\":%.3f,\"counts_per_rev\":%.3f",
      (double)t.leftRadius,(double)t.rightRadius,(double)t.separation,(double)t.countsPerRev);
  }else strcpy(geometry,"\"left_radius_mm\":null,\"right_radius_mm\":null,\"wheel_separation_mm\":null,\"counts_per_rev\":null");
  int n=snprintf(json,sizeof(json),
    "{\"state\":\"%s\",%s,%s,%s,%s,\"robot_id\":\"%s\","
    "\"trial_id\":%lu,\"trial_state\":\"%s\",\"samples\":%lu,\"mode\":\"%s\",\"phase\":\"%s\",\"note\":\"%s\","
    "\"pending\":%s,\"can_start\":%s,\"can_stop\":%s,\"control_error\":\"%s\","
    "\"motor_calibrated\":%s,\"left_threshold_pwm\":%d,\"right_threshold_pwm\":%d}",
    state,ir,motors,pose,geometry,chipId,(unsigned long)trial.id,trial.state,
    (unsigned long)trial.samples,c.mode,c.phase,note,tf(pending(c)),tf(sensorsEnabled && idle && !started && !pending(c)),
    tf(sensorsEnabled && (!idle || pending(c) || started)),err,
    fresh?tf(t.calibrated):"null",fresh?t.leftThreshold:-1,fresh?t.rightThreshold:-1);
  if(n<0 || (size_t)n>=sizeof(json))return message(req,"500 Internal Server Error","Status unavailable.");
  httpd_resp_set_type(req,"application/json");
  httpd_resp_set_hdr(req,"Cache-Control","no-store");
  return httpd_resp_send(req,json,n);
}
bool addRoute(httpd_handle_t http,const char* path,esp_err_t (*handler)(httpd_req_t*),bool post=false) {
  httpd_uri_t route{};
  route.uri=path;route.method=post?HTTP_POST:HTTP_GET;route.handler=handler;
  return httpd_register_uri_handler(http,&route)==ESP_OK;
}
}

bool startBoxDashboard(bool enabled) {
  sensorsEnabled=enabled;
#ifdef ARDUINO_ARCH_ESP32
  snprintf(chipId,sizeof(chipId),"%012llx",(unsigned long long)ESP.getEfuseMac());
#endif
  httpd_config_t cfg=HTTPD_DEFAULT_CONFIG();
  cfg.stack_size=8192; // CSV formatting and transmission run in the HTTP task.
  cfg.server_port=80;cfg.max_open_sockets=2;cfg.lru_purge_enable=true;
  cfg.recv_wait_timeout=2;cfg.send_wait_timeout=2;
  httpd_handle_t http=nullptr;
  if(httpd_start(&http,&cfg)!=ESP_OK)return false;
  if(addRoute(http,"/",indexPage)&&addRoute(http,"/status",statusPage)&&
     addRoute(http,"/review",reviewPage)&&addRoute(http,"/trial.csv",serveTrialCsv)&&
     addRoute(http,"/start",postStart,true)&&addRoute(http,"/stop",postStop,true))return true;
  httpd_stop(http);return false;
}
void publishBoxTelemetry(const BoxTelemetry& t) {
  const uint32_t now=millis();
  portENTER_CRITICAL(&guard);
  if(!last.available || last.t.stamp!=t.stamp)last.published=now;
  last.t=t;last.available=true;
  portEXIT_CRITICAL(&guard);
}

void publishBoxMode(const char* mode,const char* phase,const char* note){
  // Main loop only. The controller exposes immutable static labels.
  static const char *prevMode=nullptr,*prevPhase=nullptr,*prevNote=nullptr;
  if(mode==prevMode && phase==prevPhase && note==prevNote)return;
  portENTER_CRITICAL(&guard);control.mode=mode;control.phase=phase;control.note=note;portEXIT_CRITICAL(&guard);
  prevMode=mode;prevPhase=phase;prevNote=note;
}
char takeBoxRequest(uint32_t& previous,uint32_t& when){
  portENTER_CRITICAL(&guard);
  char k=control.queued;previous=control.previous;when=control.when;
  control.queued=0;control.inFlight=k;
  portEXIT_CRITICAL(&guard);
  return k;
}
void finishBoxRequest(const char* error){
  portENTER_CRITICAL(&guard);
  control.inFlight=0;control.error=error;
  portEXIT_CRITICAL(&guard);
}
