// Host verification of production sketch logic. Hardware inputs below are deliberately synthetic.
#include "Arduino.h"
#include "Controller.h"
#include "EscapePilot.h"
#include "EscapeSettings.h"
namespace S=EscapeSettings;
#ifdef TEST_DEFAULT_ENABLED
static_assert(BOX_ESCAPE_ENABLE==1,"The distributed project must enable baseline escapes.");
#endif
#include "Robot.h"
#include "TopIR.h"
#include "TrialRecorder.h"
#include "esp_http_server.h"
#include "nvs.h"
#include <cassert>
#include <cmath>
#include <iostream>
#include <sstream>
#include <set>
void setup();void loop();
extern Controller_c controller;extern TopIR_c topIR;extern Robot_c robot;
static bool mode(const char* desired){return std::string(controller.modeName())==desired;}
static void tick(int ms=10){hw::ms+=ms;loop();}
static void send(const std::string& line){hw::serialIn.insert(hw::serialIn.end(),line.begin(),line.end());tick();}
static void clearRoom(){hw::adc[0]=hw::adc[1]=hw::adc[4]=4095;}
static void calibrate(){
 send("C\n");assert(mode("CALIBRATE"));
 for(int i=0;i<4000&&mode("CALIBRATE");i++){
   if(hw::left>=8)++hw::leftCount;
   if(hw::right>=12)++hw::rightCount;
   tick();
 }
 assert(mode("IDLE")&&controller.calibrated());assert(controller.leftThreshold()==8&&controller.rightThreshold()==12);
 assert(hw::left==0&&hw::right==0);
}
// Decode quoted CSV cells so checks refer to named measurements rather than their positions.
using CsvRow=std::map<std::string,std::string>;
static std::vector<std::string> cells(const std::string& line){
 std::vector<std::string> result;
 std::string cell;bool quoted=false;
 for(size_t i=0;i<line.size();++i){
   const char c=line[i];
   if(c=='"'){
     if(quoted && i+1<line.size() && line[i+1]=='"'){cell+='"';++i;}
     else quoted=!quoted;
   }else if(c==','&&!quoted){result.push_back(cell);cell.clear();}
   else if(c!='\r'||quoted)cell+=c;
 }
 assert(!quoted);result.push_back(cell);return result;
}
static httpd_req_t get(const char* path,const std::string& query={}){
 const auto writes=hw::commands.size();const auto before=controller.modeName();
 const auto& route=fakehttp::routes.at(path);httpd_req_t r;r.query=query;
 assert(route.method==HTTP_GET && route.handler(&r)==ESP_OK);
 assert(writes==hw::commands.size() && std::string(before)==controller.modeName());
 return r;
}
static std::vector<CsvRow> trialCsv(){
 auto req=get("/trial.csv"); assert(req.type.find("text/csv")==0);
 std::istringstream input(req.body);std::string line;
 assert(std::getline(input,line));const auto header=cells(line);
 const std::set<std::string> cols(header.begin(),header.end());assert(cols.size()==header.size());
 for(auto name:{"real_ms","mode","phase","front_raw","back_left_raw","back_right_raw",
                "left_pwm","right_pwm","left_ticks","right_ticks","x_mm","y_mm","theta_deg","reason","run_id","run_state","event","trimmed"})
   assert(cols.count(name));
 std::vector<CsvRow> rows;
 while(std::getline(input,line)){
   if(line.empty()||line=="\r")continue;
   auto vals=cells(line);assert(vals.size()==header.size());CsvRow row;
   for(size_t i=0;i<vals.size();++i)row[header[i]]=vals[i];
   if(!rows.empty())assert(std::stoul(row.at("real_ms"))>=std::stoul(rows.back().at("real_ms")));
   if(!rows.empty())assert(row.at("run_id")==rows.front().at("run_id"));
   rows.push_back(row);
 }
 if(!rows.empty() && rows.front().at("trimmed")=="0")assert(std::stoul(rows.front().at("real_ms"))==0);
 return rows;
}
// Exercise read-only routes against real controller snapshots.
static void exerciseDashboard(){
 assert(fakehttp::port==80);
 for(auto name:{"/","/status","/review","/trial.csv"})assert(fakehttp::routes.at(name).method==HTTP_GET);
 for(auto name:{"/start","/stop"})assert(fakehttp::routes.at(name).method==HTTP_POST);
 auto page=get("/");
 assert(page.type.find("text/html")==0 && page.body.find("/review")!=std::string::npos);
 auto review=get("/review");
 assert(review.type.find("text/html")==0 && review.body.find("/trial.csv")!=std::string::npos);
 assert(trialCsv().empty());
 assert(get("/status").body.find("\"waiting\"")!=std::string::npos);
 hw::adc[0]=1234;hw::adc[1]=2345;hw::adc[4]=3456;
 for(int i=0;i<80;i++)tick();
 auto data=get("/status");
 assert(data.type=="application/json" && data.headers.at("Cache-Control")=="no-store");
 assert(data.body.find("\"live\"")!=std::string::npos && data.body.find("\"left\":1234")!=std::string::npos);
 assert(data.body.find("\"front\":2345")!=std::string::npos && data.body.find("\"right\":3456")!=std::string::npos);
 hw::adc[1]=1789; for(int i=0;i<70;i++)tick();
 assert(get("/status").body.find("\"front\":1789")!=std::string::npos);
 hw::ms+=2000;
 const auto stale=get("/status").body;assert(stale.find("\"stale\"")!=std::string::npos);
 assert(stale.find("\"motor_calibrated\":null")!=std::string::npos && stale.find("\"front\":null")!=std::string::npos);
 assert(mode("IDLE") && hw::left==0 && hw::right==0);
 clearRoom();
}

