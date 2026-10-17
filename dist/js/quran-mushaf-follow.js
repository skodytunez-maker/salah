import{printedPageForPosition}from './quran-mushaf-print.js';
// A known ayah is required: intro, gaps and un-timed recordings stay unlabelled.
export function mushafAudioPosition(state){
 const surah=state?.surah?.number,ayah=state?.ayah;
 if(!['playing','paused'].includes(state?.status)||state?.timingStatus!=='ready'||!Number.isInteger(surah)||surah<1||surah>114||!Number.isInteger(ayah)||ayah<1||!state.surah.verses?.[ayah-1])return null;
 return{surah,ayah,key:surah+':'+ayah};
}
export function createMushafFollower({page,edition='madani',automatic=false,manual=false,pageForVerse=printedPageForPosition}){
 let keys=new Set(),ready=false,following=automatic&&!manual,held=manual,pending=null;
 return{
  loaded(verseKeys,state){keys=new Set(verseKeys);ready=true;const point=mushafAudioPosition(state);if(!held&&point&&keys.has(point.key))following=true;},
  suspend(){following=false;held=true;pending=null;},
  resume(){following=true;held=false;pending=null;},
  update(state,enabled=true){
   const point=mushafAudioPosition(state),key=ready&&point&&keys.has(point.key)?point.key:null;
   let target=null;
   if(ready&&following&&enabled&&state.status==='playing'&&point&&!key){
    const candidate=pageForVerse(point.surah,point.ayah,edition);
    if(Number.isInteger(candidate)&&candidate!==page&&candidate!==pending){target=candidate;pending=candidate;}
   }
   // Keep a verse spanning two pages on the page already being read.
   if(key)pending=null;
   return{point,key,target,following:following&&enabled,held};
  }
 };
}
