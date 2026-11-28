// Closed-loop smoke experiment for EscapePilot only, not firmware or measured hardware.
// Build: c++ -std=c++17 -O2 -IBoxEscape tests/pilot_box_demo.cpp BoxEscape/EscapePilot.cpp -o /tmp/pilot_box
// Run from the extracted package's top directory. Optional: /tmp/pilot_box trace
// Geometry: 400 x 350 mm, 150 mm centered bottom opening; body radius 50 mm.
// Nine ideal rays and coarse IR response follow Hamad's earlier Sim5 approximations,
// not measured rear-sensor footprints. Perfect odometry, no motor deadband or coast.
#include "EscapePilot.h"
#include <cmath>
#include <cstring>
#include <cstdio>
#include <algorithm>
#include <limits>
namespace {
constexpr double pi=3.141592653589793,body=50;
struct Seg {double ax,ay,bx,by;};
constexpr Seg walls[]={{0,0,125,0},{275,0,400,0},{400,0,400,350},{400,350,0,350},{0,350,0,0}};
double clearance(double x,double y){
 double d=1e9;for(auto w:walls){double vx=w.bx-w.ax,vy=w.by-w.ay,u=std::clamp(((x-w.ax)*vx+(y-w.ay)*vy)/(vx*vx+vy*vy),0.,1.);
 d=std::min(d,std::hypot(x-w.ax-u*vx,y-w.ay-u*vy));}return d-body;
}
double ray(double x,double y,double a){double dx=std::cos(a),dy=std::sin(a),near=1e9;
 for(auto w:walls){double vx=w.bx-w.ax,vy=w.by-w.ay,den=dx*vy-dy*vx;if(std::abs(den)<1e-9)continue;
 double qx=w.ax-x,qy=w.ay-y,t=(qx*vy-qy*vx)/den,u=(qx*dy-qy*dx)/den;
 if(t>=0&&u>=0&&u<=1)near=std::min(near,t);}
 return near;
}
double raw(double d){constexpr double ds[]={5,10,50,100,120},a[]={260,390,3500,4085,4095};
 if(d<=ds[0])return a[0];for(int i=1;i<5;++i)if(d<=ds[i])return a[i-1]+(a[i]-a[i-1])*(d-ds[i-1])/(ds[i]-ds[i-1]);return 4095;}
int sense(double x,double y,double theta,int side){
 const double a=theta+side*135*pi/180,ox=x+50*std::cos(a),oy=y+50*std::sin(a);double strength=0,weights=0;
 for(int i=0;i<9;++i){double f=i/4.-1,off=f*(side?25:15)*pi/180,w=1-std::abs(f)/2;strength+=w*(4095-raw(ray(ox,oy,a+off)*std::cos(off)));weights+=w;}
 return std::lround(std::clamp(4095-strength/weights*(side?2.437:1.),0.,4095.));
}
void run(const char *name,double x,double y,double theta,bool log){
 EscapePilot c;c.begin(0,x,y,theta);double sideMargin=1e9;const char *last="",*out="time-limit";unsigned long t=0;
 for(;t<95000;t+=50){auto l=sense(x,y,theta,1),f=sense(x,y,theta,0),r=sense(x,y,theta,-1);
 c.update(t,x,y,theta,l,f,r);
 if(log&&std::strcmp(last,c.stateName()))std::printf("%lu %s pos=%.1f,%.1f angle=%.1f ADC=%d,%d,%d\n",t,c.stateName(),x,y,theta*180/pi,l,f,r);
 last=c.stateName();if(c.done()){out=y<-body?"confirmed outside":"candidate inside";break;}if(c.failed()){out=c.reason();break;}
 const double ll=c.left()*1.25*.05,rr=c.right()*1.25*.05,d=(rr+ll)/2,dt=(rr-ll)/90;
 const double q=std::abs(dt)>1e-9?std::sin(dt/2)/(dt/2):1;
 x+=d*q*std::cos(theta+dt/2);y+=d*q*std::sin(theta+dt/2);theta+=dt;
 sideMargin=std::min(sideMargin,clearance(x,y));if(sideMargin<0){out="modelled contact";break;}
 }
 std::printf("%s: %s (%.2fs, final axle %.1f, %.1f; minimum modelled clearance %.1f mm)\n",name,out,t/1000.,x,y,sideMargin);
}
}
int main(int argc,char**) {
 run("Along exit wall, 30 mm body clearance",85,80,0,argc>1);
 run("Along exit wall, 20 mm body clearance",85,70,0,argc>1);
 run("Room centre facing right-hand wall",200,175,0,argc>1);
}
