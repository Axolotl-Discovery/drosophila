/* ============ Drosophila · escritorio · v4 ============ */
let FF='',C={};
let theme='auto';try{theme=localStorage.getItem('drosophila-theme')||'auto';}catch(e){}
const isDark=()=>theme==='dark'||(theme==='auto'&&matchMedia('(prefers-color-scheme: dark)').matches);
const icon=(n,cls)=>`<svg class="i ${cls||''}"><use href="#i-${n}"/></svg>`;
function readColors(){const s=getComputedStyle(document.documentElement);
  for(const k of['t1','t2','t3','border','border-strong','accent','accent2','ok','err','s1','s2','s3','l-red','l-amber','l-green','l-blue'])C[k]=s.getPropertyValue('--'+k).trim();
  FF=getComputedStyle(document.body).fontFamily;C.dark=isDark();}
function applyTheme(){document.documentElement.dataset.theme=isDark()?'dark':'light';readColors();
  document.querySelector('#themeBtn use').setAttribute('href',isDark()?'#i-sun':'#i-moon');
  if(window.ARENA_OK)ARENA.setDark(C.dark);if(window.CLOUD)CLOUD.theme();}
document.getElementById('themeBtn').onclick=()=>{theme=isDark()?'light':'dark';try{localStorage.setItem('drosophila-theme',theme);}catch(e){}applyTheme();};
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',applyTheme);
readColors();applyTheme();
const fmt=(n,d=0)=>Number(n).toLocaleString('es-MX',{minimumFractionDigits:d,maximumFractionDigits:d});
const log=(...a)=>{if(typeof CONSOLE!=='undefined')CONSOLE.event(...a);};
const tel=(k,d)=>{if(typeof COMP!=='undefined')COMP.tel(k,d||{});};

/* ============ datos y worker ============ */
let META=null,N=0,simT=0,speed=0,rates=null,nAct=0,total=0,paused=false;
const worker=new Worker('worker.js');
const sendGroup=(key,list,rate)=>worker.postMessage({type:'group',key,list,rate});
const sent={};
function setRate(key,list,rate){rate=Math.round(rate);const prev=sent[key]||0;if(Math.abs(prev-rate)<3&&!(rate===0&&prev!==0))return;sent[key]=rate;sendGroup(key,list,rate);}
const pendingReq=new Map();let reqId=1;
function workerReq(msg){return new Promise(res=>{const id=reqId++;pendingReq.set(id,res);worker.postMessage(Object.assign({id},msg));});}
worker.onmessage=e=>{const m=e.data;
  if(m.type==='progress'){document.getElementById('ldBar').style.width=(m.p*100)+'%';document.getElementById('ldMsg').textContent=m.msg;}
  else if(m.type==='error'){document.getElementById('ldMsg').textContent='Error: '+m.msg;}
  else if(m.type==='ready'){onReady(m);}
  else if(m.type==='tick'){onTick(m);}
  else if(m.type==='res'){const f=pendingReq.get(m.id);if(f){pendingReq.delete(m.id);f(m.data);}}
};
fetch('data/meta.json').then(r=>r.json()).then(m=>{META=m;N=m.N;worker.postMessage({type:'load'});initCloud();});

/* ============ estímulos ============ */
const ST={
  azucar:{ic:'candy',n:'Azúcar',col:'#E8A13A',kind:'contact',g:'azucar',max:100,desc:'Activa 32 gustativas de azúcar'},
  agua:{ic:'droplet',n:'Agua',col:'#3A8FD8',kind:'contact',g:'agua',max:100,desc:'Activa 30 gustativas de agua'},
  amargo:{ic:'leaf',n:'Amargo',col:'#6B8A2A',kind:'contact',g:'amargo',max:100,desc:'Activa 42 gustativas de amargo'},
  sonido:{ic:'volume-2',n:'Sonido',col:'#7C5CD6',kind:'dist',g:'sonido',max:140,L:3.5,desc:'Vibración en las antenas'},
  luz:{ic:'lightbulb',n:'Luz',col:'#E8B400',kind:'dist',g:'luz',max:60,L:6,desc:'Fotorreceptores · sin efecto en el modelo'},
  vinagre:{ic:'wine',n:'Vinagre',col:'#2F855A',kind:'dist',g:'vinagre',max:60,L:3.5,desc:'Olor · puede saturar el modelo'},
  co2:{ic:'wind',n:'CO₂',col:'#6B8299',kind:'dist',g:'co2',max:40,L:2.8,desc:'Olor · puede saturar el modelo'},
};
const ACT={sombra:{ic:'cloud-moon',n:'Sombra',col:'#3A3A44',desc:'Una sombra se acerca'},antena:{ic:'hand',n:'Antenas',col:'#B07A3C',desc:'Toca las antenas'}};
let placed=[],pid=1,tool=null,selId=null;
let loom=null,antT=-1;

