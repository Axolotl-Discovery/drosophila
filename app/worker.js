importScripts('engine.js');
let B=null,ctype=null,rnd0=Math.random,meta=null,N=0,running=true,cap=1,glow=null,lastSpk=null;
let wall0=0,sim0=0,lastPost=0,outAcc={},outT0=0;const watch=new Map();
const post=(m,t)=>postMessage(m,t||[]);
async function load(){
  const get=async(f,prog)=>{const r=await fetch('data/'+f);if(!r.ok)throw new Error('No se pudo cargar '+f);
    const len=+r.headers.get('content-length')||0;if(!r.body||!len){const b=await r.arrayBuffer();prog&&prog(1);return b;}
    const rd=r.body.getReader();const out=new Uint8Array(len);let o=0;for(;;){const {done,value}=await rd.read();if(done)break;out.set(value,o);o+=value.length;prog&&prog(o/len);}return out.buffer;};
  meta=await (await fetch('data/meta.json')).json();N=meta.N;
  post({type:'progress',msg:'Cargando punteros del conectoma…',p:.05});
  const ptr=new Uint32Array(await get('ptr.u32'));
  const postB=await get('post.i32',p=>post({type:'progress',msg:`Cargando ${meta.E.toLocaleString('es-MX')} conexiones… ${Math.round(p*100)}%`,p:.05+.55*p}));
  const wB=await get('w.i16',p=>post({type:'progress',msg:`Cargando pesos sinápticos… ${Math.round(p*100)}%`,p:.6+.3*p}));
  B=new FlyBrain({N,ptr,post:new Int32Array(postB),w:new Int16Array(wB)});
  ctype=new Uint16Array(await get('ctype.u16'));
  glow=new Float32Array(N);lastSpk=new Uint16Array(N);
  post({type:'ready',N,E:meta.E});
  wall0=performance.now();sim0=0;outT0=0;loop();
}
const outKeys=()=>Object.keys(meta.out);
function outRates(dt){const r={};for(const k of outKeys()){const g=meta.out[k];let L=0,R=0;for(const i of g.L)L+=(B.spk[i]-lastSpk[i])&0xffff;for(const i of g.R)R+=(B.spk[i]-lastSpk[i])&0xffff;
  r[k]={L:L*1000/dt,R:R*1000/dt};}
  for(const [k,list] of watch){let c=0;for(const i of list)c+=(B.spk[i]-lastSpk[i])&0xffff;r['w:'+k]={L:c*1000/dt/Math.max(1,list.length),R:0};}
  return r;}
function loop(){
  if(!running){setTimeout(loop,30);return;}
  const tStart=performance.now();
  // corre hasta ~25 ms de reloj o hasta alcanzar el tiempo real × cap
  while(performance.now()-tStart<25){
    const simAllowed=(performance.now()-wall0)*cap;
    if(B.tms-sim0>=simAllowed&&cap<50)break;
    B.run(10); // 1 ms
  }
  const now=performance.now();
  if(now-lastPost>=33){
    const dtSim=B.tms-outT0;
    if(dtSim>0){
      const act=new Uint8Array(N);let nAct=0;
      for(let i=0;i<N;i++){const d=(B.spk[i]-lastSpk[i])&0xffff;if(d>0){glow[i]=Math.min(1,glow[i]+.35+.15*d);}else glow[i]*=.82;if(glow[i]>.02){act[i]=glow[i]*255;nAct++;}}
      const rates=outRates(dtSim);
      lastSpk.set(B.spk);outT0=B.tms;
      const speed=dtSim/(now-lastPost);
      post({type:'tick',t:B.tms,speed,rates,nAct,total:B.totalSpikes,act},[act.buffer]);
    }
    lastPost=now;
  }
  setTimeout(loop,0);
}
onmessage=e=>{const m=e.data;
  if(m.type==='load')load().catch(err=>post({type:'error',msg:String(err&&err.message||err)}));
  else if(!B)return;
  else if(m.type==='group')B.setGroup(m.key,m.list,m.rate);
  else if(m.type==='silence'){B.silence(m.list,m.on);}
  else if(m.type==='watch'){if(m.key==='*clear*'){for(const k of [...watch.keys()])if(!m.prefix||k.startsWith(m.prefix))watch.delete(k);return;}if(m.list&&m.list.length)watch.set(m.key,Int32Array.from(m.list));else watch.delete(m.key);}
  else if(m.type==='reset'){B.reset();B.clearGroups();glow.fill(0);lastSpk.fill(0);outT0=B.tms;wall0=performance.now();sim0=B.tms;}
  else if(m.type==='seed'){if(m.seed==null){Math.random=rnd0;}else{let a=m.seed>>>0;Math.random=function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}}
  else if(m.type==='conn'){const agg=new Map(),ptr=B.ptr,po=B.post,w=B.w,T=m.ix;let tot=0;
    if(m.dir==='out'){for(let i=0;i<N;i++){if(ctype[i]!==T)continue;for(let j=ptr[i];j<ptr[i+1];j++){const t=ctype[po[j]];const a=agg.get(t)||[0,0];a[0]+=Math.abs(w[j]);a[1]+=w[j];agg.set(t,a);tot+=Math.abs(w[j]);}}}
    else{for(let i=0;i<N;i++){const ti=ctype[i];for(let j=ptr[i];j<ptr[i+1];j++){if(ctype[po[j]]!==T)continue;const a=agg.get(ti)||[0,0];a[0]+=Math.abs(w[j]);a[1]+=w[j];agg.set(ti,a);tot+=Math.abs(w[j]);}}}
    const rows=[...agg.entries()].sort((a,b)=>b[1][0]-a[1][0]).slice(0,m.n||12).map(([t,a])=>[meta.types[t]||'(sin tipo)',a[0],a[1]>=0?1:-1]);
    post({type:'res',id:m.id,data:{rows,tot,partners:agg.size}});}
  else if(m.type==='cap'){cap=m.cap;wall0=performance.now();sim0=B.tms;}
  else if(m.type==='pause'){running=!m.on;if(running){wall0=performance.now();sim0=B.tms;}}
};
