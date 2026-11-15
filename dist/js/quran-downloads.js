import{loadSurah,saveSurahAudio}from './quran-data.js';
import{RECITER_FAVORITES_KEY}from './quran-reciter-favorites.js';
import{RECITERS,reciterHasSurah,reciterOptions,reciterInfo}from './quran-reciters.js';
import{offlineAudioStore}from './quran-offline-store.js';
import{createQuranDownloadQueue}from './quran-offline-core.js';
import{read,write}from './storage.js';
import{esc,toast,closeModal}from './ui.js';
import{t,getLocale}from './i18n.js';
import{uiLeaf,uiTextAttributes,setUiLabel,bindQuranUi,translateReciterGroups,downloadErrorKey,quranModal}from './quran-ui.js';
import{uiAttribute,setUiAttribute,clearUiLabel}from './quran-ui.js';
import{actionIcon}from './action-icons.js';
import{quranPlayback}from './quran-session.js';
import{reciterRecording}from './quran-reciter-recording.js';
export const quranDownloadQueue=createQuranDownloadQueue({loadSurah,saveSurah:saveSurahAudio,hasSurah:reciterHasSurah});
const megabytes=bytes=>t(bytes>=1073741824?'downloadUi.gigabytes':'downloadUi.megabytes',{value:new Intl.NumberFormat(getLocale(),{minimumFractionDigits:1,maximumFractionDigits:1}).format(bytes/(bytes>=1073741824?1073741824:1048576))});
quranDownloadQueue.subscribe(state=>{if(typeof document!=='undefined'&&document.documentElement?.dataset){if(['downloading','pausing'].includes(state.status))document.documentElement.dataset.quranDownload='active';else delete document.documentElement.dataset.quranDownload;}});
export function quranDownloadsMarkup({savedList=true}={}){return '<details class="quran-offline quran-downloads"><summary>'+uiLeaf('downloadUi.quran')+'</summary><div class="quran-download-controls"><label class="field">'+uiLeaf('player.reciter')+'<select id="quran-offline-reciter"></select></label><label class="field">'+uiLeaf('downloadUi.what')+'<select id="quran-offline-selection"></select></label><div class="button-row"><button type="button" class="button" id="quran-offline-start">'+uiLeaf('downloadUi.download')+'</button><button type="button" class="button secondary" id="quran-offline-pause" hidden>'+uiLeaf('player.pause')+'</button></div><p id="quran-offline-audio-status" role="status" aria-live="polite"></p><p id="quran-offline-space" class="muted"></p>'+(savedList?'<details class="quran-saved-audio"><summary>'+uiLeaf('downloadUi.savedSurahs')+' <span id="quran-saved-count">0</span></summary><div id="quran-saved-recordings"></div></details><button type="button" class="text-button" id="quran-offline-remove">'+uiLeaf('downloadUi.removeDownloaded')+'</button>':'')+'</div></details>';}
export function mountQuranDownloads(host,index){
 let active=true,lastPaint=0,listVersion=0,lastStatus='',lastDone=-1,currentState=quranDownloadQueue.state;
 const preferred=read('quran-offline-reciter',read('quran-preferences',{}).reciter),selected=RECITERS.some(r=>r.id===preferred&&r.offline!==false)?preferred:'ar.alafasy';
 const reciter=host.querySelector('#quran-offline-reciter'),selection=host.querySelector('#quran-offline-selection'),start=host.querySelector('#quran-offline-start'),pause=host.querySelector('#quran-offline-pause'),status=host.querySelector('#quran-offline-audio-status'),remove=host.querySelector('#quran-offline-remove');
 reciter.innerHTML=reciterOptions(quranDownloadQueue.busy?quranDownloadQueue.state.reciter:selected,read(RECITER_FAVORITES_KEY,[]),{offline:true});
 function choices(){const available=index.surahs.filter(s=>reciterHasSurah(reciter.value,s.number)),key=available.length===114?'downloadUi.allQuran':'downloadUi.allAvailable',params={count:available.length};selection.innerHTML='<option value="all" '+uiTextAttributes(key,params)+'>'+esc(t(key,params))+'</option>'+available.map(s=>'<option value="'+s.number+'">'+s.number+'. '+esc(s.name)+'</option>').join('');}
 choices();
 async function recordings(){
  const current=++listVersion,id=reciter.value;if(!host.querySelector('#quran-saved-recordings'))return;
  try{const records=await offlineAudioStore.listRecordings(id);if(!active||current!==listVersion||!host.isConnected)return;host.querySelector('#quran-saved-count').textContent=String(records.length);host.querySelector('#quran-saved-recordings').innerHTML=records.length?records.map(record=>'<a class="quran-downloaded-row" href="#quran?surah='+record.surah+'&reciter='+encodeURIComponent(id)+'&offline=1"><span>'+esc(index.surahs[record.surah-1].name)+'</span><small data-download-bytes="'+record.bytes+'">'+esc(megabytes(record.bytes))+'</small></a>').join(''):'<p class="muted">'+uiLeaf('downloadUi.none')+'</p>';}
  catch{if(active&&host.isConnected)host.querySelector('#quran-saved-recordings').innerHTML='<p class="muted">'+uiLeaf('downloadUi.storageUnavailable')+'</p>';}
 }
 function paintStatus(state){
  if(!active)return;
  if(['downloading','pausing'].includes(state.status)){const name=index.surahs[(state.surah||1)-1]?.name||'';setUiLabel(status,'downloadUi.progress',{name,done:state.done,total:state.total,size:megabytes(state.bytes+(state.currentBytes||0))});setUiLabel(start,'downloadUi.downloading');}
  else{status.title=state.status==='error'?t(downloadErrorKey(state)):'';setUiLabel(start,['paused','error'].includes(state.status)?'downloadUi.resume':'downloadUi.download');setUiLabel(status,state.status==='complete'?'downloadUi.complete':state.status==='paused'?'downloadUi.paused':state.status==='error'?downloadErrorKey(state):'downloadUi.offlineHint',{size:megabytes(state.bytes)});}
 }
 const unsubscribe=quranDownloadQueue.subscribe(state=>{if(!active||!host.isConnected)return;currentState=state;const changed=state.status!==lastStatus||state.done!==lastDone;if(!changed&&Date.now()-lastPaint<300)return;lastPaint=Date.now();lastStatus=state.status;lastDone=state.done;const busy=quranDownloadQueue.busy;reciter.disabled=selection.disabled=start.disabled=busy;if(remove)remove.disabled=busy;pause.hidden=!busy;pause.disabled=state.status==='pausing';paintStatus(state);if(changed)void recordings();});
 const offLanguage=bindQuranUi(host,()=>{translateReciterGroups(reciter);paintStatus(currentState);for(const node of host.querySelectorAll('[data-download-bytes]'))node.textContent=megabytes(Number(node.dataset.downloadBytes));});
 pause.onclick=()=>quranDownloadQueue.pause();
 reciter.onchange=()=>{write('quran-offline-reciter',reciter.value);choices();setUiLabel(status,'downloadUi.offlineHint');setUiLabel(start,'downloadUi.download');void recordings();};
 async function begin(){const id=reciter.value,requested=selection.value==='all'?index.surahs.map(s=>s.number).filter(n=>reciterHasSurah(id,n)):[Number(selection.value)];try{const records=await offlineAudioStore.listRecordings(id),saved=new Set(records.map(r=>r.surah)),pending=requested.filter(n=>!saved.has(n));if(!pending.length){toast(t('downloadUi.already'));return;}try{await navigator.storage?.persist?.();}catch{}await quranDownloadQueue.start(id,pending);void recordings();}catch{if(active&&host.isConnected)setUiLabel(status,'downloadUi.startFailed');}}
 start.onclick=()=>{if(selection.value!=='all'){void begin();return;}const count=index.surahs.filter(s=>reciterHasSurah(reciter.value,s.number)).length;quranModal('<h2>'+uiLeaf('downloadUi.confirmCount',{count})+'</h2><p>'+esc(reciterInfo(reciter.value).name)+'</p><p class="muted">'+uiLeaf('downloadUi.keepOpen')+'</p><div class="button-row"><button type="button" class="button" id="quran-confirm-download">'+uiLeaf('downloadUi.download')+'</button><button type="button" class="button secondary" data-close>'+uiLeaf('common.cancel')+'</button></div>');document.querySelector('#quran-confirm-download').onclick=()=>{closeModal();void begin();};};
 if(remove)remove.onclick=()=>{quranModal('<h2>'+uiLeaf('downloadUi.confirmRemove')+'</h2><p class="muted">'+uiLeaf('downloadUi.canDownloadAgain')+'</p><div class="button-row"><button type="button" class="button" id="quran-confirm-remove">'+uiLeaf('downloadUi.removeRecordings')+'</button><button type="button" class="button secondary" data-close>'+uiLeaf('common.cancel')+'</button></div>');document.querySelector('#quran-confirm-remove').onclick=async()=>{if(quranDownloadQueue.busy)return;closeModal();try{await offlineAudioStore.clearAll();quranDownloadQueue.reset();void recordings();toast(t('downloadUi.removed'));}catch{toast(t('downloadUi.removeFailed'));}};};
 void recordings();
 return()=>{active=false;listVersion++;offLanguage();unsubscribe();};
}

