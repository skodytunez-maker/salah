import{QURAN_SESSION_KEY}from './quran-session-recovery.js';
import{read,write}from './storage.js';
import{RECITERS,reciterInfo}from './quran-reciters.js';
let account=()=>({}),initialized=false,lastStoppedOwner=null,lastStoppedPosition=null;
const scope=()=>account().userId||'device';
export function validListeningPosition(p){return !!p&&Number.isInteger(p.surah)&&p.surah>=1&&p.surah<=114&&RECITERS.some(r=>r.id===p.reciter)&&Number.isInteger(p.index)&&p.index>=0&&p.index<286&&Number.isFinite(p.seconds)&&p.seconds>=0&&p.seconds<=86400&&Number.isFinite(p.updatedAt);}
export function readListeningPosition(){const p=read('quran-last-listening-v1:'+scope(),null);return validListeningPosition(p)?p:null;}
const dismissalKey=owner=>'quran-dismissed-listening-v1:'+owner;
function playerIsClosed(){try{return JSON.parse(localStorage.getItem(QURAN_SESSION_KEY)||'null')?.closed===true}catch{return false}}
// Only the cross/right-swipe calls this after the exact paused sample and the
// closed tombstone. This preference is never an active playback checkpoint.
export function markListeningDismissed(){
 const owner=scope(),position=readListeningPosition(),last=lastStoppedPosition;
 if(lastStoppedOwner!==owner||!playerIsClosed()||!validListeningPosition(position)||!last||['surah','reciter','index','seconds','updatedAt'].some(key=>position[key]!==last[key]))return false;
 const preferred=read('quran-preferences',{}).reciter;
 return write(dismissalKey(owner),{schema:1,owner,preferred:RECITERS.some(reciter=>reciter.id===preferred)?preferred:null,position});
}
export function readResumeAfterDismiss(surah,reciter,offlineOnly=false){
 const owner=scope(),marker=read(dismissalKey(owner),null),position=marker?.position,number=typeof surah==='number'?surah:surah?.number;
 if(!playerIsClosed()||marker?.schema!==1||marker.owner!==owner||!validListeningPosition(position)||position.surah!==number||(position.offlineOnly===true)!==(offlineOnly===true)||!RECITERS.some(item=>item.id===reciter)||marker.preferred&&marker.preferred!==reciter)return null;
 const current=readListeningPosition();
 if(!current||['surah','reciter','index','seconds','updatedAt','offlineOnly','elapsed','ayah'].some(key=>position[key]!==current[key]))return null;
 if(surah?.verses&&position.index>=surah.verses.length)return null;
 if(position.reciter!==reciter&&reciterInfo(reciter).continuousReciter!==position.reciter)return null;
 return {...position};
}
export function initQuranListeningProgress({playback,getAccount,now=Date.now,restoreAfterUpdate=false}){if(initialized)return;initialized=true;account=getAccount;
 let legacyPending=false;try{legacyPending=restoreAfterUpdate&&localStorage.getItem(QURAN_SESSION_KEY)===null;}catch{}
 const restoreLegacy=()=>{if(!legacyPending)return;if(playback.state.surah){legacyPending=false;return;}if(account().identityKnown!==true)return;legacyPending=false;const p=readListeningPosition();if(!p||now()-p.updatedAt>15*60*1000||p.updatedAt>now()+30000)return;void playback.restoreSession({schema:1,surah:p.surah,reciter:p.reciter,index:p.index,seconds:p.seconds,elapsed:p.elapsed??p.seconds,ayah:p.ayah,offlineOnly:p.offlineOnly});};
 window.addEventListener('salah:counter-status',restoreLegacy);restoreLegacy();
 let last=null,lastSave=0,owner=null,signature='';const persist=()=>{if(last&&owner&&write('quran-last-listening-v1:'+owner,last))lastSave=now();};const sample=()=>{const s=playback.state;if(s.surah)legacyPending=false;if(!s.surah||!s.reciter){persist();lastStoppedOwner=owner;lastStoppedPosition=last?{...last}:null;signature='';owner=null;return;}const key=s.reciter+':'+s.surah.number;if(key!==signature||s.status==='loading'&&signature===''){signature=key;owner=scope();lastStoppedOwner=null;lastStoppedPosition=null;write(dismissalKey(owner),null);}if(owner!==scope()||!['playing','paused','ended'].includes(s.status))return;const whole=reciterInfo(s.reciter).format==='surah';last={surah:s.surah.number,reciter:s.reciter,index:whole?0:s.index,ayah:s.ayah||s.index+1,seconds:s.trackPositionSeconds??s.positionSeconds??0,elapsed:s.positionSeconds||0,offlineOnly:s.offlineOnly===true,updatedAt:now()};if(validListeningPosition(last)&&(now()-lastSave>=3000||s.status!=='playing'))persist();};playback.subscribe(sample);setInterval(sample,1000);window.addEventListener('pagehide',()=>{sample();persist();});document.addEventListener('visibilitychange',()=>{if(document.hidden){sample();persist();}});}
