/* ============ RUTA DE APRENDIZAJE (estilo Duolingo) ============ */
const LEARN=(()=>{
  const KEY='dros-learn-v1';
  let S={xp:0,done:{},streak:{last:'',n:0}};
  try{S=Object.assign(S,JSON.parse(localStorage.getItem(KEY)||'{}'));}catch(e){}
  const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}};
  const today=()=>{const d=new Date();return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();};
  function bumpStreak(){const t=today();if(S.streak.last===t)return;const y=new Date();y.setDate(y.getDate()-1);const ys=y.getFullYear()+'-'+(y.getMonth()+1)+'-'+y.getDate();
    S.streak.n=S.streak.last===ys?S.streak.n+1:1;S.streak.last=t;}
  const MOTOR4=['CB0701','DNp01','MDN','DNa02'];
  const UNITS=[
   {t:'¿Qué es la optogenética?',c:'#B83A68',cp:'#8E2B50',ls:[
    {id:'t1',type:'teoria',ic:'book-open',title:'Neuronas y luz',xp:10,cards:[
      ['zap','Las neuronas hablan con espigas','Cada neurona acumula voltaje hasta un umbral y dispara una espiga. Las espigas viajan por sus conexiones y empujan (excitan) o frenan (inhiben) a otras neuronas. Este simulador tiene las 138 639 neuronas reales del cerebro de una mosca.'],
      ['leaf','Opsinas: interruptores de luz','Algunas algas tienen proteínas que abren un canal cuando les llega luz. Si ponemos esa proteína, una opsina, en una neurona, podemos encenderla o apagarla con luz. Eso es la optogenética.'],
      ['dna','¿Cómo se pone solo en unas neuronas?','En la mosca se usa el sistema GAL4/UAS: una línea GAL4 se expresa solo en un tipo de neurona y activa la copia de la opsina (UAS-opsina). Aquí lo haces eligiendo un tipo de neurona del catálogo.'],
      ['lightbulb','¿Por qué luz roja?','CsChrimson responde a la luz roja. La mosca casi no ve el rojo y esa luz atraviesa mejor la cutícula, así que la conducta que veas es por la opsina y no porque la mosca vio la luz.']]},
    {id:'q1',type:'quiz',ic:'circle-help',title:'Repaso rápido',xp:15,qs:[
      ['¿Qué hace una opsina activadora como CsChrimson cuando recibe su luz?',['Hace disparar a la neurona','Mata a la neurona','Hace que la mosca vea mejor'],0,'Abre un canal de cationes: la neurona se despolariza y dispara.'],
      ['¿Para qué sirve el sistema GAL4/UAS?',['Para poner la opsina solo en un tipo de neurona','Para encender la luz','Para medir el voltaje'],0,'GAL4 marca el tipo de neurona y UAS-opsina solo se expresa donde hay GAL4.'],
      ['¿Por qué se prefiere la luz roja en moscas?',['La mosca casi no la ve y penetra mejor','Es más barata','Activa a todas las neuronas'],0,'Así la conducta se debe a la opsina, no a que la mosca vio la luz.']]},
   ]},
   {t:'Activar neuronas',c:'#0E7C74',cp:'#095C56',ls:[
    {id:'r1',type:'reto',ic:'utensils',title:'Hambre de luz',xp:20,brief:'Haz que la mosca extienda la probóscide sin darle azúcar.',allow:{types:MOTOR4},
     hint:'Busca la motoneurona de la probóscide (MN9), ponle CsChrimson y enciende la luz roja.',goal:{kind:'hold',beh:'per',ms:300},
     explain:'MN9 es la motoneurona que mueve la probóscide. Activarla basta para la conducta, aunque no haya comida.'},
    {id:'r2',type:'reto',ic:'zap',title:'Botón de escape',xp:20,brief:'Haz que la mosca salte y escape sin ninguna sombra.',allow:{types:MOTOR4},
     hint:'Hay una sola neurona por lado, enorme y muy rápida: la fibra gigante (GF, DNp01).',goal:{kind:'trigger',beh:['escape','fly']},
     explain:'La fibra gigante es una neurona de comando: un solo disparo provoca el salto de escape.'},
    {id:'r3',type:'reto',ic:'undo-2',title:'Moonwalk',xp:20,brief:'Haz que la mosca camine hacia atrás durante medio segundo.',allow:{types:MOTOR4},
     hint:'Los investigadores la llamaron como el paso de baile de Michael Jackson.',goal:{kind:'hold',beh:'back',ms:500},
     explain:'MDN (moonwalker descending neuron) invierte el patrón de marcha (Bidaye y col., 2014).'},
    {id:'q2',type:'quiz',ic:'circle-help',title:'Colores y opsinas',xp:15,qs:[
      ['Pusiste CsChrimson en MDN y encendiste luz azul. ¿Qué pasa?',['Casi nada: CsChrimson responde poco al azul','Camina hacia atrás igual','Se queda ciega'],0,'Cada opsina tiene su espectro. CsChrimson prefiere rojo y ámbar.'],
      ['¿Qué luz enciende ChR2?',['Azul','Roja','Infrarroja'],0,'ChR2 se activa con azul, pero la mosca también ve el azul, y eso complica el experimento.'],
      ['Una neurona de comando es…',['Una neurona que por sí sola desencadena una conducta completa','Cualquier motoneurona','Una neurona sensorial'],0,'GF, MDN y MN9 son ejemplos.']]},
   ]},
   {t:'Silenciar neuronas',c:'#6A4FC9',cp:'#4E38A0',ls:[
    {id:'t3',type:'teoria',ic:'book-open',title:'Apagar con luz',xp:10,cards:[
      ['zap-off','GtACR1: el freno','GtACR1 es un canal de cloruro. Con luz verde o azul deja entrar cloruro y la neurona ya no puede disparar. En este modelo, una neurona silenciada pierde todas sus sinapsis, igual que en Shiu y col. (2024).'],
      ['microscope','Suficiente o necesaria','Si activar una neurona produce la conducta, la neurona es suficiente. Si silenciarla impide la conducta ante el estímulo natural, es necesaria. Las dos pruebas juntas dicen mucho más que una sola.']]},
    {id:'r4',type:'reto',ic:'zap-off',title:'Valiente',xp:25,brief:'Una sombra se acercará varias veces. Logra que la mosca NO escape de dos sombras seguidas.',allow:{types:['DNp01','MDN','CB0701','DNa02']},
     hint:'Silencia la fibra gigante con GtACR1 y enciende la luz verde antes de que llegue la sombra.',goal:{kind:'prevent',beh:['escape','fly'],ev:'loom',n:2,needSil:true},
     explain:'Sin GF ya no hay salto rápido: la fibra gigante es necesaria para el escape ante la sombra.'},
    {id:'r5',type:'reto',ic:'sparkles',title:'Antenas sucias',xp:25,brief:'Le van a tocar las antenas varias veces. Evita que se acicale en dos toques seguidos.',allow:{types:['DNg11','DNp01','CB0701','MDN']},
     hint:'¿Qué neurona descendente ordena limpiar las antenas? Busca “aDN”.',goal:{kind:'prevent',beh:['groom'],ev:'antena',n:2,needSil:true},
     explain:'DNg11 (aDN) es necesaria: sin ella el órgano de Johnston se activa, pero la orden no baja al cuerpo.'},
    {id:'r6',type:'reto',ic:'candy',title:'Ayuno',xp:25,brief:'La mosca está parada sobre azúcar. Evita que extienda la probóscide durante 2 segundos.',allow:{types:['CB0701','DNg11','MDN','LB3c']},
     hint:'Puedes silenciar la salida (MN9) o la entrada (las gustativas de azúcar LB3c). Las dos funcionan.',goal:{kind:'avoid',beh:'per',ms:2000,setup:'azucar',needSil:true},
     explain:'Silenciar cualquier eslabón de la cadena azúcar → GRN → … → MN9 corta la conducta.'},
   ]},
   {t:'Circuitos sensoriales',c:'#D08A1E',cp:'#A26A12',ls:[
    {id:'t4',type:'teoria',ic:'book-open',title:'Del sentido al músculo',xp:10,cards:[
      ['search','El catálogo','Las neuronas están ordenadas por superclase (sensoriales, centrales, descendentes…), clase y tipo celular, igual que en FlyWire. Puedes buscar por nombre o por función.'],
      ['activity','Activar el principio de la cadena','Si activas neuronas sensoriales con luz, la señal tiene que recorrer el cerebro de verdad hasta llegar a las neuronas de salida. Así puedes probar si un circuito funciona sin intervenir en la neurona final.']]},
    {id:'r7',type:'reto',ic:'utensils',title:'Sabor fantasma',xp:30,brief:'Haz que extienda la probóscide activando solo neuronas sensoriales.',allow:{supers:['sensory']},
     hint:'Busca “azúcar” en el catálogo: las gustativas LB3c.',goal:{kind:'hold',beh:'per',ms:300,needSuper:'sensory'},
     explain:'Las neuronas gustativas de azúcar bastan para activar todo el circuito hasta MN9. Es la predicción central de Shiu y col. (2024), confirmada en moscas reales.'},
    {id:'r8',type:'reto',ic:'feather',title:'Cosquillas de luz',xp:30,brief:'Haz que se acicale activando neuronas sensoriales de la antena.',allow:{supers:['sensory']},
     hint:'Busca “Johnston”. De los subtipos C y E (los que detectan el movimiento de la antena), solo uno basta por sí solo en el conectoma: pruébalos uno por uno. Empieza por los E dorsales (JO-ED…).',goal:{kind:'hold',beh:'groom',ms:300,needSuper:'sensory'},
     explain:'En el conectoma, JO-ED1 basta para activar a DNg11 (aDN), la descendente del acicalamiento antenal; los demás subtipos solos no alcanzan. El circuito JO-C/E → aBN1 → aDN lo describieron Hampel y col. (2015) y Shiu y col. (2024).'},
    {id:'r9',type:'reto',ic:'cloud-moon',title:'Sombra imaginaria',xp:30,brief:'Haz que escape activando neuronas visuales, no la fibra gigante.',allow:{supers:['visual_projection']},
     hint:'Hay neuronas de la lóbula que detectan objetos que se acercan: busca “looming”.',goal:{kind:'trigger',beh:['escape','fly'],needSuper:'visual_projection'},
     explain:'LPLC2 y LC4 detectan el crecimiento de una sombra y hacen sinapsis directa sobre la fibra gigante.'},
   ]},
   {t:'Retos de experto',c:'#D9443F',cp:'#AB2E2A',ls:[
    {id:'r10',type:'reto',ic:'rotate-ccw',title:'Gira a la derecha',xp:35,brief:'Haz que la mosca camine girando a la derecha al menos media vuelta.',allow:null,
     hint:'DNa02 hace girar hacia su propio lado. Elige el lado derecho en el selector.',goal:{kind:'turn',dir:-1,rad:Math.PI},
     explain:'Activar DNa02 de un solo lado crea una asimetría izquierda/derecha y la mosca gira hacia ese lado (Rayshubskiy y col., 2020).'},
    {id:'r11',type:'reto',ic:'microscope',title:'¿Necesaria?',xp:35,brief:'Sobre azúcar, impide la probóscide silenciando solo neuronas sensoriales.',allow:{supers:['sensory']},
     hint:'Si las neuronas que detectan el azúcar no hablan, el resto del circuito no se entera.',goal:{kind:'avoid',beh:'per',ms:2000,setup:'azucar',needSil:true,needSuper:'sensory'},
     explain:'Las gustativas LB3c son necesarias, no solo suficientes: sin ellas no hay respuesta al azúcar.'},
    {id:'r12',type:'reto',ic:'sliders-horizontal',title:'Dos colores',xp:40,brief:'Mientras pasan sombras, haz que camine hacia atrás durante 1 s sin escapar.',allow:null,
     hint:'Usa dos opsinas: CsChrimson (roja) en MDN y GtACR1 (verde) en la fibra gigante. Enciende ambas luces.',goal:{kind:'combo',ev:'loom',n:2,back:1000},
     explain:'Con dos opsinas de colores distintos puedes encender y apagar circuitos diferentes al mismo tiempo. Así se diseñan los experimentos reales.'},
    {id:'r13',type:'reto',ic:'target',title:'Explorador',xp:40,brief:'Activa con luz 3 tipos distintos de neuronas descendentes y observa qué hacen.',allow:{supers:['descending']},
     hint:'Hay casi 500 tipos descendentes. Prueba los que tengan descripción y luego algunos desconocidos.',goal:{kind:'explore',n:3,ms:500},
     explain:'Muchas descendentes no tienen función conocida. Mapear cuál produce qué conducta es un área activa de investigación, y con este modelo puedes generar hipótesis.'},
   ]},
   {t:'La consola',c:'#3B4A7A',cp:'#28335A',ls:[
    {id:'c1',type:'reto',ic:'square-terminal',title:'Hola, mosca',xp:25,brief:'Abre la consola ( ` ) y haz que extienda la probóscide solo con comandos.',allow:null,
     hint:'Escribe: activar MN9 · luego: luz roja on',goal:{kind:'hold',beh:'per',ms:300,via:'console'},
     explain:'Todo lo que haces con botones también se puede escribir. Así los experimentos se pueden repetir exactamente.'},
    {id:'c2',type:'reto',ic:'file-text',title:'Primer protocolo',xp:30,brief:'Escribe un protocolo que haga caminar hacia atrás a la mosca y ejecútalo.',allow:null,
     hint:'En Protocolos escribe: activar MDN · luz roja on · esperar 2 s · luz roja off. Guárdalo y pulsa Ejecutar.',goal:{kind:'hold',beh:'back',ms:500,via:'proto'},
     explain:'Un protocolo es un experimento escrito: se repite igual cada vez, como en un laboratorio de verdad.'},
   ]},
  ];
  const ALL=UNITS.flatMap(u=>u.ls.map(l=>Object.assign(l,{unit:u})));
  const unlocked=l=>{const i=ALL.indexOf(l);return i===0||!!S.done[ALL[i-1].id];};
  const level=()=>1+Math.floor(S.xp/100);
  /* ---------- ruta ---------- */
  const ico=(n,c)=>`<svg class="i ${c||''}"><use href="#i-${n}"/></svg>`;
  function stats(){const a=document.getElementById('stStreak'),b=document.getElementById('stXP');if(a)a.textContent=S.streak.n;if(b)b.textContent=S.xp;}
  function renderPath(){
    const el=document.getElementById('learnBody');if(!el)return;stats();
    let h='',firstCur=true;
    UNITS.forEach((u,ui)=>{const nd=u.ls.filter(l=>S.done[l.id]).length;
      h+=`<div class="unit" style="--uc:${u.c};--ucp:${u.cp}"><div class="uhead"><span class="un">${ui+1}</span><b>${u.t}</b><small>${nd}/${u.ls.length}</small></div>
        <div class="uprog"><i style="width:${nd/u.ls.length*100}%"></i></div><div class="path">`;
      u.ls.forEach((l,k)=>{const done=!!S.done[l.id],op=unlocked(l),cur=op&&!done&&firstCur;if(cur)firstCur=false;const off=[0,1,1.6,1,0,-1,-1.6,-1][k%8];
        h+=`<div class="pnode" style="--off:${off}"><button class="node${done?' done':cur?' current':op?'':' locked'}" data-id="${l.id}" ${op?'':'disabled'} aria-label="${l.title}">${ico(done?'check':op?l.ic:'lock')}</button><span class="pl">${l.title}</span>${cur?`<button class="btn btn-primary sm start" data-id="${l.id}">Empezar</button>`:''}</div>`;});
      h+='</div></div>';});
    el.innerHTML=h;
    el.querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>open(ALL.find(l=>l.id===b.dataset.id)));
    const cur=el.querySelector('.node.current');if(cur)setTimeout(()=>cur.scrollIntoView({block:'center',behavior:'smooth'}),60);
  }
  function resetProgress(){if(!confirm('¿Borrar todo tu progreso?'))return;S={xp:0,done:{},streak:{last:'',n:0}};save();renderPath();}
  /* ---------- lecciones (teoría y quiz) ---------- */
  let L=null,step=0,correct=0;
  const modal=()=>document.getElementById('lesson');
  function open(l){if(!l)return;if(l.type==='reto')return startChallenge(l);L=l;step=0;correct=0;modal().hidden=false;drawLesson();}
  function drawLesson(){const m=document.getElementById('lsBody');const tot=L.type==='teoria'?L.cards.length:L.qs.length;
    document.getElementById('lsBar').style.width=(step/tot*100)+'%';
    if(step>=tot){return finish(L,L.type==='quiz'?correct/tot:1);}
    if(L.type==='teoria'){const [ic,t,d]=L.cards[step];m.innerHTML=`<div class="lcard"><div class="lic">${ico(ic)}</div><h3>${t}</h3><p>${d}</p></div><div class="lfoot"><button class="btn btn-primary lg" id="lsNext">${step===tot-1?'Terminar':'Continuar'}</button></div>`;
      m.querySelector('#lsNext').onclick=()=>{step++;drawLesson();};}
    else{const [q,opts,ok,ex]=L.qs[step];const order=opts.map((o,i)=>i).sort(()=>Math.random()-.5);
      m.innerHTML=`<div class="lcard"><h3>${q}</h3><div class="opts">${order.map(i=>`<button class="opt" data-i="${i}">${opts[i]}</button>`).join('')}</div><p class="fb" id="fb" hidden></p></div><div class="lfoot"><button class="btn btn-primary lg" id="lsNext" disabled>Comprobar</button></div>`;
      let pick=null;m.querySelectorAll('.opt').forEach(b=>b.onclick=()=>{if(m.dataset.lock)return;pick=+b.dataset.i;m.querySelectorAll('.opt').forEach(x=>x.classList.toggle('sel',x===b));m.querySelector('#lsNext').disabled=false;});
      m.dataset.lock='';
      m.querySelector('#lsNext').onclick=e=>{if(!m.dataset.lock){e.currentTarget.className='btn lg '+(pick===ok?'btn-ok':'btn-primary');m.dataset.lock='1';const good=pick===ok;if(good)correct++;
          m.querySelectorAll('.opt').forEach(x=>{const i=+x.dataset.i;if(i===ok)x.classList.add('good');else if(i===pick)x.classList.add('bad');});
          const fb=m.querySelector('#fb');fb.hidden=false;fb.className='fb '+(good?'good':'bad');fb.innerHTML=`<b>${good?'¡Correcto!':'Casi.'}</b> `+ex;e.currentTarget.textContent='Continuar';}
        else{step++;drawLesson();}};}
  }
  document.getElementById('lsClose').onclick=()=>{modal().hidden=true;};
  function finish(l,score){modal().hidden=true;const first=!S.done[l.id];const xp=first?Math.round(l.xp*(.5+.5*score)):5;S.xp+=xp;S.done[l.id]=Math.max(S.done[l.id]||0,score);bumpStreak();save();
    celebrate(l,xp,l.type==='quiz'?`Acertaste ${Math.round(score*100)}%`:'',l.explain||'');renderPath();}
  function celebrate(l,xp,sub,ex){const w=document.getElementById('win');w.hidden=false;stats();
    document.getElementById('winT').textContent=l.type==='reto'?'¡Reto superado!':'¡Lección lista!';
    document.getElementById('winXP').textContent='+'+xp+' XP';document.getElementById('winEx').textContent=sub?sub+' · '+ex:ex;
    if(typeof log==='function')log('win',`${l.title} superado · +${xp} XP`,'#30A46C');
    const cf=document.getElementById('confetti');cf.innerHTML=Array.from({length:46},(_,k)=>`<i style="left:${Math.random()*100}%;background:${['#E5484D','#F5A524','#30A46C','#3E63DD','#B83A68'][k%5]};animation-delay:${Math.random()*.4}s;transform:rotate(${Math.random()*360}deg)"></i>`).join('');
    setTimeout(()=>cf.innerHTML='',2600);}
  document.getElementById('winOk').onclick=()=>{document.getElementById('win').hidden=true;setPanel('learn');renderPath();};
  /* ---------- retos ---------- */
  let CH=null;
  function startChallenge(l,comp){
    resetWorld();LAB.reset();LAB.setRestrict(comp&&comp.hard&&l.allow&&l.allow.types?null:l.allow);
    CH={l,comp:comp||null,hintSeen:false,t0:simT,acc:0,ok:false,ev:0,evOk:0,evWindow:null,nextEv:simT+1800,turn:0,lastH:fly.h,backAcc:0,explored:{},lastSig:''};
    if(l.goal.setup==='azucar')setTimeout(()=>placeStim('azucar',-1.85,0,1,true),100);
    setPanel('lab');drawCard();const h=document.getElementById('hint');if(h)h.style.opacity=0;if(typeof CONSOLE!=='undefined')CONSOLE.markChallenge();if(l.goal.via==='console')openDrawer('con');if(l.goal.via==='proto')openDrawer('proto');
  }
  function stopChallenge(){CH=null;LAB.setRestrict(null);drawCard();}
  function restartChallenge(){if(!CH)return;const l=CH.l,comp=CH.comp,hs=CH.hintSeen;if(comp)tel('error',{type:'reinicio'});startChallenge(l,comp);CH.hintSeen=hs;if(hs)drawCard();if(comp&&comp.onRestart)comp.onRestart();}
  function drawCard(){const el=document.getElementById('chCard');
    if(!CH){el.innerHTML='';el.hidden=true;return;}const l=CH.l;el.hidden=false;
    const C=CH.comp;
    if(C){el.innerHTML=`<div class="ch comp" style="border-color:${l.unit.c}"><div class="chh"><span class="chi" style="color:${l.unit.c}">${ico(l.ic)}</span><div class="cht"><small>Reto ${C.i+1} de ${C.n}</small><b>${l.title}</b></div>
        <span class="ctimer" id="cTimer">--:--</span></div>
        <p>${l.brief}</p><div class="progress"><i id="chProg"></i></div><div class="chmsg" id="chMsg"></div><div class="chhint" id="chHintT" ${CH.hintSeen?'':'hidden'}>${l.hint}</div>
        <div class="crow"><button class="btn btn-secondary sm" id="chHint" ${CH.hintSeen?'disabled':''}>${ico('lightbulb','sm')}${CH.hintSeen?'Pista usada':'Pista'+(C.penHint?` · +${C.penHint} s`:'')}</button>
        <button class="btn btn-ghost sm" id="chRe">${ico('rotate-ccw','sm')}Reiniciar</button><span style="flex:1"></span><button class="btn btn-ghost sm" id="chSkip">Saltar${ico('chevron-right','sm')}</button></div></div>`;
      el.querySelector('#chHint').onclick=()=>{if(CH.hintSeen)return;if(C.penHint&&!confirm(`La pista suma ${C.penHint} s a tu tiempo. ¿Verla?`))return;CH.hintSeen=true;tel('hint',{});drawCard();};
      el.querySelector('#chRe').onclick=restartChallenge;el.querySelector('#chSkip').onclick=()=>{if(confirm('¿Saltar este reto? Cuenta como no resuelto.'))C.onSkip();};return;}
    el.innerHTML=`<div class="ch" style="border-color:${l.unit.c}"><div class="chh"><span class="chi" style="color:${l.unit.c}">${ico(l.ic)}</span><b>${l.title}</b>
      <button class="ibtn" id="chHint" data-tip="Pista">${ico('lightbulb','sm')}</button><button class="ibtn" id="chRe" data-tip="Reiniciar">${ico('rotate-ccw','sm')}</button><button class="ibtn" id="chX" data-tip="Salir">${ico('x','sm')}</button></div>
      <p>${l.brief}</p><div class="progress"><i id="chProg"></i></div><div class="chmsg" id="chMsg"></div><div class="chhint" id="chHintT" hidden>${l.hint}</div></div>`;
    el.querySelector('#chX').onclick=stopChallenge;el.querySelector('#chHint').onclick=()=>{const t=el.querySelector('#chHintT');t.hidden=!t.hidden;};
    el.querySelector('#chRe').onclick=restartChallenge;}
  const targetsOK=(list,need)=>list.some(c=>!need||(c.target&&c.target.sc===need));
  function tick(dt){ // dt en ms simulados
    if(!CH||CH.ok)return;const g=CH.l.goal;let prog=0,msg='';
    const acts=LAB.activeActivators(),sils=LAB.activeSilencers();
    // eventos programados
    if(g.ev&&simT>=CH.nextEv){CH.nextEv=simT+3500;CH.evWindow={t:simT,bad:false};if(g.ev==='loom')doLoom(-1);else antT=simT+1200;}
    const inEv=CH.evWindow&&simT-CH.evWindow.t<1800;
    if(CH.evWindow&&inEv&&[].concat(g.beh||['escape','fly']).includes(behavior))CH.evWindow.bad=true;
    if(CH.evWindow&&!inEv){const okEv=!CH.evWindow.bad&&(!g.needSil||sils.length);CH.evOk=okEv?CH.evOk+1:0;CH.evWindow=null;}
    switch(g.kind){
      case 'hold':{const viaOK=!g.via||(typeof CONSOLE!=='undefined'&&(g.via==='console'?CONSOLE.usedSince('activar')&&CONSOLE.usedSince('luz'):CONSOLE.protoRanSince()));const okNow=behavior===g.beh&&acts.length&&targetsOK(acts,g.needSuper)&&viaOK;CH.acc=okNow?CH.acc+dt:Math.max(0,CH.acc-dt*.5);prog=CH.acc/g.ms;
        msg=g.via&&!viaOK?(g.via==='console'?'Hazlo escribiendo en la consola.':'Ejecuta un protocolo.'):!LAB.constructs.length?'Elige neuronas abajo.':!LAB.anyLight()?'Enciende una luz.':!acts.length?'Esa luz no activa tu opsina. Prueba otro color.':behavior!==g.beh?'Todavía no… prueba otras neuronas.':'¡Así! Mantenlo…';break;}
      case 'trigger':{if(g.beh.includes(behavior)&&acts.length&&targetsOK(acts,g.needSuper))CH.acc=1;prog=CH.acc;
        msg=!acts.length?'Activa alguna neurona con luz.':'Observa la mosca…';break;}
      case 'prevent':{prog=CH.evOk/g.n;msg=CH.evWindow?(CH.evWindow.bad?'¡Ups! Respondió. Ajusta tu diagrama.':'Llegó el estímulo…'):`Estímulos superados seguidos: ${CH.evOk}/${g.n}`+(g.needSil&&!sils.length?' · Necesitas silenciar algo con luz.':'');break;}
      case 'avoid':{const okNow=behavior!==g.beh&&sils.length&&targetsOK(sils,g.needSuper)&&simT-CH.t0>600;CH.acc=okNow?CH.acc+dt:0;prog=CH.acc/g.ms;
        msg=!sils.length?'Silencia alguna neurona con luz (opsina GtACR).':behavior===g.beh?'Sigue comiendo… prueba otras neuronas.':'Bien, aguanta…';break;}
      case 'turn':{const dh=((fly.h-CH.lastH+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI;CH.lastH=fly.h;if(behavior==='walk'&&acts.length)CH.turn+=dh*g.dir;prog=Math.max(0,CH.turn)/g.rad;
        msg=behavior!=='walk'?'Haz que camine…':CH.turn<0?'Gira hacia el otro lado.':'Girando…';break;}
      case 'combo':{if(behavior==='back')CH.backAcc+=dt;prog=Math.min(1,CH.evOk/g.n)*.5+Math.min(1,CH.backAcc/g.back)*.5;
        msg=`Sombras sin escapar: ${CH.evOk}/${g.n} · Retroceso: ${(CH.backAcc/1000).toFixed(1)}/${g.back/1000} s`;break;}
      case 'explore':{for(const c of acts)if(c.target&&c.target.sc==='descending'&&c.target.kind==='type'){CH.explored[c.target.key]=(CH.explored[c.target.key]||0)+dt;}
        const n=Object.values(CH.explored).filter(v=>v>=g.ms).length;prog=n/g.n;msg=`Tipos explorados: ${n}/${g.n}`+(Object.keys(CH.explored).length?` · ${Object.keys(CH.explored).join(', ')}`:'');break;}
    }
    prog=Math.max(0,Math.min(1,prog));
    const p=document.getElementById('chProg'),m=document.getElementById('chMsg');if(p)p.style.width=prog*100+'%';if(m&&m.textContent!==msg)m.textContent=msg;CH.prog=prog;
    if(prog>=1){CH.ok=true;const l=CH.l;if(CH.comp){const C=CH.comp;setTimeout(()=>C.onWin(),400);return;}setTimeout(()=>{const first=!S.done[l.id];const xp=first?l.xp:5;S.xp+=xp;S.done[l.id]=1;bumpStreak();save();celebrate(l,xp,'',l.explain);stopChallenge();renderPath();},600);}
  }
  return {init:renderPath,tick,renderPath,resetProgress,stop:stopChallenge,startComp:(id,comp)=>{const l=ALL.find(x=>x.id===id);if(l)startChallenge(l,comp);return l;},get ch(){return CH;},start:id=>open(ALL.find(l=>l.id===id)),get current(){return CH&&CH.l;},list:()=>ALL,get active(){return !!CH;},get won(){return CH&&CH.ok;}};
})();