/* ============ mosca ============ */
const fly={x:-2.5,z:0,h:0,y:0,phase:0,per:0,groom:0,air:null,refr:0};
let behavior='rest',behSince=0;
const fwd=h=>[Math.cos(h),-Math.sin(h)],rightV=h=>[Math.sin(h),Math.cos(h)];
function relTo(sx,sz){const hx=fly.x+Math.cos(fly.h)*.55,hz=fly.z-Math.sin(fly.h)*.55;const dx=sx-hx,dz=sz-hz,d=Math.hypot(dx,dz);const f=fwd(fly.h),r=rightV(fly.h);return {d,rel:Math.atan2(dx*r[0]+dz*r[1],dx*f[0]+dz*f[1])};}
const fall=(d,L)=>1/(1+(d/L)*(d/L));
const optoOn={};
let contactType=null;
function updateInputs(){
  if(!META)return;
  const want={};const add=(key,list,rate)=>{want[key]={list,rate:Math.max((want[key]||{}).rate||0,rate)};};
  contactType=null;
  if(!fly.air)for(const s of placed){const S=ST[s.type];const {d,rel}=relTo(s.x,s.z);const g=META.stim[S.g];
    if(S.kind==='contact'){if(d<.62){contactType=s.type;add('stim:'+S.g+':L',g.L,S.max*s.int);add('stim:'+S.g+':R',g.R,S.max*s.int);}}
    else{const wR=.5+.45*Math.sin(rel),f=fall(d,S.L)*s.int*S.max;add('stim:'+S.g+':L',g.L,f*Math.min(1,2*(1-wR)));add('stim:'+S.g+':R',g.R,f*Math.min(1,2*wR));}}
  if(loom){const k=Math.min(1,(simT-loom.t0)/900);const r=30+170*k*k;const g=META.stim.sombra;add('stim:sombra:L',g.L,r*(loom.side<0?1:.25));add('stim:sombra:R',g.R,r*(loom.side>0?1:.25));if(simT-loom.t0>950)loom=null;}
  if(antT>0&&simT<antT){const g=META.stim.antena;add('stim:antena:L',g.L,140);add('stim:antena:R',g.R,140);}
  for(const k in optoOn){const o=optoOn[k];if(o.hold||simT<o.until)add('opto:'+k,o.list,150);else delete optoOn[k];}
  if(typeof LAB!=='undefined')LAB.inputs(add);
  for(const k of new Set([...Object.keys(sent),...Object.keys(want)])){const w=want[k];if(w)setRate(k,w.list,w.rate);else if(sent[k])setRate(k,[],0);}
}
const BEH={
  escape:{ic:'rocket',n:'Escapa',why:'La fibra gigante (DNp01) disparó y activó el músculo del salto.',col:'#E5484D'},
  fly:{ic:'feather',n:'Vuela',why:'Tras el salto la mosca vuela unos segundos. El vuelo es animación; el disparo de la fibra gigante sí viene del modelo.',col:'#E5484D'},
  groom:{ic:'sparkles',n:'Se acicala',why:'Las descendentes de acicalamiento antenal (DNg11, aDN) están activas.',col:'#B07A3C'},
  per:{ic:'utensils',n:'Extiende la probóscide',why:'La motoneurona MN9 dispara y extiende la probóscide.',col:'#E8A13A'},
  back:{ic:'undo-2',n:'Camina hacia atrás',why:'MDN (moonwalker) está activa.',col:'#7C5CD6'},
  walk:{ic:'footprints',n:'Camina',why:'DNa02, DNa01 o P9 están activas; la diferencia entre lados la hace girar.',col:'#0E7C74'},
  rest:{ic:'moon-star',n:'En reposo',why:'Ninguna neurona de salida supera su umbral.',col:'#8C889B'},
};
const TH={GF:30,DNg11:15,MN9:20,MDN:40,WALK:20};
const mx=k=>rates&&rates[k]?Math.max(rates[k].L,rates[k].R):0;
const sum=k=>rates&&rates[k]?rates[k].L+rates[k].R:0;
function decide(){
  if(!rates)return 'rest';
  if(mx('GF')>TH.GF)return 'escape';
  if(mx('DNg11')>TH.DNg11)return 'groom';
  if(mx('MN9')>TH.MN9)return 'per';
  if(mx('MDN')>TH.MDN)return 'back';
  const wL=rates.DNa02.L+rates.DNa01.L+rates.P9.L,wR=rates.DNa02.R+rates.DNa01.R+rates.P9.R;
  if(wL+wR>TH.WALK)return 'walk';
  return 'rest';
}
function updateFly(dt){
  let b=decide();
  if(b==='escape'&&!fly.air&&fly.refr<=0){const ang=Math.random()*Math.PI*2,rr=2+Math.random()*(ARENA.R-4);fly.air={t:0,T:2.6,x0:fly.x,z0:fly.z,x1:Math.cos(ang)*rr,z1:Math.sin(ang)*rr};}
  if(fly.air){const A=fly.air;A.t+=dt;const u=Math.min(1,A.t/A.T),e=u*u*(3-2*u);fly.x=A.x0+(A.x1-A.x0)*e;fly.z=A.z0+(A.z1-A.z0)*e;
    if(u>.05)fly.h=Math.atan2(-(A.z1-A.z0),A.x1-A.x0);fly.y=Math.sin(Math.min(1,u*1.1)*Math.PI)*2.6;if(A.t>A.T){fly.air=null;fly.y=0;fly.refr=.5;}
    b=A.t<A.T*.12?'escape':'fly';}
  fly.refr-=dt;
  if(b!==behavior){const prev=behavior;behavior=b;behSince=simT;if(!(prev==='escape'&&b==='fly')){log('beh',`${BEH[prev].n} → ${BEH[b].n}`,BEH[b].col);tel('beh',{b:BEH[b].n});}}
  if(b==='walk'||b==='back'){const wL=rates.DNa02.L+rates.DNa01.L+rates.P9.L,wR=rates.DNa02.R+rates.DNa01.R+rates.P9.R;
    const v=b==='back'?-.9:Math.min(2,.4+(wL+wR)/120);const turn=b==='back'?0:(wR-wL)/(wL+wR+30);
    fly.h-=turn*3*dt;fly.x+=Math.cos(fly.h)*v*dt;fly.z-=Math.sin(fly.h)*v*dt;fly.phase+=dt*(Math.abs(v)*4.5+2)*Math.sign(v);
    const r2=Math.hypot(fly.x,fly.z);if(r2>ARENA.R-.7){fly.x*=(ARENA.R-.7)/r2;fly.z*=(ARENA.R-.7)/r2;fly.h+=Math.PI*dt;}}
  const ease=(v,t,k)=>v+(t-v)*Math.min(1,dt*k);
  fly.per=ease(fly.per,b==='per'?1:0,8);fly.groom=ease(fly.groom,b==='groom'?1:0,8);
}

