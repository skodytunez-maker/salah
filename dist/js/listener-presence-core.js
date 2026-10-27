// No visit times, minute counters or persistent identifiers are used for this signal.
export function createPlaybackPresenceReporter({getState,getUserId,isEligible,send,now=Date.now,randomId=()=>crypto.randomUUID(),Controller=AbortController,schedule=setTimeout,cancel=clearTimeout}){
 let scope=null,tab=null,sequence=0,previous=null,forwardAt=-Infinity,posted=null,lastAt=0,retryAt=0,ever=false,inflight=null,epoch=0,disposed=false;
 function resetScope(user){epoch++;if(inflight){inflight.controller.abort();cancel(inflight.timer);}inflight=null;scope=user;tab=user?randomId():null;sequence=0;previous=null;forwardAt=-Infinity;posted=null;lastAt=retryAt=0;ever=false;}
 function post(playing,{keepalive=false}={}){
  if(!scope||disposed||(!playing&&!ever)||playing&&now()<retryAt)return;
  if(inflight?.playing===playing)return;
  if(inflight){inflight.controller.abort();cancel(inflight.timer);}
  const controller=new Controller(),entry={controller,playing,timer:null},generation=epoch;
  entry.timer=schedule(()=>controller.abort(),5000);inflight=entry;posted=playing;lastAt=now();ever=true;
  const packet={action:'presence',tab,sequence:++sequence,playing};
  void Promise.resolve().then(()=>send(packet,{signal:controller.signal,keepalive})).catch(()=>{if(!disposed&&generation===epoch&&inflight===entry){posted=null;retryAt=now()+5000;}}).finally(()=>{cancel(entry.timer);if(inflight===entry)inflight=null;});
 }
 function sample({force=false}={}){
  if(disposed)return;const user=getUserId()||null;if(user!==scope)resetScope(user);
  const state=getState()||{},time=now(),position=Number(state.trackPositionSeconds??state.positionSeconds),key=String(state.reciter||'')+':'+String(state.surah?.number||state.recordingId||'')+':'+String(state.seekRevision||0);
  if(state.status!=='playing'||!state.reciter||!Number.isFinite(position))forwardAt=-Infinity;
  else if(previous?.key===key&&previous.playing){const elapsed=(time-previous.time)/1000,delta=position-previous.position;if(elapsed>0&&delta>0&&delta<=elapsed*4+1)forwardAt=time;else if(delta<0||elapsed<0)forwardAt=-Infinity;}
  else forwardAt=-Infinity;
  previous={key,position,time,playing:state.status==='playing'};
  const playing=Boolean(user&&isEligible()&&state.status==='playing'&&time-forwardAt<20000);
  if(playing!==posted||inflight&&inflight.playing!==playing||playing&&(force||time-lastAt>=15000))post(playing);
 }
 function stop({keepalive=false}={}){if(disposed)return;forwardAt=-Infinity;previous=null;if(posted!==false||inflight?.playing)post(false,{keepalive});}
 return{sample,stop,dispose(){stop({keepalive:true});disposed=true;epoch++;}};
}
