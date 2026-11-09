const periods=['day','week','month','all'];
export function sharedListeningFrame(data,day){
 if(!data||data.day!==day||!Number.isSafeInteger(Number(data.revision))||Number(data.revision)<1||!data.totals)return null;
 const at=typeof data.at==='number'?data.at:Date.parse(data.sampled_at);
 if(!Number.isFinite(at)||periods.some(p=>!Number.isSafeInteger(data.totals[p])||data.totals[p]<0))return null;
 return{day,revision:Number(data.revision),at,totals:Object.fromEntries(periods.map(p=>[p,data.totals[p]]))};
}
export function createSharedFrameStore(){
 let frame=null;
 return{reset(){frame=null},get:()=>frame,accept(data,day){const next=sharedListeningFrame(data,day);if(!next||frame?.day===day&&next.revision<=frame.revision)return false;frame=next;return true;}};
}
// Only measured, changed device counters are posted. This never runs a playback clock.
export function createSharedListeningReporter({getSnapshot,getScope,isEligible,getDay,getDevice,send,now=Date.now,onBaselineNeeded=()=>{}}){
 let scope=null,day=null,previous={},pending=new Map(),inflight=null,lastAt=-Infinity,retryAt=0,baselineAt=-Infinity,generation=0;
 function reset(user,today){generation++;inflight?.abort();inflight=null;scope=user;day=today;previous={};pending.clear();lastAt=-Infinity;retryAt=0;baselineAt=-Infinity;}
 function requestBaseline(){if(now()-baselineAt>=15000){baselineAt=now();onBaselineNeeded();}}
 async function flush(){
  if(inflight||!pending.size||!scope||!isEligible()||now()-lastAt<1000||now()<retryAt)return;
  const rows=[...pending.values()].slice(0,4),controller=new AbortController(),version=generation,timer=setTimeout(()=>controller.abort(),5000);inflight=controller;lastAt=now();rows.forEach(row=>pending.delete(row.reciter));
  try{const result=await send({action:'live-sample',device:getDevice(),day,rows},{signal:controller.signal});
   if(version!==generation)return;
   if(result?.retry)throw Error('retry');if(result?.needsSnapshot)requestBaseline();
  }catch(error){if(version===generation){if(error?.status===400){requestBaseline();return;}if(error?.status===401){retryAt=now()+15000;return;}for(const row of rows){const newer=pending.get(row.reciter);if(!newer||newer.total<row.total)pending.set(row.reciter,row);}retryAt=now()+5000;}}
  finally{clearTimeout(timer);if(inflight===controller)inflight=null;}
 }
 return{
  sample(){
   const user=getScope()||null,today=getDay(),data=getSnapshot()||{},totals=data.totals||{},days=data.days?.[today]||{};
   if(user!==scope||today!==day)reset(user,today);
   const ready=user&&isEligible();
   for(const [reciter,value]of Object.entries(totals)){
    const total=Math.floor(value),dayTotal=Math.floor(days[reciter]||0),prior=previous[reciter];
    if(ready&&prior&&total>prior.total&&dayTotal>=prior.dayTotal&&Number.isSafeInteger(total)&&Number.isSafeInteger(dayTotal))pending.set(reciter,{reciter,total,dayTotal});
    previous[reciter]={total,dayTotal};
   }
   if(!ready){generation++;inflight?.abort();inflight=null;pending.clear();return;}
   void flush();
  },
  flush,
  stop(){reset(null,null)}
 };
}

