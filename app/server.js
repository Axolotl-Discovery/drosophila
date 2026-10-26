/* ============ Servidor de competencia (sin dependencias) ============
   HTTP + Server-Sent Events + faro UDP para descubrirlo en la red local.
   Se usa desde main.js (Electron) o suelto: node server.js [puerto] */
'use strict';
const http=require('http'),fs=require('fs'),path=require('path'),os=require('os'),dgram=require('dgram'),crypto=require('crypto');

const COLORS=['#E5484D','#3E63DD','#30A46C','#F5A524','#8E4EC6','#0E7C74','#D6409F','#B07A3C','#12A5C9','#6B7280'];
const MAXTEAMS=10,DISC_PORT=41777;
const tok=()=>crypto.randomBytes(9).toString('base64url');

function lanAddrs(){const out=[];for(const [n,list] of Object.entries(os.networkInterfaces()))for(const a of list||[])if(a.family==='IPv4'&&!a.internal)out.push({name:n,address:a.address,netmask:a.netmask});return out;}
function bcastOf(a){const ip=a.address.split('.').map(Number),m=a.netmask.split('.').map(Number);return ip.map((x,i)=>(x&m[i])|(~m[i]&255)).join('.');}
const csvq=v=>{const s=v==null?'':String(v);return /[",\n;]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;};

function createServer(opts={}){
  const dir=__dirname;
  const RETOS=JSON.parse(fs.readFileSync(path.join(dir,'comp-retos.json'),'utf8'));
  const saveDir=opts.saveDir||path.join(os.homedir(),'Documents','Drosophila-competencias');
  const admin=opts.adminToken||tok();
  let port=opts.port||7777,server=null,beacon=null,beaconT=null;
  const S={name:opts.name||'Competencia de optogenética',phase:'lobby',config:{retos:RETOS.filter(r=>r.def).map(r=>r.id),limit:300,pen:{err:20,hint:60},hard:false,seed:1+Math.floor(Math.random()*1e6)},
    startAt:0,endAt:0,teams:[],events:[],session:null};
  const clients=new Set();// {res, team, admin}
  let logStream=null;
  function openLog(){try{fs.mkdirSync(saveDir,{recursive:true});const d=new Date();S.session=d.toISOString().slice(0,16).replace(/[:T]/g,'-');
      logStream=fs.createWriteStream(path.join(saveDir,`competencia-${S.session}.jsonl`),{flags:'a'});}catch(e){logStream=null;}}
  const logLine=o=>{if(logStream)logStream.write(JSON.stringify(o)+'\n');};
  /* ---------- puntuación ---------- */
  function score(t){const lim=S.config.limit*1000;let solved=0,time=0,errors=0,hints=0;
    for(const r of t.results){if(!r)continue;if(r.st==='win')solved++;time+=r.st==='win'?r.t:Math.min(r.t,lim);}
    errors=t.errors;hints=t.hints;const pen=errors*S.config.pen.err*1000+hints*S.config.pen.hint*1000;
    return {solved,time:time+pen,raw:time,pen};}
  function ranked(){const now=Date.now();
    return S.teams.map(t=>{const sc=score(t);return {id:t.id,name:t.name,color:t.color,online:now-t.lastSeen<7000,cur:t.cur,prog:t.prog,retoT:t.retoT,finished:t.finished,
      solved:sc.solved,time:sc.time,raw:sc.raw,pen:sc.pen,errors:t.errors,hints:t.hints,results:t.results.map(r=>r&&{st:r.st,t:r.t,e:r.e,errs:r.errs,hints:r.hints}),
      race:t.race}}).sort((a,b)=>b.solved-a.solved||a.time-b.time||a.name.localeCompare(b.name))
      .map((t,i)=>Object.assign(t,{pos:i+1}));}
  function pubState(){return {name:S.name,phase:S.phase,config:S.config,startAt:S.startAt,endAt:S.endAt,now:Date.now(),retos:RETOS.filter(r=>S.config.retos.includes(r.id)).sort((a,b)=>S.config.retos.indexOf(a.id)-S.config.retos.indexOf(b.id)),
    allRetos:RETOS,teams:ranked(),max:MAXTEAMS,addrs:lanAddrs().map(a=>a.address),port};}
  let pushT=null;
  function push(now){if(now){clearTimeout(pushT);pushT=null;send();return;}if(pushT)return;pushT=setTimeout(()=>{pushT=null;send();},250);}
  function send(){const st=JSON.stringify(pubState());for(const c of clients){try{c.res.write(`event: state\ndata: ${st}\n\n`);}catch(e){}}}
  function sendTo(filter,ev,data){const s=`event: ${ev}\ndata: ${JSON.stringify(data)}\n\n`;for(const c of clients)if(filter(c))try{c.res.write(s);}catch(e){}}
  /* ---------- equipos y eventos ---------- */
  function newTeam(name){const used=new Set(S.teams.map(t=>t.color));const color=COLORS.find(c=>!used.has(c))||COLORS[S.teams.length%COLORS.length];
    const t={id:'e'+(S.teams.length+1)+'-'+tok().slice(0,4),name,color,token:tok(),joined:Date.now(),lastSeen:Date.now(),cur:0,prog:0,retoT:0,finished:false,results:[],errors:0,hints:0,race:[],nev:0};
    S.teams.push(t);return t;}
  function apply(t,ev){const N=S.config.retos.length;ev.team=t.id;ev.tn=t.name;ev.rx=Date.now();S.events.push(ev);t.nev++;logLine(ev);
    const i=ev.i;const r=()=>{if(!t.results[i])t.results[i]={id:S.config.retos[i],st:null,t:0,errs:0,hints:0};return t.results[i];};
    switch(ev.k){
      case 'reto':if(typeof i==='number'){t.cur=i;t.prog=0;t.retoT=0;}break;
      case 'win':case 'skip':case 'timeout':if(typeof i==='number'&&i<N){const R=r();if(!R.st){R.st=ev.k;R.t=Math.max(0,+ev.t||0);R.e=ev.e;if(ev.k==='win')t.race.push([ev.e,t.results.filter(x=>x&&x.st==='win').length]);}
        t.cur=i+1;t.prog=0;if(t.cur>=N)t.finished=true;}break;
      case 'error':t.errors++;if(typeof i==='number')r().errs++;break;
      case 'hint':t.hints++;if(typeof i==='number')r().hints++;break;
    }}
  function maybeAutoEnd(){if(S.phase==='running'&&S.teams.length&&S.teams.every(t=>t.finished)){S.phase='ended';S.endAt=Date.now();logLine({k:'fin',auto:true,at:S.endAt});sendTo(()=>true,'end',{});writeExports();}}
  /* ---------- exportar ---------- */
  function csvResumen(){const R=pubState().retos;const head=['posicion','equipo','resueltos','tiempo_total_s','tiempo_retos_s','penalizacion_s','errores','pistas'];
    R.forEach((r,k)=>head.push(`${k+1}_${r.id}_estado`,`${k+1}_${r.id}_tiempo_s`,`${k+1}_${r.id}_errores`,`${k+1}_${r.id}_pistas`));
    const rows=[head.join(',')];
    for(const t of ranked()){const row=[t.pos,t.name,t.solved,(t.time/1000).toFixed(1),(t.raw/1000).toFixed(1),(t.pen/1000).toFixed(0),t.errors,t.hints];
      R.forEach((_,k)=>{const x=t.results[k];row.push(x?{win:'resuelto',skip:'saltado',timeout:'tiempo agotado'}[x.st]||'':'sin llegar',x?(x.t/1000).toFixed(1):'',x?x.errs:'',x?x.hints:'');});rows.push(row.map(csvq).join(','));}
    return '﻿'+rows.join('\n');}
  function csvEventos(){const R=S.config.retos;const rows=['equipo,t_competencia_s,reto_n,reto_id,tipo,detalle'];
    for(const e of S.events){const {team,tn,rx,k,i,e:el,...rest}=e;rows.push([tn,el!=null?(el/1000).toFixed(2):'',i!=null?i+1:'',i!=null?R[i]||'':'',k,JSON.stringify(rest)].map(csvq).join(','));}
    return '﻿'+rows.join('\n');}
  function jsonAll(){return JSON.stringify({exportado:new Date().toISOString(),nombre:S.name,config:S.config,inicio:S.startAt,fin:S.endAt,clasificacion:ranked(),eventos:S.events},null,1);}
  function writeExports(){try{const d=path.join(saveDir,`competencia-${S.session||'sin-fecha'}`);fs.mkdirSync(d,{recursive:true});
      fs.writeFileSync(path.join(d,'clasificacion.csv'),csvResumen());fs.writeFileSync(path.join(d,'eventos.csv'),csvEventos());fs.writeFileSync(path.join(d,'competencia.json'),jsonAll());return d;}catch(e){return null;}}
  /* ---------- HTTP ---------- */
  const J=(res,code,obj)=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':'*','Cache-Control':'no-store'});res.end(JSON.stringify(obj));};
  const body=req=>new Promise(r=>{let b='';req.on('data',c=>{b+=c;if(b.length>2e6)req.destroy();});req.on('end',()=>{try{r(JSON.parse(b||'{}'));}catch(e){r({});}});});
  const STATIC={'/':'tablero.html','/tablero.html':'tablero.html','/comp-retos.json':'comp-retos.json'};
  const FONTS=/^\/fonts\/[a-z0-9-]+\.woff2$/;
  async function handle(req,res){
    const u=new URL(req.url,'http://x');const p=u.pathname;
    if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'GET,POST'});return res.end();}
    const isAdmin=(u.searchParams.get('admin')||'')===admin;
    if(STATIC[p]||FONTS.test(p)){const f=path.join(dir,STATIC[p]||p.slice(1));fs.readFile(f,(e,d)=>{if(e){res.writeHead(404);return res.end();}
        res.writeHead(200,{'Content-Type':f.endsWith('.html')?'text/html; charset=utf-8':f.endsWith('.json')?'application/json':'font/woff2','Cache-Control':'no-cache'});res.end(d);});return;}
    if(p==='/api/info')return J(res,200,{app:'drosophila-comp',name:S.name,phase:S.phase,teams:S.teams.length,max:MAXTEAMS});
    if(p==='/api/stream'){const t=S.teams.find(x=>x.token===u.searchParams.get('token'));
      res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive','Access-Control-Allow-Origin':'*','X-Accel-Buffering':'no'});
      const c={res,team:t||null,admin:isAdmin};clients.add(c);res.write(`retry: 1500\nevent: state\ndata: ${JSON.stringify(pubState())}\n\n`);
      if(t){t.lastSeen=Date.now();push();}
      req.on('close',()=>{clients.delete(c);push();});return;}
    if(req.method!=='POST'&&!p.startsWith('/api/export')&&p!=='/api/admin/events')return J(res,404,{error:'no existe'});
    if(p==='/api/join'){const b=await body(req);const name=String(b.name||'').trim().slice(0,28);if(!name)return J(res,400,{error:'Escribe el nombre del equipo.'});
      let t=S.teams.find(x=>x.token&&x.token===b.token)||null;
      if(!t){const same=S.teams.find(x=>x.name.toLowerCase()===name.toLowerCase());
        if(same){if(Date.now()-same.lastSeen<7000&&same.token!==b.token)return J(res,409,{error:'Ese nombre ya lo está usando otro equipo.'});t=same;}}
      if(!t){if(S.teams.length>=MAXTEAMS)return J(res,409,{error:`Ya hay ${MAXTEAMS} equipos.`});if(S.phase==='ended')return J(res,409,{error:'La competencia ya terminó.'});t=newTeam(name);logLine({k:'join',team:t.id,tn:name,rx:Date.now()});}
      t.lastSeen=Date.now();push();
      return J(res,200,{token:t.token,id:t.id,name:t.name,color:t.color,cur:t.cur,results:t.results,errors:t.errors,hints:t.hints,state:pubState()});}
    if(p==='/api/ev'){const b=await body(req);const t=S.teams.find(x=>x.token===b.token);if(!t)return J(res,401,{error:'equipo desconocido'});
      t.lastSeen=Date.now();const seen=new Set(S.events.filter(e=>e.team===t.id&&e.q!=null).slice(-500).map(e=>e.q));
      if(S.phase!=='lobby')for(const ev of (b.evs||[]).slice(0,500)){if(ev&&typeof ev.k==='string'&&!(ev.q!=null&&seen.has(ev.q))){apply(t,ev);if(ev.q!=null)seen.add(ev.q);}}
      if(b.st&&typeof b.st.prog==='number'){t.prog=Math.max(0,Math.min(1,b.st.prog));t.retoT=+b.st.retoT||0;}
      maybeAutoEnd();push();return J(res,200,{ok:true,phase:S.phase});}
    if(p.startsWith('/api/admin/')||p.startsWith('/api/export')){
      if(!isAdmin)return J(res,403,{error:'solo el organizador'});
      if(p==='/api/admin/events'){const id=u.searchParams.get('team');return J(res,200,{events:S.events.filter(e=>!id||e.team===id).slice(-3000)});}
      if(p==='/api/export/clasificacion.csv'){res.writeHead(200,{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="clasificacion.csv"'});return res.end(csvResumen());}
      if(p==='/api/export/eventos.csv'){res.writeHead(200,{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="eventos.csv"'});return res.end(csvEventos());}
      if(p==='/api/export/competencia.json'){res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Content-Disposition':'attachment; filename="competencia.json"'});return res.end(jsonAll());}
      const b=await body(req);
      if(p==='/api/admin/config'){if(S.phase!=='lobby')return J(res,409,{error:'Ya empezó.'});const c=b.config||{};
        if(Array.isArray(c.retos))S.config.retos=c.retos.filter(id=>RETOS.some(r=>r.id===id)).slice(0,20);
        if(c.limit)S.config.limit=Math.max(60,Math.min(900,+c.limit));if(c.pen){S.config.pen.err=Math.max(0,Math.min(300,+c.pen.err||0));S.config.pen.hint=Math.max(0,Math.min(600,+c.pen.hint||0));}
        if('hard' in c)S.config.hard=!!c.hard;if(b.name)S.name=String(b.name).slice(0,60);push(true);return J(res,200,{ok:true});}
      if(p==='/api/admin/start'){if(S.phase!=='lobby')return J(res,409,{error:'Ya empezó.'});if(!S.config.retos.length)return J(res,400,{error:'Elige al menos un reto.'});
        S.phase='running';S.startAt=Date.now()+4000;openLog();logLine({k:'inicio',config:S.config,at:S.startAt,teams:S.teams.map(t=>t.name)});push(true);return J(res,200,{ok:true});}
      if(p==='/api/admin/end'){if(S.phase==='running'){S.phase='ended';S.endAt=Date.now();logLine({k:'fin',at:S.endAt});}const d=writeExports();sendTo(()=>true,'end',{});push(true);return J(res,200,{ok:true,dir:d});}
      if(p==='/api/admin/export'){const d=writeExports();if(d&&opts.onExport)opts.onExport(d);return J(res,200,{ok:true,dir:d});}
      if(p==='/api/admin/reset'){S.phase='lobby';S.startAt=0;S.endAt=0;S.events=[];S.config.seed=1+Math.floor(Math.random()*1e6);if(logStream){logStream.end();logStream=null;}
        for(const t of S.teams)Object.assign(t,{cur:0,prog:0,retoT:0,finished:false,results:[],errors:0,hints:0,race:[],nev:0});if(b.clearTeams)S.teams=S.teams.filter(t=>Date.now()-t.lastSeen<7000);
        sendTo(()=>true,'reset',{});push(true);return J(res,200,{ok:true});}
      if(p==='/api/admin/kick'){const t=S.teams.find(x=>x.id===b.id);if(t){sendTo(c=>c.team===t,'kick',{});S.teams=S.teams.filter(x=>x!==t);}push(true);return J(res,200,{ok:true});}
      return J(res,404,{error:'no existe'});}
    J(res,404,{error:'no existe'});
  }
  function start(){return new Promise((resolve,reject)=>{let tries=0;
    const tryListen=()=>{server=http.createServer((q,s)=>handle(q,s).catch(e=>{try{J(s,500,{error:String(e)})}catch(_){}}));
      server.on('error',e=>{if(e.code==='EADDRINUSE'&&tries++<10){port++;tryListen();}else reject(e);});
      server.listen(port,'0.0.0.0',()=>{startBeacon();setInterval(()=>{for(const c of clients)try{c.res.write(': ping\n\n');}catch(e){}push();},5000).unref();
        resolve({port,admin,addrs:lanAddrs().map(a=>a.address)});});};
    tryListen();});}
  function startBeacon(){try{beacon=dgram.createSocket({type:'udp4',reuseAddr:true});beacon.bind(()=>{try{beacon.setBroadcast(true);}catch(e){}
      const tick=()=>{const msg=Buffer.from(JSON.stringify({app:'drosophila-comp',v:1,name:S.name,port,phase:S.phase,teams:S.teams.length,max:MAXTEAMS}));
        const targets=new Set(['255.255.255.255',...lanAddrs().map(bcastOf)]);for(const t of targets)beacon.send(msg,DISC_PORT,t,()=>{});};
      tick();beaconT=setInterval(tick,1500);});beacon.on('error',()=>{});}catch(e){}}
  function stop(){clearInterval(beaconT);try{beacon&&beacon.close();}catch(e){}for(const c of clients)try{c.res.end();}catch(e){}clients.clear();try{server&&server.close();}catch(e){}if(logStream)logStream.end();}
  return {start,stop,get port(){return port;},admin,state:()=>S,writeExports};
}
/* ---------- descubrimiento (lado equipo) ---------- */
function discover(onFound){const sock=dgram.createSocket({type:'udp4',reuseAddr:true});const seen=new Map();
  sock.on('message',(m,r)=>{try{const o=JSON.parse(m.toString());if(o.app!=='drosophila-comp')return;const key=r.address+':'+o.port;const info={...o,address:r.address,url:`http://${r.address}:${o.port}`,at:Date.now()};seen.set(key,info);onFound([...seen.values()].filter(x=>Date.now()-x.at<6000));}catch(e){}});
  sock.on('error',()=>{});try{sock.bind(DISC_PORT);}catch(e){}
  return ()=>{try{sock.close();}catch(e){}};}

module.exports={createServer,discover,lanAddrs};
if(require.main===module){const s=createServer({port:+process.argv[2]||7777,adminToken:process.env.ADMIN||undefined,saveDir:process.env.SAVEDIR});
  s.start().then(r=>{console.log(`Competencia en http://localhost:${r.port}/?admin=${r.admin}`);console.log('Direcciones:',r.addrs.join(', '));});}
