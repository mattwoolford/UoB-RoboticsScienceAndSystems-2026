(()=>{
'use strict';
const $=id=>document.getElementById(id), svgNS='http://www.w3.org/2000/svg';
const specs=[['backLeft','Back left','#7866a8'],['front','Front','#3987a2'],['backRight','Back right','#b56736']];
for(const [key,label,color] of specs){ const row=document.createElement('div');row.className='signal-row';row.style.setProperty('--s',color);row.innerHTML='<span><i class="swatch"></i>'+label+'</span><span class="track"><i id="bar-'+key+'"></i></span><span id="val-'+key+'" class="sensor-val">—</span>';$('sensorList').appendChild(row); }
if(/^https?:$/.test(location.protocol))$('filelinks').hidden=false;
let sim, snap, pose={x:85,y:80,headingDeg:0}, preset='wall30', profile='baseline', live=false, paused=false, placing=false, command='E', frames=0, carry=0, last=0, rows=[], trace=[], tUi=0, sampleAt=-1, lastPhase='',drawLast=-1;
// Bound memory in open-ended searches without stopping motion. Normal trials keep all rows.
const MAX_ROWS=8192,MAX_TRAIL=2048;let discarded=0;
const counterKey='box-escape.sim.counter.v1';
let counter=0, currentTrial=null, lastFinal=null;
function nextSimTrial(){
  // Persist the sequence in this browser. If storage is blocked, keep session
  // numbering and include the time so downloaded files remain distinguishable.
  let persistent=true;
  try{const saved=Number(localStorage.getItem(counterKey));if(Number.isSafeInteger(saved)&&saved>=0)counter=Math.max(counter,saved);}catch(_){persistent=false;}
  counter++;try{localStorage.setItem(counterKey,String(counter));}catch(_){persistent=false;}
  const tag=String(counter).padStart(4,'0');
  return {tag,base:'box-escape-sim-test-'+tag+(persistent?'':'-'+Date.now())};
}
const arena=$('arena'), hints='The wall presets start parallel to the exit wall. 0° faces right.', poses={wall30:{x:85,y:80},wall20:{x:85,y:70},centre:{x:200,y:175}};
const allStatus={ready:'READY',running:'RUNNING',escaped:'ESCAPED',contact:'CONTACT',stopped:'STOPPED',complete:'COMPLETE',fault:'STOPPED'};
const phaseHelp={SEEK:'Driving straight to find a wall.',TURN_LEFT:'Turning left to keep the wall on the right.',SETTLE_LEFT:'Waiting for the wheels to settle.',ACQUIRE:'Looking for the wall after the turn.',FOLLOW:'Tracking the right wall and looking for an opening.',CENTRE:'Opening confirmed. Moving the axle into position.',TURN_RIGHT:'Turning right toward the opening.',SETTLE_RIGHT:'Checking heading and clearance after the turn.',CROSS:'Driving across the candidate opening.',CANDIDATE:'The controller finished its exit movement.'};
function msg(str,kind){if($('message').textContent!==str)$('message').textContent=str;$('message').dataset.kind=kind||'';}
function setHint(t,b){$('placehint').textContent=t;$('placehint').dataset.attention=b?'true':'false';}
function create(){const value=parseInt($('angle').value,10);pose.headingDeg=Number.isFinite(value)?value:0;profile=$('profile').value;sim=new BoxSim({...pose,profile});snap=sim.snapshot();live=paused=false;carry=last=tUi=0;trace=[];rows=[];discarded=0;currentTrial=null;sampleAt=-1;lastPhase='';drawLast=-1;command='E';setHint(hints,false);render();}
function showError(err){live=false;paused=false;$('errorBox').textContent='The simulator could not start: '+(err&&err.message?err.message:String(err));$('run').disabled=true;}
function arm(c){try{if(snap.status!=='ready')create();placing=false;command=c;currentTrial=c==='E'?nextSimTrial():null;sim.start(c);snap=sim.snapshot();live=snap.status==='running';paused=false;carry=0;last=0;record(true);if(!live)finishEscape();render();}catch(e){showError(e);}}
function choose(key){if(live||paused)return;pose={...poses[key],headingDeg:0};preset=key;placing=false;$('angle').value='0';create();}
function angleDeg(t){return t*180/Math.PI;}function norm(a){return ((a+180)%360+360)%360-180;}
function projected(c){const h=pose.headingDeg*Math.PI/180,cs=Math.cos(h),sn=Math.sin(h);return {x:pose.x+cs*c.x-sn*c.y,y:pose.y+sn*c.x+cs*c.y,a:norm(pose.headingDeg+angleDeg(c.theta))};}
function classify(){return snap.status==='escaped'?'good':snap.status==='contact'||snap.status==='fault'?'bad':snap.status==='running'&&!paused?'go':'';}
function record(force){const w=snap.world,c=snap.core,t=snap.elapsedMs;if(!force && t-sampleAt<50 && c.phase===lastPhase)return; if(sampleAt===t&&rows.length&&rows[rows.length-1][2]===snap.status)return;sampleAt=t;lastPhase=c.phase;const o=projected(c);const f=n=>Number.isFinite(n)?Number(n.toFixed(3)):'';if(rows.length>=MAX_ROWS){rows.splice(0,512);discarded+=512;}rows.push([t,command,snap.status,c.mode,c.phase,profile,pose.x,pose.y,pose.headingDeg,c.backLeft,c.front,c.backRight,c.leftPWM,c.rightPWM,w.leftTicks,w.rightTicks,f(w.x),f(w.y),f(w.headingDeg),...(command==='C'?['','','']:[f(o.x),f(o.y),f(o.a)]),f(w.clearance),f(w.minClearance),w.outside?1:0,w.contact?1:0,snap.lastActivePhase||'',snap.reason||'']);
 const p=trace[trace.length-1];if(!p||Math.hypot(p.x-w.x,p.y-w.y)>=1){if(trace.length>=MAX_TRAIL){trace.splice(0,128);drawLast=-1;}trace.push({x:w.x,y:w.y});}}
function markXY(){const w=snap.world, c=snap.core;if(!w||!c)return;const a=Number.isFinite(w.headingDeg)?w.headingDeg:angleDeg(w.theta);arena.setAttribute('viewBox','-48 -34 500 '+Math.max(453,Math.ceil(350-w.y+64+34)));$('bot').setAttribute('transform','translate('+w.x+' '+(350-w.y)+') rotate('+(-a)+')');if(trace.length!==drawLast){$('trail').setAttribute('d',trace.map((p,i)=>(i?'L':'M')+p.x.toFixed(1)+','+(350-p.y).toFixed(1)).join(' '));drawLast=trace.length;}
 const group=$('raysSvg');if(!$('rays').checked){group.replaceChildren();return;}const beams=w.beams||[];const frag=document.createDocumentFragment();for(const [key,,color] of specs){const b=beams.filter(o=>o.sensor===key);if(!b.length)continue;const first=b[0], rays=b.map(o=>o.x2.toFixed(1)+','+(350-o.y2).toFixed(1)).join(' ');const fan=document.createElementNS(svgNS,'polygon');fan.setAttribute('points',first.x1+','+(350-first.y1)+' '+rays);fan.setAttribute('fill',color);fan.setAttribute('opacity','.115');frag.appendChild(fan);const ray=b.find(o=>o.central)||b[Math.floor(b.length/2)];const el=document.createElementNS(svgNS,'line');for(const [k,v]of Object.entries({x1:ray.x1,y1:350-ray.y1,x2:ray.x2,y2:350-ray.y2,stroke:color,'stroke-width':'1.2','stroke-dasharray':'4 3',opacity:'.8'}))el.setAttribute(k,v);frag.appendChild(el);if(ray.hit){const dot=document.createElementNS(svgNS,'circle');dot.setAttribute('cx',ray.x2);dot.setAttribute('cy',350-ray.y2);dot.setAttribute('r','2.3');dot.setAttribute('fill',color);frag.appendChild(dot);}}
 group.replaceChildren(frag);}
function render(){if(!snap)return;const w=snap.world,c=snap.core,ready=snap.status==='ready',act=live||paused,kind=classify();$('hudtext').textContent=paused?'PAUSED':allStatus[snap.status]||snap.status.toUpperCase();$('hud').dataset.kind=kind;$('time').textContent=(snap.elapsedMs/1000).toFixed(2)+' s';$('pwms').textContent=c.leftPWM+' / '+c.rightPWM;$('phase').textContent=c.mode==='ESCAPE'?c.phase:(!ready&&!act&&snap.lastActivePhase?c.mode+' · '+snap.lastActivePhase:c.mode);
 const descriptions={C:'Measuring each simulated wheel’s starting power.',S:'Driving the bounded straight-line test.',T:'Checking a clockwise point turn.',L:'Checking an anticlockwise point turn.'};
 if(ready)msg('Ready for a simulated escape run.');else if(paused)msg('Paused. Resume to continue this trial.');else if(live)msg(command==='E'?(phaseHelp[c.phase]||c.note||'Controller running.'):(descriptions[command]||c.note||'Controller running.'));else if(snap.status==='escaped')msg('Escaped — the entire robot cleared the doorway.',kind);else if(snap.status==='fault'){const phase=snap.lastActivePhase||c.phase;msg((phase?'Stopped during '+phase+': ':'Stopped: ')+(snap.reason||c.note||'Controller fault.'),kind);}else if(command==='C'&&snap.status==='complete')msg('Calibrated: left starting PWM '+c.leftThreshold+', right '+c.rightThreshold+'.');else msg(snap.reason||c.note||'Trial complete.',kind);
 for(const [k] of specs){const raw=c[k];$('val-'+k).textContent=Number.isFinite(raw)?Math.round(raw):'—';$('bar-'+k).style.width=Number.isFinite(raw)?(100*(4095-raw)/4095).toFixed(1)+'%':'0%';}
 const od=projected(c), showOdo=!(command==='C'&&!ready);const vals={tx:w.x,ty:w.y,ta:norm(w.headingDeg),ox:showOdo?od.x:NaN,oy:showOdo?od.y:NaN,oa:showOdo?od.a:NaN};for(const [k,v] of Object.entries(vals))$(k).textContent=Number.isFinite(v)?Math.round(v)+(k.endsWith('a')?'°':''):'—';
 $('runlabel').textContent=live?'Pause':paused?'Resume':ready?'Run escape':'Run escape again';$('playicon').setAttribute('href',live?'#i-pause':'#i-play');$('stop').disabled=!act;$('reset').disabled=act;
 $('csv').disabled=!rows.length;$('csvlabel').textContent=currentTrial?(act?'Download partial CSV':'Download final CSV'):'Export CSV';
 $('sampleCount').textContent=rows.length?((currentTrial?'SIM test '+currentTrial.tag:'Bench test '+command)+' · '+rows.length+' samples'+(discarded?' · '+discarded+' earlier samples trimmed':'')+(currentTrial?(act?' · recording':' · final'):'')):'No samples yet';
 $('previousCsv').hidden=!lastFinal||currentTrial===lastFinal.trial;if(lastFinal)$('previousCsv').textContent='Download last final CSV · SIM '+lastFinal.trial.tag;
 $('angle').disabled=act;$('profile').disabled=act;$('angleval').textContent=pose.headingDeg+'°';for(const btn of document.querySelectorAll('[data-p]')){btn.disabled=act;btn.setAttribute('aria-pressed',String(!placing&&btn.dataset.p===preset));}for(const btn of document.querySelectorAll('[data-cmd]'))btn.disabled=act;$('place').disabled=act;$('place').setAttribute('aria-pressed',String(placing||preset==='custom'));arena.classList.toggle('place',placing);markXY();}
function animate(stamp){if(live){if(!last)last=stamp;const elapsed=Math.max(0,Math.min(85,stamp-last));last=stamp;carry+=elapsed*Number($('speed').value);try{while(carry>=10&&live){sim.tick();carry-=10;snap=sim.snapshot();record(snap.status!=='running');if(snap.status!=='running'){live=false;paused=false;finishEscape();}}if(stamp-tUi>=45||!live){render();tUi=stamp;}}catch(e){showError(e);}}else last=0;requestAnimationFrame(animate);}
$('run').addEventListener('click',()=>{if(live){live=false;paused=true;render();return;}if(paused){live=true;paused=false;last=0;render();return;}arm('E');});
$('stop').addEventListener('click',()=>{if(!live&&!paused)return;sim.stop();snap=sim.snapshot();live=paused=false;carry=last=0;record(true);finishEscape();render();});
$('reset').addEventListener('click',()=>{if(live||paused)return;placing=false;create();});
document.querySelectorAll('[data-p]').forEach(el=>el.addEventListener('click',()=>choose(el.dataset.p)));
$('place').addEventListener('click',()=>{if(live||paused)return;placing=!placing;setHint(placing?'Tap inside the box, at least one robot radius from a wall.':'Choose a preset or place the robot inside the box.',placing);render();});
function setPosition(x,y){if(!BoxWorld.validStart(x,y)){setHint('Too close to a wall. Pick a point at least 50 mm inside the box.',true);return;}pose.x=x;pose.y=y;preset='custom';placing=false;create();setHint('Custom start at ('+Math.round(x)+', '+Math.round(y)+') mm. Adjust the heading or run escape.',false);}
arena.addEventListener('click',ev=>{if(!placing||live||paused)return;const pt=arena.createSVGPoint();pt.x=ev.clientX;pt.y=ev.clientY;const m=arena.getScreenCTM();if(!m)return;const u=pt.matrixTransform(m.inverse());setPosition(Math.round(u.x),Math.round(350-u.y));});
$('angle').addEventListener('input',()=>{placing=false;create();});$('profile').addEventListener('change',()=>{placing=false;create();});$('rays').addEventListener('change',()=>{if(snap)markXY();});
document.querySelectorAll('[data-cmd]').forEach(el=>el.addEventListener('click',()=>arm(el.dataset.cmd)));
function csvBlob(){const fields='sim_ms,command,result,mode,phase,profile,start_x_mm,start_y_mm,start_heading_deg,back_left_raw,front_raw,back_right_raw,left_pwm,right_pwm,left_ticks,right_ticks,model_x_mm,model_y_mm,model_heading_deg,odom_x_mm,odom_y_mm,odom_heading_deg,body_clearance_mm,min_body_clearance_mm,whole_body_outside,contact,last_active_phase,reason';const quote=v=>'"'+String(v??'').replace(/"/g,'""')+'"';const column=discarded?',trimmed':'',flag=discarded?',1':'';return new Blob([fields+column+'\r\n'+rows.map(row=>row.map(quote).join(',')+flag).join('\r\n')+'\r\n'],{type:'text/csv;charset=utf-8'});}
function downloadCsv(blob,name){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
function finishEscape(){if(!currentTrial||lastFinal?.trial===currentTrial)return;
 lastFinal={trial:currentTrial,blob:csvBlob(),name:currentTrial.base+'.csv'};
 // Browsers can suppress automatic downloads. Keep the same immutable file for retry.
 try{downloadCsv(lastFinal.blob,lastFinal.name);}catch(_){}
}
$('csv').addEventListener('click',()=>{if(!rows.length)return;
 if(currentTrial&&currentTrial===lastFinal?.trial){downloadCsv(lastFinal.blob,lastFinal.name);return;}
 const name=currentTrial?currentTrial.base+'-partial.csv':'box-escape-'+command+'-'+preset+'-'+profile+'-'+Date.now()+'.csv';
 downloadCsv(csvBlob(),name);
});
$('previousCsv').addEventListener('click',()=>{if(lastFinal)downloadCsv(lastFinal.blob,lastFinal.name);});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&live){paused=true;live=false;last=0;render();}});
try{create();requestAnimationFrame(animate);}catch(e){showError(e);}
})();
