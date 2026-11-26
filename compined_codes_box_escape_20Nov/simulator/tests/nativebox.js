// Test-only synchronous bridge to the native reference for the real-world JS model.
globalThis.BoxCore=class NativeBoxCore{
  constructor(){
   const {spawn}=require('node:child_process');
   this.proc=spawn(process.env.BOX_ORACLE_EXE,[],{stdio:['pipe','pipe','inherit']});
   this.proc.stdout._handle.setBlocking(true);this.proc.stdin._handle.setBlocking(true);
   this.fs=require('node:fs');this.buf=Buffer.alloc(2048);this.now=0;this.setInputs({leftTicks:0,rightTicks:0,backLeft:4095,front:4095,backRight:4095});this._read();
   this.proc.unref();this.proc.stdin.unref();this.proc.stdout.unref();
  }
  setInputs(f){this.i=f;}
  _read(){let text='';while(!text.includes('\n')){let n=this.fs.readSync(this.proc.stdout._handle.fd,this.buf,0,this.buf.length,null);if(!n)throw Error('Closed native pipe');text+=this.buf.toString('utf8',0,n);}
    const [mode,phase,note,...v]=text.trimEnd().split('|'),[leftPWM,rightPWM,calibrated,leftThreshold,rightThreshold,x,y,theta,backLeft,front,backRight]=v.map(Number);this.s={mode,phase,note,leftPWM,rightPWM,calibrated:!!calibrated,leftThreshold,rightThreshold,x,y,theta,backLeft,front,backRight};}
  _write(kind,key){const i=this.i;const line=[kind,this.now,i.leftTicks,i.rightTicks,i.backLeft,i.front,i.backRight,key].join(' ')+'\n';this.fs.writeSync(this.proc.stdin._handle.fd,line);this._read();return this.s;}
  command(k){return this._write('c',k.charCodeAt(0));}
  tick(time,i){this.now=time;this.setInputs(i);return this._write('t',0);}
  snapshot(){return this.s;}
};
