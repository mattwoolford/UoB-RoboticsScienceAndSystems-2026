// Generated from seven combined firmware compilation units. See the original project licence and the reproducible build sources.
globalThis.BoxCore=(()=>{'use strict';
const IMAGE=[[0, "f0VMRgEBAQAAAAAAAAAAAAIAAwABAAAA1TgAADQAAADIXQAAAAAAADQAIAAGACgACQAIAAEAAAAAAAAAAAAAAAAAAAD0AAAA9AAAAAQAAAAAEAAAAQAAAAAQAAAAEAAAABAAAMYtAADGLQAABQAAAAAQAAABAAAAAEAAAABAAAAAQAAAuAgAALgIAAAEAAAAABAAAAEAAAD8TwAA/F8AAPxfAAAEAAAAbAIAAAYAAAAAEAAAUeV0ZAAAAAAAAAAAAAAAAAAAAAAAAAAABgAAABAAAABS5XRk/E8AAPxfAAD8XwAABAAAAAQAAAAEAAAAAQAAAA=="], [16384, "SURMRQBDQUxJQlJBVEUAU1RSQUlHSFQAUE9JTlQAUE9JTlRfQ0NXAFBJVk9UAEVTQ0FQRQBGQVVMVAB0dXJuAHJlYWRfcHJvdHJhY3RvcgBjb2FzdABTdG9wcGVkLgBUdXJuaW5nIGNvdW50ZXJjbG9ja3dpc2UAVHVybmluZyBjbG9ja3dpc2UAVHVybiB0aW1lZCBvdXQATWVhc3VyaW5nIGNvYXN0LWRvd24ASW52YWxpZCBvZG9tZXRyeS4AU2VlayBhIHdhbGwuAFR1cm4gaW50byBjYW5kaWRhdGUgb3BlbmluZy4AUmVhY3F1aXJpbmcgcmlnaHQgd2FsbC4AQ3Jvc3NpbmcgY2FuZGlkYXRlIG9wZW5pbmcuAE9ic2VydmF0aW9uIHRpbWVvdXQuAFR1cm4gdGltZW91dC4ATm8gZm9yd2FyZCBwcm9ncmVzcy4ARm9sbG93aW5nIHJpZ2h0IHdhbGwuAEludmFsaWQgb2RvbWV0cnkgZ2VvbWV0cnkAQ291bnRlcmNsb2Nrd2lzZSB0dXJuIHRlc3QAQ2xvY2t3aXNlIHR1cm4gdGVzdABTdG9wcGVkIGJ5IG9wZXJhdG9yAFJ1biBDIGNhbGlicmF0aW9uIGZpcnN0AEJvdW5kZWQgc3RyYWlnaHQgdGVzdABTaW5nbGUtYm94IHRyaWFsAE9kb21ldHJ5IGRpZCBub3QgdXBkYXRlAENvbnRyb2wgdXBkYXRlIGxhdGUAU3RyYWlnaHQgdGVzdCBjb21wbGV0ZQBJZGxlLgBJbml0aWFsaXNpbmcAU0VFSwBUVVJOX0xFRlQAU0VUVExFX0xFRlQAQUNRVUlSRQBGT0xMT1cAQ0VOVFJFAFRVUk5fUklHSFQAU0VUVExFX1JJR0hUAENST1NTAENBTkRJREFURQAAVHVybiBjb21wbGV0ZTsgY29tcGFyZSBlc3RpbWF0ZWQgYW5nbGUgd2l0aCBwcm90cmFjdG9yAABSZWNvcmQgcGh5c2ljYWwgYW5nbGU7IG5leHQgc3RlcCBpbiBmaXZlIHNlY29uZHMAAAAAVHVybiBtb3ZlZCBvcHBvc2l0ZSB0byBjb21tYW5kZWQgZGlyZWN0aW9uAABUdXJuIGxlZnQgdG8ga2VlcCB3YWxsIG9uIHJpZ2h0LgAAAABUdXJuIG1vdmVkIGluIHRoZSB3cm9uZyBkaXJlY3Rpb24uAABSZXRyeTogdHVybiBzZXR0bGVkIG91dHNpZGUgdG9sZXJhbmNlOyBzZWVrIGEgd2FsbC4AUmV0cnk6IG5vIGNsZWFyYW5jZSBhZnRlciBleGl0IHR1cm47IHNlZWsgYSB3YWxsLgAAAFJldHJ5OiBvYnN0YWNsZSBpbiBleGl0IHBhdGg7IHNlZWsgYSB3YWxsLgAAQ2FuZGlkYXRlIGV4aXQ7IHZlcmlmeSB3aG9sZSBib2R5IG91dHNpZGUuAABSZXRyeTogb2JzdHJ1Y3RlZCB3aGlsZSBjZW50cmluZzsgc2VlayBhIHdhbGwuAABSZXRyeTogY2FuZGlkYXRlIGdhcCBkaWQgbm90IHN0YXkgb3Blbjsgc2VlayBhIHdhbGwuAAAAAFJldHJ5OiBvdmVyc2hvdCBvcGVuaW5nIGNlbnRyZTsgc2VlayBhIHdhbGwuAAAAAFJldHJ5OiByaWdodCB3YWxsIG5vdCByZWFjcXVpcmVkOyBzZWVrIGEgd2FsbC4AAFJldHJ5OiBvcGVuaW5nIG5vdCBjb25maXJtZWQgYmVmb3JlIGNlbnRyaW5nIHdpbmRvdyBlbmRlZDsgc2VlayBhIHdhbGwuAENlbnRyaW5nIG9uIGNhbmRpZGF0ZSBvcGVuaW5nLgAAUmV0cnk6IHJpZ2h0IHdhbGwgbG9zdCBiZWZvcmUgdHJhY2tpbmcgd2FzIGVzdGFibGlzaGVkOyBzZWVrIGEgd2FsbC4AAAAASWRsZTsgcmVhZHkgZm9yIGJhc2VsaW5lIGVzY2FwZQBNZWFzdXJpbmcgZm9yd2FyZCBzdGFydGluZyBQV00AAEVzY2FwZSBQV00gdG9vIGxvdyBmb3IgbWVhc3VyZWQgZGVhZGJhbmQ7IHR1bmUgYmVmb3JlIHJ1bm5pbmcAAABUdXJuIFBXTSB0b28gbG93IGZvciBtZWFzdXJlZCBmb3J3YXJkIGRlYWRiYW5kAABGcm9udCB0b28gY2xvc2UgdG8gc3RhcnQgc3RyYWlnaHQgdGVzdAAAVHVybiB0ZXN0IGJsb2NrZWQ6IG9ic3RhY2xlIHZlcnkgY2xvc2UAAE5vIGVuY29kZXIgbW90aW9uIGZyb20gYSBjb21tYW5kZWQgd2hlZWwAAAAARm9yd2FyZCB3aGVlbCB0aHJlc2hvbGRzIG1lYXN1cmVkAAAAQ2FsaWJyYXRpb24gZmFpbGVkOyBjaGVjayBtb3RvcnMgYW5kIGVuY29kZXJzAAAAVHVybiB0ZXN0IHN0b3BwZWQ6IG9ic3RhY2xlIHZlcnkgY2xvc2UAAFdoZWVsIGNvdW50cyByZXZlcnNlZCBkdXJpbmcgc3RyYWlnaHQgY29tbWFuZAAAAFN0cmFpZ2h0IHRlc3Qgc3RvcHBlZDogZnJvbnQgd2FsbAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAF5CAABjQgAAbUIAAHlCAACBQgAAiEIAAI9CAACaQgAAp0IAAK1CAAA1QAAA4S5lQgAAIMEAALRC//9/f9sPyT8AAADBAAAoQgAAAEEAAIA/AACAv+xROL7CuDK+CZjEP8K4Mj4AAABAAABIQwAA8EEAAEBBAACgQACAO0WsxSc57FE4PtsPSUAAACBAAACAR28SgzrNzMw9AADwwQAAgEEAAAA/AADIQgAAAAD///9/AAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAABgtRFT7IRlA"], [24572, "PTsAAA=="]]; const F={"init": 14549, "inputs": 14909, "command": 14955, "tick": 14999, "mode": 15043, "phase": 15062, "note": 15081, "calibrated": 15087, "leftPWM": 15095, "rightPWM": 15101, "leftThreshold": 15107, "rightThreshold": 15115, "backLeft": 15123, "front": 15131, "backRight": 15139, "x": 15147, "y": 15153, "theta": 15159, "construct": 15165};
const data=IMAGE.map(([a,b])=>[a,Uint8Array.from(atob(b),c=>c.charCodeAt(0))]);
const away=x=>Math.sign(x)*Math.floor(Math.abs(x)+.5);
function remainder(x,y){const q=x/y, n=Math.floor(q),half=q-n;return x-y*(half<.5?n:half>.5?n+1:n%2===0?n:n+1);}
return class BoxCore{
constructor(){
const ram=new ArrayBuffer(131072),m=new DataView(ram),bytes=new Uint8Array(ram),r=new Uint32Array(8);
for(const [i,b] of data)bytes.set(b,i);
const lanes=new ArrayBuffer(128),u=new Uint32Array(lanes),f=new Float32Array(lanes),d=new Float64Array(lanes);
const conv=new DataView(new ArrayBuffer(4));const asbits=x=>(conv.setFloat32(0,x,true),conv.getUint32(0,true));
let Z=false,C=false,S=false,O=false,oldC=false,res=0,a,b,tmp,fpv;
function flags(aa,bb,w,sub){const M=2**w,mask=M-1,hi=M/2;aa=w===32?aa>>>0:aa&mask;bb=w===32?bb>>>0:bb&mask;
 const carry=sub===2&&C?1:0, v=sub?aa-bb-carry:aa+bb; res=w===32?v>>>0:v&mask;
 Z=res===0;S=(res&hi)!==0; C=v<0||v>=M; O=(sub?((aa^bb)&(aa^res)&hi):(~(aa^bb)&(aa^res)&hi))!==0;
}
function run(pc){for(;;){switch(pc){case 4096:
flags(r[4],0x1c,32,1);r[4]=res;
m.setUint32(r[4]+0x14+0,r[3],true);
m.setUint32(r[4]+0x18+0,r[6],true);
r[3]=u[4];
f[0]=f[0]-f[8];
r[6]=u[0];
u[20]=m.getUint32(r[4]+0x24+0,true);
m.setUint32(r[4]+0,u[20],true);
r[4]-=4;m.setUint32(r[4],0,true);run(15808);
u[12]=r[0];
u[24]=r[6];
f[12]=f[12]*f[24];
r[6]=u[12];
u[16]=r[3];
f[16]=f[16]-m.getFloat32(r[4]+0x20,true);
r[3]=u[16];
u[28]=m.getUint32(r[4]+0x24+0,true);
m.setUint32(r[4]+0,u[28],true);
r[4]-=4;m.setUint32(r[4],0,true);run(15809);
u[0]=r[0];
u[20]=r[3];
f[0]=f[0]*f[20];
u[24]=r[6];
f[0]=f[0]+f[24];
r[3]=m.getUint32(r[4]+0x14+0,true);
r[6]=m.getUint32(r[4]+0x18+0,true);
flags(r[4],0x1c,32,0);r[4]=res;
r[4]+=4;return;

r[0]=m.getUint32(r[4]+0x4+0,true);
r[2]=m.getUint32(r[0]+0,true);
flags(r[2]&r[2],0,32,0);C=O=false;
r[0]=(r[0]&~255)|((((!Z?1:0))&255)<<0);
flags(r[2],0x7,32,1);
r[2]=(r[2]&~255)|((((!Z?1:0))&255)<<0);
flags(((r[0]>>>0)&255)&((r[2]>>>0)&255),0,8,0);C=O=false;r[0]=(r[0]&~255)|(((res)&255)<<0);
r[4]+=4;return;
case 4234:
r[0]=m.getUint32(r[4]+0x4+0,true);
r[0]=m.getUint32(r[0]+0,true);
flags(r[0],0x3,32,1);
if(Z){pc=4304;continue;}
if((!C&&!Z)){pc=4271;continue;}
flags(r[0],0x1,32,1);
if(Z){pc=4311;continue;}
r[2]=0x400f;
flags(r[0],0x2,32,1);
r[0]=0x4000;
if(!Z){r[2]=r[0];}
case 4268:
r[0]=r[2];
r[4]+=4;return;
case 4271:
flags(r[0],0x5,32,1);
if(Z){pc=4318;continue;}
r[2]=0x402e;
flags(r[0],0x6,32,1);
if(Z){pc=4268;continue;}
r[2]=0x401e;
flags(r[0],0x4,32,1);
r[0]=0x4035;
if(!Z){r[2]=r[0];}
pc=4268;continue;
case 4304:
r[2]=0x4018;
pc=4268;continue;
case 4311:
r[2]=0x4005;
pc=4268;continue;
case 4318:
r[2]=0x4028;
pc=4268;continue;

case 4326:
flags(r[4],0x4,32,1);r[4]=res;
r[2]=m.getUint32(r[4]+0x8+0,true);
r[0]=m.getUint32(r[2]+0,true);
flags(r[0],0x6,32,1);
if(Z){pc=4360;continue;}
flags(r[0],0x3,32,1);r[0]=res;
flags(r[0],0x2,32,1);
if((C||Z)){pc=4372;continue;}
m.setUint32(r[4]+0,r[2],true);
r[4]-=4;m.setUint32(r[4],0,true);run(4234);
case 4356:
flags(r[4],0x4,32,0);r[4]=res;
r[4]+=4;return;
case 4360:
r[0]=m.getUint32(r[2]+0x68+0,true);
r[0]=m.getUint32(r[0]*4+0x47e0+0,true);
pc=4356;continue;
case 4372:
r[2]=m.getUint32(r[2]+0x4+0,true);
r[0]=0x403b;
flags(r[2]&r[2],0,32,0);C=O=false;
if(Z){pc=4356;continue;}
r[0]=0x4040;
flags(r[2],0x1,32,1);
r[2]=0x4050;
if(Z){r[0]=r[2];}
pc=4356;continue;
case 4402:
r[0]=m.getUint32(r[4]+0x4+0,true);
m.setUint32(r[0]+0,0x7,true);
m.setUint8(r[0]+0xe0+0,0x0,true);
r[2]=m.getUint32(r[4]+0xc+0,true);
m.setUint32(r[0]+0xdc+0,r[2],true);
m.setUint32(r[0]+0x68+0,0x0,true);
m.setUint32(r[0]+0x70+0,0x0,true);
m.setUint32(r[0]+0x6c+0,0x0,true);
m.setUint32(r[0]+0x74+0,0x4056,true);
m.setUint32(0x6260+0,0x0,true);
m.setUint32(0x6264+0,0x0,true);
m.setUint32(r[0]+0xf0+0,0x0,true);
m.setUint32(r[0]+0xec+0,0x0,true);
r[4]+=4;return;
case 4498:
r[0]=m.getUint32(r[4]+0x4+0,true);
flags(m.getUint32(r[0]+0,true),0x1,32,1);
if(Z){pc=4592;continue;}
case 4507:
m.setUint32(0x6260+0,0x0,true);
m.setUint32(0x6264+0,0x0,true);
m.setUint32(r[0]+0xf0+0,0x0,true);
m.setUint32(r[0]+0xec+0,0x0,true);
m.setUint32(r[0]+0,0x0,true);
r[2]=m.getUint32(r[4]+0xc+0,true);
m.setUint32(r[0]+0xdc+0,r[2],true);
m.setUint32(r[0]+0x68+0,0x0,true);
m.setUint32(r[0]+0x70+0,0x0,true);
m.setUint32(r[0]+0x6c+0,0x0,true);
m.setUint32(r[0]+0x74+0,0x4056,true);
r[4]+=4;return;
case 4592:
m.setUint8(r[0]+0xe0+0,0x0,true);
pc=4507;continue;

case 4602:
flags(r[4],0xc,32,1);r[4]=res;
m.setUint32(r[4]+0,r[3],true);
m.setUint32(r[4]+0x4+0,r[6],true);
m.setUint32(r[4]+0x8+0,r[7],true);
r[3]=m.getUint32(r[4]+0x10+0,true);
r[7]=m.getUint32(r[4]+0x18+0,true);
r[6]=m.getUint32(r[4]+0x1c+0,true);
r[1]=0xffffff79;
flags(r[7],r[1],32,1);
if((S===O)){r[1]=r[7];}
r[0]=0x87;
flags(r[1],r[0],32,1);
if((!Z&&S===O)){r[1]=r[0];}
r[0]=0xffffff79;
flags(r[6],r[0],32,1);
if((S===O)){r[0]=r[6];}
r[2]=0x87;
flags(r[0],r[2],32,1);
if((!Z&&S===O)){r[0]=r[2];}
u[0]=u[0]^u[0];u[1]=u[1]^u[1];u[2]=u[2]^u[2];u[3]=u[3]^u[3];
f[0]=(r[1]|0);
r[2]=Math.trunc(f[0]);
m.setUint32(0x6260+0,r[2],true);
u[0]=u[0]^u[0];u[1]=u[1]^u[1];u[2]=u[2]^u[2];u[3]=u[3]^u[3];
f[0]=(r[0]|0);
r[2]=Math.trunc(f[0]);
m.setUint32(0x6264+0,r[2],true);
flags(m.getUint32(r[3]+0xec+0,true),0x0,32,1);
if(!Z){pc=4717;continue;}
flags(r[7]&r[7],0,32,0);C=O=false;
if(!Z){pc=4759;continue;}
case 4717:
flags(m.getUint32(r[3]+0xf0+0,true),0x0,32,1);
if(!Z){pc=4730;continue;}
flags(r[6]&r[6],0,32,0);C=O=false;
if(!Z){pc=4771;continue;}
case 4730:
m.setUint32(r[3]+0xec+0,r[1],true);
m.setUint32(r[3]+0xf0+0,r[0],true);
r[0]=(r[0]&~255)|(((0x1)&255)<<0);
r[3]=m.getUint32(r[4]+0,true);
r[6]=m.getUint32(r[4]+0x4+0,true);
r[7]=m.getUint32(r[4]+0x8+0,true);
flags(r[4],0xc,32,0);r[4]=res;
r[4]+=4;return;
case 4759:
r[7]=m.getUint32(r[4]+0x20+0,true);
m.setUint32(r[3]+0x104+0,r[7],true);
pc=4717;continue;
case 4771:
r[6]=m.getUint32(r[4]+0x20+0,true);
m.setUint32(r[3]+0x108+0,r[6],true);
pc=4730;continue;

case 4784:
flags(r[4],0x20,32,1);r[4]=res;
m.setUint32(r[4]+0x14+0,r[3],true);
m.setUint32(r[4]+0x18+0,r[6],true);
m.setUint32(r[4]+0x1c+0,r[7],true);
r[3]=m.getUint32(r[4]+0x24+0,true);
r[6]=m.getUint32(r[4]+0x2c+0,true);
r[2]=m.getUint32(r[3]+0,true);
flags(r[2],0x4,32,1);
r[0]=(r[0]&~255)|((((Z?1:0))&255)<<0);
r[1]=m.getUint32(r[3]+0xe4+0,true);
r[7]=m.getUint32(r[3]+0x4+0,true);
flags(r[7],0x2,32,1);
if(Z){pc=5055;continue;}
r[0]=((r[0]>>>0)&255);
r[0]=r[0]+r[0]*1-0x1;
flags(r[7],0x1,32,1);
if(Z){pc=5105;continue;}
u[8]=u[8]^u[8];u[9]=u[9]^u[9];u[10]=u[10]^u[10];u[11]=u[11]^u[11];
f[8]=(r[0]|0);
u[4]=m.getUint32(r[3]+0x38+0,true);
u[0]=u[4];u[1]=u[5];u[2]=u[6];u[3]=u[7];
f[0]=f[0]-m.getFloat32(r[3]+0xf4,true);
f[0]=f[0]*f[8];
f[0]=f[0]*m.getFloat32(0x4810,true);
u[12]=m.getUint32(0x4814+0,true);
a=f[12];b=f[0];Z=!(a<b||a>b);C=!(a>=b);O=S=false;
if((!C&&!Z)){pc=5182;continue;}
r[7]=r[6];
flags(r[7],m.getUint32(r[3]+0xfc+0,true),32,1);r[7]=res;
flags(r[7],0x270f,32,1);
if((!C&&!Z)){pc=5211;continue;}
f[4]=f[4]*f[8];
f[4]=f[4]*m.getFloat32(0x4810,true);
u[0]=u[8];u[1]=u[9];u[2]=u[10];u[3]=u[11];
f[0]=f[0]*m.getFloat32(0x4818,true);
u[12]=u[12]^u[12];u[13]=u[13]^u[13];u[14]=u[14]^u[14];u[15]=u[15]^u[15];
f[12]=(r[1]|0);
f[0]=f[0]*f[12];
f[0]=f[0]*f[8];
a=f[4];b=f[0];Z=!(a<b||a>b);C=!(a>=b);O=S=false;
if(!C){pc=5240;continue;}
r[1]=0x4078;
flags(r[0]&r[0],0,32,0);C=O=false;
r[7]=0x405f;
if((!Z&&S===O)){r[1]=r[7];}
m.setUint32(r[3]+0xdc+0,r[1],true);
flags(r[2],0x5,32,1);
if(Z){pc=5312;continue;}
r[2]=r[0]+r[0]*4;
r[2]=r[2]+r[2]*4;
flags(r[2],r[2],32,0);r[2]=res;
case 5008:
m.setUint32(r[4]+0x10+0,r[6],true);
m.setUint32(r[4]+0xc+0,r[2],true);
r[0]=Math.imul(r[0],0xffffffce);
m.setUint32(r[4]+0x8+0,r[0],true);
r[0]=m.getUint32(r[4]+0x28+0,true);
m.setUint32(r[4]+0x4+0,r[0],true);
m.setUint32(r[4]+0,r[3],true);
r[4]-=4;m.setUint32(r[4],0,true);run(4602);
case 5039:
r[3]=m.getUint32(r[4]+0x14+0,true);
r[6]=m.getUint32(r[4]+0x18+0,true);
r[7]=m.getUint32(r[4]+0x1c+0,true);
flags(r[4],0x20,32,0);r[4]=res;
r[4]+=4;return;
case 5055:
r[0]=r[6];
flags(r[0],m.getUint32(r[3]+0xfc+0,true),32,1);r[0]=res;
flags(r[0],0x1387,32,1);
if((C||Z)){pc=5039;continue;}
oldC=C;flags(r[1],1,32,0);C=oldC;r[1]=res;
m.setUint32(r[3]+0xe4+0,r[1],true);
u[0]=m.getUint32(r[3]+0x38+0,true);
m.setUint32(r[3]+0xf4+0,u[0],true);
m.setUint32(r[3]+0x4+0,0x0,true);
m.setUint32(r[3]+0xfc+0,r[6],true);
pc=5039;continue;
case 5105:
r[0]=r[6];
flags(r[0],m.getUint32(r[3]+0xfc+0,true),32,1);r[0]=res;
flags(r[0],0xf9,32,1);
if((C||Z)){pc=5039;continue;}
flags(r[1],m.getUint32(r[3]+0xe8+0,true),32,1);
if(Z){pc=5153;continue;}
m.setUint32(r[3]+0x4+0,0x2,true);
m.setUint32(r[3]+0xfc+0,r[6],true);
m.setUint32(r[3]+0xdc+0,0x42f0,true);
pc=5039;continue;
case 5153:
m.setUint32(r[4]+0x8+0,0x42b8,true);
r[0]=m.getUint32(r[4]+0x28+0,true);
m.setUint32(r[4]+0x4+0,r[0],true);
m.setUint32(r[4]+0,r[3],true);
r[4]-=4;m.setUint32(r[4],0,true);run(4498);
pc=5039;continue;
case 5182:
m.setUint32(r[4]+0x8+0,0x4324,true);
r[0]=m.getUint32(r[4]+0x28+0,true);
m.setUint32(r[4]+0x4+0,r[0],true);
m.setUint32(r[4]+0,r[3],true);
r[4]-=4;m.setUint32(r[4],0,true);run(4402);
pc=5039;continue;
case 5211:
m.setUint32(r[4]+0x8+0,0x408a,true);
r[0]=m.getUint32(r[4]+0x28+0,true);
m.setUint32(r[4]+0x4+0,r[0],true);
m.setUint32(r[4]+0,r[3],true);
r[4]-=4;m.setUint32(r[4],0,true);run(4402);
pc=5039;continue;
case 5240:
m.setUint32(r[4]+0x10+0,r[6],true);
m.setUint32(r[4]+0xc+0,0x0,true);
m.setUint32(r[4]+0x8+0,0x0,true);
r[0]=m.getUint32(r[4]+0x28+0,true);
m.setUint32(r[4]+0x4+0,r[0],true);
m.setUint32(r[4]+0,r[3],true);
r[4]-=4;m.setUint32(r[4],0,true);run(4602);
flags(((r[0]>>>0)&255)&((r[0]>>>0)&255),0,8,0);C=O=false;
if(Z){pc=5039;continue;}
m.setUint32(r[3]+0x4+0,0x1,true);
m.setUint32(r[3]+0xfc+0,r[6],true);
m.setUint32(r[3]+0xdc+0,0x4099,true);
pc=5039;continue;
case 5312:
r[2]=0x0;
pc=5008;continue;
r[0]=m.getUint32(r[4]+0x4+0,true);
r[0]=m.getUint32(r[0]+0,true);
r[0]=m.getUint32(r[0]*4+0x47e0+0,true);
r[4]+=4;return;
r[0]=m.getUint32(r[4]+0x4+0,true);
m.setUint32(r[0]+0,0x0,true);
m.setUint32(r[0]+0x8+0,0x0,true);
m.setUint32(r[0]+0x4+0,0x0,true);
m.setUint32(r[0]+0xc+0,0x4056,true);
r[4]+=4;return;
r[0]=m.getUint32(r[4]+0x4+0,true);
m.setUint32(r[0]+0,0xb,true);
m.setUint32(r[0]+0x8+0,0x0,true);
m.setUint32(r[0]+0x4+0,0x0,true);
r[2]=m.getUint32(r[4]+0x8+0,true);
m.setUint32(r[0]+0xc+0,r[2],true);
r[4]+=4;return;
r[0]=m.getUint32(r[4]+0x4+0,true);
r[2]=m.getUint32(r[4]+0xc+0,true);
r[1]=m.getUint32(r[4]+0x8+0,true);
m.setUint32(r[0]+0,r[1],true);
m.setUint32(r[0]+0x18+0,r[2],true);
m.setUint32(r[0]+0x10+0,r[2],true);
u[0]=m.getUint32(r[0]+0x2c+0,true);
m.setUint32(r[0]+0x30+0,u[0],true);
u[0]=m.getUint32(r[4]+0x10+0,true);
m.setUint32(r[0]+0x3c+0,u[0],true);
u[0]=m.getUint32(r[4]+0x14+0,true);
m.setUint32(r[0]+0x40+0,u[0],true);
u[0]=m.getUint32(r[4]+0x18+0,true);
m.setUint32(r[0]+0x44+0,u[0],true);
m.setUint32(r[0]+0x8+0,0x0,true);
m.setUint32(r[0]+0x4+0,0x0,true);
r[4]+=4;return;
case 5478:
r[0]=m.getUint32(r[4]+0x4+0,true);
r[2]=m.getUint32(r[4]+0x8+0,true);
u[0]=m.getUint32(r[4]+0x14+0,true);
m.setUint8(r[0]+0x63+0,0x0,true);
m.setUint8(r[0]+0x62+0,0x0,true);
m.setUint8(r[0]+0x61+0,0x0,true);
m.setUint8(r[0]+0x60+0,0x0,true);
m.setUint32(r[0]+0x38+0,0x0,true);
m.setUint32(r[0]+0x34+0,0x0,true);
m.setUint32(r[0]+0x2c+0,0x0,true);
m.setUint32(r[0]+0x48+0,u[0],true);
m.setUint32(r[0]+0,0x1,true);
m.setUint32(r[0]+0x18+0,r[2],true);
m.setUint32(r[0]+0x10+0,r[2],true);
m.setUint32(r[0]+0x30+0,0x0,true);
u[4]=m.getUint32(r[4]+0xc+0,true);
m.setUint32(r[0]+0x3c+0,u[4],true);
u[4]=m.getUint32(r[4]+0x10+0,true);
m.setUint32(r[0]+0x40+0,u[4],true);
m.setUint32(r[0]+0x44+0,u[0],true);
m.setUint32(r[0]+0x8+0,0x0,true);
m.setUint32(r[0]+0x4+0,0x0,true);
r[2]=m.getUint32(r[4]+0x18+0,true);
m.setUint32(r[0]+0xc+0,r[2],true);
r[4]+=4;return;
case 5602:
r[0]=m.getUint32(r[4]+0x4+0,true);
u[0]=m.getUint32(r[4]+0xc+0,true);
u[4]=m.getUint32(r[4]+0x10+0,true);
u[8]=m.getUint32(r[4]+0x14+0,true);
m.setUint32(r[0]+0x8+0,0x0,true);
m.setUint32(r[0]+0x4+0,0x0,true);
m.setUint32(r[0]+0xc+0,0x4056,true);
u[12]=u[0];u[13]=u[1];u[14]=u[2];u[15]=u[3];
u[12]=u[12]&m.getUint32(0x4890+0,true);u[13]=u[13]&m.getUint32(0x4890+4,true);u[14]=u[14]&m.getUint32(0x4890+8,true);u[15]=u[15]&m.getUint32(0x4890+12,true);
u[16]=m.getUint32(0x481c+0,true);
a=f[16];b=f[12];Z=!(a<b||a>b);C=!(a>=b);O=S=false;
if(C){pc=5698;continue;}
u[12]=u[4];u[13]=u[5];u[14]=u[6];u[15]=u[7];
u[12]=u[12]&m.getUint32(0x4890+0,true);u[13]=u[13]&m.getUint32(0x4890+4,true);u[14]=u[14]&m.getUint32(0x4890+8,true);u[15]=u[15]&m.getUint32(0x4890+12,true);
a=f[16];b=f[12];Z=!(a<b||a>b);C=!(a>=b);O=S=false;
if(C){pc=5698;continue;}
u[12]=u[8];u[13]=u[9];u[14]=u[10];u[15]=u[11];
u[12]=u[12]&m.getUint32(0x4890+0,true);u[13]=u[13]&m.getUint32(0x4890+4,true);u[14]=u[14]&m.getUint32(0x4890+8,true);u[15]=u[15]&m.getUint32(0x4890+12,true);
a=f[16];b=f[12];Z=!(a<b||a>b);C=!(a>=b);O=S=false;
if(!C){pc=5713;continue;}
case 5698:
m.setUint32(r[0]+0,0xb,true);
r[2]=0x40ae;
case 5709:
m.setUint32(r[0]+0xc+0,r[2],true);
r[4]+=4;return;
case 5713:
m.setUint32(r[0]+0x2c+0,0x0,true);
r[1]=m.getUint32(r[4]+0x8+0,true);
m.setUint32(r[0]+0x14+0,r[1],true);
m.setUint32(r[0]+0x24+0,u[0],true);
m.setUint32(r[0]+0x28+0,u[4],true);
m.setUint32(r[0]+0x48+0,u[8],true);
m.setUint8(r[0]+0x63+0,0x0,true);
m.setUint8(r[0]+0x62+0,0x0,true);
m.setUint8(r[0]+0x61+0,0x0,true);
m.setUint8(r[0]+0x60+0,0x0,true);
m.setUint32(r[0]+0,0x1,true);
m.setUint32(r[0]+0x18+0,r[1],true);
m.setUint32(r[0]+0x10+0,r[1],true);
m.setUint32(r[0]+0x30+0,0x0,true);
m.setUint32(r[0]+0x3c+0,u[0],true);
m.setUint32(r[0]+0x40+0,u[4],true);
m.setUint32(r[0]+0x44+0,u[8],true);
r[2]=0x40c0;
pc=5709;continue;

case 5800:
r[0]=m.getUint32(r[4]+0x4+0,true);
r[2]=m.getUint32(r[4]+0xc+0,true);
u[0]=m.getUint32(r[4]+0x18+0,true);
m.setUint32(r[0]+0x4c+0,u[0],true);
flags(m.getUint8(r[4]+0x8+0,true),0x0,8,1);
if(!Z){pc=5866;continue;}
u[4]=u[0];u[5]=u[1];u[6]=u[2];u[7]=u[3];
f[4]=f[4]+m.getFloat32(0x4820,true);
m.setUint32(r[0]+0x50+0,u[4],true);
m.setUint32(r[0]+0,0x2,true);
m.setUint32(r[0]+0x18+0,r[2],true);
m.setUint32(r[0]+0x10+0,r[2],true);
u[4]=m.getUint32(r[0]+0x2c+0,true);
r[2]=0x4350;
pc=5904;continue;
case 5866:
u[4]=u[0];u[5]=u[1];u[6]=u[2];u[7]=u[3];
f[4]=f[4]-m.getFloat32(0x4820,true);
m.setUint32(r[0]+0x50+0,u[4],true);
m.setUint32(r[0]+0,0x7,true);
m.setUint32(r[0]+0x18+0,r[2],true);
m.setUint32(r[0]+0x10+0,r[2],true);
u[4]=m.getUint32(r[0]+0x2c+0,true);
r[2]=0x40cd;
case 5904:
m.setUint32(r[0]+0x30+0,u[4],true);
u[4]=m.getUint32(r[4]+0x10+0,true);
m.setUint32(r[0]+0x3c+0,u[4],true);
u[4]=m.getUint32(r[4]+0x14+0,true);
m.setUint32(r[0]+0x40+0,u[4],true);
m.setUint32(r[0]+0x44+0,u[0],true);
m.setUint32(r[0]+0x8+0,0x0,true);
m.setUint32(r[0]+0x4+0,0x0,true);
m.setUint8(r[0]+0x63+0,0x0,true);
m.setUint8(r[0]+0x62+0,0x0,true);
m.setUint8(r[0]+0x60+0,0x0,true);
m.setUint8(r[0]+0x61+0,0x0,true);
m.setUint32(r[0]+0xc+0,r[2],true);
r[4]+=4;return;
case 5970:
flags(r[4],0x1c,32,1);r[4]=res;
m.setUint32(r[4]+0x18+0,r[3],true);
r[3]=m.getUint32(r[4]+0x20+0,true);
m.setUint32(r[4]+0x4+0,0x40c90fdb,true);
u[0]=m.getUint32(r[4]+0x28+0,true);
f[0]=f[0]-m.getFloat32(r[4]+0x24,true);
m.setUint32(r[4]+0,u[0],true);
r[4]-=4;m.setUint32(r[4],0,true);run(15811);
u[0]=r[0];
f[0]=f[0]*m.getFloat32(0x4828,true);
u[4]=m.getUint32(0x4824+0,true);
a=f[4];b=f[0];Z=!(a<b||a>b);C=!(a>=b);O=S=false;
if((!C&&!Z)){pc=6095;continue;}
u[8]=m.getUint32(0x482c+0,true);
u[4]=u[8];u[5]=u[9];u[6]=u[10];u[7]=u[11];
u[4]=f[4]<f[0]?0xffffffff:0;
u[8]=u[8]&u[4];u[9]=u[9]&u[5];u[10]=u[10]&u[6];u[11]=u[11]&u[7];
u[4]=~u[4]&u[0];u[5]=~u[5]&u[1];u[6]=~u[6]&u[2];u[7]=~u[7]&u[3];
u[4]=u[4]|u[8];u[5]=u[5]|u[9];u[6]=u[6]|u[10];u[7]=u[7]|u[11];
case 6061:
m.setUint32(r[4]+0,u[4],true);
r[4]-=4;m.setUint32(r[4],0,true);run(15813);
r[2]=0x37;
flags(r[2],r[0],32,1);r[2]=res;
m.setUint32(r[3]+0x4+0,r[2],true);
flags(r[0],0x37,32,0);r[0]=res;
m.setUint32(r[3]+0x8+0,r[0],true);
r[3]=m.getUint32(r[4]+0x18+0,true);
flags(r[4],0x1c,32,0);r[4]=res;
r[4]+=4;return;
case 6095:
u[4]=m.getUint32(0x4824+0,true);
pc=6061;continue;

case 6106:
flags(r[4],0x2c,32,1);r[4]=res;
m.setUint32(r[4]+0x20+0,r[3],true);
m.setUint32(r[4]+0x24+0,r[6],true);
m.setUint32(r[4]+0x28+0,r[7],true);
r[3]=m.getUint32(r[4]+0x30+0,true);
r[6]=m.getUint16(r[4]+0x48+0,true);
r[7]=m.getUint16(r[4]+0x4c+0,true);
r[0]=m.getUint32(r[3]+0,true);
r[2]=r[0]-0xa;
flags(r[2],0x1,32,1);
if((C||Z)){pc=6533;continue;}
flags(r[0]&r[0],0,32,0);C=O=false;
if(Z){pc=6533;continue;}
u[0]=m.getUint32(r[4]+0x38+0,true);
u[0]=u[0]&m.getUint32(0x4890+0,true);u[1]=u[1]&m.getUint32(0x4890+4,true);u[2]=u[2]&m.getUint32(0x4890+8,true);u[3]=u[3]&m.getUint32(0x4890+12,true);
u[4]=m.getUint32(0x481c+0,true);
a=f[4];b=f[0];Z=!(a<b||a>b);C=!(a>=b);O=S=false;
if(C){pc=6506;continue;}
u[0]=m.getUint32(r[4]+0x3c+0,true);
u[0]=u[0]&m.getUint32(0x4890+0,true);u[1]=u[1]&m.getUint32(0x4890+4,true);u[2]=u[2]&m.getUint32(0x4890+8,true);u[3]=u[3]&m.getUint32(0x4890+12,true);
a=f[4];b=f[0];Z=!(a<b||a>b);C=!(a>=b);O=S=false;
if(C){pc=6506;continue;}
u[0]=m.getUint32(r[4]+0x40+0,true);
u[0]=u[0]&m.getUint32(0x4890+0,true);u[1]=u[1]&m.getUint32(0x4890+4,true);u[2]=u[2]&m.getUint32(0x4890+8,true);u[3]=u[3]&m.getUint32(0x4890+12,true);
a=f[4];b=f[0];Z=!(a<b||a>b);C=!(a>=b);O=S=false;
if(C){pc=6506;continue;}
r[0]=m.getUint32(r[4]+0x34+0,true);
flags(r[0],m.getUint32(r[3]+0x14+0,true),32,1);r[0]=res;
flags(r[0],0x12c,32,1);
if((!C&&!Z)){pc=6549;continue;}
u[0]=m.getUint32(r[4]+0x3c+0,true);
f[0]=f[0]-m.getFloat32(r[3]+0x28,true);
m.setUint32(r[4]+0x4+0,u[0],true);
u[0]=m.getUint32(r[4]+0x38+0,true);
f[0]=f[0]-m.getFloat32(r[3]+0x24,true);
m.setUint32(r[4]+0,u[0],true);
r[4]-=4;m.setUint32(r[4],0,true);run(15810);
u[0]=r[0];
f[0]=f[0]+m.getFloat32(r[3]+0x2c,true);
m.setUint32(r[3]+0x2c+0,u[0],true);
u[16]=m.getUint32(r[4]+0x38+0,true);
m.setUint32(r[3]+0x24+0,u[16],true);
u[20]=m.getUint32(r[4]+0x3c+0,true);
m.setUint32(r[3]+0x28+0,u[20],true);
r[0]=m.getUint32(r[4]+0x34+0,true);
m.setUint32(r[3]+0x14+0,r[0],true);
r[2]=m.getUint32(r[3]+0,true);
flags(r[2],0x2,32,1);
if(Z){pc=6578;continue;}
flags(r[2],0x7,32,1);
if(Z){pc=6578;continue;}
flags(r[2],0x8,32,1);
r[0]=(r[0]&~255)|((((Z?1:0))&255)<<0);
flags(r[2],0x3,32,1);
if(Z){pc=6846;continue;}
flags(((r[0]>>>0)&255)&((r[0]>>>0)&255),0,8,0);C=O=false;
if(!Z){pc=6846;continue;}
flags(m.getUint32(r[3]+0x4+0,true),0x0,32,1);
if((Z||S!==O)){pc=6403;continue;}
flags(m.getUint32(r[3]+0x8+0,true),0x0,32,1);
if((Z||S!==O)){pc=6403;continue;}
r[0]=m.getUint32(r[4]+0x34+0,true);
flags(r[0],m.getUint32(r[3]+0x18+0,true),32,1);r[0]=res;
flags(r[0],0x707,32,1);
if((!C&&!Z)){pc=7149;continue;}
case 6403:
r[0]=m.getUint32(r[3]+0,true);
flags(r[0],0x9,32,1);
if(Z){pc=7282;continue;}
flags(r[0],0x6,32,1);
if(Z){pc=7536;continue;}
flags(r[6],0x898,32,1);
if((C||Z)){pc=7941;continue;}
flags(r[0],0x1,32,1);
if(Z){pc=8006;continue;}
flags(r[0],0x4,32,1);
if(Z){pc=8006;continue;}
flags(r[0],0x5,32,1);
if(!Z){pc=6533;continue;}
flags(r[7],0xd16,32,1);
if((!C&&!Z)){pc=8335;continue;}
flags(m.getUint8(r[3]+0x60+0,true),0x0,8,1);
if(!Z){pc=8285;continue;}
m.setUint8(r[3]+0x60+0,0x1,true);
r[0]=m.getUint32(r[4]+0x34+0,true);
m.setUint32(r[3]+0x1c+0,r[0],true);
u[0]=m.getUint32(r[3]+0x2c+0,true);
m.setUint32(r[3]+0x34+0,u[0],true);
pc=8719;continue;
case 6506:
m.setUint32(r[3]+0,0xb,true);
m.setUint32(r[3]+0x8+0,0x0,true);
m.setUint32(r[3]+0x4+0,0x0,true);
m.setUint32(r[3]+0xc+0,0x40ae,true);
case 6533:
r[3]=m.getUint32(r[4]+0x20+0,true);
r[6]=m.getUint32(r[4]+0x24+0,true);
r[7]=m.getUint32(r[4]+0x28+0,true);
flags(r[4],0x2c,32,0);r[4]=res;
r[4]+=4;return;
case 6549:
m.setUint32(r[3]+0,0xb,true);
m.setUint32(r[3]+0x8+0,0x0,true);
m.setUint32(r[3]+0x4+0,0x0,true);
m.setUint32(r[3]+0xc+0,0x411e,true);
pc=6533;continue;
case 6578:
u[8]=m.getUint32(0x4834+0,true);
flags(r[2],0x2,32,1);
if(Z){pc=6736;continue;}
case 6595:
u[4]=m.getUint32(r[4]+0x40+0,true);
f[4]=f[4]-m.getFloat32(r[3]+0x4c,true);
f[4]=f[4]*f[8];
u[12]=m.getUint32(0x483c+0,true);
a=f[12];b=f[4];Z=!(a<b||a>b);C=!(a>=b);O=S=false;
if((!C&&!Z)){pc=6749;continue;}
r[0]=m.getUint32(r[4]+0x34+0,true);
flags(r[0],m.getUint32(r[3]+0x10+0,true),32,1);r[0]=res;
flags(r[0],0x1770,32,1);
if((!C&&!Z)){pc=6781;continue;}
a=f[4];b=m.getFloat32(0x4840,true);Z=!(a<b||a>b);C=!(a>=b);O=S=false;
if(C){pc=6813;continue;}
flags(r[2],0x2,32,1);
r[0]=(r[0]&~255)|((((!Z?1:0))&255)<<0);
r[0]=((r[0]>>>0)&255);
r[0]=r[0]+r[0]*4+0x3;
m.setUint32(r[3]+0,r[0],true);
r[0]=m.getUint32(r[4]+0x34+0,true);
m.setUint32(r[3]+0x18+0,r[0],true);
m.setUint32(r[3]+0x10+0,r[0],true);
m.setUint32(r[3]+0x30+0,u[0],true);
u[24]=m.getUint32(r[4]+0x38+0,true);
m.setUint32(r[3]+0x3c+0,u[24],true);
u[28]=m.getUint32(r[4]+0x3c+0,true);
m.setUint32(r[3]+0x40+0,u[28],true);
u[24]=m.getUint32(r[4]+0x40+0,true);
m.setUint32(r[3]+0x44+0,u[24],true);
m.setUint32(r[3]+0x8+0,0x0,true);
m.setUint32(r[3]+0x4+0,0x0,true);
pc=6533;continue;
case 6736:
u[8]=m.getUint32(0x4830+0,true);
pc=6595;continue;
case 6749:
m.setUint32(r[3]+0,0xb,true);
m.setUint32(r[3]+0x8+0,0x0,true);
m.setUint32(r[3]+0x4+0,0x0,true);
m.setUint32(r[3]+0xc+0,0x4374,true);
pc=6533;continue;
case 6781:
m.setUint32(r[3]+0,0xb,true);
m.setUint32(r[3]+0x8+0,0x0,true);
m.setUint32(r[3]+0x4+0,0x0,true);
m.setUint32(r[3]+0xc+0,0x4133,true);
pc=6533;continue;
case 6813:
r[0]=0xffffffce;
u[0]=u[0]^u[0];u[1]=u[1]^u[1];u[2]=u[2]^u[2];u[3]=u[3]^u[3];
a=f[8];b=f[0];Z=!(a<b||a>b);C=!(a>=b);O=S=false;
r[2]=0x32;
if((C||Z)){r[0]=r[2];}
m.setUint32(r[3]+0x4+0,r[0],true);
flags(0,r[0],32,1);r[0]=res;
m.setUint32(r[3]+0x8+0,r[0],true);
pc=6533;continue;
case 6846:
m.setUint32(r[3]+0x8+0,0x0,true);
m.setUint32(r[3]+0x4+0,0x0,true);
r[1]=m.getUint32(r[4]+0x34+0,true);
flags(r[1],m.getUint32(r[3]+0x10+0,true),32,1);r[1]=res;
flags(r[1],0xf9,32,1);
if((C||Z)){pc=6533;continue;}
u[4]=m.getUint32(r[3]+0x50+0,true);
f[4]=f[4]-m.getFloat32(r[4]+0x40,true);
u[4]=u[4]&m.getUint32(0x4890+0,true);u[5]=u[5]&m.getUint32(0x4890+4,true);u[6]=u[6]&m.getUint32(0x4890+8,true);u[7]=u[7]&m.getUint32(0x4890+12,true);
a=f[4];b=m.getFloat32(0x4844,true);Z=!(a<b||a>b);C=!(a>=b);O=S=false;
if((!C&&!Z)){pc=7010;continue;}
u[28]=m.getUint32(r[4]+0x40+0,true);
m.setUint32(r[3]+0x48+0,u[28],true);
flags(r[6],0xf6d,32,1);
if((!C&&!Z)){pc=6933;continue;}
flags(((r[0]>>>0)&255)&((r[0]>>>0)&255),0,8,0);C=O=false;
if(!Z){pc=7075;continue;}
case 6933:
flags(r[2],0x8,32,1);
if(Z){pc=7134;continue;}
r[2]=0x4;
r[0]=0x40ea;
case 6952:
m.setUint32(r[3]+0,r[2],true);
r[1]=m.getUint32(r[4]+0x34+0,true);
m.setUint32(r[3]+0x18+0,r[1],true);
m.setUint32(r[3]+0x10+0,r[1],true);
m.setUint32(r[3]+0x30+0,u[0],true);
u[28]=m.getUint32(r[4]+0x38+0,true);
m.setUint32(r[3]+0x3c+0,u[28],true);
u[24]=m.getUint32(r[4]+0x3c+0,true);
m.setUint32(r[3]+0x40+0,u[24],true);
u[28]=m.getUint32(r[4]+0x40+0,true);
m.setUint32(r[3]+0x44+0,u[28],true);
m.setUint32(r[3]+0xc+0,r[0],true);
pc=6533;continue;
case 7010:
m.setUint32(r[4]+0x14+0,0x4398,true);
u[24]=m.getUint32(r[4]+0x40+0,true);
m.setUint32(r[4]+0x10+0,u[24],true);
u[12]=m.getUint32(r[4]+0x3c+0,true);
m.setUint32(r[4]+0xc+0,u[12],true);
u[28]=m.getUint32(r[4]+0x38+0,true);
m.setUint32(r[4]+0x8+0,u[28],true);
r[0]=m.getUint32(r[4]+0x34+0,true);
m.setUint32(r[4]+0x4+0,r[0],true);
m.setUint32(r[4]+0,r[3],true);
r[4]-=4;m.setUint32(r[4],0,true);run(5478);
pc=6533;continue;
case 7075:
m.setUint32(r[4]+0x14+0,0x43cc,true);
m.setUint32(r[4]+0x10+0,u[28],true);
u[24]=m.getUint32(r[4]+0x3c+0,true);
m.setUint32(r[4]+0xc+0,u[24],true);
u[28]=m.getUint32(r[4]+0x38+0,true);
m.setUint32(r[4]+0x8+0,u[28],true);
r[0]=m.getUint32(r[4]+0x34+0,true);
m.setUint32(r[4]+0x4+0,r[0],true);
m.setUint32(r[4]+0,r[3],true);
r[4]-=4;m.setUint32(r[4],0,true);run(5478);
pc=6533;continue;
case 7134:
r[2]=0x9;
r[0]=0x4102;
pc=6952;continue;
case 7149:
u[0]=m.getUint32(r[3]+0x44+0,true);
m.setUint32(r[4]+0x4+0,u[0],true);
u[0]=m.getUint32(r[3]+0x40+0,true);
m.setUint32(r[4]+0,u[0],true);
u[8]=m.getUint32(r[3]+0x3c+0,true);
u[4]=m.getUint32(r[4]+0x3c+0,true);
u[0]=m.getUint32(r[4]+0x38+0,true);
r[4]-=4;m.setUint32(r[4],0,true);run(4096);
u[4]=m.getUint32(0x4848+0,true);
a=f[4];b=f[0];Z=!(a<b||a>b);C=!(a>=b);O=S=false;
if((!C&&!Z)){pc=7250;continue;}
u[28]=m.getUint32(r[4]+0x38+0,true);
m.setUint32(r[3]+0x3c+0,u[28],true);
u[24]=m.getUint32(r[4]+0x3c+0,true);
m.setUint32(r[3]+0x40+0,u[24],true);
u[28]=m.getUint32(r[4]+0x40+0,true);
m.setUint32(r[3]+0x44+0,u[28],true);
r[0]=m.getUint32(r[4]+0x34+0,true);
m.setUint32(r[3]+0x18+0,r[0],true);
pc=6403;continue;
case 7250:
m.setUint32(r[3]+0,0xb,true);
m.setUint32(r[3]+0x8+0,0x0,true);
m.setUint32(r[3]+0x4+0,0x0,true);
m.setUint32(r[3]+0xc+0,0x4141,true);
pc=6533;continue;
case 7282:
flags(r[6],0x898,32,1);
if((C||Z)){pc=7435;continue;}
u[0]=m.getUint32(r[3]+0x48+0,true);
m.setUint32(r[4]+0x4+0,u[0],true);
u[0]=m.getUint32(r[3]+0x58+0,true);
m.setUint32(r[4]+0,u[0],true);
u[8]=m.getUint32(r[3]+0x54+0,true);
u[4]=m.getUint32(r[4]+0x3c+0,true);
u[0]=m.getUint32(r[4]+0x38+0,true);
r[4]-=4;m.setUint32(r[4],0,true);run(4096);
a=f[0];b=m.getFloat32(0x484c,true);Z=!(a<b||a>b);C=!(a>=b);O=S=false;
if(C){pc=7500;continue;}
m.setUint32(r[3]+0,0xa,true);
r[0]=m.getUint32(r[4]+0x34+0,true);
m.setUint32(r[3]+0x18+0,r[0],true);
m.setUint32(r[3]+0x10+0,r[0],true);
u[0]=m.getUint32(r[3]+0x2c+0,true);
m.setUint32(r[3]+0x30+0,u[0],true);
u[24]=m.getUint32(r[4]+0x38+0,true);
m.setUint32(r[3]+0x3c+0,u[24],true);
u[12]=m.getUint32(r[4]+0x3c+0,true);
m.setUint32(r[3]+0x40+0,u[12],true);
u[28]=m.getUint32(r[4]+0x40+0,true);
m.setUint32(r[3]+0x44+0,u[28],true);
m.setUint32(r[3]+0x8+0,0x0,true);
m.setUint32(r[3]+0x4+0,0x0,true);
m.setUint32(r[3]+0xc+0,0x442c,true);
pc=6533;continue;
case 7435:
m.setUint32(r[4]+0x14+0,0x4400,true);
u[24]=m.getUint32(r[4]+0x40+0,true);
m.setUint32(r[4]+0x10+0,u[24],true);
u[12]=m.getUint32(r[4]+0x3c+0,true);
m.setUint32(r[4]+0xc+0,u[12],true);
u[28]=m.getUint32(r[4]+0x38+0,true);
m.setUint32(r[4]+0x8+0,u[28],true);
r[0]=m.getUint32(r[4]+0x34+0,true);
m.setUint32(r[4]+0x4+0,r[0],true);
m.setUint32(r[4]+0,r[3],true);
r[4]-=4;m.setUint32(r[4],0,true);run(5478);
pc=6533;continue;
case 7500:
u[0]=m.getUint32(r[3]+0x48+0,true);
m.setUint32(r[4]+0x8+0,u[0],true);
u[24]=m.getUint32(r[4]+0x40+0,true);
m.setUint32(r[4]+0x4+0,u[24],true);
m.setUint32(r[4]+0,r[3],true);
r[4]-=4;m.setUint32(r[4],0,true);run(5970);
pc=6533;continue;
case 7536:
flags(r[6],0x898,32,1);
if((C||Z)){pc=7710;continue;}
flags(r[7],0xe41,32,1);
if((C||Z)){pc=7775;continue;}
u[0]=m.getUint32(r[3]+0x5c+0,true);
m.setUint32(r[4]+0x4+0,u[0],true);
u[0]=m.getUint32(r[3]+0x58+0,true);
m.setUint32(r[4]+0,u[0],true);
u[8]=m.getUint32(r[3]+0x54+0,true);
u[4]=m.getUint32(r[4]+0x3c+0,true);
u[0]=m.getUint32(r[4]+0x38+0,true);
r[4]-=4;m.setUint32(r[4],0,true);run(4096);
a=f[0];b=m.getFloat32(0x4850,true);Z=!(a<b||a>b);C=!(a>=b);O=S=false;
if((!C&&!Z)){pc=7840;continue;}
a=f[0];b=m.getFloat32(0x4854,true);Z=!(a<b||a>b);C=!(a>=b);O=S=false;
if(C){pc=7905;continue;}
u[28]=m.getUint32(r[4]+0x38+0,true);
m.setUint32(r[3]+0x54+0,u[28],true);
u[12]=m.getUint32(r[4]+0x3c+0,true);
m.setUint32(r[3]+0x58+0,u[12],true);
u[24]=m.getUint32(r[4]+0x40+0,true);
m.setUint32(r[4]+0x14+0,u[24],true);
m.setUint32(r[4]+0x10+0,u[12],true);
u[12]=m.getUint32(r[4]+0x38+0,true);
m.setUint32(r[4]+0xc+0,u[12],true);
r[0]=m.getUint32(r[4]+0x34+0,true);
m.setUint32(r[4]+0x8+0,r[0],true);
m.setUint32(r[4]+0x4+0,0x1,true);
m.setUint32(r[4]+0,r[3],true);
r[4]-=4;m.setUint32(r[4],0,true);run(5800);
pc=6533;continue;
case 7710:
m.setUint32(r[4]+0x14+0,0x4458,true);
u[12]=m.getUint32(r[4]+0x40+0,true);
m.setUint32(r[4]+0x10+0,u[12],true);
u[12]=m.getUint32(r[4]+0x3c+0,true);
m.setUint32(r[4]+0xc+0,u[12],true);
u[24]=m.getUint32(r[4]+0x38+0,true);
m.setUint32(r[4]+0x8+0,u[24],true);
r[0]=m.getUint32(r[4]+0x34+0,true);
m.setUint32(r[4]+0x4+0,r[0],true);
m.setUint32(r[4]+0,r[3],true);
r[4]-=4;m.setUint32(r[4],0,true);run(5478);
pc=6533;continue;
case 7775:
m.setUint32(r[4]+0x14+0,0x4488,true);
u[28]=m.getUint32(r[4]+0x40+0,true);
m.setUint32(r[4]+0x10+0,u[28],true);
u[12]=m.getUint32(r[4]+0x3c+0,true);
m.setUint32(r[4]+0xc+0,u[12],true);
u[24]=m.getUint32(r[4]+0x38+0,true);
m.setUint32(r[4]+0x8+0,u[24],true);
r[0]=m.getUint32(r[4]+0x34+0,true);
m.setUint32(r[4]+0x4+0,r[0],true);
m.setUint32(r[4]+0,r[3],true);
r[4]-=4;m.setUint32(r[4],0,true);run(5478);
pc=6533;continue;
case 7840:
m.setUint32(r[4]+0x14+0,0x44c0,true);
u[28]=m.getUint32(r[4]+0x40+0,true);
m.setUint32(r[4]+0x10+0,u[28],true);
u[12]=m.getUint32(r[4]+0x3c+0,true);
m.setUint32(r[4]+0xc+0,u[12],true);
u[24]=m.getUint32(r[4]+0x38+0,true);
m.setUint32(r[4]+0x8+0,u[24],true);
r[0]=m.getUint32(r[4]+0x34+0,true);
m.setUint32(r[4]+0x4+0,r[0],true);
m.setUint32(r[4]+0,r[3],true);
r[4]-=4;m.setUint32(r[4],0,true);run(5478);
pc=6533;continue;
case 7905:
u[0]=m.getUint32(r[3]+0x5c+0,true);
m.setUint32(r[4]+0x8+0,u[0],true);
u[24]=m.getUint32(r[4]+0x40+0,true);
m.setUint32(r[4]+0x4+0,u[24],true);
m.setUint32(r[4]+0,r[3],true);
r[4]-=4;m.setUint32(r[4],0,true);run(5970);
pc=6533;continue;
case 7941:
u[12]=m.getUint32(r[4]+0x40+0,true);
m.setUint32(r[4]+0x14+0,u[12],true);
u[24]=m.getUint32(r[4]+0x3c+0,true);
m.setUint32(r[4]+0x10+0,u[24],true);
u[28]=m.getUint32(r[4]+0x38+0,true);
m.setUint32(r[4]+0xc+0,u[28],true);
r[0]=m.getUint32(r[4]+0x34+0,true);
m.setUint32(r[4]+0x8+0,r[0],true);
m.setUint32(r[4]+0x4+0,0x0,true);
m.setUint32(r[4]+0,r[3],true);
r[4]-=4;m.setUint32(r[4],0,true);run(5800);
pc=6533;continue;
case 8006:
flags(r[7],0xd16,32,1);
if((!C&&!Z)){pc=8156;continue;}
flags(m.getUint8(r[3]+0x60+0,true),0x0,8,1);
if(!Z){pc=8047;continue;}
m.setUint8(r[3]+0x60+0,0x1,true);
r[1]=m.getUint32(r[4]+0x34+0,true);
m.setUint32(r[3]+0x1c+0,r[1],true);
u[0]=m.getUint32(r[3]+0x2c+0,true);
m.setUint32(r[3]+0x34+0,u[0],true);
pc=8160;continue;
case 8047:
r[2]=m.getUint32(r[4]+0x34+0,true);
flags(r[2],m.getUint32(r[3]+0x1c+0,true),32,1);r[2]=res;
flags(r[2],0x95,32,1);
if((C||Z)){pc=8160;continue;}
u[28]=m.getUint32(r[4]+0x40+0,true);
m.setUint32(r[3]+0x48+0,u[28],true);
m.setUint8(r[3]+0x61+0,0x0,true);
m.setUint32(r[3]+0,0x5,true);
r[0]=m.getUint32(r[4]+0x34+0,true);
m.setUint32(r[3]+0x18+0,r[0],true);
m.setUint32(r[3]+0x10+0,r[0],true);
u[0]=m.getUint32(r[3]+0x2c+0,true);
m.setUint32(r[3]+0x30+0,u[0],true);
u[12]=m.getUint32(r[4]+0x38+0,true);
m.setUint32(r[3]+0x3c+0,u[12],true);
u[24]=m.getUint32(r[4]+0x3c+0,true);
m.setUint32(r[3]+0x40+0,u[24],true);
m.setUint32(r[3]+0x44+0,u[28],true);
m.setUint32(r[3]+0x8+0,0x0,true);
m.setUint32(r[3]+0x4+0,0x0,true);
m.setUint32(r[3]+0xc+0,0x4156,true);
pc=6533;continue;
case 8156:
m.setUint8(r[3]+0x60+0,0x0,true);
case 8160:
flags(r[0],0x4,32,1);
if(!Z){pc=8184;continue;}
u[0]=m.getUint32(r[3]+0x2c+0,true);
f[0]=f[0]-m.getFloat32(r[3]+0x30,true);
a=f[0];b=m.getFloat32(0x4818,true);Z=!(a<b||a>b);C=!(a>=b);O=S=false;
if(!C){pc=8220;continue;}
case 8184:
u[0]=m.getUint32(r[3]+0x48+0,true);
m.setUint32(r[4]+0x8+0,u[0],true);
u[12]=m.getUint32(r[4]+0x40+0,true);
m.setUint32(r[4]+0x4+0,u[12],true);
m.setUint32(r[4]+0,r[3],true);
r[4]-=4;m.setUint32(r[4],0,true);run(5970);
pc=6533;continue;
case 8220:
m.setUint32(r[4]+0x14+0,0x44f0,true);
u[12]=m.getUint32(r[4]+0x40+0,true);
m.setUint32(r[4]+0x10+0,u[12],true);
u[24]=m.getUint32(r[4]+0x3c+0,true);
m.setUint32(r[4]+0xc+0,u[24],true);
u[28]=m.getUint32(r[4]+0x38+0,true);
m.setUint32(r[4]+0x8+0,u[28],true);
r[0]=m.getUint32(r[4]+0x34+0,true);
m.setUint32(r[4]+0x4+0,r[0],true);
m.setUint32(r[4]+0,r[3],true);
r[4]-=4;m.setUint32(r[4],0,true);run(5478);
pc=6533;continue;
case 8285:
r[0]=m.getUint32(r[4]+0x34+0,true);
flags(r[0],m.getUint32(r[3]+0x1c+0,true),32,1);r[0]=res;
flags(r[0],0x95,32,1);
if((C||Z)){pc=8719;continue;}
u[0]=m.getUint32(r[3]+0x2c+0,true);
f[0]=f[0]-m.getFloat32(r[3]+0x34,true);
a=f[0];b=m.getFloat32(0x4850,true);Z=!(a<b||a>b);C=!(a>=b);O=S=false;
if(C){pc=8719;continue;}
m.setUint8(r[3]+0x61+0,0x1,true);
pc=8719;continue;
case 8335:
m.setUint8(r[3]+0x60+0,0x0,true);
flags(r[7],0xd79,32,1);
if((C||Z)){pc=8719;continue;}
flags(m.getUint8(r[3]+0x61+0,true),0x0,8,1);
if(Z){pc=8711;continue;}
flags(m.getUint8(r[3]+0x62+0,true),0x0,8,1);
if(!Z){pc=8404;continue;}
m.setUint8(r[3]+0x62+0,0x1,true);
u[12]=m.getUint32(r[4]+0x38+0,true);
m.setUint32(r[3]+0x54+0,u[12],true);
u[24]=m.getUint32(r[4]+0x3c+0,true);
m.setUint32(r[3]+0x58+0,u[24],true);
u[28]=m.getUint32(r[4]+0x40+0,true);
m.setUint32(r[3]+0x5c+0,u[28],true);
case 8404:
u[0]=m.getUint32(r[3]+0x5c+0,true);
m.setUint32(r[4]+0x4+0,u[0],true);
u[0]=m.getUint32(r[3]+0x58+0,true);
m.setUint32(r[4]+0,u[0],true);
u[8]=m.getUint32(r[3]+0x54+0,true);
u[4]=m.getUint32(r[4]+0x3c+0,true);
u[0]=m.getUint32(r[4]+0x38+0,true);
r[4]-=4;m.setUint32(r[4],0,true);run(4096);
a=f[0];b=m.getFloat32(0x4850,true);Z=!(a<b||a>b);C=!(a>=b);O=S=false;
if((!C&&!Z)){pc=8495;continue;}
flags(r[7],0xe41,32,1);
if((C||Z)){pc=8671;continue;}
flags(m.getUint8(r[3]+0x63+0,true),0x0,8,1);
if(!Z){pc=8560;continue;}
m.setUint8(r[3]+0x63+0,0x1,true);
r[0]=m.getUint32(r[4]+0x34+0,true);
m.setUint32(r[3]+0x20+0,r[0],true);
m.setUint32(r[3]+0x38+0,u[0],true);
pc=8675;continue;
case 8495:
m.setUint32(r[4]+0x14+0,0x4520,true);
u[12]=m.getUint32(r[4]+0x40+0,true);
m.setUint32(r[4]+0x10+0,u[12],true);
u[24]=m.getUint32(r[4]+0x3c+0,true);
m.setUint32(r[4]+0xc+0,u[24],true);
u[28]=m.getUint32(r[4]+0x38+0,true);
m.setUint32(r[4]+0x8+0,u[28],true);
r[0]=m.getUint32(r[4]+0x34+0,true);
m.setUint32(r[4]+0x4+0,r[0],true);
m.setUint32(r[4]+0,r[3],true);
r[4]-=4;m.setUint32(r[4],0,true);run(5478);
pc=6533;continue;
case 8560:
r[0]=m.getUint32(r[4]+0x34+0,true);
flags(r[0],m.getUint32(r[3]+0x20+0,true),32,1);r[0]=res;
flags(r[0],0x63,32,1);
if((C||Z)){pc=8675;continue;}
f[0]=f[0]-m.getFloat32(r[3]+0x38,true);
a=f[0];b=m.getFloat32(0x4858,true);Z=!(a<b||a>b);C=!(a>=b);O=S=false;
if(C){pc=8675;continue;}
m.setUint32(r[3]+0,0x6,true);
r[0]=m.getUint32(r[4]+0x34+0,true);
m.setUint32(r[3]+0x18+0,r[0],true);
m.setUint32(r[3]+0x10+0,r[0],true);
u[0]=m.getUint32(r[3]+0x2c+0,true);
m.setUint32(r[3]+0x30+0,u[0],true);
u[12]=m.getUint32(r[4]+0x38+0,true);
m.setUint32(r[3]+0x3c+0,u[12],true);
u[24]=m.getUint32(r[4]+0x3c+0,true);
m.setUint32(r[3]+0x40+0,u[24],true);
u[28]=m.getUint32(r[4]+0x40+0,true);
m.setUint32(r[3]+0x44+0,u[28],true);
m.setUint32(r[3]+0x8+0,0x0,true);
m.setUint32(r[3]+0x4+0,0x0,true);
m.setUint32(r[3]+0xc+0,0x4568,true);
pc=6533;continue;
case 8671:
m.setUint8(r[3]+0x63+0,0x0,true);
case 8675:
u[0]=m.getUint32(r[3]+0x5c+0,true);
m.setUint32(r[4]+0x8+0,u[0],true);
u[12]=m.getUint32(r[4]+0x40+0,true);
m.setUint32(r[4]+0x4+0,u[12],true);
m.setUint32(r[4]+0,r[3],true);
r[4]-=4;m.setUint32(r[4],0,true);run(5970);
pc=6533;continue;
case 8711:
flags(r[7],0xe41,32,1);
if((!C&&!Z)){pc=8829;continue;}
case 8719:
m.setUint8(r[3]+0x63+0,0x0,true);
m.setUint8(r[3]+0x62+0,0x0,true);
u[0]=u[0]^u[0];u[1]=u[1]^u[1];u[2]=u[2]^u[2];u[3]=u[3]^u[3];
f[0]=(r[7]|0);
u[4]=m.getUint32(0x485c+0,true);
f[4]=f[4]-f[0];
f[4]=f[4]*m.getFloat32(0x4860,true);
u[0]=m.getUint32(0x4838+0,true);
a=f[0];b=f[4];Z=!(a<b||a>b);C=!(a>=b);O=S=false;
if((!C&&!Z)){pc=8793;continue;}
u[8]=m.getUint32(0x4864+0,true);
u[0]=u[8];u[1]=u[9];u[2]=u[10];u[3]=u[11];
u[0]=f[0]<f[4]?0xffffffff:0;
u[8]=u[8]&u[0];u[9]=u[9]&u[1];u[10]=u[10]&u[2];u[11]=u[11]&u[3];
u[0]=~u[0]&u[4];u[1]=~u[1]&u[5];u[2]=~u[2]&u[6];u[3]=~u[3]&u[7];
u[0]=u[0]|u[8];u[1]=u[1]|u[9];u[2]=u[2]|u[10];u[3]=u[3]|u[11];
case 8793:
f[0]=f[0]+m.getFloat32(r[3]+0x48,true);
m.setUint32(r[4]+0x8+0,u[0],true);
u[24]=m.getUint32(r[4]+0x40+0,true);
m.setUint32(r[4]+0x4+0,u[24],true);
m.setUint32(r[4]+0,r[3],true);
r[4]-=4;m.setUint32(r[4],0,true);run(5970);
pc=6533;continue;
case 8829:
m.setUint32(r[4]+0x14+0,0x4588,true);
u[24]=m.getUint32(r[4]+0x40+0,true);
m.setUint32(r[4]+0x10+0,u[24],true);
u[28]=m.getUint32(r[4]+0x3c+0,true);
m.setUint32(r[4]+0xc+0,u[28],true);
u[12]=m.getUint32(r[4]+0x38+0,true);
m.setUint32(r[4]+0x8+0,u[12],true);
r[0]=m.getUint32(r[4]+0x34+0,true);
m.setUint32(r[4]+0x4+0,r[0],true);
m.setUint32(r[4]+0,r[3],true);
r[4]-=4;m.setUint32(r[4],0,true);run(5478);
pc=6533;continue;
case 8894:
flags(r[4],0x1c,32,1);r[4]=res;
m.setUint32(r[4]+0x10+0,r[3],true);
m.setUint32(r[4]+0x14+0,r[6],true);
m.setUint32(r[4]+0x18+0,r[7],true);
r[3]=m.getUint32(r[4]+0x20+0,true);
r[0]=m.getUint32(r[4]+0x24+0,true);
r[7]=m.getUint32(r[4]+0x28+0,true);
flags(m.getUint8(r[3]+0,true),0x0,8,1);
if(Z){pc=9487;continue;}
flags(m.getUint8(r[3]+0x2+0,true),0x0,8,1);
if(Z){pc=9169;continue;}
u[0]=m.getUint32(r[0]+0x18+0,true);
f[0]=f[0]-m.getFloat32(r[3]+0xc,true);
r[6]=u[0];
flags(m.getUint8(r[3]+0x1+0,true),0x0,8,1);
if(!Z){pc=9268;continue;}
u[0]=m.getUint32(r[0]+0,true);
f[0]=f[0]+m.getFloat32(r[0]+0x4,true);
f[0]=f[0]*m.getFloat32(0x4868,true);
u[4]=m.getUint32(r[0]+0xc+0,true);
f[4]=f[4]*m.getFloat32(r[0]+0x8,true);
f[0]=f[0]/f[4];
f[0]=f[0]*m.getFloat32(0x486c,true);
u[4]=r[6];
u[4]=u[4]&m.getUint32(0x4890+0,true);u[5]=u[5]&m.getUint32(0x4890+4,true);u[6]=u[6]&m.getUint32(0x4890+8,true);u[7]=u[7]&m.getUint32(0x4890+12,true);
a=f[0];b=f[4];Z=!(a<b||a>b);C=!(a>=b);O=S=false;
if((!C&&!Z)){pc=9494;continue;}
case 9023:
r[0]=r[7];
flags(r[0],m.getUint32(r[3]+0x10+0,true),32,1);r[0]=res;
r[2]=((r[0]>>>0)&65535);
a=r[0];b=0x10 &31;if(b){C=((a>>>(b-1))&1)!==0;r[0]=a>>>b;Z=(r[0]===0);S=((r[0]|0)<0);O=false;}
u[0]=u[0]^u[0];u[1]=u[1]^u[1];u[2]=u[2]^u[2];u[3]=u[3]^u[3];
f[0]=(r[0]|0);
u[4]=u[4]^u[4];u[5]=u[5]^u[5];u[6]=u[6]^u[6];u[7]=u[7]^u[7];
f[4]=(r[2]|0);
f[0]=f[0]*m.getFloat32(0x4870,true);
f[0]=f[0]+f[4];
f[0]=f[0]*m.getFloat32(0x4874,true);
m.setUint32(r[3]+0x10+0,r[7],true);
u[4]=r[6];
f[4]=f[4]*m.getFloat32(0x484c,true);
u[8]=m.getUint32(0x4878+0,true);
a=f[8];b=f[0];Z=!(a<b||a>b);C=!(a>=b);O=S=false;
if((!C&&!Z)){pc=9101;continue;}
u[0]=u[8];u[1]=u[9];u[2]=u[10];u[3]=u[11];
case 9101:
f[0]=f[0]*f[4];
f[0]=f[0]+m.getFloat32(r[3]+0x14,true);
u[8]=u[4];u[9]=u[5];u[10]=u[6];u[11]=u[7];
f[8]=f[8]+f[0];
u[12]=m.getUint32(0x4850+0,true);
a=f[12];b=f[8];Z=!(a<b||a>b);C=!(a>=b);O=S=false;
if(!C){pc=9341;continue;}
u[12]=u[12]^u[12];u[13]=u[13]^u[13];u[14]=u[14]^u[14];u[15]=u[15]^u[15];
u[24]=r[6];
a=f[12];b=f[24];Z=!(a<b||a>b);C=!(a>=b);O=S=false;
if((C||Z)){pc=9403;continue;}
a=f[8];b=m.getFloat32(0x487c,true);Z=!(a<b||a>b);C=!(a>=b);O=S=false;
if(!C){pc=9363;continue;}
pc=9403;continue;
case 9169:
r[2]=m.getUint32(r[0]+0x10+0,true);
m.setUint32(r[3]+0x4+0,r[2],true);
r[2]=m.getUint32(r[0]+0x14+0,true);
m.setUint32(r[3]+0x8+0,r[2],true);
r[0]=m.getUint32(r[0]+0x18+0,true);
m.setUint32(r[3]+0xc+0,r[0],true);
flags(m.getUint8(r[3]+0x1+0,true),0x0,8,1);
if(!Z){pc=9217;continue;}
case 9193:
m.setUint32(r[3]+0x10+0,r[7],true);
m.setUint32(r[3]+0x14+0,0x0,true);
m.setUint8(r[3]+0x2+0,0x1,true);
r[0]=0x0;
pc=9465;continue;
case 9217:
u[0]=m.getUint32(r[3]+0xc+0,true);
m.setUint32(r[4]+0,u[0],true);
r[4]-=4;m.setUint32(r[4],0,true);run(15809);
u[0]=r[0];
u[0]=u[0]^m.getUint32(0x48a0+0,true);u[1]=u[1]^m.getUint32(0x48a0+4,true);u[2]=u[2]^m.getUint32(0x48a0+8,true);u[3]=u[3]^m.getUint32(0x48a0+12,true);
m.setUint32(r[3]+0x18+0,u[0],true);
u[0]=m.getUint32(r[3]+0xc+0,true);
m.setUint32(r[4]+0,u[0],true);
r[4]-=4;m.setUint32(r[4],0,true);run(15808);
m.setUint32(r[3]+0x1c+0,r[0],true);
pc=9193;continue;
case 9268:
m.setUint32(r[4]+0x4+0,0x42960000,true);
u[0]=m.getUint32(r[0]+0x10+0,true);
f[0]=f[0]-m.getFloat32(r[3]+0x4,true);
f[0]=f[0]*m.getFloat32(r[3]+0x18,true);
u[4]=m.getUint32(r[0]+0x14+0,true);
f[4]=f[4]-m.getFloat32(r[3]+0x8,true);
f[4]=f[4]*m.getFloat32(r[3]+0x1c,true);
f[0]=f[0]+f[4];
m.setUint32(r[4]+0,u[0],true);
r[4]-=4;m.setUint32(r[4],0,true);run(15812);
u[20]=r[6];
u[28]=r[0];
f[20]=f[20]+f[28];
r[6]=u[20];
pc=9023;continue;
case 9341:
a=f[8];b=m.getFloat32(0x487c,true);Z=!(a<b||a>b);C=!(a>=b);O=S=false;
if(!C){pc=9363;continue;}
u[8]=u[8]^u[8];u[9]=u[9]^u[9];u[10]=u[10]^u[10];u[11]=u[11]^u[11];
u[28]=r[6];
a=f[28];b=f[8];Z=!(a<b||a>b);C=!(a>=b);O=S=false;
if((C||Z)){pc=9403;continue;}
case 9363:
u[8]=m.getUint32(0x4850+0,true);
a=f[8];b=f[0];Z=!(a<b||a>b);C=!(a>=b);O=S=false;
if((!C&&!Z)){pc=9379;continue;}
u[0]=u[8];u[1]=u[9];u[2]=u[10];u[3]=u[11];
case 9379:
u[8]=u[0];u[9]=u[1];u[10]=u[2];u[11]=u[3];
u[12]=m.getUint32(0x487c+0,true);
a=f[12];b=f[0];Z=!(a<b||a>b);C=!(a>=b);O=S=false;
if((C||Z)){pc=9398;continue;}
u[8]=u[12];u[9]=u[13];u[10]=u[14];u[11]=u[15];
case 9398:
m.setUint32(r[3]+0x14+0,u[8],true);
case 9403:
f[4]=f[4]+m.getFloat32(r[3]+0x14,true);
u[0]=m.getUint32(0x4850+0,true);
a=f[0];b=f[4];Z=!(a<b||a>b);C=!(a>=b);O=S=false;
if((!C&&!Z)){pc=9424;continue;}
u[4]=u[0];u[5]=u[1];u[6]=u[2];u[7]=u[3];
case 9424:
u[0]=u[4];u[1]=u[5];u[2]=u[6];u[3]=u[7];
u[8]=m.getUint32(0x487c+0,true);
a=f[8];b=f[4];Z=!(a<b||a>b);C=!(a>=b);O=S=false;
if((C||Z)){pc=9443;continue;}
u[0]=u[8];u[1]=u[9];u[2]=u[10];u[3]=u[11];
case 9443:
m.setUint32(r[4]+0,u[0],true);
r[4]-=4;m.setUint32(r[4],0,true);run(15813);
u[16]=u[16]^u[16];u[17]=u[17]^u[17];u[18]=u[18]^u[18];u[19]=u[19]^u[19];
f[16]=(r[0]|0);
r[0]=u[16];
case 9465:
r[3]=m.getUint32(r[4]+0x10+0,true);
r[6]=m.getUint32(r[4]+0x14+0,true);
r[7]=m.getUint32(r[4]+0x18+0,true);
flags(r[4],0x1c,32,0);r[4]=res;
r[4]+=4;return;
case 9481:
u[4]=u[4]^u[4];u[5]=u[5]^u[5];u[6]=u[6]^u[6];u[7]=u[7]^u[7];
pc=9403;continue;
case 9487:
r[0]=0x0;
pc=9465;continue;
case 9494:
r[0]=r[7];
flags(r[0],m.getUint32(r[3]+0x10+0,true),32,1);r[0]=res;
r[2]=((r[0]>>>0)&65535);
a=r[0];b=0x10 &31;if(b){C=((a>>>(b-1))&1)!==0;r[0]=a>>>b;Z=(r[0]===0);S=((r[0]|0)<0);O=false;}
u[0]=u[0]^u[0];u[1]=u[1]^u[1];u[2]=u[2]^u[2];u[3]=u[3]^u[3];
f[0]=(r[0]|0);
u[4]=u[4]^u[4];u[5]=u[5]^u[5];u[6]=u[6]^u[6];u[7]=u[7]^u[7];
f[4]=(r[2]|0);
f[0]=f[0]*m.getFloat32(0x4870,true);
f[0]=f[0]+f[4];
f[0]=f[0]*m.getFloat32(0x4874,true);
m.setUint32(r[3]+0x10+0,r[7],true);
u[4]=m.getUint32(0x4878+0,true);
a=f[4];b=f[0];Z=!(a<b||a>b);C=!(a>=b);O=S=false;
if((!C&&!Z)){pc=9560;continue;}
u[0]=u[4];u[1]=u[5];u[2]=u[6];u[3]=u[7];
case 9560:
u[8]=u[8]^u[8];u[9]=u[9]^u[9];u[10]=u[10]^u[10];u[11]=u[11]^u[11];
f[0]=f[0]*f[8];
f[0]=f[0]+m.getFloat32(r[3]+0x14,true);
f[8]=f[8]+f[0];
u[4]=m.getUint32(0x4850+0,true);
a=f[4];b=f[8];Z=!(a<b||a>b);C=!(a>=b);O=S=false;
if(C){pc=9481;continue;}
u[4]=u[4]^u[4];u[5]=u[5]^u[5];u[6]=u[6]^u[6];u[7]=u[7]^u[7];
a=f[8];b=m.getFloat32(0x487c,true);Z=!(a<b||a>b);C=!(a>=b);O=S=false;
if(!C){pc=9363;continue;}
pc=9403;continue;
case 9612:
r[0]=m.getUint32(r[4]+0x4+0,true);
m.setUint16(r[0]+0,0xffff,true);
m.setUint16(r[0]+0x2+0,0xffff,true);
m.setUint16(r[0]+0x4+0,0x0,true);
m.setUint32(r[0]+0x8+0,0x0,true);
m.setUint32(r[0]+0xc+0,0x0,true);
m.setUint32(r[0]+0x10+0,0x0,true);
m.setUint8(r[0]+0x14+0,0x0,true);
m.setUint8(r[0]+0x15+0,0x0,true);
m.setUint8(r[0]+0x16+0,0x0,true);
r[4]+=4;return;

case 9668:
flags(r[4],0x18,32,1);r[4]=res;
m.setUint32(r[4]+0x8+0,r[3],true);
m.setUint32(r[4]+0xc+0,r[6],true);
m.setUint32(r[4]+0x10+0,r[7],true);
m.setUint32(r[4]+0x14+0,r[5],true);
r[0]=m.getUint32(r[4]+0x1c+0,true);
r[2]=m.getUint8(r[0]+0x16+0,true);
flags(((r[2]>>>0)&255)&((r[2]>>>0)&255),0,8,0);C=O=false;
if(!Z){pc=9904;continue;}
r[1]=m.getUint8(r[0]+0x15+0,true);
flags(((r[1]>>>0)&255)&((r[1]>>>0)&255),0,8,0);C=O=false;
if(!Z){pc=9849;continue;}
r[2]=m.getUint8(r[0]+0x14+0,true);
flags(((r[2]>>>0)&255)&((r[2]>>>0)&255),0,8,0);C=O=false;
if(Z){pc=9871;continue;}
r[6]=m.getUint32(0x6240+0,true);
r[3]=r[6];
flags(r[3],m.getUint32(r[0]+0x10+0,true),32,1);r[3]=res;
flags(r[3],0x12b,32,1);
if((C||Z)){pc=10023;continue;}
r[7]=m.getUint32(0x6244+0,true);
m.setUint32(r[4]+0x4+0,r[7],true);
r[7]=m.getUint32(0x6248+0,true);
m.setUint32(r[4]+0,r[7],true);
r[3]=((m.getUint16(r[0]+0x4+0,true)<<16)>>16);
flags(r[3]&r[3],0,32,0);C=O=false;
if((Z||S!==O)){pc=10027;continue;}
r[7]=m.getUint32(r[0]+0xc+0,true);
r[5]=r[7];
flags(m.getUint8(r[0]+0x1+0,true)&0x80,0,8,0);C=O=false;
if(!Z){pc=9926;continue;}
case 9796:
flags(m.getUint8(r[0]+0x3+0,true)&0x80,0,8,0);C=O=false;
if(Z){pc=9993;continue;}
case 9806:
r[7]=m.getUint32(r[4]+0,true);
flags(r[7],0x3,32,1);r[7]=res;
flags(r[7],r[5],32,1);r[7]=res;
flags(r[7],0xfffffffa,32,1);
if((!C&&!Z)){pc=9953;continue;}
m.setUint16(r[0]+0x2+0,((r[3]>>>0)&65535),true);
r[7]=((m.getUint16(r[0]+0,true)<<16)>>16);
flags(r[7]&r[7],0,32,0);C=O=false;
if(!S){pc=9993;continue;}
case 9838:
flags(r[3],0x63,32,1);
if((Z||S!==O)){pc=10034;continue;}
pc=9965;continue;
case 9849:
m.setUint32(0x6260+0,0x0,true);
m.setUint32(0x6264+0,0x0,true);
pc=9904;continue;
case 9871:
m.setUint32(0x6260+0,0x0,true);
m.setUint32(0x6264+0,0x0,true);
m.setUint8(r[0]+0x14+0,0x1,true);
r[1]=m.getUint32(0x6240+0,true);
m.setUint32(r[0]+0x10+0,r[1],true);
case 9904:
r[0]=(r[0]&~255)|(((((r[2]>>>0)&255))&255)<<0);
r[3]=m.getUint32(r[4]+0x8+0,true);
r[6]=m.getUint32(r[4]+0xc+0,true);
r[7]=m.getUint32(r[4]+0x10+0,true);
r[5]=m.getUint32(r[4]+0x14+0,true);
flags(r[4],0x18,32,0);r[4]=res;
r[4]+=4;return;
case 9926:
r[7]=m.getUint32(r[4]+0x4+0,true);
flags(r[7],0x3,32,1);r[7]=res;
flags(r[7],m.getUint32(r[0]+0x8+0,true),32,1);r[7]=res;
flags(r[7],0xfffffffa,32,1);
if((!C&&!Z)){pc=10148;continue;}
m.setUint16(r[0]+0,((r[3]>>>0)&65535),true);
pc=9796;continue;
case 9953:
r[7]=((m.getUint16(r[0]+0,true)<<16)>>16);
flags(r[7]&r[7],0,32,0);C=O=false;
if(S){pc=9838;continue;}
flags(r[3],0x63,32,1);
if((Z||S!==O)){pc=10081;continue;}
case 9965:
m.setUint8(r[0]+0x15+0,0x1,true);
m.setUint32(0x6260+0,0x0,true);
m.setUint32(0x6264+0,0x0,true);
r[2]=(r[2]&~255)|(((((r[1]>>>0)&255))&255)<<0);
pc=9904;continue;
case 9993:
m.setUint32(0x6260+0,0x0,true);
m.setUint32(0x6264+0,0x0,true);
m.setUint8(r[0]+0x16+0,0x1,true);
m.setUint8(r[0]+0x15+0,0x0,true);
pc=9904;continue;
case 10023:
r[2]=(r[2]&~255)|(((((r[1]>>>0)&255))&255)<<0);
pc=9904;continue;
case 10027:
r[7]=((m.getUint16(r[0]+0,true)<<16)>>16);
flags(r[7]&r[7],0,32,0);C=O=false;
if(!S){pc=10075;continue;}
case 10034:
oldC=C;flags(r[3],1,32,0);C=oldC;r[3]=res;
r[3]=((((r[3]>>>0)&65535)<<16)>>16);
m.setUint16(r[0]+0x4+0,((r[3]>>>0)&65535),true);
r[2]=m.getUint32(r[4]+0x4+0,true);
m.setUint32(r[0]+0x8+0,r[2],true);
r[2]=m.getUint32(r[4]+0,true);
m.setUint32(r[0]+0xc+0,r[2],true);
flags(m.getUint8(r[0]+0x3+0,true)&0x80,0,8,0);C=O=false;
if(!Z){pc=10102;continue;}
u[0]=u[0]^u[0];u[1]=u[1]^u[1];u[2]=u[2]^u[2];u[3]=u[3]^u[3];
case 10065:
u[4]=u[4]^u[4];u[5]=u[5]^u[5];u[6]=u[6]^u[6];u[7]=u[7]^u[7];
f[4]=(r[3]|0);
pc=10118;continue;
case 10075:
flags(m.getUint8(r[0]+0x3+0,true)&0x80,0,8,0);C=O=false;
if(Z){pc=9993;continue;}
case 10081:
oldC=C;flags(r[3],1,32,0);C=oldC;r[3]=res;
r[3]=((((r[3]>>>0)&65535)<<16)>>16);
m.setUint16(r[0]+0x4+0,((r[3]>>>0)&65535),true);
r[2]=m.getUint32(r[4]+0x4+0,true);
m.setUint32(r[0]+0x8+0,r[2],true);
r[2]=m.getUint32(r[4]+0,true);
m.setUint32(r[0]+0xc+0,r[2],true);
case 10102:
u[0]=u[0]^u[0];u[1]=u[1]^u[1];u[2]=u[2]^u[2];u[3]=u[3]^u[3];
f[0]=(r[3]|0);
flags(r[7]&r[7],0,32,0);C=O=false;
if(S){pc=10065;continue;}
u[4]=u[4]^u[4];u[5]=u[5]^u[5];u[6]=u[6]^u[6];u[7]=u[7]^u[7];
case 10118:
r[2]=Math.trunc(f[4]);
m.setUint32(0x6260+0,r[2],true);
r[2]=Math.trunc(f[0]);
m.setUint32(0x6264+0,r[2],true);
m.setUint32(r[0]+0x10+0,r[6],true);
r[2]=(r[2]&~255)|(((((r[1]>>>0)&255))&255)<<0);
pc=9904;continue;
case 10148:
flags(m.getUint8(r[0]+0x3+0,true)&0x80,0,8,0);C=O=false;
if(!Z){pc=9806;continue;}
r[7]=((m.getUint16(r[0]+0,true)<<16)>>16);
pc=9838;continue;
r[4]+=4;return;

r[0]=m.getUint8(r[4]+0x8+0,true);
r[0]=m.getUint32(r[0]*4+0x624c+0,true);
r[4]+=4;return;

case 10182:
r[0]=m.getUint32(r[4]+0x4+0,true);
r[2]=Math.imul(m.getUint32(0x6240+0,true),0x3e8);
m.setUint32(r[0]+0,r[2],true);
r[1]=m.getUint32(0x624c+0,true);
m.setUint16(r[0]+0x8+0,((r[1]>>>0)&65535),true);
r[2]=m.getUint32(0x6250+0,true);
m.setUint16(r[0]+0xa+0,((r[2]>>>0)&65535),true);
r[1]=m.getUint32(0x625c+0,true);
m.setUint16(r[0]+0xc+0,((r[1]>>>0)&65535),true);
m.setUint32(r[0]+0x4+0,0x0,true);
r[4]+=4;return;
case 10236:
flags(r[4],0x34,32,1);r[4]=res;
m.setUint32(r[4]+0x24+0,r[3],true);
m.setUint32(r[4]+0x28+0,r[6],true);
m.setUint32(r[4]+0x2c+0,r[7],true);
m.setUint32(r[4]+0x30+0,r[5],true);
r[3]=m.getUint32(r[4]+0x38+0,true);
m.setUint8(r[3]+0xe0+0,0x0,true);
m.setUint32(r[3]+0,0x0,true);
r[6]=r[4]+0xc;
m.setUint32(r[4]+0,r[6],true);
r[4]-=4;m.setUint32(r[4],0,true);run(9612);
r[2]=r[3]+0x8;
r[1]=r[6];
r[7]=0x17;
flags(((r[3]>>>0)&255)&0x1,0,8,0);C=O=false;
if(!Z){pc=10534;continue;}
case 10303:
flags(((r[2]>>>0)&255)&0x2,0,8,0);C=O=false;
if(!Z){pc=10559;continue;}
case 10312:
r[6]=r[7];
flags(r[6]&0xfffffffc,0,32,0);C=O=false;r[6]=res;
r[0]=0x0;
case 10322:
r[5]=m.getUint32(r[1]+r[0]*1+0,true);
m.setUint32(r[2]+r[0]*1+0,r[5],true);
flags(r[0],0x4,32,0);r[0]=res;
flags(r[0],r[6],32,1);
if(C){pc=10322;continue;}
flags(r[2],r[0],32,0);r[2]=res;
flags(r[1],r[0],32,0);r[1]=res;
r[0]=0x0;
flags(r[7]&0x2,0,32,0);C=O=false;
if(Z){pc=10363;continue;}
r[0]=m.getUint16(r[1]+0,true);
m.setUint16(r[2]+0,((r[0]>>>0)&65535),true);
r[0]=0x2;
case 10363:
flags(r[7]&0x1,0,32,0);C=O=false;
if(Z){pc=10378;continue;}
r[1]=m.getUint8(r[1]+r[0]*1+0,true);
m.setUint8(r[2]+r[0]*1+0,((r[1]>>>0)&255),true);
case 10378:
u[0]=m.getUint32(0x4880+0,true);
m.setUint32(r[3]+0x20+0,u[0],true);
m.setUint32(r[3]+0x24+0,u[0],true);
m.setUint32(r[3]+0x28+0,0x42b40000,true);
m.setUint32(r[3]+0x2c+0,0x43b32666,true);
m.setUint32(r[3]+0x30+0,0x0,true);
m.setUint32(r[3]+0x34+0,0x0,true);
m.setUint32(r[3]+0x38+0,0x0,true);
m.setUint8(r[3]+0x3c+0,0x0,true);
m.setUint32(r[3]+0x40+0,0x0,true);
m.setUint32(r[3]+0x44+0,0x0,true);
m.setUint32(r[3]+0xdc+0,0x45d0,true);
m.setUint32(0x6260+0,0x0,true);
m.setUint32(0x6264+0,0x0,true);
r[0]=m.getUint32(r[4]+0x40+0,true);
m.setUint32(r[4]+0,r[0],true);
r[4]-=4;m.setUint32(r[4],0,true);run(10182);
r[0]=m.getUint32(0x6240+0,true);
m.setUint32(r[3]+0x100+0,r[0],true);
m.setUint32(r[3]+0xd0+0,r[0],true);
m.setUint32(r[3]+0xd8+0,r[0],true);
r[3]=m.getUint32(r[4]+0x24+0,true);
r[6]=m.getUint32(r[4]+0x28+0,true);
r[7]=m.getUint32(r[4]+0x2c+0,true);
r[5]=m.getUint32(r[4]+0x30+0,true);
flags(r[4],0x34,32,0);r[4]=res;
r[4]+=4;return;
case 10534:
r[0]=m.getUint8(r[4]+0xc+0,true);
m.setUint8(r[3]+0x8+0,((r[0]>>>0)&255),true);
r[2]=r[2]+0x1;
r[1]=r[4]+0xd;
r[7]=0x16;
pc=10303;continue;
case 10559:
r[0]=m.getUint16(r[1]+0,true);
m.setUint16(r[2]+0,((r[0]>>>0)&65535),true);
r[2]=r[2]+0x2;
r[1]=r[1]+0x2;
flags(r[7],0x2,32,1);r[7]=res;
pc=10312;continue;

case 10580:
r[0]=m.getUint32(r[4]+0x4+0,true);
u[0]=m.getUint32(r[4]+0x8+0,true);
m.setUint32(r[0]+0,u[0],true);
m.setUint32(r[0]+0x4+0,u[0],true);
u[0]=m.getUint32(r[4]+0xc+0,true);
m.setUint32(r[0]+0x8+0,u[0],true);
u[0]=m.getUint32(r[4]+0x10+0,true);
m.setUint32(r[0]+0xc+0,u[0],true);
m.setUint32(r[0]+0x10+0,0x0,true);
m.setUint32(r[0]+0x14+0,0x0,true);
m.setUint32(r[0]+0x18+0,0x0,true);
m.setUint8(r[0]+0x1c+0,0x0,true);
m.setUint32(r[0]+0x20+0,0x0,true);
m.setUint32(r[0]+0x24+0,0x0,true);
r[4]+=4;return;

r[0]=m.getUint32(r[4]+0x4+0,true);
u[0]=m.getUint32(r[4]+0x8+0,true);
m.setUint32(r[0]+0,u[0],true);
r[4]+=4;return;

r[0]=m.getUint32(r[4]+0x4+0,true);
u[0]=m.getUint32(r[4]+0x8+0,true);
m.setUint32(r[0]+0x4+0,u[0],true);
r[4]+=4;return;
r[0]=m.getUint32(r[4]+0x4+0,true);
u[0]=m.getUint32(r[4]+0x8+0,true);
m.setUint32(r[0]+0x10+0,u[0],true);
u[0]=m.getUint32(r[4]+0xc+0,true);
m.setUint32(r[0]+0x14+0,u[0],true);
u[0]=m.getUint32(r[4]+0x10+0,true);
m.setUint32(r[0]+0x18+0,u[0],true);
m.setUint8(r[0]+0x1c+0,0x0,true);
m.setUint32(r[0]+0x20+0,0x0,true);
m.setUint32(r[0]+0x24+0,0x0,true);
r[4]+=4;return;
case 10750:
tmp=r[3];r[4]-=4;m.setUint32(r[4],tmp,true);
r[0]=m.getUint32(r[4]+0x8+0,true);
r[2]=(r[0]|0)<0?0xffffffff:0;
r[1]=m.getUint32(r[4]+0xc+0,true);
r[3]=r[1];
a=r[3];b=0x1f &31;if(b){C=((a>>>(b-1))&1)!==0;r[3]=a>>b;Z=(r[3]===0);S=((r[3]|0)<0);O=false;}
flags(r[0],r[1],32,1);r[0]=res;
flags(r[2],r[3],32,2);r[2]=res;
r[1]=0x7fffffff;
flags(r[1],r[0],32,1);
r[1]=0x0;
flags(r[1],r[2],32,2);r[1]=res;
if((S===O)){pc=10788;continue;}
oldC=C;flags(r[2],1,32,1);C=oldC;r[2]=res;
case 10786:
r[3]=m.getUint32(r[4],true);r[4]+=4;
r[4]+=4;return;
case 10788:
flags(r[0],0x80000000,32,1);
r[3]=r[2];
flags(r[3],0xffffffff,32,2);r[3]=res;
if((S===O)){pc=10786;continue;}
oldC=C;flags(r[2],1,32,0);C=oldC;r[2]=res;
pc=10786;continue;

case 10804:
flags(r[4],0x4c,32,1);r[4]=res;
m.setUint32(r[4]+0x3c+0,r[3],true);
m.setUint32(r[4]+0x40+0,r[6],true);
m.setUint32(r[4]+0x44+0,r[7],true);
m.setUint32(r[4]+0x48+0,r[5],true);
r[3]=m.getUint32(r[4]+0x50+0,true);
r[6]=m.getUint32(r[3]+0,true);
u[0]=r[6];
u[0]=u[0]&m.getUint32(0x4890+0,true);u[1]=u[1]&m.getUint32(0x4890+4,true);u[2]=u[2]&m.getUint32(0x4890+8,true);u[3]=u[3]&m.getUint32(0x4890+12,true);
u[4]=m.getUint32(0x481c+0,true);
a=f[4];b=f[0];Z=!(a<b||a>b);C=!(a>=b);O=S=false;
if(C){pc=11355;continue;}
u[0]=u[0]^u[0];u[1]=u[1]^u[1];u[2]=u[2]^u[2];u[3]=u[3]^u[3];
u[16]=r[6];
a=f[0];b=f[16];Z=!(a<b||a>b);C=!(a>=b);O=S=false;
if(!C){pc=11385;continue;}
r[7]=m.getUint32(r[3]+0x4+0,true);
u[0]=r[7];
u[0]=u[0]&m.getUint32(0x4890+0,true);u[1]=u[1]&m.getUint32(0x4890+4,true);u[2]=u[2]&m.getUint32(0x4890+8,true);u[3]=u[3]&m.getUint32(0x4890+12,true);
a=f[4];b=f[0];Z=!(a<b||a>b);C=!(a>=b);O=S=false;
if(C){pc=11392;continue;}
u[0]=u[0]^u[0];u[1]=u[1]^u[1];u[2]=u[2]^u[2];u[3]=u[3]^u[3];
u[20]=r[7];
a=f[0];b=f[20];Z=!(a<b||a>b);C=!(a>=b);O=S=false;
if(!C){pc=11399;continue;}
r[5]=m.getUint32(r[3]+0x8+0,true);
u[0]=r[5];
u[0]=u[0]&m.getUint32(0x4890+0,true);u[1]=u[1]&m.getUint32(0x4890+4,true);u[2]=u[2]&m.getUint32(0x4890+8,true);u[3]=u[3]&m.getUint32(0x4890+12,true);
a=f[4];b=f[0];Z=!(a<b||a>b);C=!(a>=b);O=S=false;
if(C){pc=11406;continue;}
u[0]=u[0]^u[0];u[1]=u[1]^u[1];u[2]=u[2]^u[2];u[3]=u[3]^u[3];
u[28]=r[5];
a=f[0];b=f[28];Z=!(a<b||a>b);C=!(a>=b);O=S=false;
if(!C){pc=11413;continue;}
u[24]=m.getUint32(r[3]+0xc+0,true);
m.setUint32(r[4]+0x20+0,u[24],true);
u[0]=u[24];u[1]=u[25];u[2]=u[26];u[3]=u[27];
u[0]=u[0]&m.getUint32(0x4890+0,true);u[1]=u[1]&m.getUint32(0x4890+4,true);u[2]=u[2]&m.getUint32(0x4890+8,true);u[3]=u[3]&m.getUint32(0x4890+12,true);
a=f[4];b=f[0];Z=!(a<b||a>b);C=!(a>=b);O=S=false;
if(C){pc=11420;continue;}
u[0]=u[0]^u[0];u[1]=u[1]^u[1];u[2]=u[2]^u[2];u[3]=u[3]^u[3];
a=f[0];b=f[24];Z=!(a<b||a>b);C=!(a>=b);O=S=false;
if(!C){pc=11427;continue;}
r[0]=m.getUint8(r[3]+0x1c+0,true);
m.setUint8(r[4]+0x1f+0,((r[0]>>>0)&255),true);
flags(((r[0]>>>0)&255)&((r[0]>>>0)&255),0,8,0);C=O=false;
if(!Z){pc=11032;continue;}
r[0]=m.getUint32(r[4]+0x54+0,true);
m.setUint32(r[3]+0x20+0,r[0],true);
r[0]=m.getUint32(r[4]+0x58+0,true);
m.setUint32(r[3]+0x24+0,r[0],true);
m.setUint8(r[3]+0x1c+0,0x1,true);
pc=11360;continue;
case 11032:
r[0]=m.getUint32(r[3]+0x20+0,true);
m.setUint32(r[4]+0x4+0,r[0],true);
r[0]=m.getUint32(r[4]+0x54+0,true);
m.setUint32(r[4]+0,r[0],true);
r[4]-=4;m.setUint32(r[4],0,true);run(10750);
u[0]=r[0];
u[12]=r[2];
u[3]=u[13];u[2]=u[1];u[1]=u[12];
m.setUint32(r[4]+0x28+0,u[0],true);m.setUint32(r[4]+0x28+4,u[1],true);
fpv=Number(m.getBigInt64(r[4]+0x28,true));
m.setFloat32(r[4]+0x24,fpv,true);
r[0]=m.getUint32(r[3]+0x24+0,true);
m.setUint32(r[4]+0x4+0,r[0],true);
r[0]=m.getUint32(r[4]+0x58+0,true);
m.setUint32(r[4]+0,r[0],true);
r[4]-=4;m.setUint32(r[4],0,true);run(10750);
r[1]=m.getUint32(r[4]+0x54+0,true);
m.setUint32(r[3]+0x20+0,r[1],true);
r[1]=m.getUint32(r[4]+0x58+0,true);
m.setUint32(r[3]+0x24+0,r[1],true);
u[12]=u[12]^u[12];u[13]=u[13]^u[13];u[14]=u[14]^u[14];u[15]=u[15]^u[15];
d[6]=m.getFloat32(r[4]+0x20,true);
u[8]=u[8]^u[8];u[9]=u[9]^u[9];u[10]=u[10]^u[10];u[11]=u[11]^u[11];
d[4]=m.getFloat32(r[4]+0x24,true);
u[4]=m.getUint32(0x48b0+0,true);u[5]=m.getUint32(0x48b0+4,true);
d[4]=d[4]*d[2];
u[28]=r[6];
u[0]=u[0]^u[0];u[1]=u[1]^u[1];u[2]=u[2]^u[2];u[3]=u[3]^u[3];
d[0]=f[28];
d[4]=d[4]*d[0];
d[4]=d[4]/d[6];
f[8]=d[4];
u[0]=r[0];
u[28]=r[2];
u[3]=u[29];u[2]=u[1];u[1]=u[28];
m.setUint32(r[4]+0x28+0,u[0],true);m.setUint32(r[4]+0x28+4,u[1],true);
fpv=Number(m.getBigInt64(r[4]+0x28,true));
m.setFloat32(r[4]+0x20,fpv,true);
u[0]=u[0]^u[0];u[1]=u[1]^u[1];u[2]=u[2]^u[2];u[3]=u[3]^u[3];
d[0]=m.getFloat32(r[4]+0x20,true);
d[2]=d[2]*d[0];
u[28]=r[7];
u[0]=u[0]^u[0];u[1]=u[1]^u[1];u[2]=u[2]^u[2];u[3]=u[3]^u[3];
d[0]=f[28];
d[0]=d[0]*d[2];
d[0]=d[0]/d[6];
f[0]=d[0];
u[4]=u[8];u[5]=u[9];u[6]=u[10];u[7]=u[11];
f[4]=f[4]+f[0];
f[4]=f[4]*m.getFloat32(0x4884,true);
r[6]=u[4];
f[0]=f[0]-f[8];
u[12]=r[5];
f[0]=f[0]/f[12];
r[7]=u[0];
u[0]=m.getUint32(r[3]+0x18+0,true);
m.setUint32(r[4]+0,u[0],true);
r[4]-=4;m.setUint32(r[4],0,true);run(15808);
u[0]=r[0];
u[12]=r[6];
f[0]=f[0]*f[12];
f[0]=f[0]+m.getFloat32(r[3]+0x10,true);
m.setUint32(r[3]+0x10+0,u[0],true);
u[0]=m.getUint32(r[3]+0x18+0,true);
m.setUint32(r[4]+0,u[0],true);
r[4]-=4;m.setUint32(r[4],0,true);run(15809);
u[0]=r[0];
u[12]=r[6];
f[0]=f[0]*f[12];
f[0]=f[0]+m.getFloat32(r[3]+0x14,true);
m.setUint32(r[3]+0x14+0,u[0],true);
u[0]=r[7];
f[0]=f[0]+m.getFloat32(r[3]+0x18,true);
m.setUint32(r[3]+0x18+0,u[0],true);
pc=11360;continue;
case 11355:
m.setUint8(r[4]+0x1f+0,0x0,true);
case 11360:
r[0]=m.getUint8(r[4]+0x1f+0,true);
r[3]=m.getUint32(r[4]+0x3c+0,true);
r[6]=m.getUint32(r[4]+0x40+0,true);
r[7]=m.getUint32(r[4]+0x44+0,true);
r[5]=m.getUint32(r[4]+0x48+0,true);
flags(r[4],0x4c,32,0);r[4]=res;
r[4]+=4;return;
case 11385:
m.setUint8(r[4]+0x1f+0,0x0,true);
pc=11360;continue;
case 11392:
m.setUint8(r[4]+0x1f+0,0x0,true);
pc=11360;continue;
case 11399:
m.setUint8(r[4]+0x1f+0,0x0,true);
pc=11360;continue;
case 11406:
m.setUint8(r[4]+0x1f+0,0x0,true);
pc=11360;continue;
case 11413:
m.setUint8(r[4]+0x1f+0,0x0,true);
pc=11360;continue;
case 11420:
m.setUint8(r[4]+0x1f+0,0x0,true);
pc=11360;continue;
case 11427:
m.setUint8(r[4]+0x1f+0,0x0,true);
pc=11360;continue;
case 11434:
flags(r[4],0x1c,32,1);r[4]=res;
r[0]=m.getUint32(r[4]+0x20+0,true);
u[0]=m.getUint32(r[0]+0x20+0,true);
u[4]=u[0];u[5]=u[1];u[6]=u[2];u[7]=u[3];
u[4]=u[4]&m.getUint32(0x4890+0,true);u[5]=u[5]&m.getUint32(0x4890+4,true);u[6]=u[6]&m.getUint32(0x4890+8,true);u[7]=u[7]&m.getUint32(0x4890+12,true);
u[8]=m.getUint32(0x481c+0,true);
a=f[8];b=f[4];Z=!(a<b||a>b);C=!(a>=b);O=S=false;
if(C){pc=11683;continue;}
u[4]=u[4]^u[4];u[5]=u[5]^u[5];u[6]=u[6]^u[6];u[7]=u[7]^u[7];
a=f[0];b=f[4];Z=!(a<b||a>b);C=!(a>=b);O=S=false;
if((C||Z)){pc=11683;continue;}
u[0]=m.getUint32(r[0]+0x24+0,true);
u[4]=u[0];u[5]=u[1];u[6]=u[2];u[7]=u[3];
u[4]=u[4]&m.getUint32(0x4890+0,true);u[5]=u[5]&m.getUint32(0x4890+4,true);u[6]=u[6]&m.getUint32(0x4890+8,true);u[7]=u[7]&m.getUint32(0x4890+12,true);
a=f[8];b=f[4];Z=!(a<b||a>b);C=!(a>=b);O=S=false;
if(C){pc=11683;continue;}
u[4]=u[4]^u[4];u[5]=u[5]^u[5];u[6]=u[6]^u[6];u[7]=u[7]^u[7];
a=f[0];b=f[4];Z=!(a<b||a>b);C=!(a>=b);O=S=false;
if((C||Z)){pc=11683;continue;}
u[0]=m.getUint32(r[0]+0x28+0,true);
u[4]=u[0];u[5]=u[1];u[6]=u[2];u[7]=u[3];
u[4]=u[4]&m.getUint32(0x4890+0,true);u[5]=u[5]&m.getUint32(0x4890+4,true);u[6]=u[6]&m.getUint32(0x4890+8,true);u[7]=u[7]&m.getUint32(0x4890+12,true);
a=f[8];b=f[4];Z=!(a<b||a>b);C=!(a>=b);O=S=false;
if(C){pc=11683;continue;}
u[4]=u[4]^u[4];u[5]=u[5]^u[5];u[6]=u[6]^u[6];u[7]=u[7]^u[7];
a=f[0];b=f[4];Z=!(a<b||a>b);C=!(a>=b);O=S=false;
if((C||Z)){pc=11683;continue;}
u[0]=m.getUint32(r[0]+0x2c+0,true);
u[4]=u[0];u[5]=u[1];u[6]=u[2];u[7]=u[3];
u[4]=u[4]&m.getUint32(0x4890+0,true);u[5]=u[5]&m.getUint32(0x4890+4,true);u[6]=u[6]&m.getUint32(0x4890+8,true);u[7]=u[7]&m.getUint32(0x4890+12,true);
a=f[8];b=f[4];Z=!(a<b||a>b);C=!(a>=b);O=S=false;
if(C){pc=11683;continue;}
u[4]=u[4]^u[4];u[5]=u[5]^u[5];u[6]=u[6]^u[6];u[7]=u[7]^u[7];
a=f[0];b=f[4];Z=!(a<b||a>b);C=!(a>=b);O=S=false;
if((C||Z)){pc=11683;continue;}
r[2]=m.getUint32(0x6244+0,true);
m.setUint32(r[0]+0x10c+0,r[2],true);
m.setUint32(r[0]+0x114+0,r[2],true);
r[1]=m.getUint32(0x6248+0,true);
m.setUint32(r[0]+0x110+0,r[1],true);
m.setUint32(r[0]+0x118+0,r[1],true);
m.setUint32(r[0]+0x30+0,0x0,true);
m.setUint32(r[0]+0x34+0,0x0,true);
m.setUint32(r[0]+0x38+0,0x0,true);
m.setUint8(r[0]+0x3c+0,0x0,true);
m.setUint32(r[0]+0x40+0,0x0,true);
m.setUint32(r[0]+0x44+0,0x0,true);
m.setUint32(r[4]+0x8+0,r[1],true);
m.setUint32(r[4]+0x4+0,r[2],true);
flags(r[0],0x20,32,0);r[0]=res;
m.setUint32(r[4]+0,r[0],true);
r[4]-=4;m.setUint32(r[4],0,true);run(10804);
r[0]=(r[0]&~255)|(((0x1)&255)<<0);
pc=11709;continue;
case 11683:
m.setUint32(r[4]+0x8+0,0x416c,true);
r[2]=m.getUint32(r[4]+0x24+0,true);
m.setUint32(r[4]+0x4+0,r[2],true);
m.setUint32(r[4]+0,r[0],true);
r[4]-=4;m.setUint32(r[4],0,true);run(4402);
r[0]=(r[0]&~255)|(((0x0)&255)<<0);
case 11709:
flags(r[4],0x1c,32,0);r[4]=res;
r[4]+=4;return;

case 11714:
flags(r[4],0x5c,32,1);r[4]=res;
m.setUint32(r[4]+0x4c+0,r[3],true);
m.setUint32(r[4]+0x50+0,r[6],true);
m.setUint32(r[4]+0x54+0,r[7],true);
m.setUint32(r[4]+0x58+0,r[5],true);
r[6]=m.getUint32(r[4]+0x60+0,true);
r[3]=m.getUint8(r[4]+0x64+0,true);
r[2]=(r[2]&~255)|(((((r[3]>>>0)&255))&255)<<0);
flags(((r[2]>>>0)&255),0x61,8,1);r[2]=(r[2]&~255)|(((res)&255)<<0);
flags(((r[2]>>>0)&255),0x19,8,1);
if((!C&&!Z)){pc=11758;continue;}
r[0]=(r[0]&~255)|(((((r[3]>>>0)&255))&255)<<0);
flags(((r[0]>>>0)&255),0x20,8,1);r[0]=(r[0]&~255)|(((res)&255)<<0);
r[3]=(r[3]&~255)|(((((r[0]>>>0)&255))&255)<<0);
case 11758:
flags(((r[3]>>>0)&255),0x58,8,1);
if(Z){pc=12132;continue;}
flags(m.getUint32(r[6]+0,true),0x0,32,1);
if(!Z){pc=12957;continue;}
r[7]=m.getUint32(0x6240+0,true);
flags(((r[3]>>>0)&255),0x43,8,1);
if(Z){pc=12161;continue;}
r[1]=(r[1]&~255)|(((((r[3]>>>0)&255))&255)<<0);
flags(((r[1]>>>0)&255),0x47,8,1);r[1]=(r[1]&~255)|(((res)&255)<<0);
flags(((r[1]>>>0)&255),0xd,8,1);
if((!C&&!Z)){pc=12915;continue;}
r[0]=0x3221;
a=r[0];b=((r[1]>>>0)&255) &31;if(b){C=((a>>>(b-1))&1)!==0;r[0]=a>>>b;Z=(r[0]===0);S=((r[0]|0)<0);O=false;}
flags(((r[0]>>>0)&255)&0x1,0,8,0);C=O=false;
if(Z){pc=12957;continue;}
flags(m.getUint8(r[6]+0xe0+0,true),0x0,8,1);
if(Z){pc=12947;continue;}
flags(((r[3]>>>0)&255),0x45,8,1);
if(Z){pc=12739;continue;}
flags(((r[3]>>>0)&255),0x53,8,1);
if(Z){pc=12739;continue;}
case 11851:
r[0]=((m.getUint16(r[6]+0x8+0,true)<<16)>>16);
flags(r[0],0x31,32,1);
if((!Z&&S===O)){pc=12649;continue;}
flags(((r[1]>>>0)&255),0xd,8,1);
if((!C&&!Z)){pc=11893;continue;}
r[0]=0x2021;
a=r[0];b=((r[1]>>>0)&255) &31;if(b){C=((a>>>(b-1))&1)!==0;r[0]=a>>>b;Z=(r[0]===0);S=((r[0]|0)<0);O=false;}
flags(((r[0]>>>0)&255)&0x1,0,8,0);C=O=false;
if(Z){pc=11893;continue;}
r[0]=((m.getUint16(r[6]+0xa+0,true)<<16)>>16);
flags(r[0],0x31,32,1);
if((!Z&&S===O)){pc=12649;continue;}
case 11893:
r[0]=m.getUint32(r[4]+0x68+0,true);
m.setUint32(r[4]+0x4+0,r[0],true);
m.setUint32(r[4]+0,r[6],true);
r[4]-=4;m.setUint32(r[4],0,true);run(11434);
flags(((r[0]>>>0)&255)&((r[0]>>>0)&255),0,8,0);C=O=false;
if(Z){pc=12957;continue;}
r[0]=m.getUint32(r[4]+0x6c+0,true);
m.setUint32(r[4]+0,r[0],true);
r[4]-=4;m.setUint32(r[4],0,true);run(10182);
m.setUint32(r[6]+0xd8+0,r[7],true);
m.setUint32(r[6]+0x100+0,r[7],true);
m.setUint32(r[6]+0x108+0,r[7],true);
m.setUint32(r[6]+0x104+0,r[7],true);
m.setUint32(r[6]+0xfc+0,r[7],true);
m.setUint32(r[6]+0xf8+0,r[7],true);
m.setUint32(r[6]+0xd0+0,r[7],true);
u[0]=m.getUint32(r[6]+0x38+0,true);
m.setUint32(r[6]+0xf4+0,u[0],true);
m.setUint32(r[6]+0xe4+0,0x1,true);
flags(((r[3]>>>0)&255),0x47,8,1);
if(Z){pc=12008;continue;}
flags(((r[3]>>>0)&255),0x56,8,1);
if(!Z){pc=12535;continue;}
case 12008:
m.setUint32(r[6]+0xe8+0,0x4,true);
m.setUint32(r[6]+0x4+0,0x0,true);
case 12025:
r[0]=m.getUint32(r[4]+0x6c+0,true);
r[0]=m.getUint16(r[0]+0xa+0,true);
flags(r[0],0x2bc,32,1);
if((C||Z)){pc=12679;continue;}
r[0]=m.getUint32(r[4]+0x6c+0,true);
r[0]=m.getUint16(r[0]+0x8+0,true);
flags(r[0],0x2bc,32,1);
if((C||Z)){pc=12679;continue;}
r[0]=m.getUint32(r[4]+0x6c+0,true);
r[0]=m.getUint16(r[0]+0xc+0,true);
flags(r[0],0x2bc,32,1);
if((C||Z)){pc=12679;continue;}
flags(((r[3]>>>0)&255),0x4c,8,1);
if(Z){pc=12694;continue;}
flags(((r[3]>>>0)&255),0x54,8,1);
if(Z){pc=12709;continue;}
flags(((r[3]>>>0)&255),0x47,8,1);
if(Z){pc=12724;continue;}
r[2]=0x5;
r[0]=0x41a1;
case 12119:
m.setUint32(r[6]+0,r[2],true);
m.setUint32(r[6]+0xdc+0,r[0],true);
pc=12957;continue;
case 12132:
m.setUint32(r[4]+0x8+0,0x41b5,true);
r[0]=m.getUint32(r[4]+0x68+0,true);
m.setUint32(r[4]+0x4+0,r[0],true);
m.setUint32(r[4]+0,r[6],true);
r[4]-=4;m.setUint32(r[4],0,true);run(4498);
pc=12957;continue;
case 12161:
m.setUint32(0x6260+0,0x0,true);
m.setUint32(0x6264+0,0x0,true);
m.setUint8(r[6]+0xe0+0,0x0,true);
m.setUint32(r[6]+0xf0+0,0x0,true);
m.setUint32(r[6]+0xec+0,0x0,true);
r[3]=r[4]+0x28;
m.setUint32(r[4]+0,r[3],true);
r[4]-=4;m.setUint32(r[4],0,true);run(9612);
r[2]=r[6]+0x8;
r[1]=r[3];
r[5]=0x17;
flags(r[6]&0x1,0,32,0);C=O=false;
if(!Z){pc=12354;continue;}
case 12238:
flags(((r[2]>>>0)&255)&0x2,0,8,0);C=O=false;
if(!Z){pc=12379;continue;}
case 12247:
r[3]=r[5];
flags(r[3]&0xfffffffc,0,32,0);C=O=false;r[3]=res;
r[0]=0x0;
m.setUint32(r[4]+0x60+0,r[6],true);
case 12261:
r[6]=m.getUint32(r[1]+r[0]*1+0,true);
m.setUint32(r[2]+r[0]*1+0,r[6],true);
flags(r[0],0x4,32,0);r[0]=res;
flags(r[0],r[3],32,1);
if(C){pc=12261;continue;}
r[6]=m.getUint32(r[4]+0x60+0,true);
flags(r[2],r[0],32,0);r[2]=res;
flags(r[1],r[0],32,0);r[1]=res;
r[0]=0x0;
flags(r[5]&0x2,0,32,0);C=O=false;
if(Z){pc=12306;continue;}
r[0]=m.getUint16(r[1]+0,true);
m.setUint16(r[2]+0,((r[0]>>>0)&65535),true);
r[0]=0x2;
case 12306:
flags(r[5]&0x1,0,32,0);C=O=false;
if(Z){pc=12321;continue;}
r[1]=m.getUint8(r[1]+r[0]*1+0,true);
m.setUint8(r[2]+r[0]*1+0,((r[1]>>>0)&255),true);
case 12321:
m.setUint32(r[6]+0,0x1,true);
m.setUint32(r[6]+0xdc+0,0x45f0,true);
m.setUint32(r[6]+0x100+0,r[7],true);
m.setUint32(r[6]+0xd0+0,r[7],true);
pc=12957;continue;
case 12354:
r[0]=m.getUint8(r[4]+0x28+0,true);
m.setUint8(r[6]+0x8+0,((r[0]>>>0)&255),true);
r[2]=r[2]+0x1;
r[1]=r[4]+0x29;
r[5]=0x16;
pc=12238;continue;
case 12379:
r[0]=m.getUint16(r[1]+0,true);
m.setUint16(r[2]+0,((r[0]>>>0)&65535),true);
r[2]=r[2]+0x2;
r[1]=r[1]+0x2;
flags(r[5],0x2,32,1);r[5]=res;
pc=12247;continue;
case 12399:
flags(m.getUint8(r[6]+0xe0+0,true),0x0,8,1);
if(Z){pc=12739;continue;}
r[0]=((m.getUint16(r[6]+0xa+0,true)<<16)>>16);
r[2]=((m.getUint16(r[6]+0x8+0,true)<<16)>>16);
flags(r[0],r[2],32,1);
if((S!==O)){r[0]=r[2];}
flags(r[0],0x2e,32,1);
if((!Z&&S===O)){pc=12634;continue;}
r[0]=m.getUint32(r[4]+0x68+0,true);
m.setUint32(r[4]+0x4+0,r[0],true);
m.setUint32(r[4]+0,r[6],true);
r[4]-=4;m.setUint32(r[4],0,true);run(11434);
flags(((r[0]>>>0)&255)&((r[0]>>>0)&255),0,8,0);C=O=false;
if(Z){pc=12957;continue;}
r[0]=m.getUint32(r[4]+0x6c+0,true);
m.setUint32(r[4]+0,r[0],true);
r[4]-=4;m.setUint32(r[4],0,true);run(10182);
m.setUint32(r[6]+0xd8+0,r[7],true);
m.setUint32(r[6]+0x100+0,r[7],true);
m.setUint32(r[6]+0x108+0,r[7],true);
m.setUint32(r[6]+0x104+0,r[7],true);
m.setUint32(r[6]+0xfc+0,r[7],true);
m.setUint32(r[6]+0xf8+0,r[7],true);
m.setUint32(r[6]+0xd0+0,r[7],true);
u[0]=m.getUint32(r[6]+0x38+0,true);
m.setUint32(r[6]+0xf4+0,u[0],true);
m.setUint32(r[6]+0xe4+0,0x1,true);
case 12535:
m.setUint32(r[6]+0xe8+0,0x1,true);
m.setUint32(r[6]+0x4+0,0x0,true);
flags(((r[3]>>>0)&255),0x53,8,1);
if(Z){pc=12866;continue;}
flags(((r[3]>>>0)&255),0x45,8,1);
if(!Z){pc=12025;continue;}
case 12570:
m.setUint32(r[4]+0x10+0,u[0],true);
u[0]=m.getUint32(r[6]+0x34+0,true);
m.setUint32(r[4]+0xc+0,u[0],true);
u[0]=m.getUint32(r[6]+0x30+0,true);
m.setUint32(r[4]+0x8+0,u[0],true);
m.setUint32(r[4]+0x4+0,r[7],true);
r[0]=r[6]+0x68;
m.setUint32(r[4]+0,r[0],true);
r[4]-=4;m.setUint32(r[4],0,true);run(5602);
m.setUint32(r[6]+0,0x6,true);
m.setUint32(r[6]+0xdc+0,0x41f7,true);
pc=12957;continue;
case 12634:
m.setUint32(r[6]+0xdc+0,0x4610,true);
pc=12957;continue;
case 12649:
m.setUint32(r[6]+0xdc+0,0x4650,true);
pc=12957;continue;
case 12664:
m.setUint32(r[6]+0xdc+0,0x4680,true);
pc=12957;continue;
case 12679:
m.setUint32(r[6]+0xdc+0,0x46a8,true);
pc=12957;continue;
case 12694:
r[2]=0x4;
r[0]=0x4186;
pc=12119;continue;
case 12709:
r[2]=0x3;
r[0]=0x41a1;
pc=12119;continue;
case 12724:
r[2]=0x3;
r[0]=0x41a1;
pc=12119;continue;
case 12739:
r[0]=m.getUint32(r[4]+0x68+0,true);
m.setUint32(r[4]+0x4+0,r[0],true);
m.setUint32(r[4]+0,r[6],true);
r[4]-=4;m.setUint32(r[4],0,true);run(11434);
flags(((r[0]>>>0)&255)&((r[0]>>>0)&255),0,8,0);C=O=false;
if(Z){pc=12957;continue;}
r[0]=m.getUint32(r[4]+0x6c+0,true);
m.setUint32(r[4]+0,r[0],true);
r[4]-=4;m.setUint32(r[4],0,true);run(10182);
m.setUint32(r[6]+0xd8+0,r[7],true);
m.setUint32(r[6]+0x100+0,r[7],true);
m.setUint32(r[6]+0x108+0,r[7],true);
m.setUint32(r[6]+0x104+0,r[7],true);
m.setUint32(r[6]+0xfc+0,r[7],true);
m.setUint32(r[6]+0xf8+0,r[7],true);
m.setUint32(r[6]+0xd0+0,r[7],true);
u[0]=m.getUint32(r[6]+0x38+0,true);
m.setUint32(r[6]+0xf4+0,u[0],true);
m.setUint32(r[6]+0xe4+0,0x1,true);
m.setUint32(r[6]+0xe8+0,0x1,true);
m.setUint32(r[6]+0x4+0,0x0,true);
flags(((r[3]>>>0)&255),0x53,8,1);
if(!Z){pc=12570;continue;}
case 12866:
r[0]=m.getUint32(r[4]+0x6c+0,true);
r[0]=m.getUint16(r[0]+0xa+0,true);
flags(r[0],0xbb8,32,1);
if((C||Z)){pc=12664;continue;}
m.setUint8(r[6]+0x48+0,0x0,true);
m.setUint8(r[6]+0x49+0,0x0,true);
m.setUint8(r[6]+0x4a+0,0x0,true);
m.setUint32(r[6]+0,0x2,true);
m.setUint32(r[6]+0xdc+0,0x41e1,true);
pc=12957;continue;
case 12915:
flags(((r[3]>>>0)&255),0x56,8,1);
if(Z){pc=12925;continue;}
flags(((r[3]>>>0)&255),0x45,8,1);
if(!Z){pc=12957;continue;}
case 12925:
flags(((r[3]>>>0)&255),0x45,8,1);
if(Z){pc=12399;continue;}
flags(m.getUint8(r[6]+0xe0+0,true),0x0,8,1);
if(!Z){pc=11851;continue;}
case 12947:
m.setUint32(r[6]+0xdc+0,0x41c9,true);
case 12957:
r[3]=m.getUint32(r[4]+0x4c+0,true);
r[6]=m.getUint32(r[4]+0x50+0,true);
r[7]=m.getUint32(r[4]+0x54+0,true);
r[5]=m.getUint32(r[4]+0x58+0,true);
flags(r[4],0x5c,32,0);r[4]=res;
r[4]+=4;return;

case 12978:
tmp=r[6];r[4]-=4;m.setUint32(r[4],tmp,true);
tmp=r[3];r[4]-=4;m.setUint32(r[4],tmp,true);
flags(r[4],0x24,32,1);r[4]=res;
r[3]=m.getUint32(r[4]+0x30+0,true);
r[6]=m.getUint32(r[4]+0x38+0,true);
r[0]=m.getUint32(0x6244+0,true);
r[2]=m.getUint32(0x6248+0,true);
flags(m.getUint32(r[3]+0x10c+0,true),r[0],32,1);
if(Z){pc=13164;continue;}
case 13014:
m.setUint32(r[3]+0x104+0,r[6],true);
case 13020:
flags(m.getUint32(r[3]+0x110+0,true),r[2],32,1);
if(Z){pc=13182;continue;}
case 13032:
m.setUint32(r[3]+0x108+0,r[6],true);
case 13038:
m.setUint32(r[3]+0x10c+0,r[0],true);
m.setUint32(r[3]+0x110+0,r[2],true);
m.setUint32(r[4]+0x8+0,r[2],true);
m.setUint32(r[4]+0x4+0,r[0],true);
r[0]=r[3]+0x20;
m.setUint32(r[4]+0,r[0],true);
r[4]-=4;m.setUint32(r[4],0,true);run(10804);
m.setUint8(r[4]+0x1f+0,((r[0]>>>0)&255),true);
flags(((r[0]>>>0)&255)&((r[0]>>>0)&255),0,8,0);C=O=false;
if(Z){pc=13200;continue;}
flags(m.getUint32(r[3]+0xec+0,true),0x0,32,1);
if(Z){pc=13101;continue;}
r[0]=r[6];
flags(r[0],m.getUint32(r[3]+0x104+0,true),32,1);r[0]=res;
flags(r[0],0x3e7,32,1);
if((!C&&!Z)){pc=13124;continue;}
case 13101:
flags(m.getUint32(r[3]+0xf0+0,true),0x0,32,1);
if(Z){pc=13153;continue;}
flags(r[6],m.getUint32(r[3]+0x108+0,true),32,1);r[6]=res;
flags(r[6],0x3e7,32,1);
if((C||Z)){pc=13153;continue;}
case 13124:
m.setUint32(r[4]+0x8+0,0x46d0,true);
r[0]=m.getUint32(r[4]+0x34+0,true);
m.setUint32(r[4]+0x4+0,r[0],true);
m.setUint32(r[4]+0,r[3],true);
r[4]-=4;m.setUint32(r[4],0,true);run(4402);
m.setUint8(r[4]+0x1f+0,0x0,true);
case 13153:
r[0]=m.getUint8(r[4]+0x1f+0,true);
flags(r[4],0x24,32,0);r[4]=res;
r[3]=m.getUint32(r[4],true);r[4]+=4;
r[6]=m.getUint32(r[4],true);r[4]+=4;
r[4]+=4;return;
case 13164:
flags(m.getUint32(r[3]+0xec+0,true),0x0,32,1);
if(!Z){pc=13020;continue;}
pc=13014;continue;
case 13182:
flags(m.getUint32(r[3]+0xf0+0,true),0x0,32,1);
if(!Z){pc=13038;continue;}
pc=13032;continue;
case 13200:
m.setUint32(r[4]+0x8+0,0x4208,true);
r[0]=m.getUint32(r[4]+0x34+0,true);
m.setUint32(r[4]+0x4+0,r[0],true);
m.setUint32(r[4]+0,r[3],true);
r[4]-=4;m.setUint32(r[4],0,true);run(4402);
pc=13153;continue;
case 13226:
flags(r[4],0x4c,32,1);r[4]=res;
m.setUint32(r[4]+0x3c+0,r[3],true);
m.setUint32(r[4]+0x40+0,r[6],true);
m.setUint32(r[4]+0x44+0,r[7],true);
m.setUint32(r[4]+0x48+0,r[5],true);
r[3]=m.getUint32(r[4]+0x50+0,true);
r[6]=m.getUint32(0x6240+0,true);
r[0]=r[6];
flags(r[0],m.getUint32(r[3]+0xd0+0,true),32,1);r[0]=res;
flags(r[0],m.getUint32(r[3]+0xcc+0,true),32,1);
if(!C){pc=13291;continue;}
case 13271:
r[3]=m.getUint32(r[4]+0x3c+0,true);
r[6]=m.getUint32(r[4]+0x40+0,true);
r[7]=m.getUint32(r[4]+0x44+0,true);
r[5]=m.getUint32(r[4]+0x48+0,true);
flags(r[4],0x4c,32,0);r[4]=res;
r[4]+=4;return;
case 13291:
m.setUint32(r[3]+0xd0+0,r[6],true);
r[0]=m.getUint32(r[3]+0x100+0,true);
m.setUint32(r[4]+0x2c+0,r[0],true);
m.setUint32(r[3]+0x100+0,r[6],true);
r[5]=r[6];
flags(r[5],m.getUint32(r[3]+0xd8+0,true),32,1);r[5]=res;
r[7]=m.getUint32(r[3]+0xd4+0,true);
flags(r[5],r[7],32,1);
if(!C){pc=13507;continue;}
case 13335:
r[0]=m.getUint32(r[3]+0,true);
flags(r[0],0x7,32,1);
if(Z){pc=13530;continue;}
flags(r[0]&r[0],0,32,0);C=O=false;
if(Z){pc=13271;continue;}
r[2]=r[6];
r[1]=m.getUint32(r[4]+0x2c+0,true);
flags(r[2],r[1],32,1);r[2]=res;
flags(r[2],0x12c,32,1);
if((!C&&!Z)){pc=13555;continue;}
flags(r[0],0x1,32,1);
if(Z){pc=13584;continue;}
m.setUint32(r[4]+0x8+0,r[6],true);
r[0]=m.getUint32(r[4]+0x54+0,true);
m.setUint32(r[4]+0x4+0,r[0],true);
m.setUint32(r[4]+0,r[3],true);
r[4]-=4;m.setUint32(r[4],0,true);run(12978);
flags(((r[0]>>>0)&255)&((r[0]>>>0)&255),0,8,0);C=O=false;
if(Z){pc=13271;continue;}
r[0]=m.getUint32(r[3]+0,true);
r[2]=r[0]-0x3;
flags(r[2],0x2,32,1);
if((!C&&!Z)){pc=13703;continue;}
flags(r[5],r[7],32,1);
if(C){pc=13482;continue;}
r[0]=m.getUint32(r[4]+0x58+0,true);
r[0]=m.getUint16(r[0]+0xa+0,true);
flags(r[0],0x2bc,32,1);
if((C||Z)){pc=13674;continue;}
r[0]=m.getUint32(r[4]+0x58+0,true);
r[0]=m.getUint16(r[0]+0x8+0,true);
flags(r[0],0x2bc,32,1);
if((C||Z)){pc=13674;continue;}
r[0]=m.getUint32(r[4]+0x58+0,true);
r[0]=m.getUint16(r[0]+0xc+0,true);
flags(r[0],0x2bc,32,1);
if((C||Z)){pc=13674;continue;}
case 13482:
m.setUint32(r[4]+0x8+0,r[6],true);
r[0]=m.getUint32(r[4]+0x54+0,true);
m.setUint32(r[4]+0x4+0,r[0],true);
m.setUint32(r[4]+0,r[3],true);
r[4]-=4;m.setUint32(r[4],0,true);run(4784);
pc=13271;continue;
case 13507:
r[0]=m.getUint32(r[4]+0x58+0,true);
m.setUint32(r[4]+0,r[0],true);
r[4]-=4;m.setUint32(r[4],0,true);run(10182);
m.setUint32(r[3]+0xd8+0,r[6],true);
pc=13335;continue;
case 13530:
m.setUint32(0x6260+0,0x0,true);
m.setUint32(0x6264+0,0x0,true);
pc=13271;continue;
case 13555:
m.setUint32(r[4]+0x8+0,0x4220,true);
r[0]=m.getUint32(r[4]+0x54+0,true);
m.setUint32(r[4]+0x4+0,r[0],true);
m.setUint32(r[4]+0,r[3],true);
r[4]-=4;m.setUint32(r[4],0,true);run(4402);
pc=13271;continue;
case 13584:
r[0]=m.getUint32(r[4]+0x54+0,true);
m.setUint32(r[4]+0x4+0,r[0],true);
r[0]=r[3]+0x8;
m.setUint32(r[4]+0,r[0],true);
r[4]-=4;m.setUint32(r[4],0,true);run(9668);
flags(((r[0]>>>0)&255)&((r[0]>>>0)&255),0,8,0);C=O=false;
if(Z){pc=13635;continue;}
m.setUint8(r[3]+0xe0+0,0x1,true);
m.setUint32(r[3]+0,0x0,true);
m.setUint32(r[3]+0xdc+0,0x46fc,true);
pc=13271;continue;
case 13635:
flags(m.getUint8(r[3]+0x1d+0,true),0x0,8,1);
if(Z){pc=13271;continue;}
m.setUint32(r[4]+0x8+0,0x4720,true);
r[0]=m.getUint32(r[4]+0x54+0,true);
m.setUint32(r[4]+0x4+0,r[0],true);
m.setUint32(r[4]+0,r[3],true);
r[4]-=4;m.setUint32(r[4],0,true);run(4402);
pc=13271;continue;
case 13674:
m.setUint32(r[4]+0x8+0,0x4750,true);
r[0]=m.getUint32(r[4]+0x54+0,true);
m.setUint32(r[4]+0x4+0,r[0],true);
m.setUint32(r[4]+0,r[3],true);
r[4]-=4;m.setUint32(r[4],0,true);run(4498);
pc=13271;continue;
case 13703:
flags(r[0],0x2,32,1);
if(Z){pc=13882;continue;}
flags(r[5],r[7],32,1);
if(C){pc=13271;continue;}
flags(r[0],0x6,32,1);
if(!Z){pc=13271;continue;}
r[0]=m.getUint32(r[4]+0x58+0,true);
r[0]=m.getUint16(r[0]+0xc+0,true);
m.setUint32(r[4]+0x1c+0,r[0],true);
r[0]=m.getUint32(r[4]+0x58+0,true);
r[0]=m.getUint16(r[0]+0xa+0,true);
m.setUint32(r[4]+0x18+0,r[0],true);
r[0]=m.getUint32(r[4]+0x58+0,true);
r[0]=m.getUint16(r[0]+0x8+0,true);
m.setUint32(r[4]+0x14+0,r[0],true);
u[0]=m.getUint32(r[3]+0x38+0,true);
m.setUint32(r[4]+0x10+0,u[0],true);
u[0]=m.getUint32(r[3]+0x34+0,true);
m.setUint32(r[4]+0xc+0,u[0],true);
u[0]=m.getUint32(r[3]+0x30+0,true);
m.setUint32(r[4]+0x8+0,u[0],true);
m.setUint32(r[4]+0x4+0,r[6],true);
r[0]=r[3]+0x68;
m.setUint32(r[4]+0,r[0],true);
r[4]-=4;m.setUint32(r[4],0,true);run(6106);
r[0]=m.getUint32(r[3]+0x68+0,true);
flags(r[0],0xb,32,1);
if(Z){pc=14304;continue;}
flags(r[0],0xa,32,1);
if(Z){pc=14332;continue;}
r[0]=m.getUint32(r[3]+0x74+0,true);
m.setUint32(r[3]+0xdc+0,r[0],true);
m.setUint32(r[4]+0x10+0,r[6],true);
r[0]=m.getUint32(r[3]+0x70+0,true);
m.setUint32(r[4]+0xc+0,r[0],true);
r[0]=m.getUint32(r[3]+0x6c+0,true);
m.setUint32(r[4]+0x8+0,r[0],true);
r[0]=m.getUint32(r[4]+0x54+0,true);
m.setUint32(r[4]+0x4+0,r[0],true);
m.setUint32(r[4]+0,r[3],true);
r[4]-=4;m.setUint32(r[4],0,true);run(4602);
pc=13271;continue;
case 13882:
r[0]=m.getUint32(r[3]+0x10c+0,true);
r[7]=r[0];
r[5]=r[0];
a=r[5];b=0x1f &31;if(b){C=((a>>>(b-1))&1)!==0;r[5]=a>>b;Z=(r[5]===0);S=((r[5]|0)<0);O=false;}
r[0]=m.getUint32(r[3]+0x114+0,true);
r[2]=(r[0]|0)<0?0xffffffff:0;
flags(r[7],r[0],32,1);r[7]=res;
flags(r[5],r[2],32,2);r[5]=res;
r[0]=0x7fffffff;
flags(r[0],r[7],32,1);
r[0]=0x0;
flags(r[0],r[5],32,2);r[0]=res;
if((S===O)){pc=14106;continue;}
oldC=C;flags(r[5],1,32,1);C=oldC;r[5]=res;
case 13927:
flags(r[7],0xfffffffe,32,1);
r[0]=r[5];
flags(r[0],0xffffffff,32,2);r[0]=res;
if((S!==O)){pc=14150;continue;}
case 13941:
r[0]=m.getUint32(r[3]+0x110+0,true);
r[7]=r[0];
r[5]=r[0];
a=r[5];b=0x1f &31;if(b){C=((a>>>(b-1))&1)!==0;r[5]=a>>b;Z=(r[5]===0);S=((r[5]|0)<0);O=false;}
r[0]=m.getUint32(r[3]+0x118+0,true);
r[2]=(r[0]|0)<0?0xffffffff:0;
flags(r[7],r[0],32,1);r[7]=res;
flags(r[5],r[2],32,2);r[5]=res;
r[0]=0x7fffffff;
flags(r[0],r[7],32,1);
r[0]=0x0;
flags(r[0],r[5],32,2);r[0]=res;
if((S===O)){pc=14128;continue;}
oldC=C;flags(r[5],1,32,1);C=oldC;r[5]=res;
case 13986:
flags(r[7],0xfffffffe,32,1);
r[0]=r[5];
flags(r[0],0xffffffff,32,2);r[0]=res;
if((S!==O)){pc=14150;continue;}
case 14000:
r[0]=m.getUint32(r[4]+0x58+0,true);
r[0]=m.getUint16(r[0]+0xa+0,true);
flags(r[0],0xbb8,32,1);
if((C||Z)){pc=14179;continue;}
u[0]=m.getUint32(r[3]+0x34+0,true);
m.setUint32(r[4]+0x4+0,u[0],true);
u[0]=m.getUint32(r[3]+0x30+0,true);
m.setUint32(r[4]+0,u[0],true);
r[4]-=4;m.setUint32(r[4],0,true);run(15810);
u[0]=r[0];
a=f[0];b=m.getFloat32(0x4888,true);Z=!(a<b||a>b);C=!(a>=b);O=S=false;
if(!C){pc=14077;continue;}
r[0]=r[6];
flags(r[0],m.getUint32(r[3]+0xf8+0,true),32,1);r[0]=res;
flags(r[0],0xbb7,32,1);
if((C||Z)){pc=14208;continue;}
case 14077:
m.setUint32(r[4]+0x8+0,0x4234,true);
r[0]=m.getUint32(r[4]+0x54+0,true);
m.setUint32(r[4]+0x4+0,r[0],true);
m.setUint32(r[4]+0,r[3],true);
r[4]-=4;m.setUint32(r[4],0,true);run(4498);
pc=13271;continue;
case 14106:
flags(r[7],0x80000000,32,1);
r[0]=r[5];
flags(r[0],0xffffffff,32,2);r[0]=res;
if((S!==O)){pc=13941;continue;}
pc=13927;continue;
case 14128:
flags(r[7],0x80000000,32,1);
r[0]=r[5];
flags(r[0],0xffffffff,32,2);r[0]=res;
if((S!==O)){pc=14000;continue;}
pc=13986;continue;
case 14150:
m.setUint32(r[4]+0x8+0,0x4778,true);
r[0]=m.getUint32(r[4]+0x54+0,true);
m.setUint32(r[4]+0x4+0,r[0],true);
m.setUint32(r[4]+0,r[3],true);
r[4]-=4;m.setUint32(r[4],0,true);run(4402);
pc=13271;continue;
case 14179:
m.setUint32(r[4]+0x8+0,0x47a8,true);
r[0]=m.getUint32(r[4]+0x54+0,true);
m.setUint32(r[4]+0x4+0,r[0],true);
m.setUint32(r[4]+0,r[3],true);
r[4]-=4;m.setUint32(r[4],0,true);run(4498);
pc=13271;continue;
case 14208:
m.setUint32(r[4]+0x8+0,r[6],true);
r[0]=r[3]+0x20;
m.setUint32(r[4]+0x4+0,r[0],true);
r[0]=r[3]+0x48;
m.setUint32(r[4]+0,r[0],true);
r[4]-=4;m.setUint32(r[4],0,true);run(8894);
u[4]=r[0];
r[2]=Math.trunc(f[4]);
m.setUint32(r[4]+0x10+0,r[6],true);
r[0]=((m.getUint16(r[3]+0xa+0,true)<<16)>>16);
flags(r[0],0x5,32,0);r[0]=res;
r[1]=0x64;
flags(r[0],r[1],32,1);
if((S!==O)){r[0]=r[1];}
flags(r[0],r[2],32,1);r[0]=res;
m.setUint32(r[4]+0xc+0,r[0],true);
r[0]=((m.getUint16(r[3]+0x8+0,true)<<16)>>16);
flags(r[0],0x5,32,0);r[0]=res;
flags(r[0],r[1],32,1);
if((S!==O)){r[0]=r[1];}
flags(r[0],r[2],32,0);r[0]=res;
m.setUint32(r[4]+0x8+0,r[0],true);
r[0]=m.getUint32(r[4]+0x54+0,true);
m.setUint32(r[4]+0x4+0,r[0],true);
m.setUint32(r[4]+0,r[3],true);
r[4]-=4;m.setUint32(r[4],0,true);run(4602);
pc=13271;continue;
case 14304:
r[0]=m.getUint32(r[3]+0x74+0,true);
m.setUint32(r[4]+0x8+0,r[0],true);
r[0]=m.getUint32(r[4]+0x54+0,true);
m.setUint32(r[4]+0x4+0,r[0],true);
m.setUint32(r[4]+0,r[3],true);
r[4]-=4;m.setUint32(r[4],0,true);run(4402);
pc=13271;continue;
case 14332:
r[0]=m.getUint32(r[3]+0x74+0,true);
m.setUint32(r[4]+0x8+0,r[0],true);
r[0]=m.getUint32(r[4]+0x54+0,true);
m.setUint32(r[4]+0x4+0,r[0],true);
m.setUint32(r[4]+0,r[3],true);
r[4]-=4;m.setUint32(r[4],0,true);run(4498);
pc=13271;continue;
case 14360:
r[0]=m.getUint32(r[4]+0x4+0,true);
r[2]=m.getUint32(r[4]+0x8+0,true);
m.setUint32(r[0]+0,r[2],true);
m.setUint32(r[0]+0x4+0,0x0,true);
r[4]+=4;return;
r[0]=m.getUint32(r[4]+0x4+0,true);
r[2]=m.getUint32(r[4]+0x8+0,true);
m.setUint32(r[0]+0,r[2],true);
r[4]+=4;return;

r[2]=m.getUint32(r[4]+0x4+0,true);
r[0]=m.getUint32(r[4]+0x8+0,true);
flags(r[0],m.getUint32(r[2]+0x4+0,true),32,1);r[0]=res;
flags(r[0],m.getUint32(r[2]+0,true),32,1);
r[0]=(r[0]&~255)|((((!C?1:0))&255)<<0);
r[4]+=4;return;

r[2]=m.getUint32(r[4]+0x4+0,true);
r[0]=m.getUint32(0x6240+0,true);
flags(r[0],m.getUint32(r[2]+0x4+0,true),32,1);r[0]=res;
flags(r[0],m.getUint32(r[2]+0,true),32,1);
r[0]=(r[0]&~255)|((((!C?1:0))&255)<<0);
r[4]+=4;return;
r[0]=m.getUint32(r[4]+0x4+0,true);
r[2]=m.getUint32(r[4]+0x8+0,true);
m.setUint32(r[0]+0x4+0,r[2],true);
r[4]+=4;return;
r[0]=m.getUint32(r[4]+0x4+0,true);
r[2]=m.getUint32(0x6240+0,true);
m.setUint32(r[0]+0x4+0,r[2],true);
r[4]+=4;return;
r[0]=m.getUint32(0x6240+0,true);
r[4]+=4;return;
r[0]=Math.imul(m.getUint32(0x6240+0,true),0x3e8);
r[4]+=4;return;
r[0]=m.getUint8(r[4]+0x4+0,true);
r[0]=m.getUint32(r[0]*4+0x624c+0,true);
r[4]+=4;return;
case 14482:
r[0]=m.getUint32(r[4]+0x4+0,true);
m.setUint32(r[0]+0x84+0,0xfa,true);
r[4]+=4;return;

r[0]=m.getUint32(0x6240+0,true);
r[4]+=4;return;
r[0]=(r[0]&~255)|(((0x0)&255)<<0);
r[4]+=4;return;

r[0]=(r[0]&~255)|(((0x1)&255)<<0);
r[4]+=4;return;

r[0]=m.getUint32(0x6244+0,true);
r[4]+=4;return;
r[0]=m.getUint32(0x6248+0,true);
r[4]+=4;return;
r[0]=Math.trunc(m.getFloat32(r[4]+0x8,true));
m.setUint32(0x6260+0,r[0],true);
r[0]=Math.trunc(m.getFloat32(r[4]+0xc,true));
m.setUint32(0x6264+0,r[0],true);
r[0]=(r[0]&~255)|(((0x1)&255)<<0);
r[4]+=4;return;
case 14549:
flags(r[4],0x138,32,1);r[4]=res;
m.setUint32(r[4]+0x130+0,r[3],true);
m.setUint32(r[4]+0x134+0,r[6],true);
m.setUint32(0x625c+0,0xfff,true);
m.setUint32(0x6250+0,0xfff,true);
m.setUint32(0x624c+0,0xfff,true);
r[3]=r[4]+0x14;
r[2]=0x0;
r[1]=0x118;
r[0]=0x0;
case 14618:
m.setUint32(r[4]+r[0]*1+0x14+0,r[2],true);
m.setUint32(r[4]+r[0]*1+0x18+0,r[2],true);
flags(r[0],0x8,32,0);r[0]=res;
flags(r[0],r[1],32,1);
if(C){pc=14618;continue;}
m.setUint32(r[3]+r[0]*1+0,0x0,true);
r[3]=r[4]+0x14;
r[0]=r[4]+0x1c;
m.setUint32(r[4]+0,r[0],true);
r[4]-=4;m.setUint32(r[4],0,true);run(9612);
m.setUint32(r[4]+0xc+0,0x43b32666,true);
m.setUint32(r[4]+0x8+0,0x42b40000,true);
m.setUint32(r[4]+0x4+0,0x41800000,true);
r[0]=r[4]+0x34;
m.setUint32(r[4]+0,r[0],true);
r[4]-=4;m.setUint32(r[4],0,true);run(10580);
m.setUint32(r[4]+0x60+0,0x0,true);
m.setUint32(r[4]+0x64+0,0x0,true);
m.setUint32(r[4]+0x68+0,0x0,true);
m.setUint32(r[4]+0x4+0,0xa,true);
r[0]=r[4]+0xe0;
m.setUint32(r[4]+0,r[0],true);
r[4]-=4;m.setUint32(r[4],0,true);run(14360);
m.setUint32(r[4]+0x4+0,0x32,true);
r[0]=r[4]+0xe8;
m.setUint32(r[4]+0,r[0],true);
r[4]-=4;m.setUint32(r[4],0,true);run(14360);
m.setUint32(r[4]+0x78+0,0x3f800000,true);
m.setUint32(r[4]+0x88+0,0x424b,true);
m.setUint32(r[4]+0xf0+0,0x4251,true);
m.setUint32(r[4]+0xf8+0,0x1,true);
m.setUint32(r[4]+0xfc+0,0x1,true);
r[2]=0x118;
r[0]=0x0;
case 14824:
r[1]=m.getUint32(r[4]+r[0]*1+0x18+0,true);
r[6]=m.getUint32(r[4]+r[0]*1+0x14+0,true);
m.setUint32(r[0]+0x6000+0,r[6],true);
m.setUint32(r[0]+0x6004+0,r[1],true);
flags(r[0],0x8,32,0);r[0]=res;
flags(r[0],r[2],32,1);
if(C){pc=14824;continue;}
r[2]=m.getUint32(r[3]+r[0]*1+0,true);
m.setUint32(r[0]+0x6000+0,r[2],true);
m.setUint32(r[4]+0x8+0,0x611c,true);
m.setUint32(r[4]+0x4+0,0x6140,true);
m.setUint32(r[4]+0,0x6000,true);
r[4]-=4;m.setUint32(r[4],0,true);run(10236);
r[3]=m.getUint32(r[4]+0x130+0,true);
r[6]=m.getUint32(r[4]+0x134+0,true);
flags(r[4],0x138,32,0);r[4]=res;
r[4]+=4;return;
case 14909:
r[0]=m.getUint32(r[4]+0x4+0,true);
m.setUint32(0x6244+0,r[0],true);
r[0]=m.getUint32(r[4]+0x8+0,true);
m.setUint32(0x6248+0,r[0],true);
r[0]=m.getUint32(r[4]+0xc+0,true);
m.setUint32(0x624c+0,r[0],true);
r[0]=m.getUint32(r[4]+0x10+0,true);
m.setUint32(0x6250+0,r[0],true);
r[0]=m.getUint32(r[4]+0x14+0,true);
m.setUint32(0x625c+0,r[0],true);
r[4]+=4;return;
case 14955:
flags(r[4],0x1c,32,1);r[4]=res;
m.setUint32(r[4]+0xc+0,0x611c,true);
m.setUint32(r[4]+0x8+0,0x6140,true);
r[0]=((m.getUint8(r[4]+0x20+0,true)<<24)>>24);
m.setUint32(r[4]+0x4+0,r[0],true);
m.setUint32(r[4]+0,0x6000,true);
r[4]-=4;m.setUint32(r[4],0,true);run(11714);
flags(r[4],0x1c,32,0);r[4]=res;
r[4]+=4;return;
case 14999:
flags(r[4],0x1c,32,1);r[4]=res;
r[0]=m.getUint32(r[4]+0x20+0,true);
m.setUint32(0x6240+0,r[0],true);
m.setUint32(r[4]+0x8+0,0x611c,true);
m.setUint32(r[4]+0x4+0,0x6140,true);
m.setUint32(r[4]+0,0x6000,true);
r[4]-=4;m.setUint32(r[4],0,true);run(13226);
flags(r[4],0x1c,32,0);r[4]=res;
r[4]+=4;return;
case 15043:
flags(r[4],0x4,32,1);r[4]=res;
m.setUint32(r[4]+0,0x6000,true);
r[4]-=4;m.setUint32(r[4],0,true);run(4234);
flags(r[4],0x4,32,0);r[4]=res;
r[4]+=4;return;
case 15062:
flags(r[4],0x4,32,1);r[4]=res;
m.setUint32(r[4]+0,0x6000,true);
r[4]-=4;m.setUint32(r[4],0,true);run(4326);
flags(r[4],0x4,32,0);r[4]=res;
r[4]+=4;return;
case 15081:
r[0]=m.getUint32(0x60dc+0,true);
r[4]+=4;return;
case 15087:
r[0]=m.getUint8(0x60e0+0,true);
r[4]+=4;return;
case 15095:
r[0]=m.getUint32(0x6260+0,true);
r[4]+=4;return;
case 15101:
r[0]=m.getUint32(0x6264+0,true);
r[4]+=4;return;
case 15107:
r[0]=((m.getUint16(0x6008+0,true)<<16)>>16);
r[4]+=4;return;
case 15115:
r[0]=((m.getUint16(0x600a+0,true)<<16)>>16);
r[4]+=4;return;
case 15123:
r[0]=m.getUint16(0x6124+0,true);
r[4]+=4;return;
case 15131:
r[0]=m.getUint16(0x6126+0,true);
r[4]+=4;return;
case 15139:
r[0]=m.getUint16(0x6128+0,true);
r[4]+=4;return;
case 15147:
r[0]=m.getUint32(0x6030+0,true);
r[4]+=4;return;
case 15153:
r[0]=m.getUint32(0x6034+0,true);
r[4]+=4;return;
case 15159:
r[0]=m.getUint32(0x6038+0,true);
r[4]+=4;return;
case 15165:
flags(r[4],0x10,32,1);r[4]=res;
m.setUint32(r[4]+0,0x6140,true);
r[4]-=4;m.setUint32(r[4],0,true);run(14482);
m.setUint32(0x6000+0,0x0,true);
m.setUint32(0x6004+0,0x0,true);
m.setUint32(r[4]+0,0x6008,true);
r[4]-=4;m.setUint32(r[4],0,true);run(9612);
m.setUint32(r[4]+0xc+0,0x43b32666,true);
m.setUint32(r[4]+0x8+0,0x42b40000,true);
m.setUint32(r[4]+0x4+0,0x41800000,true);
m.setUint32(r[4]+0,0x6020,true);
r[4]-=4;m.setUint32(r[4],0,true);run(10580);
m.setUint8(0x6048+0,0x0,true);
m.setUint8(0x6049+0,0x0,true);
m.setUint8(0x604a+0,0x0,true);
m.setUint32(0x604c+0,0x0,true);
m.setUint32(0x6050+0,0x0,true);
m.setUint32(0x6054+0,0x0,true);
m.setUint32(0x6058+0,0x0,true);
m.setUint32(0x605c+0,0x0,true);
m.setUint32(0x6060+0,0x0,true);
m.setUint32(0x6064+0,0x3f800000,true);
m.setUint32(0x6068+0,0x0,true);
m.setUint32(0x606c+0,0x0,true);
m.setUint32(0x6070+0,0x0,true);
m.setUint32(0x6074+0,0x424b,true);
m.setUint32(0x6078+0,0x0,true);
m.setUint32(0x607c+0,0x0,true);
m.setUint32(0x6080+0,0x0,true);
m.setUint32(0x6084+0,0x0,true);
m.setUint32(0x6088+0,0x0,true);
m.setUint32(0x608c+0,0x0,true);
m.setUint32(0x6090+0,0x0,true);
m.setUint32(0x6094+0,0x0,true);
m.setUint32(0x6098+0,0x0,true);
m.setUint32(0x609c+0,0x0,true);
m.setUint32(0x60a0+0,0x0,true);
m.setUint32(0x60a4+0,0x0,true);
m.setUint32(0x60a8+0,0x0,true);
m.setUint32(0x60ac+0,0x0,true);
m.setUint32(0x60b0+0,0x0,true);
m.setUint32(0x60b4+0,0x0,true);
m.setUint32(0x60b8+0,0x0,true);
m.setUint32(0x60bc+0,0x0,true);
m.setUint32(0x60c0+0,0x0,true);
m.setUint32(0x60c4+0,0x0,true);
m.setUint8(0x60c8+0,0x0,true);
m.setUint8(0x60c9+0,0x0,true);
m.setUint8(0x60ca+0,0x0,true);
m.setUint8(0x60cb+0,0x0,true);
m.setUint32(r[4]+0x4+0,0xa,true);
m.setUint32(r[4]+0,0x60cc,true);
r[4]-=4;m.setUint32(r[4],0,true);run(14360);
m.setUint32(r[4]+0x4+0,0x32,true);
m.setUint32(r[4]+0,0x60d4,true);
r[4]-=4;m.setUint32(r[4],0,true);run(14360);
m.setUint32(0x60dc+0,0x4251,true);
m.setUint8(0x60e0+0,0x0,true);
m.setUint32(0x60e4+0,0x1,true);
m.setUint32(0x60e8+0,0x1,true);
m.setUint32(0x60ec+0,0x0,true);
m.setUint32(0x60f0+0,0x0,true);
m.setUint32(0x60f4+0,0x0,true);
m.setUint32(0x60f8+0,0x0,true);
m.setUint32(0x60fc+0,0x0,true);
m.setUint32(0x6100+0,0x0,true);
m.setUint32(0x6104+0,0x0,true);
m.setUint32(0x6108+0,0x0,true);
m.setUint32(0x610c+0,0x0,true);
m.setUint32(0x6110+0,0x0,true);
m.setUint32(0x6114+0,0x0,true);
m.setUint32(0x6118+0,0x0,true);
flags(r[4],0x10,32,0);r[4]=res;
r[4]+=4;return;
case 15808:
r[0]=asbits(Math.cos(m.getFloat32(r[4]+4,true)));r[4]+=4;return;
case 15809:
r[0]=asbits(Math.sin(m.getFloat32(r[4]+4,true)));r[4]+=4;return;
case 15810:
r[0]=asbits(Math.hypot(m.getFloat32(r[4]+4,true),m.getFloat32(r[4]+8,true)));r[4]+=4;return;
case 15811:
r[0]=asbits(remainder(m.getFloat32(r[4]+4,true),m.getFloat32(r[4]+8,true)));r[4]+=4;return;
case 15812:
r[0]=asbits(Math.atan2(m.getFloat32(r[4]+4,true),m.getFloat32(r[4]+8,true)));r[4]+=4;return;
case 15813:
r[0]=away(m.getFloat32(r[4]+4,true));r[4]+=4;return;
default:throw Error('Unexpected controller address '+pc)}}}
const invoke=(name,...args)=>{r[4]=ram.byteLength-128;for(let i=0;i<args.length;i++)m.setUint32(r[4]+4+i*4,args[i],true);run(F[name]);return r[0]};
const getString=ptr=>{let s='';while(bytes[ptr])s+=String.fromCharCode(bytes[ptr++]);return s};
this._invoke=invoke;this._str=name=>getString(invoke(name));this._float=name=>(conv.setUint32(0,invoke(name),true),conv.getFloat32(0,true));
invoke('construct');invoke('init');
}
setInputs({leftTicks=0,rightTicks=0,backLeft=4095,front=4095,backRight=4095}={}){this._invoke('inputs',leftTicks,rightTicks,backLeft,front,backRight)}
command(key){this._invoke('command',String(key).charCodeAt(0));}
tick(nowMs,inputs){if(inputs)this.setInputs(inputs);this._invoke('tick',nowMs);}
snapshot(){const g=this._invoke;return {mode:this._str('mode'),phase:this._str('phase'),note:this._str('note'),calibrated:!!g('calibrated'),leftPWM:g('leftPWM')|0,rightPWM:g('rightPWM')|0,leftThreshold:g('leftThreshold')|0,rightThreshold:g('rightThreshold')|0,x:this._float('x'),y:this._float('y'),theta:this._float('theta'),backLeft:g('backLeft'),front:g('front'),backRight:g('backRight')}}
};})();