/* ============ píldora de conducta ============ */
function chain(){
  const lbl=typeof LAB!=='undefined'?LAB.sourceShort():null;
  const sens=k=>Math.max(sent['stim:'+k+':L']||0,sent['stim:'+k+':R']||0);
  const b=behavior;
  const src=lbl||(b==='escape'||b==='fly'?(sens('sonido')>0&&!loom?'Sonido':'Sombra'):b==='groom'?'Antenas':b==='per'?(contactType==='azucar'?'Azúcar':'Entrada'):null);
  const key={escape:'GF',fly:'GF',groom:'DNg11',per:'MN9',back:'MDN',walk:null}[b];
  if(b==='rest')return [];
  const c=[];if(src)c.push({t:src,on:true});
  if(b==='walk'){const wL=rates.DNa02.L+rates.DNa01.L+rates.P9.L,wR=rates.DNa02.R+rates.DNa01.R+rates.P9.R;c.push({t:'DNa02',on:true});c.push({t:wR>wL*1.3?'gira →':wL>wR*1.3?'← gira':'recto',on:true});}
  else{const kn=key==='GF'?'GF':key==='MN9'?'MN9':key;if(key&&!(src&&src.split(/[ ·]/)[0]===kn)&&!(src==='Fibra gigante'&&key==='GF'))c.push({t:kn,on:mx(key)>5});c.push({t:{escape:'salto',fly:'vuelo',groom:'patas',per:'probóscide',back:'patas'}[b],on:true});}
  return c;
}
let lastPillSig='';
function renderPill(){
  const B=BEH[behavior];const c=chain();const pill=document.getElementById('pill');
  const sig=behavior+'|'+c.map(s=>s.t+s.on).join(',');if(sig===lastPillSig)return;lastPillSig=sig;
  pill.classList.toggle('rest',behavior==='rest');
  document.getElementById('bIcon').innerHTML=behavior==='rest'?'':icon(B.ic);
  const bn=document.getElementById('bName');bn.textContent=B.n;bn.parentElement.style.color=behavior==='rest'?'':B.col;
  document.getElementById('chain').innerHTML=c.map((s,k)=>(k?`<span class="ar">${icon('chevron-right','sm')}</span>`:'')+`<span class="st${s.on?' on':''}" style="--c:${B.col}">${s.t}</span>`).join('');
  const w=document.getElementById('why');w.textContent=B.why;
}
document.getElementById('pill').onclick=()=>{const w=document.getElementById('why');w.hidden=!w.hidden;};

