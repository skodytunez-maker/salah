import {setForegroundAudio,foregroundAudioBusyExcept,subscribeAudioOwners} from './audio-focus.js';

export function connectNativeAdhanAudio(plugin){
 if(!plugin||typeof plugin.setWebAudioBusy!=='function'||typeof plugin.stopAdhan!=='function')return {destroy(){}};
 const owner={};let destroyed=false,lastBusy=null,handle=null,version=0,bar=null;
 const ownersChanged=()=>{
  if(destroyed)return;
  const busy=foregroundAudioBusyExcept(owner);
  if(busy===lastBusy)return;lastBusy=busy;
  Promise.resolve(plugin.setWebAudioBusy({busy})).catch(()=>{});
 };
 const unsubscribe=subscribeAudioOwners(ownersChanged);
 const apply=value=>{
  if(destroyed)return;const playing=value?.playing===true;setForegroundAudio(owner,playing);
  if(playing&&!bar&&globalThis.document?.createElement&&document.body){
   bar=document.createElement('aside');bar.className='reminder-player';bar.setAttribute('aria-label','Азан');bar.setAttribute('role','region');
   const text=document.createElement('span');text.className='reminder-player-copy';text.textContent='Азан';
   const stop=document.createElement('button');stop.type='button';stop.className='reminder-player-stop';stop.setAttribute('aria-label','Остановить и закрыть Азан');stop.textContent='✕';stop.onclick=()=>Promise.resolve(plugin.stopAdhan()).catch(()=>{});
   bar.append(text,stop);document.body.append(bar);
  }
  if(bar)bar.hidden=!playing;
 };
 const state=value=>{version++;apply(value)};
 if(typeof plugin.addListener==='function')Promise.resolve(plugin.addListener('nativeAdhanState',state)).then(value=>{if(destroyed)value?.remove?.();else handle=value;}).catch(()=>{});
 const initial=version;Promise.resolve(plugin.getStatus()).then(value=>{if(version===initial)apply(value)}).catch(()=>{});
 return {destroy(){destroyed=true;unsubscribe();setForegroundAudio(owner,false);bar?.remove();bar=null;Promise.resolve(handle?.remove?.()).catch(()=>{});}};
}
