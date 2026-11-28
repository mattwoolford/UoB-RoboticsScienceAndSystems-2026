/* node review/test_diagnosis.cjs — synthetic CSVs, not physical trial data. */
'use strict';
const {strict:assert}=require('node:assert'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8'),js=html.match(/<script>([\s\S]*?)<\/script>/)[1];
function node(){return {value:'',children:[],append(...kids){this.children.push(...kids)},replaceChildren(...kids){this.children=kids},setAttribute(){},classList:{add(){},remove(){}},click(){},remove(){}}}
const elements=new Map(),document={getElementById(id){if(!elements.has(id))elements.set(id,node());return elements.get(id)},createElement:node,createElementNS:node,createTextNode:s=>({textContent:s}),body:node()};
const env=vm.createContext({document,location:{protocol:'file:'},console,URL,Blob});vm.runInContext(js,env);
const run=s=>vm.runInContext(s,env);
function data(k,rows,setup={},opts={}){const clock=k==='R'?'real_ms':'sim_ms';const fields=new Set([clock,'phase','mode','reason','event','left_pwm','right_pwm','left_ticks','right_ticks','front_raw','back_right_raw',k==='R'?'theta_deg':'odom_heading_deg',...Object.keys(setup),...Object.keys(opts)]);const frame=(r,i)=>Object.assign({[clock]:i*200,phase:'SEEK',mode:'ESCAPE',left_pwm:55,right_pwm:55,left_ticks:0,right_ticks:8*i,front_raw:4090,back_right_raw:3200},setup,opts,r);const h=[...fields],csv=[h.join(','),...rows.map(frame).map(r=>h.map(k=>JSON.stringify(String(r[k]??''))).join(','))].join('\n');env.src=csv;run("slots."+k+"=parse(src,'"+k+"','fixture')");}
const setting={escape_settings:'nominal_no_calibration',motor_calibrated_at_start:0,left_threshold_pwm:-1,right_threshold_pwm:-1,sensor_settings:'existing_raw_thresholds',odometry_settings:'nominal_geometry'};
const done={run_state:'finished'},roll=[{},{},{},{}],term=(reason,patch={})=>Object.assign({phase:'FAULT',mode:'FAULT',left_pwm:0,right_pwm:0,event:'finish',reason},patch);
const diag=(out='Not observed')=>{env.oc=out;return JSON.parse(run('JSON.stringify(diagnose(slots.R,slots.S,oc))'))};
data('R',[...roll,term('No encoder motion from a commanded wheel')],setting,done);
assert.equal(run('slots.R.meta.motor_calibrated_at_start'),false);assert.equal(run('slots.R.meta.left_threshold_pwm'),null);
let c=diag()[0];assert.match(c.evidence,/Left PWM 55, Δticks 0 in 800 ms; right PWM 55, Δticks 32/);assert.match(c.meaning,/Left showed no tick change/);
assert.match(run('configSummary(slots.R)'),/prior motor starting-PWM check: no/);
data('R',[...roll,term('Stopped by operator',{event:'tcp_disconnect',mode:'IDLE',phase:'IDLE'})],{},done);assert.equal(diag().length,1);assert.match(diag()[0].title,/TCP/);assert.match(run('configSummary(slots.R)'),/prior motor starting-PWM check: unknown/);
data('R',[...roll,term('Stopped by robot button',{mode:'IDLE',phase:'IDLE'})],{},done);assert.match(diag()[0].title,/Operator/);
const turn=[{phase:'TURN_LEFT',theta_deg:0},{phase:'TURN_LEFT',theta_deg:70},{phase:'SETTLE_LEFT',theta_deg:87},term('Turn settled outside tolerance.',{theta_deg:105})];
data('S',[...turn.map((r,i)=>({...r,odom_heading_deg:[0,68,88,90][i]}))],{}, {command:'E'});
data('R',turn,{...setting,escape_settings:'nominal_with_prior_motor_check',left_threshold_pwm:24,right_threshold_pwm:27,motor_calibrated_at_start:1},done);
assert.equal(run('slots.R.meta.right_threshold_pwm'),27);assert.match(run('configSummary(slots.R)'),/yes; forward thresholds \(left \/ right PWM\): 24 \/ 27/);assert.match(diag()[0].evidence,/\+105.0°.*Matching simulator turn: \+90.0°/);
data('R',[{phase:'TURN_LEFT',theta_deg:0},term('Turn moved in the wrong direction.',{theta_deg:-14})],{},done);assert.match(diag()[0].evidence,/-14.0°/);
const opening=[{phase:'FOLLOW',back_right_raw:3100},{phase:'FOLLOW',back_right_raw:3460},{phase:'CENTRE',back_right_raw:3690},term('Candidate gap did not stay open.',{front_raw:4040,back_right_raw:3500})];
data('S',opening.map(r=>({...r,back_right_raw:3750})),{},{command:'E'});
data('R',opening,setting,done);assert.match(diag()[0].evidence,/front 4040, back-right 3500.*CENTRE: front 4090, back-right 3690.*Same simulator phase and visit: front 4090, back-right 3750/);
data('R',[...opening.slice(0,3),{phase:'CROSS'},term('Candidate exit; verify whole body outside.',{phase:'IDLE',mode:'IDLE'})],setting,done);
assert.match(diag('Not observed')[0].meaning,/does not show/);assert.match(diag('Did not clear the exit')[0].title,/conflicts with observation/);assert.match(diag('Stopped inside')[1].next,/axle/);
document.getElementById('outcome').value='Stopped inside';run('renderDiagnosis()');assert.match(document.getElementById('triage').children[0].children[0].textContent,/conflicts/);
data('R',[{phase:'FOLLOW'},{phase:'TURN_LEFT'}],{},{run_state:'active',trimmed:1});assert.match(diag()[0].title,/Incomplete/);assert.match(run('comparison()'),/After the shared FOLLOW phase, the next recorded states differ/);
data('R',[{},term('Run bound reached.')],{},done);assert.match(diag()[0].title,/Cause not isolated/);
data('R',[term('No encoder motion from a commanded wheel')],{},done);assert.match(diag()[0].evidence,/interval unavailable/);assert.match(diag()[0].meaning,/does not isolate/);
console.log('PASS triage: stopped-wheel evidence, motor metadata and older CSV, TCP and operator stop, bad turn angle/sign, matched real/sim IR, physical non-exit despite candidate, partial sequence, unknown fault and missing wheel interval.');

// The original hardware run and a constructed retried run stay distinguishable.
env.src=fs.readFileSync(path.join(__dirname,'physical-test-0002-original.csv'),'utf8');
run("slots.R=parse(src,'R','physical test 0002')");
assert.match(diag().map(c=>c.title).join(' / '),/Earlier pilot ended the search/);
const measured=run("slots.R.phases.map((_,i)=>turns(slots.R,i)).filter(Boolean).join(' / ')");
assert.match(measured,/97.7°.*98.1°/);
data('R',[{phase:'FOLLOW'},{phase:'SEEK',reason:'Retry: opening not confirmed; seek a wall.'},{phase:'SEEK',reason:'Retry: opening not confirmed; seek a wall.'},term('Stopped by operator',{mode:'IDLE',phase:'IDLE'})],{...setting,pilot_revision:'opening_retry_v1'},done);
assert.match(diag().find(c=>c.title==='Search retries recorded').evidence,/1 in the retained log/);
assert.match(run('configSummary(slots.R)'),/opening retry v1/);
console.log('PASS original test 0002 and separate nonterminal navigation retry.');