/* ============ arena y dock ============ */
const dock=document.getElementById('dock');
function buildDock(){
  let h='';for(const k in ST)h+=`<button class="dk" data-t="${k}" style="--c:${ST[k].col}" aria-pressed="false" data-tip="${ST[k].desc}">${icon(ST[k].ic)}<span>${ST[k].n}</span><i class="badge2"></i></button>`;
  h+='<span class="dsep"></span>';for(const k in ACT)h+=`<button class="dk" data-a="${k}" style="--c:${ACT[k].col}" data-tip="${ACT[k].desc}">${icon(ACT[k].ic)}<span>${ACT[k].n}</span></button>`;
  h+=`<span class="dsep"></span><button class="dk" data-x="clear" style="--c:transparent" data-tip="Quitar todo">${icon('eraser')}<span>Vaciar</span></button>`;
  dock.innerHTML=h;
  dock.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>setTool(tool===b.dataset.t?null:b.dataset.t));
  dock.querySelector('[data-a="sombra"]').onclick=()=>{doLoom();tel('stim',{type:'Sombra'});};
  dock.querySelector('[data-a="antena"]').onclick=()=>{doAntenna();tel('stim',{type:'Antenas'});};
  dock.querySelector('[data-x="clear"]').onclick=()=>clearArena();
}
function doLoom(side){loom={t0:simT,side:side||(Math.random()<.5?-1:1)};log('stim','Sombra sobre la mosca','#8C889B');}
function doAntenna(ms){antT=simT+(ms||1500);log('stim','Antenas tocadas','#B07A3C');}
function setTool(t){tool=t;ARENA.setTool(t);if(t)select(null);dock.querySelectorAll('[data-t]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.t===t));
  const h=document.getElementById('hint');h.textContent='Clic para colocar · Esc para salir';h.style.opacity=t?1:0;}
function updateBadges(){dock.querySelectorAll('[data-t]').forEach(b=>{const n=placed.filter(s=>s.type===b.dataset.t).length;const bd=b.querySelector('.badge2');bd.textContent=n;bd.classList.toggle('on',n>0);});}
function placeStim(type,x,z,int,quiet){const s={id:pid++,type,x,z,int:int??.7};placed.push(s);ARENA.addStim(s);updateBadges();if(!quiet){log('stim',`${ST[type].n} colocado`,ST[type].col);tel('stim',{type:ST[type].n});}return s;}
function removeStim(id){const s=placed.find(x=>x.id===id);placed=placed.filter(s=>s.id!==id);ARENA.removeStim(id);if(selId===id)select(null);updateBadges();if(s){log('stim',`${ST[s.type].n} quitado`,'#8C889B');tel('stim',{type:ST[s.type].n,on:false});}}
function clearArena(){for(const s of placed.slice()){placed=placed.filter(x=>x!==s);ARENA.removeStim(s.id);}select(null);updateBadges();}
function select(id){selId=id;ARENA.select(id);const p=document.getElementById('pop');const s=placed.find(x=>x.id===id);p.hidden=!s;
  if(s){const S=ST[s.type];document.getElementById('popT').innerHTML=`<span style="color:${S.col}">${icon(S.ic)}</span>${S.n}`;const r=document.getElementById('popInt');r.value=Math.round(s.int*100);paintRange(r);document.getElementById('popO').textContent=Math.round(s.int*100)+'%';}}
function paintRange(r){r.style.setProperty('--v',((r.value-r.min)/(r.max-r.min)*100)+'%');}
document.addEventListener('input',e=>{if(e.target.type==='range')paintRange(e.target);});
document.getElementById('popInt').oninput=e=>{const s=placed.find(x=>x.id===selId);if(!s)return;s.int=+e.target.value/100;document.getElementById('popO').textContent=e.target.value+'%';ARENA.syncStim(s);};
document.getElementById('popDel').onclick=()=>{if(selId!=null)removeStim(selId);};
document.getElementById('arenaCv').addEventListener('contextmenu',e=>{if(tool){e.preventDefault();setTool(null);}});
document.getElementById('camFollow').onclick=e=>{const on=e.currentTarget.getAttribute('aria-pressed')!=='true';e.currentTarget.setAttribute('aria-pressed',on);ARENA.setFollow(on);};
document.getElementById('camReset').onclick=()=>{ARENA.resetView();document.getElementById('camFollow').setAttribute('aria-pressed','false');};
/* tooltips */
const tip=document.getElementById('tip');
document.addEventListener('mouseover',e=>{const t=e.target.closest('[data-tip]');if(!t){tip.style.opacity=0;return;}tip.textContent=t.dataset.tip;const r=t.getBoundingClientRect();
  tip.style.left=Math.max(8,Math.min(innerWidth-tip.offsetWidth-8,r.left+r.width/2-tip.offsetWidth/2))+'px';tip.style.top=(r.top-tip.offsetHeight-8)+'px';tip.style.opacity=1;});

/* ============ cerebro (PiP) ============ */
const CLASSCOL={optic:'#3E7BFA',central:'#8A6A4F',sensory:'#2FB062',visual_projection:'#7C5CD6',ascending:'#0E7C74',descending:'#E8A13A',sensory_ascending:'#0E7C74',visual_centrifugal:'#7C5CD6',motor:'#E5484D',endocrine:'#B07A3C',unknown:'#888888'};
let cloudView='act';
async function initCloud(){
  const cv=document.getElementById('cloudCv');
  const [pb,scb]=await Promise.all([fetch('data/pos.f32').then(r=>r.arrayBuffer()),fetch('data/sclass.u8').then(r=>r.arrayBuffer())]);
  const pos=new Float32Array(pb),scl=new Uint8Array(scb);
  const r=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true});r.setPixelRatio(Math.min(2,devicePixelRatio));
  const scene=new THREE.Scene(),cam=new THREE.PerspectiveCamera(35,1,1,8000);cam.position.set(0,-60,1150);
  const ctl=new THREE.OrbitControls(cam,cv);ctl.enableDamping=true;ctl.autoRotate=true;ctl.autoRotateSpeed=.35;
  const P=new Float32Array(N*3);for(let i=0;i<N;i++){P[3*i]=pos[3*i];P[3*i+1]=-pos[3*i+1];P[3*i+2]=-pos[3*i+2];}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(P,3));
  const col=new Float32Array(N*3);geo.setAttribute('color',new THREE.BufferAttribute(col,3));
  const mat=new THREE.PointsMaterial({size:1.5,sizeAttenuation:false,vertexColors:true,transparent:true,opacity:.35,depthWrite:false});
  scene.add(new THREE.Points(geo,mat));
  const layer=(n,size)=>{const p=new Float32Array(n*3),c=new Float32Array(n*3),g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));g.setAttribute('color',new THREE.BufferAttribute(c,3));g.setDrawRange(0,0);
    const m=new THREE.PointsMaterial({size,sizeAttenuation:false,vertexColors:true,transparent:true,opacity:1,depthWrite:false});const o=new THREE.Points(g,m);o.frustumCulled=false;scene.add(o);return {p,c,g,m,n};};
  const mark=layer(20000,6),hot=layer(8000,4);mark.m.opacity=.5;
  const base=new Float32Array(N*3),clsC=new Float32Array(N*3);
  const rgb=h=>{h=h.replace('#','');return[parseInt(h.slice(0,2),16)/255,parseInt(h.slice(2,4),16)/255,parseInt(h.slice(4,6),16)/255];};
  let H1,H2,lastAct=null,lastView=null;
  function theme(){const rest=rgb(C.dark?'#4A4759':'#B9B4C4');for(let i=0;i<N;i++){const cc=rgb(CLASSCOL[META.sclass[scl[i]]]||'#888888');for(let k=0;k<3;k++){base[3*i+k]=rest[k];clsC[3*i+k]=cc[k];}}
    mat.opacity=C.dark?.55:.35;H1=rgb('#F0739E');H2=rgb(C.dark?'#FFE3EC':'#B83A68');hot.m.blending=C.dark?THREE.AdditiveBlending:THREE.NormalBlending;lastView=null;paint(lastAct);}
  function paint(act){if(cloudView!==lastView){col.set(cloudView==='cls'?clsC:base);geo.attributes.color.needsUpdate=true;lastView=cloudView;}
    let n=0;if(act&&cloudView==='act')for(let i=0;i<N&&n<hot.n;i++){const a=act[i];if(a){const t=Math.min(1,a/255*1.3);for(let k=0;k<3;k++){hot.p[3*n+k]=P[3*i+k];hot.c[3*n+k]=H1[k]+(H2[k]-H1[k])*t;}n++;}}
    hot.g.setDrawRange(0,n);hot.g.attributes.position.needsUpdate=true;hot.g.attributes.color.needsUpdate=true;}
  function setMarks(groups){let n=0;for(const {list,color} of groups){const c=rgb(color);for(const i of list){if(n>=mark.n)break;for(let k=0;k<3;k++){mark.p[3*n+k]=P[3*i+k];mark.c[3*n+k]=c[k];}n++;}}
    mark.g.setDrawRange(0,n);mark.g.attributes.position.needsUpdate=true;mark.g.attributes.color.needsUpdate=true;}
  function resize(){const b=cv.getBoundingClientRect();if(!b.width)return;r.setSize(b.width,b.height,false);cam.aspect=b.width/b.height;cam.updateProjectionMatrix();}
  window.addEventListener('resize',resize);resize();
  cv.addEventListener('pointerdown',()=>ctl.autoRotate=false);
  (function loop(){if(document.getElementById('pip').offsetParent){ctl.update();r.render(scene,cam);}requestAnimationFrame(loop);})();
  window.CLOUD={paint:a=>{lastAct=a;paint(a);},theme,resize,setMarks};theme();
}
document.getElementById('cloudView').onclick=e=>{cloudView=cloudView==='act'?'cls':'act';e.currentTarget.setAttribute('aria-pressed',cloudView==='cls');e.currentTarget.dataset.tip=cloudView==='cls'?'Ver actividad':'Colorear por clase';if(window.CLOUD)CLOUD.paint(null);};
document.getElementById('cloudView').dataset.tip='Colorear por clase';
document.getElementById('pipToggle').onclick=e=>{const p=document.getElementById('pip');p.hidden=!p.hidden;e.currentTarget.setAttribute('aria-pressed',!p.hidden);if(!p.hidden&&window.CLOUD)setTimeout(CLOUD.resize,30);};
document.getElementById('pipBig').onclick=e=>{const p=document.getElementById('pip');p.classList.toggle('big');e.currentTarget.querySelector('use').setAttribute('href',p.classList.contains('big')?'#i-minimize-2':'#i-maximize-2');setTimeout(()=>window.CLOUD&&CLOUD.resize(),280);};
if(innerWidth<=1366||innerHeight<=780){document.getElementById('pip').hidden=true;document.getElementById('pipToggle').setAttribute('aria-pressed','false');}

