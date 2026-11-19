import{createAutomaticOffline}from './offline-auto-core.js';
import{offlineAutoPolicy}from './offline-auto-policy.js';
import{mushafOfflineDownload}from './quran-mushaf-offline.js';
import{prayerOfflineDownload,prayerOfflineIdentity,prayerOfflineMonths}from './prayer-offline.js';
import{prayerContext}from './prayers.js';
import{quranTranslations,QURAN_TRANSLATION_IDS,BUNDLED_TRANSLATION_ID}from './quran-translations.js';
import{read}from './storage.js';
const INDEX_SHA256='595ac16d997b8bf8402278e357f56c913462510a817c116bb8756adda55e2b10';
const check=signal=>{if(signal.aborted)throw new DOMException('Paused','AbortError');};
const yieldWork=()=>new Promise(resolve=>setTimeout(resolve,40));
// Separate metadata read: background work cannot occupy loadIndex's shared
// foreground promise. The installed shell supplies this exact index offline.
export async function automaticOfflineIndex({signal,fetcher=globalThis.fetch,cryptography=globalThis.crypto,timeoutMs=20000}={}){
 check(signal);const controller=new AbortController(),abort=()=>controller.abort(),timer=setTimeout(abort,timeoutMs);signal.addEventListener('abort',abort,{once:true});
 let rejectAbort;const cancelled=new Promise((_,reject)=>{rejectAbort=()=>reject(new DOMException('Paused','AbortError'));controller.signal.addEventListener('abort',rejectAbort,{once:true});});
 try{
  const bytes=await Promise.race([Promise.resolve().then(async()=>{const response=await fetcher('./data/quran-index.json',{signal:controller.signal});if(!response.ok)throw Error('Index unavailable');return response.arrayBuffer();}),cancelled]);check(signal);
  const digest=[...new Uint8Array(await cryptography.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');if(digest!==INDEX_SHA256)throw Error('Index verification failed');
  const index=JSON.parse(new TextDecoder().decode(bytes));if(index.surahs?.length!==114||index.surahs.some((row,i)=>row.number!==i+1))throw Error('Incomplete index');check(signal);return index;
 }finally{clearTimeout(timer);signal.removeEventListener('abort',abort);controller.signal.removeEventListener('abort',rejectAbort);}
}
const selectedMeaning=()=>{const id=read('quran-preferences',{}).translationEdition;return QURAN_TRANSLATION_IDS.includes(id)?id:BUNDLED_TRANSLATION_ID;};
export async function prepareAutomaticOffline(signal,{index=automaticOfflineIndex,texts=mushafOfflineDownload,prayer=prayerOfflineDownload,translations=quranTranslations,meaning=selectedMeaning}={}){
 check(signal);if(texts.state.status==='downloading'||prayer.getState().running)throw Error('Manual download active');
 const data=await index({signal});check(signal);let failed=false;
 try{const result=await texts.start(data,{automatic:true,signal,concurrency:1,yieldWork});check(signal);if(!result.complete)failed=true;}catch(error){check(signal);failed=true;}
 const edition=meaning();check(signal);
 if(edition!==BUNDLED_TRANSLATION_ID)try{await translations.saveAll(edition,{signal,concurrency:1,yieldWork});}catch(error){check(signal);failed=true;}
 check(signal);if(prayer.getState().running)throw Error('Manual prayer download active');
 const abort=()=>prayer.cancel();signal.addEventListener('abort',abort,{once:true});
 try{check(signal);const result=await prayer.save();check(signal);if(!['complete','published','chooseCity'].includes(result.reason))failed=true;}
 finally{signal.removeEventListener('abort',abort);}
 if(failed)throw Error('Offline preparation incomplete');
}
let mounted=null;
export function initAutomaticOffline({canStart=()=>true,doc=globalThis.document,win=globalThis.window,nav=globalThis.navigator,policy=offlineAutoPolicy,run=prepareAutomaticOffline}={}){
 if(mounted)return mounted;
 const identity=()=>{const context=prayerContext();return JSON.stringify([INDEX_SHA256,prayerOfflineIdentity(context),prayerOfflineMonths(context)[0],selectedMeaning()]);};
 const eligible=()=>canStart()&&!doc.hidden&&nav.onLine!==false&&!nav.connection?.saveData&&!['slow-2g','2g'].includes(nav.connection?.effectiveType)&&!doc.querySelector('dialog[open],[data-cache-clearing]')&&!doc.activeElement?.matches?.('input,textarea,[contenteditable=true]')&&!!globalThis.caches;
 const control=createAutomaticOffline({policy,run,identity,eligible,reflect:active=>{if(active)doc.documentElement.dataset.offlineAutoDownload='active';else delete doc.documentElement.dataset.offlineAutoDownload;}});
 const bindings=[[doc,'visibilitychange'],[win,'online'],[win,'offline'],[win,'focus'],[win,'pageshow'],[win,'hashchange'],[win,'salah:settings-changed'],[win,'storage'],[doc,'pointerdown'],[doc,'keydown'],[doc,'wheel'],[nav.connection,'change']];
 for(const [target,name]of bindings)target?.addEventListener?.(name,control.wake,{passive:true});
 const stop=async()=>{for(const [target,name]of bindings)target?.removeEventListener?.(name,control.wake);win.removeEventListener('pagehide',hide);await control.stop();if(mounted===handle)mounted=null;};
 const hide=event=>{if(event.persisted)control.wake();else void stop();};const handle={wake:control.wake,stop};mounted=handle;win.addEventListener('pagehide',hide);return handle;
}
