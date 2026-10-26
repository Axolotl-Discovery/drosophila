/* ============ LABORATORIO DE OPTOGENÉTICA ============
   Catálogo de neuronas reales por tipo + construcciones GAL4>UAS-opsina + luces.
   Activación = trenes de Poisson a 150 Hz × respuesta espectral (método de Shiu y col. 2024).
   Silenciamiento = se anulan las sinapsis de entrada y salida (método de Shiu y col. 2024). */
const LIGHTS=[
  {k:'rojo',n:'Roja',nm:627,c:'#E5484D'},
  {k:'ambar',n:'Ámbar',nm:590,c:'#F5A524'},
  {k:'verde',n:'Verde',nm:530,c:'#30A46C'},
  {k:'azul',n:'Azul',nm:470,c:'#3E63DD'},
];
const OPSINS={
  CsChrimson:{n:'CsChrimson',act:true,d:'Canal de cationes de alga. Se abre con luz roja o ámbar y hace disparar a la neurona.',s:{rojo:1,ambar:.9,verde:.35,azul:.1}},
  ChR2:{n:'ChR2',act:true,d:'Canalrodopsina-2. Se abre con luz azul. La mosca también ve la luz azul.',s:{rojo:0,ambar:.05,verde:.3,azul:1}},
  GtACR1:{n:'GtACR1',act:false,d:'Canal de cloruro. Con luz verde o azul silencia a la neurona.',s:{rojo:.05,ambar:.3,verde:1,azul:.85}},
  GtACR2:{n:'GtACR2',act:false,d:'Canal de cloruro. Con luz azul silencia a la neurona.',s:{rojo:0,ambar:.05,verde:.4,azul:1}},
};
const LAB=(()=>{
  let CAT=null,typeIdx=null,sideArr=null,sclassArr=null,typeMeta=null;
  let constructs=[],cid=1,lights={rojo:false,ambar:false,verde:false,azul:false},intensity=.8,restrict=null;
  const silencedNow=new Set();let lastWatch='';
  const lightAge={};                 // tiempo simulado de encendido por color
  async function init(){
    const [cat,ctb,sb,scb]=await Promise.all([fetch('data/catalog.json').then(r=>r.json()),fetch('data/ctype.u16').then(r=>r.arrayBuffer()),fetch('data/side.u8').then(r=>r.arrayBuffer()),fetch('data/sclass.u8').then(r=>r.arrayBuffer())]);
    CAT=cat;const ct=new Uint16Array(ctb);sideArr=new Uint8Array(sb);sclassArr=new Uint8Array(scb);
    const buckets=new Map();for(let i=0;i<ct.length;i++){const t=ct[i];let b=buckets.get(t);if(!b){b=[];buckets.set(t,b);}b.push(i);}
    typeIdx=buckets;typeMeta=new Map();
    for(const sc of CAT.cat)for(const cl of sc.classes)for(const t of cl.types)typeMeta.set(t[0],{t:t[0],ix:t[1],n:t[2],nt:t[3],L:t[4],R:t[5],es:t[6],sc:sc.k,scn:sc.n,cl:cl.k,cln:cl.n});
    render();
  }
  const listFor=tg=>{let L=[];
    if(tg.kind==='type')L=typeIdx.get(typeMeta.get(tg.key).ix)||[];
    else if(tg.kind==='class'){const sc=CAT.cat.find(s=>s.k===tg.sc);const cl=sc.classes.find(c=>c.k===tg.key);for(const t of cl.types)L=L.concat(typeIdx.get(t[1])||[]);}
    else if(tg.kind==='super'){const si=META.sclass.indexOf(tg.key);for(let i=0;i<sclassArr.length;i++)if(sclassArr[i]===si)L.push(i);}
    if(tg.side==='L')L=L.filter(i=>sideArr[i]===1);else if(tg.side==='R')L=L.filter(i=>sideArr[i]!==1);
    return L;};
  function addConstruct(tg,opsin){const c={id:cid++,opsin:opsin||'CsChrimson',target:tg,_eff:0};c.list=tg?listFor(tg):[];constructs.push(c);render();syncWatch();if(tg)tel('construct',{opsin:c.opsin,target:tg.label,n:c.list.length,c});return c;}
  function removeConstruct(id){const c=constructs.find(x=>x.id===id);constructs=constructs.filter(c=>c.id!==id);render();syncWatch();if(c&&c.target){log('lab',`Construcción quitada: ${c.target.label}`,'#8C889B');tel('remove',{target:c.target.label,c});}}
  function reset(){constructs=[];for(const k in lights)lights[k]=false;applySilence(new Set());render();syncWatch();if(window.ARENA_OK&&ARENA.setLabLight)ARENA.setLabLight(null);}
  function syncWatch(){const sig=constructs.map(c=>c.id+':'+c.list.length).join(',');if(sig===lastWatch)return;lastWatch=sig;
    worker.postMessage({type:'watch',key:'*clear*',prefix:'c',list:[]});
    for(const c of constructs)if(c.list.length)worker.postMessage({type:'watch',key:'c'+c.id,list:c.list.slice(0,4000)});}
  const resp=c=>{let f=0;for(const L of LIGHTS)if(lights[L.k])f=Math.max(f,OPSINS[c.opsin].s[L.k]);return f*intensity;};
  function applySilence(want){const on=[],off=[];for(const i of want)if(!silencedNow.has(i))on.push(i);for(const i of silencedNow)if(!want.has(i))off.push(i);
    if(on.length)worker.postMessage({type:'silence',list:on,on:true});if(off.length)worker.postMessage({type:'silence',list:off,on:false});
    silencedNow.clear();for(const i of want)silencedNow.add(i);}
  function inputs(add){
    const want=new Set();
    for(const c of constructs){if(!c.list.length)continue;const f=resp(c);const O=OPSINS[c.opsin];
      if(O.act){if(f>.05)add('lab:'+c.id,c.list,150*Math.min(1,f));}
      else if(f>.35)for(const i of c.list)want.add(i);}
    // la mosca ve la luz azul y verde: activa sus fotorreceptores
    const vis=(lights.azul?1:0)*.8+(lights.verde?1:0)*.5;if(vis>0&&META){const g=META.stim.luz;add('stim:luzlab:L',g.L,40*vis*intensity);add('stim:luzlab:R',g.R,40*vis*intensity);}
    applySilence(want);
  }
  const anyLight=()=>Object.values(lights).some(Boolean);
  function activeActivators(){return constructs.filter(c=>OPSINS[c.opsin].act&&resp(c)>.05&&c.list.length);}
  function activeSilencers(){return constructs.filter(c=>!OPSINS[c.opsin].act&&resp(c)>.35&&c.list.length);}
  function sourceLabel(){const a=activeActivators();if(!a.length)return null;const col=LIGHTS.filter(L=>lights[L.k]).map(L=>L.n.toLowerCase()).join('+');
    return 'Luz '+col+' → '+a.map(c=>c.target.label).join(', ');}
  function sourceShort(){const a=activeActivators();if(!a.length)return null;return a.map(c=>c.target.label).join(' + ');}
  /* ---------- interfaz ---------- */
  const QUICK=[['CB0701','MN9','comer'],['DNp01','Fibra gigante','escape'],['MDN','MDN','caminar atrás']];
  const NICE={CB0701:'MN9',DNp01:'Fibra gigante',DNg11:'DNg11 (aDN)',DNp09:'P9'};
  const fmtN=n=>n.toLocaleString('es-MX');
  const stateOf=c=>{const O=OPSINS[c.opsin],f=resp(c);return O.act?f>.05:f>.35;};
  const lightCol=c=>{let best=null,bv=0;for(const L of LIGHTS)if(lights[L.k]&&OPSINS[c.opsin].s[L.k]>bv){bv=OPSINS[c.opsin].s[L.k];best=L;}return best?best.c:'var(--accent)';};
  function render(){
    const el=document.getElementById('labBody');if(!el||!CAT)return;
    let h='';
    if(!constructs.length){
      h=`<div class="empty"><div class="eic"><svg class="i lg"><use href="#i-dna"/></svg></div>
        <p>Elige neuronas, dales una opsina y enciende la luz.</p>
        <button class="btn btn-primary" id="addC"><svg class="i sm"><use href="#i-plus"/></svg>Elegir neuronas</button>
        <div class="quick">${QUICK.filter(([t])=>typeMeta.has(t)&&allowed(typeMeta.get(t))).map(([t,n,v])=>`<button class="chip" data-q="${t}"><b>${n}</b>&nbsp;· ${v}</button>`).join('')}</div></div>`;
    }else{
      h='<div class="sect">Tus construcciones</div>'+constructs.map(c=>{const O=OPSINS[c.opsin];const on=stateOf(c);
        const opts=Object.keys(OPSINS).map(k=>`<option value="${k}" ${k===c.opsin?'selected':''}>${OPSINS[k].n}</option>`).join('');
        return `<div class="recipe" data-c="${c.id}"><div class="rrow">
          <button class="rnode neu${c.target?'':' empty'}" data-pk="${c.id}"><svg class="i sm"><use href="#i-dna"/></svg><span>${c.target?c.target.label:'Elegir neuronas'}</span></button>
          <span class="rarr"><svg class="i sm"><use href="#i-arrow-right"/></svg></span>
          <select class="rnode" data-op="${c.id}" title="${O.d}">${opts}</select>
          <span class="rarr"><svg class="i sm"><use href="#i-arrow-right"/></svg></span>
          <span class="rstate${on?' on':''}" style="--lc:${lightCol(c)}"><svg class="i sm"><use href="#i-${O.act?'zap':'zap-off'}"/></svg></span>
          <button class="ibtn" data-del="${c.id}" title="Quitar"><svg class="i sm"><use href="#i-x"/></svg></button></div>
          <div class="rmeta">${c.target?fmtN(c.list.length)+' neuronas · ':''}<span class="verb ${O.act?'act':'sil'}">${O.act?'activa':'silencia'}</span>&nbsp;con ${O.act?(c.opsin==='ChR2'?'azul':'roja'):(c.opsin==='GtACR1'?'verde':'azul')}<span class="hz" data-hz="${c.id}">—</span></div></div>`;}).join('')+
        `<button class="btn btn-ghost sm" id="addC" style="width:100%;margin-top:2px"><svg class="i sm"><use href="#i-plus"/></svg>Añadir otra</button>`;
    }
    el.innerHTML=h;
    el.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>{const t=typeMeta.get(b.dataset.q);addConstruct({kind:'type',key:t.t,label:NICE[t.t]||t.t,side:'',sc:t.sc},'CsChrimson');log('lab',`CsChrimson en ${NICE[t.t]||t.t}`,'#B83A68');});
    el.querySelectorAll('[data-op]').forEach(s=>s.onchange=()=>{const c=constructs.find(x=>x.id==s.dataset.op);c.opsin=s.value;tel('opsin',{target:c.target?c.target.label:'',opsin:c.opsin,c});c._eff=0;c._mode=false;render();log('lab',`${c.target?c.target.label:'?'} ahora con ${s.value}`,'#B83A68');});
    el.querySelectorAll('[data-pk]').forEach(b=>b.onclick=()=>openPicker(+b.dataset.pk));
    el.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>removeConstruct(+b.dataset.del));
    el.querySelector('#addC').onclick=()=>{const c=addConstruct(null);openPicker(c.id);};
    renderLights();refresh();
  }
  function renderLights(){
    const lb=document.getElementById('lightbar');if(!lb)return;const any=anyLight();
    lb.innerHTML=`<div class="lights">${LIGHTS.map(L=>`<button class="lt" data-l="${L.k}" aria-pressed="${lights[L.k]}" style="--lc:${L.c}" data-tip="Luz ${L.n.toLowerCase()} · ${L.nm} nm"><i></i></button>`).join('')}
      <span class="sp"></span><span class="muted" style="font:600 13px var(--f-ui)">${any?LIGHTS.filter(L=>lights[L.k]).map(L=>L.n).join(' + '):'Luces apagadas'}</span></div>
      ${any?`<div class="lint"><div class="lbl"><span>Intensidad</span><output id="labIntO">${Math.round(intensity*100)}%</output></div><input type="range" id="labInt" min="10" max="100" step="5" value="${Math.round(intensity*100)}"></div>`:''}`;
    lb.querySelectorAll('.lt').forEach(b=>b.onclick=()=>setLight(b.dataset.l,!lights[b.dataset.l]));
    const r=lb.querySelector('#labInt');if(r){paintRange(r);r.oninput=e=>{intensity=+e.target.value/100;lb.querySelector('#labIntO').textContent=e.target.value+'%';refresh();};}
  }
  function setLight(k,v){if(lights[k]===v)return;lights[k]=v;if(v)lightAge[k]=simT;const L=LIGHTS.find(x=>x.k===k);log('light',`Luz ${L.n.toLowerCase()} ${v?'encendida':'apagada'}`,L.c);tel('light',{color:L.n.toLowerCase(),lk:k,on:v});render();
    if(window.ARENA_OK&&ARENA.setLabLight){const on=LIGHTS.filter(x=>lights[x.k]);ARENA.setLabLight(on.length?on[on.length-1].c:null,intensity);}}
  function refresh(){
    const el=document.getElementById('labBody');if(!el)return;
    for(const c of constructs){const card=el.querySelector(`.recipe[data-c="${c.id}"]`);if(!card)continue;const on=stateOf(c);
      const st=card.querySelector('.rstate');st.classList.toggle('on',on);st.style.setProperty('--lc',lightCol(c));
      const hz=card.querySelector('.hz');if(!c.target){hz.textContent='';continue;}
      const r=rates&&rates['w:c'+c.id]?rates['w:c'+c.id].L:0;hz.textContent=!OPSINS[c.opsin].act&&on?'0 Hz':Math.round(r)+' Hz';}
  }
  /* ---------- selector del catálogo ---------- */
  let pickFor=null,pkSide='',pkF='';
  const FILT=[['sensory','Sensoriales'],['central','Centrales'],['descending','Descendentes'],['motor','Motoras']];
  function openPicker(id){pickFor=id;const m=document.getElementById('picker');m.hidden=false;const q=document.getElementById('pkQ');q.value='';pkF='';
    document.getElementById('pkF').innerHTML=FILT.filter(([k])=>!restrict||!restrict.supers||restrict.supers.includes(k)).map(([k,n])=>`<button class="chip" data-f="${k}" aria-pressed="false">${n}</button>`).join('');
    document.querySelectorAll('#pkF .chip').forEach(b=>b.onclick=()=>{pkF=pkF===b.dataset.f?'':b.dataset.f;document.querySelectorAll('#pkF .chip').forEach(x=>x.setAttribute('aria-pressed',x.dataset.f===pkF));drawPicker(q.value);});
    drawPicker('');setTimeout(()=>q.focus(),50);}
  function closePicker(){document.getElementById('picker').hidden=true;const c=constructs.find(x=>x.id===pickFor);if(c&&!c.target)removeConstruct(c.id);pickFor=null;}
  function choose(tg){const c=constructs.find(x=>x.id===pickFor);if(!c)return;const had=c.target;if(had)tel('remove',{target:had.label,c,retarget:true});c.target=tg;c.list=listFor(tg);c._eff=0;c._mode=false;
    if(c.list.length>20000&&!confirm(`Son ${fmtN(c.list.length)} neuronas y puede ir lento. ¿Seguir?`))return;
    document.getElementById('picker').hidden=true;pickFor=null;render();syncWatch();log('lab',`${c.opsin} en ${tg.label}`,'#B83A68');tel('construct',{opsin:c.opsin,target:tg.label,n:c.list.length,c});}
  const allowed=t=>!restrict||(restrict.types&&restrict.types.includes(t.t))||(restrict.supers&&restrict.supers.includes(t.sc));
  const passF=t=>!pkF||t.sc===pkF;
  function typeRow(t){const nice=NICE[t.t];return `<button class="nrow" data-t="${t.t}"><b>${nice||t.es||t.t}</b><span class="tech">${t.t}${nice||t.es?'':''}</span><span class="meta">${t.n} ${t.n===1?'neurona':'neuronas'} · ${t.cln==='Otros'||t.cln==='Other'?t.scn:t.cln}</span></button>`;}
  function drawPicker(q){
    const box=document.getElementById('pkList');q=q.trim().toLowerCase();let h='';
    if(restrict&&restrict.types){h+='<h6>Disponibles en este reto</h6>'+restrict.types.map(t=>typeMeta.get(t)).filter(Boolean).map(typeRow).join('');}
    else if(q){const res=[];for(const t of typeMeta.values()){if(!allowed(t)||!passF(t))continue;if(t.t.toLowerCase().includes(q)||(t.es&&t.es.toLowerCase().includes(q))||t.cln.toLowerCase().includes(q)||(NICE[t.t]||'').toLowerCase().includes(q))res.push(t);if(res.length>150)break;}
      h=res.length?res.sort((a,b)=>(b.es?1:0)-(a.es?1:0)).map(typeRow).join(''):'<p class="muted" style="text-align:center;margin-top:24px">Nada con ese nombre.</p>';}
    else{const fam=CAT.famous.map(t=>typeMeta.get(t)).filter(t=>t&&allowed(t)&&passF(t));if(fam.length)h+='<h6>Famosas</h6>'+fam.map(typeRow).join('');
      h+='<h6>Catálogo</h6>';
      for(const sc of CAT.cat){if(restrict&&restrict.supers&&!restrict.supers.includes(sc.k))continue;if(pkF&&sc.k!==pkF)continue;
        h+=`<details ${pkF?'open':''}><summary class="grp">${sc.n}<span class="n">${fmtN(sc.count)}</span>${restrict?'':`<button class="btn btn-ghost sm" data-g="super" data-k="${sc.k}">Todas</button>`}</summary><div class="gbody">`;
        for(const cl of sc.classes)h+=`<details class="g2" data-sc="${sc.k}" data-cl="${cl.k}"><summary class="grp">${cl.n}<span class="n">${cl.types.length} tipos</span>${restrict?'':`<button class="btn btn-ghost sm" data-g="class" data-sc="${sc.k}" data-k="${cl.k}">Todas</button>`}</summary><div class="gbody"></div></details>`;
        h+='</div></details>';}}
    box.innerHTML=h;
    box.querySelectorAll('details.g2').forEach(d=>d.addEventListener('toggle',()=>{if(!d.open)return;const b=d.querySelector('.gbody');if(b.children.length)return;
      const sc=CAT.cat.find(s=>s.k===d.dataset.sc),cl=sc.classes.find(c=>c.k===d.dataset.cl);const ts=cl.types.map(t=>typeMeta.get(t[0]));
      b.innerHTML=ts.slice(0,300).map(typeRow).join('')+(ts.length>300?`<p class="muted">…y ${ts.length-300} más. Usa el buscador.</p>`:'');bindRows(b);}));
    box.querySelectorAll('[data-g]').forEach(b=>b.onclick=e=>{e.preventDefault();e.stopPropagation();
      if(b.dataset.g==='super'){const sc=CAT.cat.find(s=>s.k===b.dataset.k);choose({kind:'super',key:sc.k,label:sc.n+sideLbl(pkSide),side:pkSide,sc:sc.k});}
      else{const sc=CAT.cat.find(s=>s.k===b.dataset.sc),cl=sc.classes.find(c=>c.k===b.dataset.k);choose({kind:'class',key:cl.k,sc:sc.k,label:cl.n+sideLbl(pkSide),side:pkSide});}});
    bindRows(box);
  }
  const sideLbl=s=>s==='L'?' · izq':s==='R'?' · der':'';
  function bindRows(root){root.querySelectorAll('.nrow').forEach(b=>b.onclick=()=>{const t=typeMeta.get(b.dataset.t);
    choose({kind:'type',key:t.t,label:(NICE[t.t]||t.t)+sideLbl(pkSide),side:pkSide,sc:t.sc});});}
  document.getElementById('pkQ').addEventListener('input',e=>drawPicker(e.target.value));
  document.querySelectorAll('#pkSide button').forEach(b=>b.onclick=()=>{pkSide=b.dataset.s;document.querySelectorAll('#pkSide button').forEach(x=>x.setAttribute('aria-selected',x===b));drawPicker(document.getElementById('pkQ').value);});
  document.getElementById('pkClose').onclick=closePicker;
  function findType(q){q=String(q).trim();const lc=q.toLowerCase();
    for(const [k,v] of Object.entries(NICE))if(v.toLowerCase()===lc||v.toLowerCase().split(' ')[0]===lc)return typeMeta.get(k);
    if(lc==='gf'||lc==='fibra')return typeMeta.get('DNp01');if(lc==='p9')return typeMeta.get('DNp09');
    if(typeMeta.has(q))return typeMeta.get(q);for(const t of typeMeta.values())if(t.t.toLowerCase()===lc)return t;return null;}
  return {init,inputs,render,refresh,reset,addConstruct,sourceLabel,activeActivators,activeSilencers,anyLight,
    setLight,setIntensity:v=>{intensity=v;render();},sourceShort,removeConstruct,findType,NICE,get intensity(){return intensity;},
    setRestrict:r=>{restrict=r;},get constructs(){return constructs;},get lights(){return lights;},typeMeta:()=>typeMeta,listFor,openPicker};
})();
