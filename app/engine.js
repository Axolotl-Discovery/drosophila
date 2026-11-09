/* Motor LIF del cerebro completo de Drosophila
   Réplica del modelo de Shiu y col. (Nature, 2024) sobre el conectoma FlyWire v783.
   dv/dt = (v0 - v + g)/t_mbr ; dg/dt = -g/tau ; integración exacta (sistema lineal)
   umbral -45 mV, reinicio -52 mV, refractario 2.2 ms, retardo sináptico 1.8 ms,
   peso 0.275 mV por sinapsis × signo del neurotransmisor, entradas Poisson 0.275×250 mV. */
function gauss(){let u=0,v=0;while(!u)u=Math.random();while(!v)v=Math.random();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}
class FlyBrain{
  constructor(d,opt){
    opt=opt||{};
    this.N=d.N;this.ptr=d.ptr;this.post=d.post;this.w=d.w; // w: conteo con signo (Int16/Float32)
    const P=this.P=Object.assign({dt:0.1,v0:-52,vrst:-52,vth:-45,tm:20,tau:5,trfc:2.2,tdly:1.8,wsyn:0.275,fpoi:250},opt);
    this.em=Math.exp(-P.dt/P.tm);this.eg=Math.exp(-P.dt/P.tau);this.cg=P.tau/(P.tau-P.tm)*(this.eg-this.em);
    const N=this.N;
    this.v=new Float32Array(N).fill(P.v0);this.g=new Float32Array(N);
    this.refUntil=new Int32Array(N).fill(-1);this.rfcSteps=new Int32Array(N).fill(Math.round(P.trfc/P.dt));
    this.silenced=new Uint8Array(N);
    this.dsteps=Math.round(P.tdly/P.dt);
    this.ring=Array.from({length:this.dsteps+1},()=>[]);this.rpos=0;
    this.poi=new Map(); // idx -> rate Hz
    this.grp=new Map(); // clave -> {list:Int32Array, rate}
    this.step_=0;
    this.spk=new Uint16Array(N);      // conteo de espigas desde el último leer
    this.last=new Float32Array(N).fill(-1e9); // tiempo (ms) de la última espiga
    this.totalSpikes=0;
    this._init();
  }
  /* Integración perezosa exacta (v4.3).
     Entre entradas el sistema es lineal, así que una neurona "fría" no necesita integrarse paso a paso:
     se guarda su estado (v, g, paso de la última actualización) y se avanza de golpe con la solución
     analítica cuando le llega una entrada. Solo las neuronas "calientes" (en refractario o que podrían
     alcanzar el umbral) se integran en cada paso. Cota usada: u(t) ≤ max(u0,0) + |g|·τ/(t_m−τ),
     que nunca subestima el voltaje máximo futuro, así que no se pierde ninguna espiga. */
  _init(){const N=this.N,P=this.P;
    this.hot=new Int32Array(N);this.hn=0;this.isHot=new Uint8Array(N);this.ls=new Int32Array(N);
    this.kB=P.tau/Math.abs(P.tm-P.tau);this.NMAX=8192;
    this.emP=new Float64Array(this.NMAX);this.egP=new Float64Array(this.NMAX);this.cgP=new Float64Array(this.NMAX);
    for(let n=0;n<this.NMAX;n++){const t=n*P.dt;this.emP[n]=Math.exp(-t/P.tm);this.egP[n]=Math.exp(-t/P.tau);this.cgP[n]=P.tau/(P.tau-P.tm)*(this.egP[n]-this.emP[n]);}}
  setPoisson(list,rate){for(const i of list){if(rate>0){this.poi.set(i,rate);this.rfcSteps[i]=0;}else{this.poi.delete(i);this.rfcSteps[i]=Math.round(this.P.trfc/this.P.dt);}}}
  setGroup(key,list,rate){const r0=Math.round(this.P.trfc/this.P.dt);const old=this.grp.get(key);
    if(old)for(const i of old.list)this.rfcSteps[i]=r0;
    if(!rate||!list.length){this.grp.delete(key);this._refreshRfc();return;}
    const L=Int32Array.from(list);this.grp.set(key,{list:L,rate});this._refreshRfc();}
  _refreshRfc(){for(const g of this.grp.values())for(const i of g.list)this.rfcSteps[i]=0;for(const i of this.poi.keys())this.rfcSteps[i]=0;}
  clearGroups(){const r0=Math.round(this.P.trfc/this.P.dt);for(const g of this.grp.values())for(const i of g.list)this.rfcSteps[i]=r0;this.grp.clear();}
  clearPoisson(){for(const i of this.poi.keys())this.rfcSteps[i]=Math.round(this.P.trfc/this.P.dt);this.poi.clear();}
  silence(list,on){for(const i of list)this.silenced[i]=on?1:0;}
  reset(){const P=this.P;this.totalSpikes=0;this.v.fill(P.v0);this.g.fill(0);this.refUntil.fill(-1);
    this.isHot.fill(0);this.hn=0;this.ls.fill(this.step_);for(const r of this.ring)r.length=0;this.spk.fill(0);this.last.fill(-1e9);}
  get an(){return this.hn;}
  run(nSteps){
    const P=this.P,v=this.v,g=this.g,em=this.em,eg=this.eg,cg=this.cg,v0=P.v0,vth=P.vth,vrst=P.vrst,du=vth-v0;
    const ptr=this.ptr,post=this.post,w=this.w,wsyn=P.wsyn,sil=this.silenced,ref=this.refUntil;
    const hot=this.hot,isHot=this.isHot,ls=this.ls,emP=this.emP,egP=this.egP,cgP=this.cgP,NMAX=this.NMAX,kB=this.kB;
    const pAmp=P.wsyn*P.fpoi, dtS=P.dt/1000, D=this.dsteps+1;
    let hn=this.hn;
    for(let s=0;s<nSteps;s++){
      const st=this.step_;
      // 1) integrar las calientes + umbral; las que ya no pueden disparar pasan a frías
      const fired=this.ring[(this.rpos+this.dsteps)%D];fired.length=0;
      let k=0,nf=0;const tnow=st*P.dt;
      for(let a=0;a<hn;a++){const i=hot[a];
        if(st>=ref[i]){const gi=g[i];const vi=v0+(v[i]-v0)*em+gi*cg;const g2=gi*eg;v[i]=vi;g[i]=g2;
          if(vi>vth){fired.push(i);this.spk[i]++;this.last[i]=tnow;nf++;hot[k++]=i;continue;}
          const u=vi-v0;if((u>0?u:0)+(g2>0?g2:-g2)*kB<du){isHot[i]=0;ls[i]=st;continue;}}
        hot[k++]=i;}
      hn=k;this.totalSpikes+=nf;
      // 3) entregar espigas emitidas hace dsteps
      const arr=this.ring[this.rpos];
      for(let q=0;q<arr.length;q++){const pre=arr[q];if(sil[pre])continue;
        for(let e=ptr[pre],e1=ptr[pre+1];e<e1;e++){const j=post[e];if(sil[j])continue;
          if(isHot[j]){g[j]+=w[e]*wsyn;continue;}
          let n=st-ls[j];let vj=v[j],gj=g[j];
          if(n>0){if(n<NMAX){vj=v0+(vj-v0)*emP[n]+gj*cgP[n];gj*=egP[n];}else{vj=v0;gj=0;}ls[j]=st;}
          gj+=w[e]*wsyn;v[j]=vj;g[j]=gj;const u=vj-v0;
          if((u>0?u:0)+(gj>0?gj:-gj)*kB>=du){isHot[j]=1;hot[hn++]=j;}}}
      arr.length=0;
      this.rpos=(this.rpos+1)%D;
      // 4) entradas Poisson (suman al voltaje)
      for(const [i,r] of this.poi){if(sil[i])continue;if(Math.random()<r*dtS)hn=this._kick(i,pAmp,st,hn);}
      for(const gq of this.grp.values()){const L=gq.list,n=L.length,lam=n*gq.rate*dtS;let kk;
        if(lam<30){let p=Math.exp(-lam),c=p,u=Math.random();kk=0;while(u>c&&kk<200){kk++;p*=lam/kk;c+=p;}}
        else{kk=Math.max(0,Math.round(lam+Math.sqrt(lam)*gauss()));}
        for(let q=0;q<kk;q++){const i=L[(Math.random()*n)|0];if(sil[i])continue;hn=this._kick(i,pAmp,st,hn);}}
      // 5) reinicio de las que dispararon
      for(let q=0;q<fired.length;q++){const i=fired[q];v[i]=vrst;g[i]=0;ref[i]=st+1+this.rfcSteps[i];}
      this.step_++;
    }
    this.hn=hn;
  }
  _kick(i,amp,st,hn){const v=this.v,g=this.g,v0=this.P.v0;
    if(!this.isHot[i]){const n=st-this.ls[i];if(n>0){if(n<this.NMAX){v[i]=v0+(v[i]-v0)*this.emP[n]+g[i]*this.cgP[n];g[i]*=this.egP[n];}else{v[i]=v0;g[i]=0;}this.ls[i]=st;}}
    v[i]+=amp;
    if(!this.isHot[i]){const u=v[i]-v0,gi=g[i];if((u>0?u:0)+(gi>0?gi:-gi)*this.kB>=this.P.vth-v0){this.isHot[i]=1;this.hot[hn++]=i;}}
    return hn;}
  /* Estado al día de una neurona (para leer voltajes sin romper la integración perezosa). */
  vNow(i){if(this.isHot[i])return this.v[i];const n=this.step_-1-this.ls[i];if(n<=0)return this.v[i];if(n>=this.NMAX)return this.P.v0;
    return this.P.v0+(this.v[i]-this.P.v0)*this.emP[n]+this.g[i]*this.cgP[n];}
  get tms(){return this.step_*this.P.dt;}
}
if(typeof module!=='undefined')module.exports={FlyBrain};
