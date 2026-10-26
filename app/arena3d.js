/* ============================================================
   ARENA 3D — mosca articulada y estímulos colocables (three.js r128)
   ============================================================ */
const ARENA=(()=>{
const R_ARENA=9;
let renderer,scene,camera,controls,canvas,raycaster,floor,clock,hemi,spot,wall,rim,spotTarget=0,spotI=0;
let flyRig=null,female=null,shadowDisk=null,dust=[];
const stimObjs=new Map(); // id -> {group, type, parts}
let hoverId=null,dragId=null,selId=null,onPlace=null,onSelect=null,onMove=null,tool=null,ghost=null;
let followCam=false,darkMode=false;
const TYPES={
  luz:{col:0xF2B705,label:'Luz'},
  ruido:{col:0x2F6FB5,label:'Ruido'},
  vinagre:{col:0x4E9A3F,label:'Vinagre'},
  co2:{col:0x8E5BC4,label:'CO₂'},
  azucar:{col:0xE8A13A,label:'Azúcar'},
  agua:{col:0x3A8FD8,label:'Agua'},
  amargo:{col:0x6B7A2A,label:'Amargo'},
  sonido:{col:0x6B4FBB,label:'Sonido'},
};
function radialTex(inner,outer){const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');
  const gr=g.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,inner);gr.addColorStop(1,outer);g.fillStyle=gr;g.fillRect(0,0,128,128);
  const t=new THREE.CanvasTexture(c);return t;}
function stripeTex(dark){const c=document.createElement('canvas');c.width=64;c.height=256;const g=c.getContext('2d');
  g.fillStyle=dark?'#cfa36c':'#c49a62';g.fillRect(0,0,64,256);g.fillStyle='#3d2a17';
  for(let k=0;k<4;k++){g.fillRect(0,96+k*30,64,13);}
  return new THREE.CanvasTexture(c);}
function floorTex(dk){const c=document.createElement('canvas');c.width=c.height=512;const g=c.getContext('2d');
  g.fillStyle=dk?'#1E1D26':'#FAF8F3';g.fillRect(0,0,512,512);g.strokeStyle=dk?'#2C2B37':'#DCD5C6';g.lineWidth=2;
  for(let k=0;k<=16;k++){g.beginPath();g.moveTo(k*32,0);g.lineTo(k*32,512);g.stroke();g.beginPath();g.moveTo(0,k*32);g.lineTo(512,k*32);g.stroke();}
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(3,3);return t;}

/* ---------- mosca ---------- */
function buildFly(opts){
  opts=opts||{};
  const root=new THREE.Group(), body=new THREE.Group();root.add(body);
  const matBody=new THREE.MeshStandardMaterial({color:opts.thorax||0x8a6438,roughness:.6,metalness:.05});
  const matHead=new THREE.MeshStandardMaterial({color:0xa77d4e,roughness:.6});
  const matEye=new THREE.MeshStandardMaterial({color:0xb3201c,roughness:.35,emissive:0x330000});
  const matLeg=new THREE.MeshStandardMaterial({color:0x4a3520,roughness:.7});
  const matWing=new THREE.MeshPhongMaterial({color:0xcfe3ee,transparent:true,opacity:.38,side:THREE.DoubleSide,shininess:90,depthWrite:false});
  const thorax=new THREE.Mesh(new THREE.SphereGeometry(1,24,18),matBody);thorax.scale.set(.32,.26,.25);thorax.position.set(0,.47,0);body.add(thorax);
  const abdGeo=new THREE.SphereGeometry(1,24,18);abdGeo.rotateZ(Math.PI/2);const abd=new THREE.Mesh(abdGeo,new THREE.MeshStandardMaterial({map:stripeTex(),roughness:.6,color:opts.abd||0xffffff}));
  abd.scale.set(.44,.25,.26);abd.position.set(-.55,.43,0);abd.rotation.z=.08;body.add(abd);
  const headPivot=new THREE.Group();headPivot.position.set(.33,.5,0);body.add(headPivot);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.19,20,16),matHead);head.position.set(.1,0,0);headPivot.add(head);
  for(const s of[-1,1]){const e=new THREE.Mesh(new THREE.SphereGeometry(.15,20,16),matEye);e.scale.set(.75,1,.7);e.position.set(.14,.01,.12*s);headPivot.add(e);
    const ant=new THREE.Mesh(new THREE.CylinderGeometry(.018,.025,.12,6),matHead);ant.position.set(.27,.1,.05*s);ant.rotation.z=-1.0;headPivot.add(ant);
    const ar=new THREE.Mesh(new THREE.CylinderGeometry(.004,.004,.2,4),matLeg);ar.position.set(.34,.2,.06*s);ar.rotation.z=-.5;headPivot.add(ar);}
  const prob=new THREE.Group();prob.position.set(.16,-.12,0);headPivot.add(prob);
  const probM=new THREE.Mesh(new THREE.CylinderGeometry(.03,.04,.2,8),new THREE.MeshStandardMaterial({color:0x7a5a38}));probM.position.y=-.1;prob.add(probM);
  const lab=new THREE.Mesh(new THREE.SphereGeometry(.055,12,10),new THREE.MeshStandardMaterial({color:0x8a6a45}));lab.scale.set(1,.6,1.2);lab.position.y=-.2;prob.add(lab);
  // bristles
  for(let k=0;k<8;k++){const b=new THREE.Mesh(new THREE.CylinderGeometry(.005,.008,.1,4),matLeg);const a=-.2+k*.06;b.position.set(-.18+k*.05,.7,(k%2?1:-1)*.06);b.rotation.z=.6;body.add(b);}
  // alas
  const ws=new THREE.Shape();ws.moveTo(0,0);ws.bezierCurveTo(-.15,.12,-.6,.16,-.78,.05);ws.bezierCurveTo(-.82,-.02,-.6,-.12,-.3,-.09);ws.bezierCurveTo(-.15,-.06,-.05,-.03,0,0);
  const wg=new THREE.ShapeGeometry(ws,20);wg.rotateX(-Math.PI/2);
  const wings=[];
  for(const s of[-1,1]){const piv=new THREE.Group();piv.position.set(-.02,.68,.07*s);body.add(piv);
    const m=new THREE.Mesh(wg,matWing);m.scale.z=s;piv.add(m);
    const edge=new THREE.LineSegments(new THREE.EdgesGeometry(wg),new THREE.LineBasicMaterial({color:0x5b7480,transparent:true,opacity:.5}));edge.scale.z=s;piv.add(edge);
    wings.push({piv,s});}
  // halterios
  for(const s of[-1,1]){const h=new THREE.Mesh(new THREE.SphereGeometry(.035,8,6),matLeg);h.position.set(-.2,.6,.16*s);body.add(h);}
  // patas
  const legs=[];const hips=[[.17,.36],[.03,.34],[-.11,.36]];
  const restFoot=[[.55,.40],[.05,.52],[-.45,.44]];
  const segGeo=new THREE.CylinderGeometry(.022,.018,1,6);segGeo.translate(0,.5,0);
  for(const s of[-1,1])for(let k=0;k<3;k++){
    const f=new THREE.Mesh(segGeo,matLeg),t=new THREE.Mesh(segGeo,matLeg),ta=new THREE.Mesh(segGeo,matLeg);
    body.add(f);body.add(t);body.add(ta);
    legs.push({s,k,hip:new THREE.Vector3(hips[k][0],hips[k][1],.1*s),rest:new THREE.Vector3(restFoot[k][0],0,restFoot[k][1]*s),f,t,ta,L1:.32,L2:.4});}
  root.traverse(o=>{if(o.isMesh){o.castShadow=true;}});
  return {root,body,headPivot,prob,wings,legs,abd,head};
}
const UP=new THREE.Vector3(0,1,0);
function placeSeg(mesh,a,b){const d=new THREE.Vector3().subVectors(b,a);const L=d.length();mesh.position.copy(a);mesh.scale.set(1,L,1);
  mesh.quaternion.setFromUnitVectors(UP,d.normalize());}
