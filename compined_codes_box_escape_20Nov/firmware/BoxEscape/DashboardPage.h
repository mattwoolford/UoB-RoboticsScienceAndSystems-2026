#pragma once
static const char PAGE[] = R"BOXUI(<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#10262b">
<title>BoxEscape · Trial console</title>
<style>
:root{font:16px/1.45 system-ui,-apple-system,sans-serif;color:#173437;background:#eff3ef;--muted:#4b6262;--rule:#c1d0c9}
*{box-sizing:border-box}body{margin:0}header{background:#102b30;color:#fafdf6;border-bottom:4px solid #83d6b6}header div,main{max-width:50rem;margin:auto;padding:1.5rem clamp(1rem,4vw,2.3rem)}.k{font-size:.73rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#267563}header .k{color:#a0dac8}h1{margin:.15rem 0;font-size:clamp(2.2rem,5vw,3.35rem);line-height:1.14;letter-spacing:-.05em}h2{margin:.3rem 0 .5rem;line-height:1.2;font-size:1.4rem}p{margin:.5rem 0}.muted,small{color:var(--muted)}main{padding-top:1rem}.card{background:#fff;border:1px solid var(--rule);border-radius:12px;padding:clamp(.95rem,3vw,1.35rem);margin:.8rem 0}.buttons,.links{display:flex;gap:.65rem;flex-wrap:wrap;align-items:center}.buttons{margin:1.1rem 0 .8rem}button,.lnk{font:inherit;font-weight:680;border:none;border-radius:6px;padding:.67rem 1.05rem;cursor:pointer}button:focus-visible,a:focus-visible{outline:3px solid #0069a1;outline-offset:3px}button:disabled{opacity:.48;cursor:default}#startTrial{background:#12634e;color:#fff}#stopTrial{background:#8d303a;color:#fff}.data{display:grid;grid-template-columns:repeat(auto-fit,minmax(12.5rem,1fr));gap:.8rem .5rem}.data dd{font-size:1.15rem}.links{margin:.6rem 0}a,.lnk{color:#075c56}.lnk{background:#e8f1ed}.disabled{pointer-events:none;color:#647875}dl{display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem;margin:.5rem 0}dl div{border-left:3px solid #a8ccbc;padding:.25rem .6rem}dt{font-size:.88rem;color:var(--muted)}dd{margin:0;font:650 clamp(1.25rem,4vw,1.8rem) ui-monospace,monospace}.msg{padding:.5rem .7rem;background:#eff5f3;border-radius:5px}.warn{color:#893522}.files{padding-left:0;list-style:none;margin:.5rem 0}.files li{display:flex;justify-content:space-between;align-items:center;gap:.5rem;padding:.45rem 0;border-top:1px solid var(--rule)}.descriptor{display:block;color:var(--muted);font-size:.82rem}button.subtle{background:#edf4f2;color:#154c49;font-size:.9rem}.statusline{display:flex;gap:.75rem;align-items:baseline;flex-wrap:wrap}.statusline h2{margin-right:auto}[hidden]{display:none!important}
</style></head><body><header><div><span class="k">Robotics lab / Physical robot</span><h1>Box escape</h1><span>Baseline trial console</span></div></header>
<main><section class="card"><div class="statusline"><h2>Experiment controls</h2><strong id="connection">Connecting…</strong></div>
<p>Start runs the physical robot with the nominal settings and records immediately. There is no calibration step.</p>
<div class="buttons"><button type="button" id="startTrial" disabled>▶ Start trial</button><button type="button" id="stopTrial">■ Stop trial</button></div>
<strong id="trial">Waiting for the robot…</strong><p class="muted" id="note">No command sent.</p><p class="msg" role="status" id="action">Start and Stop are manual. The robot’s USER button also stops motion.</p>
</section><section class="card"><span class="k">Signals</span><h2>Top infrared readings</h2><dl><div><dt>Back left</dt><dd id="left">—</dd></div><div><dt>Front</dt><dd id="front">—</dd></div><div><dt>Back right</dt><dd id="right">—</dd></div></dl><small id="irState">Raw sensor counts (0–4095).</small></section>
<section class="card"><span class="k">Robot state</span><h2>Calibration &amp; telemetry</h2><p id="calState" class="msg">Waiting for the robot.</p>
<dl class="data"><div><dt>Wheel start PWM · left / right</dt><dd id="thresholds">—</dd></div><div><dt>Commanded PWM · left / right</dt><dd id="pwm">—</dd></div><div><dt>Encoder ticks · left / right</dt><dd id="ticks">—</dd></div><div><dt>Estimated x / y (mm)</dt><dd id="pose">—</dd></div><div><dt>Estimated heading (°)</dt><dd id="heading">—</dd></div></dl>
<small>Wheel commands are the last accepted requests. Encoders and pose show the latest controller values; they may stay fixed while idle. Odometry uses configured wheel geometry; the IR detector uses the existing raw-count thresholds. The baseline does not retune either.</small><p class="muted" id="geometry"></p></section>
<section class="card"><span class="k">Evidence</span><h2>Trial CSV files</h2>
<p id="recordStatus" role="status">Waiting for a recording.</p>
<div class="links"><a id="latestCsv" hidden>Download CSV</a><a href="/review">Review a trial · What to check first</a><button class="subtle" id="retry" hidden>Retry save</button></div>
<div id="manual" hidden><p class="warn">This browser could not keep a copy. Download the final CSV above and check it is in Downloads. Starting another trial replaces the recording on the robot.</p><label><input type="checkbox" id="confirm"> I saved this test’s final CSV; allow the next trial.</label></div>
<h3>Saved on this browser</h3><ul class="files" id="archiveList"><li>Loading…</li></ul>
<small>Each finished trial is copied here when this dashboard is connected. Download a separate copy for your team. Other laptops, browser profiles or addresses have their own history. Keep the robot on until the final CSV is saved.</small></section></main>
<script>
'use strict';
const $=id=>document.getElementById(id), pad=id=>String(id).padStart(4,'0'), filename=id=>'box-escape-test-'+pad(id)+'.csv', label=id=>'Test '+pad(id);
const terminal=s=>s && ['finished','rejected'].includes(s.trial_state) && s.trial_id>0;
const sig=s=>s?s.robot_id+'/'+s.trial_id:'';
let current=null,online=false,seen=0,starting=false,stopping=false,lastAction=0,hold=null,knownClosed='',inSave='',failed={},storageProblem='',manuallySaved='',owner=null,dbOpen=null,listGeneration=0;
const PFX='boxescape.csv.v1.', OWN='boxescape.tab.v1';
function ownerSet(v){owner=v;try{if(v)sessionStorage.setItem(OWN,JSON.stringify(v));else sessionStorage.removeItem(OWN);}catch(_){}}
try{owner=JSON.parse(sessionStorage.getItem(OWN)||'null');}catch(_){}
function bindOwner(s){if(!owner || owner.robot!==s.robot_id)return;
 if(s.trial_id && s.trial_id!==owner.pre && !owner.id)ownerSet({...owner,id:s.trial_id});
 if(owner?.id && s.trial_id!==owner.id)ownerSet(null);}
function clock(){return Date.now();}
const fresh=()=>online&&clock()-seen<3000;
function announce(msg){$('action').textContent=msg;}
async function request(url,opt={},ms=4500){const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),ms);try{const r=await fetch(url,{cache:'no-store',...opt,signal:ctrl.signal});const text=await r.text();if(!r.ok){let m='HTTP '+r.status;try{m=JSON.parse(text).message||m;}catch(_){}throw Error(m);}return text;}finally{clearTimeout(timer);}}
function database(){if(!dbOpen){dbOpen=new Promise((ok,no)=>{if(!window.indexedDB){no(Error('Unavailable'));return;}const q=indexedDB.open('boxescape-trials-v1',1);
q.onupgradeneeded=()=>{if(!q.result.objectStoreNames.contains('files'))q.result.createObjectStore('files',{keyPath:'k'});};q.onsuccess=()=>ok(q.result);q.onerror=()=>no(q.error);q.onblocked=()=>no(Error('Browser storage busy'));});}return dbOpen;}
async function writeRecord(item){try{const db=await database();await new Promise((ok,no)=>{const t=db.transaction('files','readwrite');t.oncomplete=ok;t.onerror=t.onabort=()=>no(t.error||Error('Save failed'));t.objectStore('files').put(item);});return;}
catch(_){try{localStorage.setItem(PFX+item.k,JSON.stringify(item));}catch(e){throw Error('Browser storage unavailable or full.');}}}
function localItem(key){try{return JSON.parse(localStorage.getItem(PFX+key)||'null');}catch(_){return null;}}
async function getRecord(key){try{const db=await database();const v=await new Promise((ok,no)=>{const q=db.transaction('files').objectStore('files').get(key);q.onsuccess=()=>ok(q.result);q.onerror=()=>no(q.error);});if(v)return v;}catch(_){}return localItem(key);}
function brief(v){return {k:v.k,id:v.id,robot:v.robot,stamp:v.stamp,state:v.state,rows:v.rows};}
async function listRecords(){let d=new Map();try{const db=await database();await new Promise((ok,no)=>{const q=db.transaction('files').objectStore('files').openCursor();q.onerror=()=>no(q.error);q.onsuccess=()=>{let c=q.result;if(!c){ok();return;}let v=c.value;d.set(v.k,brief(v));c.continue();};});}catch(_){}
try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k && k.startsWith(PFX)){let v=localItem(k.slice(PFX.length));if(v&&!d.has(v.k))d.set(v.k,brief(v));}}}catch(_){}return Array.from(d.values()).sort((a,b)=>b.stamp-a.stamp||b.id-a.id);}
function download(v){const u=URL.createObjectURL(new Blob([v.csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=u;a.download=filename(v.id);document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),60000);}
async function renderFiles(){const gen=++listGeneration, items=await listRecords();if(gen!==listGeneration)return;const ul=$('archiveList');ul.replaceChildren();if(!items.length){const li=document.createElement('li');li.textContent='No completed trials saved in this browser yet.';ul.append(li);return;}
 for(const row of items){const li=document.createElement('li'),l=document.createElement('span'),detail=document.createElement('small'),b=document.createElement('button');l.textContent=label(row.id);detail.className='descriptor';detail.textContent=row.state+' · '+row.rows+' rows · '+new Date(row.stamp).toLocaleString()+(current&&row.robot!==current.robot_id?' · robot '+row.robot:'');l.append(detail);b.className='subtle';b.textContent='Download CSV';b.onclick=async()=>{try{const v=await getRecord(row.k);if(!v)throw Error();download(v);}catch(_){announce('Saved CSV unavailable. Try the latest robot CSV if it is still on the robot.');}};li.append(l,b);ul.append(li);}}
function csvFields(line){const a=[];let field='',quote=false;for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'){if(quote&&line[i+1]==='"'){field+='"';i++;}else quote=!quote;}else if(c===','&&!quote){a.push(field);field='';}else field+=c;}if(quote)throw Error('Incomplete CSV field.');a.push(field);return a;}
function checkCSV(csv,s){const lines=csv.trimEnd().split(/\r?\n/),hdr=csvFields(lines.shift()||''),idAt=hdr.indexOf('run_id'),stateAt=hdr.indexOf('run_state');if(idAt<0||stateAt<0||!lines.length)throw Error('No final recording returned.');
 for(const line of lines){const r=csvFields(line);if(r.length!==hdr.length||Number(r[idAt])!==s.trial_id||r[stateAt]!==s.trial_state)throw Error('Recording changed. Refresh its status.');}
 if(Number.isInteger(s.samples)&&s.samples>0&&lines.length!==s.samples)throw Error('Recording incomplete. Retry save.');return lines.length;}
function saveState(s,msg){if(terminal(current)&&sig(current)===sig(s))$('recordStatus').textContent=msg;}
async function archive(s){const k=sig(s);if(!terminal(s)||knownClosed===k||inSave===k||clock()-(failed[k]||0)<4500)return;
 inSave=k;saveState(s,'Saving '+label(s.trial_id)+'…');let fallback=false;try{
 const csv=await request('/trial.csv?id='+s.trial_id,{},15000),rows=checkCSV(csv,s);
 const record={k,id:s.trial_id,robot:s.robot_id,csv,rows,state:s.trial_state,stamp:clock()};try{const prior=await getRecord(k);if(!prior||prior.csv!==csv)await writeRecord(record);}catch(e){fallback=true;throw e;}
 if(sig(current)===k){knownClosed=k;storageProblem='';$('manual').hidden=true;$('retry').hidden=true;}
 if(owner && owner.robot===s.robot_id && owner.id===s.trial_id){ownerSet(null);try{download(record);}catch(_){}}
 saveState(s,label(s.trial_id)+' saved in this browser. Use Download CSV if your browser did not download it.');await renderFiles();
 }catch(e){failed[k]=clock();if(sig(current)===k){storageProblem=fallback?k:'';$('retry').hidden=false;$('manual').hidden=!fallback;saveState(s,e.message+' Use the download link or retry.');}}
 finally{if(inSave===k)inSave='';controls();}}
function controls(){const s=current,closed=terminal(s),k=sig(s),protect=closed && knownClosed!==k && manuallySaved!==k;
 $('startTrial').disabled=!(s && fresh()&&s.can_start===true&&!starting&&!stopping&&!hold&&!s.pending&&!protect);
 $('stopTrial').disabled=stopping; // Always offer a manual stop, even after a poll failure.
}
const validNumber=n=>typeof n==='number'&&Number.isFinite(n);
const fmt=(v,p=0)=>validNumber(v)?v.toFixed(p):'—';
const lr=(a,b,p=0)=>fmt(a,p)+' / '+fmt(b,p);
function telemetry(s){const live=!!s&&s.state==='live', ready=live&&typeof s.motor_calibrated==='boolean';
 $('calState').textContent=ready?(s.motor_calibrated?'Wheel-start thresholds measured in this session. Baseline escape still uses nominal drive settings.':'Baseline · no valid wheel-start measurements are available now. Start does not run motor calibration.'):'Calibration state unknown.';
 const l=s?.left_threshold_pwm,r=s?.right_threshold_pwm;
 $('thresholds').textContent=ready&&s.motor_calibrated?lr(validNumber(l)&&l>=0?l:null,validNumber(r)&&r>=0?r:null):'—';
 $('pwm').textContent=live?lr(s.left_pwm,s.right_pwm):'—';$('ticks').textContent=live?lr(s.left_ticks,s.right_ticks):'—';$('pose').textContent=live?lr(s.x_mm,s.y_mm,1):'—';$('heading').textContent=live?fmt(s.theta_deg,1):'—';
 $('geometry').textContent=s&&validNumber(s.wheel_separation_mm)?'Configured geometry: wheel radii '+lr(s.left_radius_mm,s.right_radius_mm,1)+' mm; separation '+fmt(s.wheel_separation_mm,1)+' mm; '+fmt(s.counts_per_rev,1)+' counts/revolution.':'';
}
function display(s){telemetry(s);const old=current,changed=sig(old)!==sig(s);current=s;online=true;seen=clock();
 if(changed){knownClosed='';manuallySaved='';storageProblem='';$('confirm').checked=false;$('manual').hidden=true;$('retry').hidden=true;}
 if(hold && (s.trial_id!==hold.pre || s.control_error || (!s.pending&&clock()>hold.until)))hold=null;
 bindOwner(s);$('connection').textContent='Connected';$('trial').textContent=s.trial_id?label(s.trial_id)+' · '+s.trial_state+' · '+s.samples+' samples':'Ready for the first trial';
 $('note').textContent=[s.mode&&'Mode: '+s.mode,s.phase&&'Phase: '+s.phase,s.note,s.control_error].filter(Boolean).join(' · ');
 for(const k of ['front','left','right'])$(k).textContent=s.state==='live' ? s[k]:'—';
 $('irState').textContent=s.state==='live'?'Raw sensor counts (0–4095).':s.state==='locked'?'Sensors locked. Check board selection in Serial Monitor.':s.state==='stale'?'No fresh sensor readings.':'Waiting for readings.';
 const a=$('latestCsv');a.hidden=!s.trial_id;if(s.trial_id){a.href='/trial.csv?id='+s.trial_id;a.download=s.trial_state==='active'?'box-escape-test-'+pad(s.trial_id)+'-partial.csv':filename(s.trial_id);a.textContent=s.trial_state==='active'?'Download current snapshot (partial)':'Download final CSV';}
 if(s.trial_state==='active')$('recordStatus').textContent='Recording '+label(s.trial_id)+'. Its final CSV will be saved when the robot stops.';
 else if(!s.trial_id)$('recordStatus').textContent='No trial recorded on the robot since boot.';
 else if(terminal(s)){if(knownClosed===sig(s))$('recordStatus').textContent=label(s.trial_id)+' saved in this browser. Download a copy for your team.';else archive(s);}
 controls();}
let pollBusy=false;async function poll(){if(pollBusy)return;pollBusy=true;try{const s=JSON.parse(await request('/status',{},2600));if(!Number.isInteger(s.trial_id)||typeof s.can_start!=='boolean')throw Error('Unexpected firmware');display(s);}catch(_){online=false;telemetry(null);$('connection').textContent='Disconnected';$('note').textContent='Check the BoxEscape Wi-Fi. Robot state is unknown; the physical USER button can stop it.';for(const k of ['front','left','right'])$(k).textContent='—';controls();}finally{pollBusy=false;}}
async function command(kind){const start=kind==='start',s=current;if(start&&(!s||$('startTrial').disabled||!fresh()))return;if(!start&&stopping)return;
 const action=++lastAction;if(start){starting=true;hold={pre:s.trial_id,until:clock()+3500};}else {stopping=true;}controls();announce(start?'Sending start…':'Sending stop…');
 try{const headers={'X-BoxEscape-Control':'1'};if(start)headers['X-BoxEscape-Previous']=String(s.trial_id);
 await request('/'+kind,{method:'POST',headers},3300);
 if(start){ownerSet({robot:s.robot_id,pre:s.trial_id,id:null});if(current)bindOwner(current);}if(action===lastAction)announce(start?'Start request accepted. Check the trial state below.':'Stop request accepted. Check the final trial state.');
 }catch(e){if(start)hold=null;if(action===lastAction)announce((e.name==='AbortError'?'No reply. The command may already have reached the robot.':e.message)+' Check the robot state before sending another command.');}
 finally{if(start)starting=false;else stopping=false;controls();poll();}}
$('startTrial').onclick=()=>command('start');$('stopTrial').onclick=()=>command('stop');
$('confirm').onchange=()=>{manuallySaved=$('confirm').checked&&current&&storageProblem===sig(current)?sig(current):'';controls();};
$('retry').onclick=()=>{if(current){failed[sig(current)]=0;archive(current);}};
window.addEventListener('focus',()=>{poll();renderFiles();});
window.addEventListener('storage',()=>{renderFiles();});
renderFiles();poll();setInterval(poll,550);
</script></body></html>)BOXUI";
