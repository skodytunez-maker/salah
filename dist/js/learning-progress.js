import{createLearningProgress,completeAdhkarRound}from './learning-progress-core.js';
import{sendCompetitionPresence,refreshCompetitionOwn,competitionOwn}from './competition-client.js';
import{dateKey}from './prayers.js';
let getAccount=()=>({signedIn:false}),queue=null,initialized=false,busy=false,retry=0;
const current=()=>{const a=getAccount();try{return a.signedIn&&a.identityKnown&&localStorage.getItem('salah:counter-active-account')===a.userId?a.userId:null;}catch{return null;}};
const changed=()=>window.dispatchEvent(new Event('salah:learning-progress'));
export const readJuzMarked=number=>!!current()&&!!queue?.hasJuz(current(),number);
export function markReadJuz(number){const id=current();if(!id)return{ok:false,reason:'sign_in'};const ok=queue.markJuz(id,number,dateKey());if(ok){changed();void sync();}return{ok,reason:ok?'':'storage'};}
// Called only after a successful count mutation with the account captured before
// its async lock. The day's evening session can legitimately resume after midnight.
export function recordAdhkarRound(account,group,progress){if(!account||account!==current())return false;const round=completeAdhkarRound(group,progress);if(!round)return false;const ok=queue.markRound(account,round);if(ok)void sync();return ok;}
async function sync(){const id=current();if(!id||busy||navigator.onLine===false||Date.now()<retry)return;const packet=queue.pending(id);if(!packet.juz.length&&!packet.rounds.length)return;busy=true;try{const result=await sendCompetitionPresence({action:'learning-progress',...packet});if(result?.ok!==true)throw Error('progress_unavailable');if(current()===id){queue.acknowledge(id,packet);await refreshCompetitionOwn({force:true});retry=0;}}catch{retry=Date.now()+15000;}finally{busy=false;}}
export function initLearningProgress({getAccount:readAccount}){if(initialized)return;initialized=true;getAccount=readAccount;queue=createLearningProgress({storage:localStorage});const update=()=>{const id=current();if(id){const state=competitionOwn()?.awards?.learning;if(state)queue.merge(id,state);}changed();void sync();};window.addEventListener('salah:counter-status',update);window.addEventListener('salah:competition-updated',update);window.addEventListener('online',()=>{retry=0;void sync();});window.addEventListener('storage',event=>{if(event.key?.startsWith('salah:learning-progress:v2:'))changed();});document.addEventListener('visibilitychange',()=>{if(!document.hidden)void sync();});setInterval(()=>void sync(),15000);update();}
