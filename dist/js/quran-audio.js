import{reciterInfo}from './quran-reciters.js';
import{audioUrl,AUDIO_CACHE}from './quran-data.js';
export function createQuranPlayer({surah,reciter,onState,onVerse,onError,createAudio=url=>new Audio(url)}){
 const whole=reciterInfo(reciter).format==='surah';
 let audio=null,objectUrl=null,token=0,disposed=false,current=0,continuous=false,status='stopped';
 function emit(){if(!disposed)onState({index:current,status,canPrevious:!whole&&current>0,canNext:!whole&&current<surah.verses.length-1})}
 function release(){if(audio){audio.onended=null;audio.onerror=null;audio.pause();audio.src='';audio=null}if(objectUrl){URL.revokeObjectURL(objectUrl);objectUrl=null}}
 async function play(index=current,all=continuous){
  if(disposed||!Number.isInteger(index)||index<0||index>=surah.verses.length)return;
  if(whole)index=0;
  const id=++token;release();current=index;continuous=all;status='loading';emit();if(!whole)onVerse(surah.verses[index].ayah);
  try{
   let url=audioUrl(surah.verses[index].number,reciter,surah.number),cached=null;
   if('caches'in window)try{cached=await(await caches.open(AUDIO_CACHE)).match(url)}catch{}
   if(cached){const blob=await cached.blob();if(disposed||id!==token)return;objectUrl=URL.createObjectURL(blob);url=objectUrl}
   if(disposed||id!==token)return;
   audio=createAudio(url);
   audio.onerror=()=>fail(id);
   audio.onended=()=>{if(disposed||id!==token)return;if(!whole&&continuous&&current<surah.verses.length-1)play(current+1,true);else{status='ended';emit()}};
   await audio.play();if(disposed||id!==token)return;status='playing';emit();
  }catch{fail(id)}
 }
 function fail(id){if(disposed||id!==token)return;release();status='error';emit();onError()}
 function pause(){if(disposed)return;if(status==='loading'){token++;release()}else audio?.pause();status='paused';emit()}
 function toggle(){if(status==='playing'||status==='loading'){pause();return}if(audio&&status==='paused'){const id=token;audio.play().then(()=>{if(!disposed&&id===token){status='playing';emit()}}).catch(()=>fail(id))}else play(current,continuous)}
 function move(delta){if(whole)return;const index=current+delta;if(index>=0&&index<surah.verses.length)play(index,continuous)}
 function destroy(){disposed=true;token++;release()}
 return{play,toggle,pause,move,destroy,get state(){return{index:current,status}}}
}