function solveLeg(leg,foot){
  const h=leg.hip,L1=leg.L1,L2=leg.L2;const d=new THREE.Vector3().subVectors(foot,h);let D=d.length();
  if(D>L1+L2-.01){d.multiplyScalar((L1+L2-.01)/D);D=L1+L2-.01;foot=h.clone().add(d);}
  const a=Math.acos(Math.min(1,Math.max(-1,(L1*L1+D*D-L2*L2)/(2*L1*D))));
  const dir=d.clone().normalize();
  // eje de giro: perpendicular a dir y a la vertical, rodilla hacia arriba
  let ax=new THREE.Vector3().crossVectors(dir,UP);if(ax.lengthSq()<1e-6)ax.set(0,0,1);ax.normalize();
  const k1=dir.clone().applyAxisAngle(ax,a).multiplyScalar(L1).add(h);
  const k2=dir.clone().applyAxisAngle(ax,-a).multiplyScalar(L1).add(h);
  const knee=k1.y>k2.y?k1:k2;
  placeSeg(leg.f,h,knee);placeSeg(leg.t,knee,foot);
  const tip=foot.clone().add(new THREE.Vector3(leg.k===2?-.1:.08,-.0,.06*leg.s));tip.y=Math.max(0,foot.y-.02);
  placeSeg(leg.ta,foot,tip);
}
function poseFly(F,p,t){
  // p: {phase, walk(-1..1), groom, per, song, flap, tuck, jump, songSide}
  const legs=F.legs;
  for(const L of legs){
    const foot=L.rest.clone();
    if(p.walk){const off=((L.k===1)!==(L.s>0))?.5:0;const q=((p.phase+off)%1+1)%1,S=.26;
      if(q<.5)foot.x+=S/2-S*(q/.5);else{const u=(q-.5)/.5;foot.x+=-S/2+S*u;foot.y+=.1*Math.sin(Math.PI*u);}}
    if(L.k===0&&p.groom>.01){const w=t*2*Math.PI*4.5+(L.s>0?Math.PI:0);
      const g=new THREE.Vector3(.5+.08*Math.cos(w),.55+.07*Math.sin(w),.06*L.s);foot.lerp(g,p.groom);}
    if(p.tuck>0){const tk=new THREE.Vector3([.2,.05,-.12][L.k],.2,.18*L.s);foot.lerp(tk,p.tuck);}
    if(p.jump>0&&L.k===1){foot.y-=.0;foot.x-=.05*p.jump;}
    solveLeg(L,foot);
  }
  F.body.position.y=(p.jump||0)*.18+(p.walk?Math.sin(p.phase*Math.PI*4)*.008:0);
  F.headPivot.rotation.z=-.25*p.per;
  F.prob.rotation.z=-.25*p.per;F.prob.scale.set(1,.5+1.3*p.per,1);
  for(const W of F.wings){
    if(p.flap>0){const ph=t*2*Math.PI*11;W.piv.rotation.set(0,0,0);W.piv.rotation.y=-W.s*(.2);W.piv.rotation.x=W.s*(-.2+1.1*Math.sin(ph))*p.flap;W.piv.rotation.z=.3*Math.cos(ph);}
    else{const songOn=p.song>0&&W.s===p.songSide;const vib=songOn?Math.sin(t*2*Math.PI*18)*.08*p.song:0;
      W.piv.rotation.set(0,W.s*(.18+(songOn?1.35*p.song:0))+vib,0);W.piv.rotation.x=W.s*(.06);}
  }
}

