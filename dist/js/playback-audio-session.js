// Only the current player's explicit intent may recover an OS-reported interruption.
// No visibility, cross-tab message, timer or generic pause triggers automatic playback.
const owners=new WeakMap();
export function createPlaybackAudioSession({nav=globalThis.navigator,canResume=()=>false,resume=()=>{}}={}){
 let session;try{session=nav?.audioSession;}catch{}
 let wanted=false,interrupted=false,disposed=false,prior='auto';
 const owner={};
 function release(){if(session&&owners.get(session)?.owner===owner){owners.delete(session);try{if(session.type==='playback')session.type=prior;}catch{}}}
 function setIntent(value){
  wanted=!!value;interrupted=false;
  if(!session||disposed)return;
  if(!wanted){release();return;}
  if(owners.get(session)?.owner!==owner){try{prior=owners.get(session)?.prior||session.type||'auto';session.type='playback';owners.set(session,{owner,prior});}catch{}}
 }
 function changed(){
  if(disposed||!wanted||owners.get(session)?.owner!==owner)return;
  if(session.state==='interrupted'){interrupted=true;return;}
  if(session.state!=='active'||!interrupted)return;
  interrupted=false;
  if(canResume())void Promise.resolve().then(()=>{if(!disposed&&wanted&&session.state==='active'&&owners.get(session)?.owner===owner&&canResume())return resume();}).catch(()=>{});
 }
 try{session?.addEventListener?.('statechange',changed);}catch{}
 return{setIntent,destroy(){disposed=true;wanted=false;interrupted=false;release();try{session?.removeEventListener?.('statechange',changed);}catch{}}};
}
