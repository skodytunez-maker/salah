const MAX_SEQUENCE=2147483647,MAX_ACTION_AGE=86400000;
export const APP_SECTIONS=['home','knowledge','quran','reciters','qibla','adhkar','more','settings','account','support','staff','lesson','radio','admin','other'];
export function appSection(location){
 const [path,query='']=String(location?.hash||'').replace(/^#/,'').split('?'),route=path||'home';
 if(route==='quran')return new URLSearchParams(query).get('view')==='reciters'?'reciters':'quran';
 if(APP_SECTIONS.includes(route))return route;
 if(['umrah','alphabet'].includes(route))return 'knowledge';
 if(['learning','teacher'].includes(route))return 'lesson';
 if(['calendar','history','about','sources','support-salah'].includes(route))return 'more';
 return 'other';
}
// This short-lived signal describes app state, never Top eligibility or input contents.
export function createAppStateReporter({getIdentity,getView,getPlayback,getCreditPaused=()=>null,appVersion,send,now=Date.now,randomId=()=>crypto.randomUUID(),Controller=AbortController,schedule=setTimeout,cancel=clearTimeout}){
 let identity=null,scope=null,tab=null,sequence=0,actionSequence=0,lastAction=null,previous=null,forwardAt=-Infinity,lastSent=-Infinity,lastSignature=null,lastActionSent=-1,retryAt=0,timer=null,inflight=null,queued=false,epoch=0,disposed=false;
 const reset=next=>{epoch++;if(timer!==null)cancel(timer);timer=null;if(inflight){inflight.controller.abort();cancel(inflight.timeout);}inflight=null;identity=next;scope=next?.scope||null;tab=scope?randomId():null;sequence=actionSequence=0;lastAction=null;previous=null;forwardAt=-Infinity;lastSent=-Infinity;lastSignature=null;lastActionSent=-1;retryAt=0;queued=false;};
 const current=()=>{const next=getIdentity();if(next?.scope!==scope)reset(next||null);else identity=next;return identity;};
 const playerState=time=>{
  const state=getPlayback()||{},position=Number(state.trackPositionSeconds??state.positionSeconds),key=String(state.reciter||'')+':'+String(state.surah?.number||state.recordingId||'')+':'+String(state.seekRevision||0);
  if(state.status==='playing'&&state.reciter&&Number.isFinite(position)){
   if(previous?.key===key&&previous.playing){const elapsed=(time-previous.time)/1000,delta=position-previous.position;if(elapsed>0&&delta>0&&delta<=elapsed*4+1)forwardAt=time;else if(delta<0||elapsed<0)forwardAt=-Infinity;}
   else forwardAt=-Infinity;
  }else forwardAt=-Infinity;
  previous={key,position,time,playing:state.status==='playing'};
  if(state.status==='paused')return 'paused';
  if(['idle','stopped','ended'].includes(state.status))return 'stopped';
  return state.status==='playing'&&time-forwardAt<20000?'playing':'unknown';
 };
 const later=delay=>{if(timer!==null)return;timer=schedule(()=>{timer=null;sample();},Math.max(0,delay));};
 function sample({force=false,keepalive=false}={}){
  if(disposed||!current())return;
  const time=now(),view=getView()||{},credit=getCreditPaused(),snapshot={visible:view.visible===true,section:APP_SECTIONS.includes(view.section)?view.section:'other',playerState:playerState(time),creditPaused:typeof credit==='boolean'?credit:null},signature=JSON.stringify(snapshot);
  const due=force||signature!==lastSignature||actionSequence!==lastActionSent||time-lastSent>=15000;
  if(!due)return;
  keepalive=keepalive||!snapshot.visible;
  if(inflight){if(keepalive&&!inflight.keepalive){inflight.controller.abort();cancel(inflight.timeout);inflight=null;}else{queued=true;return;}}
  const earliest=force&&keepalive?time:Math.max(lastSent+1000,retryAt);if(time<earliest){later(earliest-time);return;}
  if(timer!==null){cancel(timer);timer=null;}
  if(sequence>=MAX_SEQUENCE){tab=randomId();sequence=actionSequence=0;lastAction=null;}
  const age=lastAction===null?null:Math.max(0,Math.floor(time-lastAction)),person=identity;
  const packet={action:person.guest?'guest-state':'app-state',...(person.guest?{device:person.device}:{}),tab,sequence:++sequence,...snapshot,actionSequence,actionAgeMs:age===null?null:Math.min(MAX_ACTION_AGE,age),appVersion};
  const controller=new Controller(),entry={controller,keepalive,timeout:null},generation=epoch;
  entry.timeout=schedule(()=>controller.abort(),5000);inflight=entry;queued=false;lastSent=time;lastSignature=signature;lastActionSent=actionSequence;
  void Promise.resolve().then(()=>send(packet,{identity:person,signal:controller.signal,keepalive})).catch(()=>{if(!disposed&&generation===epoch&&inflight===entry){lastSignature=null;retryAt=now()+5000;queued=true;}}).finally(()=>{cancel(entry.timeout);if(inflight===entry){inflight=null;if(queued&&!disposed)sample();}});
 }
 return{sample,action(event){
  if(disposed||!['pointerdown','keydown','wheel'].includes(event?.type)||event.isTrusted!==true||event.repeat||event.isPrimary===false||event.button!=null&&event.button!==0||getView()?.visible!==true||!current())return false;
  if(actionSequence>=MAX_SEQUENCE){reset(identity);}
  actionSequence++;lastAction=now();sample();return true;
 },dispose(){if(disposed)return;reset(null);disposed=true;}};
}
