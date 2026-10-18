import{offlineAudioStore}from './quran-offline-store.js';
import{quranDownloadQueue}from './quran-downloads.js';
import{quranPlayback}from './quran-session.js';
import{modal,closeModal,toast}from './ui.js';
// Only reproducible public downloads: never the app shell, account caches or personal storage.
export const CLEARABLE_CACHES=Object.freeze(['salah-quran-text-v1','salah-quran-timing-v1','salah-quran-recognition-v1','salah-quran-recognition-v2','salah-quran-tafsir-v1','salah-landmarks-v1','salah-builtin-wallpapers-v1']);
export async function clearAppCache({audioStore=offlineAudioStore,cacheStorage=globalThis.caches,downloads=quranDownloadQueue,playback=quranPlayback}={}){
 await downloads.pause();playback.stop();
 const tasks=[Promise.resolve().then(()=>audioStore.clearAll()),...CLEARABLE_CACHES.map(name=>Promise.resolve().then(()=>cacheStorage?.delete(name)))];
 const results=await Promise.allSettled(tasks);downloads.reset();
 const failure=results.find(r=>r.status==='rejected');if(failure)throw failure.reason;
}
export function mountCacheSettings(root,{clear=clearAppCache,list=()=>offlineAudioStore.listRecordings()}={}){
 if(!root)return;root.className='cache-storage-settings';
 root.innerHTML='<h3>Кэш и скачанные суры</h3><p class="muted">Очистка удаляет скачанное аудио всех чтецов, сохранённые тексты Корана и тафсиров, базу распознавания и кэш дополнительных обоев. Для повторной загрузки понадобится интернет.</p><p class="muted">Аккаунт, настройки, закладки и прогресс сохранятся.</p><p data-cache-size class="muted" role="status">Проверяем скачанные суры…</p><button type="button" class="button secondary" data-clear-cache>Очистить кэш</button><p data-cache-result class="muted" role="status" aria-live="polite"></p>';
 const button=root.querySelector('[data-clear-cache]'),size=root.querySelector('[data-cache-size]'),result=root.querySelector('[data-cache-result]');let refreshing=0,busy=false;
 const refresh=async()=>{const id=++refreshing;try{const records=await list();if(!root.isConnected||id!==refreshing)return;const bytes=records.reduce((n,r)=>n+r.bytes,0);size.textContent='Скачанные записи: '+records.length+' · '+(bytes/1048576).toFixed(1).replace('.',',')+' МБ';}catch{if(root.isConnected&&id===refreshing)size.textContent='Не удалось проверить скачанные суры.';}};
 button.onclick=()=>{
  if(busy)return;
  modal('<h2>Очистить кэш SALAH?</h2><p>Будут удалены скачанные суры всех чтецов, сохранённые тексты Корана, базу распознавания и кэш дополнительных обоев.</p><p class="muted">Аккаунт, настройки, закладки и прогресс сохранятся. Воспроизведение Корана и скачивание будут остановлены.</p><p data-cache-error role="status" aria-live="polite"></p><div class="button-row"><button type="button" class="button" data-confirm-cache>Очистить кэш</button><button type="button" class="button secondary" data-close>Отмена</button></div>');
  const confirm=document.querySelector('[data-confirm-cache]'),cancel=document.querySelector('#modal [data-close]'),error=document.querySelector('[data-cache-error]');
  confirm.onclick=async()=>{
   if(busy)return;busy=true;button.disabled=confirm.disabled=cancel.disabled=true;confirm.textContent='Очищаем…';root.setAttribute('data-cache-clearing','');error.textContent='';result.textContent='Очищаем кэш…';
   try{await clear();closeModal();if(root.isConnected){result.textContent='Кэш и скачанные суры очищены.';void refresh();}toast('Кэш и скачанные суры очищены');}
   catch{const text='Не удалось очистить весь кэш. Закройте другие окна SALAH и повторите.';if(error.isConnected)error.textContent=text;if(root.isConnected){result.textContent=text;void refresh();}}
   finally{busy=false;root.removeAttribute('data-cache-clearing');button.disabled=confirm.disabled=cancel.disabled=false;confirm.textContent='Очистить кэш';}
  };
 };
 void refresh();
}