/* ============ navegación, menú, simulación ============ */
function setPanel(p){document.querySelectorAll('#nav button').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.p===p)));
  document.getElementById('learnBody').hidden=p!=='learn';document.getElementById('labWrap').hidden=p!=='lab';document.getElementById('lightbar').hidden=p!=='lab';
  document.getElementById('stats').style.visibility=p==='learn'?'visible':'hidden';}
document.querySelectorAll('#nav button').forEach(b=>b.onclick=()=>setPanel(b.dataset.p));
function resetWorld(){clearArena();for(const k in optoOn)delete optoOn[k];loom=null;antT=-1;fly.air=null;fly.y=0;fly.x=-2.5;fly.z=0;fly.h=0;fly.per=0;fly.groom=0;setTool(null);
  worker.postMessage({type:'reset'});for(const k in sent)delete sent[k];}
function setPaused(v){paused=v;worker.postMessage({type:'pause',on:paused});document.querySelector('#pauseBtn use').setAttribute('href',paused?'#i-play':'#i-pause');log('sys',paused?'Pausado':'Reanudado','#8C889B');}
document.getElementById('pauseBtn').onclick=()=>setPaused(!paused);
const doReset=()=>{worker.postMessage({type:'reset'});for(const k in sent)delete sent[k];loom=null;antT=-1;log('sys','Actividad a cero','#8C889B');};
document.getElementById('resetBtn').onclick=doReset;document.getElementById('bannerReset').onclick=doReset;
document.querySelectorAll('#capSeg button').forEach(b=>b.onclick=()=>{document.querySelectorAll('#capSeg button').forEach(x=>x.setAttribute('aria-selected',x===b));worker.postMessage({type:'cap',cap:+b.dataset.cap});});
function setCap(v){const b=document.querySelector(`#capSeg button[data-cap="${v}"]`);if(b)b.click();}
const popToggle=(id,anchor)=>{const p=document.getElementById(id);const open=p.hidden;document.querySelectorAll('.popover,.menu').forEach(x=>x.hidden=true);p.hidden=!open;
  if(open&&anchor){const r=anchor.getBoundingClientRect();p.style.left=Math.min(innerWidth-p.offsetWidth-12,r.left)+'px';}};
