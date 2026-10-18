import{saveSurahAudio,estimatedAudioBytes}from './quran-data.js';
import{reciterInfo,reciterHasSurah}from './quran-reciters.js';
const mb=bytes=>(bytes/1048576).toFixed(1).replace('.',',')+' МБ';
export function audioDownloadError(error){
 if(error?.name==='QuotaExceededError')return 'Недостаточно места для аудио. Освободите место и повторите скачивание.';
 if(error?.name==='TimeoutError')return 'Аудиосервер долго не отвечает. Повторите скачивание. Уже сохранённые аяты останутся.';
 if(error?.name==='TypeError')return 'Не удалось получить аудио с сервера. Проверьте подключение и повторите скачивание.';
 return 'Не удалось сохранить аудио. Проверьте подключение и свободное место.';
}
export function mountReaderDownload(shell,surah,getReciter,{save=saveSurahAudio}={}){
 const button=shell.querySelector('#quran-download-audio'),status=shell.querySelector('#quran-audio-download-status');let controller=null,disposed=false,lastPaint=0,lastCount=-1,lastPhase=null;
 const available=()=>reciterHasSurah(getReciter(),surah.number)&&reciterInfo(getReciter()).offline!==false;
 const idle=()=>{button.textContent='Скачать аудио суры · ≈ '+mb(estimatedAudioBytes(surah));button.disabled=!available();button.removeAttribute('aria-busy');};
 const current=task=>!disposed&&controller===task&&status.isConnected;
 const clearBusy=task=>{if(controller===task){controller=null;button.removeAttribute('aria-busy');delete shell.dataset.audioDownload;}};
 function cancel(){const task=controller;if(!task)return;task.abort();clearBusy(task);if(!disposed){button.textContent='Продолжить скачивание';button.disabled=!available();status.textContent='Скачивание остановлено. Уже сохранённые аяты останутся.';}}
 button.type='button';status.setAttribute('aria-live','polite');
 button.onclick=async()=>{
  if(controller){cancel();return;}if(!available())return;
  const task=new AbortController(),reciter=getReciter();controller=task;lastPaint=0;shell.dataset.audioDownload='active';button.disabled=false;button.textContent='Остановить скачивание';button.setAttribute('aria-busy','true');
  status.textContent='Подключаемся к записи… Оставьте SALAH открытым до окончания скачивания.';
  try{
   const bytes=await save(surah,reciter,(count,bytes,details)=>{
    if(!current(task))return;if(lastPaint&&Date.now()-lastPaint<250&&count===lastCount&&details?.phase===lastPhase)return;lastPaint=Date.now();lastCount=count;lastPhase=details?.phase;
    status.textContent=(details?.phase==='saving'?'Сохраняем на устройстве: ':'Скачиваем: ')+mb(bytes)+' · '+count+' из '+(reciterInfo(reciter).format==='surah'?1:surah.verses.length)+' файлов. Оставьте SALAH открытым.';
   },task.signal);
   if(current(task)){button.textContent='Аудио сохранено';status.textContent='Сохранено в SALAH · '+mb(bytes)+'. Эту суру можно слушать без интернета.';}
  }catch(error){if(current(task)){button.textContent='Повторить скачивание';status.textContent=error?.name==='AbortError'?'Скачивание остановлено. Можно продолжить.':audioDownloadError(error);}}
  finally{if(controller===task){clearBusy(task);if(!disposed)button.disabled=!available();}}
 };
 return{reset(){cancel();idle();status.textContent='';},dispose(){disposed=true;cancel();button.onclick=null;}};
}
