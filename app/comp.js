/* ============ COMPETENCIA · modo equipo ============ */
const COMP=(()=>{
  const $=id=>document.getElementById(id);
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const ic=(n,c)=>`<svg class="i ${c||''}"><use href="#i-${n}"/></svg>`;
  const mmss=ms=>{ms=Math.max(0,ms);const s=Math.floor(ms/1000);return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');};
  const LS='dros-comp-v1';let saved={};try{saved=JSON.parse(localStorage.getItem(LS)||'{}')||{};}catch(e){}
  const persist=()=>{try{localStorage.setItem(LS,JSON.stringify(saved));}catch(e){}};
  /* ---------- red: Electron (IPC) o navegador ---------- */
  const E=window.drosoNet||null;
  const sortRooms=l=>l.slice().sort((a,b)=>(a.phase==='lobby'?0:1)-(b.phase==='lobby'?0:1)||b.at-a.at);
  const NET=E?{
    req:async(m,u,b)=>{const r=await E.req(m,u,b);return {status:r.status,json:r.json,error:r.error};},
    sse:(u,on)=>E.sse(u,(ev,d)=>on(ev,d)),
  }:{
    req:async(m,u,b)=>{try{const r=await fetch(u,{method:m,headers:b?{'Content-Type':'application/json'}:{},body:b?JSON.stringify(b):undefined});let j=null;try{j=await r.json();}catch(_){}return {status:r.status,json:j};}catch(e){return {status:0,error:String(e)};}},
    sse:(u,on)=>{const s=new EventSource(u);for(const ev of['state','end','reset','kick'])s.addEventListener(ev,e=>on(ev,e.data));s.onopen=()=>on('open',{});s.onerror=()=>on('error',{});return ()=>s.close();},
  };
  /* ---------- estado ---------- */
  let url=null,token=null,myId=null,S=null,off=0,closeSSE=null,online=false;
  let phase='off';// off | lobby | count | reto | between | finished | ended
  let cur=-1,retoStart=0,nextAt=0,nextFn=null,queue=[],q=saved.q||0,lastBeat=0,lastErr={},stopDisc=null,rooms=[],selRoom=null;
  const nowS=()=>Date.now()+off;
  const elapsed=()=>S&&S.startAt?nowS()-S.startAt:0;
  const me=()=>S&&S.teams.find(t=>t.id===myId);
  const inComp=()=>['count','reto','between','finished'].includes(phase);
  /* ---------- telemetría ---------- */
  function push(k,d){if(!token||!S||S.phase!=='running')return;const {c,...rest}=d||{};queue.push(Object.assign({q:++q,k,i:cur>=0?cur:undefined,e:Math.round(elapsed())},rest));saved.q=q;if(q%10===0)persist();}
  function addError(type,detail){const key=type+'|'+(detail||'');const t=performance.now();if(lastErr[key]&&t-lastErr[key]<3000)return;lastErr[key]=t;push('error',{type,d:detail});flashPenalty();}
  function tel(k,d){if(!inComp())return;
    if(k==='error'){addError(d.type,d.d);return;}
    push(k,d);
    if(phase!=='reto')return;
    if(k==='light'&&d.on){const cs=LAB.constructs.filter(c=>c.target&&c.list.length);if(cs.length&&!cs.some(c=>OPSINS[c.opsin].s[d.lk]>=.5))addError('luz','luz '+d.color);}
    if((k==='remove'||k==='opsin')&&d.c&&d.c._eff>=1000)addError('intento',d.target);
  }
  function flashPenalty(){const p=S&&S.config.pen.err;const el=$('cTimer');if(!el||!p)return;el.dataset.pen='+'+p+' s';el.classList.add('pen');setTimeout(()=>el.classList.remove('pen'),1300);}
  const ACT=['hold','trigger','turn','explore'],SIL=['prevent','avoid'];
  function tick(dt){if(phase!=='reto'||!LEARN.ch)return;const g=LEARN.ch.l.goal;
    for(const c of LAB.activeActivators().concat(LAB.activeSilencers())){c._eff=(c._eff||0)+dt;
      if(!c._mode&&c._eff>300){c._mode=true;const act=OPSINS[c.opsin].act;if((ACT.includes(g.kind)&&!act)||(SIL.includes(g.kind)&&act))addError('modo',`${c.opsin} en ${c.target.label}`);}}}
  async function flush(){if(!token||!url)return;const t=performance.now();if(!queue.length&&t-lastBeat<2000)return;lastBeat=t;
    const evs=queue.slice(0,200);const ch=LEARN.ch;
    const r=await NET.req('POST',url+'/api/ev',{token,evs,st:{prog:ch&&ch.comp?ch.prog||0:0,retoT:phase==='reto'?nowS()-retoStart:0}});
    if(r.status===200){queue.splice(0,evs.length);setOnline(true);}else if(r.status===401){disconnect('El organizador te quitó de la competencia.');}else setOnline(false);}
  setInterval(flush,1000);
  /* ---------- conexión ---------- */
  function normUrl(s){s=String(s||'').trim();if(!s)return null;if(!/^https?:\/\//.test(s))s='http://'+s;try{const u=new URL(s);if(!u.port)u.port='7777';return u.origin;}catch(e){return null;}}
  async function join(base,name,quiet){
    const r=await NET.req('POST',base+'/api/join',{name,token:saved.url===base?saved.token:undefined});
    if(r.status!==200){if(!quiet)showErr(r.json&&r.json.error||'No pude conectar. Revisa la dirección y que estén en la misma red.');return false;}
    url=base;token=r.json.token;myId=r.json.id;saved={url,token,name:r.json.name,id:myId,q};persist();
    if(closeSSE)closeSSE();closeSSE=NET.sse(url+'/api/stream?token='+encodeURIComponent(token),onMsg);
    onState(r.json.state);if(phase==='off')phase='lobby';updateChip();if(!quiet)log('win',`Te uniste a «${r.json.state.name}» como ${r.json.name}`,r.json.color);return true;}
  function onMsg(ev,data){
    if(ev==='state'){try{onState(JSON.parse(data));}catch(e){}setOnline(true);}
    else if(ev==='open')setOnline(true);else if(ev==='error')setOnline(false);
    else if(ev==='kick')disconnect('El organizador te quitó de la competencia.');}
  function setOnline(v){if(online!==v){online=v;updateChip();}}
  function disconnect(msg){if(closeSSE)closeSSE();closeSSE=null;if(inComp())cleanupComp();url=null;token=null;myId=null;S=null;phase='off';saved.token=null;persist();queue=[];
    $('clb').hidden=true;updateChip();if(msg)showMsg('Competencia',msg,'bad',3500);}
  /* ---------- máquina de estados ---------- */
  function onState(st){const prev=S;S=st;off=S.now-Date.now();
    if(!me()&&token){/* el servidor ya no nos conoce */}
    if(S.phase==='running'&&(phase==='off'||phase==='lobby'||phase==='ended'))enterRunning();
    else if(S.phase==='ended'&&phase!=='ended'&&phase!=='off')enterEnded();
    else if(S.phase==='lobby'&&phase!=='lobby'&&phase!=='off')enterLobby();
    renderLB();updateChip();if(!$('cdlg').hidden&&dlgMode==='in')renderDlg();}
  function lockUI(on){$('nav').style.display=on?'none':'';if(on){setPanel('lab');$('lesson').hidden=true;$('win').hidden=true;}}
  function enterRunning(){if(LEARN.ch)LEARN.stop();lockUI(true);closeDlg();const m=me();
    if(m&&m.finished){phase='finished';cur=S.retos.length;lockUI(false);return;}
    cur=m?m.cur:0;if(nowS()<S.startAt){phase='count';}else startReto(cur);}
  function startReto(i){const N=S.retos.length;if(i>=N)return finish();cur=i;const R=S.retos[i];
    const l=LEARN.startComp(R.id,{i,n:N,hard:S.config.hard,penHint:S.config.pen.hint,onWin,onSkip});
    if(!l){push('skip',{t:0,why:'reto desconocido'});return startReto(i+1);}
    worker.postMessage({type:'seed',seed:(S.config.seed+i*7919)>>>0});
    retoStart=nowS();phase='reto';lastErr={};push('reto',{id:R.id});updateChip();}
  function next(ms,fn){nextAt=performance.now()+ms;nextFn=fn;phase='between';}
  function onWin(){if(phase!=='reto')return;const t=nowS()-retoStart;push('win',{t});LEARN.stop();
    const c=document.getElementById('confetti');c.innerHTML=Array.from({length:36},(_,k)=>`<i style="left:${Math.random()*100}%;background:${['#E5484D','#F5A524','#30A46C','#3E63DD','#B83A68'][k%5]};animation-delay:${Math.random()*.3}s"></i>`).join('');setTimeout(()=>c.innerHTML='',2400);
    showMsg('¡Resuelto!',mmss(t)+(cur+1<S.retos.length?' · siguiente reto…':''),'ok',2100);next(2200,()=>startReto(cur+1));flush();}
  function onSkip(){if(phase!=='reto')return;push('skip',{t:nowS()-retoStart});LEARN.stop();showMsg('Saltado','',null,1100);next(1200,()=>startReto(cur+1));flush();}
  function onTimeout(){push('timeout',{t:S.config.limit*1000});LEARN.stop();showMsg('Se acabó el tiempo','Vamos al siguiente','bad',2100);next(2200,()=>startReto(cur+1));flush();}
  function finish(){phase='finished';cur=S.retos.length;LEARN.stop();worker.postMessage({type:'seed',seed:null});lockUI(false);flush();
    const m=me();showMsg('¡Terminaste!',m?`Vas en ${m.pos}º lugar · espera al resto`:'Espera al resto','ok',4000);updateChip();}
  function cleanupComp(){if(LEARN.ch&&LEARN.ch.comp)LEARN.stop();worker.postMessage({type:'seed',seed:null});lockUI(false);$('cbig').hidden=true;nextFn=null;}
  function enterEnded(){const was=inComp();cleanupComp();phase='ended';flush();if(was||token)openFinal();updateChip();}
  function enterLobby(){cleanupComp();phase='lobby';cur=-1;$('clb').hidden=true;updateChip();showMsg('Nueva ronda','Espera a que el organizador la inicie',null,2500);}
  /* ---------- reloj (independiente de la simulación) ---------- */
  setInterval(()=>{if(!S)return;const now=nowS();
    if(phase==='count'){const d=S.startAt-now;const b=$('cbig');b.hidden=false;const txt=d>0?String(Math.ceil(d/1000)):'¡Ya!';if(b.textContent!==txt){b.textContent=txt;b.classList.remove('go');void b.offsetWidth;b.classList.add('go');}
      if(d<=0){setTimeout(()=>b.hidden=true,700);startReto(cur<0?0:cur);}}
    if(phase==='reto'){const left=S.config.limit*1000-(now-retoStart);const el=$('cTimer');if(el){const s=mmss(left);if(el.textContent!==s&&!el.classList.contains('pen'))el.textContent=s;el.classList.toggle('low',left<30000);if(el.classList.contains('pen'))el.textContent=el.dataset.pen;}
      if(left<=0)onTimeout();}
    if(phase==='between'&&nextFn&&performance.now()>=nextAt){const f=nextFn;nextFn=null;f();}
    const ck=$('clbClock');if(ck&&S.phase==='running')ck.textContent=mmss(now-S.startAt);
  },200);
  /* ---------- interfaz: clasificación, chip, mensajes ---------- */
  function renderLB(){const el=$('clb');if(!S||S.phase==='lobby'||phase==='off'){el.hidden=true;return;}el.hidden=false;
    el.innerHTML=`<h6>${ic('trophy','sm')}Clasificación<span id="clbClock">${S.phase==='ended'?'final':mmss(nowS()-S.startAt)}</span></h6>`+
      S.teams.map(t=>`<div class="r${t.id===myId?' me':''}" style="--c:${t.color}"><span class="p">${t.pos}</span><span class="d"></span><span class="nm">${esc(t.name)}</span><span class="s">${t.solved}</span><span class="t">${mmss(t.time)}</span></div>`).join('');}
  function updateChip(){const c=$('compChip');if(phase==='off'||!S){c.hidden=true;return;}const m=me();c.hidden=false;c.style.setProperty('--c',m?m.color:'var(--accent)');
    const st=!online?'sin conexión':phase==='lobby'?'esperando inicio':phase==='count'?'¡prepárate!':phase==='reto'||phase==='between'?`reto ${Math.min(cur+1,S.retos.length)}/${S.retos.length}`+(m?` · ${m.pos}º`:''):phase==='finished'?(m?`terminaste · ${m.pos}º`:'terminaste'):phase==='ended'?(m?`final · ${m.pos}º`:'final'):'';
    c.innerHTML=`<span class="dot"></span>${esc(saved.name||'')} · ${st}`;}
  let msgT=null;
  function showMsg(title,sub,kind,ms){const el=$('cmsg');el.className='cmsg'+(kind?' '+kind:'');el.innerHTML=`<b>${esc(title)}</b>${sub?`<span>${esc(sub)}</span>`:''}`;el.hidden=false;clearTimeout(msgT);msgT=setTimeout(()=>el.hidden=true,ms||2000);}
  /* ---------- diálogo ---------- */
  let dlgMode='join';
  function openDlg(){$('cdlg').hidden=false;dlgMode=token?'in':'join';renderDlg();if(E&&!token&&!stopDisc)stopDisc=E.discover(list=>{rooms=sortRooms(list);if(dlgMode==='join')renderRooms();});}
  function closeDlg(){$('cdlg').hidden=true;if(stopDisc){stopDisc();stopDisc=null;}}
  function showErr(t){const e=$('cErr');if(e)e.textContent=t;}
  function renderRooms(){const box=$('cRooms');if(!box)return;
    if(!E){box.innerHTML='';return;}
    box.innerHTML=rooms.length?rooms.map(r=>`<button class="room" data-u="${esc(r.url)}" aria-pressed="${selRoom===r.url}"><span class="pulse"></span><div style="flex:1"><b>${esc(r.name)}</b><small>${r.address}${r.port!==7777?':'+r.port:''} · ${r.teams}/${r.max} equipos${r.phase==='running'?' · en curso':r.phase==='ended'?' · terminada':''}</small></div></button>`).join('')
      :`<div class="searching">${ic('search','sm')}Buscando salas en esta red…</div>`;
    box.querySelectorAll('.room').forEach(b=>b.onclick=()=>{selRoom=b.dataset.u;$('cAddr').value=new URL(selRoom).host;renderRooms();$('cName').focus();});
    if(rooms.length===1&&!selRoom&&!$('cAddr').value){selRoom=rooms[0].url;$('cAddr').value=new URL(selRoom).host;renderRooms();}}
  function renderDlg(){const b=$('cbox');
    if(dlgMode==='in'&&S){const m=me();
      b.innerHTML=`<h3>${ic('trophy','lg')}${esc(S.name)}<span class="sp"></span><button class="ibtn" id="cX">${ic('x')}</button></h3>
        <p class="sub">Estás como <b style="color:${m?m.color:'inherit'}">${esc(saved.name)}</b>. ${S.phase==='lobby'?'La competencia empieza cuando el organizador la inicie.':S.phase==='running'?'La competencia está en curso.':'La competencia terminó.'}</p>
        <div class="cfinal">${S.teams.map(t=>`<div class="r${t.id===myId?' me':''}" style="--c:${t.color}"><span class="p">${S.phase==='lobby'?'':t.pos}</span><span class="d"></span><span>${esc(t.name)}</span><span>${S.phase==='lobby'?(t.online?'listo':'…'):t.solved+' retos'}</span><span class="t">${S.phase==='lobby'?'':mmss(t.time)}</span></div>`).join('')}</div>
        <p class="muted" style="font-size:13.5px">${S.retos.length} retos · máx. ${Math.round(S.config.limit/60)} min cada uno · error +${S.config.pen.err} s · pista +${S.config.pen.hint} s</p>
        <div class="cfoot"><button class="btn btn-ghost" id="cLeave">Salir de la competencia</button><span class="sp"></span><button class="btn btn-primary" id="cOk">Listo</button></div>`;
      $('cX').onclick=closeDlg;$('cOk').onclick=closeDlg;$('cLeave').onclick=()=>{if(confirm('¿Salir? Tu equipo quedará sin conexión.')){disconnect();closeDlg();}};return;}
    b.innerHTML=`<h3>${ic('trophy','lg')}Competencia<span class="sp"></span><button class="ibtn" id="cX">${ic('x')}</button></h3>
      <p class="sub">Únete a la sala de tu clase. Todos deben estar en la misma red WiFi.</p>
      <div class="rooms" id="cRooms"></div>
      <label class="f">${E?'O escribe la dirección que aparece en el tablero':'Dirección que aparece en el tablero'}<input type="text" id="cAddr" placeholder="192.168.1.20" value="${esc(saved.url?new URL(saved.url).host:'')}"></label>
      <label class="f">Nombre del equipo<input type="text" id="cName" maxlength="28" placeholder="Los Ajolotes" value="${esc(saved.name||'')}"></label>
      <div class="cerr" id="cErr"></div>
      <div class="cfoot"><span class="sp"></span><button class="btn btn-secondary" id="cCancel">Cancelar</button><button class="btn btn-primary" id="cJoin">${ic('arrow-right','sm')}Unirse</button></div>
      ${E?`<div class="orgz">${ic('sliders-horizontal','sm')}<span style="flex:1">¿Tú organizas? Esta compu será el servidor y abrirá el tablero para proyectar.</span><button class="btn btn-secondary sm" id="cHost">Organizar</button></div>`:''}`;
    renderRooms();$('cX').onclick=closeDlg;$('cCancel').onclick=closeDlg;
    const go=async()=>{const u=normUrl($('cAddr').value)||selRoom;const n=$('cName').value.trim();if(!u)return showErr('Elige una sala o escribe la dirección.');if(!n)return showErr('Ponle nombre a tu equipo.');
      $('cJoin').disabled=true;showErr('');const ok=await join(u,n);$('cJoin').disabled=false;if(ok){dlgMode='in';renderDlg();if(stopDisc){stopDisc();stopDisc=null;}}};
    $('cJoin').onclick=go;$('cName').onkeydown=e=>{if(e.key==='Enter')go();};
    if(E)$('cHost').onclick=async()=>{const r=await E.host({});if(r&&r.port){showErr('');$('cHost').textContent='Tablero abierto';$('cHost').disabled=true;}};}
  function openFinal(){if(!S)return;$('cdlg').hidden=false;dlgMode='in';renderDlg();}
  $('cdlg').addEventListener('mousedown',e=>{if(e.target.id==='cdlg')closeDlg();});
  /* ---------- inicio ---------- */
  function init(){$('mComp').onclick=()=>{$('menu').hidden=true;openDlg();};$('compChip').onclick=openDlg;
    const style=document.createElement('style');style.textContent='.ctimer.pen{background:var(--err);color:#fff}';document.head.appendChild(style);
    if(saved.url&&saved.token&&saved.name)join(saved.url,saved.name,true);}
  return {init,tick,tel,open:openDlg,get phase(){return phase;},get state(){return S;},_join:join,_disconnect:disconnect};
})();
