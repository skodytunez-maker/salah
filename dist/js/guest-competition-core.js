import{addListeningDay,listeningPeriodTotals}from './reciter-popularity-core.js';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export const guestRankKnown=auth=>auth?.identityKnown===true&&!auth.signedIn&&!auth.userId&&auth.reason!=='auth_unavailable';
export function createGuestCompetitionTracker({getAccount,readState,writeState,send,randomId=()=>crypto.randomUUID(),randomSecret,activityDevice=()=>null,now=Date.now,exclusive=fn=>Promise.resolve().then(fn),changed=()=>{}}){
 let syncing=false,lastSync=0,lastSignature='',retryAt=0;
 const valid=s=>s?.version===1&&uuid.test(s.device||'')&&/^[a-f0-9]{64}$/.test(s.secret||'')&&s.totals&&s.days;
 const read=()=>{try{const s=readState();return valid(s)?s:null;}catch{return null;}};
 const save=s=>{if(!writeState(s))throw Error('storage');return s;};
 const create=()=>({version:1,device:randomId(),secret:randomSecret(),activity:activityDevice(),id:null,enrolled:false,claimedBy:null,totals:{},days:{}});
 const update=(device,mutate)=>exclusive(()=>{const s=read();if(!s||s.device!==device)return null;return save(mutate(s));});
 const snapshot=s=>({totals:Object.fromEntries(Object.entries(s.totals).map(([id,n])=>[id,Math.floor(n)])),days:Object.fromEntries(Object.entries(s.days).map(([day,rows])=>[day,Object.fromEntries(Object.entries(rows).map(([id,n])=>[id,Math.floor(n)]))])),timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC'});
 return{
  async progress(id,seconds,at=now()){
   if(!guestRankKnown(getAccount())||!Number.isFinite(seconds)||seconds<=0||seconds>43200)return false;
   return exclusive(()=>{if(!guestRankKnown(getAccount()))return false;const s=read();if(!s?.enrolled||s.claimedBy)return false;
    s.totals[id]=(s.totals[id]||0)+seconds;addListeningDay(s.days,id,seconds,at);save(s);return true;});
  },
  own(period='all'){const s=read();if(!guestRankKnown(getAccount())||!s?.enrolled||s.claimedBy||!uuid.test(s.id||''))return null;return{id:s.id,enabled:true,mode:'profile',guest:true,totals:period==='all'?s.totals:listeningPeriodTotals(s,period)};},
  async sync({force=false}={}){
   if(syncing||now()<retryAt||!force&&now()-lastSync<15000)return;const auth=getAccount();if(!auth?.identityKnown||auth.reason==='auth_unavailable')return;syncing=true;
   try{
    let s=read();
    if(guestRankKnown(auth)){
     if(!s||s.claimedBy)s=await exclusive(()=>{const latest=read();return latest&&!latest.claimedBy?latest:save(create());});
     if(!s.enrolled){
      const result=await send({action:'register',device:s.device,secret:s.secret,activity:s.activity});
      if(result.claimed){await update(s.device,latest=>({...latest,claimedBy:'previous'}));return;}
      if(!uuid.test(result.id||''))throw Error('invalid');
      await update(s.device,latest=>({...latest,enrolled:true,id:result.id}));lastSync=now();changed();return;
     }
     const body=snapshot(s),signature=JSON.stringify(body);if(!force&&signature===lastSignature)return;
     await send({action:'snapshot',device:s.device,secret:s.secret,...body});lastSignature=signature;lastSync=now();changed();return;
    }
    if(auth.signedIn&&auth.userId&&s?.enrolled&&!s.claimedBy){
     try{await send({action:'snapshot',device:s.device,secret:s.secret,...snapshot(s)});}catch(error){if(error.status!==409)throw error;}
     if(!getAccount().signedIn||getAccount().userId!==auth.userId)return;
     await send({action:'claim',device:s.device,secret:s.secret},{userId:auth.userId});
     await update(s.device,latest=>({...latest,claimedBy:auth.userId}));lastSync=now();lastSignature='';changed();
    }
   }catch{retryAt=now()+15000;}finally{syncing=false;}
  }
 };
}
