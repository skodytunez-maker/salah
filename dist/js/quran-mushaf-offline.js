import{saveAllTexts,offlineTextStatus}from './quran-data.js';
import{t,getLocale,subscribeLanguage}from './i18n.js';
import{uiLeaf,setUiLabel}from './quran-ui.js';
export const MUSHAF_OFFLINE_CACHE='salah-quran-mushaf-v1';
export const MUSHAF_OFFLINE_MODE_KEY='quran-mushaf-offline-reading';
export const MUSHAF_OFFLINE_FONT=Object.freeze({path:'./assets/amiri-quran.ttf',bytes:130184,sha256:'dd11ed7dad6e426e67c4e0cbfd42d2f8469bf60e4eaab739ed0b674486348cf9'});
const aborted=signal=>{if(signal?.aborted)throw new DOMException('Paused','AbortError');};
async function verifiedFont(response){
 if(!response?.ok||response.status!==200||response.type==='opaque'||response.headers.has('Content-Range'))throw Error('Font unavailable');
 const bytes=await response.arrayBuffer();
 const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
 if(bytes.byteLength!==MUSHAF_OFFLINE_FONT.bytes||hash!==MUSHAF_OFFLINE_FONT.sha256)throw Error('Font verification failed');
 return bytes;
}
async function storedFont(cacheStorage=globalThis.caches){
 if(!cacheStorage)throw Error('Offline storage unavailable');
 const cache=await cacheStorage.open(MUSHAF_OFFLINE_CACHE),url=new URL(MUSHAF_OFFLINE_FONT.path,location.href).href;
 try{return await verifiedFont(await cache.match(url));}catch{return null;}
}
export async function saveOfflineMushafFont({cacheStorage=globalThis.caches,fetcher=globalThis.fetch,signal}={}){
 aborted(signal);const saved=await storedFont(cacheStorage);aborted(signal);if(saved)return saved;
 const url=new URL(MUSHAF_OFFLINE_FONT.path,location.href).href,controller=new AbortController(),abort=()=>controller.abort(),timer=setTimeout(abort,20000);signal?.addEventListener('abort',abort,{once:true});let bytes;
 try{bytes=await verifiedFont(await fetcher(url,{cache:'no-cache',signal:controller.signal}));}finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}aborted(signal);
 const cache=await cacheStorage.open(MUSHAF_OFFLINE_CACHE);await cache.put(url,new Response(bytes,{headers:{'Content-Type':'font/ttf'}}));
 const confirmed=await verifiedFont(await cache.match(url));aborted(signal);return confirmed;
}
let offlineFontTask=null;
export async function ensureOfflineMushafFont(){
 if(!offlineFontTask)offlineFontTask=(async()=>{
  const bytes=await saveOfflineMushafFont();
  const face=new FontFace('SALAHOfflineMushaf',bytes);await face.load();document.fonts.add(face);return face.family;
 })().catch(error=>{offlineFontTask=null;throw error;});
 return offlineFontTask;
}
const errorKind=error=>error?.name==='QuotaExceededError'||error?.cause?.name==='QuotaExceededError'?'quota':['SecurityError','NotSupportedError'].includes(error?.name)||/storage unavailable/i.test(error?.message||'')?'storage':'failed';
const activeMushafDownloads=new Set();
const reflectMushafDownloads=()=>{const dataset=globalThis.document?.documentElement?.dataset;if(dataset){if(activeMushafDownloads.size)dataset.mushafDownload='active';else delete dataset.mushafDownload;}};
export function createMushafOfflineDownload({save=saveAllTexts,inspect=offlineTextStatus,cacheStorage=globalThis.caches,fetcher=globalThis.fetch,storage=globalThis.navigator?.storage}={}){
 let state={status:'idle',done:0,complete:false,bytes:0,totalBytes:0,error:null},controller=null,task=null,generation=0;
 const listeners=new Set(),emit=patch=>{state={...state,...patch};for(const fn of listeners)fn({...state});};
 const inspectAll=async index=>{const [texts,font]=await Promise.all([inspect(index),storedFont(cacheStorage)]);return{done:texts.count,complete:texts.complete&&!!font,bytes:texts.bytes+(font?.byteLength||0),totalBytes:texts.totalBytes+MUSHAF_OFFLINE_FONT.bytes};};
 const check=async index=>{
  if(task)return{...state};const ticket=++generation;emit({status:'checking',error:null});
  try{const value=await inspectAll(index);if(ticket===generation)emit({...value,status:value.complete?'ready':'idle'});}catch(error){if(ticket===generation)emit({status:'error',error:errorKind(error),complete:false});}
  return{...state};
 };
 const start=index=>{
  if(task)return task;const ticket=++generation;controller=new AbortController();const signal=controller.signal;activeMushafDownloads.add(signal);reflectMushafDownloads();emit({status:'downloading',error:null,complete:false});
  task=(async()=>{
   try{
    // Request persistence only after the user chooses to download. Browsers may decline it.
    try{await storage?.persist?.();}catch{}aborted(signal);
    const before=await inspectAll(index);aborted(signal);if(ticket!==generation)return;emit({...before,status:'downloading',complete:false});
    if(!before.complete&&storage?.estimate)try{const estimate=await storage.estimate(),missing=Math.max(0,before.totalBytes-before.bytes);if(Number.isFinite(estimate.quota)&&Number.isFinite(estimate.usage)&&estimate.quota-estimate.usage<missing){const error=new Error('Not enough space');error.name='QuotaExceededError';throw error;}}catch(error){if(error?.name==='QuotaExceededError')throw error;}
    aborted(signal);await saveOfflineMushafFont({cacheStorage,fetcher,signal});
    await save(index,done=>{if(ticket===generation&&!signal.aborted)emit({done:Math.max(before.done,done)});},{signal});aborted(signal);
    const after=await inspectAll(index);aborted(signal);if(!after.complete)throw Error('Download verification failed');
    if(ticket===generation)emit({...after,status:'ready',error:null});
   }catch(error){
    if(ticket===generation){let value={};try{value=await inspectAll(index);}catch{}emit({...value,status:signal.aborted?'paused':'error',error:signal.aborted?null:errorKind(error),complete:false});}
   }finally{activeMushafDownloads.delete(signal);reflectMushafDownloads();if(ticket===generation){controller=null;task=null;}}
   return{...state};
  })();return task;
 };
 return{get state(){return{...state};},check,start,async pause(){controller?.abort();if(task){emit({status:'paused',complete:false});await task;}return{...state};},reset(){if(task)return false;generation++;emit({status:'idle',done:0,complete:false,bytes:0,totalBytes:0,error:null});return true;},subscribe(fn){listeners.add(fn);fn({...state});return()=>listeners.delete(fn);}};
}
export const mushafOfflineDownload=createMushafOfflineDownload();
export function mushafOfflineOptions(){
 return '<section class="mushaf-offline-download"><h2>'+uiLeaf('offlineUi.mushafTitle')+'</h2><p class="muted">'+uiLeaf('offlineUi.mushafNote')+'</p><p class="muted">'+uiLeaf('offlineUi.mushafAppearance')+'</p><p id="mushaf-offline-status" role="status" aria-live="polite">'+uiLeaf('offlineUi.checking')+'</p><progress id="mushaf-offline-progress" max="114" value="0" hidden></progress><div class="button-row"><button type="button" id="mushaf-save-offline">'+uiLeaf('offlineUi.download')+'</button><button type="button" id="mushaf-pause-offline" hidden>'+uiLeaf('offlineUi.pause')+'</button><button type="button" id="mushaf-offline-mode" disabled>'+uiLeaf('offlineUi.read')+'</button></div></section>';
}
export function mountMushafOffline(host,index,{getOffline=()=>false,onModeChange=()=>{},queue=mushafOfflineDownload}={}){
 const status=host.querySelector('#mushaf-offline-status'),progress=host.querySelector('#mushaf-offline-progress'),save=host.querySelector('#mushaf-save-offline'),pause=host.querySelector('#mushaf-pause-offline'),mode=host.querySelector('#mushaf-offline-mode');
 let closed=false,snapshot=queue.state;
 const paint=()=>{
  if(closed)return;const busy=snapshot.status==='downloading',checking=snapshot.status==='checking';
  const key=checking?'offlineUi.checking':snapshot.status==='ready'?'offlineUi.ready':snapshot.status==='paused'?'offlineUi.paused':snapshot.status==='error'?'offlineUi.'+(snapshot.error==='quota'?'quota':snapshot.error==='storage'?'storage':'failed'):busy?'offlineUi.progress':'offlineUi.available';
  setUiLabel(status,key,{count:snapshot.done,size:new Intl.NumberFormat(getLocale(),{minimumFractionDigits:1,maximumFractionDigits:1}).format((snapshot.totalBytes||index.totalBytes+(index.transcriptionBytes||0)+(index.searchBytes||0)+MUSHAF_OFFLINE_FONT.bytes)/1048576)});
  progress.hidden=!busy;progress.value=snapshot.done;save.disabled=busy||checking||snapshot.complete;pause.hidden=!busy;setUiLabel(save,snapshot.done&&!snapshot.complete?'offlineUi.resume':'offlineUi.download');mode.disabled=!getOffline()&&!snapshot.complete;setUiLabel(mode,getOffline()?'offlineUi.printed':'offlineUi.read');
 };
 const off=queue.subscribe(state=>{snapshot=state;paint();}),offLanguage=subscribeLanguage(paint);
 save.onclick=()=>void queue.start(index);pause.onclick=()=>void queue.pause();mode.onclick=()=>{onModeChange(!getOffline());paint();};
 if(snapshot.status!=='downloading')void queue.check(index);
 return{refresh:paint,dispose(){closed=true;off();offLanguage();save.onclick=pause.onclick=mode.onclick=null;}};
}
