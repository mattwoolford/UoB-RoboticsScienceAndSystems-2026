"""Build the real project C++ (i686 scalar/SSE2) and lower its reachable object code to JS.
No online compiler, WASM toolchain, runtime eval, or Arduino installation required.
Requires Python 3 + x86 GNU g++, as, ld, objdump, nm. Fails on an unsupported instruction.
"""
from pathlib import Path
from tempfile import TemporaryDirectory
import sys,re,struct,base64,json,subprocess
ROOT=Path(__file__).resolve().parent
FW=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else ROOT.parents[1]/'firmware'/'BoxEscape'
OUT=Path(sys.argv[2]).resolve() if len(sys.argv)>2 else ROOT/'engine.js'
td=TemporaryDirectory(); D=Path(td.name)
def cmd(*args): return subprocess.check_output([str(a) for a in args])
opt='-std=c++17 -m32 -march=i686 -msse2 -mfpmath=sse -mno-fp-ret-in-387 -fno-pic -fno-pie -fno-exceptions -fno-rtti -ffreestanding -fno-builtin -fno-stack-protector -fno-jump-tables -fno-tree-vectorize -fno-tree-slp-vectorize -fno-asynchronous-unwind-tables -fno-unwind-tables -O1 -DBOX_ESCAPE_ENABLE=1'.split()
cmd('g++',*opt,'-I'+str(ROOT/'bridge'),'-I'+str(FW),'-c',ROOT/'bridge/core.cpp','-o',D/'core.o')
cmd('as','--32',ROOT/'bridge/imports.S','-o',D/'imports.o')
exe=D/'core.elf'
cmd('ld','-m','elf_i386','-e','init','-Ttext','0x1000','-o',exe,D/'core.o',D/'imports.o')
raw=exe.read_bytes()
phoff=struct.unpack_from('<I',raw,28)[0];size,num=struct.unpack_from('<HH',raw,42)
image=[]
for j in range(num):
    typ,off,addr,_,n,_,flags,_=struct.unpack_from('<8I',raw,phoff+size*j)
    if typ==1 and n and flags!=5: image.append([addr,base64.b64encode(raw[off:off+n]).decode()])
symbols={m[2]:int(m[1],16) for m in re.finditer(r'^([0-9a-f]+) [A-Za-z] (\S+)',cmd('nm','-n',exe).decode(),re.M)}
syms={k:v for k,v in symbols.items() if k.split('_')[0] in ('init','inputs','command','tick','note','mode','phase','x','y','theta','backLeft','backRight','front','leftThreshold','rightThreshold','calibrated','leftPWM','rightPWM')}
syms['construct']=next(v for k,v in symbols.items() if k.startswith('_GLOBAL__sub_I'))
imports={v:k for k,v in symbols.items() if k.startswith('m_')}
ops={}
for line in cmd('objdump','-d','-Mintel','--no-show-raw-insn',exe).decode().splitlines():
    m=re.match(r'^\s*([0-9a-f]+):\s+(\w+)\s*(.*?)\s*$',line)
    if m: ops[int(m[1],16)]=(m[2],m[3].split(' <')[0].split(',') if m[3] else [])
G={'eax':0,'ecx':1,'edx':2,'ebx':3,'esp':4,'ebp':5,'esi':6,'edi':7}
sub={}
for n,i in G.items():
    sub[n[1:]]=(i,16,0)
    if i<4: sub[n[1]+'l']=(i,8,0);sub[n[1]+'h']=(i,8,8)
def bits(v):
    if v in sub:return sub[v][1]
    if v.startswith('BYTE'):return 8
    if v.startswith('WORD'):return 16
    return 32
def addr(v):
    v=v.rsplit(' PTR ',1)[-1].replace('ds:','')
    v=v.strip('[]')
    return re.sub(r'\b(eax|edx|ebx|ecx|edi|esi|ebp|esp)\b',lambda m:'r['+str(G[m[1]])+']',v)
def xr(v):return v.startswith('xmm')
def mem(v):return (' PTR ' in v or 'ds:' in v)
def u(v,off=0):
    if v in G:return 'r[%s]'%G[v]
    if v in sub:
        i,b,shift=sub[v];return '((r[%s]>>>%s)&%s)'%(i,shift,2**b-1)
    if xr(v):return 'u[%s]'%(4*int(v[3:])+off)
    if mem(v):return 'm.getUint%s(%s+%s,true)'%(bits(v),addr(v),4*off)
    if v.startswith('0x') or re.fullmatch(r'\d+',v):return v
    raise ValueError(v)
def put(v,expr,off=0):
    if v in G or xr(v):return u(v,off)+'='+expr+';'
    if v in sub:
        i,b,s=sub[v]; mask=(2**b-1)
        return f'r[{i}]=(r[{i}]&~{mask<<s})|((({expr})&{mask})<<{s});'
    if mem(v):return 'm.setUint%s(%s+%s,%s,true);'%(bits(v),addr(v),off*4,expr)
    raise ValueError(v)
def f(v,double=False):
    if xr(v):return ('d[%s]'%(2*int(v[3:]))) if double else ('f[%s]'%(4*int(v[3:])))
    return 'm.getFloat%s(%s,true)'%('64' if double else '32',addr(v))
def fp(v,expr,double=False):
    if xr(v):return f(v,double)+'='+expr+';'
    return 'm.setFloat%s(%s,%s,true);'%('64' if double else '32',addr(v),expr)
