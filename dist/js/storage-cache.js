import{t,translateUi,getLocale,subscribeLanguage}from './i18n.js';
import{offlineAudioStore}from './quran-offline-store.js';
import{quranDownloadQueue}from './quran-downloads.js';
import{quranPlayback}from './quran-session.js';
import{pauseTextDownloads}from './quran-data.js';
import{mushafOfflineDownload}from './quran-mushaf-offline.js';
import{offlineAutoPolicy}from './offline-auto-policy.js';
import{pauseTranslationDownloads}from './quran-translations.js';
import{RECOGNITION_CACHE}from './quran-recognition-data.js';
import{esc,modal,closeModal,toast}from './ui.js';
// Only reproducible public downloads: never the app shell, account caches or personal storage.
export const CLEARABLE_CACHES=Object.freeze(['salah-quran-text-v1','salah-quran-mushaf-v1','salah-quran-translations-v1','salah-quran-timing-v1','salah-quran-recognition-v1','salah-quran-recognition-v2','salah-quran-recognition-v460','salah-quran-recognition-v2-241',RECOGNITION_CACHE,'salah-quran-tafsir-v1','salah-landmarks-v1','salah-builtin-wallpapers-v1']);
export async function clearAppCache({audioStore=offlineAudioStore,cacheStorage=globalThis.caches,downloads=quranDownloadQueue,playback=quranPlayback,textDownloads=pauseTextDownloads,translationDownloads=pauseTranslationDownloads,mushafDownloads=mushafOfflineDownload}={}){
 await offlineAutoPolicy.disable();
 await Promise.all([downloads.pause(),mushafDownloads.pause(),textDownloads(),translationDownloads()]);playback.stop();
 const tasks=[Promise.resolve().then(()=>audioStore.clearAll()),...CLEARABLE_CACHES.map(name=>Promise.resolve().then(()=>cacheStorage?.delete(name)))];
 const results=await Promise.allSettled(tasks);downloads.reset();mushafDownloads.reset();
 const failure=results.find(r=>r.status==='rejected');if(failure)throw failure.reason;
}
let detachCacheSettings=null;
export function mountCacheSettings(root,{clear=clearAppCache,list=()=>offlineAudioStore.listRecordings()}={}){
 detachCacheSettings?.();detachCacheSettings=null;
 if(!root)return;root.className='cache-storage-settings';
 root.innerHTML='<h3 data-i18n="cacheUi.title">'+esc(t('cacheUi.title'))+'</h3><p class="muted" data-i18n="cacheUi.note">'+esc(t('cacheUi.note'))+'</p><p class="muted" data-i18n="cacheUi.preserved">'+esc(t('cacheUi.preserved'))+'</p><p data-cache-size class="muted" role="status" data-i18n="cacheUi.checking">'+esc(t('cacheUi.checking'))+'</p><button type="button" class="button secondary" data-clear-cache data-i18n="cacheUi.clear">'+esc(t('cacheUi.clear'))+'</button><p data-cache-result class="muted" role="status" aria-live="polite"></p>';
 const button=root.querySelector('[data-clear-cache]'),size=root.querySelector('[data-cache-size]'),result=root.querySelector('[data-cache-result]');let refreshing=0,busy=false,records=null;
 const text=(node,key,params={})=>{if(!node)return;if(key){node.setAttribute('data-i18n',key);node.setAttribute('data-i18n-params',JSON.stringify(params));}else{node.removeAttribute('data-i18n');node.removeAttribute('data-i18n-params');}node.textContent=key?t(key,params):'';};
 const paintSize=()=>{if(!records)return;const bytes=records.reduce((n,r)=>n+r.bytes,0);text(size,'cacheUi.size',{count:records.length,size:new Intl.NumberFormat(getLocale(),{minimumFractionDigits:1,maximumFractionDigits:1}).format(bytes/1048576)});};
 const refresh=async()=>{const id=++refreshing;try{const value=await list();if(!root.isConnected||id!==refreshing)return;records=value;paintSize();}catch{if(root.isConnected&&id===refreshing){records=null;text(size,'cacheUi.checkFailed');}}};
 button.onclick=()=>{
  if(busy)return;
  modal('<h2 data-i18n="cacheUi.confirmTitle">'+esc(t('cacheUi.confirmTitle'))+'</h2><p data-i18n="cacheUi.confirmNote">'+esc(t('cacheUi.confirmNote'))+'</p><p class="muted" data-i18n="cacheUi.confirmPreserved">'+esc(t('cacheUi.confirmPreserved'))+'</p><p data-cache-error role="status" aria-live="polite"></p><div class="button-row"><button type="button" class="button" data-confirm-cache data-i18n="cacheUi.clear">'+esc(t('cacheUi.clear'))+'</button><button type="button" class="button secondary" data-close data-i18n="common.cancel">'+esc(t('common.cancel'))+'</button></div>');
  const confirm=document.querySelector('[data-confirm-cache]'),cancel=document.querySelector('#modal [data-close]'),error=document.querySelector('[data-cache-error]');
  confirm.onclick=async()=>{
   if(busy)return;busy=true;button.disabled=confirm.disabled=cancel.disabled=true;text(confirm,'cacheUi.clearing');root.setAttribute('data-cache-clearing','');text(error,'');text(result,'cacheUi.clearingCache');
   try{await clear();closeModal();if(root.isConnected){text(result,'cacheUi.cleared');void refresh();}toast(t('cacheUi.clearedToast'));}
   catch{if(error.isConnected)text(error,'cacheUi.failed');if(root.isConnected){text(result,'cacheUi.failed');void refresh();}}
   finally{busy=false;root.removeAttribute('data-cache-clearing');button.disabled=confirm.disabled=cancel.disabled=false;text(confirm,'cacheUi.clear');}
  };
 };
 const offLanguage=subscribeLanguage(()=>{if(root.isConnected)paintSize();else cleanup();}),route=()=>{if(!root.isConnected)cleanup();};
 const cleanup=()=>{offLanguage();window.removeEventListener('hashchange',route);refreshing++;if(detachCacheSettings===cleanup)detachCacheSettings=null;};
 window.addEventListener('hashchange',route);detachCacheSettings=cleanup;translateUi(root);void refresh();return cleanup;
}
