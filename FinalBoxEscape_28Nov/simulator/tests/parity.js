// Run in Node: node parity.js /absolute/path/to/engine.js /path/to/native-trace.tsv
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const [, ,engine,trace]=process.argv;
vm.runInThisContext(fs.readFileSync(engine,'utf8'),{filename:engine});
const core=new BoxCore();
let n=0, maxPoseDifference=0;const transitions=[];
for(const line of fs.readFileSync(trace,'utf8').trimEnd().split('\n')){
  const [kind,time,cmd,leftTicks,rightTicks,backLeft,front,backRight,mode,phase,leftPWM,rightPWM,calibrated,leftThreshold,rightThreshold,x,y,theta,note]=line.split('\t');
  const input={leftTicks:+leftTicks,rightTicks:+rightTicks,backLeft:+backLeft,front:+front,backRight:+backRight};
  if(kind==='c'){core.setInputs(input);core.command(cmd);}
  else if(kind==='t') core.tick(+time,input);
  const snap=core.snapshot(),ctx='sample '+n+', '+time+' ms, '+kind+' '+cmd+', '+mode+':'+phase;
  const fields={mode,phase,leftPWM:+leftPWM,rightPWM:+rightPWM,calibrated:!!Number(calibrated),leftThreshold:+leftThreshold,rightThreshold:+rightThreshold,note};
  for(const [key,value] of Object.entries(fields))assert.strictEqual(snap[key],value,ctx+' / '+key+' got '+snap[key]+' expected '+value);
  for(const [key,value] of Object.entries({x:+x,y:+y,theta:+theta})){
    const diff=Math.abs(snap[key]-value);
    assert.ok(Number.isFinite(diff)&&diff<.002,ctx+' / '+key+' diff '+diff);
    maxPoseDifference=Math.max(maxPoseDifference,diff);
  }
  if(transitions[transitions.length-1]!==phase)transitions.push(phase);
  n++;
}
console.log(n+' sample-by-sample native/JS records match in state, messages, calibrated thresholds, wheel commands and pose. Max numeric pose field difference '+maxPoseDifference.toPrecision(4)+'.');
console.log(transitions.join(' > '));
