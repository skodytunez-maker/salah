import{addListeningDay,listeningPeriodTotals}from './reciter-popularity-core.js';
import{createCompetitionFastProgress}from './competition-fast-progress.js';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export const guestRankKnown=auth=>auth?.identityKnown===true&&!auth.signedIn&&!auth.userId&&auth.reason!=='auth_unavailable';
export function createGuestCompetitionTracker({getAccount,readState,writeState,send,randomId=()=>crypto.randomUUID(),randomSecret,activityDevice=()=>null,now=Date.now,exclusive=fn=>Promise.resolve().then(fn),networkExclusive=fn=>Promise.resolve().then(fn),changed=()=>{},credit=null,fastOptions={}}){
 let syncing=false,lastSync=0,lastSignature='',retryAt=0,fastAvailable=false,api;
 const valid=s=>s?.version===1&&uuid.test(s.device||'')&&/^[a-f0-9]{64}$/.test(s.secret||'')&&s.totals&&s.days;
 const read=()=>{try{const s=readState();return valid(s)?s:null;}catch{return null;}};
 const save=s=>{if(!writeState(s))throw Error('storage');return s;};
 const create=()=>({version:1,device:randomId(),secret:randomSecret(),activity:activityDevice(),id:null,enrolled:false,claimedBy:null,totals:{},days:{}});
 const update=(device,mutate)=>exclusive(()=>{const s=read();if(!s||s.device!==device)return null;return save(mutate(s));});
 const snapshot=s=>{const resumeCredit=credit?.resumeToken('guest:'+s.device);return{totals:Object.fromEntries(Object.entries(s.totals).map(([id,n])=>[id,Math.floor(n)])),days:Object.fromEntries(Object.entries(s.days).map(([day,rows])=>[day,Object.fromEntries(Object.entries(rows).map(([id,n])=>[id,Math.floor(n)]))])),timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC',...(resumeCredit?{resumeCredit}:{})};};
 const cleanRows=rows=>Object.fromEntries(Object.entries(rows||{}).filter(([key,value])=>typeof key==='string'&&key!=='__proto__'&&Number.isSafeInteger(value)&&value>=0));
 const friendlyName=value=>typeof value==='string'&&value.startsWith('Гость · ')&&value.length<=64?value:'Гость';
 const receive=async(s,result,raw,{guard=()=>true,requireAnchors=false}={})=>{const nickname=friendlyName(result?.nickname),hasCredit=!!(result?.creditTotals&&result?.creditDays),hasControl=typeof result?.creditPaused==='boolean',revision=Number.isSafeInteger(result?.creditRevision)&&result.creditRevision>=0?result.creditRevision:null,explicitRaw=result?.rawTotals&&typeof result.rawTotals==='object'&&!Array.isArray(result.rawTotals)&&result?.rawDays&&typeof result.rawDays==='object'&&!Array.isArray(result.rawDays);if(requireAnchors&&hasCredit&&!explicitRaw)return false;if(!hasCredit&&!hasControl&&nickname==='Гость')return true;let accepted=true;
  const saved=await update(s.device,latest=>{if(!guard()){accepted=false;return latest;}const named=nickname!=='Гость'?{...latest,nickname}:latest;if(!hasCredit&&!hasControl)return named;
   const control={creditPaused:result.creditPaused,creditPauseToken:result.creditPauseToken,resumeCredit:raw?.resumeCredit},view=hasCredit?{totals:cleanRows(result.creditTotals),days:Object.fromEntries(Object.entries(result.creditDays).filter(([day])=>/^\d{4}-\d{2}-\d{2}$/.test(day)).map(([day,rows])=>[day,cleanRows(rows)])),rawTotals:explicitRaw?cleanRows(result.rawTotals):{...(raw?.totals||s.totals)},rawDays:explicitRaw?Object.fromEntries(Object.entries(result.rawDays).filter(([day])=>/^\d{4}-\d{2}-\d{2}$/.test(day)).map(([day,rows])=>[day,cleanRows(rows)])):structuredClone(raw?.days||s.days),paused:result.creditPaused===true}:null;
   const signature=JSON.stringify({control,view}),previous=Number.isSafeInteger(latest.creditRevision)?latest.creditRevision:null;
   // Serialize the control and its exact raw/credited pair with the guest ledger.
   // An unversioned legacy reply may bootstrap once, never replace ordered state.
   const stale=revision===null?(previous!==null||!!latest.creditResponseSignature&&signature!==latest.creditResponseSignature):previous!==null&&(revision<previous||revision===previous&&signature!==latest.creditResponseSignature);
   if(stale){accepted=false;if(latest.creditControl)credit?.receive('guest:'+s.device,latest.creditControl,{resumeCredit:latest.creditControl.resumeCredit,confirmed:previous!==null});return named;}
   credit?.receive('guest:'+s.device,control,{resumeCredit:control.resumeCredit,confirmed:revision!==null});
   return{...named,...(revision!==null?{creditRevision:revision}:{}),creditResponseSignature:signature,creditControl:control,...(view?{serverCredit:view}:{})};
  });return accepted&&!!saved;};
 const credited=s=>{const view=s.serverCredit;if(!view)return s;const rawComplete=view.rawTotals&&typeof view.rawTotals==='object'&&view.rawDays&&typeof view.rawDays==='object',days=view.days&&typeof view.days==='object'?view.days:{};
  const merge=(current,base,raw={})=>{const rows=cleanRows(base);if(!view.paused&&rawComplete)for(const[id,n]of Object.entries(current))rows[id]=(rows[id]||0)+Math.max(0,n-(raw[id]||0));return rows;};return{...s,totals:merge(s.totals,view.totals,view.rawTotals),days:Object.fromEntries([...new Set([...Object.keys(s.days),...Object.keys(days)])].map(day=>[day,merge(s.days[day]||{},days[day],view.rawDays?.[day])]))};};
 const fullRequest=(body,options)=>networkExclusive(()=>send(body,options));
 const fast=createCompetitionFastProgress({getContext:()=>{const s=read();return{scope:s?'guest:'+s.device:null,enabled:guestRankKnown(getAccount())&&s?.enrolled===true&&!s.claimedBy,online:fastOptions.online?fastOptions.online():true,timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC'};},now:fastOptions.now||(()=>globalThis.performance?.now?.()??now()),schedule:fastOptions.schedule||setTimeout,cancel:fastOptions.cancel||clearTimeout,
  requestFull:()=>Promise.resolve().then(()=>api.sync({force:true})),
  send:(body,options)=>networkExclusive(async()=>{const s=read(),valid=()=>guestRankKnown(getAccount())&&read()?.device===s?.device&&!read()?.claimedBy&&!options.signal.aborted;if(!s||!valid()||options.scope!=='guest:'+s.device)throw Error('changed');
   if(s.creditControl?.creditPaused===true||credit?.paused?.('guest:'+s.device)===true)return{ok:true,accepted:false,needsFull:true,creditPaused:true};
   const revision=Number.isSafeInteger(s.creditRevision)&&s.creditRevision>=0?s.creditRevision:null,packet={...body,device:s.device,secret:s.secret,...(revision!==null?{creditRevision:revision}:{})};
   const result=await send(packet,{signal:options.signal,keepalive:options.keepalive});if(!valid())throw Error('changed');
   if(result?.accepted===true&&result?.needsFull===false&&result?.creditPaused!==true){
    // A matching revision proves the old raw/credited offset is unchanged.
    // Persist only its watermark; the full paired view stays exactly as it was.
    const next=Number.isSafeInteger(result.creditRevision)&&result.creditRevision>=0?result.creditRevision:null;let accepted=true;
    if(revision!==null||next!==null)await update(s.device,latest=>{const previous=Number.isSafeInteger(latest.creditRevision)?latest.creditRevision:null;if(!valid()||revision===null||next===null||previous!==revision||next<revision){accepted=false;return latest;}return next===previous?latest:{...latest,creditRevision:next};});
    return accepted?result:{ok:true,accepted:false,needsFull:true};
   }
   if(result?.creditTotals&&result?.creditDays)await receive(s,result,null,{guard:valid,requireAnchors:true});return result;
  }),
 });
 const fullSnapshot=async(s,body)=>{const token=fast.beginFull();try{return await networkExclusive(async()=>{const result=await send({action:'snapshot',device:s.device,secret:s.secret,...body});const applied=await receive(s,result,body);fastAvailable=fastAvailable||result.progressVersion===1;if(applied||result.progressVersion!==1)fast.acknowledgeFull(token,body,result);else fast.failFull(token);return result;});}catch(error){if(fastAvailable)fast.failFull(token);else fast.acknowledgeFull(token,body,{ok:true});throw error;}};
 api={
  async progress(id,seconds,at=now(),{final=false}={}){
   fast.refresh();if(!guestRankKnown(getAccount())||!Number.isFinite(seconds)||seconds<=0||seconds>43200)return false;
   const saved=await exclusive(()=>{if(!guestRankKnown(getAccount()))return false;const s=read();if(!s?.enrolled||s.claimedBy)return false;
    s.totals[id]=(s.totals[id]||0)+seconds;addListeningDay(s.days,id,seconds,at);save(s);return true;});const latest=read();if(saved&&fastAvailable&&latest?.enrolled&&!latest.claimedBy&&guestRankKnown(getAccount()))fast.sample(snapshot(latest),{final});return saved;
  },
  own(period='all'){const s=read();if(!guestRankKnown(getAccount())||!s?.enrolled||s.claimedBy||!uuid.test(s.id||''))return null;const visible=credited(s);return{id:s.id,nickname:friendlyName(s.nickname),enabled:true,mode:'profile',guest:true,totals:period==='all'?visible.totals:listeningPeriodTotals(visible,period)};},
  async sync({force=false}={}){
   fast.refresh();
   if(syncing||now()<retryAt||!force&&now()-lastSync<15000)return;const auth=getAccount();if(!auth?.identityKnown||auth.reason==='auth_unavailable')return;syncing=true;
   try{
    let s=read();
    if(guestRankKnown(auth)){
     if(!s||s.claimedBy)s=await exclusive(()=>{const latest=read();return latest&&!latest.claimedBy?latest:save(create());});
     if(!s.enrolled){
      const result=await fullRequest({action:'register',device:s.device,secret:s.secret,activity:s.activity});fastAvailable=fastAvailable||result.progressVersion===1;
      await receive(s,result);
      if(result.claimed){await update(s.device,latest=>({...latest,claimedBy:'previous'}));return;}
      if(!uuid.test(result.id||''))throw Error('invalid');
      await update(s.device,latest=>({...latest,enrolled:true,id:result.id}));lastSync=now();changed();return;
     }
     const body=snapshot(s),signature=JSON.stringify(body);if(!force&&signature===lastSignature)return;
     await fullSnapshot(s,body);lastSignature=signature;lastSync=now();changed();return;
    }
    if(auth.signedIn&&auth.userId&&s?.enrolled&&!s.claimedBy){
     try{const body=snapshot(s);await fullSnapshot(s,body);}catch(error){if(error.status!==409)throw error;}
     if(!getAccount().signedIn||getAccount().userId!==auth.userId)return;
     await fullRequest({action:'claim',device:s.device,secret:s.secret},{userId:auth.userId});
     await update(s.device,latest=>({...latest,claimedBy:auth.userId}));lastSync=now();lastSignature='';changed();
    }
   }catch{retryAt=now()+15000;}finally{syncing=false;}
  },
  fastSample({final=false}={}){fast.refresh();const s=read();if(fastAvailable&&s?.enrolled&&!s.claimedBy)fast.sample(snapshot(s),{final});},
  dispose(){fast.dispose();},
 };return api;
}
