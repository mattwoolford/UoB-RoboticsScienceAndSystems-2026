/* Browser experiment coordinator: each real 10 ms controller tick takes encoder
 * counts and virtual ADC inputs only. Arena pose is reserved for the observer. */
(function (scope) {
  "use strict";
  const inputs=w=>({leftTicks:w.leftTicks,rightTicks:w.rightTicks,
    backLeft:w.backLeft,front:w.front,backRight:w.backRight});
  class BoxSim {
    constructor(options={}) {
      this.options={x:85,y:80,headingDeg:0,profile:'baseline',...options};this._reset();
    }
    _reset(){
      this.world=new BoxWorld(this.options); this.core=new BoxCore();
      this.elapsedMs=0;this.clock=0;this.status='ready';this.reason='Ready to run.';
      this.command='';this.lastActivePhase='';this.clock=50;
      const first=inputs(this.world.observe(false));this.core.setInputs(first);this.core.tick(this.clock,first); // real idle IR scan
    }
    _bench(){
      // Calibrate on clear virtual floor, reposition at chosen start as a real
      // operator would. Escape restarts its local odometry/encoder baseline.
      const bench=new BoxWorld({x:200,y:175,headingDeg:0,profile:this.options.profile});
      this.core.setInputs(inputs(bench.observe(false)));this.core.command('C');
      for(let t=0;t<40000;t+=10){
        const c=this.core.snapshot();if(c.calibrated)return true;if(c.mode==='FAULT')return false;
        bench.step(c.leftPWM,c.rightPWM,10);this.clock+=10;
        this.core.tick(this.clock,inputs(bench.observe(false)));
      }
      return false;
    }
    start(command='E'){
      let key=String(command).toUpperCase();
      if(!['C','S','T','L','P','G','V','E'].includes(key))throw Error('Unknown experiment command.');
      if(this.status==='running')return false;
      this._reset(); this.command=key;
      // Match the real baseline: escape does not run the virtual calibration first.
      if(key!=='E'&&key!=='C'&&!this._bench()){this.status='fault';this.reason='Virtual motor calibration did not complete.';return false;}
      const i=inputs(this.world.observe(false));this.core.setInputs(i);
      // Refresh any sensor cache that may contain the virtual bench observations.
      this.clock+=50;this.core.tick(this.clock,i);
      this.core.command(key);const c=this.core.snapshot();
      this.reason=c.note||'Running';this.lastActivePhase=c.phase;
      if(c.mode==='IDLE'||c.mode==='FAULT'){
        this.status=c.mode==='FAULT'?'fault':'stopped';return false;
      }
      this.status='running';return true;
    }
    tick(){
      if(this.status!=='running')return;
      const prev=this.core.snapshot(); this.lastActivePhase=prev.phase;
      this.world.step(prev.leftPWM,prev.rightPWM,10);this.clock+=10;this.elapsedMs+=10;
      const w=this.world.observe(false);
      this.core.tick(this.clock,inputs(w));
      const c=this.core.snapshot();
      if(w.contact){this.status='contact';this.reason='Robot body touched a wall or doorpost during '+this.lastActivePhase+'.';this.core.command('X');}
      else if(c.mode==='FAULT'){this.status='fault';this.reason=c.note;}
      else if(c.mode==='IDLE'){
        if(this.command==='E'){
          const candidate=/candidate/i.test(c.note);
          this.status=candidate&&w.outside?'escaped':'stopped';
          this.reason=candidate?(w.outside?'Whole body cleared the doorway; motors stopped.':'Controller finished crossing, but the body did not clear the doorway.'):c.note;
        }else if(this.command==='C'){
          this.status=c.calibrated?'complete':'stopped';this.reason=c.note;
        }else if(/wall|obstacle|stopped|blocked/i.test(c.note)){this.status='stopped';this.reason=c.note;}
        else{this.status='complete';this.reason=c.note;}
      }else if(this.command!=='E' && this.elapsedMs>=100000){this.status='stopped';this.reason='Simulation time limit reached.';this.core.command('X');}
      else{this.reason=c.note;this.lastActivePhase=c.phase;}
    }
    stop(){
      if(this.status!=='running')return;
      this.lastActivePhase=this.core.snapshot().phase;
      this.core.command('X');this.status='stopped';this.reason='Stopped by operator.';
    }
    snapshot(){
      return {world:this.world.observe(true),core:this.core.snapshot(),elapsedMs:this.elapsedMs,
        status:this.status,reason:this.reason,command:this.command,lastActivePhase:this.lastActivePhase};
    }
  }
  scope.BoxSim=BoxSim;
})(globalThis);
