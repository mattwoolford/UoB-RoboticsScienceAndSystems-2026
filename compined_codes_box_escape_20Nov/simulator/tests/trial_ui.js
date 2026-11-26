// Exercise the built offline page with its real simulator and browser API stand-ins.
// Run: node simulator/tests/trial_ui.js
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]),store=new Map();
function page(){
 const els={},files=[],urls=new Map();let next,clock=50;
 const el=(id,tag)=>({id,dataset:{},handlers:{},attrs:{},style:{setProperty(){}},classList:{toggle(){}},
  addEventListener(evt,f){this.handlers[evt]=f;},setAttribute(k,v){this.attrs[k]=v;},appendChild(){},replaceChildren(){},remove(){},
  click(){if(!this.disabled){if(tag==='a'){assert.ok(urls.has(this.href));files.push({file:this.download,blob:urls.get(this.href)});}else this.handlers.click?.();}}});
 for(const m of html.matchAll(/\bid="([\w-]+)"/g))els[m[1]]=el(m[1]);
 for(const n of ['backLeft','front','backRight'])for(const t of ['bar','val'])els[t+'-'+n]=el(t+'-'+n);
 const groups={};for(const k of ['p','cmd']){groups['[data-'+k+']']=[...html.matchAll(new RegExp('data-'+k+'="([^"]+)"','g'))].map(m=>Object.assign(el(),{dataset:{[k]:m[1]}}));}
 els.angle.value='0';els.speed.value='4';els.profile.value='baseline';els.rays.checked=false;
 const doc={body:{append(){}},getElementById:id=>els[id],querySelectorAll:s=>groups[s],createElement:t=>el('',t),createElementNS:()=>el(),createDocumentFragment:()=>el(),addEventListener(){}};
 const context={document:doc,location:{protocol:'file:'},atob,TextEncoder,TextDecoder,Blob,URL:{createObjectURL:b=>{let k='blob:'+urls.size;urls.set(k,b);return k;},revokeObjectURL(){}},setTimeout(){},requestAnimationFrame:f=>next=f,localStorage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)}};
 vm.createContext(context);for(const [i,s] of scripts.entries())vm.runInContext(s,context,{filename:'built-script-'+i});
 return {els,files,advance:n=>{while(n--)next(clock+=50);},centre:()=>groups['[data-p]'].find(e=>e.dataset.p==='centre').click()};
}
(async()=>{
 let {els,files,advance,centre}=page();
 const dl=async(action,name)=>{const n=files.length;action();assert.equal(files.length,n+1);assert.equal(files[n].file,name);return files[n].blob.text();};
 els.run.click();assert.equal(els.reset.disabled,true);assert.equal(els.csv.disabled,false);
 const partial=await dl(()=>els.csv.click(),'box-escape-sim-test-0001-partial.csv');assert.match(partial,/"0","E","running"/);
 els.run.click();assert.equal(els.runlabel.textContent,'Resume');assert.equal(els.reset.disabled,true);els.reset.click();
 const stopped=await dl(()=>els.stop.click(),'box-escape-sim-test-0001.csv');assert.match(stopped,/"0","E","stopped".*"Stopped by operator\."/);assert.equal(els.reset.disabled,false);
 assert.equal(await dl(()=>els.csv.click(),'box-escape-sim-test-0001.csv'),stopped);els.reset.click();
 assert.equal(await dl(()=>els.previousCsv.click(),'box-escape-sim-test-0001.csv'),stopped);
 centre();els.run.click();assert.equal(els.previousCsv.hidden,false);
 const finished=await dl(()=>advance(530),'box-escape-sim-test-0002.csv');assert.match(finished,/"E","escaped"/);assert.equal(els.stop.disabled,true);
 assert.equal(await dl(()=>els.csv.click(),'box-escape-sim-test-0002.csv'),finished);
 ({els}=page());els.run.click();assert.match(els.sampleCount.textContent,/SIM test 0003/);
 console.log('PASS built SIM controls: start, pause, stop, reset guard, numbered partial/final files, natural escape, final re-download and numbering after reload.');
})().catch(e=>{console.error(e);process.exitCode=1;});
