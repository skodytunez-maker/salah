export async function dispatchNativeSupportPush({db,sender,clock=Date.now}){
 if(!sender||!db.nativeSupportEvents||!db.nativeSupportActive)return 0;
 const started=clock(),rows=await db.nativeSupportEvents(started);let cursor=0,sent=0;
 await Promise.all(Array.from({length:Math.min(8,rows.length)},async()=>{while(cursor<rows.length&&clock()-started<20000){
  const row=rows[cursor++];
  if(!await db.nativeSupportActive(row.id,row.message_id)||!await db.nativeSupportClaim(row.id,row.message_id,clock()))continue;
  const result=await sender(row,{thread:row.thread_id,messageId:row.message_id,at:Number(row.at)});
  await db.nativeSupportComplete(row.id,row.message_id,result);
  if(result==='sent')sent++;if(result==='expired')await db.nativeSupportExpire(row.id);
 }}));return sent;
}