document.getElementById('simBtn').onclick=e=>{e.stopPropagation();popToggle('simPop',e.currentTarget);};
document.getElementById('menuBtn').onclick=e=>{e.stopPropagation();popToggle('menu');};
document.addEventListener('click',e=>{if(!e.target.closest('.popover,.menu,#simBtn,#menuBtn'))document.querySelectorAll('.popover,.menu').forEach(x=>x.hidden=true);});
document.getElementById('mAbout').onclick=()=>{document.getElementById('about').hidden=false;document.getElementById('menu').hidden=true;};
document.getElementById('aboutOk').onclick=()=>document.getElementById('about').hidden=true;
document.getElementById('mKeys').onclick=()=>{document.getElementById('menu').hidden=true;openDrawer('con');CONSOLE.run('atajos');};
document.getElementById('mReset').onclick=()=>{document.getElementById('menu').hidden=true;LEARN.resetProgress();};

/* ============ cajón inferior ============ */
const drawer=document.getElementById('drawer');let dtab='con';
function openDrawer(t){dtab=t||dtab;drawer.classList.add('open');document.querySelectorAll('.dtab').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.d===dtab)));
  document.querySelectorAll('.dpane').forEach(p=>p.hidden=p.dataset.d!==dtab);document.querySelector('#drawerToggle use').setAttribute('href','#i-chevron-down');
  setTimeout(()=>{resizeAll();if(dtab==='con')document.getElementById('conIn').focus();},240);}
