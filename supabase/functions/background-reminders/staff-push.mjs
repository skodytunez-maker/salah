const STAFF_PUSH_UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function staffPushEvent(row,now){
 const at=Number(row?.at);
 if(!['web','android'].includes(row?.platform)||![row.id,row.user_id,row.message_id,row.room_id].every(x=>STAFF_PUSH_UUID.test(x||''))||!Number.isFinite(at)||at>now||now-at>=86400000)return null;
 return{kind:'staff',hash:'staff-'+row.message_id,messageId:row.message_id,thread:row.room_id,user:row.user_id,at,message:'Новое сообщение команды'};
}
export async function dispatchStaffPush({db,send,sender,clock}){
 if(!db.staffPushEvents)return 0;
 const started=clock(),rows=await db.staffPushEvents(),results={sent:0};let cursor=0;
 await Promise.all(Array.from({length:Math.min(4,rows.length)},async()=>{while(cursor<rows.length&&clock()-started<20000){
  const row=rows[cursor++],event=staffPushEvent(row,clock());if(!event||row.platform==='android'&&!sender)continue;
  if(!await db.staffPushActive(row.id,row.message_id)||!await db.staffPushClaim(row.id,row.message_id,clock()))continue;
  if(!await db.staffPushActive(row.id,row.message_id)){await db.staffPushComplete(row.id,row.message_id,'expired');continue;}
  let result;try{result=row.platform==='web'?await send(row,event):await sender(row,{kind:'staff',thread:event.thread,messageId:event.messageId,at:event.at});}catch{result='retry';}
  await db.staffPushComplete(row.id,row.message_id,result);if(result==='expired')await db.staffPushExpire(row.id);if(result==='sent')results.sent++;
 }}));return results.sent;
}
