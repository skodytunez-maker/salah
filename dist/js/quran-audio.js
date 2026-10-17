import{loadSurahDurations,timelinePosition}from './quran-duration.js';
import{requestMediaOutput,prepareMediaOutput,clearMediaOutputSources}from './media-output-core.js';
import{reciterInfo}from './quran-reciters.js';
import{audioUrl,downloadAudioUrl}from './quran-data.js';
import{offlineAudioStore}from './quran-offline-store.js';
import{loadAyahTimings,ayahAtTime,timingUrl}from './quran-timing.js';
export function createQuranPlayer({surah,reciter,offlineOnly=false,onState,onVerse,onError,createAudio=url=>new Audio(url),loadTimings=loadAyahTimings,getAudio=url=>offlineAudioStore.getAudio(url),loadDurations=loadSurahDurations,setTimer=setTimeout,clearTimer=clearTimeout}){
 const whole=reciterInfo(reciter).format==='surah',timed=!!timingUrl(surah,reciter);
 let startOffset=0,next=null,durationTable=null,durationTask=null,durationStatus=whole?'ready':'loading';const durationController=new AbortController();
 let audio=null,objectUrl=null,token=0,disposed=false,current=0,continuous=false,status='stopped',ayah=null,timings=null,timingController=null,timingStatus=whole?(timed?'loading':'unavailable'):'ready';
 let watchdog=null,watchedPosition=0,useFallback=false,preparedTimings=null;
 const sourceUrl=index=>useFallback&&!offlineOnly?downloadAudioUrl(surah.verses[index].number,reciter,surah.number):audioUrl(surah.verses[index].number,reciter,surah.number);
 function clearWatchdog(){if(watchdog!==null){clearTimer(watchdog);watchdog=null;}}
 function watch(id){
  clearWatchdog();watchedPosition=Number.isFinite(audio?.currentTime)?audio.currentTime:startOffset;
  watchdog=setTimer(()=>{watchdog=null;if(disposed||id!==token||!['loading','playing'].includes(status))return;
   if(Number.isFinite(audio?.currentTime)&&audio.currentTime>watchedPosition+.01){watch(id);return;}
   recover(id);
  },15000);watchdog?.unref?.();
 }
 function recover(id,error){
  if(disposed||id!==token||!['loading','playing'].includes(status))return;
  const original=audioUrl(surah.verses[current].number,reciter,surah.number),alternative=downloadAudioUrl(surah.verses[current].number,reciter,surah.number);
  if(!offlineOnly&&!useFallback&&alternative!==original&&error?.name!=='NotAllowedError'){
   const seconds=Number.isFinite(audio?.currentTime)&&audio.currentTime>0?audio.currentTime:startOffset;
   useFallback=true;void play(current,continuous,seconds,true,true);return;
  }
  fail(id);
 }
 function startDurations(){
  if(whole||durationTask||disposed)return;
  durationTask=Promise.resolve().then(()=>disposed?null:loadDurations(surah,reciter,{signal:durationController.signal,offlineOnly})).then(table=>{if(!disposed){durationTable=table;durationStatus=table?'ready':'unavailable';emit();}}).catch(()=>{if(!disposed){durationStatus='unavailable';emit();}});
 }
 function emit(){if(!disposed)onState({index:current,status,ayah,timingStatus,canPrevious:!whole&&current>0,canNext:!whole&&current<surah.verses.length-1})}
 function discardPrepared(r){r.audio.onended=r.audio.onerror=r.audio.onloadedmetadata=null;r.audio.pause();clearMediaOutputSources(r.audio);r.audio.src='';if(r.objectUrl)URL.revokeObjectURL(r.objectUrl);}
 function clearNext(){const pending=next;next=null;if(pending?.resource){discardPrepared(pending.resource);pending.resource=null;}}
 function prepareNext(){
  if(disposed||whole||!continuous||current>=surah.verses.length-1)return;
  clearNext();const pending={index:current+1,resource:null};next=pending;
  void(async()=>{let preparedUrl=null;try{
   const remoteUrl=sourceUrl(pending.index),cacheUrl=audioUrl(surah.verses[pending.index].number,reciter,surah.number);let url=remoteUrl,blob=null;try{blob=await getAudio(cacheUrl);}catch{}
   if(disposed||next!==pending)return;if(offlineOnly&&!blob){clearNext();return;}
   if(blob){preparedUrl=URL.createObjectURL(blob);url=preparedUrl;}
   const prepared=createAudio(url);prepareMediaOutput(prepared,remoteUrl,{networkAllowed:!offlineOnly});prepared.preload='auto';pending.resource={audio:prepared,objectUrl:preparedUrl};
   prepared.onerror=()=>{if(next===pending)clearNext();};prepared.load?.();
  }catch{if(next===pending){if(pending.resource)clearNext();else{next=null;if(preparedUrl)URL.revokeObjectURL(preparedUrl);}}}})();
 }
 function release(){clearWatchdog();timingController?.abort();timingController=null;timings=null;if(audio){audio.onplay=null;audio.onpause=null;audio.onended=null;audio.onerror=null;audio.ontimeupdate=null;audio.onseeked=null;audio.onloadedmetadata=null;audio.pause();clearMediaOutputSources(audio);audio.src='';audio=null}if(objectUrl){URL.revokeObjectURL(objectUrl);objectUrl=null}}
 function sync(id,force=false){
  if(disposed||id!==token||!audio||!whole)return;
  if(timings&&Number.isFinite(audio.duration)&&timings.at(-1).end>audio.duration+3){timings=null;timingStatus='unavailable';force=true}
  const n=ayahAtTime(timings,audio.currentTime);
  if(n!==ayah||force){ayah=n;if(n){current=n-1;onVerse(n)}emit()}
 }
 async function play(index=current,all=continuous,seconds=0,autoplay=true,retrying=false){
  if(disposed||!Number.isInteger(index)||index<0||index>=surah.verses.length)return;
  if(whole)index=0;
  const prepared=!whole&&all&&next?.index===index?next.resource:null;if(prepared)next.resource=null;clearNext();
  const id=++token;release();startOffset=Number.isFinite(seconds)&&seconds>=0&&seconds<=86400?seconds:0;current=index;continuous=all;status='loading';ayah=whole?null:surah.verses[index].ayah;timingStatus=whole?(timed?'loading':'unavailable'):'ready';emit();if(!whole)onVerse(ayah);
  if(disposed||id!==token){if(prepared)discardPrepared(prepared);return;}
  if(autoplay)watch(id);
  try{
   if(prepared){audio=prepared.audio;objectUrl=prepared.objectUrl;}else{
    const remoteUrl=sourceUrl(index),cacheUrl=audioUrl(surah.verses[index].number,reciter,surah.number);let url=remoteUrl,blob=null;
    if(!retrying)try{blob=await getAudio(cacheUrl);}catch{}
    if(blob){if(disposed||id!==token)return;objectUrl=URL.createObjectURL(blob);url=objectUrl}
    if(disposed||id!==token)return;
    if(offlineOnly&&!blob)throw Error('Сура не скачана');
    audio=createAudio(url);prepareMediaOutput(audio,remoteUrl,{networkAllowed:!offlineOnly});
   }
   audio.onerror=()=>recover(id);
   audio.onplay=()=>{if(!disposed&&id===token){status='playing';emit();}};audio.onpause=()=>{if(!disposed&&id===token&&status==='playing'&&!audio.ended){clearWatchdog();status='paused';emit();}};
   audio.ontimeupdate=audio.onseeked=()=>{if(disposed||id!==token)return;if(['loading','playing'].includes(status)&&audio.currentTime>watchedPosition+.01)watch(id);sync(id);emit();};
   const seekStart=()=>{if(disposed||id!==token||!audio)return;if(startOffset>0){try{audio.currentTime=Number.isFinite(audio.duration)&&audio.duration>0?Math.min(startOffset,Math.max(0,audio.duration-.1)):startOffset;}catch{}}sync(id,true)};audio.onloadedmetadata=seekStart;if(audio.readyState>=1)seekStart();
   audio.onended=()=>{if(disposed||id!==token)return;clearWatchdog();if(!whole&&continuous&&current<surah.verses.length-1)void play(current+1,true);else{status='ended';emit()}};
   if(whole&&timed){
    const controller=new AbortController();timingController=controller;
    const supplied=preparedTimings;preparedTimings=null;
    Promise.resolve().then(()=>supplied||loadTimings(surah,reciter,{signal:controller.signal,...(offlineOnly?{fetcher:async()=>{throw Error('Offline')}}:{})})).then(table=>{if(disposed||id!==token||!audio)return;timings=table;timingStatus=table?'ready':'unavailable';sync(id,true)}).catch(()=>{if(disposed||id!==token||!audio)return;timingStatus='unavailable';sync(id,true)});
   }
   if(!autoplay){status='paused';startDurations();emit();return;}
   await audio.play();if(disposed||id!==token||status==='paused')return;status='playing';sync(id);prepareNext();emit();
   startDurations();
  }catch(error){recover(id,error)}
 }
 async function playFromAyah(number){
  if(disposed||!Number.isInteger(number)||number<1||number>surah.verses.length)return false;
  if(!whole||number===1){await play(number-1,true);return !disposed;}
  const id=++token;clearNext();release();current=0;ayah=null;status='loading';timingStatus=timed?'loading':'unavailable';emit();
  if(!timed){status='error';emit();return false;}
  const controller=new AbortController();timingController=controller;
  try{const table=await loadTimings(surah,reciter,{signal:controller.signal,...(offlineOnly?{fetcher:async()=>{throw Error('Offline')}}:{})});
   if(disposed||id!==token||controller.signal.aborted)return false;
   const point=table?.find(row=>row.ayah===number);
   if(!point){timingStatus='unavailable';status='error';emit();return false;}
   preparedTimings=table;await play(0,true,point.start);return !disposed;
  }catch{if(!disposed&&id===token){timingStatus='unavailable';status='error';emit();}return false;}
 }
 function fail(id){if(disposed||id!==token)return;token++;clearNext();if(Number.isFinite(audio?.currentTime)&&audio.currentTime>0)startOffset=audio.currentTime;release();ayah=null;status='error';emit();onError()}
 function pause(){if(disposed)return;clearWatchdog();clearNext();if(status==='loading'){if(Number.isFinite(audio?.currentTime)&&audio.currentTime>0)startOffset=audio.currentTime;token++;release();ayah=null}else{sync(token);audio?.pause()}status='paused';emit()}
 function toggle(){if(status==='playing'||status==='loading'){pause();return}if(audio&&status==='paused'){const id=token;status='loading';watch(id);audio.play().then(()=>{if(!disposed&&id===token&&status!=='paused'){status='playing';sync(id);prepareNext();startDurations();emit()}}).catch(error=>recover(id,error))}else void play(current,continuous,['error','paused'].includes(status)?startOffset:0)}
 function move(delta){if(whole)return;const index=current+delta;if(index>=0&&index<surah.verses.length)void play(index,continuous)}
 function destroy(){disposed=true;durationController.abort();token++;clearNext();release()}
 function seek(seconds){if(disposed||!audio||!Number.isFinite(seconds))return;if(!whole&&durationTable){const point=timelinePosition(durationTable,seconds);if(point.index!==current){void play(point.index,continuous,point.seconds,status==='playing');return;}seconds=point.seconds;}try{audio.currentTime=Math.max(0,Math.min(seconds,Number.isFinite(audio.duration)?Math.max(0,audio.duration-.01):86400));sync(token,true);}catch{}}
 return{play,playFromAyah,toggle,pause,move,destroy,seek,requestOutput:()=>requestMediaOutput(audio),get state(){return{index:current,status,ayah,timingStatus,durationStatus,durationSeconds:whole?(Number.isFinite(audio?.duration)?audio.duration:0):(durationTable?.total||0),trackPositionSeconds:Number.isFinite(audio?.currentTime)?Math.max(0,audio.currentTime):startOffset,positionSeconds:(durationTable?.starts[current]||0)+(Number.isFinite(audio?.currentTime)?Math.max(0,audio.currentTime):startOffset)}}}
}