function closeDrawer(){drawer.classList.remove('open');document.querySelectorAll('.dtab').forEach(b=>b.setAttribute('aria-selected','false'));setTimeout(resizeAll,240);}
const drawerOpen=()=>drawer.classList.contains('open');
document.querySelectorAll('.dtab').forEach(b=>b.onclick=()=>{if(drawerOpen()&&dtab===b.dataset.d)closeDrawer();else openDrawer(b.dataset.d);});
document.getElementById('drawerToggle').onclick=()=>drawerOpen()?closeDrawer():openDrawer();
document.getElementById('conBtn').onclick=()=>{if(drawerOpen()&&dtab==='con')closeDrawer();else openDrawer('con');};
(()=>{let y0=null,h0=0;const g=document.getElementById('dgrip');const db=document.getElementById('dbody');
  g.addEventListener('pointerdown',e=>{y0=e.clientY;h0=db.getBoundingClientRect().height;g.setPointerCapture(e.pointerId);db.style.transition='none';});
  g.addEventListener('pointermove',e=>{if(y0==null)return;const h=Math.max(140,Math.min(innerHeight*.6,h0-(e.clientY-y0)));drawer.style.setProperty('--dh',h+'px');});
  g.addEventListener('pointerup',()=>{y0=null;db.style.transition='';resizeAll();});})();
window.addEventListener('keydown',e=>{
  const typing=e.target.tagName==='TEXTAREA'||(e.target.tagName==='INPUT'&&e.target.type!=='range');
  if(e.key==='`'||e.key==='F2'||(e.ctrlKey&&e.key==='`')){e.preventDefault();if(drawerOpen()&&dtab==='con')closeDrawer();else openDrawer('con');return;}
  if(typing)return;
  if(e.key===' '){e.preventDefault();setPaused(!paused);}
  if(e.key==='Escape'){setTool(null);select(null);document.getElementById('why').hidden=true;}
  if((e.key==='Delete'||e.key==='Backspace')&&selId!=null)removeStim(selId);});

/* ============ gráficas ============ */
const tc=document.getElementById('traceCv'),tctx=tc.getContext('2d');
const TR=[['GF','GF','#E5484D'],['MDN','MDN','#7C5CD6'],['WALKL','DNa02 izq','#0E7C74'],['WALKR','DNa02 der','#3CC8B4'],['DNg11','DNg11','#B07A3C'],['MN9','MN9','#E8A13A']];
const hist=[];const HS=4000;
function pushHist(){if(!rates)return;hist.push({t:simT,GF:mx('GF'),MDN:mx('MDN'),WALKL:rates.DNa02.L+rates.DNa01.L,WALKR:rates.DNa02.R+rates.DNa01.R,DNg11:mx('DNg11'),MN9:mx('MN9')});while(hist.length&&hist[0].t<simT-HS)hist.shift();}
let dpr=1;function fit(c){const r=c.getBoundingClientRect();c.width=Math.max(1,r.width*dpr);c.height=Math.max(1,r.height*dpr);return r;}
function resizeAll(){dpr=devicePixelRatio||1;fit(tc);fit(document.getElementById('ethoCv'));ARENA.resize();if(window.CLOUD)CLOUD.resize();}
window.addEventListener('resize',resizeAll);
function drawTraces(){const w=tc.width/dpr,h=tc.height/dpr;tctx.setTransform(dpr,0,0,dpr,0,0);tctx.clearRect(0,0,w,h);
  const L0=40,R0=w-110,T=8,B=h-10;let top=50;for(const s of hist)for(const [k] of TR)top=Math.max(top,s[k]);top=Math.ceil(top/50)*50;
  tctx.font='500 12px '+FF;tctx.strokeStyle=C.border;tctx.fillStyle=C.t3;tctx.lineWidth=1;
  for(const v of[0,top/2,top]){const y=B-v/top*(B-T);tctx.beginPath();tctx.moveTo(L0,y);tctx.lineTo(R0,y);tctx.stroke();tctx.textAlign='right';tctx.textBaseline='middle';tctx.fillText(Math.round(v),L0-6,y);}
  tctx.save();tctx.translate(12,(T+B)/2);tctx.rotate(-Math.PI/2);tctx.textAlign='center';tctx.fillText('Hz',0,0);tctx.restore();
  const X=t=>R0-(simT-t)/HS*(R0-L0);
  TR.forEach(([k,n,c],j)=>{tctx.strokeStyle=c;tctx.lineWidth=2;tctx.lineJoin='round';tctx.beginPath();hist.forEach((s,i)=>{const x=X(s.t),y=B-s[k]/top*(B-T);i?tctx.lineTo(x,y):tctx.moveTo(x,y);});tctx.stroke();
    const last=hist.length?hist[hist.length-1][k]:0;tctx.fillStyle=c;tctx.font='600 12px '+FF;tctx.textAlign='left';tctx.textBaseline='middle';const y=T+8+j*((B-T-8)/TR.length);
    tctx.beginPath();tctx.arc(R0+14,y,4,0,7);tctx.fill();tctx.fillStyle=C.t2;tctx.fillText(`${n} ${Math.round(last)}`,R0+24,y);});}