/* ---------- estímulos ---------- */
function makeStim(type){
  const g=new THREE.Group(),T=TYPES[type],parts={};
  const base=new THREE.Mesh(new THREE.CircleGeometry(.55,32),new THREE.MeshBasicMaterial({color:T.col,transparent:true,opacity:.18,depthWrite:false}));base.rotation.x=-Math.PI/2;base.position.y=.01;g.add(base);parts.base=base;
  const ring=new THREE.Mesh(new THREE.RingGeometry(.58,.66,40),new THREE.MeshBasicMaterial({color:T.col,transparent:true,opacity:.0,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.y=.015;g.add(ring);parts.sel=ring;
  if(type==='luz'){
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(.04,.05,1.2,8),new THREE.MeshStandardMaterial({color:0x777777}));pole.position.y=.6;g.add(pole);
    const bulb=new THREE.Mesh(new THREE.SphereGeometry(.22,20,14),new THREE.MeshBasicMaterial({color:0xFFE38A}));bulb.position.y=1.3;g.add(bulb);
    const halo=new THREE.Sprite(new THREE.SpriteMaterial({map:radialTex('rgba(255,230,140,.95)','rgba(255,220,120,0)'),blending:THREE.AdditiveBlending,depthWrite:false,transparent:true}));halo.scale.set(2.4,2.4,1);halo.position.y=1.3;g.add(halo);
    const pl=new THREE.PointLight(0xffd47a,1.2,10,1.6);pl.position.y=1.3;g.add(pl);
    const pool=new THREE.Mesh(new THREE.CircleGeometry(3.5,40),new THREE.MeshBasicMaterial({map:radialTex('rgba(255,215,110,.55)','rgba(255,215,110,0)'),transparent:true,depthWrite:false}));pool.rotation.x=-Math.PI/2;pool.position.y=.012;g.add(pool);
    Object.assign(parts,{halo,pl,pool,bulb});
  }else if(type==='ruido'||type==='sonido'){
    const box=new THREE.Mesh(new THREE.BoxGeometry(.5,.6,.5),new THREE.MeshStandardMaterial({color:0x2b2f36,roughness:.5}));box.position.y=.3;g.add(box);
    const cone=new THREE.Mesh(new THREE.CircleGeometry(.17,20),new THREE.MeshStandardMaterial({color:0x5d6670}));cone.position.set(0,.33,.251);g.add(cone);
    parts.rings=[];for(let k=0;k<4;k++){const r=new THREE.Mesh(new THREE.RingGeometry(.9,1,48),new THREE.MeshBasicMaterial({color:T.col,transparent:true,opacity:.5,side:THREE.DoubleSide,depthWrite:false}));r.rotation.x=-Math.PI/2;r.position.y=.03;g.add(r);parts.rings.push(r);}
  }else if(type==='vinagre'||type==='co2'){
    const cup=new THREE.Mesh(new THREE.CylinderGeometry(.22,.18,.36,20,1,true),new THREE.MeshStandardMaterial({color:type==='vinagre'?0xd9e8cf:0xdcd3ea,transparent:true,opacity:.7,side:THREE.DoubleSide}));cup.position.y=.18;g.add(cup);
    const liq=new THREE.Mesh(new THREE.CircleGeometry(.2,20),new THREE.MeshStandardMaterial({color:T.col}));liq.rotation.x=-Math.PI/2;liq.position.y=.25;g.add(liq);
    const n=140,pos=new Float32Array(n*3),seed=new Float32Array(n);for(let i=0;i<n;i++){seed[i]=Math.random();}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
    const pts=new THREE.Points(geo,new THREE.PointsMaterial({color:T.col,size:.09,transparent:true,opacity:.55,depthWrite:false}));g.add(pts);
    const cloud=new THREE.Mesh(new THREE.CircleGeometry(2.6,40),new THREE.MeshBasicMaterial({map:radialTex(type==='vinagre'?'rgba(78,154,63,.35)':'rgba(142,91,196,.35)','rgba(0,0,0,0)'),transparent:true,depthWrite:false}));cloud.rotation.x=-Math.PI/2;cloud.position.y=.011;g.add(cloud);
    Object.assign(parts,{pts,seed,cloud});
  }else if(type==='azucar'||type==='agua'||type==='amargo'){
    const dc={azucar:0xfff1c2,agua:0xbfe3ff,amargo:0xb9c27a}[type];
    const drop=new THREE.Mesh(new THREE.SphereGeometry(.28,24,16),new THREE.MeshPhysicalMaterial({color:dc,roughness:.1,transmission:.0,transparent:true,opacity:.92,clearcoat:1}));drop.scale.set(1,.35,1);drop.position.y=.06;g.add(drop);parts.drop=drop;
  }else if(type==='hembra'){
    const F=buildFly({thorax:0x9a7448,abd:0xe9d8c0});F.root.scale.setScalar(1.12);g.add(F.root);parts.fly=F;
    poseFly(F,{phase:0,walk:0,groom:0,per:0,song:0,flap:0,tuck:0,jump:0},0);
  }
  return {group:g,type,parts};
}
function addStim(s){const o=makeStim(s.type);o.group.position.set(s.x,0,s.z);o.group.userData.id=s.id;scene.add(o.group);stimObjs.set(s.id,o);syncStim(s);}
function removeStim(id){const o=stimObjs.get(id);if(!o)return;scene.remove(o.group);stimObjs.delete(id);}
function syncStim(s){const o=stimObjs.get(s.id);if(!o)return;o.group.position.set(s.x,0,s.z);
  const k=s.int;if(o.parts.pl){o.parts.pl.intensity=.5+1.6*k;o.parts.halo.scale.setScalar(1.4+1.8*k);o.parts.pool.scale.setScalar(.6+.8*k);}
  if(o.parts.cloud)o.parts.cloud.scale.setScalar(.6+.8*k);
  if(o.parts.fly)o.group.rotation.y=s.rot||0;}

/* ---------- init ---------- */
function init(cv,cb){
  canvas=cv;Object.assign(cbs,cb||{});
  renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});renderer.setPixelRatio(Math.min(2,window.devicePixelRatio||1));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  scene=new THREE.Scene();
  camera=new THREE.PerspectiveCamera(40,1,.05,200);camera.position.set(8,12.5,14.5);
  controls=new THREE.OrbitControls(camera,canvas);controls.target.set(0,0,0);controls.enableDamping=true;controls.maxPolarAngle=Math.PI*.47;controls.minDistance=2.2;controls.maxDistance=34;
  hemi=new THREE.HemisphereLight(0xffffff,0x8a7a66,.75);scene.add(hemi);
  scene.background=new THREE.Color(0xEFECE5);scene.fog=new THREE.Fog(0xEFECE5,26,60);
  spot=new THREE.SpotLight(0xffffff,0,30,.55,.6,1.2);spot.position.set(0,13,0);spot.target.position.set(0,0,0);scene.add(spot);scene.add(spot.target);
  const sun=new THREE.DirectionalLight(0xffffff,.8);sun.position.set(6,14,5);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);
  Object.assign(sun.shadow.camera,{left:-11,right:11,top:11,bottom:-11,near:1,far:40});scene.add(sun);
  floor=new THREE.Mesh(new THREE.CircleGeometry(R_ARENA,72),new THREE.MeshStandardMaterial({map:floorTex(false),color:0xE9E5DC,roughness:.95}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
  wall=new THREE.Mesh(new THREE.CylinderGeometry(R_ARENA,R_ARENA,.9,72,1,true),new THREE.MeshPhongMaterial({color:0xdfe8ec,transparent:true,opacity:.28,side:THREE.DoubleSide,depthWrite:false}));wall.position.y=.45;scene.add(wall);
  rim=new THREE.Mesh(new THREE.TorusGeometry(R_ARENA,.04,8,96),new THREE.MeshStandardMaterial({color:0xb8c4ca}));rim.rotation.x=Math.PI/2;rim.position.y=.9;scene.add(rim);
  flyRig=buildFly();flyRig.root.scale.setScalar(1.35);scene.add(flyRig.root);
  shadowDisk=new THREE.Mesh(new THREE.SphereGeometry(1,32,20),new THREE.MeshStandardMaterial({color:0x1a1a1a,roughness:.8,transparent:true,opacity:.92}));shadowDisk.castShadow=true;shadowDisk.visible=false;scene.add(shadowDisk);
  for(let k=0;k<14;k++){const d=new THREE.Mesh(new THREE.SphereGeometry(.022,6,5),new THREE.MeshStandardMaterial({color:0x777777}));d.visible=false;flyRig.headPivot.add(d);dust.push({m:d,p:new THREE.Vector3(.1+Math.random()*.22,(Math.random()-.3)*.3,(Math.random()-.5)*.36)});}
  ghost=new THREE.Mesh(new THREE.RingGeometry(.45,.6,40),new THREE.MeshBasicMaterial({color:0xB83A68,transparent:true,opacity:.6,depthWrite:false}));ghost.rotation.x=-Math.PI/2;ghost.position.y=.02;ghost.visible=false;scene.add(ghost);
  raycaster=new THREE.Raycaster();clock=new THREE.Clock();
  canvas.addEventListener('pointerdown',pDown);canvas.addEventListener('pointermove',pMove);window.addEventListener('pointerup',pUp);
  canvas.addEventListener('pointerleave',()=>{ghost.visible=false;});
  resize();
}
const cbs={};
function ndc(e){const r=canvas.getBoundingClientRect();return new THREE.Vector2(((e.clientX-r.left)/r.width)*2-1,-((e.clientY-r.top)/r.height)*2+1);}
function floorHit(e){raycaster.setFromCamera(ndc(e),camera);const h=raycaster.intersectObject(floor);if(!h.length)return null;const p=h[0].point;if(Math.hypot(p.x,p.z)>R_ARENA-.5)return null;return p;}
function stimHit(e){raycaster.setFromCamera(ndc(e),camera);const objs=[...stimObjs.values()].map(o=>o.group);const h=raycaster.intersectObjects(objs,true);
  if(!h.length)return null;let o=h[0].object;while(o&&o.userData.id==null)o=o.parent;return o?o.userData.id:null;}
let downPos=null;
function pDown(e){downPos={x:e.clientX,y:e.clientY};
  if(tool){return;}
  const id=stimHit(e);if(id!=null){dragId=id;controls.enabled=false;select(id);canvas.setPointerCapture(e.pointerId);}
}
function pMove(e){
  if(dragId!=null){const p=floorHit(e);if(p&&cbs.move)cbs.move(dragId,p.x,p.z);return;}
  if(tool){const p=floorHit(e);ghost.visible=!!p;if(p){ghost.position.set(p.x,.02,p.z);ghost.material.color.setHex(TYPES[tool].col);}canvas.style.cursor=p?'copy':'not-allowed';return;}
  const id=stimHit(e);hoverId=id;canvas.style.cursor=id!=null?'grab':'';
}
function pUp(e){
  const click=downPos&&Math.hypot(e.clientX-downPos.x,e.clientY-downPos.y)<5;downPos=null;
  if(dragId!=null){dragId=null;controls.enabled=true;return;}
  if(!click||e.target!==canvas)return;
  if(tool){const p=floorHit(e);if(p&&cbs.place)cbs.place(tool,p.x,p.z);return;}
  const id=stimHit(e);select(id);
}
function highlight(id){selId=id;for(const [k,o] of stimObjs)o.parts.sel.material.opacity=k===id?.9:0;}
function select(id){highlight(id);if(cbs.select)cbs.select(id);}
function setTool(t){tool=t;ghost.visible=false;canvas.style.cursor=t?'copy':'';controls.enabled=true;}
function resize(){if(!renderer)return;const r=canvas.getBoundingClientRect();if(!r.width)return;renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;
  const hf=66*Math.PI/180;camera.fov=Math.min(72,Math.max(36,2*Math.atan(Math.tan(hf/2)/camera.aspect)*180/Math.PI));camera.updateProjectionMatrix();}
function setDark(d){darkMode=d;if(!floor)return;const bg=d?0x0E0D13:0xEFECE5;scene.background.setHex(bg);scene.fog.color.setHex(bg);
  if(floor.material.map)floor.material.map.dispose();floor.material.map=floorTex(d);floor.material.needsUpdate=true;
  wall.material.color.setHex(d?0x3A3946:0xdfe8ec);wall.material.opacity=d?.35:.28;rim.material.color.setHex(d?0x4A4759:0xb8c4ca);hemi.intensity=d?.55:.75;hemi.groundColor.setHex(d?0x2a2633:0x8a7a66);}
function setLabLight(col,int){if(!spot)return;if(col){spot.color.set(col);spotTarget=2.2*(int==null?.8:int);}else spotTarget=0;}

/* ---------- por cuadro ---------- */
const camOff=new THREE.Vector3();
function frame(st){
  // st: {fly:{x,y,z,heading,pose}, loom:0..1|null, dust:0..1, stims:[...]}
  const t=clock.getElapsedTime();
  const F=flyRig,f=st.fly;
  F.root.position.set(f.x,f.y,f.z);F.root.rotation.set(0,f.heading,f.bank||0);F.body.rotation.z=f.pitch||0;
  poseFly(F,f.pose,t);
  // estímulos animados
  for(const s of st.stims){const o=stimObjs.get(s.id);if(!o)continue;
    if(o.parts.rings){o.parts.rings.forEach((r,k)=>{const u=((t*.6+k/4)%1);const sc=.3+u*(2.2+2.5*s.int);r.scale.set(sc,sc,sc);r.material.opacity=(1-u)*.55*s.int+.05;});}
    if(o.parts.pts){const a=o.parts.pts.geometry.attributes.position,sd=o.parts.seed;const spread=1.6+1.6*s.int;
      for(let i=0;i<sd.length;i++){const u=(t*.18+sd[i])%1,ang=sd[i]*40+t*.3;a.setXYZ(i,Math.cos(ang)*u*spread,.3+u*(o.type==='co2'?.4:1.2)+Math.sin(ang*3)*.05,Math.sin(ang)*u*spread);}
      a.needsUpdate=true;o.parts.pts.material.opacity=.25+.45*s.int;}
    if(o.parts.halo){o.parts.halo.material.opacity=.75+.25*Math.sin(t*3);}
    if(o.parts.fly){o.parts.fly.headPivot.rotation.y=Math.sin(t*.8)*.15;}
  }
  // sombra que se acerca
  if(st.loom!=null){shadowDisk.visible=true;const k=st.loom;const r=.25+k*k*1.6;shadowDisk.scale.set(r,r,r);shadowDisk.position.set(f.x+3*(1-k),.9+r+5*(1-k),f.z+2*(1-k));}
  else shadowDisk.visible=false;
  dust.forEach((d,k)=>{d.m.visible=k/dust.length<st.dust;d.m.position.copy(d.p);});
  if(followCam){controls.target.lerp(new THREE.Vector3(f.x,f.y+.3,f.z),.12);}
  if(spot){spot.intensity+=(spotTarget-spot.intensity)*.12;if(st.fly){spot.target.position.set(st.fly.x,0,st.fly.z);spot.position.set(st.fly.x,13,st.fly.z);}}
  controls.update();renderer.render(scene,camera);
}
function setFollow(v){followCam=v;if(v){const d=camera.position.clone().sub(controls.target);d.setLength(7.5);camera.position.copy(controls.target).add(d);}else{controls.target.set(0,0,0);}}
function resetView(){controls.target.set(0,0,0);camera.position.set(8,12.5,14.5);followCam=false;}
function screenPos(x,y,z){const v=new THREE.Vector3(x,y,z).project(camera);const r=canvas.getBoundingClientRect();return {x:(v.x+1)/2*r.width,y:(1-v.y)/2*r.height,vis:v.z<1};}
return {setLabLight,screenPos,init,frame,addStim,removeStim,syncStim,setTool,select:highlight,resize,setDark,setFollow,resetView,TYPES,R:R_ARENA,get sel(){return selId;}};
})();
