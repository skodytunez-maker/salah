import{adjacentReciterSurah,reciterInfo}from './quran-reciters.js';
// Follow only a reader that was showing this active listening session.
export function createReaderFollow(number){
 let armed=false,reciter=null,navigated=false;
 return state=>{
  const active=['loading','playing','paused'].includes(state.status);
  if(!active){if(state.status!=='ended')armed=false;return null;}
  if(state.surah?.number===number){armed=true;reciter=state.reciter;return null;}
  if(!armed||navigated||(state.reciter!==reciter&&reciterInfo(reciter).continuousReciter!==state.reciter)||!(state.offlineOnly?state.surah?.number>number:state.surah?.number===adjacentReciterSurah(reciter,number,1)))return null;
  navigated=true;
  return '#quran?surah='+state.surah.number+'&ayah=1&reciter='+encodeURIComponent(state.reciter)+(state.offlineOnly?'&offline=1':'');
 };
}
