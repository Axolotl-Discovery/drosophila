const {app,BrowserWindow,protocol,net,Menu,shell,ipcMain}=require('electron');
const http=require('http');
const path=require('path');const {pathToFileURL}=require('url');
app.commandLine.appendSwitch('js-flags','--max-old-space-size=4096');
protocol.registerSchemesAsPrivileged([{scheme:'app',privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true,stream:true}}]);
function createWindow(){
  const win=new BrowserWindow({width:1600,height:960,minWidth:1100,minHeight:700,title:'Drosophila — Axolotl Discovery',backgroundColor:'#F3F3F3',autoHideMenuBar:true,
    webPreferences:{contextIsolation:true,nodeIntegration:false,backgroundThrottling:false,preload:path.join(__dirname,'preload.js')}});
  win.loadURL('app://local/index.html');
  if(process.env.DROSO_TEST){win.webContents.on('console-message',(e,l,m)=>console.log('[page]',m));
    setTimeout(async()=>{try{await win.webContents.executeJavaScript(process.env.DROSO_JS1||"setPanel('lab');CONSOLE.run('activar MN9');CONSOLE.run('luz roja on');openDrawer('con')");}catch(e){console.log('err',e)}},Number(process.env.DROSO_T1||20000));
    setTimeout(async()=>{const img=await win.webContents.capturePage();require('fs').writeFileSync(process.env.DROSO_TEST,img.toPNG());
      const b=await win.webContents.executeJavaScript(process.env.DROSO_JS2||'JSON.stringify({b:behavior,t:simT,speed,loading:!!document.getElementById("loading")})');console.log('RESULT',b);app.quit();},Number(process.env.DROSO_T2||40000));}
  win.webContents.setWindowOpenHandler(({url})=>{shell.openExternal(url);return {action:'deny'};});
}
/* ---------- competencia en red local ---------- */
let host=null,hostInfo=null,boardWin=null,stopDisc=null;const sses=new Map();
function openBoard(){if(!hostInfo)return false;if(boardWin&&!boardWin.isDestroyed()){boardWin.focus();return true;}
  boardWin=new BrowserWindow({width:1400,height:880,title:'Tablero de la competencia',autoHideMenuBar:true,backgroundColor:'#F7F5F0',webPreferences:{contextIsolation:true,nodeIntegration:false}});
  boardWin.loadURL(`http://127.0.0.1:${hostInfo.port}/?admin=${hostInfo.admin}`);
  boardWin.webContents.setWindowOpenHandler(({url})=>{shell.openExternal(url);return {action:'deny'};});
  boardWin.webContents.session.on('will-download',(e,item)=>{item.setSavePath(path.join(app.getPath('downloads'),item.getFilename()));item.once('done',()=>shell.showItemInFolder(item.getSavePath()));});
  return true;}
ipcMain.handle('comp:host',async(e,opts)=>{if(!host){const {createServer}=require('./server.js');
    host=createServer({name:opts.name,saveDir:path.join(app.getPath('documents'),'Drosophila-competencias'),onExport:d=>shell.openPath(d)});hostInfo=await host.start();}
  if(opts.open!==false)openBoard();return hostInfo;});
ipcMain.handle('comp:board',()=>openBoard());
ipcMain.handle('comp:stop',()=>{if(host){host.stop();host=null;hostInfo=null;}if(boardWin&&!boardWin.isDestroyed())boardWin.close();return true;});
ipcMain.on('comp:discover',(e,on)=>{if(on&&!stopDisc){const {discover}=require('./server.js');const wc=e.sender;stopDisc=discover(list=>{if(!wc.isDestroyed())wc.send('comp:found',list);});}
  else if(!on&&stopDisc){stopDisc();stopDisc=null;}});
ipcMain.handle('comp:req',(e,{method,url,body})=>new Promise(res=>{try{const data=body?Buffer.from(JSON.stringify(body)):null;
  const r=http.request(url,{method:method||'GET',timeout:6000,headers:data?{'Content-Type':'application/json','Content-Length':data.length}:{}},resp=>{let b='';resp.setEncoding('utf8');resp.on('data',c=>b+=c);
    resp.on('end',()=>{let j=null;try{j=JSON.parse(b);}catch(_){}res({status:resp.statusCode,json:j});});});
  r.on('timeout',()=>r.destroy(new Error('timeout')));r.on('error',err=>res({status:0,error:String(err.message||err)}));if(data)r.write(data);r.end();}catch(err){res({status:0,error:String(err)});}}));
ipcMain.on('comp:sse:open',(e,{id,url})=>{const wc=e.sender;let closed=false,req=null,timer=null;
  const send=(ev,data)=>{if(!wc.isDestroyed())wc.send('comp:sse',{id,ev,data});};
  const connect=()=>{if(closed)return;req=http.get(url,resp=>{if(resp.statusCode!==200){resp.resume();send('error',{status:resp.statusCode});retry();return;}send('open',{});resp.setEncoding('utf8');let buf='';
      resp.on('data',c=>{buf+=c;let k;while((k=buf.indexOf('\n\n'))>=0){const blk=buf.slice(0,k);buf=buf.slice(k+2);let ev='message',d='';for(const ln of blk.split('\n')){if(ln.startsWith('event:'))ev=ln.slice(6).trim();else if(ln.startsWith('data:'))d+=ln.slice(5).trim();}if(d)send(ev,d);}});
      resp.on('end',()=>{send('error',{});retry();});});
    req.on('error',()=>{send('error',{});retry();});};
  const retry=()=>{if(closed)return;clearTimeout(timer);timer=setTimeout(connect,1500);};
  sses.set(id,()=>{closed=true;clearTimeout(timer);try{req&&req.destroy();}catch(_){}});connect();});
ipcMain.on('comp:sse:close',(e,{id})=>{const f=sses.get(id);if(f){f();sses.delete(id);}});
app.on('before-quit',()=>{if(host)host.stop();});

app.whenReady().then(()=>{
  protocol.handle('app',req=>{const u=new URL(req.url);let p=decodeURIComponent(u.pathname);if(p==='/'||!p)p='/index.html';
    const file=path.normalize(path.join(__dirname,p));if(!file.startsWith(__dirname))return new Response('no',{status:403});
    return net.fetch(pathToFileURL(file).toString());});
  Menu.setApplicationMenu(null);
  createWindow();
  app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow();});
});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