// Numeric and boolean fields in the flat firmware JSON. Verify the whole value.
static std::string field(const std::string& obj,const std::string& key){
 const auto token="\"" + key + "\":"; const auto name=obj.find(token);assert(name!=std::string::npos);
 const auto from=name+token.size(),to=obj.find_first_of(",}",from);
 assert(to!=std::string::npos);return obj.substr(from,to-from);
}
#if BOX_ESCAPE_ENABLE
static httpd_req_t post(const char* path,const std::string& previous="",bool validControl=true){
 const auto writes=hw::commands.size();httpd_req_t r;
 if(validControl)r.requestHeaders["X-BoxEscape-Control"]="1";
 if(!previous.empty())r.requestHeaders["X-BoxEscape-Previous"]=previous;
 const auto& h=fakehttp::routes.at(path);assert(h.method==HTTP_POST && h.handler(&r)==ESP_OK);
 assert(hw::commands.size()==writes); // The HTTP task must never write the motors.
 return r;
}
static bool status(const httpd_req_t& r,int code){return r.status.compare(0,3,std::to_string(code))==0;}
static void webBaseline(){
 assert(!controller.calibrated());
 const auto ready=get("/status").body;
 assert(field(ready,"can_start")=="true" && field(ready,"motor_calibrated")=="false");
 assert(field(ready,"left_threshold_pwm")=="-1" && field(ready,"right_threshold_pwm")=="-1");
 assert(status(post("/start","0",false),403) && status(post("/stop","",false),403));
 assert(status(post("/start"),400) && status(post("/start","0xyz"),400));
 assert(status(post("/start","99"),409));tick();assert(mode("IDLE") && trialCsv().empty());
 // An otherwise valid but undispatched start expires while the main loop is delayed.
 assert(status(post("/start","0"),202));tick(1510);assert(mode("IDLE") && trialCsv().empty());
 assert(get("/status").body.find("expired")!=std::string::npos);
 // A stop issued between acceptance and dispatch must cancel the pending start.
 assert(status(post("/start","0"),202));assert(status(post("/start","0"),409));
 assert(status(post("/stop"),202));tick();assert(mode("IDLE")&&trialCsv().empty());
 assert(status(post("/start","0"),202));tick();
 assert(mode("ESCAPE") && !controller.calibrated());assert(status(post("/start","0"),409));
 for(int n=0;n<15;n++)tick();
 auto cur=trialCsv();assert(!cur.empty() && cur.front().at("run_state")=="active");
 const auto id=cur[0].at("run_id");assert(std::stoul(id)>0);
 const auto live=get("/status").body;assert(field(live,"trial_id")==id && field(live,"phase")=="\"SEEK\"");
 auto r=get("/trial.csv","id="+id);assert(r.chunkEnd&&status(r,200));
 std::string n=id;n.insert(0,n.size()<4?4-n.size():0,'0');
 assert(r.headers.at("X-Trial-Id")==id && r.headers.at("X-Trial-State")=="active");
 assert(r.headers.at("Content-Disposition").find("box-escape-test-"+n+"-partial.csv")!=std::string::npos);
 auto wrong=get("/trial.csv","id="+std::to_string(std::stoul(id)+1));assert(!status(wrong,200));
 assert(cur.front().at("escape_settings")=="nominal_no_calibration");
 assert(cur.front().at("motor_calibrated_at_start")=="0" && cur.front().at("left_threshold_pwm")=="-1" && cur.front().at("right_threshold_pwm")=="-1");
 assert(cur.front().at("sensor_settings")=="existing_raw_thresholds" && cur.front().at("odometry_settings")=="nominal_geometry");
 assert(mode("ESCAPE") && hw::left>0 && hw::right>0);
 assert(status(post("/stop"),202));tick();assert(mode("IDLE")&&hw::left==0&&hw::right==0);
 auto final=trialCsv();assert(final.back().at("run_state")=="finished"&&final.back().at("run_id")==id);
 auto ended=get("/trial.csv","id="+id);assert(ended.headers.at("Content-Disposition").find("box-escape-test-"+n+".csv")!=std::string::npos);
 assert(ended.headers.at("X-Trial-Id")==id && ended.headers.at("X-Trial-State")=="finished");
 assert(status(post("/start","0"),409));tick();assert(mode("IDLE"));
 // Simulated NVS failure: no motion, no new record and the last CSV is still downloadable.
 fakenvs::failCommit=true;
 assert(status(post("/start",id),202));tick();fakenvs::failCommit=false;
 assert(mode("IDLE") && trialCsv().front().at("run_id")==id);
 assert(status(post("/start",id),202));tick();
 auto second=trialCsv();assert(mode("ESCAPE")&&!second.empty());
 assert(std::stoul(second.front().at("run_id"))>std::stoul(id));
 assert(status(post("/stop"),202));tick();assert(mode("IDLE")&&!controller.calibrated());
}
#endif
static void exerciseController(){
 setup();assert(Serial.baud==115200);assert(mode("IDLE")&&hw::left==0&&hw::right==0);
 exerciseDashboard();tick();
#if BOX_ESCAPE_ENABLE
 webBaseline();
#endif
 send("S\n");assert(mode("IDLE")&&!controller.calibrated());send("CANNOT\n");assert(mode("IDLE"));
 clearRoom();calibrate();
 hw::adc[0]=1050;hw::adc[1]=3470;hw::adc[4]=2870;for(int i=0;i<12;i++)tick();
 assert(topIR.reading.back_left==1050&&topIR.reading.front==3470&&topIR.reading.back_right==2870);clearRoom();
 for(int i=0;i<12;i++)tick();
 // Timed controller clocks vs signed absolute encoder counters from its own middleware.
 send("T\n");for(int i=0;i<20&&!(hw::left>0&&hw::right<0);i++)tick();
 assert(mode("POINT")&&hw::left>0&&hw::right<0);
 // Allow exactly one dashboard publisher interval at a time; use opposite wheel
 // signs so a swapped field or an invented zero cannot satisfy this comparison.
 for(int j=0;j<22;j++){hw::leftCount+=2;hw::rightCount-=2;tick();}
 extern unsigned long lastOutput;
 lastOutput=hw::ms-200;tick();const auto active=get("/status").body;
 assert(field(active,"motor_calibrated")=="true" && field(active,"left_threshold_pwm")=="8" && field(active,"right_threshold_pwm")=="12");
 assert(std::stoi(field(active,"left_pwm"))==hw::left && std::stoi(field(active,"right_pwm"))==hw::right && hw::left>0 && hw::right<0);
 assert(std::stol(field(active,"left_ticks"))==hw::leftCount && std::stol(field(active,"right_ticks"))==hw::rightCount && hw::leftCount!=hw::rightCount);
 const auto &pose=controller.odometry().pose;
 assert(std::abs(std::stod(field(active,"x_mm"))-pose.x)<.1 && std::abs(std::stod(field(active,"y_mm"))-pose.y)<.1);
 assert(std::abs(std::stod(field(active,"theta_deg"))-pose.theta*57.29578)<.1 && pose.theta<-.10);
 assert(std::abs(std::stod(field(active,"counts_per_rev"))-MotionSettings::COUNTS_PER_REV)<.1 && std::abs(std::stod(field(active,"wheel_separation_mm"))-MotionSettings::WHEEL_SEPARATION_MM)<.1);
 int t=0;while(mode("POINT")&&(hw::left||hw::right)&&t++<500){hw::leftCount+=2;hw::rightCount-=2;tick();}
 assert(hw::left==0&&hw::right==0);assert(mode("POINT")); // settle counts while stopped
 hw::leftCount+=3;hw::rightCount-=3;
 for(int i=0;i<30;i++)tick();
 assert(mode("IDLE"));
 auto rad=controller.odometry().pose.theta;assert(rad< -1.55f&&rad> -1.65f);
 send("L\n");for(int i=0;i<20&&!(hw::left<0&&hw::right>0);i++)tick();
 assert(mode("POINT_CCW")&&hw::left<0&&hw::right>0);
 t=0;while(mode("POINT_CCW")&&(hw::left||hw::right)&&t++<500){hw::leftCount-=2;hw::rightCount+=2;tick();}
 assert(hw::left==0&&hw::right==0&&mode("POINT_CCW"));
 hw::leftCount-=3;hw::rightCount+=3;
 for(int i=0;i<30;i++)tick();
 rad=controller.odometry().pose.theta;assert(mode("IDLE")&&rad>1.55f&&rad<1.65f);
 send("P\n");for(int i=0;i<8;i++) tick();assert(mode("PIVOT")&&hw::left>0&&hw::right==0);
 hw::button=true;tick();hw::button=false;for(int i=0;i<10;i++)tick();
 assert(mode("IDLE")&&hw::left==0&&hw::right==0);
 // Deliberate loss of fresh feedback + failed stop acknowledgement; next ticks must retry stop.
 send("S\n");for(int i=0;i<8;i++)tick();assert(mode("STRAIGHT")&&hw::left>0&&hw::right>0);
 hw::encodersOK=false;hw::stopOK=false;int n=hw::stopAttempts;for(int i=0;i<7;i++)tick();
 assert(mode("FAULT"));assert(hw::stopAttempts>n);hw::stopOK=true;for(int i=0;i<12;i++)tick();
 assert(hw::left==0&&hw::right==0&&mode("FAULT"));
 hw::encodersOK=true;send("X\n");assert(mode("IDLE")&&!controller.calibrated());
 // Start the full synthetic gap from the web after clearing a fault, still without C.
#if BOX_ESCAPE_ENABLE
 assert(!controller.calibrated());
 assert(status(post("/start",trialCsv().front().at("run_id")),202));tick();
#else
 send("E\n");
#endif
 for(int i=0;i<10;i++)tick();
#if BOX_ESCAPE_ENABLE
 assert(mode("ESCAPE"));
 // Run the complete controller -> pilot -> motor -> encoder loop through one synthetic gap.
 // Scripted ADC values check integration only, not room geometry or actual physical travel.
 // Reproduce the decision from physical test 0002: an established wall fades, but the
 // usable window expires before the open signal can be confirmed. The dashboard must
 // still record the SAME attempt, including a return to SEEK rather than a terminal row.
 const auto testId=trialCsv().front().at("run_id");
 auto advanceWheels=[](){
   hw::leftCount+=hw::left>0?2:hw::left<0?-2:0;
   hw::rightCount+=hw::right>0?2:hw::right<0?-2:0;
   tick();
 };
 hw::adc[4]=S::RIGHT_TARGET_RAW;
 for(int i=0;i<200 && !(std::string(controller.phaseName())=="FOLLOW" && controller.odometry().pose.x>60);i++)advanceWheels();
 assert(std::string(controller.phaseName())=="FOLLOW" && controller.odometry().pose.x>60);
 const auto atEdge=controller.odometry().pose.x;
 // Late strong return: even with an open signal the validity window must prevent
 // using the old edge as the origin of an exit turn.
 for(int i=0;i<150 && std::string(controller.phaseName())=="FOLLOW";i++){
    hw::adc[4]=controller.odometry().pose.x-atEdge<30?(S::RIGHT_EDGE_RAW+S::RIGHT_OPEN_RAW)/2:3880;
    advanceWheels();
 }
 if(!mode("ESCAPE") || std::string(controller.phaseName())!="SEEK")
   std::cerr<<"Missed-window regression: got "<<controller.modeName()<<" / "<<controller.phaseName()<<" / "<<controller.note()<<"\n";
 assert(mode("ESCAPE") && std::string(controller.phaseName())=="SEEK");
 auto retryLog=trialCsv();
 assert(retryLog.back().at("run_id")==testId && retryLog.back().at("run_state")=="active"
    && retryLog.back().at("phase")=="SEEK" && retryLog.back().at("event")=="change");
 assert(retryLog.back().at("reason").rfind("Retry:",0)==0 && retryLog.back().at("pilot_revision")=="opening_retry_v1");
 hw::adc[4]=4095;for(int i=0;i<25;i++)advanceWheels();
 assert(std::string(controller.phaseName())=="SEEK" && hw::left>0 && hw::right>0);
 // Now supply a new stable wall and a well-timed opening; no new Start, reset or C.
 float edge=-1;bool sawWeak=false,sawCentre=false,sawTurn=false,sawCross=false;
 for(int i=0;i<5000&&mode("ESCAPE");++i){
   std::string phase=controller.phaseName();
   sawCentre|=phase=="CENTRE";sawTurn|=phase=="TURN_RIGHT";sawCross|=phase=="CROSS";
   if(phase=="FOLLOW"&&edge<0)edge=controller.odometry().pose.x+55;
   const float dx=controller.odometry().pose.x-edge;
   if(sawTurn||(edge>=0&&dx>=12))hw::adc[4]=4095;
   else if(edge>=0&&dx>=6)hw::adc[4]=S::RIGHT_OPEN_RAW+20;
   else if(edge>=0&&dx>=0){hw::adc[4]=(S::RIGHT_EDGE_RAW+S::RIGHT_OPEN_RAW)/2;sawWeak=true;}
   else hw::adc[4]=S::RIGHT_TARGET_RAW;
   hw::leftCount+=hw::left>0?2:hw::left<0?-2:0;
   hw::rightCount+=hw::right>0?2:hw::right<0?-2:0;
   tick();
 }
 assert(sawWeak&&sawCentre&&sawTurn&&sawCross&&mode("IDLE")&&hw::left==0&&hw::right==0);
 assert(std::string(controller.note()).find("andidate")!=std::string::npos);
 auto escape=trialCsv();assert(escape.size()>5 && escape.back().at("run_id")==testId);
 assert(escape.front().at("phase")=="SEEK" && escape.front().at("mode")=="ESCAPE");
 std::set<std::string> capturedPhases;bool moved=false;
 for(const auto& r:escape){
   capturedPhases.insert(r.at("phase"));
   moved|=(std::abs(std::stod(r.at("theta_deg")))>30 && std::hypot(std::stod(r.at("x_mm")),std::stod(r.at("y_mm")))>5);
 }
 for(auto phase:{"FOLLOW","CENTRE","TURN_RIGHT","SETTLE_RIGHT","CROSS"})assert(capturedPhases.count(phase));
 assert(escape.back().at("run_state")=="finished" && escape.front().at("trimmed")=="0");
 assert(moved && escape.back().at("mode")=="IDLE" && escape.back().at("reason").find("andidate")!=std::string::npos);
 assert(escape.back().at("left_pwm")=="0" && escape.back().at("right_pwm")=="0");
 const auto finished=get("/trial.csv").body;
 for(int i=0;i<120;i++)tick();
 assert(get("/trial.csv").body==finished); // preserve the result while the robot sits idle
 clearRoom();
#else
 assert(mode("IDLE")&&hw::left==0&&hw::right==0);
 auto rejected=trialCsv();assert(rejected.size()==1 && rejected[0].at("run_state")=="rejected");
 assert(rejected[0].at("reason").find("disabled")!=std::string::npos);
#endif
 send("X\n");
 calibrate();
 // A TCP-originated trial must stop as soon as the control client disconnects.
 hw::tcpConnected=true;
 for(int i=0;i<100;i++)tick();
 hw::tcpIn={'S','\n'};for(int i=0;i<6;i++)tick();
 assert(mode("STRAIGHT")&&hw::left>0);hw::tcpConnected=false;tick();
 assert(mode("IDLE")&&hw::left==0&&hw::right==0);
#if BOX_ESCAPE_ENABLE
 // Separate starts must never append to the previous experiment.
 clearRoom();hw::tcpConnected=true;for(int i=0;i<100;i++)tick();
 hw::tcpIn={'E','\n'};for(int i=0;i<15;i++)tick();
 assert(mode("ESCAPE"));auto during=trialCsv();assert(!during.empty() && during.front().at("phase")=="SEEK");
 hw::tcpConnected=false;tick();assert(mode("IDLE")&&hw::left==0&&hw::right==0);
 auto lost=trialCsv();assert(lost.size()>=2 && std::stoul(lost.back().at("real_ms"))<250);
 assert(during.front().at("run_id")!=escape.front().at("run_id") && during.front().at("run_state")=="active");
 assert(lost.back().at("event")=="tcp_disconnect" && lost.back().at("run_state")=="finished");
 send("E\n");for(int i=0;i<15;i++)tick();assert(mode("ESCAPE"));
 send("X\n");auto manual=trialCsv();assert(mode("IDLE"));
 assert(manual.front().at("run_id")!=lost.front().at("run_id"));
 assert(manual.back().at("reason").find("operator")!=std::string::npos);
 // Power is requested but both synthetic encoders are held fixed: the recorder must retain
 // the controller's actual fault (not relabel every terminal row as "operator stopped").
 clearRoom();send("E\n");std::string pending=trialCsv().front().at("run_id");
 for(int i=0;i<14;i++)tick();
 send("E\n");assert(trialCsv().front().at("run_id")==pending);
 for(int i=0;i<300&&mode("ESCAPE");i++)tick();
 assert(mode("FAULT")&&hw::left==0&&hw::right==0);auto stall=trialCsv();
 assert(stall.back().at("mode")=="FAULT" && stall.back().at("run_state")=="finished");
 assert(stall.back().at("reason")==controller.note());
 assert(!controller.calibrated());
 for(const auto &row:stall){
   assert(row.at("escape_settings")=="nominal_with_prior_motor_check" && row.at("motor_calibrated_at_start")=="1");
   assert(row.at("left_threshold_pwm")=="8" && row.at("right_threshold_pwm")=="12");
 }
 for(int i=0;i<24;i++)tick();
 const auto faultStatus=get("/status").body;
 for(const auto* name:{"left_pwm","right_pwm","left_ticks","right_ticks","x_mm","y_mm","theta_deg"})assert(field(faultStatus,name)=="null");
 assert(field(faultStatus,"motor_calibrated")=="false" && field(faultStatus,"left_threshold_pwm")=="-1" && field(faultStatus,"right_threshold_pwm")=="-1");
 auto first=stall.front();
 assert(std::any_of(stall.begin(),stall.end(),[&](const CsvRow& r){
   return std::stoi(r.at("left_pwm"))>0 && r.at("left_ticks")==first.at("left_ticks") &&
          r.at("right_ticks")==first.at("right_ticks");
 }));
 // A fresh Start cannot clear the encoder FAULT or silently resume the prior trial.
 assert(status(post("/start",stall.back().at("run_id")),409));tick();assert(mode("FAULT"));
 assert(status(post("/stop"),202));tick();assert(mode("IDLE"));calibrate();
 // Force a recorder overrun in isolation. This fixture advances only the observer,
 // then exercises an actual physical-button stop.
 send("E\n");assert(mode("ESCAPE"));
 for(int i=0;i<530;i++){hw::ms+=200;observeEscapeRecord(controller,robot,topIR);}
 hw::button=true;tick();hw::button=false;
 assert(mode("IDLE"));auto trimmed=trialCsv();
 assert(trimmed.front().at("trimmed")=="1" && std::stoul(trimmed.front().at("real_ms"))>0);
 assert(trimmed.size()<530 && trimmed.back().at("run_state")=="finished");
 assert(trimmed.back().at("reason").find("button")!=std::string::npos);
#endif
 // A close front reading during the straight test should stop forward commands.
 clearRoom();for(int i=0;i<12;i++)tick();send("S\n");for(int i=0;i<10;i++)tick();
 assert(hw::left>0&&hw::right>0);hw::adc[1]=2250;for(int i=0;i<12;i++)tick();
 assert(hw::left==0&&hw::right==0);
 clearRoom();hw::adc[4]=600;send("T\n");assert(mode("IDLE")&&hw::left==0&&hw::right==0);
 clearRoom();send("T\n");for(int i=0;i<5;i++)tick();assert(mode("POINT"));
 hw::leftCount-=40;hw::rightCount+=40;tick();assert(mode("FAULT")&&hw::left==0&&hw::right==0);
 send("X\n");calibrate();send("S\n");for(int i=0;i<5;i++)tick();assert(mode("STRAIGHT"));
 hw::leftCount-=3;tick();assert(mode("FAULT")&&hw::left==0&&hw::right==0);
 hw::adc[1]=1730;for(int i=0;i<12;i++)tick();assert(topIR.reading.front==1730);
}
static void exercisePilot();
int main(int argc,char** argv){
#if BOX_ESCAPE_ENABLE
 if(argc>1 && std::string(argv[1])=="locked"){
   SDA=TopIR_c::FRONT_PIN;setup();tick();
   assert(get("/status").body.find("\"locked\"")!=std::string::npos);
   assert(status(post("/start","0"),409));tick();assert(mode("IDLE")&&trialCsv().empty()&&hw::left==0&&hw::right==0);
   std::cout<<"Locked board refuses web motion.\n";return 0;
 }
 if(argc>1 && std::string(argv[1])=="persisted"){
   fakenvs::values["box-trials/last-id"]=314;setup();tick();
   assert(status(post("/start","0"),202));tick();assert(mode("ESCAPE"));
   assert(trialCsv().front().at("run_id")=="315");
   std::cout<<"Fresh boot with a prior fake NVS counter continues numbering.\n";return 0;
 }
#else
 (void)argc;(void)argv;
#endif
 exerciseController();exercisePilot();std::cout<<"Controller, IR, middleware and pilot host checks passed.\n";
}
static void exercisePilot(){
 // Construct sensor/encoder observations, never tell the pilot the map or actual exit location.
 struct Run{
    EscapePilot p;uint32_t t=0;float x=0,y=0,h=0;
    Run(){p.begin(t,x,y,h);}
    void sample(float nx,float ny,float nh,uint16_t f,uint16_t r,uint16_t l=4095){t+=50;x=nx;y=ny;h=nh;p.update(t,x,y,h,l,f,r);}
    bool at(const char* state){return std::string(p.stateName())==state;}
    void wall(){for(int i=1;i<=14;i++)sample(x+3,0,0,4095,3000);assert(at("FOLLOW"));}
 };
 Run a;
 a.sample(1,0,0,4095,4095);assert(a.at("SEEK")&&a.p.left()>0&&a.p.right()>0);
 for(int i=0;i<9;i++)a.sample(a.x+2,0,0,4095,4095);
 assert(a.at("SEEK")); // open floor is not an exit
 a.wall();a.sample(a.x+2,0,0,4095,4095);a.sample(a.x+2,0,0,4095,3000);
 assert(a.at("FOLLOW")); // a single missing echo must not trigger a turn
 const float centre=S::OPENING_WIDTH_MM/2-S::EDGE_TO_AXLE_OFFSET_MM;
 const float firstEdge=a.x+2;
 const uint16_t edgeOnly=(S::RIGHT_EDGE_RAW+S::RIGHT_OPEN_RAW)/2;
 const uint16_t strong=S::RIGHT_OPEN_RAW+20;
 for(int i=0;i<3;i++){a.sample(firstEdge+2*i,0,0,4095,edgeOnly);assert(a.at("FOLLOW"));}
 const float firstStrong=a.x+2;
 a.sample(firstStrong,0,0,4095,strong);assert(a.at("FOLLOW"));
 a.sample(firstStrong+3,0,0,4095,strong);assert(a.at("FOLLOW"));
 a.sample(firstStrong+6,0,0,4095,strong);assert(a.at("CENTRE"));
 while(a.at("CENTRE")&&a.x-firstEdge<50)a.sample(a.x+1,0,0,4095,strong);
 // The first weak edge, not the later strong reading or full-scale return, anchors the axle.
 assert(a.at("TURN_RIGHT")&&a.x-firstEdge>=centre-S::CENTRE_TOL_MM&&a.x-firstEdge<=centre);
 assert(a.x-firstStrong<centre-S::CENTRE_TOL_MM);
 a.sample(a.x,0,-0.05,4095,4095);assert(a.p.left()>0&&a.p.right()<0);
 a.sample(a.x,0,-1.57,4095,4095);assert(a.at("SETTLE_RIGHT")&&a.p.left()==0&&a.p.right()==0);
 Run noClear=a;
 for(int i=0;i<5;i++)noClear.sample(noClear.x,0,-1.57,S::EXIT_FRONT_CLEAR_RAW-5,4095);
 assert(noClear.at("SEEK") && !noClear.p.done());
 Run exitOverturn=a;
 for(int i=0;i<5;i++)exitOverturn.sample(exitOverturn.x,0,-1.86f,4095,4095);
 assert(exitOverturn.at("SEEK") && !exitOverturn.p.done()); // Never CROSS on a rejected exit turn.
 for(int t=0;t<5;t++)a.sample(a.x,0,-1.57,4095,4095);
 assert(a.at("CROSS"));
 Run blocked=a;blocked.sample(blocked.x,blocked.y-2,-1.57,1700,4095);
 assert(blocked.at("SEEK") && !blocked.p.done());
 blocked.sample(blocked.x,blocked.y-2,-1.57,1700,4095);assert(blocked.at("TURN_LEFT"));
 for(int i=0;i<25&&!a.p.done();i++)a.sample(a.x,a.y-10,-1.57,4095,4095);
 assert(a.at("CANDIDATE")&&a.p.done()&&a.p.left()==0&&a.p.right()==0);
 Run b;b.wall();b.sample(b.x+2,0,0,1900,4095);assert(b.at("TURN_LEFT")); // corner outranks gap
 b.sample(b.x,0,0,1900,472);assert(b.at("TURN_LEFT")&&b.p.left()<0&&b.p.right()>0);
 b.sample(b.x,0,0.4f,1900,0);assert(b.at("TURN_LEFT")&&b.p.left()<0&&b.p.right()>0);
 b.sample(b.x,0,1.57,4095,3000);assert(b.at("SETTLE_LEFT"));for(int i=0;i<5;i++)b.sample(b.x,0,1.57,4095,3000);
 assert(b.at("ACQUIRE"));
 Run c;c.wall();for(int i=0;i<3;i++)c.sample(c.x+3,0,0,4095,4095);
 assert(c.at("CENTRE"));c.sample(c.x+2,0,0,4095,3000);assert(c.at("SEEK") && !c.p.done());
 Run g;g.wall(); // A weak edge alone cannot carry the axle past the usable centre window.
 for(int i=0;i<30&&g.at("FOLLOW");i++)g.sample(g.x+3,0,0,4095,edgeOnly);
 assert(g.at("SEEK") && !g.p.done());
 for(int i=0;i<8;i++)g.sample(g.x+3,0,0,4095,4095);
 assert(g.at("SEEK") && g.p.left()>0 && g.p.right()>0);
 // Rejecting the old edge must not suppress later corners or the explicit Stop.
 g.sample(g.x+3,0,0,1900,4095);assert(g.at("TURN_LEFT"));
 g.p.stop();assert(g.at("IDLE") && g.p.left()==0 && g.p.right()==0);
 Run unarmed;for(int i=0;i<4;i++)unarmed.sample(unarmed.x+2,0,0,4095,3000);
 assert(unarmed.at("FOLLOW"));unarmed.sample(unarmed.x+2,0,0,4095,4095);
 assert(unarmed.at("SEEK")); // Lost wall before tracking was established.
 // Long open floor is neither proof of an exit nor a navigation fault:
 // exceed both the old 90 s and 2200 mm run budgets while feedback is valid.
 Run far;for(int i=0;i<2000;i++)far.sample(far.x+2,0,0,4095,4095);
 assert(far.t==100000 && far.x==4000 && far.at("SEEK") && far.p.left()>0);
 Run d;d.sample(0,0,0,4095,4095,500);assert(d.at("SEEK")&&d.p.left()>0&&d.p.right()>0);
 d.sample(0,0,0,0,4095,500);assert(d.at("TURN_LEFT")); // low front still triggers the normal corner turn
 Run e;e.p.update(450,0,0,0,4095,4095,4095);assert(e.p.failed());
 Run f;for(int i=0;i<50&&!f.p.failed();i++)f.sample(0,0,0,4095,4095);
 assert(f.p.failed()&&f.p.left()==0&&f.p.right()==0);
}
