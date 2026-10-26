const CLASSROOM_ID=/^[\w-]{32}$/;
export function classroomPushEvent(row,now){
 const at=Number(row?.at),startsAt=Number(row?.starts_at);
 if(!/^[0-9a-f-]{36}$/i.test(row?.user_id||'')||!CLASSROOM_ID.test(row?.lesson_id||'')||!Number.isFinite(at)||!Number.isFinite(startsAt)||at>now||now-at>=300000||startsAt<=now||typeof row.title!=='string'||row.title.length>100||!Number.isInteger(row.revision))return null;
 let time;try{time=new Intl.DateTimeFormat('ru-RU',{timeZone:row.time_zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(startsAt);}catch{return null;}
 return{kind:'classroom',user:row.user_id,hash:'classroom-'+Array.from(row.lesson_id,c=>c.charCodeAt(0).toString(16)).join('')+'-'+at.toString(16),at,startsAt,lessonId:row.lesson_id,revision:row.revision,message:'Сегодня в '+time+' занятие: '+row.title};
}
export async function dispatchClassroomPush({db,send,clock}){
 if(!db.classroomEvents||!db.classroomActive)return 0;
 let sent=0,cursor=0;const started=clock(),rows=await db.classroomEvents(started);
 await Promise.all(Array.from({length:Math.min(8,rows.length)},async()=>{while(cursor<rows.length&&clock()-started<15000){const row=rows[cursor++],event=classroomPushEvent(row,clock());if(!event||!await db.classroomActive(row.id,event.lessonId,event.revision))continue;
  if(!await db.claim(row.id,event.hash,event.at,clock()))continue;
  if(!await db.classroomActive(row.id,event.lessonId,event.revision)){await db.complete(row.id,event.hash,'retry');continue;}
  const result=await send(row,event);await db.complete(row.id,event.hash,result);if(result==='sent')sent++;
 }}));return sent;
}
