const SUPPORT_UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function supportPushEvent(row,now){
 const at=Number(row?.at);
 if(!SUPPORT_UUID.test(row?.message_id||'')||!SUPPORT_UUID.test(row?.thread_id||'')||!Number.isFinite(at)||at>now||now-at>=86400000)return null;
 return {kind:'support',hash:'support-'+row.message_id,at,message:'Новое сообщение поддержки',thread:row.thread_id,messageId:row.message_id};
}
export async function dispatchSupportPush({db,send,clock}){
 if(!db.supportEvents||!db.supportActive)return 0;
 const started=clock(),rows=await db.supportEvents(started);let cursor=0,sent=0;
 await Promise.all(Array.from({length:Math.min(8,rows.length)},async()=>{while(cursor<rows.length&&clock()-started<20000){
  const row=rows[cursor++],event=supportPushEvent(row,clock());if(!event||!SUPPORT_UUID.test(row.id||''))continue;
  if(!await db.supportActive(row.id,event.messageId)||!await db.claim(row.id,event.hash,event.at,clock()))continue;
  const result=await send(row,event);await db.complete(row.id,event.hash,result);if(result==='sent')sent++;
 }}));return sent;
}
