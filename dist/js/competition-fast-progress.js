// Transport only: every value comes from an already-metered cumulative snapshot.
// The clock schedules requests; it never creates listening seconds.
const record=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const safeKey=key=>typeof key==='string'&&key.length<=100&&!['__proto__','prototype','constructor'].includes(key);
function snapshotOf(value){
 if(!record(value)||!record(value.totals)||!record(value.days)||Object.keys(value.totals).length>160||Object.keys(value.days).length>94)return null;
 const totals={},days={};
 for(const[key,n]of Object.entries(value.totals)){if(!safeKey(key)||!Number.isFinite(n)||n<0||n>315360000)return null;totals[key]=Math.floor(n);}
 for(const[day,rows]of Object.entries(value.days)){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!record(rows)||Object.keys(rows).length>160)return null;
  let sum=0;const target={};for(const[key,n]of Object.entries(rows)){if(!safeKey(key)||!Number.isFinite(n)||n<0||n>86400||!Object.hasOwn(totals,key))return null;target[key]=Math.floor(n);sum+=target[key];if(target[key]>totals[key])return null;}if(sum>86400)return null;days[day]=target;
 }
 return{totals,days};
}
function changed(base,latest,timeZone){
 const totals={},days={},reciters=new Set();
 for(const[key,n]of Object.entries(base.totals))if((latest.totals[key]??-1)<n)return{needsFull:true};
 for(const[day,rows]of Object.entries(base.days))for(const[key,n]of Object.entries(rows))if((latest.days[day]?.[key]??-1)<n)return{needsFull:true};
 for(const[key,n]of Object.entries(latest.totals))if(n>(base.totals[key]||0)){totals[key]=n;reciters.add(key);}
 for(const[day,rows]of Object.entries(latest.days))for(const[key,n]of Object.entries(rows))if(n>(base.days[day]?.[key]||0)){(days[day]??={})[key]=n;totals[key]=latest.totals[key];reciters.add(key);}
 // Lifetime and daily fractions can cross integer boundaries separately.
 // Include an existing measured anchor, including zero, instead of an empty
 // days map or a synthetic daily increment.
 const measuredDays=Object.keys(latest.days).sort().reverse();
 for(const key of reciters)if(!Object.values(days).some(rows=>Object.hasOwn(rows,key))){const day=measuredDays.find(value=>Object.hasOwn(latest.days[value],key));if(day===undefined)return{needsFull:true};(days[day]??={})[key]=latest.days[day][key];}
 if(reciters.size>4||Object.keys(days).length>2)return{needsFull:true};
 return reciters.size?{body:{action:'progress',totals,days,timeZone}}:{};
}
export function createCompetitionFastProgress({getContext,send,onResult=()=>true,requestFull=()=>{},now=()=>globalThis.performance?.now?.()??Date.now(),schedule=setTimeout,cancel=clearTimeout}={}){
 let currentKey=null,epoch=0,serial=0,baseline=null,latest=null,full=null,inflight=null,timer=null,lastSent=-Infinity,retryAt=0,lastFullRequest=-Infinity,capability='unknown',wantedFull=false,finalPending=false,disposed=false;
 const stopTimer=()=>{if(timer!==null)cancel(timer);timer=null;};
 const stopRequestTimer=entry=>{if(entry.timeout!==null)cancel(entry.timeout);entry.timeout=null;};
 // An aborted fetch may settle on a later microtask. Keep its slot occupied
 // until then, even if a complete newer baseline is already acknowledged.
 const invalidate=()=>{epoch++;stopTimer();if(inflight){stopRequestTimer(inflight);inflight.controller.abort();}baseline=null;full=null;};
 function context(){let raw;try{raw=getContext();}catch{}const scope=typeof raw?.scope==='string'&&raw.scope.length<=240?raw.scope:null,timeZone=typeof raw?.timeZone==='string'&&raw.timeZone.length<=100?raw.timeZone:null,enabled=raw?.enabled===true,online=raw?.online===true;const key=scope&&timeZone?JSON.stringify([scope,timeZone,enabled,online]):null;
  if(key!==currentKey){invalidate();currentKey=key;latest=null;lastSent=retryAt=lastFullRequest=-Infinity;capability='unknown';wantedFull=false;finalPending=false;}
  return{key,scope,timeZone,active:!!key&&enabled&&online};
 }
 const current=(entry,ctx=context())=>!disposed&&ctx.active&&entry.epoch===epoch&&entry.key===ctx.key;
 const alive=entry=>current(entry)&&!entry.controller.signal.aborted;
 function askFull(reason){
  const ctx=context();if(disposed||!ctx.active||full||!wantedFull)return;
  const wait=Math.max(retryAt,lastFullRequest+15000)-now();if(wait>0){stopTimer();timer=schedule(()=>{timer=null;askFull(reason);},wait);return;}
  wantedFull=false;lastFullRequest=now();try{Promise.resolve(requestFull(reason)).catch(()=>{});}catch{}
 }
 function requireFull(reason,{backoff=false}={}){invalidate();capability='unknown';wantedFull=true;if(backoff)retryAt=now()+15000;askFull(reason);}
 function pump(){
  const ctx=context();if(disposed||!ctx.active||inflight||full)return;
  if(!baseline){if(wantedFull)askFull('baseline');return;}
  if(!latest)return;const delta=changed(baseline,latest,ctx.timeZone);
  if(delta.needsFull){requireFull('changed-bucket-limit-or-reset');return;}if(!delta.body){finalPending=false;return;}
  const wait=Math.max(lastSent+1000,retryAt)-now();if(wait>0){stopTimer();timer=schedule(()=>{timer=null;pump();},wait);return;}
  stopTimer();lastSent=now();const controller=new AbortController(),entry={epoch,key:ctx.key,scope:ctx.scope,controller,snapshot:latest,timeout:null,final:finalPending};finalPending=false;inflight=entry;entry.timeout=schedule(()=>controller.abort(),10000);
  void Promise.resolve().then(()=>{if(!alive(entry))throw Error('cancelled');return send(delta.body,{signal:controller.signal,scope:entry.scope,snapshot:entry.snapshot,keepalive:entry.final});}).then(async reply=>{
   if(!current(entry))return;if(!alive(entry)){requireFull('timeout',{backoff:true});return;}const applied=await onResult(reply,{scope:entry.scope,snapshot:entry.snapshot,signal:controller.signal});if(!current(entry))return;if(!alive(entry)){requireFull('timeout',{backoff:true});return;}
   if(applied===false||reply?.ok!==true||reply.accepted!==true||reply.needsFull===true||reply.creditPaused===true){requireFull('server-needs-full');return;}
   baseline=entry.snapshot;
  }).catch(error=>{if(current(entry))requireFull(error?.status===400||error?.status===404?'unsupported':'network',{backoff:true});}).finally(()=>{stopRequestTimer(entry);if(inflight===entry){inflight=null;pump();}});
 }
 return{
  beginFull(){const ctx=context();if(disposed||!ctx.active)return null;invalidate();capability='unknown';wantedFull=false;const token=Object.freeze({id:++serial,epoch,key:ctx.key});full=token;return token;},
  acknowledgeFull(token,snapshot,reply){const ctx=context();if(disposed||!token||full!==token||token.epoch!==epoch||token.key!==ctx.key||!ctx.active)return false;full=null;const source=snapshotOf(snapshot);wantedFull=false;
   if(!source||reply?.ok!==true){baseline=null;capability='unknown';return false;}
   if(reply.progressVersion!==1||reply.creditPaused===true){baseline=null;capability=reply.creditPaused===true?'paused':'unsupported';return false;}
   if(reply.accepted!==true||reply.needsFull===true){baseline=null;capability='unknown';wantedFull=true;retryAt=now()+15000;askFull('full-not-accepted');return false;}
   baseline=source;capability='yes';if(!latest||changed(source,latest,ctx.timeZone).needsFull)latest=source;pump();return true;
  },
  failFull(token){if(full!==token||!token)return;full=null;baseline=null;capability='unknown';wantedFull=true;retryAt=now()+15000;askFull('full-failed');},
  sample(snapshot,{final=false}={}){const ctx=context();if(disposed||!ctx.active)return false;const source=snapshotOf(snapshot);if(!source){requireFull('invalid-snapshot');return false;}latest=source;finalPending=finalPending||final;
   if(!baseline&&!full&&capability==='unknown')wantedFull=true;pump();return true;
  },
  refresh(){context();pump();},
  dispose(){if(disposed)return;disposed=true;invalidate();latest=null;wantedFull=false;},
 };
}
