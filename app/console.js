/* ============ CONSOLA · Bitácora ============ */
const CONSOLE=(()=>{
  const $=id=>document.getElementById(id);
  const out=$('conOut'),inp=$('conIn'),ghost=$('conGhost'),sigEl=$('conSig'),acEl=$('conAC');
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const tsf=()=>(simT/1000).toLocaleString('es-MX',{minimumFractionDigits:1,maximumFractionDigits:1})+' s';
  const nm=t=>`<span class="nm" data-n="${esc(t)}">${esc(t)}</span>`;
  const cm=t=>`<span class="cmd" data-c="${esc(t)}">${esc(t)}</span>`;
  let HIST=[];try{HIST=JSON.parse(localStorage.getItem('dros-con-hist')||'[]');}catch(e){}
  let hpos=HIST.length,draft='';
  const PKEY='dros-protos-v1';
  let PROTOS={};try{PROTOS=JSON.parse(localStorage.getItem(PKEY)||'null')||null;}catch(e){}
  if(!PROTOS)PROTOS={
    'hambre de luz':'@nombre hambre de luz\n# MN9 con CsChrimson: la luz roja hace extender la probóscide\nactivar MN9\nrepetir 3\n  luz roja on\n  esperar 600 ms\n  luz roja off\n  esperar 800 ms\nfin\nmarcar listo',
    'moonwalk':'@nombre moonwalk\n@semilla 7\nactivar MDN\nluz roja on al 80%\nesperar 2 s\nluz roja off\nconstrucciones quitar todas',
    'sombra y escape':'# ¿escapa ante la sombra? luego silencia la fibra gigante y repite\nsombra\nesperar 1500 ms\nsilenciar GF\nluz verde on\nesperar 300 ms\nsombra\nesperar 1500 ms\nluz verde off',
  };
  const saveProtos=()=>{try{localStorage.setItem(PKEY,JSON.stringify(PROTOS));}catch(e){}};
  let lines=0;
  function print(html,cls){const d=document.createElement('div');d.className='line '+(cls||'');d.innerHTML=html;out.appendChild(d);
    if(++lines>700){out.firstChild.remove();lines--;}const near=out.scrollHeight-out.scrollTop-out.clientHeight<120;if(near)out.scrollTop=out.scrollHeight;return d;}
  let lastEv=null;
  function event(kind,text,col){
    if(kind==='beh'&&lastEv&&lastEv.kind==='beh'&&simT-lastEv.t<300&&lastEv.el===out.lastChild){lastEv.el.innerHTML=`<span class="ts">${tsf()}</span>${esc(text)}`;lastEv.el.style.setProperty('--evc',col||'#6B7391');lastEv.t=simT;return;}
    const d=print(`<span class="ts">${tsf()}</span>${esc(text)}`,'ev');d.style.setProperty('--evc',col||'#6B7391');lastEv={kind,t:simT,el:d};
  }
  /* ---------- utilidades ---------- */
  const lev=(a,b)=>{a=a.toLowerCase();b=b.toLowerCase();const m=a.length,n=b.length;if(!m)return n;if(!n)return m;let p=Array.from({length:n+1},(_,j)=>j);
    for(let i=1;i<=m;i++){const c=[i];for(let j=1;j<=n;j++)c[j]=Math.min(p[j]+1,c[j-1]+1,p[j-1]+(a[i-1]===b[j-1]?0:1));p=c;}return p[n];};
  const norm=s=>s.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
  const LIGHT={roja:'rojo',rojo:'rojo',red:'rojo',ambar:'ambar',amber:'ambar',naranja:'ambar',verde:'verde',green:'verde',azul:'azul',blue:'azul'};
  const STIM={azucar:'azucar',sugar:'azucar',agua:'agua',water:'agua',amargo:'amargo',bitter:'amargo',sonido:'sonido',sound:'sonido',foco:'luz',luz:'luz',vinagre:'vinagre',co2:'co2'};
  function typeOf(q){const t=LAB.findType(q);if(t)return t;return null;}
  function suggestType(q){const lc=q.toLowerCase();const c=[];for(const t of LAB.typeMeta().values()){const d=t.t.toLowerCase().startsWith(lc)?0:lev(lc,t.t.toLowerCase());if(d<=2)c.push([d,t.t]);if(c.length>400)break;}
    return c.sort((a,b)=>a[0]-b[0]).slice(0,4).map(x=>x[1]);}
  function needType(q){if(!q){print('Falta el tipo de neurona. Ejemplo: '+cm('info MN9'),'err');return null;}const t=typeOf(q);
    if(!t){tel('error',{type:'comando',d:q});const s=suggestType(q);print(`No encuentro <b>${esc(q)}</b>.`+(s.length?' ¿Quisiste decir '+s.map(nm).join(', ')+'?':' Prueba '+cm('buscar '+q)),'err');}return t;}
  const niceName=t=>LAB.NICE[t.t]||t.t;
  const SIDE={izq:'L',izquierda:'L',left:'L',l:'L',der:'R',derecha:'R',right:'R',r:'R'};
  function parseTarget(args){let side='',ops=null,rest=[];for(let i=0;i<args.length;i++){const a=args[i].toLowerCase();
      if(SIDE[a])side=SIDE[a];else if((a==='con'||a==='with')&&args[i+1]){ops=args[++i];}else rest.push(args[i]);}
    return {q:rest.join(' '),side,ops};}
  const pct=args=>{const i=args.findIndex(a=>/^al$|^at$/i.test(a));let v=null;if(i>=0&&args[i+1])v=parseFloat(args[i+1]);else{const m=args.find(a=>/^\d+%$/.test(a));if(m)v=parseFloat(m);}return v==null?null:Math.max(5,Math.min(100,v))/100;};
  /* ---------- registro en vivo ---------- */
  const WATCH=new Map();
  function drawWatch(){const box=$('conWatch');if(!WATCH.size){box.innerHTML=`<div class="dim" style="font-size:12px">Usa ${cm('registrar MN9')}</div>`;bindClicks(box);return;}
    box.innerHTML=[...WATCH.keys()].map(k=>`<div class="wrow" data-w="${esc(k)}"><span class="wn" title="${esc(k)}">${esc(k)}</span><canvas width="160" height="36"></canvas><span class="hz">0</span></div>`).join('');}
  function tickWatch(){for(const [k,w] of WATCH){const r=rates&&rates['w:k:'+k]?rates['w:k:'+k].L:0;w.h.push(r);if(w.h.length>80)w.h.shift();}
    $('conWatch').querySelectorAll('.wrow').forEach(row=>{const w=WATCH.get(row.dataset.w);if(!w)return;const v=w.h[w.h.length-1]||0;row.querySelector('.hz').textContent=Math.round(v)+' Hz';
      const c=row.querySelector('canvas'),x=c.getContext('2d');x.clearRect(0,0,160,36);const mx=Math.max(20,...w.h);x.strokeStyle=v>5?'#FF4F93':'#5CC8FF';x.lineWidth=2;x.beginPath();
      w.h.forEach((y,i)=>{const px=i*2,py=34-y/mx*32;i?x.lineTo(px,py):x.moveTo(px,py);});x.stroke();});}
  function addWatch(t){const list=LAB.listFor({kind:'type',key:t.t,side:''});WATCH.set(t.t,{h:[],list});worker.postMessage({type:'watch',key:'k:'+t.t,list:list.slice(0,4000)});drawWatch();}
  function delWatch(k){WATCH.delete(k);worker.postMessage({type:'watch',key:'k:'+k,list:[]});drawWatch();}
  /* ---------- espera en tiempo simulado ---------- */
  let waiters=[];
  const waitSim=ms=>new Promise(res=>waiters.push({t:simT+ms,res}));
  function tick(){const now=simT;waiters=waiters.filter(w=>{if(now>=w.t){w.res();return false;}return true;});if(WATCH.size)tickWatch();}
  /* ---------- comandos ---------- */
  let used=[],mark=0,protoRanAt=-1,running=null;
  const C={};
  function def(name,aliases,sig,desc,arg,fn,group){C[name]={name,aliases,sig,desc,arg,fn,group};}
  const resolve=w=>{w=norm(w);for(const k in C)if(k===w||C[k].aliases.includes(w))return C[k];return null;};
  def('ayuda',['help','?'],'ayuda [comando]','Muestra los comandos','cmd',a=>{
    if(a[0]){const c=resolve(a[0]);if(!c)return print('No conozco ese comando.','err');print(`<b>${esc(c.sig)}</b>  <span class="dim">${esc(c.desc)}${c.aliases.length?' · alias: '+c.aliases.join(', '):''}</span>`);return;}
    const G={};for(const k in C)(G[C[k].group]=G[C[k].group]||[]).push(C[k]);
    for(const g in G){print(`<span class="dim">${g}</span>`);print(G[g].map(c=>cm(c.name)).join('  '));}
    print(`<span class="dim">Tab completa · ↑↓ historial · clic en un nombre para ver su info</span>`);},'Ayuda');
  def('atajos',['keys'],'atajos','Atajos de teclado',null,()=>{[['` o F2','abre / cierra la consola'],['Espacio','pausa'],['Esc','suelta la herramienta'],['Supr','borra el estímulo elegido'],['Tab','autocompleta'],['↑ ↓','historial']].forEach(([k,d])=>print(`<b>${k.padEnd(10)}</b> <span class="dim">${d}</span>`));},'Ayuda');
  def('buscar',['search','find'],'buscar <texto>','Busca tipos de neurona por nombre o función','free',a=>{const q=norm(a.join(' '));if(!q)return print('Escribe qué buscar. Ejemplo: '+cm('buscar azúcar'),'err');
    const res=[];for(const t of LAB.typeMeta().values()){const hay=norm(t.t+' '+(t.es||'')+' '+t.cln+' '+(LAB.NICE[t.t]||''));if(hay.includes(q))res.push(t);}
    if(!res.length)return print('Nada con eso.','warn');res.sort((a,b)=>(b.es?1:0)-(a.es?1:0));
    res.slice(0,14).forEach(t=>print(`${nm(t.t)}  <span class="dim">${t.n} · ${esc(t.es||t.cln)}</span>`));if(res.length>14)print(`<span class="dim">…y ${res.length-14} más</span>`);},'Neuronas');
  def('info',['i'],'info <tipo>','Ficha de un tipo de neurona','type',a=>{const t=needType(a.join(' '));if(!t)return;
    print(`<b>${esc(niceName(t))}</b>${niceName(t)!==t.t?' <span class="dim">('+esc(t.t)+')</span>':''}`);
    if(t.es)print(esc(t.es));print(`<span class="dim">${esc(t.scn)} › ${esc(t.cln)} · ${t.n} neuronas (${t.L} izq, ${t.R} der) · ${esc(t.nt||'?')}</span>`);
    print(`${cm('activar '+t.t)} ${cm('silenciar '+t.t)} ${cm('conexiones '+t.t)} ${cm('registrar '+t.t)}`);},'Neuronas');
  def('conexiones',['conn','connections'],'conexiones <tipo> [entrada|salida]','A quién habla (o quién le habla)','type',async a=>{
    let dir='out';const k=a.findIndex(x=>/^(entrada|in|entradas|salida|out|salidas)$/i.test(x));if(k>=0){dir=/^(entrada|in|entradas)$/i.test(a[k])?'in':'out';a.splice(k,1);}
    const t=needType(a.join(' '));if(!t)return;const p=print('<span class="dim">consultando el conectoma…</span>');
    const r=await workerReq({type:'conn',ix:t.ix,dir,n:10});p.remove();
    print(`<b>${esc(niceName(t))}</b> ${dir==='out'?'→ habla a':'← recibe de'} ${r.partners} tipos · ${r.tot.toLocaleString('es-MX')} sinapsis`);
    const mx=r.rows.length?r.rows[0][1]:1;
    r.rows.forEach(([n,c,sg])=>{const bar='█'.repeat(Math.max(1,Math.round(c/mx*18)));print(`<span class="${sg>0?'ok':'err'}">${bar}</span> ${n?nm(n):'<span class="dim">(sin tipo)</span>'} <span class="dim">${c} ${sg>0?'exc':'inh'}</span>`);});},'Neuronas');
  function construct(a,defOps){const {q,side,ops}=parseTarget(a);const t=needType(q);if(!t)return;let O=defOps;
    if(ops){O=Object.keys(OPSINS).find(k=>k.toLowerCase()===ops.toLowerCase());if(!O)return print(`Opsina desconocida. Usa: ${Object.keys(OPSINS).join(', ')}`,'err');}
    const R=window.__restrict;
    const tg={kind:'type',key:t.t,label:niceName(t)+(side==='L'?' · izq':side==='R'?' · der':''),side,sc:t.sc};
    const c=LAB.addConstruct(tg,O);event('lab',`${O} en ${tg.label}`,'#B83A68');
    const col=OPSINS[O].act?(O==='ChR2'?'azul':'roja'):(O==='GtACR1'?'verde':'azul');
    print(`<span class="ok">✓</span> ${esc(O)} en ${nm(t.t)} · ${c.list.length} neuronas. Enciende la luz: ${cm('luz '+col+' on')}`);}
  def('activar',['activate','act'],'activar <tipo> [izq|der] [con opsina]','Pone CsChrimson en esas neuronas','type',a=>construct(a,'CsChrimson'),'Optogenética');
  def('silenciar',['silence','sil'],'silenciar <tipo> [izq|der] [con opsina]','Pone GtACR1 en esas neuronas','type',a=>construct(a,'GtACR1'),'Optogenética');
  def('construcciones',['constructs','cons'],'construcciones [quitar n|todas]','Lista o quita construcciones',null,a=>{
    if(/^(quitar|remove|rm)$/i.test(a[0]||'')){if(/^(todas|all)$/i.test(a[1]||'')){LAB.constructs.slice().forEach(c=>LAB.removeConstruct(c.id));return print('<span class="ok">✓</span> sin construcciones');}
      const n=parseInt(a[1]);const c=LAB.constructs[n-1];if(!c)return print('No existe esa construcción.','err');LAB.removeConstruct(c.id);return print('<span class="ok">✓</span> quitada');}
    if(!LAB.constructs.length)return print('No hay construcciones. Prueba '+cm('activar MN9'),'dim');
    LAB.constructs.forEach((c,i)=>{const O=OPSINS[c.opsin];print(`${i+1}. ${c.target?esc(c.target.label):'—'} <span class="dim">${c.opsin} · ${c.list.length} neuronas ·</span> ${O.act?'<span class="ok">activa</span>':'<span class="warn">silencia</span>'}`);});},'Optogenética');
  def('luz',['light'],'luz <color|todas> on|off [al n%]','Enciende o apaga una luz del laboratorio','color',a=>{
    const col=norm(a[0]||'');const st=(a[1]||'').toLowerCase();const p=pct(a);if(p!=null)LAB.setIntensity(p);
    if(col==='off'||((col==='todas'||col==='all')&&st==='off')){LIGHTS.forEach(L=>LAB.setLight(L.k,false));return print('<span class="ok">✓</span> luces apagadas');}
    const k=LIGHT[col];if(!k){print(`Color desconocido. Usa: ${cm('luz roja on')} ${cm('luz verde on')} ${cm('luz azul on')} ${cm('luz ambar on')}`,'err');return;}
    const on=st?/^(on|si|sí|encender|1)$/.test(st):!LAB.lights[k];LAB.setLight(k,on);if(on&&!LAB.constructs.length)print('Ninguna neurona tiene opsina: la luz no hará nada. Prueba '+cm('activar MN9'),'warn');},'Optogenética');
  def('estimulo',['stim','estímulo'],'estimulo <tipo> [en x z] [al n%] | estimulo quitar','Coloca un estímulo en la arena','stim',a=>{
    if(/^(quitar|clear|todos)$/i.test(a[0]||'')){clearArena();return print('<span class="ok">✓</span> arena vacía');}
    const k=STIM[norm(a[0]||'')];if(!k)return print('Estímulos: '+Object.keys(ST).map(s=>cm('estimulo '+s)).join(' '),'err');
    let x,z;const i=a.findIndex(s=>/^en$|^at$/i.test(s));if(i>=0&&a[i+2]!=null){x=parseFloat(a[i+1]);z=parseFloat(a[i+2]);}
    else if(ST[k].kind==='contact'){x=fly.x+Math.cos(fly.h)*.55;z=fly.z-Math.sin(fly.h)*.55;}else{x=fly.x+Math.cos(fly.h)*2.2;z=fly.z-Math.sin(fly.h)*2.2;}
    const r=Math.hypot(x,z);if(r>ARENA.R-.6){x*=(ARENA.R-.6)/r;z*=(ARENA.R-.6)/r;}
    const s=placeStim(k,x,z,pct(a)??.7);print(`<span class="ok">✓</span> ${ST[k].n} en (${x.toFixed(1)}, ${z.toFixed(1)}) al ${Math.round(s.int*100)}%`);},'Mundo');
  def('sombra',['loom','shadow'],'sombra [izq|der]','Una sombra se acerca a la mosca',null,a=>{const s=SIDE[(a[0]||'').toLowerCase()];doLoom(s==='L'?-1:s==='R'?1:0);},'Mundo');
  def('antenas',['antenna','tocar'],'antenas [ms]','Toca las antenas',null,a=>doAntenna(parseFloat(a[0])||1500),'Mundo');
  def('registrar',['watch','rec'],'registrar <tipo>','Muestra su frecuencia en vivo a la derecha','type',a=>{const t=needType(a.join(' '));if(!t)return;addWatch(t);print(`<span class="ok">✓</span> registrando ${nm(t.t)}`);},'Medir');
  def('parar',['stop','unwatch'],'parar [tipo|todo|protocolo]','Deja de registrar o detiene un protocolo',null,a=>{const q=(a[0]||'').toLowerCase();
    if(q==='protocolo'||q==='proto'||(!q&&running)){if(running){running.stop=true;print('Protocolo detenido.','warn');}return;}
    if(!q||q==='todo'||q==='all'){[...WATCH.keys()].forEach(delWatch);return print('<span class="ok">✓</span> sin registros');}
    const t=typeOf(a.join(' '));const k=t?t.t:a[0];if(!WATCH.has(k))return print('No lo estás registrando.','err');delWatch(k);},'Medir');
  def('conducta',['behavior','beh'],'conducta','Conducta actual y neuronas de salida',null,()=>{
    print(`<b>${esc(BEH[behavior].n)}</b> <span class="dim">desde ${((simT-behSince)/1000).toFixed(1)} s</span>`);
    const r=k=>rates&&rates[k]?rates[k]:{L:0,R:0};
    [['GF','Fibra gigante',TH.GF],['MDN','MDN',TH.MDN],['DNa02','DNa02',null],['DNg11','DNg11',TH.DNg11],['MN9','MN9',TH.MN9]].forEach(([k,n,th])=>{const v=r(k);const m=Math.max(v.L,v.R);
      print(`${n.padEnd(14)} izq ${String(Math.round(v.L)).padStart(4)}  der ${String(Math.round(v.R)).padStart(4)} Hz${th?`  <span class="${m>th?'ok':'dim'}">umbral ${th}</span>`:''}`);});},'Medir');
  def('estado',['status'],'estado','Resumen de la simulación',null,()=>{
    print(`t ${tsf()} · ${speed.toFixed(2)}× · ${nAct.toLocaleString('es-MX')} neuronas activas${paused?' · <span class="warn">en pausa</span>':''}`);
    print(`conducta <b>${esc(BEH[behavior].n)}</b> · luces ${LIGHTS.filter(L=>LAB.lights[L.k]).map(L=>L.n).join(', ')||'apagadas'} · ${LAB.constructs.length} construcciones · ${placed.length} estímulos`);},'Medir');
  def('pausa',['pause'],'pausa','Pausa la simulación',null,()=>{if(!paused)setPaused(true);},'Simulación');
  def('reanudar',['resume','play'],'reanudar','Reanuda la simulación',null,()=>{if(paused)setPaused(false);},'Simulación');
  def('reiniciar',['reset'],'reiniciar [actividad|todo]','Pone la actividad a cero (o todo)',null,a=>{if(/^(todo|all)$/i.test(a[0]||'')){resetWorld();LAB.reset();event('sys','Todo reiniciado','#8C889B');}else doReset();},'Simulación');
  def('velocidad',['speed'],'velocidad real|max','Tiempo real o lo más rápido posible',null,a=>{const v=/^(max|máx|maxima|máxima|fast)$/i.test(a[0]||'')?100:1;setCap(v);print(`<span class="ok">✓</span> ${v>1?'máxima':'tiempo real'}`);},'Simulación');
  def('camara',['camera','cam','cámara'],'camara seguir|libre|centrar','Controla la cámara',null,a=>{const q=norm(a[0]||'');const f=$('camFollow');
    if(q==='seguir'||q==='follow'){if(f.getAttribute('aria-pressed')!=='true')f.click();}else if(q==='libre'||q==='free'){if(f.getAttribute('aria-pressed')==='true')f.click();}else $('camReset').click();},'Simulación');
  def('esperar',['wait','sleep'],'esperar <n> ms|s','Espera tiempo simulado',null,async a=>{let n=parseFloat(a[0]);if(!(n>0))return print('Ejemplo: '+cm('esperar 500 ms'),'err');if(/^s|seg/i.test(a[1]||'')||/s$/.test(a[0])&&!/ms$/.test(a[0]))n*=1000;
    if(paused)print('En pausa: la espera continúa al reanudar.','warn');await waitSim(n);},'Protocolos');
  def('guardar',['save'],'guardar <nombre>','Guarda los comandos de esta sesión como protocolo',null,a=>{const n=a.join(' ').trim();if(!n)return print('Ponle nombre. Ejemplo: '+cm('guardar mi experimento'),'err');
    const body=sessionCmds.filter(c=>!/^(guardar|save|historial|limpiar|ayuda|ejecutar|!)/i.test(c)).join('\n');if(!body)return print('Aún no hay comandos que guardar.','warn');
    PROTOS[n]='@nombre '+n+'\n'+body;saveProtos();drawProtos();print(`<span class="ok">✓</span> guardado como ${cm('ejecutar '+n)}`);},'Protocolos');
  def('ejecutar',['run'],'ejecutar <nombre>','Ejecuta un protocolo guardado','proto',a=>{const n=a.join(' ').trim();const k=Object.keys(PROTOS).find(p=>p.toLowerCase()===n.toLowerCase());
    if(!k){print('Protocolos: '+Object.keys(PROTOS).map(p=>cm('ejecutar '+p)).join(' '),n?'err':'');return;}return runProto(PROTOS[k],k);},'Protocolos');
  def('protocolos',['protocols'],'protocolos','Lista los protocolos guardados',null,()=>{Object.keys(PROTOS).forEach(p=>print(cm('ejecutar '+p)));},'Protocolos');
  def('historial',['history'],'historial','Comandos anteriores (usa !n)',null,()=>{HIST.slice(-20).forEach((h,i,arr)=>print(`<span class="dim">${String(HIST.length-arr.length+i+1).padStart(3)}</span>  ${cm(h)}`));},'Ayuda');
  def('limpiar',['clear','cls'],'limpiar','Limpia la consola',null,()=>{out.innerHTML='';lines=0;},'Ayuda');
  def('reto',['challenge'],'reto [id]','Muestra el reto actual o empieza uno',null,a=>{if(a[0]){const l=LEARN.list().find(x=>x.id===a[0]);if(!l)return print('Ids: '+LEARN.list().map(l=>cm('reto '+l.id)).join(' '),'err');LEARN.start(l.id);return;}
    const l=LEARN.current;if(!l)return print('No hay reto activo. Ids: '+LEARN.list().filter(l=>l.type==='reto').map(l=>cm('reto '+l.id)).join(' '),'dim');print(`<b>${esc(l.title)}</b> · ${esc(l.brief)}`);},'Ayuda');
  def('marcar',['mark'],'marcar <texto>','Deja una marca en la bitácora',null,a=>event('mark','▍ '+a.join(' '),'#FF4F93'),'Protocolos');
  /* ---------- ejecución ---------- */
  const sessionCmds=[];
  function tokenize(s){const r=[];s.replace(/"([^"]*)"|(\S+)/g,(_,q,w)=>{r.push(q!=null?q:w);});return r;}
  async function exec(line,{echo=true,proto=false}={}){
    line=line.trim();if(!line||line.startsWith('#'))return;
    if(echo)print(`<span class="pr">mosca ›</span> <span class="in">${esc(line)}</span>`);
    if(/^!\d+$/.test(line)){const h=HIST[parseInt(line.slice(1))-1];if(!h)return print('No existe ese número.','err');return exec(h);}
    const [w,...a]=tokenize(line);const c=resolve(w);
    if(!c){const all=Object.keys(C).concat(...Object.values(C).map(c=>c.aliases));const best=all.map(k=>[lev(norm(w),k),k]).sort((x,y)=>x[0]-y[0])[0];
      tel('cmd',{text:line});tel('error',{type:'comando',d:line});print(`No conozco <b>${esc(w)}</b>.`+(best&&best[0]<=2?` ¿Quisiste decir ${cm(resolve(best[1]).name+(a.length?' '+a.join(' '):''))}?`:` Escribe ${cm('ayuda')}.`),'err');return;}
    used.push({c:c.name,t:performance.now()});tel('cmd',{text:line,proto:proto||undefined});if(!proto&&!['historial','limpiar','ayuda','guardar'].includes(c.name))sessionCmds.push(line);
    try{await c.fn(a);}catch(e){print('Error: '+esc(e.message||e),'err');console.error(e);}
  }
  async function runProto(text,name){
    if(running){running.stop=true;}
    const R={stop:false};running=R;protoRanAt=performance.now();
    const raw=text.split('\n');const meta={};const body=[];
    for(const l of raw){const t=l.trim();if(t.startsWith('@')){const [k,...v]=t.slice(1).split(/\s+/);meta[k.toLowerCase()]=v.join(' ');}else body.push(t);}
    // expandir repetir … fin
    function expand(ls){const outL=[];for(let i=0;i<ls.length;i++){const m=/^(repetir|repeat)\s+(\d+)/i.exec(ls[i]);
      if(m){let d=1,j=i+1;const inner=[];for(;j<ls.length;j++){if(/^(repetir|repeat)\b/i.test(ls[j]))d++;if(/^(fin|end)$/i.test(ls[j])&&--d===0)break;inner.push(ls[j]);}
        const ex=expand(inner);for(let k=0;k<Math.min(200,+m[2]);k++)outL.push(...ex);i=j;}else outL.push(ls[i]);}return outL;}
    const steps=expand(body).filter(l=>l&&!l.startsWith('#'));
    const nm2=meta.nombre||name||'protocolo';event('proto',`Protocolo «${nm2}» · ${steps.length} pasos`,'#5CC8FF');
    if(meta.semilla!=null){worker.postMessage({type:'seed',seed:parseInt(meta.semilla)||0});print(`<span class="dim">semilla ${esc(meta.semilla)}</span>`);}
    for(const s of steps){if(R.stop)break;await exec(s,{proto:true});}
    if(meta.semilla!=null)worker.postMessage({type:'seed',seed:null});
    if(running===R){running=null;if(!R.stop)event('proto',`Protocolo «${nm2}» terminado`,'#3DD68C');}
  }
  /* ---------- autocompletado ---------- */
  let acItems=[],acSel=0;
  function candidates(v){
    const parts=v.split(/\s+/);const cur=parts[parts.length-1];const nl=norm(cur);
    if(parts.length===1){return Object.values(C).filter(c=>c.name.startsWith(nl)||c.aliases.some(a=>a.startsWith(nl))).map(c=>({v:c.name,d:c.desc}));}
    const c=resolve(parts[0]);if(!c)return[];const argi=parts.length-2;
    if(c.arg==='type'&&argi===0){if(!cur)return['MN9','GF','MDN','DNa02','DNg11','LB3c','LPLC2'].map(v=>({v,d:''}));
      const r=[];for(const [k,v] of Object.entries(LAB.NICE))if(norm(v).startsWith(nl))r.push({v:v.split(' ')[0],d:k});
      for(const t of LAB.typeMeta().values()){if(t.t.toLowerCase().startsWith(nl))r.push({v:t.t,d:t.es||t.cln});if(r.length>30)break;}return r;}
    if(c.name==='conexiones'&&argi>0)return['entrada','salida'].filter(x=>x.startsWith(nl)).map(v=>({v,d:''}));
    if(c.arg==='type'&&argi>0){return ['izq','der','con'].concat(parts[parts.length-2]==='con'?Object.keys(OPSINS):[]).filter(x=>norm(x).startsWith(nl)).map(v=>({v,d:''}));}
    if(c.name==='luz')return(argi===0?['roja','verde','azul','ambar','todas']:argi===1?['on','off']:['al']).filter(x=>x.startsWith(nl)).map(v=>({v,d:''}));
    if(c.name==='estimulo'&&argi===0)return Object.keys(ST).concat(['quitar']).filter(x=>x.startsWith(nl)).map(v=>({v,d:ST[v]?ST[v].n:''}));
    if(c.name==='ejecutar')return Object.keys(PROTOS).filter(x=>x.toLowerCase().startsWith(v.slice(v.indexOf(' ')+1).toLowerCase())).map(x=>({v:x,d:'protocolo',full:true}));
    if(c.name==='ayuda')return Object.keys(C).filter(x=>x.startsWith(nl)).map(v=>({v,d:''}));
    if(c.name==='camara')return['seguir','libre','centrar'].filter(x=>x.startsWith(nl)).map(v=>({v,d:''}));
    if(c.name==='velocidad')return['real','max'].filter(x=>x.startsWith(nl)).map(v=>({v,d:''}));
    if(c.name==='reiniciar')return['actividad','todo'].filter(x=>x.startsWith(nl)).map(v=>({v,d:''}));
    if(c.name==='parar')return['todo','protocolo',...WATCH.keys()].filter(x=>norm(x).startsWith(nl)).map(v=>({v,d:''}));
    if(c.name==='conexiones'&&argi>0)return['entrada','salida'].filter(x=>x.startsWith(nl)).map(v=>({v,d:''}));
    return[];}
  function applyCand(it){const v=inp.value;if(it.full){inp.value=v.slice(0,v.indexOf(' ')+1)+it.v+' ';}else{const i=v.lastIndexOf(' ');inp.value=v.slice(0,i+1)+it.v+' ';}hideAC();update();}
  function hideAC(){acEl.hidden=true;acItems=[];}
  function showAC(items){acItems=items.slice(0,8);acSel=0;acEl.innerHTML=acItems.map((it,i)=>`<div class="${i?'':'sel'}" data-i="${i}"><span>${esc(it.v)}</span><small>${esc(it.d||'')}</small></div>`).join('');acEl.hidden=false;
    acEl.querySelectorAll('div').forEach(d=>d.onmousedown=e=>{e.preventDefault();applyCand(acItems[+d.dataset.i]);});}
  function update(){const v=inp.value;const parts=v.split(/\s+/);const c=resolve(parts[0]||'');
    sigEl.textContent=c?c.sig:'';
    let g='';if(v&&!/\s$/.test(v)){const cs=candidates(v);if(cs.length){const cur=cs[0].full?v.slice(v.indexOf(' ')+1):parts[parts.length-1];if(norm(cs[0].v).startsWith(norm(cur))&&cs[0].v.length>cur.length)g=v+cs[0].v.slice(cur.length);}}
    ghost.textContent=g;if(!acEl.hidden){const cs=candidates(v);cs.length?showAC(cs):hideAC();}}
  inp.addEventListener('input',update);
  inp.addEventListener('keydown',e=>{
    if(e.key==='`'||e.key==='F2')return;
    if(!acEl.hidden&&acItems.length){if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();acSel=(acSel+(e.key==='ArrowDown'?1:-1)+acItems.length)%acItems.length;acEl.querySelectorAll('div').forEach((d,i)=>d.classList.toggle('sel',i===acSel));return;}
      if(e.key==='Enter'||e.key==='Tab'){e.preventDefault();applyCand(acItems[acSel]);return;}if(e.key==='Escape'){hideAC();return;}}
    if(e.key==='Tab'){e.preventDefault();const cs=candidates(inp.value);if(cs.length===1)applyCand(cs[0]);else if(cs.length)showAC(cs);return;}
    if(e.key==='ArrowRight'&&ghost.textContent&&inp.selectionStart===inp.value.length){inp.value=ghost.textContent;update();return;}
    if(e.key==='ArrowUp'){e.preventDefault();if(hpos===HIST.length)draft=inp.value;if(hpos>0){hpos--;inp.value=HIST[hpos];update();}return;}
    if(e.key==='ArrowDown'){e.preventDefault();if(hpos<HIST.length){hpos++;inp.value=hpos===HIST.length?draft:HIST[hpos];update();}return;}
    if(e.key==='Escape'){if(running){running.stop=true;print('Protocolo detenido.','warn');}inp.value='';update();return;}
    if(e.key==='Enter'){const v=inp.value.trim();inp.value='';ghost.textContent='';hideAC();sigEl.textContent='';if(!v)return;
      if(!/^!\d+$/.test(v)&&HIST[HIST.length-1]!==v){HIST.push(v);if(HIST.length>200)HIST.shift();try{localStorage.setItem('dros-con-hist',JSON.stringify(HIST));}catch(_){}}hpos=HIST.length;exec(v);}
  });
  inp.addEventListener('blur',()=>setTimeout(hideAC,100));
  function bindClicks(root){}
  out.addEventListener('click',e=>{const n=e.target.closest('.nm');if(n){exec('info '+n.dataset.n);return;}const c=e.target.closest('.cmd');if(c){inp.value=c.dataset.c;inp.focus();update();}});
  $('conWatch').addEventListener('click',e=>{const c=e.target.closest('.cmd');if(c){inp.value=c.dataset.c;inp.focus();update();}});
  $('con').addEventListener('mouseup',()=>{if(!getSelection().toString())inp.focus();});
  /* ---------- pestaña de protocolos ---------- */
  let pSel=null;
  function drawProtos(){const L=$('pList');L.innerHTML=Object.keys(PROTOS).map(k=>`<div class="pitem${k===pSel?' sel':''}" data-k="${esc(k)}"><svg class="i sm"><use href="#i-file-text"/></svg><span style="flex:1">${esc(k)}</span><button class="ibtn" data-del="${esc(k)}" title="Borrar"><svg class="i sm"><use href="#i-trash-2"/></svg></button></div>`).join('')+
    `<button class="btn btn-ghost sm" id="pNew" style="width:100%;margin-top:6px"><svg class="i sm"><use href="#i-plus"/></svg>Nuevo</button>`;
    L.querySelectorAll('.pitem').forEach(d=>d.onclick=e=>{if(e.target.closest('[data-del]'))return;pSel=d.dataset.k;$('pName').value=pSel;$('pText').value=PROTOS[pSel];drawProtos();});
    L.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{if(!confirm('¿Borrar «'+b.dataset.del+'»?'))return;delete PROTOS[b.dataset.del];saveProtos();if(pSel===b.dataset.del)pSel=null;drawProtos();});
    $('pNew').onclick=()=>{pSel=null;$('pName').value='';$('pText').value='# Escribe un comando por línea\nactivar MN9\nluz roja on\nesperar 1 s\nluz roja off';$('pName').focus();drawProtos();};}
  $('pSave').onclick=()=>{const n=$('pName').value.trim()||'sin nombre';if(pSel&&pSel!==n)delete PROTOS[pSel];PROTOS[n]=$('pText').value;pSel=n;saveProtos();drawProtos();toastMini('Guardado');};
  $('pRun').onclick=()=>{const n=$('pName').value.trim()||'protocolo';openDrawer('con');print(`<span class="pr">mosca ›</span> <span class="in">ejecutar ${esc(n)}</span>`);runProto($('pText').value,n);};
  $('pText').addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();$('pRun').click();}if((e.ctrlKey||e.metaKey)&&e.key==='s'){e.preventDefault();$('pSave').click();}});
  function toastMini(t){const b=$('pSave');const o=b.innerHTML;b.innerHTML='<svg class="i sm"><use href="#i-check"/></svg>'+t;setTimeout(()=>b.innerHTML=o,1100);}
  function init(){
    print(`<b style="color:#FF4F93">Bitácora</b> <span class="dim">· ${N.toLocaleString('es-MX')} neuronas listas. Escribe</span> ${cm('ayuda')} <span class="dim">o prueba</span> ${cm('activar MN9')}`);
    drawWatch();drawProtos();const k=Object.keys(PROTOS)[0];if(k){pSel=k;$('pName').value=k;$('pText').value=PROTOS[k];drawProtos();}
  }
  return {init,event,tick,run:l=>exec(l),runProto,print,
    markChallenge(){mark=performance.now();},usedSince:c=>used.some(u=>u.c===c&&u.t>=mark),protoRanSince:()=>protoRanAt>=mark};
})();
