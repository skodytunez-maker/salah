// Safari may expose only audioSession.type, without state/statechange.
// A foreground return may recover an unexplained background pause in a standalone
// app. UI/MediaSession pause, another in-page owner, stop and destroy always win.
const owners=new WeakMap();
export function createPlaybackAudioSession({nav=globalThis.navigator,doc=globalThis.document,win=globalThis.window,now=Date.now,canResume=()=>false,resume=()=>{}}={}){
 let session;try{session=nav?.audioSession;}catch{}
 let wanted=false,interrupted=false,pausedPending=false,disposed=false,prior='auto',revision=0,queued=null;
 let backgrounded=false,pausedHidden=false,returnedAt=null;
 const owner={},readState=()=>{try{return session?.state;}catch{return null;}};
 const stateSupported=()=>['active','inactive','interrupted'].includes(readState());
 const standalone=nav?.standalone===true;
 const visible=()=>doc?.hidden===false;
 const focused=()=>{try{return typeof doc?.hasFocus!=='function'||doc.hasFocus();}catch{return false;}};
 const owns=()=>!session||owners.get(session)?.owner===owner;
 function reset(){interrupted=false;pausedPending=false;backgrounded=false;pausedHidden=false;returnedAt=null;queued=null;revision++;}
 function release(){if(session&&owns()){owners.delete(session);try{if(session.type==='playback')session.type=prior;}catch{}}}
 function eligible(){
  if(disposed||!wanted||!owns()||!pausedPending)return false;
  if(stateSupported())return interrupted&&readState()==='active';
  return standalone&&backgrounded&&visible()&&focused()&&(pausedHidden||returnedAt!==null&&now()-returnedAt<=2000);
 }
 function recover(){
  if(!eligible()||!canResume()||queued===revision)return;
  const ticket=revision;queued=ticket;
  void Promise.resolve().then(()=>{
   if(queued!==ticket)return;queued=null;
   if(ticket!==revision||!eligible()||!canResume())return;
   // Consume this interruption before play(): lifecycle events cannot retry it.
   interrupted=false;pausedPending=false;backgrounded=false;pausedHidden=false;returnedAt=null;
   return resume();
  }).catch(()=>{});
 }
 function setIntent(value){
  wanted=!!value;reset();if(!session||disposed){if(wanted&&standalone&&!stateSupported()&&!visible())backgrounded=true;return;}
  if(!wanted){release();return;}
  if(!owns()){try{prior=owners.get(session)?.prior||session.type||'auto';session.type='playback';owners.set(session,{owner,prior});}catch{}}
  if(standalone&&!stateSupported()&&!visible())backgrounded=true;
 }
 function changed(){
  if(disposed||!wanted||!owns())return;
  if(readState()==='interrupted'){interrupted=true;return;}
  // Keep the interruption pending if the media pause event is delivered later.
  if(readState()==='active')recover();
  else if(readState()==='inactive')interrupted=false;
 }
 function notifyPause(){
  if(disposed||!wanted||!owns())return;
  if(readState()==='interrupted')interrupted=true;
  if(!stateSupported()){
   if(!standalone)return;
   if(!visible()){backgrounded=true;pausedHidden=true;}
   else if(!backgrounded||returnedAt!==null&&now()-returnedAt>2000){pausedPending=false;backgrounded=false;return;}
  }
  pausedPending=true;recover();
 }
 function notifyPlaying(){if(disposed||!wanted)return;reset();if(standalone&&!stateSupported()&&!visible())backgrounded=true;}
 function lifecycle(){
  if(disposed||!wanted||!owns()||stateSupported()||!standalone)return;
  if(!visible()){backgrounded=true;returnedAt=null;return;}
  if(backgrounded&&returnedAt===null)returnedAt=now();
  recover();
 }
 try{session?.addEventListener?.('statechange',changed);}catch{}
 if(standalone){doc?.addEventListener?.('visibilitychange',lifecycle);win?.addEventListener?.('pageshow',lifecycle);win?.addEventListener?.('focus',lifecycle);}
 return{setIntent,notifyPause,notifyPlaying,destroy(){disposed=true;wanted=false;reset();release();try{session?.removeEventListener?.('statechange',changed);}catch{}if(standalone){doc?.removeEventListener?.('visibilitychange',lifecycle);win?.removeEventListener?.('pageshow',lifecycle);win?.removeEventListener?.('focus',lifecycle);}}};
}
