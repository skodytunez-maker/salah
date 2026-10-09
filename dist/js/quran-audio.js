import{reciterInfo}from './quran-reciters.js';
import{audioUrl}from './quran-data.js';
import{offlineAudioStore}from './quran-offline-store.js';
import{loadAyahTimings,ayahAtTime,timingUrl}from './quran-timing.js';
export function createQuranPlayer({surah,reciter,offlineOnly=false,onState,onVerse,onError,createAudio=url=>new Audio(url),loadTimings=loadAyahTimings,getAudio=url=>offlineAudioStore.getAudio(url)}){
 const whole=reciterInfo(reciter).format==='surah',timed=!!timingUrl(surah,reciter);
 let startOffset=0,next=null;
 let audio=null,objectUrl=null,token=0,disposed=false,current=0,continuous=false,status='stopped',ayah=null,timings=null,timingController=null,timingStatus=whole?(timed?'loading':'unavailable'):'ready';
 function emit(){if(!disposed)onState({index:current,status,ayah,timingStatus,canPrevious:!whole&&current>0,canNext:!whole&&current<surah.verses.length-1})}
 function clearNext(){const pending=next;next=null;if(pending?.resource){const r=pending.resource;r.audio.onended=r.audio.onerror=r.audio.onloadedmetadata=null;r.audio.pause();r.audio.src='';if(r.objectUrl)URL.revokeObjectURL(r.objectUrl);pending.resource=null;}}
 function prepareNext(){
  if(disposed||whole||!continuous||current>=surah.verses.length-1)return;
  clearNext();const pending={index:current+1,resource:null};next=pending;
  void(async()=>{let preparedUrl=null;try{
   let url=audioUrl(surah.verses[pending.index].number,reciter,surah.number),blob=null;try{blob=await getAudio(url);}catch{}
   if(disposed||next!==pending)return;if(offlineOnly&&!blob){clearNext();return;}
   if(blob){preparedUrl=URL.createObjectURL(blob);url=preparedUrl;}
   const prepared=createAudio(url);prepared.preload='auto';pending.resource={audio:prepared,objectUrl:preparedUrl};
   prepared.onerror=()=>{if(next===pending)clearNext();};prepared.load?.();
  }catch{if(next===pending){if(pending.resource)clearNext();else{next=null;if(preparedUrl)URL.revokeObjectURL(preparedUrl);}}}})();
 }
 function release(){timingController?.abort();timingController=null;timings=null;if(audio){audio.onended=null;audio.onerror=null;audio.ontimeupdate=null;audio.onseeked=null;audio.onloadedmetadata=null;audio.pause();audio.src='';audio=null}if(objectUrl){URL.revokeObjectURL(objectUrl);objectUrl=null}}
 function sync(id,force=false){
  if(disposed||id!==token||!audio||!whole)return;
  if(timings&&Number.isFinite(audio.duration)&&timings.at(-1).end>audio.duration+3){timings=null;timingStatus='unavailable';force=true}
  const n=ayahAtTime(timings,audio.currentTime);
  if(n!==ayah||force){ayah=n;if(n){current=n-1;onVerse(n)}emit()}
 }
 async function play(index=current,all=continuous,seconds=0){
  if(disposed||!Number.isInteger(index)||index<0||index>=surah.verses.length)return;
  if(whole)index=0;
  const prepared=!whole&&all&&next?.index===index?next.resource:null;if(prepared)next.resource=null;clearNext();
  const id=++token;release();startOffset=Number.isFinite(seconds)&&seconds>=0&&seconds<=86400?seconds:0;current=index;continuous=all;status='loading';ayah=whole?null:surah.verses[index].ayah;timingStatus=whole?(timed?'loading':'unavailable'):'ready';emit();if(!whole)onVerse(ayah);
  try{
   if(prepared){audio=prepared.audio;objectUrl=prepared.objectUrl;}else{
    let url=audioUrl(surah.verses[index].number,reciter,surah.number),blob=null;
    try{blob=await getAudio(url);}catch{}
    if(blob){if(disposed||id!==token)return;objectUrl=URL.createObjectURL(blob);url=objectUrl}
    if(disposed||id!==token)return;
    if(offlineOnly&&!blob)throw Error('Сура не скачана');
    audio=createAudio(url);
   }
   audio.onerror=()=>fail(id);
   audio.ontimeupdate=audio.onseeked=()=>sync(id);
   const seekStart=()=>{if(disposed||id!==token||!audio)return;if(startOffset>0){try{audio.currentTime=Number.isFinite(audio.duration)&&audio.duration>0?Math.min(startOffset,Math.max(0,audio.duration-.1)):startOffset;}catch{}}sync(id,true)};audio.onloadedmetadata=seekStart;if(audio.readyState>=1)seekStart();
   audio.onended=()=>{if(disposed||id!==token)return;if(!whole&&continuous&&current<surah.verses.length-1)void play(current+1,true);else{status='ended';emit()}};
   if(whole&&timed){
    const controller=new AbortController();timingController=controller;
    Promise.resolve().then(()=>loadTimings(surah,reciter,{signal:controller.signal,...(offlineOnly?{fetcher:async()=>{throw Error('Offline')}}:{})})).then(table=>{if(disposed||id!==token||!audio)return;timings=table;timingStatus=table?'ready':'unavailable';sync(id,true)}).catch(()=>{if(disposed||id!==token||!audio)return;timingStatus='unavailable';sync(id,true)});
   }
   await audio.play();if(disposed||id!==token)return;status='playing';sync(id);prepareNext();emit();
  }catch{fail(id)}
 }
 function fail(id){if(disposed||id!==token)return;clearNext();if(Number.isFinite(audio?.currentTime)&&audio.currentTime>0)startOffset=audio.currentTime;release();ayah=null;status='error';emit();onError()}
 function pause(){if(disposed)return;clearNext();if(status==='loading'){token++;release();ayah=null}else{sync(token);audio?.pause()}status='paused';emit()}
 function toggle(){if(status==='playing'||status==='loading'){pause();return}if(audio&&status==='paused'){const id=token;audio.play().then(()=>{if(!disposed&&id===token){status='playing';sync(id);prepareNext();emit()}}).catch(()=>fail(id))}else void play(current,continuous,['error','paused'].includes(status)?startOffset:0)}
 function move(delta){if(whole)return;const index=current+delta;if(index>=0&&index<surah.verses.length)void play(index,continuous)}
 function destroy(){disposed=true;token++;clearNext();release()}
 return{play,toggle,pause,move,destroy,get state(){return{index:current,status,ayah,timingStatus,positionSeconds:Number.isFinite(audio?.currentTime)?Math.max(0,audio.currentTime):startOffset}}}
}
