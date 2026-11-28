// End-to-end: verify the trial from geometric ground truth, separately from firmware.
// Optional first argument is the path to a directory containing real source bundles.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const dir=process.argv[2]||path.resolve(__dirname,'../engine');
if(process.env.BOX_ORACLE_EXE)require('./nativebox.js');
for(const f of (process.env.BOX_ORACLE_EXE?['world.js','sim.js']:['engine.js','world.js','sim.js']))vm.runInThisContext(fs.readFileSync(path.join(dir,f),'utf8'),{filename:f});
let complete=0;
for(const cmd of ['E','C','T','L','S']){
 for(const preset of (cmd==='E'?BoxWorld.presets:[BoxWorld.presets[2]])){
  const s=new BoxSim(preset);assert.ok(s.start(cmd), 'Start '+cmd+' '+preset.id);
  let n=0,continuedThroughCloseReading=false;const phases=new Set();
  while(s.status==='running'&&n++<12000){
   const c=s.core.snapshot(); phases.add(c.phase);
   if(c.phase==='TURN_LEFT'&&c.backRight<700&&c.leftPWM<0&&c.rightPWM>0)continuedThroughCloseReading=true;
   s.tick();
  }
  const b=s.snapshot(),w=b.world,c=b.core;
  assert.ok(!['running','ready'].includes(s.status),'Terminal result required');
  assert.equal(c.leftPWM,0);assert.equal(c.rightPWM,0);
  assert.ok(Number.isFinite(w.x)&&Number.isFinite(w.y),'Finite ground-truth position');
  assert.ok(!w.outside||!w.contact);
  if(cmd==='E'){assert.equal(c.calibrated,false,'Escape must not auto-calibrate');assert.ok(w.outside&&!w.contact, 'Whole body must exit'); assert.equal(s.status,'escaped');}
  if(cmd==='E'&&preset.id==='centre')assert.ok(continuedThroughCloseReading,'Continue left corner turn with low rear IR');
  if(cmd==='C'){assert.equal(s.status,'complete');assert.ok(c.calibrated);}
  if(cmd==='T'||cmd==='L'){assert.equal(s.status,'complete');assert.ok(Math.abs(c.theta*(cmd==='T'?-1:1)-Math.PI/2)<.05);}
  console.log(cmd+' '+preset.id+' => '+s.status+'; '+(b.elapsedMs/1000).toFixed(2)+' s; '+s.reason+'; clearance '+w.minClearance.toFixed(1)+' mm; phases '+[...phases].join('/'));
  complete++;
 }
}
// Expiry of the visualiser's previous 100 s clock must never terminate an escape.
const stillSearching=new BoxSim(BoxWorld.presets[2]);assert.ok(stillSearching.start('E'));
stillSearching.elapsedMs=99990;stillSearching.tick();assert.equal(stillSearching.status,'running');
stillSearching.stop();assert.equal(stillSearching.status,'stopped');assert.equal(stillSearching.core.snapshot().leftPWM,0);
console.log(complete+' integrated trial checks passed; elapsed time alone does not stop escape.');