// A recording belongs to the existing public audio store, not the selected
// meaning edition. Opening this library never contacts an audio provider.
export function mountSavedQuranAudio(host,index,{heading=()=>'',store=offlineAudioStore,playback=quranPlayback,recording=reciterRecording,queue=quranDownloadQueue,show=quranModal,close=closeModal,notify=toast}={}){
 let active=true,version=0,records=[],recordById=new Map(),deleting=false,loading=false,lastQueue='',playRequest=0,lastPlayback='';
 const known=new Map(RECITERS.map(reciter=>[reciter.id,reciter]));
 host.innerHTML='<section class="quran-library quran-reciters-library quran-saved-library">'+heading()+'<div class="quran-saved-heading"><h2>'+uiLeaf('offlineAudioUi.title')+'</h2><button type="button" class="text-button" data-saved-refresh>'+uiLeaf('offlineAudioUi.refresh')+'</button></div><p class="muted">'+uiLeaf('offlineAudioUi.description')+'</p><p data-saved-status role="status" aria-live="polite"></p><div data-saved-recordings></div><button type="button" class="text-button" data-saved-clear hidden>'+uiLeaf('downloadUi.removeDownloaded')+'</button><div data-saved-download-tools>'+quranDownloadsMarkup({savedList:false})+'</div></section>';
 const list=host.querySelector('[data-saved-recordings]'),status=host.querySelector('[data-saved-status]'),refresh=host.querySelector('[data-saved-refresh]'),clear=host.querySelector('[data-saved-clear]');
 const valid=()=>active&&host.isConnected;
 const parameters=record=>({surah:index.surahs[record.surah-1].name,reciter:known.get(record.reciter).name});
 const setControls=()=>{refresh.disabled=loading;clear.disabled=deleting||queue.busy;for(const button of list.querySelectorAll('[data-saved-remove]'))button.disabled=deleting||queue.busy;};
 function paintPlayback(state=playback.state){
  if(!valid())return;
  const signature=state.reciter+':'+state.surah?.number+':'+state.status;if(signature===lastPlayback)return;lastPlayback=signature;
  for(const button of list.querySelectorAll('[data-saved-play]')){const record=recordById.get(button.dataset.savedPlay);if(!record)continue;const matches=state.reciter===record.reciter&&state.surah?.number===record.surah,playing=matches&&['playing','loading'].includes(state.status);button.setAttribute('aria-pressed',String(playing));const key=playing?'player.pause':matches&&state.status==='paused'?'reciterUi.resume':'quranUi.listen';setUiLabel(button.querySelector('[data-saved-play-label]'),key);const icon=button.querySelector('[data-saved-play-icon]'),kind=playing?'pause':'play';if(icon.dataset.kind!==kind){icon.innerHTML=actionIcon(kind);icon.dataset.kind=kind;}setUiAttribute(button,'aria-label',playing?'player.pause':'offlineAudioUi.listenAria',playing?{}:parameters(record));}
 }
 function draw(){
  const groups=RECITERS.flatMap(reciter=>{const items=records.filter(record=>record.reciter===reciter.id);return items.length?[{reciter,items}]:[];});
  list.innerHTML=records.length?groups.map(({reciter,items})=>'<section class="quran-saved-reciter"><h3 translate="no">'+esc(reciter.name)+'</h3><p class="muted">'+uiLeaf('offlineAudioUi.recordsCount',{count:items.length})+'</p><div class="reciter-surahs">'+items.map(record=>'<article class="reciter-surah-row quran-saved-row"><button type="button" data-saved-play="'+esc(record.id)+'" '+uiAttribute('offlineAudioUi.listenAria',parameters(record))+'><span class="quran-surah-number">'+record.surah+'</span><span><strong translate="no">'+esc(index.surahs[record.surah-1].name)+'</strong><small data-saved-bytes="'+record.bytes+'">'+esc(megabytes(record.bytes))+'</small></span><span class="reciter-play-label"><span data-saved-play-icon>'+actionIcon('play')+'</span><span data-saved-play-label>'+uiLeaf('quranUi.listen')+'</span></span></button><button type="button" class="reciter-download quran-saved-remove" data-saved-remove="'+esc(record.id)+'" '+uiAttribute('offlineAudioUi.removeAria',parameters(record))+'>'+uiLeaf('offlineAudioUi.remove')+'</button></article>').join('')+'</div></section>').join(''):'<div class="reciter-empty"><p>'+uiLeaf('downloadUi.none')+'</p><p>'+uiLeaf('offlineAudioUi.emptyHelp')+'</p><a class="text-button" href="#quran?view=reciters">'+uiLeaf('offlineAudioUi.goReciters')+'</a></div>';
  recordById=new Map(records.map(record=>[record.id,record]));clear.hidden=!records.length;setControls();lastPlayback='';paintPlayback();
  for(const button of list.querySelectorAll('[data-saved-play]'))button.onclick=async()=>{
   const record=recordById.get(button.dataset.savedPlay);if(!record)return;
   const state=playback.state;if(state.reciter===record.reciter&&state.surah?.number===record.surah&&['playing','paused','loading'].includes(state.status)){playback.toggle();return;}
   const request=++playRequest;button.disabled=true;setUiLabel(status,'reciterUi.loadingNamed',{name:index.surahs[record.surah-1].name});
   try{await playback.start(recording(index,record.surah),record.reciter,0,true,true);if(valid()&&request===playRequest){if(playback.state.status==='error')setUiLabel(status,'offlineAudioUi.playFailed');else clearUiLabel(status);}}
   catch{if(valid()&&request===playRequest)setUiLabel(status,'offlineAudioUi.playFailed');}
   finally{if(button.isConnected)button.disabled=false;}
  };
  for(const button of list.querySelectorAll('[data-saved-remove]'))button.onclick=()=>{
   const record=recordById.get(button.dataset.savedRemove);if(!record||deleting||queue.busy)return;
   show('<h2>'+uiLeaf('offlineAudioUi.removeTitle')+'</h2><p>'+uiLeaf('offlineAudioUi.removeHelp',parameters(record))+'</p><div class="button-row"><button type="button" class="button" data-confirm-saved-remove>'+uiLeaf('offlineAudioUi.remove')+'</button><button type="button" class="button secondary" data-close>'+uiLeaf('common.cancel')+'</button></div>');
   const confirm=document.querySelector('[data-confirm-saved-remove]');if(confirm)confirm.onclick=()=>{if(!valid()||deleting||queue.busy)return;close();void remove(()=>store.removeRecording(record),'offlineAudioUi.removed');};
  };
 }
 async function refreshRecords(){
  const request=++version;loading=true;setControls();setUiLabel(status,'offlineAudioUi.loading');
  try{const found=await store.listRecordings();if(!valid()||request!==version)return;records=found.filter(record=>known.has(record.reciter)&&index.surahs[record.surah-1]&&reciterHasSurah(record.reciter,record.surah));draw();clearUiLabel(status);}
  catch{if(valid()&&request===version){setUiLabel(status,'downloadUi.storageUnavailable');if(!records.length)list.innerHTML='<button type="button" class="button secondary" data-saved-retry>'+uiLeaf('offlineAudioUi.retry')+'</button>';const retry=list.querySelector('[data-saved-retry]');if(retry)retry.onclick=()=>void refreshRecords();}}
  finally{if(valid()&&request===version){loading=false;setControls();}}
 }
 async function remove(work,message){
  deleting=true;setControls();try{await work();if(!valid())return;await refreshRecords();if(valid())notify(t(message));}catch{if(valid())setUiLabel(status,'downloadUi.removeFailed');}finally{deleting=false;if(valid())setControls();}
 }
 refresh.onclick=()=>void refreshRecords();
 clear.onclick=()=>{
  if(!records.length||deleting||queue.busy)return;
  show('<h2>'+uiLeaf('downloadUi.confirmRemove')+'</h2><p>'+uiLeaf('downloadUi.canDownloadAgain')+'</p><div class="button-row"><button type="button" class="button" data-confirm-saved-clear>'+uiLeaf('downloadUi.removeRecordings')+'</button><button type="button" class="button secondary" data-close>'+uiLeaf('common.cancel')+'</button></div>');
  const confirm=document.querySelector('[data-confirm-saved-clear]');if(confirm)confirm.onclick=()=>{if(!valid()||deleting||queue.busy)return;close();void remove(()=>store.clearAll(),'downloadUi.removed');};
 };
 const stopDownloads=mountQuranDownloads(host.querySelector('[data-saved-download-tools]'),index),stopPlayback=playback.subscribe(paintPlayback),stopQueue=queue.subscribe(state=>{const signature=state.status+':'+state.done;if(signature===lastQueue)return;const previous=lastQueue;lastQueue=signature;if(valid()){setControls();if(previous&&(state.done>Number(previous.split(':')[1])||['complete','paused','error'].includes(state.status)))void refreshRecords();}});
 const stopLanguage=bindQuranUi(host,()=>{lastPlayback='';paintPlayback();for(const node of list.querySelectorAll('[data-saved-bytes]'))node.textContent=megabytes(Number(node.dataset.savedBytes));});
 void refreshRecords();
 return()=>{active=false;version++;playRequest++;stopPlayback();stopQueue();stopLanguage();stopDownloads();};
}
