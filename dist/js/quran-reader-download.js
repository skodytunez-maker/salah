import{saveSurahAudio,estimatedAudioBytes}from './quran-data.js';
import{reciterInfo,reciterHasSurah}from './quran-reciters.js';
import{t,getLocale,subscribeLanguage}from './i18n.js';
const mb=bytes=>t('downloadUi.readerMegabytes',{size:new Intl.NumberFormat(getLocale(),{minimumFractionDigits:1,maximumFractionDigits:1}).format(bytes/1048576)});
const errorKey=error=>error?.name==='QuotaExceededError'?'downloadUi.readerQuotaError':error?.name==='TimeoutError'?'downloadUi.readerTimeoutError':error?.name==='TypeError'?'downloadUi.readerNetworkError':'downloadUi.readerError';
export function audioDownloadError(error){return t(errorKey(error));}
export function mountReaderDownload(shell,surah,getReciter,{save=saveSurahAudio}={}){
 const button=shell.querySelector('#quran-download-audio'),status=shell.querySelector('#quran-audio-download-status');let controller=null,disposed=false,lastPaint=0,lastCount=-1,lastPhase=null,buttonKey='downloadUi.readerDownload',statusKey=null,progress=null,savedBytes=null;
 const available=()=>reciterHasSurah(getReciter(),surah.number)&&reciterInfo(getReciter()).offline!==false;
 const paint=()=>{if(disposed)return;button.textContent=t(buttonKey,buttonKey==='downloadUi.readerDownload'?{size:mb(estimatedAudioBytes(surah))}:{});status.textContent=statusKey?t(statusKey,progress?{...progress,size:mb(progress.bytes)}:savedBytes!==null?{size:mb(savedBytes)}:{}):'';};
 const idle=()=>{buttonKey='downloadUi.readerDownload';button.disabled=!available();button.removeAttribute('aria-busy');paint();};
 const current=task=>!disposed&&controller===task&&status.isConnected;
 const clearBusy=task=>{if(controller===task){controller=null;button.removeAttribute('aria-busy');delete shell.dataset.audioDownload;}};
 function cancel(){const task=controller;if(!task)return;task.abort();clearBusy(task);if(!disposed){buttonKey='downloadUi.readerContinue';button.disabled=!available();statusKey='downloadUi.readerStoppedSaved';progress=null;paint();}}
 button.type='button';status.setAttribute('aria-live','polite');
 button.onclick=async()=>{
  if(controller){cancel();return;}if(!available())return;
  const task=new AbortController(),reciter=getReciter();controller=task;lastPaint=0;shell.dataset.audioDownload='active';button.disabled=false;buttonKey='downloadUi.readerStop';button.setAttribute('aria-busy','true');statusKey='downloadUi.readerConnecting';progress=null;savedBytes=null;paint();
  try{
   const bytes=await save(surah,reciter,(count,bytes,details)=>{
    if(!current(task))return;if(lastPaint&&Date.now()-lastPaint<250&&count===lastCount&&details?.phase===lastPhase)return;lastPaint=Date.now();lastCount=count;lastPhase=details?.phase;
    progress={bytes,count,total:reciterInfo(reciter).format==='surah'?1:surah.verses.length};statusKey=details?.phase==='saving'?'downloadUi.readerSaving':'downloadUi.readerDownloading';paint();
   },task.signal);
   if(current(task)){buttonKey='downloadUi.readerSaved';statusKey='downloadUi.readerSavedHint';progress=null;savedBytes=bytes;paint();}
  }catch(error){if(current(task)){buttonKey='downloadUi.readerRetry';statusKey=error?.name==='AbortError'?'downloadUi.readerStopped':errorKey(error);progress=null;paint();}}
  finally{if(controller===task){clearBusy(task);if(!disposed)button.disabled=!available();}}
 };
 const offLanguage=subscribeLanguage(paint);idle();
 return{reset(){cancel();statusKey=null;progress=null;savedBytes=null;idle();},dispose(){disposed=true;offLanguage();cancel();button.onclick=null;}};
}