const ec=document.getElementById('ethoCv'),ectx=ec.getContext('2d');const ETH=['escape','fly','groom','per','back','walk','rest'];let etho=[];
function drawEtho(){const w=ec.width/dpr,h=ec.height/dpr;ectx.setTransform(dpr,0,0,dpr,0,0);ectx.clearRect(0,0,w,h);const L0=170,R0=w-10,T=4,B=h-20,rh=(B-T)/ETH.length;
  ectx.font='500 12.5px '+FF;ectx.textBaseline='middle';const span=30000;
  ETH.forEach((b,k)=>{const y=T+k*rh;ectx.fillStyle=C.t2;ectx.textAlign='right';ectx.fillText(BEH[b].n,L0-10,y+rh/2);ectx.fillStyle=C.s3;ectx.fillRect(L0,y+3,R0-L0,rh-6);ectx.fillStyle=BEH[b].col;
    for(let j=0;j<etho.length;j++){const e0=etho[j];if(e0.b!==b)continue;const t1=j<etho.length-1?etho[j+1].t:simT;const x0=R0-(simT-e0.t)/span*(R0-L0),x1=R0-(simT-t1)/span*(R0-L0);if(x1<L0)continue;ectx.fillRect(Math.max(L0,x0),y+3,Math.max(1,x1-Math.max(L0,x0)),rh-6);}});
  ectx.fillStyle=C.t3;ectx.textAlign='left';ectx.textBaseline='top';ectx.fillText('−30 s',L0,B+4);ectx.textAlign='right';ectx.fillText('ahora',R0,B+4);}
const visible=id=>{const e=document.getElementById(id);return e&&e.offsetParent!==null&&e.getBoundingClientRect().height>10;};

/* ============ ciclo ============ */
function onReady(m){const ld=document.getElementById('loading');ld.style.transition='opacity .3s';ld.style.opacity=0;setTimeout(()=>ld.remove(),300);
  LAB.init();LEARN.init();CONSOLE.init();if(typeof COMP!=='undefined')COMP.init();resizeAll();}
function onTick(m){
  const dt=Math.max(0,(m.t-simT)/1000);simT=m.t;speed=m.speed;
  if(!rates||dt<=0||dt>1)rates=JSON.parse(JSON.stringify(m.rates));else{const a=Math.min(1,dt/.12);for(const k in m.rates){if(!rates[k])rates[k]={L:0,R:0};rates[k].L+=(m.rates[k].L-rates[k].L)*a;rates[k].R+=(m.rates[k].R-rates[k].R)*a;}}
  nAct=m.nAct;total=m.total;
  updateFly(Math.min(.2,dt));updateInputs();pushHist();LEARN.tick(Math.min(200,dt*1000));LAB.refresh();CONSOLE.tick(dt*1000);if(typeof COMP!=='undefined')COMP.tick(dt*1000);
  if(!etho.length||etho[etho.length-1].b!==behavior)etho.push({t:simT,b:behavior});while(etho.length>1&&etho[1].t<simT-31000)etho.shift();
  if(window.CLOUD)CLOUD.paint(m.act);
  const sp=speed>=.995?fmt(speed,1)+'×':fmt(speed,2)+'×';
  document.getElementById('sSpeed').textContent=sp;document.getElementById('pSpeed').textContent=sp;
  document.getElementById('sT').textContent=fmt(simT/1000,1)+' s';document.getElementById('pT').textContent=fmt(simT/1000,1)+' s';
  document.getElementById('sAct').textContent=fmt(nAct);document.getElementById('sSpk').textContent=fmt(total);
  const hyper=nAct>5000;const ban=document.getElementById('banner');if(ban.hidden===hyper){ban.hidden=!hyper;if(hyper)log('warn','Hiperactividad: el modelo se saturó','#F5A524');}
  renderPill();
}
function frame(){
  const pose={phase:fly.phase,walk:behavior==='walk'||behavior==='back',groom:fly.groom,per:fly.per,song:0,songSide:1,flap:fly.air&&fly.air.t>fly.air.T*.06?1:0,tuck:fly.air?Math.min(1,fly.air.t*3,(fly.air.T-fly.air.t)*3):0,jump:fly.air?Math.max(0,1-fly.air.t*6):0};
  const lk=loom?Math.min(1,(simT-loom.t0)/900):null;
  ARENA.frame({fly:{x:fly.x,y:fly.y,z:fly.z,heading:fly.h,pitch:-.12*fly.groom+(fly.air?-.1:0),pose},loom:lk,dust:0,stims:placed});
  const s=placed.find(x=>x.id===selId);if(s){const p=ARENA.screenPos(s.x,1.2,s.z),pop=document.getElementById('pop');pop.style.left=p.x+'px';pop.style.top=p.y+'px';}
  if(drawerOpen()){if(dtab==='act')drawTraces();if(dtab==='etho')drawEtho();}
  requestAnimationFrame(frame);
}
ARENA.init(document.getElementById('arenaCv'),{place:(t,x,z)=>placeStim(t,x,z),move:(id,x,z)=>{const s=placed.find(q=>q.id===id);if(s){s.x=x;s.z=z;ARENA.syncStim(s);}},select:id=>select(id)});
window.ARENA_OK=true;ARENA.setDark(C.dark);buildDock();resizeAll();requestAnimationFrame(frame);
