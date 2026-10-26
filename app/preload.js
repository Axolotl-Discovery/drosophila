const {contextBridge,ipcRenderer}=require('electron');
const sseHandlers=new Map();let sseId=1;
ipcRenderer.on('comp:sse',(e,m)=>{const h=sseHandlers.get(m.id);if(h)h(m.ev,m.data);});
const foundHandlers=new Set();
ipcRenderer.on('comp:found',(e,list)=>{for(const h of foundHandlers)h(list);});
contextBridge.exposeInMainWorld('drosoNet',{
  req:(method,url,body)=>ipcRenderer.invoke('comp:req',{method,url,body}),
  sse:(url,on)=>{const id=sseId++;sseHandlers.set(id,on);ipcRenderer.send('comp:sse:open',{id,url});return ()=>{sseHandlers.delete(id);ipcRenderer.send('comp:sse:close',{id});};},
  discover:(on)=>{foundHandlers.add(on);ipcRenderer.send('comp:discover',true);return ()=>{foundHandlers.delete(on);if(!foundHandlers.size)ipcRenderer.send('comp:discover',false);};},
  host:(opts)=>ipcRenderer.invoke('comp:host',opts||{}),
  openBoard:()=>ipcRenderer.invoke('comp:board'),
  stopHost:()=>ipcRenderer.invoke('comp:stop'),
});
