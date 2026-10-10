const COMPETITION_EVENT_ID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export function competitionPushEvent(row,now){
 const at=Number(row?.at),place=Number(row?.new_place),old=Number(row?.old_place);if(!COMPETITION_EVENT_ID.test(row?.event_id||'')||!['day','week','month','all'].includes(row?.period)||!Number.isSafeInteger(place)||!Number.isSafeInteger(old)||place<=old||old<1||!Number.isFinite(at)||at>now||now-at>=3600000)return null;
 return{kind:'competition',hash:'competition-'+row.event_id,eventId:row.event_id,period:row.period,at,message:'Вас обошли в Топ SALAH. Теперь у вас '+place+' место. Не забывай о намерении.'};
}
export async function dispatchCompetitionPush({db,send,clock}){
 if(!db.competitionEvents)return 0;const started=clock(),rows=await db.competitionEvents(started);let cursor=0,sent=0;
 await Promise.all(Array.from({length:Math.min(4,rows.length)},async()=>{while(cursor<rows.length&&clock()-started<20000){const row=rows[cursor++],event=competitionPushEvent(row,clock());if(!event||!COMPETITION_EVENT_ID.test(row.id||''))continue;
 if(!await db.competitionActive(row.id,event.eventId)||!await db.competitionClaim(row.id,event.eventId,clock()))continue;
 let result;try{result=await send(row,event);}catch{result='retry';}await db.competitionComplete(row.id,event.eventId,result);if(result==='sent')sent++;
 }}));return sent;
}
