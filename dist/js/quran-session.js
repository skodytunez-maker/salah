import{createMediaSession}from './media-session.js';
import{claimPlayback,registerPlayback}from './media-playback-focus.js';
import{offlineAudioStore}from './quran-offline-store.js';
import{setForegroundAudio}from './audio-focus.js';
import{createQuranPlayer}from './quran-audio.js';
import{loadIndex,loadSurah}from './quran-data.js';
import{reciterInfo,reciterHasSurah,adjacentReciterSurah}from './quran-reciters.js';

// Playback belongs to the app session, independent of mounted reader screens.
export function createQuranSession({load=loadSurah,loadCatalog=loadIndex,createPlayer=createQuranPlayer,loadSaved=reciter=>offlineAudioStore.listRecordings(reciter),media=createMediaSession(),claim=()=>{}}={}){
 let player=null,request=0,view={status:'stopped',surah:null,meta:null,reciter:null,index:0,ayah:null,timingStatus:'unavailable'};
 let offlineOnly=false,savedSurahs=new Set();
 const listeners=new Set(),audioOwner={};
 const adjacent=delta=>{let number=view.surah?adjacentReciterSurah(view.reciter,view.surah.number,delta):null;while(offlineOnly&&number!==null&&!savedSurahs.has(number))number=adjacentReciterSurah(view.reciter,number,delta);return number;};
 const snapshot=()=>({...view,durationSeconds:player?.state?.durationSeconds||0,positionSeconds:player?.state?.positionSeconds??view.positionSeconds??0,offlineOnly,canPrevious:adjacent(-1)!==null,canNext:adjacent(1)!==null});
 const emit=()=>{if(['loading','playing'].includes(view.status))claim();const s=snapshot(),r=view.reciter?reciterInfo(view.reciter):null;media.update(view.surah?{status:view.status,title:view.meta?.name||'Коран',artist:r?.name||'SALAH',artwork:r?.portrait?new URL(r.portrait,globalThis.location?.href||'https://skodytunez-maker.github.io/salah/').href:null,duration:s.durationSeconds,position:s.positionSeconds}:null,{play:()=>{if(!['playing','loading'].includes(view.status))toggle();},pause,stop,seekto:e=>player?.seek?.(e.seekTime),seekbackward:e=>player?.seek?.(snapshot().positionSeconds-(e.seekOffset||10)),seekforward:e=>player?.seek?.(snapshot().positionSeconds+(e.seekOffset||10)),previoustrack:()=>changeSurah(-1),nexttrack:()=>changeSurah(1)});setForegroundAudio(audioOwner,['loading','playing'].includes(view.status));for(const listener of listeners)listener(snapshot())};
 function stop(){offlineOnly=false;savedSurahs=new Set();request++;player?.destroy();player=null;view={status:'stopped',surah:null,meta:null,reciter:null,index:0,ayah:null,timingStatus:'unavailable'};emit()}
 async function start(surah,reciter,index=0,autoplay=true,offline=false,seconds=0,preferContinuous=true){
  reciterInfo(reciter);if(preferContinuous&&!offline&&autoplay&&index===0&&seconds===0&&reciterInfo(reciter).continuousReciter)reciter=reciterInfo(reciter).continuousReciter;if(!reciterHasSurah(reciter,surah?.number))return;
  if(!surah?.verses?.length||!Number.isInteger(index)||index<0||index>=surah.verses.length)return;
  if(player&&view.surah.number===surah.number&&view.reciter===reciter&&offlineOnly===offline){player.play(index,true,seconds);return}
  const id=++request;player?.destroy();player=null;offlineOnly=offline;savedSurahs=new Set();
  view={surah,meta:{number:surah.number,name:'Сура '+surah.number},reciter,index,positionSeconds:seconds,ayah:reciterInfo(reciter).format==='verse'?surah.verses[index].ayah:null,timingStatus:reciterInfo(reciter).format==='verse'?'ready':'idle',status:'loading'};emit();
  try{
   const catalog=await loadCatalog();if(id!==request)return;
   view.meta=catalog.surahs[surah.number-1];
   if(offlineOnly){const saved=await loadSaved(reciter);if(id!==request)return;savedSurahs=new Set(saved.map(record=>record.surah));if(!savedSurahs.has(surah.number))throw Error('Сура не скачана');}
   if(!autoplay){view.status='paused';emit();return}
   player=createPlayer({surah,reciter,offlineOnly,onState:state=>{if(id!==request)return;view={...view,index:state.index,status:state.status,ayah:state.ayah,timingStatus:state.timingStatus};emit();if(state.status==='ended'&&id===request&&adjacent(1)!==null)void changeSurah(1)},onVerse:()=>{},onError:()=>{}});
   player.play(index,true,seconds);
  }catch{if(id===request){view.status='error';emit()}}
 }
 async function changeSurah(delta){
  if(![-1,1].includes(delta)||!view.surah)return;
  const number=adjacent(delta);if(number===null)return;
  const reciter=view.reciter,id=++request;player?.destroy();player=null;
  view={...view,surah:{number},meta:{number,name:'Сура '+number},index:0,positionSeconds:0,ayah:null,timingStatus:'loading',status:'loading'};emit();
  try{const surah=await load(number);if(id!==request)return;await start(surah,reciter,0,true,offlineOnly)}catch{if(id===request){view.status='error';emit()}}
 }
 async function changeReciter(reciter){
  reciterInfo(reciter);if(!view.surah||!reciterHasSurah(reciter,view.surah.number))return false;
  if(reciter===view.reciter)return true;
  if(offlineOnly){const pending=request,number=view.surah.number;const records=await loadSaved(reciter);if(pending!==request||!view.surah||!records.some(record=>record.surah===number))return false;}
  const number=view.surah.number,surah=view.surah,autoplay=['playing','loading'].includes(view.status);
  const index=reciterInfo(view.reciter).format==='verse'&&reciterInfo(reciter).format==='verse'?view.index:0;
  const id=++request;player?.destroy();player=null;
  view={...view,reciter,index,ayah:null,timingStatus:'loading',status:autoplay?'loading':'paused'};emit();
  try{const data=surah.verses?surah:await load(number);if(id!==request)return false;await start(data,reciter,index,autoplay,offlineOnly,0,false);return true}catch{if(id===request){view.status='error';emit()}return false}
 }
 function pause(){if(player)player.pause();else if(view.surah){request++;view.status='paused';emit()}}
 function toggle(){
  if(!view.surah)return;
  if(player){player.toggle();return}
  if(view.status==='loading'){pause();return}
  const number=view.surah.number,reciter=view.reciter;
  if(view.surah.verses)start(view.surah,reciter,view.index,true,offlineOnly);else{
   const id=++request;view.status='loading';emit();
   load(number).then(surah=>{if(id===request)start(surah,reciter,0,true,offlineOnly)}).catch(()=>{if(id===request){view.status='error';emit()}});
  }
 }
 return{seek:seconds=>player?.seek?.(seconds),start,changeSurah,changeReciter,toggle,pause,stop,requestOutput:()=>player?.requestOutput?.()||Promise.resolve({status:'no-media'}),get state(){return snapshot()},subscribe(listener){listeners.add(listener);listener(snapshot());return()=>listeners.delete(listener)}};
}
const quranOwner={};export const quranPlayback=createQuranSession({claim:()=>claimPlayback(quranOwner)});registerPlayback(quranOwner,()=>quranPlayback.pause());
