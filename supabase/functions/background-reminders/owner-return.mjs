import {returnRecipientReady,ownerReturnNotice} from '../../../dist/js/owner-return-core.js';
export async function dispatchOwnerReturns({db,send,clock=Date.now}){
 if(!db.ownerReturnJobs)return 0;
 const began=clock(),jobs=await db.ownerReturnJobs(began);let sent=0;
 for(const candidate of jobs.slice(0,100)){
  if(clock()-began>=20000)break;
  const claim=await db.ownerReturnClaim(candidate.id,clock());if(!claim)continue;
  const current=await db.ownerReturnActive(candidate.id,claim.token,clock());
  if(!returnRecipientReady(current,clock())){await db.ownerReturnComplete(candidate.id,claim.token,'skipped',clock());continue;}
  const notice=ownerReturnNotice(current,clock());let result;
  try{result=await send(current,notice);}catch{result='retry';}
  await db.ownerReturnComplete(candidate.id,claim.token,['sent','expired'].includes(result)?result:'retry',clock());if(result==='sent')sent++;
 }
 return sent;
}
