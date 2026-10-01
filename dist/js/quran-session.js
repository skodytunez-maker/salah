import{createQuranPlayer}from './quran-audio.js';
import{loadIndex,loadSurah}from './quran-data.js';
import{reciterInfo}from './quran-reciters.js';

// Playback belongs to the app session, independent of mounted reader screens.
export function createQuranSession({load=loadSurah,loadCatalog=loadIndex,createPlayer=createQuranPlayer}={}){
 let player=null,request=0,view={status:'stopped',surah:null,meta:null,reciter:null,index:0};
 const listeners=new Set();
 const snapshot=()=>({...view,canPrevious:!!view.surah&&view.surah.number>1,canNext:!!view.surah&&view.surah.number<114});
 const emit=()=>{for(const listener of listeners)listener(snapshot())};
 function stop(){request++;player?.destroy();player=null;view={status:'stopped',surah:null,meta:null,reciter:null,index:0};emit()}
 async function start(surah,reciter,index=0){
  reciterInfo(reciter);
  if(!surah?.verses?.length||!Number.isInteger(index)||index<0||index>=surah.verses.length)return;
  if(player&&view.surah.number===surah.number&&view.reciter===reciter){player.play(index,true);return}
  const id=++request;player?.destroy();player=null;
  view={surah,meta:{number:surah.number,name:'Сура '+surah.number},reciter,index,status:'loading'};emit();
  try{
   const catalog=await loadCatalog();if(id!==request)return;
   view.meta=catalog.surahs[surah.number-1];
   player=createPlayer({surah,reciter,onState:state=>{if(id!==request)return;view={...view,index:state.index,status:state.status};emit();if(state.status==='ended'&&id===request&&surah.number<114)void changeSurah(1)},onVerse:()=>{},onError:()=>{}});
   player.play(index,true);
  }catch{if(id===request){view.status='error';emit()}}
 }
 async function changeSurah(delta){
  if(![-1,1].includes(delta)||!view.surah)return;
  const number=view.surah.number+delta;if(number<1||number>114)return;
  const reciter=view.reciter,id=++request;player?.destroy();player=null;
  view={...view,surah:{number},meta:{number,name:'Сура '+number},index:0,status:'loading'};emit();
  try{const surah=await load(number);if(id!==request)return;await start(surah,reciter)}catch{if(id===request){view.status='error';emit()}}
 }
 function pause(){if(player)player.pause();else if(view.surah){request++;view.status='paused';emit()}}
 function toggle(){
  if(!view.surah)return;
  if(player){player.toggle();return}
  if(view.status==='loading'){pause();return}
  const number=view.surah.number,reciter=view.reciter;
  if(view.surah.verses)start(view.surah,reciter,view.index);else{
   const id=++request;view.status='loading';emit();
   load(number).then(surah=>{if(id===request)start(surah,reciter)}).catch(()=>{if(id===request){view.status='error';emit()}});
  }
 }
 return{start,changeSurah,toggle,pause,stop,get state(){return snapshot()},subscribe(listener){listeners.add(listener);listener(snapshot());return()=>listeners.delete(listener)}};
}
export const quranPlayback=createQuranSession();
