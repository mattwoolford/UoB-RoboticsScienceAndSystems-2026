#include "EscapePilot.h"
#include "EscapeSettings.h"
#include <math.h>
namespace S = EscapeSettings;
namespace {
constexpr float RAD=0.01745329252f, HALF_PI_RAD=90.0f*RAD, TWO_PI_RAD=360.0f*RAD;
float clip(float v,float lo,float hi){return v<lo?lo:(v>hi?hi:v);}
float forwardFrom(float x,float y,float ox,float oy,float theta){
  return (x-ox)*cosf(theta)+(y-oy)*sinf(theta);
}
}
const char* EscapePilot::stateName() const {
  static const char* const names[]={"IDLE","SEEK","TURN_LEFT","SETTLE_LEFT","ACQUIRE",
    "FOLLOW","CENTRE","TURN_RIGHT","SETTLE_RIGHT","CROSS","CANDIDATE","FAULT"};
  return names[state];
}
void EscapePilot::stop(){state=IDLE;lp=rp=0;message="Stopped.";}
void EscapePilot::fail(const char* why){state=FAULT;lp=rp=0;message=why;}
void EscapePilot::enter(Stage next,uint32_t now,float x,float y,float theta){
  state=next;stateAt=movingAt=now;statePath=path;
  anchorX=x;anchorY=y;anchorTheta=theta;lp=rp=0;
}
void EscapePilot::restartSearch(uint32_t now,float x,float y,float theta,const char* why){
  // Keep the trial and its odometry. Forget the old wall/doorway before looking again.
  wallSeen=wallArmed=edgeSeen=gapSeen=false;
  path=wallPath=gapPath=0;
  heading=theta;
  enter(SEEK,now,x,y,theta);message=why;
}
void EscapePilot::begin(uint32_t now,float x,float y,float theta){
  stop();if(!isfinite(x)||!isfinite(y)||!isfinite(theta)){fail("Invalid odometry.");return;}
  if(!(S::RIGHT_TARGET_RAW<=S::RIGHT_WALL_RAW && S::RIGHT_WALL_RAW<S::RIGHT_EDGE_RAW &&
       S::RIGHT_EDGE_RAW<S::RIGHT_OPEN_RAW && S::RIGHT_OPEN_RAW<=4095 &&
       S::FRONT_TURN_RAW<S::EXIT_FRONT_CLEAR_RAW &&
       S::EXIT_FRONT_CLEAR_RAW<=4095)){fail("Invalid IR threshold order.");return;}
  const float halfSlack=(S::OPENING_WIDTH_MM-S::BODY_WIDTH_MM)/2.0f;
  if(halfSlack<=S::SIDE_MARGIN_MM || S::EDGE_TO_AXLE_OFFSET_MM<0 ||
     S::OPENING_WIDTH_MM/2.0f-S::EDGE_TO_AXLE_OFFSET_MM < S::GAP_CONFIRM_MM ||
     S::CENTRE_TOL_MM >= halfSlack-S::SIDE_MARGIN_MM){
    fail("Check measured body, opening and edge offset.");return;
  }
  path=0;previousAt=now;prevX=x;prevY=y;heading=theta;
  wallSeen=wallArmed=edgeSeen=gapSeen=false;
  enter(SEEK,now,x,y,theta);message="Seek a wall.";
}
void EscapePilot::startTurn(bool toExit,uint32_t now,float x,float y,float theta){
  turnStart=theta;turnTarget=theta+(toExit?-HALF_PI_RAD:HALF_PI_RAD);
  enter(toExit?TURN_RIGHT:TURN_LEFT,now,x,y,theta);
  wallArmed=wallSeen=edgeSeen=gapSeen=false;
  message=toExit?"Turn into candidate opening.":"Turn left to keep wall on right.";
}
void EscapePilot::steer(float theta,float target){
  // Positive steering turns anticlockwise: the right wheel must run faster.
  float err=remainderf(target-theta,TWO_PI_RAD);
  int trim=(int)lroundf(clip(42.0f*err,-S::MAX_STEER_PWM,S::MAX_STEER_PWM));
  lp=S::DRIVE_PWM-trim;rp=S::DRIVE_PWM+trim;
}
void EscapePilot::update(uint32_t now,float x,float y,float theta,
                         uint16_t /*backLeft*/,uint16_t front,uint16_t backRight){
  if(state==IDLE||state==FAULT||state==CANDIDATE)return;
  if(!isfinite(x)||!isfinite(y)||!isfinite(theta)){fail("Invalid odometry.");return;}
  if(now-previousAt>S::OBSERVATION_LIMIT_MS){fail("Observation timeout.");return;}
  // Back-left is still logged; no raw reading alone stops every escape phase.
  path+=hypotf(x-prevX,y-prevY);prevX=x;prevY=y;previousAt=now;
  if(state==TURN_LEFT||state==TURN_RIGHT){
    const float sign=state==TURN_LEFT?1.0f:-1.0f;
    const float travel=sign*(theta-turnStart);  // Paul's unwrapped encoder heading
    if(travel < -10.0f*RAD){fail("Turn moved in the wrong direction.");return;}
    if(now-stateAt>S::TURN_LIMIT_MS){fail("Turn timeout.");return;}
    if(travel>=HALF_PI_RAD-S::STOP_EARLY_DEG*RAD){
      enter(state==TURN_LEFT?SETTLE_LEFT:SETTLE_RIGHT,now,x,y,theta);return;
    }
    lp=sign>0?-S::TURN_PWM:S::TURN_PWM;rp=-lp;return;
  }
  if(state==SETTLE_LEFT||state==SETTLE_RIGHT){
    lp=rp=0;if(now-stateAt<S::SETTLE_MS)return;
    if(fabsf(turnTarget-theta)>S::SETTLED_TOL_DEG*RAD){
      restartSearch(now,x,y,theta,"Retry: turn settled outside tolerance; seek a wall.");return;
    }
    const bool exiting=state==SETTLE_RIGHT;heading=theta;
    if(exiting && front<S::EXIT_FRONT_CLEAR_RAW){
      restartSearch(now,x,y,theta,"Retry: no clearance after exit turn; seek a wall.");return;
    }
    enter(exiting?CROSS:ACQUIRE,now,x,y,theta);
    message=exiting?"Crossing candidate opening.":"Reacquiring right wall.";return;
  }
  // Watch fresh odometry for forward motion. Pure spinning cannot pass this
  // check. A complete encoder failure is handled separately by Controller.
  if(lp>0&&rp>0 && now-movingAt>=S::STALL_MS){
    if(forwardFrom(x,y,anchorX,anchorY,anchorTheta)<2.0f){fail("No forward progress.");return;}
    anchorX=x;anchorY=y;anchorTheta=theta;movingAt=now;
  }
  if(state==CROSS){
    if(front<=S::FRONT_TURN_RAW){
      restartSearch(now,x,y,theta,"Retry: obstacle in exit path; seek a wall.");return;
    }
    if(forwardFrom(x,y,edgeX,edgeY,heading)>=S::EXIT_TRAVEL_MM){
      enter(CANDIDATE,now,x,y,theta);message="Candidate exit; verify whole body outside.";return;
    }
    steer(theta,heading);return;
  }
  if(state==CENTRE){
    if(front<=S::FRONT_TURN_RAW){
      restartSearch(now,x,y,theta,"Retry: obstructed while centring; seek a wall.");return;
    }
    if(backRight<S::RIGHT_OPEN_RAW){
      restartSearch(now,x,y,theta,"Retry: candidate gap did not stay open; seek a wall.");return;
    }
    const float d=forwardFrom(x,y,edgeX,edgeY,edgeHeading);
    const float centre=S::OPENING_WIDTH_MM/2.0f-S::EDGE_TO_AXLE_OFFSET_MM;
    const float slack=(S::OPENING_WIDTH_MM-S::BODY_WIDTH_MM)/2.0f-S::SIDE_MARGIN_MM;
    if(d>centre+slack){
      restartSearch(now,x,y,theta,"Retry: overshot opening centre; seek a wall.");return;
    }
    if(d>=centre-S::CENTRE_TOL_MM){
      // Keep the axle position before starting the point turn for exit travel.
      edgeX=x;edgeY=y;startTurn(true,now,x,y,theta);return;
    }
    steer(theta,edgeHeading);return;
  }
  if(front<=S::FRONT_TURN_RAW){
    startTurn(false,now,x,y,theta);return;
  }
  if(state==SEEK||state==ACQUIRE){
    if(backRight<=S::RIGHT_WALL_RAW){
      if(!wallSeen){wallSeen=true;wallAt=now;wallPath=path;}
      if(now-wallAt>=S::WALL_CONFIRM_MS){
        heading=theta;wallArmed=false;enter(FOLLOW,now,x,y,theta);
        message="Following right wall.";return;
      }
    }else wallSeen=false;
    if(state==ACQUIRE && path-statePath>=S::ACQUIRE_LIMIT_MM){
      restartSearch(now,x,y,theta,"Retry: right wall not reacquired; seek a wall.");return;
    }
    steer(theta,heading);return;
  }
  if(state==FOLLOW){
    if(backRight<=S::RIGHT_WALL_RAW){
      if(!wallSeen){wallSeen=true;wallAt=now;wallPath=path;}
      if(now-wallAt>=S::WALL_CONFIRM_MS && path-wallPath>=S::WALL_TRACK_MM)wallArmed=true;
    }else wallSeen=false;
    if(backRight>=S::RIGHT_EDGE_RAW && wallArmed){
      // Remember where the signal STARTED falling away, not where the last
      // backward-looking ray went clear. Hold heading instead of turning into
      // the gap before the axle is in position.
      if(!edgeSeen){edgeSeen=true;edgeX=x;edgeY=y;edgeHeading=theta;}
      const float d=forwardFrom(x,y,edgeX,edgeY,edgeHeading);
      const float centre=S::OPENING_WIDTH_MM/2.0f-S::EDGE_TO_AXLE_OFFSET_MM;
      const float slack=(S::OPENING_WIDTH_MM-S::BODY_WIDTH_MM)/2.0f-S::SIDE_MARGIN_MM;
      if(d>centre+slack){
        restartSearch(now,x,y,theta,"Retry: opening not confirmed before centring window ended; seek a wall.");return;
      }
      if(backRight>=S::RIGHT_OPEN_RAW){
        if(!gapSeen){gapSeen=true;gapAt=now;gapPath=d;}
        if(now-gapAt>=S::GAP_CONFIRM_MS && d-gapPath>=S::GAP_CONFIRM_MM){
          enter(CENTRE,now,x,y,theta);message="Centring on candidate opening.";return;
        }
      }else gapSeen=false;
      steer(theta,edgeHeading);return;
    }
    if(backRight>=S::RIGHT_OPEN_RAW&&!wallArmed){
      restartSearch(now,x,y,theta,"Retry: right wall lost before tracking was established; seek a wall.");return;
    }
    edgeSeen=gapSeen=false;
    // Near right wall => aim slightly left. Weak return => aim slightly right.
    // Bounded against the heading when acquired, assuming a straight box wall.
    float shift=clip((S::RIGHT_TARGET_RAW-(float)backRight)*0.00016f,-0.18f,0.18f);
    steer(theta,heading+shift);
  }
}
