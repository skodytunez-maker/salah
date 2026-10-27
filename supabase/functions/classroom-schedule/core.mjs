import{TEACHER_ADMIN_ACTIONS,teacherAdmin}from './teacher-roles-core.mjs';
import{localTimestamp,validLocalTime,shiftDay}from '../../../dist/js/reminder-events.js';
export const CLASSROOM_OWNER='dc1eb1cc-6f8f-472f-a937-735fbfbba4b7';
export const CLASSROOM_ORIGINS=new Set(['https://skodytunez-maker.github.io','https://desktop-jecm5lt.taila4556d.ts.net']);
const opaque=/^[A-Za-z0-9_-]{32}$/,uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export class ScheduleError extends Error{constructor(status,message){super(message);this.status=status;}}
const fail=(status,message)=>{throw new ScheduleError(status,message);};
const text=(value,max,label)=>{if(typeof value!=='string'||!value.trim()||value.trim().length>max||/[\x00-\x1f]/.test(value))fail(400,'Проверьте '+label+'.');return value.trim();};
export const inviteDigest=async code=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(code))),b=>b.toString(16).padStart(2,'0')).join('');
export function lessonSchedule(input,now){
 const title=text(input.title,100,'тему урока'),teacherName=text(input.teacherName,48,'имя преподавателя'),timeZone=text(input.timeZone,80,'часовой пояс');
 const date=input.date,time=input.time,reminderTime=input.reminderTime||'17:00',minutes=input.minutes,maxParticipants=input.maxParticipants??10;
 if(!shiftDay(date,0)||!validLocalTime(time)||!validLocalTime(reminderTime)||![30,45,60,90].includes(minutes)||!Number.isInteger(maxParticipants)||maxParticipants<2||maxParticipants>10)fail(400,'Проверьте дату, время, длительность и количество участников.');
 const startsAt=localTimestamp(date,time,timeZone),reminderAt=localTimestamp(date,reminderTime,timeZone);
 if(!Number.isFinite(startsAt)||!Number.isFinite(reminderAt))fail(400,'Это местное время недоступно. Проверьте часовой пояс.');
 if(startsAt<now+120000||startsAt>now+90*86400000)fail(400,'Выберите начало от двух минут до 90 дней вперёд.');
 if(reminderAt>=startsAt)fail(400,'Напоминание должно быть раньше начала урока.');
 return{title,teacherName,timeZone,date,time,reminderTime,minutes,maxParticipants,startsAt,endsAt:startsAt+minutes*60000,reminderAt};
}
export const publicSchedule=l=>({id:l.id,title:l.title,teacherName:l.teacherName,timeZone:l.timeZone,date:l.date,time:l.time,reminderTime:l.reminderTime,minutes:l.minutes,maxParticipants:l.maxParticipants,startsAt:l.startsAt,endsAt:l.endsAt,reminderAt:l.reminderAt,state:l.state,revision:l.revision,accessMode:'account'});
export function createScheduleHandler({db,verifyAccount,now=Date.now}){
 return async req=>{
  const origin=req.headers.get('Origin'),headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin'};
  if(CLASSROOM_ORIGINS.has(origin)){headers['Access-Control-Allow-Origin']=origin;headers['Access-Control-Allow-Headers']='Authorization, apikey, Content-Type';headers['Access-Control-Allow-Methods']='POST, OPTIONS';}
  const reply=(status,value)=>new Response(JSON.stringify(value),{status,headers});
  try{
   if(origin&&!CLASSROOM_ORIGINS.has(origin))fail(403,'Этот адрес не разрешён.');
   if(req.method==='OPTIONS'){if(!CLASSROOM_ORIGINS.has(origin))fail(403,'Этот адрес не разрешён.');return new Response(null,{status:204,headers});}
   if(req.method!=='POST')fail(405,'Недоступный метод.');
   const bearer=/^Bearer ([A-Za-z0-9._-]{16,8192})$/.exec(req.headers.get('Authorization')||'');if(!bearer)fail(401,'Войдите в аккаунт SALAH.');
   let bytes=0,chunks=[];for await(const chunk of req.body||[]){bytes+=chunk.byteLength;if(bytes>8192)fail(413,'Слишком большой запрос.');chunks.push(chunk);}
   const joined=new Uint8Array(bytes);let pos=0;for(const chunk of chunks){joined.set(chunk,pos);pos+=chunk.length;}
   let input;try{input=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(joined));}catch{fail(400,'Неверный запрос.');}
   if(!input||typeof input!=='object'||Array.isArray(input))fail(400,'Неверный запрос.');
   const action=input.action,adminAction=TEACHER_ADMIN_ACTIONS.includes(action),ownerAction=adminAction||['create','update','transition','owner-list'].includes(action);
   if(![...TEACHER_ADMIN_ACTIONS,'create','update','transition','owner-list','preview','enroll','detail','mine','access','leave','preferences'].includes(action))fail(400,'Неизвестное действие.');
   const actor=await verifyAccount(bearer[1],{ownerRequired:ownerAction});
   if(!uuid.test(actor?.id||''))fail(401,'Войдите в аккаунт SALAH.');
   if(ownerAction&&(actor.id!==CLASSROOM_OWNER||actor.owner!==true))fail(403,'Закрытое расписание доступно владельцу SALAH.');
   if(!await db.rate(actor.id,now()))fail(429,'Подождите минуту и повторите.');
   if(adminAction)return reply(200,await teacherAdmin({action,input,actor,db,ownerId:CLASSROOM_OWNER,fail}));
   if(action==='create'){
    if(!opaque.test(input.id||'')||!opaque.test(input.code||''))fail(400,'Недопустимое приглашение.');
    const schedule=lessonSchedule(input,now()),row={...schedule,id:input.id,ownerId:actor.id,inviteHash:await inviteDigest(input.code),state:'planned',revision:1};
    if(!await db.create(row))fail(409,'Урок уже существует или достигнут лимит расписания.');
    return reply(201,{lesson:publicSchedule(row)});
   }
   if(['mine','owner-list'].includes(action))return reply(200,{lessons:(await db.list(actor.id,action==='owner-list')).map(publicSchedule)});
   let row;if(['preview','enroll'].includes(action)){if(!opaque.test(input.code||''))fail(404,'Приглашение недействительно.');row=await db.byInvite(await inviteDigest(input.code));}
   else{if(!opaque.test(input.id||''))fail(404,'Урок не найден.');row=await db.get(input.id);}
   if(!row)fail(404,'Урок недоступен.');
   const isOwner=actor.id===row.ownerId,enrollment=await db.enrollment(row.id,actor.id);
   if(ownerAction&&!isOwner)fail(403,'Нет доступа к этому уроку.');
   if(!['preview','enroll'].includes(action)&&!isOwner&&!enrollment)fail(403,'Войдите по приглашению преподавателя.');
   if(action==='update'){
    if(row.state!=='planned')fail(409,'Расписание можно изменить до начала урока.');
    const next={...row,...lessonSchedule(input,now()),revision:row.revision+1};
    if(!await db.update(next,row.revision))fail(409,'Расписание уже изменилось. Откройте его заново.');
    return reply(200,{lesson:publicSchedule(next)});
   }
   if(action==='transition'){
    if(!['live','ended','cancelled'].includes(input.state))fail(400,'Недопустимое состояние.');
    if(row.state===input.state)return reply(200,{lesson:publicSchedule(row)});
    if(!((row.state==='planned'&&['live','cancelled'].includes(input.state))||(row.state==='live'&&input.state==='ended')))fail(409,'Этот переход уже недоступен.');
    if(input.state==='live'&&(now()<row.startsAt-15*60000||now()>=row.endsAt))fail(409,'Начать урок можно за 15 минут до указанного времени.');
    const next={...row,state:input.state,revision:row.revision+1};if(!await db.update(next,row.revision))fail(409,'Состояние уже изменилось.');
    return reply(200,{lesson:publicSchedule(next)});
   }
   if(['ended','cancelled'].includes(row.state)||row.endsAt<=now())fail(410,'Урок завершён или отменён.');
   if(action==='leave'){await db.removeEnrollment(row.id,actor.id);return reply(200,{removed:true});}
   let registered=enrollment;
   if(['enroll','preferences'].includes(action)){
    if(typeof input.remindersEnabled!=='boolean')fail(400,'Выберите настройку напоминания.');
    registered=await db.enroll(row,actor.id,text(actor.nickname||'Ученик',40,'ник'),input.remindersEnabled);
    if(!registered)fail(409,'Все ученические места заняты.');
   }
   if(action==='access'&&!registered&&!isOwner)fail(403,'Сначала запишитесь по приглашению.');
   return reply(200,{lesson:publicSchedule(row),account:{id:actor.id,nickname:actor.nickname||'Ученик'},enrolled:Boolean(registered)||isOwner,remindersEnabled:registered?.remindersEnabled===true,owner:isOwner});
  }catch(error){return reply(error instanceof ScheduleError?error.status:503,{error:error instanceof ScheduleError?error.message:'Не удалось проверить урок. Попробуйте ещё раз.'});}
 };
}
