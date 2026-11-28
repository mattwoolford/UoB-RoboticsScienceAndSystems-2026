/* Closed-loop model inputs for the physical Stamp-C3 program. Distances in mm,
   time in ms, headings counterclockwise from +x (the lab floor's right).
   No map coordinates or collision information are given to firmware. */
(function (scope) {
  "use strict";
  const W=400,H=350,R=50,TRACK=90,TICKS_PER_MM=358.3/(Math.PI*32);
  const WALLS=Object.freeze([[0,0,125,0],[275,0,400,0],[400,0,400,350],[400,350,0,350],[0,350,0,0]].map(Object.freeze));
  const PRESETS=Object.freeze([
    Object.freeze({id:'wall30',label:'Right wall · 30 mm',x:85,y:80,headingDeg:0}),
    Object.freeze({id:'wall20',label:'Right wall · 20 mm',x:85,y:70,headingDeg:0}),
    Object.freeze({id:'centre',label:'Centre · facing east',x:200,y:175,headingDeg:0})
  ]);
  const clip=(x,a,b)=>Math.max(a,Math.min(b,x)),rad=x=>x*Math.PI/180;
  function clearance(x,y){
    let d=Infinity;for(const [ax,ay,bx,by] of WALLS){let vx=bx-ax,vy=by-ay;
      const u=clip(((x-ax)*vx+(y-ay)*vy)/(vx*vx+vy*vy),0,1);
      d=Math.min(d,Math.hypot(x-ax-u*vx,y-ay-u*vy));} return d-R;
  }
  function ray(x,y,angle){
    const dx=Math.cos(angle),dy=Math.sin(angle);let near=Infinity;
    for(const [ax,ay,bx,by] of WALLS){const vx=bx-ax,vy=by-ay,den=dx*vy-dy*vx;
      if(Math.abs(den)<1e-9)continue;const qx=ax-x,qy=ay-y,t=(qx*vy-qy*vx)/den,u=(qx*dy-qy*dx)/den;
      if(t>=0&&u>=0&&u<=1)near=Math.min(near,t);
    } return near;
  }
  // The reference profile reproduces the prior single-box pilot fixture's
  // coarse distance curve; these values are not a fit to this week's measurements.
  const REFERENCE=[[5,260],[10,390],[50,3500],[100,4085],[120,4095]];
  // Optional front-only interpolation using Hamad's measured runs 3 / 4 / 8 / 9a.
  // 13cm was placement-sensitive; this curve is illustrative, not a rear calibration.
  const MEASURED=[[5,260],[10,390],[50,3022],[100,3902],[120,4041],[130,4095]];
  function raw(distance,curve){
    if(distance<=curve[0][0])return curve[0][1];
    for(let i=1;i<curve.length;i++){const [x,y]=curve[i], [px,py]=curve[i-1];if(distance<=x)return py+(distance-px)*(y-py)/(x-px);}
    return 4095;
  }
  function sense(x,y,theta,measured,showBeams){
    const reading={},beams=[];
    for(const [name,side] of [['backLeft',1],['front',0],['backRight',-1]]){
      const a=theta+rad(135*side),ox=x+R*Math.cos(a),oy=y+R*Math.sin(a);
      let strength=0,weights=0;const curve=side===0&&measured?MEASURED:REFERENCE,max=curve[curve.length-1][0];
      for(let i=0;i<9;i++){
        const fraction=i/4-1,offset=rad(fraction*(side?25:15)),w=1-Math.abs(fraction)/2,angle=a+offset;
        const d=ray(ox,oy,angle),projected=d*Math.cos(offset);strength+=w*(4095-raw(projected,curve));weights+=w;
        if(showBeams){
          const hit=projected<max,range=Math.min(d,max/Math.cos(offset));
          beams.push({sensor:name,x1:ox,y1:oy,x2:ox+range*Math.cos(angle),y2:oy+range*Math.sin(angle),central:i===4,hit});
        }
      }
      reading[name]=Math.round(clip(4095-strength/weights*(side?2.437:1),0,4095));
    }
    return {...reading,beams};
  }
  class BoxWorld {
    constructor(options={}) {this.reset(options);}
    reset({x=85,y=80,headingDeg=0,profile='baseline'}={}) {
      if(!BoxWorld.validStart(x,y)||!Number.isFinite(headingDeg))throw Error('Place the entire robot inside the box, clear of all walls.');
      this.x=x;this.y=y;this.theta=rad(headingDeg);this.profile=profile;
      this.leftDistance=this.rightDistance=0;this.minClearance=clearance(x,y);
      this.contact=false;this.crossed=false;this.ms=0;this.cache=this.fullCache=null;
    }
    static validStart(x,y){return Number.isFinite(x)&&Number.isFinite(y)&&x>=R&&x<=W-R&&y>=R&&y<=H-R&&clearance(x,y)>=-1e-8;}
    get leftTicks(){return Math.round(this.leftDistance*TICKS_PER_MM);}
    get rightTicks(){return Math.round(this.rightDistance*TICKS_PER_MM);}
    step(leftPWM,rightPWM,dtMs=10) {
      if(!Number.isFinite(dtMs)||dtMs<=0||dtMs>100)throw Error('Expected a step of 1 to 100 ms.');
      if(!Number.isFinite(leftPWM)||!Number.isFinite(rightPWM))throw Error('Invalid motor command.');
      for(let remaining=dtMs;remaining>0;remaining-=10){
        const dt=Math.min(10,remaining)/1000;this.ms+=dt*1000;if(this.contact)continue;
        const ll=Math.abs(leftPWM)>=8?leftPWM*1.25*dt:0,rr=Math.abs(rightPWM)>=12?rightPWM*1.25*dt:0;
        this.leftDistance+=ll;this.rightDistance+=rr;
        // Uneven traction reduces right *ground travel*, but the encoder still
        // counts wheel rotation. The optional 6% slip is illustrative, not measured.
        const rg=rr*(this.profile==='uneven'?0.94:1),d=(ll+rg)/2,da=(rg-ll)/TRACK;
        const sinc=Math.abs(da)>1e-9?Math.sin(da/2)/(da/2):1;
        const nx=this.x+d*sinc*Math.cos(this.theta+da/2),ny=this.y+d*sinc*Math.sin(this.theta+da/2);
        if(this.y>=0&&ny<0){const tx=this.x+(nx-this.x)*this.y/(this.y-ny);if(tx>=125&&tx<=275)this.crossed=true;}
        this.x=nx;this.y=ny;this.theta+=da;
        const c=clearance(nx,ny);this.minClearance=Math.min(this.minClearance,c);this.contact=c< -1e-7;
      }
      this.cache=this.fullCache=null;
    }
    observe(withBeams=true){
      if(withBeams&&this.fullCache)return this.fullCache;
      if(!withBeams&&this.cache)return this.cache;
      const v={x:this.x,y:this.y,theta:this.theta,headingDeg:this.theta*180/Math.PI,
        leftTicks:this.leftTicks,rightTicks:this.rightTicks,ms:this.ms,
        ...sense(this.x,this.y,this.theta,this.profile==='measured',withBeams),
        clearance:clearance(this.x,this.y),minClearance:this.minClearance,
        contact:this.contact,outside:this.crossed&&this.y< -R&&!this.contact,
        walls:WALLS,width:W,height:H,radius:R};
      if(withBeams)this.fullCache=v;else this.cache=v;return v;
    }
  }
  BoxWorld.presets=PRESETS;BoxWorld.walls=WALLS;BoxWorld.width=W;BoxWorld.height=H;BoxWorld.radius=R;
  scope.BoxWorld=BoxWorld;
})(globalThis);
