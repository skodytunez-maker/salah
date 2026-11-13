import{RECITERS,reciterHasSurah}from './quran-reciters.js';

export const QURAN_SESSION_KEY='salah:quran-session-v1';
const recording=value=>!!value&&Number.isInteger(value.surah)&&value.surah>=1&&value.surah<=114&&RECITERS.some(r=>r.id===value.reciter)&&reciterHasSurah(value.reciter,value.surah);
export function normalizeQuranSession(value){
 if(!recording(value)||value.schema!==1||!Number.isInteger(value.index)||value.index<0||value.index>=286||!Number.isFinite(value.seconds)||value.seconds<0||value.seconds>86400)return null;
 const duration=Number.isFinite(value.duration)&&value.duration>=0&&value.duration<=86400?value.duration:0;
 const elapsed=Number.isFinite(value.elapsed)&&value.elapsed>=0&&value.elapsed<=86400?value.elapsed:value.seconds;
 let playlist=null;
 const q=value.playlist;
 if(value.offlineOnly!==true&&q&&Array.isArray(q.tracks)&&q.tracks.length>0&&q.tracks.length<=114&&q.tracks.every(recording)&&Number.isInteger(q.index)&&q.index>=0&&q.index<q.tracks.length&&q.tracks[q.index].surah===value.surah&&q.tracks[q.index].reciter===value.reciter){playlist={index:q.index,tracks:q.tracks.map(t=>({surah:t.surah,reciter:t.reciter,title:typeof t.title==='string'?t.title.slice(0,200):'Сура '+t.surah}))};}
 return{schema:1,surah:value.surah,reciter:value.reciter,index:value.index,seconds:value.seconds,elapsed,duration,ayah:Number.isInteger(value.ayah)&&value.ayah>=1&&value.ayah<=286?value.ayah:null,name:typeof value.name==='string'?value.name.slice(0,200):'Сура '+value.surah,offlineOnly:value.offlineOnly===true,expanded:value.expanded===true,playlist};
}

// A reload recreates the document and its Audio element. Restore a paused session,
// never play() or count the time spent installing an update as listening.
export function initQuranSessionRecovery({playback,storage,win=globalThis.window,doc=globalThis.document,now=Date.now,getExpanded=()=>false,restoreExpanded=()=>{}}){
 let saved=null,restoring=true,lastWrite=-Infinity,disposed=false;
 if(storage===undefined)try{storage=globalThis.localStorage;}catch{}
 try{saved=normalizeQuranSession(JSON.parse(storage?.getItem(QURAN_SESSION_KEY)||'null'));}catch{}
 function persist(force=false){
  if(disposed)return;
  const s=playback.state;
  if(!s.surah){if(restoring)return;try{storage?.setItem(QURAN_SESSION_KEY,JSON.stringify({schema:1,closed:true}));}catch{}return;}
  if(!force&&s.status==='playing'&&now()-lastWrite<3000)return;
  const value=normalizeQuranSession({schema:1,surah:s.surah.number,reciter:s.reciter,index:s.index,seconds:s.trackPositionSeconds??s.positionSeconds??0,elapsed:s.positionSeconds??0,duration:s.durationSeconds??0,ayah:s.ayah,name:s.meta?.name,offlineOnly:s.offlineOnly,playlist:s.playlist,expanded:getExpanded()});
  if(!value)return;
  try{storage?.setItem(QURAN_SESSION_KEY,JSON.stringify(value));lastWrite=now();}catch{}
 }
 const unsubscribe=playback.subscribe(()=>persist());
 const ready=Promise.resolve().then(()=>{
  if(disposed||!saved||playback.state.surah)return false;
  const result=playback.restoreSession(saved);
  if(saved.expanded&&playback.state.surah)restoreExpanded();
  return result;
 }).catch(()=>false).finally(()=>{restoring=false;persist(true);});
 const flush=()=>persist(true),hide=()=>{if(doc.hidden)flush();};
 win?.addEventListener('pagehide',flush);win?.addEventListener('salah:before-update-reload',flush);doc?.addEventListener('visibilitychange',hide);
 return{ready,flush,destroy(){flush();disposed=true;unsubscribe();win?.removeEventListener('pagehide',flush);win?.removeEventListener('salah:before-update-reload',flush);doc?.removeEventListener('visibilitychange',hide);}};
}
