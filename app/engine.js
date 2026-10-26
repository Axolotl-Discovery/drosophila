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
    this.active=new Uint8Array(N);this.alist=new Int32Array(N);this.an=0;
    this.silenced=new Uint8Array(N);
    this.dsteps=Math.round(P.tdly/P.dt);
    this.ring=Array.from({length:this.dsteps+1},()=>[]);this.rpos=0;
    this.poi=new Map(); // idx -> rate Hz
    this.grp=new Map(); // clave -> {list:Int32Array, rate}
    this.step_=0;
    this.spk=new Uint16Array(N);      // conteo de espigas desde el último leer
    this.last=new Float32Array(N).fill(-1e9); // tiempo (ms) de la última espiga
    this.totalSpikes=0;
  }
  activate(i){if(!this.active[i]){this.active[i]=1;this.alist[this.an++]=i;}}
  setPoisson(list,rate){for(const i of list){if(rate>0){this.poi.set(i,rate);this.rfcSteps[i]=0;}else{this.poi.delete(i);this.rfcSteps[i]=Math.round(this.P.trfc/this.P.dt);}}}
  setGroup(key,list,rate){const r0=Math.round(this.P.trfc/this.P.dt);const old=this.grp.get(key);
    if(old)for(const i of old.list)this.rfcSteps[i]=r0;
    if(!rate||!list.length){this.grp.delete(key);this._refreshRfc();return;}
    const L=Int32Array.from(list);this.grp.set(key,{list:L,rate});this._refreshRfc();}
  _refreshRfc(){for(const g of this.grp.values())for(const i of g.list)this.rfcSteps[i]=0;for(const i of this.poi.keys())this.rfcSteps[i]=0;}
  clearGroups(){const r0=Math.round(this.P.trfc/this.P.dt);for(const g of this.grp.values())for(const i of g.list)this.rfcSteps[i]=r0;this.grp.clear();}
  clearPoisson(){for(const i of this.poi.keys())this.rfcSteps[i]=Math.round(this.P.trfc/this.P.dt);this.poi.clear();}
  silence(list,on){for(const i of list)this.silenced[i]=on?1:0;}
  reset(){const P=this.P;this.totalSpikes=0;this.v.fill(P.v0);this.g.fill(0);this.refUntil.fill(-1);this.active.fill(0);this.an=0;for(const r of this.ring)r.length=0;this.spk.fill(0);this.last.fill(-1e9);}
  run(nSteps){
    const P=this.P,v=this.v,g=this.g,em=this.em,eg=this.eg,cg=this.cg,v0=P.v0,vth=P.vth,vrst=P.vrst;
    const ptr=this.ptr,post=this.post,w=this.w,wsyn=P.wsyn,sil=this.silenced,ref=this.refUntil,act=this.active,alist=this.alist;
    const pAmp=P.wsyn*P.fpoi, dtS=P.dt/1000;
    for(let s=0;s<nSteps;s++){
      const st=this.step_;
      // 1) integración de los activos
      let an=this.an,k=0;
      for(let a=0;a<an;a++){const i=alist[a];
        if(st>=ref[i]){const gi=g[i];v[i]=v0+(v[i]-v0)*em+gi*cg;g[i]=gi*eg;}
        if(Math.abs(v[i]-v0)<1e-5&&Math.abs(g[i])<1e-5&&st>=ref[i]){v[i]=v0;g[i]=0;act[i]=0;}else alist[k++]=i;}
      this.an=k;
      // 2) umbral
      const fired=this.ring[(this.rpos+this.dsteps)%(this.dsteps+1)];fired.length=0;
      for(let a=0;a<this.an;a++){const i=alist[a];
        if(v[i]>vth&&st>=ref[i]){fired.push(i);this.spk[i]++;this.last[i]=st*P.dt;this.totalSpikes++;}}
      // 3) entregar espigas que llegan ahora (emitidas hace dsteps)
      const arr=this.ring[this.rpos];
      for(let q=0;q<arr.length;q++){const pre=arr[q];if(sil[pre])continue;
        for(let e=ptr[pre],e1=ptr[pre+1];e<e1;e++){const j=post[e];if(sil[j])continue;g[j]+=w[e]*wsyn;if(!act[j]){act[j]=1;alist[this.an++]=j;}}}
      arr.length=0;
      this.rpos=(this.rpos+1)%(this.dsteps+1);
      // 4) entradas Poisson (suman al voltaje)
      for(const [i,r] of this.poi){if(sil[i])continue;if(Math.random()<r*dtS){v[i]+=pAmp;if(!act[i]){act[i]=1;alist[this.an++]=i;}}}
      // 4b) grupos Poisson: muestrea cuántos eventos ocurren y a quién
      for(const gq of this.grp.values()){const L=gq.list,n=L.length,lam=n*gq.rate*dtS;let k;
        if(lam<30){let p=Math.exp(-lam),c=p,u=Math.random();k=0;while(u>c&&k<200){k++;p*=lam/k;c+=p;}}
        else{k=Math.max(0,Math.round(lam+Math.sqrt(lam)*gauss()));}
        for(let q=0;q<k;q++){const i=L[(Math.random()*n)|0];if(sil[i])continue;v[i]+=pAmp;if(!act[i]){act[i]=1;alist[this.an++]=i;}}}
      // 5) reinicio de las que dispararon
      for(let q=0;q<fired.length;q++){const i=fired[q];v[i]=vrst;g[i]=0;ref[i]=st+1+this.rfcSteps[i];}
      this.step_++;
    }
  }
  get tms(){return this.step_*this.P.dt;}
}
if(typeof module!=='undefined')module.exports={FlyBrain};
