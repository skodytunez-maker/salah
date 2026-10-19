import{createMediaSession}from './media-session.js';
import{claimPlayback,registerPlayback}from './media-playback-focus.js';
import{offlineAudioStore}from './quran-offline-store.js';
import{setForegroundAudio}from './audio-focus.js';
import{createQuranPlayer}from './quran-audio.js';
import{loadIndex}from './quran-data.js';
import{reciterInfo,reciterHasSurah,adjacentReciterSurah}from './quran-reciters.js';
import{makeQuranPlaylist}from './quran-playlist.js';
import{reciterRecording}from './quran-reciter-recording.js';

// Playback belongs to the app session, independent of mounted reader screens.
export function createQuranSession({loadCatalog=loadIndex,load=async number=>reciterRecording(await loadCatalog(),number),createPlayer=createQuranPlayer,createAudio=url=>new Audio(url),loadSaved=reciter=>offlineAudioStore.listRecordings(reciter),media=createMediaSession(),claim=()=>{},random=Math.random}={}){
 let player=null,request=0,view={status:'stopped',surah:null,meta:null,reciter:null,index:0,ayah:null,timingStatus:'unavailable'};
 let offlineOnly=false,savedSurahs=new Set(),playlist=[],playlistIndex=-1,playlistBuilding=false,playlistId=0;
 const listeners=new Set(),audioOwner={};
 // Reuse the media element the listener started across whole-surah tracks.
 // Mobile playback permission belongs to that element, not a new Audio object.
 let chapterAudio=null;
 const createChapterAudio=url=>{if(!chapterAudio)chapterAudio=createAudio(url);else chapterAudio.src=url;return chapterAudio;};
 const adjacent=delta=>{if(playlist.length)return playlist[playlistIndex+delta]?.surah??null;let number=view.surah?adjacentReciterSurah(view.reciter,view.surah.number,delta):null;while(offlineOnly&&number!==null&&!savedSurahs.has(number))number=adjacentReciterSurah(view.reciter,number,delta);return number;};
 const snapshot=()=>({...view,durationStatus:player?.state?.durationStatus||'loading',durationSeconds:player?.state?.durationSeconds||0,positionSeconds:player?.state?.positionSeconds??view.positionSeconds??0,trackPositionSeconds:player?.state?.trackPositionSeconds??player?.state?.positionSeconds??view.positionSeconds??0,offlineOnly,playlistBuilding,playlist:playlist.length?{id:playlistId,index:playlistIndex,tracks:playlist.slice()}:null,canPrevious:adjacent(-1)!==null,canNext:adjacent(1)!==null});
 const emit=()=>{if(['loading','playing'].includes(view.status))claim();const s=snapshot(),r=view.reciter?reciterInfo(view.reciter):null;media.update(view.surah?{status:view.status,title:view.meta?.name||'Коран',artist:r?.name||'SALAH',artwork:r?.portrait?new URL(r.portrait,globalThis.location?.href||'https://skodytunez-maker.github.io/salah/').href:null,duration:s.durationSeconds,position:s.positionSeconds}:null,{play:()=>{if(!['playing','loading'].includes(view.status))toggle();},pause,stop,seekto:e=>player?.seek?.(e.seekTime),seekbackward:e=>player?.seek?.(snapshot().positionSeconds-(e.seekOffset||10)),seekforward:e=>player?.seek?.(snapshot().positionSeconds+(e.seekOffset||10)),previoustrack:()=>changeSurah(-1),nexttrack:()=>changeSurah(1)});setForegroundAudio(audioOwner,['loading','playing'].includes(view.status));for(const listener of listeners)listener(snapshot())};
 function stop(){offlineOnly=false;savedSurahs=new Set();playlist=[];playlistIndex=-1;playlistBuilding=false;request++;player?.destroy();player=null;view={status:'stopped',surah:null,meta:null,reciter:null,index:0,ayah:null,timingStatus:'unavailable'};emit()}
 async function start(surah,reciter,index=0,autoplay=true,offline=false,seconds=0,preferContinuous=true,keepPlaylist=false,fromAyah=false){
  reciterInfo(reciter);if(preferContinuous&&!offline&&globalThis.navigator?.onLine!==false&&autoplay&&index===0&&seconds===0&&reciterInfo(reciter).continuousReciter)reciter=reciterInfo(reciter).continuousReciter;if(!reciterHasSurah(reciter,surah?.number))return;
  if(!surah?.verses?.length||!Number.isInteger(index)||index<0||index>=surah.verses.length)return;
  if(!keepPlaylist){playlist=[];playlistIndex=-1;playlistBuilding=false;}
  if(player&&view.surah.number===surah.number&&view.reciter===reciter&&offlineOnly===offline){if(fromAyah)await player.playFromAyah(index+1);else player.play(index,true,seconds);emit();return}
  const id=++request;player?.destroy();player=null;offlineOnly=offline;savedSurahs=new Set();
  view={surah,meta:{number:surah.number,name:'Сура '+surah.number},reciter,index,positionSeconds:seconds,ayah:reciterInfo(reciter).format==='verse'?surah.verses[index].ayah:null,timingStatus:reciterInfo(reciter).format==='verse'?'ready':'idle',status:'loading'};emit();
  try{
   const catalog=await loadCatalog();if(id!==request)return;
   view.meta=catalog.surahs[surah.number-1];
   if(offlineOnly){const saved=await loadSaved(reciter);if(id!==request)return;savedSurahs=new Set(saved.map(record=>record.surah));if(!savedSurahs.has(surah.number))throw Error('Сура не скачана');}
   if(!autoplay){view.status='paused';emit();return}
   player=createPlayer({surah,reciter,offlineOnly,...(reciterInfo(reciter).format==='surah'?{createAudio:createChapterAudio}:{}),onState:state=>{if(id!==request)return;view={...view,index:state.index,status:state.status,ayah:state.ayah,timingStatus:state.timingStatus};emit();if(state.status==='ended'&&id===request&&adjacent(1)!==null)void changeSurah(1)},onVerse:()=>{},onError:()=>{}});
   if(fromAyah)await player.playFromAyah(index+1);else player.play(index,true,seconds);
  }catch{if(id===request){view.status='error';emit()}}
 }
 async function changeSurah(delta){
  if(![-1,1].includes(delta)||!view.surah)return;
  if(playlist.length)return playPlaylistEntry(playlistIndex+delta);
  const number=adjacent(delta);if(number===null)return;
  const reciter=view.reciter,id=++request;player?.destroy();player=null;
  view={...view,surah:{number},meta:{number,name:'Сура '+number},index:0,positionSeconds:0,ayah:null,timingStatus:'loading',status:'loading'};emit();
  try{const surah=await load(number);if(id!==request)return;await start(surah,reciter,0,true,offlineOnly)}catch{if(id===request){view.status='error';emit()}}
 }
 async function playPlaylistEntry(position){
  const entry=playlist[position];if(!entry)return false;
  const queue=playlist,id=++request;player?.destroy();player=null;playlistIndex=position;
  view={...view,surah:{number:entry.surah},meta:{number:entry.surah,name:'Сура '+entry.surah},reciter:entry.reciter,index:0,positionSeconds:0,ayah:null,timingStatus:'loading',status:'loading'};emit();
  try{const data=await load(entry.surah);if(id!==request||queue!==playlist)return false;await start(data,entry.reciter,0,true,false,0,true,true);return true;}catch{if(id===request){view.status='error';emit();}return false;}
 }
 async function startPlaylist(){
  if(offlineOnly||playlistBuilding)return false;
  const currentSurah=view.surah?.number,id=++request;player?.destroy();player=null;playlist=[];playlistIndex=-1;playlistBuilding=true;view={...view,status:'loading'};emit();
  try{const catalog=await loadCatalog();if(id!==request)return false;playlist=makeQuranPlaylist(catalog,{random,currentSurah});playlistId++;playlistBuilding=false;if(!playlist.length)throw Error('Нет доступных записей');return playPlaylistEntry(0);}catch{if(id===request){playlistBuilding=false;view.status='error';emit();}return false;}
 }
 async function changeReciter(reciter){
  reciterInfo(reciter);if(!view.surah||!reciterHasSurah(reciter,view.surah.number))return false;
  const chosen=reciterInfo(reciter);
  if(!offlineOnly&&globalThis.navigator?.onLine!==false&&!chosen.variantOf&&chosen.continuousReciter&&(reciterInfo(view.reciter).format==='surah'||view.index===0))reciter=chosen.continuousReciter;
  if(reciter===view.reciter)return true;
  if(offlineOnly){const pending=request,number=view.surah.number;const records=await loadSaved(reciter);if(pending!==request||!view.surah||!records.some(record=>record.surah===number))return false;}
  const number=view.surah.number,surah=view.surah,autoplay=['playing','loading'].includes(view.status);
  const index=reciterInfo(view.reciter).format==='verse'&&reciterInfo(reciter).format==='verse'?view.index:0;
  const id=++request;player?.destroy();player=null;
  view={...view,reciter,index,ayah:null,timingStatus:'loading',status:autoplay?'loading':'paused'};emit();
  try{const data=surah.verses?surah:await load(number);if(id!==request)return false;await start(data,reciter,index,autoplay,offlineOnly,0,false);return true}catch{if(id===request){view.status='error';emit()}return false}
 }
 function pause(){if(player)player.pause();else if(view.surah||playlistBuilding){request++;playlistBuilding=false;view.status='paused';emit()}}
 function toggle(){
  if(!view.surah)return;
  if(player){player.toggle();return}
  if(view.status==='loading'){pause();return}
  if(playlist.length){void playPlaylistEntry(playlistIndex);return}
  const number=view.surah.number,reciter=view.reciter;
  if(view.surah.verses)start(view.surah,reciter,view.index,true,offlineOnly,view.positionSeconds||0,false);else{
   const id=++request;view.status='loading';emit();
   load(number).then(surah=>{if(id===request)start(surah,reciter,0,true,offlineOnly)}).catch(()=>{if(id===request){view.status='error';emit()}});
  }
 }
 return{startFromAyah:(surah,reciter,ayah)=>start(surah,reciter,ayah-1,true,false,0,false,false,true),seek:seconds=>player?.seek?.(seconds),start,startPlaylist,playPlaylistEntry,changeSurah,changeReciter,toggle,pause,stop,requestOutput:()=>player?.requestOutput?.()||Promise.resolve({status:'no-media'}),get state(){return snapshot()},subscribe(listener){listeners.add(listener);listener(snapshot());return()=>listeners.delete(listener)}};
}
const quranOwner={};export const quranPlayback=createQuranSession({claim:()=>claimPlayback(quranOwner)});registerPlayback(quranOwner,()=>quranPlayback.pause());
