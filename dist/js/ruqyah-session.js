import{RUQYAH_RECORDINGS}from './ruqyah-catalog.js';
import{reciterInfo}from './quran-reciters.js';
import{setForegroundAudio}from './audio-focus.js';
import{claimPlayback,registerPlayback}from './media-playback-focus.js';
import{requestMediaOutput}from './media-output-core.js';
import{createMediaSession}from './media-session.js';
export function createRuqyahSession({createAudio=url=>new Audio(url),media=createMediaSession(),focus=setForegroundAudio,claim=()=>{}}={}){
 let audio=null,record=null,status='stopped',sequence=0;const owner={},listeners=new Set();
 const snapshot=()=>({record,status,positionSeconds:Number.isFinite(audio?.currentTime)?audio.currentTime:0,durationSeconds:Number.isFinite(audio?.duration)&&audio.duration>0?audio.duration:record?.duration||0});
 const emit=()=>{const s=snapshot();focus(owner,['loading','playing'].includes(status));const r=record?reciterInfo(record.reciter):null;media.update(record?{status,title:record.title,artist:r.name,artwork:r.portrait?new URL(r.portrait,globalThis.location?.href||'https://skodytunez-maker.github.io/salah/').href:null,duration:s.durationSeconds,position:s.positionSeconds}:null,{play:()=>resume(),pause,stop,seekto:e=>seek(e.seekTime),seekbackward:e=>seek(snapshot().positionSeconds-(e.seekOffset||10)),seekforward:e=>seek(snapshot().positionSeconds+(e.seekOffset||10))});for(const fn of listeners)fn(s);};
 function stop(){sequence++;if(audio){audio.onplay=audio.onpause=audio.onended=audio.onerror=audio.ontimeupdate=audio.onloadedmetadata=null;audio.pause();audio.removeAttribute?.('src');audio.src='';audio.load?.();audio.remove?.();}audio=null;record=null;status='stopped';emit();}
 function pause(){if(!audio)return;sequence++;audio.pause();status='paused';emit();}
 async function resume(){if(!audio)return;const id=++sequence;claim();status='loading';emit();try{await audio.play();if(id!==sequence)return;status='playing';emit();}catch{if(id===sequence){status='error';emit();}}}
 function start(id){const found=RUQYAH_RECORDINGS.find(r=>r.id===id);if(!found)return;if(record?.id===id&&audio){if(['playing','loading'].includes(status))pause();else void resume();return;}stop();record=found;audio=createAudio(found.url);audio.preload='metadata';audio.setAttribute?.('playsinline','');audio.hidden=true;globalThis.document?.body?.append?.(audio);const own=audio;
  audio.onplay=()=>{if(audio!==own)return;claim();status='playing';emit();};audio.onpause=()=>{if(audio!==own||status==='ended'||status==='error')return;status='paused';emit();};audio.onended=()=>{if(audio===own){status='ended';emit();}};audio.onerror=()=>{if(audio===own){sequence++;status='error';emit();}};audio.ontimeupdate=audio.onloadedmetadata=()=>{if(audio===own)emit();};void resume();}
 function seek(seconds){if(!audio||!Number.isFinite(seconds))return;try{audio.currentTime=Math.max(0,Math.min(seconds,Math.max(0,snapshot().durationSeconds-.01)));emit();}catch{}}
 return{start,pause,stop,seek,toggle:()=>['playing','loading'].includes(status)?pause():resume(),requestOutput:()=>requestMediaOutput(audio),get state(){return snapshot()},subscribe(fn){listeners.add(fn);fn(snapshot());return()=>listeners.delete(fn)}};
}
const ruqyahOwner={};export const ruqyahPlayback=createRuqyahSession({claim:()=>claimPlayback(ruqyahOwner)});registerPlayback(ruqyahOwner,()=>ruqyahPlayback.stop());
