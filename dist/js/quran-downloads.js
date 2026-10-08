import{loadSurah,saveSurahAudio,loadIndex}from './quran-data.js';
import{RECITER_FAVORITES_KEY}from './quran-reciter-favorites.js';
import{RECITERS,reciterHasSurah,reciterOptions,reciterInfo}from './quran-reciters.js';
import{offlineAudioStore}from './quran-offline-store.js';
import{createQuranDownloadQueue}from './quran-offline-core.js';
import{read,write}from './storage.js';
import{esc,toast,modal,closeModal}from './ui.js';
export const quranDownloadQueue=createQuranDownloadQueue({loadSurah,saveSurah:saveSurahAudio,hasSurah:reciterHasSurah});
const megabytes=bytes=>bytes>=1073741824?(bytes/1073741824).toFixed(1).replace('.',',')+' ГБ':(bytes/1048576).toFixed(1).replace('.',',')+' МБ';
quranDownloadQueue.subscribe(state=>{if(typeof document!=='undefined'&&document.documentElement?.dataset){if(['downloading','pausing'].includes(state.status))document.documentElement.dataset.quranDownload='active';else delete document.documentElement.dataset.quranDownload;}});
export function quranDownloadsMarkup(){return '<details class="quran-offline quran-downloads"><summary>Скачать Коран</summary><div class="quran-download-controls"><label class="field">Чтец<select id="quran-offline-reciter"></select></label><label class="field">Что скачать<select id="quran-offline-selection"></select></label><div class="button-row"><button type="button" class="button" id="quran-offline-start">Скачать</button><button type="button" class="button secondary" id="quran-offline-pause" hidden>Пауза</button></div><p id="quran-offline-audio-status" role="status" aria-live="polite"></p><p id="quran-offline-space" class="muted"></p><details class="quran-saved-audio"><summary>Скачанные суры <span id="quran-saved-count">0</span></summary><div id="quran-saved-recordings"></div></details><button type="button" class="text-button" id="quran-offline-remove">Удалить скачанные записи</button></div></details>';}
export function mountQuranDownloads(host,index){
 let active=true,version=0,lastPaint=0,listVersion=0,lastStatus='',lastDone=-1;
 const preferred=read('quran-offline-reciter',read('quran-preferences',{}).reciter),selected=RECITERS.some(r=>r.id===preferred&&r.offline!==false)?preferred:'ar.alafasy';
 const reciter=host.querySelector('#quran-offline-reciter'),selection=host.querySelector('#quran-offline-selection'),start=host.querySelector('#quran-offline-start'),pause=host.querySelector('#quran-offline-pause'),status=host.querySelector('#quran-offline-audio-status'),remove=host.querySelector('#quran-offline-remove');
 reciter.innerHTML=reciterOptions(quranDownloadQueue.busy?quranDownloadQueue.state.reciter:selected,read(RECITER_FAVORITES_KEY,[]),{offline:true});
 function choices(){
  const available=index.surahs.filter(s=>reciterHasSurah(reciter.value,s.number));
  selection.innerHTML='<option value="all">'+(available.length===114?'Весь Коран · 114 сур':'Все доступные · '+available.length+' сур')+'</option>'+available.map(s=>'<option value="'+s.number+'">'+s.number+'. '+esc(s.name)+'</option>').join('');
 }
 choices();
 async function recordings(){
  const current=++listVersion,id=reciter.value;
  try{
   const records=await offlineAudioStore.listRecordings(id);if(!active||current!==listVersion||!host.isConnected)return;
   host.querySelector('#quran-saved-count').textContent=String(records.length);
   host.querySelector('#quran-saved-recordings').innerHTML=records.length?records.map(record=>'<a class="quran-downloaded-row" href="#quran?surah='+record.surah+'&reciter='+encodeURIComponent(id)+'&offline=1"><span>'+esc(index.surahs[record.surah-1].name)+'</span><small>'+megabytes(record.bytes)+'</small></a>').join(''):'<p class="muted">Пока нет скачанных сур</p>';
  }catch{if(active&&host.isConnected)host.querySelector('#quran-saved-recordings').innerHTML='<p class="muted">Хранилище недоступно</p>';}
 }
 const unsubscribe=quranDownloadQueue.subscribe(state=>{
  if(!active||!host.isConnected)return;
  const changed=state.status!==lastStatus||state.done!==lastDone;
  if(!changed&&Date.now()-lastPaint<300)return;lastPaint=Date.now();lastStatus=state.status;lastDone=state.done;
  const busy=quranDownloadQueue.busy;reciter.disabled=selection.disabled=start.disabled=remove.disabled=busy;pause.hidden=!busy;pause.disabled=state.status==='pausing';
  if(busy){const name=index.surahs[(state.surah||1)-1]?.name||'';status.textContent=name+' · '+state.done+' из '+state.total+' сур · '+megabytes(state.bytes+(state.currentBytes||0));start.textContent='Скачиваем…';}
  else{status.title=state.status==='error'?state.reason||'':'';start.textContent=['paused','error'].includes(state.status)?'Продолжить скачивание':'Скачать';status.textContent=state.status==='complete'?'Скачивание завершено · '+megabytes(state.bytes):state.status==='paused'?'На паузе. Скачанное сохранено.':state.status==='error'?state.error:'Слушайте скачанные суры без интернета';}
  if(changed)void recordings();
 });
 pause.onclick=()=>quranDownloadQueue.pause();
 reciter.onchange=()=>{write('quran-offline-reciter',reciter.value);choices();status.textContent='Слушайте скачанные суры без интернета';start.textContent='Скачать';void recordings();};
 async function begin(){
  const id=reciter.value,requested=selection.value==='all'?index.surahs.map(s=>s.number).filter(n=>reciterHasSurah(id,n)):[Number(selection.value)];
  try{
   const records=await offlineAudioStore.listRecordings(id),saved=new Set(records.map(r=>r.surah));
   const pending=requested.filter(n=>!saved.has(n));if(!pending.length){toast('Записи уже скачаны');return;}
   try{await navigator.storage?.persist?.();}catch{}
   await quranDownloadQueue.start(id,pending);void recordings();
  }catch{if(active&&host.isConnected)status.textContent='Не удалось начать загрузку. Проверьте свободное место.';}
 }
 start.onclick=()=>{
  if(selection.value!=='all'){void begin();return;}
  const count=index.surahs.filter(s=>reciterHasSurah(reciter.value,s.number)).length;
  modal('<h2>Скачать '+count+' сур?</h2><p>'+esc(reciterInfo(reciter.value).name)+'</p><p class="muted">Оставьте SALAH открытым до окончания загрузки.</p><div class="button-row"><button type="button" class="button" id="quran-confirm-download">Скачать</button><button type="button" class="button secondary" data-close>Отмена</button></div>');
  document.querySelector('#quran-confirm-download').onclick=()=>{closeModal();void begin();};
 };
 remove.onclick=()=>{
  modal('<h2>Удалить скачанные записи?</h2><p class="muted">Записи всех чтецов можно скачать снова.</p><div class="button-row"><button type="button" class="button" id="quran-confirm-remove">Удалить записи</button><button type="button" class="button secondary" data-close>Отмена</button></div>');
  document.querySelector('#quran-confirm-remove').onclick=async()=>{if(quranDownloadQueue.busy)return;closeModal();try{await offlineAudioStore.clearAll();void recordings();toast('Скачанные записи удалены');}catch{toast('Не удалось удалить записи');}};
 };
 void recordings();
 return()=>{active=false;version++;listVersion++;unsubscribe();};
}
