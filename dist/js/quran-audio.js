import{reciterInfo}from './quran-reciters.js';
import{audioUrl,AUDIO_CACHE}from './quran-data.js';
import{loadAyahTimings,ayahAtTime,timingUrl}from './quran-timing.js';
export function createQuranPlayer({surah,reciter,onState,onVerse,onError,createAudio=url=>new Audio(url),loadTimings=loadAyahTimings}){
 const whole=reciterInfo(reciter).format==='surah',timed=!!timingUrl(surah,reciter);
 let audio=null,objectUrl=null,token=0,disposed=false,current=0,continuous=false,status='stopped',ayah=null,timings=null,timingController=null,timingStatus=whole?(timed?'loading':'unavailable'):'ready';
 function emit(){if(!disposed)onState({index:current,status,ayah,timingStatus,canPrevious:!whole&&current>0,canNext:!whole&&current<surah.verses.length-1})}
 function release(){timingController?.abort();timingController=null;timings=null;if(audio){audio.onended=null;audio.onerror=null;audio.ontimeupdate=null;audio.onseeked=null;audio.onloadedmetadata=null;audio.pause();audio.src='';audio=null}if(objectUrl){URL.revokeObjectURL(objectUrl);objectUrl=null}}
 function sync(id,force=false){
  if(disposed||id!==token||!audio||!whole)return;
  if(timings&&Number.isFinite(audio.duration)&&timings.at(-1).end>audio.duration+3){timings=null;timingStatus='unavailable';force=true}
  const n=ayahAtTime(timings,audio.currentTime);
  if(n!==ayah||force){ayah=n;if(n){current=n-1;onVerse(n)}emit()}
 }
 async function play(index=current,all=continuous){
  if(disposed||!Number.isInteger(index)||index<0||index>=surah.verses.length)return;
  if(whole)index=0;
  const id=++token;release();current=index;continuous=all;status='loading';ayah=whole?null:surah.verses[index].ayah;timingStatus=whole?(timed?'loading':'unavailable'):'ready';emit();if(!whole)onVerse(ayah);
  try{
   let url=audioUrl(surah.verses[index].number,reciter,surah.number),cached=null;
   if('caches'in window)try{cached=await(await caches.open(AUDIO_CACHE)).match(url)}catch{}
   if(cached){const blob=await cached.blob();if(disposed||id!==token)return;objectUrl=URL.createObjectURL(blob);url=objectUrl}
   if(disposed||id!==token)return;
   audio=createAudio(url);
   audio.onerror=()=>fail(id);
   audio.ontimeupdate=audio.onseeked=audio.onloadedmetadata=()=>sync(id);
   audio.onended=()=>{if(disposed||id!==token)return;if(!whole&&continuous&&current<surah.verses.length-1)void play(current+1,true);else{status='ended';emit()}};
   if(whole&&timed){
    const controller=new AbortController();timingController=controller;
    Promise.resolve().then(()=>loadTimings(surah,reciter,{signal:controller.signal})).then(table=>{if(disposed||id!==token||!audio)return;timings=table;timingStatus=table?'ready':'unavailable';sync(id,true)}).catch(()=>{if(disposed||id!==token||!audio)return;timingStatus='unavailable';sync(id,true)});
   }
   await audio.play();if(disposed||id!==token)return;status='playing';sync(id);emit();
  }catch{fail(id)}
 }
 function fail(id){if(disposed||id!==token)return;release();ayah=null;status='error';emit();onError()}
 function pause(){if(disposed)return;if(status==='loading'){token++;release();ayah=null}else{sync(token);audio?.pause()}status='paused';emit()}
 function toggle(){if(status==='playing'||status==='loading'){pause();return}if(audio&&status==='paused'){const id=token;audio.play().then(()=>{if(!disposed&&id===token){status='playing';sync(id);emit()}}).catch(()=>fail(id))}else void play(current,continuous)}
 function move(delta){if(whole)return;const index=current+delta;if(index>=0&&index<surah.verses.length)void play(index,continuous)}
 function destroy(){disposed=true;token++;release()}
 return{play,toggle,pause,move,destroy,get state(){return{index:current,status,ayah,timingStatus}}}
}
