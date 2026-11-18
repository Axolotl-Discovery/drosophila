/* ============ TUTORIAL DE BIENVENIDA ============
   Se muestra la primera vez que se abre la aplicación (y desde el menú → «Ver tutorial»).
   Recorre los botones principales y termina con un experimento pequeño: azúcar → probóscide. */
const TOUR=(()=>{
  const KEY='dros-tour-v1';
  const STEPS=[
    {t:'¡Bienvenido!',d:'Esta mosca tiene un cerebro completo: 138 639 neuronas reales conectadas como en el conectoma FlyWire. Lo que hace sale de simular ese cerebro. Te enseño los botones en un minuto.'},
    {sel:'#dock',t:'Estímulos',d:'Elige un estímulo y haz clic en el arenero para colocarlo cerca de la mosca. Arrástralo para moverlo; con clic lo seleccionas y cambias su intensidad. «Vaciar» los quita todos.'},
    {sel:'#pill',t:'¿Qué hace la mosca?',d:'Aquí ves su conducta y la cadena de neuronas que la causa. Haz clic en esta píldora para leer la explicación.'},
    {sel:'#pip',t:'El cerebro',d:'Cada punto es una neurona. Las que disparan se encienden en rosa. Puedes girarlo y agrandarlo.',skipHidden:true},
    {sel:'#nav',t:'Aprender y Laboratorio',d:'En «Aprender» están las lecciones y los retos. En «Laboratorio» pones opsinas en neuronas y las controlas con luces de colores.'},
    {sel:'#pauseBtn',t:'Pausa y velocidad',d:'Pausa la simulación con este botón o con la barra espaciadora. Al lado puedes ver la velocidad y reiniciar la actividad.'},
    {sel:'#conBtn',t:'Consola',d:'Todo lo que haces con botones también se puede escribir aquí. Escribe «ayuda» para ver los comandos.'},
    {sel:'.dk[data-t="azucar"]',t:'Tu primer experimento',d:'Pon azúcar justo delante de la cabeza de la mosca: elige «Azúcar» y haz clic en el piso frente a ella.',exp:true},
  ];
  let i=-1,el=null,spot=null,card=null,done=false,tick=null;
  const seen=()=>{try{return localStorage.getItem(KEY)==='1';}catch(e){return false;}};
  const mark=()=>{try{localStorage.setItem(KEY,'1');}catch(e){}};
  function css(){if(document.getElementById('tourCss'))return;const s=document.createElement('style');s.id='tourCss';s.textContent=`
    #tour{position:fixed;inset:0;z-index:60;pointer-events:none}
    #tour .spot{position:fixed;border-radius:16px;box-shadow:0 0 0 9999px rgba(10,8,20,.55);transition:all .3s ease;pointer-events:none;outline:2px solid var(--accent);outline-offset:3px}
    #tour .spot.none{left:50%;top:42%;width:0;height:0;outline:none}
    #tour .tcard{position:fixed;width:340px;max-width:calc(100vw - 32px);background:var(--s1);color:var(--t1);border-radius:18px;padding:18px 18px 14px;box-shadow:var(--sh-3);pointer-events:auto;transition:left .3s ease,top .3s ease}
    #tour h4{margin:0 0 6px;font:800 18px var(--f-display)}#tour p{margin:0 0 12px;font-size:14px;line-height:1.5;color:var(--t2)}
    #tour .trow{display:flex;gap:8px;align-items:center}#tour .tn{font-size:12px;color:var(--t3);flex:1}
    #tour .ok{color:var(--ok);font-weight:700}`;document.head.appendChild(s);}
  function start(){css();stop(true);done=false;i=-1;
    el=document.createElement('div');el.id='tour';el.innerHTML='<div class="spot none"></div><div class="tcard"></div>';document.body.appendChild(el);
    spot=el.querySelector('.spot');card=el.querySelector('.tcard');window.addEventListener('resize',place);next();}
  function stop(silent){clearInterval(tick);tick=null;if(el){el.remove();el=null;}window.removeEventListener('resize',place);if(!silent)mark();}
  function target(){const s=STEPS[i];if(!s||!s.sel)return null;const t=document.querySelector(s.sel);if(!t||!t.offsetParent)return null;return t;}
  function next(){i++;while(i<STEPS.length&&STEPS[i].skipHidden&&!target())i++;if(i>=STEPS.length){stop();return;}draw();}
  function draw(){const s=STEPS[i];const n=STEPS.length;
    if(s.exp){if(typeof setPanel==='function')setPanel('learn');}
    card.innerHTML=`<h4>${s.t}</h4><p id="tourD">${s.d}</p><div class="trow"><span class="tn">${i+1} de ${n}</span>
      <button class="btn btn-ghost sm" id="tourSkip">${s.exp?'Saltar':'Saltar tutorial'}</button>
      ${s.exp?'<button class="btn btn-secondary sm" id="tourAuto">Ponlo por mí</button>':`<button class="btn btn-primary sm" id="tourNext">${i===0?'Empezar':'Siguiente'}</button>`}</div>`;
    card.querySelector('#tourSkip').onclick=()=>stop();
    const nb=card.querySelector('#tourNext');if(nb)nb.onclick=next;
    const ab=card.querySelector('#tourAuto');if(ab)ab.onclick=()=>{feed();ab.disabled=true;};
    place();if(s.exp)watch();}
  // coloca azúcar justo delante de la cabeza
  function feed(){if(typeof placeStim!=='function')return;resetWorld();placeStim('azucar',fly.x+Math.cos(fly.h)*.6,fly.z-Math.sin(fly.h)*.6,.8);}
  function watch(){clearInterval(tick);let t0=null;
    tick=setInterval(()=>{if(!el){clearInterval(tick);return;}
      const sugar=placed.some(s=>s.type==='azucar');const d=card.querySelector('#tourD');
      if(behavior==='per'){if(t0==null)t0=Date.now();if(Date.now()-t0>700)win();return;}
      t0=null;if(sugar&&d&&!d.dataset.w){d.dataset.w='1';d.innerHTML='Bien. Si no reacciona, acerca el azúcar a la cabeza de la mosca (arrástrala) o usa «Ponlo por mí».';}},150);}
  function win(){clearInterval(tick);tick=null;done=true;spot.className='spot';const p=document.getElementById('pill');if(p){const r=p.getBoundingClientRect();setSpot(r);}
    card.innerHTML=`<h4>¡Funcionó!</h4><p><span class="ok">La mosca extendió la probóscide.</span> Las neuronas gustativas de azúcar enviaron la señal por el cerebro hasta la motoneurona MN9, que mueve la probóscide. Nadie programó esa conducta: sale de las conexiones del conectoma.<br><br>Sigue con la primera lección en «Aprender».</p>
      <div class="trow"><span class="tn"></span><button class="btn btn-primary sm" id="tourEnd">Terminar</button></div>`;
    card.querySelector('#tourEnd').onclick=()=>stop();placeCard(document.getElementById('pill'));}
  function setSpot(r){const m=6;spot.className='spot';Object.assign(spot.style,{left:r.left-m+'px',top:r.top-m+'px',width:r.width+2*m+'px',height:r.height+2*m+'px'});}
  function place(){if(!el)return;const t=target();if(t)setSpot(t.getBoundingClientRect());else{spot.className='spot none';spot.removeAttribute('style');}placeCard(t);}
  function placeCard(t){const cw=card.offsetWidth,ch=card.offsetHeight,W=innerWidth,H=innerHeight;let x,y;
    if(!t){x=W/2-cw/2;y=H*.42-ch/2;}
    else{const r=t.getBoundingClientRect();x=r.left+r.width/2-cw/2;y=r.bottom+16;if(y+ch>H-12)y=r.top-ch-16;if(y<12)y=Math.min(H-ch-12,r.bottom+16);}
    card.style.left=Math.max(12,Math.min(W-cw-12,x))+'px';card.style.top=Math.max(12,Math.min(H-ch-12,y))+'px';}
  function maybeStart(){if(!seen())setTimeout(start,600);}
  return {start,stop,maybeStart,get active(){return !!el;}};
})();