cc={'e':'Z','ne':'!Z','b':'C','be':'(C||Z)','a':'(!C&&!Z)','ae':'!C','s':'S','ns':'!S','g':'(!Z&&S===O)','ge':'(S===O)','l':'(S!==O)','le':'(Z||S!==O)'}
def asm(pc,op,args):
    a,b,c=(args+['','',''])[:3]; ab=bits(a); A=lambda:u(a);B=lambda:u(b)
    if pc in imports:
        name=imports[pc]
        args=['m.getFloat32(r[4]+4,true)','m.getFloat32(r[4]+8,true)']
        if name=='m_lround': val='away('+args[0]+')'
        else:
            s={'m_sin':'Math.sin','m_cos':'Math.cos','m_atan2':'Math.atan2','m_remainder':'remainder','m_hypot':'Math.hypot'}[name]
            val='asbits('+s+'('+','.join(args[:(1 if name in ('m_sin','m_cos') else 2)])+'))'
        return 'r[0]='+val+';r[4]+=4;return;'
    if op=='call':return 'r[4]-=4;m.setUint32(r[4],0,true);run('+str(int(a,16))+');'
    if op=='ret':return 'r[4]+=4;return;'
    if op.startswith('j'):
        t=int(a,16)
        return ('pc='+str(t)+';continue;' if op=='jmp' else 'if('+cc[op[1:]]+'){pc='+str(t)+';continue;}')
    if op=='mov':return put(a,B())
    if op=='lea':return put(a,addr(b))
    if op=='movzx':return put(a,B())
    if op=='movsx':
        n=32-bits(b);return put(a,'(('+B()+'<<'+str(n)+')>>'+str(n)+')')
    if op=='movd':return put(a,B())
    if op in ('movss','movsd'):return put(a,B())+(put(a,u(b,1),1) if op=='movsd' else '')
    if op in ('movaps','movq'):return ''.join(put(a,u(b,q),q) for q in range(4 if op=='movaps' else 2))
    if op in ('ucomiss','comiss'):return 'a='+f(a)+';b='+f(b)+';Z=!(a<b||a>b);C=!(a>=b);O=S=false;'
    if op in ('subss','mulss','addss','divss','mulsd','divsd'):
        d=op.endswith('sd'); return fp(a,f(a,d)+{'sub':'-','add':'+','mul':'*','div':'/'}[op[:3]]+f(b,d),d)
    if op=='cmpltss':return put(a,f(a)+'<'+f(b)+'?0xffffffff:0')
    if op=='cvtsi2ss':return fp(a,'('+B()+'|0)')
    if op=='cvttss2si':return put(a,'Math.trunc('+f(b)+')')
    if op=='cvtss2sd':return fp(a,f(b),True)
    if op=='cvtsd2ss':return fp(a,f(b,True))
    if op=='punpckldq':return put(a,u(b,1),3)+put(a,u(a,1),2)+put(a,B(),1)
    if op=='fild':return 'fpv=Number(m.getBigInt64('+addr(a)+',true));'
    if op=='fstp':return fp(a,'fpv')
    if op in ('andps','andnps','pxor','xorps','orps'):
        opchar={'andps':'&','andnps':'&','pxor':'^','xorps':'^','orps':'|'}[op]
        return ''.join(put(a,('~' if op=='andnps' else '')+u(a,q)+opchar+u(b,q),q) for q in range(4))
    if op=='push':return 'tmp='+A()+';r[4]-=4;m.setUint32(r[4],tmp,true);'
    if op=='pop':return put(a,'m.getUint32(r[4],true)')+'r[4]+=4;'
    if op=='cdq':return 'r[2]=(r[0]|0)<0?0xffffffff:0;'
    if op=='cmp':return f'flags({A()},{B()},{ab},1);'
    if op=='test':return f'flags({A()}&{B()},0,{ab},0);C=O=false;'
    if op.startswith('set'):return put(a,'('+cc[op[3:]]+'?1:0)')
    if op.startswith('cmov'):return 'if('+cc[op[4:]]+'){'+put(a,B())+'}'
    if op in ('add','sub','sbb','and','or'):
        if op in ('and','or'):
            ret=f'flags({A()}{ {"and":"&","or":"|"}[op]}{B()},0,{ab},0);C=O=false;'
        else:ret=f'flags({A()},{B()},{ab},{ {"add":0,"sub":1,"sbb":2}[op]});'
        return ret+put(a,'res')
    if op in ('inc','dec'):return f'oldC=C;flags({A()},1,{ab},{int(op=="dec")});C=oldC;'+put(a,'res')
    if op=='neg':return f'flags(0,{A()},{ab},1);'+put(a,'res')
    if op=='imul':return put(a,'Math.imul('+B()+','+u(c)+')')
    if op in ('sar','shr'):return 'a='+A()+';b='+B()+' &31;if(b){C=((a>>>(b-1))&1)!==0;'+put(a,'a'+('>>' if op=='sar' else '>>>')+'b')+'Z=('+A()+'===0);S=(('+A()+'|0)<0);O=false;}'
    if op in ('nop','xchg') and (op=='nop' or a==b):return ''
    raise ValueError((hex(pc),op,args))
targets=set(syms.values())|set(imports)|{int(v[1][0],16) for v in ops.values() if v[0].startswith('j') or v[0]=='call'}
code=[]
for pc,(op,args) in ops.items():
    if pc in targets:code.append('case '+str(pc)+':')
    code.append(asm(pc,op,args))
template=(ROOT/'runtime.js.in').read_text()
OUT.write_text(template.replace('/*IMAGE*/',json.dumps(image)).replace('/*SYMBOLS*/',json.dumps(syms)).replace('/*OPS*/','\n'.join(code)))
