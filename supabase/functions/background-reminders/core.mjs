import{dispatchSupportPush}from './support-push.mjs';
import {dhikrTimestamp,dhikrAllowedAt} from '../../../dist/js/dhikr-reminder.js';
import {buildReminderEvents,normalizeReminders,PRAYER_KEYS,validLocalTime,localTimestamp,shiftDay} from '../../../dist/js/reminder-events.js';

import {TYUMEN_SOURCES,normalizeTyumenSource,tyumenSourceFiles,matchesTyumenSource} from '../../../dist/js/tyumen-source.js';
import {mergeFirstAsr,firstAsrValid} from '../../../dist/js/asr-first.js';

export const PUSH_ORIGIN='https://skodytunez-maker.github.io';
export const PUBLIC_APP=PUSH_ORIGIN+'/salah/';
export const SETUP_INVITE={hash:'setup-invite-20261005',from:Date.parse('2026-10-05T17:00:00Z'),until:Date.parse('2026-10-06T17:00:00Z'),message:'В SALAH есть уведомления о намазах и Джума. Откройте Настройки → Азан и напоминания и выберите нужные уведомления.'};
const DAY_MS=86400000;
export class PushError extends Error {constructor(status,message){super(message);this.status=status;}}
const fail=(status,message)=>{throw new PushError(status,message);};
const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
export async function digest(value){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),n=>n.toString(16).padStart(2,'0')).join('');}
export function credentials(body){
 if(!object(body)||typeof body.id!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(body.id)||typeof body.token!=='string'||!/^[a-f0-9]{64}$/.test(body.token))fail(400,'Недопустимая подписка');
 return {id:body.id,token:body.token};
}
function base64Bytes(value,length){
 if(typeof value!=='string'||!/^[\w-]+$/.test(value)||value.length>100)fail(400,'Недопустимый ключ');
 let decoded;try{decoded=Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));}catch{fail(400,'Недопустимый ключ');}
 if(decoded.length!==length)fail(400,'Недопустимый ключ');return decoded;
}
export function subscription(value){
 if(!object(value)||typeof value.endpoint!=='string'||value.endpoint.length>4096)fail(400,'Недопустимый адрес доставки');
 let url;try{url=new URL(value.endpoint);}catch{fail(400,'Недопустимый адрес доставки');}
 const host=url.hostname;
 // Only official browser push gateways may receive a server request (SSRF guard).
 if(url.protocol!=='https:'||url.port&&url.port!=='443'||url.username||url.password||url.hash||!((host==='web.push.apple.com')||(host==='fcm.googleapis.com')||(host==='updates.push.services.mozilla.com')||(/^[a-z0-9-]+\.notify\.windows\.com$/.test(host))))fail(400,'Недопустимый адрес доставки');
 if(!object(value.keys)||base64Bytes(value.keys.p256dh,65)[0]!==4)fail(400,'Недопустимый ключ');base64Bytes(value.keys.auth,16);
 return {endpoint:url.href,keys:{p256dh:value.keys.p256dh,auth:value.keys.auth}};
}
export function preferences(value){
 if(!object(value)||!object(value.city))fail(400,'Выберите город');
 const c=value.city;
 if(typeof c.name!=='string'||!c.name.trim()||c.name.length>160||!Number.isFinite(c.latitude)||Math.abs(c.latitude)>90||!Number.isFinite(c.longitude)||Math.abs(c.longitude)>180||typeof c.timezone!=='string'||c.timezone.length>80)fail(400,'Недопустимый город');
 try{new Intl.DateTimeFormat('en',{timeZone:c.timezone}).format(0);}catch{fail(400,'Недопустимый часовой пояс');}
 if(![1,2,3,4,5,13].includes(value.method)||![0,1].includes(value.school)||![1,2,3].includes(value.highLatitude))fail(400,'Недопустимый расчёт');
 if(value.tyumenTimeSource!==undefined&&!TYUMEN_SOURCES.includes(value.tyumenTimeSource))fail(400,'Недопустимый источник расписания');
 const tyumenTimeSource=normalizeTyumenSource(value.tyumenTimeSource);
 const offsets={},tableOffsets={},mosqueTimes={};
 for(const key of PRAYER_KEYS){const n=value.offsets?.[key]??0;if(!Number.isInteger(n)||Math.abs(n)>60)fail(400,'Недопустимая поправка');offsets[key]=n;const tableN=value.tableOffsets?.[key]??0;if(!Number.isInteger(tableN)||Math.abs(tableN)>60)fail(400,'Недопустимая поправка');tableOffsets[key]=tableN;
  if(value.mosque===true){if(!validLocalTime(value.mosqueTimes?.[key]))fail(400,'Недопустимое личное расписание');mosqueTimes[key]=value.mosqueTimes[key];}}
 // Explicit allow-list: never store prayer history, counters, email or backups.
 const reminders=normalizeReminders(value.reminders);
 reminders.browserNotifications=false;
 return {city:{name:c.name.trim(),latitude:c.latitude,longitude:c.longitude,timezone:c.timezone},method:value.method,school:value.school,highLatitude:value.highLatitude,tyumenTimeSource,offsets,tableOffsets,mosque:value.mosque===true,mosqueTimes,reminders,...(reminders.enabled&&reminders.dhikr.enabled?{dhikrLastAt:dhikrTimestamp(value.dhikrLastAt)}:{})};
}
export function cityDay(now,zone){return new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now));}
export function isTyumen(p){return /^(Тюмень|Tyumen)$/i.test(p.city.name)&&Math.abs(p.city.latitude-57.1522)<.2&&Math.abs(p.city.longitude-65.5272)<.3;}
export function serverTimings(day,rows,p){
 const row=rows[day];if(!row||isTyumen(p)&&!matchesTyumenSource(p.tyumenTimeSource,row))return null;
 const times={};for(const key of PRAYER_KEYS){
  let stamp=Date.parse(row.timings?.[key]);
  if(isTyumen(p)&&key==='Asr'&&p.school===0)stamp=firstAsrValid(day,row,row.asrFirst)?Date.parse(row.asrFirst):NaN;
  if(isTyumen(p))stamp+=p.tableOffsets?.[key]*60000||0;
  if(!isTyumen(p)){
   if(p.mosque)stamp=localTimestamp(day,p.mosqueTimes[key],p.city.timezone);
   stamp+=p.offsets[key]*60000;
  }
  times[key]=Number.isFinite(stamp)?stamp:null;
 }
 return times;
}
export function eventsFor(p,rows,now){
 const today=cityDay(now,p.city.timezone);
 return buildReminderEvents(p.reminders,{today,cityKey:JSON.stringify([p.city.latitude,p.city.longitude,p.city.timezone,p.method,p.school,p.highLatitude,p.tyumenTimeSource,p.offsets,p.tableOffsets,p.mosque,p.mosqueTimes]),timeZone:p.city.timezone,dhikrLastAt:p.dhikrLastAt,timingsFor:day=>serverTimings(day,rows,p)});
}
export function dueEvents(events,now){return events.filter(e=>e.at<=now&&now-e.at<90000);}
export async function scheduleRows(p,now,{cache,fetcher=fetch}){
 const today=cityDay(now,p.city.timezone),dates=[shiftDay(today,-1),today,shiftDay(today,1)];
 let rows={};
 async function json(url){const response=await fetcher(url,{signal:AbortSignal.timeout(15000),redirect:'error'});if(!response.ok)throw Error('schedule-unavailable');return response.json();}
 if(isTyumen(p)){
  // Never invent a new Tyumen timetable when no approved local month exists.
  const key='tyumen-published-v2:'+normalizeTyumenSource(p.tyumenTimeSource),saved=await cache.get(key,now);
  if(saved)return saved;
  for(const file of tyumenSourceFiles(p.tyumenTimeSource)){const data=await json(PUBLIC_APP+'data/'+file);Object.assign(rows,data.days||{});}
  const supplement=await json(PUBLIC_APP+'data/tyumen-first-asr.json');
  rows=mergeFirstAsr(rows,supplement.days||{});
  await cache.put(key,rows,now+6*3600000);return rows;
 }
 for(const month of new Set(dates.map(d=>d.slice(0,7)))){
  const params=new URLSearchParams({latitude:String(p.city.latitude),longitude:String(p.city.longitude),method:String(p.method),school:String(p.school),latitudeAdjustmentMethod:String(p.highLatitude),iso8601:'true'});
  const key='aladhan:'+month+':'+await digest(params.toString());let saved=await cache.get(key,now);
  if(!saved){const data=await json('https://api.aladhan.com/v1/calendar/'+month.slice(0,4)+'/'+Number(month.slice(5,7))+'?'+params);
   if(!Array.isArray(data.data)||data.data.length>31)throw Error('schedule-invalid');saved={};
   for(const row of data.data){const day=row.date?.gregorian?.date?.split('-').reverse().join('-');
    if(!shiftDay(day,0)||!day.startsWith(month)||!PRAYER_KEYS.every(key=>typeof row.timings?.[key]==='string'&&/^\d{4}-\d{2}-\d{2}T/.test(row.timings[key])&&Number.isFinite(Date.parse(row.timings[key]))))throw Error('schedule-invalid');
    saved[day]={timings:Object.fromEntries(PRAYER_KEYS.map(key=>[key,row.timings[key]]))};}
   await cache.put(key,saved,now+24*3600000);
  }
  Object.assign(rows,saved);
 }
 return rows;
}
export function notification(event,now){return {title:'SALAH',body:event.message,tag:'salah-push-'+event.hash,url:event.kind==='support'?'#support?thread='+event.thread:event.kind==='setup-invite'?'#settings':['adhkar','dhikr'].includes(event.kind)?'#adhkar':'#home',kind:event.kind,at:event.at,expiresAt:event.kind==='support'?event.at+86400000:event.kind==='setup-invite'?Math.min(now+3600000,SETUP_INVITE.until):event.kind==='dhikr'?Math.min(event.at+120000,localTimestamp(event.day,'22:00',event.timeZone)):event.at+120000,...(event.kind==='dhikr'?{kind:'dhikr',timeZone:event.timeZone}:{})};}
function needsPrayerTimings(p){return p.reminders.enabled&&(PRAYER_KEYS.some(key=>p.reminders.prayers[key].atTime||p.reminders.prayers[key].beforeMinutes>0)||Object.values(p.reminders.adhkar).some(row=>row.enabled&&row.mode==='prayer')||p.reminders.tahajjud.enabled);}
export function createPushHandler({db,webpush,fetcher=fetch,clock=Date.now}){
 async function send(device,event){
  try{const now=clock();if(event.kind==='dhikr'&&!dhikrAllowedAt(now,event.timeZone))return 'retry';const payload=notification(event,now);await webpush.sendNotification(device.subscription,JSON.stringify(payload),{vapidDetails:{subject:PUBLIC_APP,publicKey:(await db.config()).vapid.publicKey,privateKey:(await db.config()).vapid.privateKey},TTL:Math.max(1,Math.ceil((payload.expiresAt-now)/1000)),urgency:event.kind==='dhikr'?'normal':'high',timeout:8000});return 'sent';}
  catch(error){if([404,410].includes(error.statusCode)){await db.expire(device.id);return 'expired';}return 'retry';}
 }
 return async function handle(request){
  const origin=request.headers.get('Origin'),action=new URL(request.url).pathname.split('/').pop();
  const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Vary':'Origin'};
  if(origin===PUSH_ORIGIN){headers['Access-Control-Allow-Origin']=origin;headers['Access-Control-Allow-Headers']='Content-Type';headers['Access-Control-Allow-Methods']='GET, POST, OPTIONS';}
  const reply=(value,status=200)=>new Response(JSON.stringify(value),{status,headers});
  try{
   if(origin&&origin!==PUSH_ORIGIN)fail(403,'Этот адрес не разрешён');
   if(request.method==='OPTIONS'){if(origin!==PUSH_ORIGIN)fail(403,'Этот адрес не разрешён');return new Response(null,{status:204,headers});}
   if(action==='config'&&request.method==='GET'){const config=await db.ensureConfig(()=>webpush.generateVAPIDKeys());return reply({version:1,remindersVersion:4,features:['tahajjud','dhikr-inactivity'],publicKey:config.vapid.publicKey});}
   // One explicitly requested campaign. The date window and immutable hash prevent repeat broadcasts.
   if(action==='invite-setup'&&request.method==='POST'){
    const config=await db.config(),secret=request.headers.get('X-Salah-Cron');
    if(origin||!secret||await digest(secret)!==await digest(config.cron_secret))fail(401,'Доступ запрещён');
    const now=clock();if(now<SETUP_INVITE.from||now>=SETUP_INVITE.until)fail(410,'Приглашение больше не отправляется');
    const devices=await db.active(now);let accepted=0,failed=0,expired=0,skipped=0,cursor=0;
    await Promise.all(Array.from({length:Math.min(8,devices.length)},async()=>{while(cursor<devices.length){
     const device=devices[cursor++],fresh=await db.get(device.id);
     if(!fresh?.subscription||fresh.preferences?.reminders?.enabled!==true){skipped++;continue;}
     if(!await db.claimInvite(device.id,SETUP_INVITE.hash,now)){skipped++;continue;}
     const result=await send({...device,subscription:subscription(fresh.subscription)},{kind:'setup-invite',hash:SETUP_INVITE.hash,at:now,message:SETUP_INVITE.message});
     await db.complete(device.id,SETUP_INVITE.hash,result);if(result==='sent')accepted++;else if(result==='expired')expired++;else failed++;
    }}));return reply({campaign:SETUP_INVITE.hash,devices:devices.length,accepted,failed,expired,skipped});
   }
   if(action==='dispatch'&&request.method==='POST'){
    const config=await db.config(),secret=request.headers.get('X-Salah-Cron');
    if(!secret||await digest(secret)!==await digest(config.cron_secret))fail(401,'Доступ запрещён');
    if(!await db.lease(clock()))return reply({busy:true});
    let delivered=0;
    try{
     delivered+=await dispatchSupportPush({db,send,clock});
     const devices=await db.active(clock()),grouped=new Map(),started=clock();let cursor=0;
     async function deliverDevice(device){
      const p=preferences(device.preferences),signature=JSON.stringify(p);
      if(!grouped.has(signature))grouped.set(signature,(needsPrayerTimings(p)||p.reminders.enabled&&p.reminders.dhikr.enabled?scheduleRows(p,clock(),{cache:db.cache,fetcher}).catch(()=>({})):Promise.resolve({})).then(rows=>({rows,events:eventsFor(p,rows,clock())})));
      const {rows,events}=await grouped.get(signature);
      for(const event of dueEvents(events,clock())){
       if(event.kind==='dhikr'){
        // A resumed reader or an opt-out during timetable fetching must cancel this send.
        const fresh=await db.get(device.id);if(!fresh)continue;
        const latest=preferences(fresh.preferences);
        if(!dhikrAllowedAt(clock(),event.timeZone)||JSON.stringify({...latest,reminders:p.reminders,dhikrLastAt:p.dhikrLastAt})!==signature)continue;
        if(!eventsFor(latest,rows,clock()).some(e=>e.kind==='dhikr'&&e.at===event.at))continue;
        const previous=await db.lastDhikrSent(device.id);
        if(previous&&clock()-previous<(latest.reminders.dhikr.days*24-2)*3600000)continue;
       }
       const hash=(event.kind==='dhikr'?'dhikr-':'')+await digest(JSON.stringify([event.day,event.kind,event.key,event.phase,event.at]));if(!await db.claim(device.id,hash,event.at,clock()))continue;
       const result=await send(device,{...event,hash});await db.complete(device.id,hash,result);if(result==='sent')delivered++;
       if(result==='expired')break;
      }
     }
     // A dead push gateway must not hold up all other phones.
     await Promise.all(Array.from({length:Math.min(8,devices.length)},async()=>{while(cursor<devices.length&&clock()-started<95000){const device=devices[cursor++];await deliverDevice(device);}}));
     await db.cleanup(clock());return reply({delivered});
    }finally{await db.release();}
   }
   if(!['subscribe','unsubscribe','test'].includes(action)||request.method!=='POST')fail(404,'Не найдено');
   if(origin!==PUSH_ORIGIN)fail(403,'Этот адрес не разрешён');
   if(Number(request.headers.get('Content-Length')||0)>8192)fail(413,'Слишком много данных');
   const reader=request.body?.getReader();if(!reader)fail(400,'Недопустимые данные');const chunks=[];let size=0;while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>8192){await reader.cancel();fail(413,'Слишком много данных');}chunks.push(value);}const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}const text=new TextDecoder().decode(bytes);
   let body;try{body=JSON.parse(text);}catch{fail(400,'Недопустимые данные');}
   const auth=credentials(body),tokenHash=await digest(auth.token);
   if(!await db.rate('global:'+action,action==='subscribe'?180:60,clock()))fail(429,'Попробуйте немного позже');
   const device=await db.get(auth.id);
   if(device&&device.token_hash!==tokenHash)fail(403,'Доступ запрещён');
   if(!await db.rate(auth.id+':'+action,action==='subscribe'?10:1,clock()))fail(429,'Попробуйте через минуту');
   if(action==='subscribe'){
    const sub=subscription(body.subscription),p=preferences(body.preferences),endpointHash=await digest(sub.endpoint);
    await db.ensureConfig(()=>webpush.generateVAPIDKeys());
    if(!device&&!await db.rate('new-devices',20,clock()))fail(429,'Попробуйте немного позже');
    if(!device){const peer=request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';if(!await db.rate('new-peer:'+await digest(peer),10,clock()))fail(429,'Попробуйте через минуту');}
    if(!device&&await db.count()>=1000)fail(503,'Доставка временно недоступна');
    if(p.reminders.dhikr.enabled){p.reminders.dhikr.since=Math.min(p.reminders.dhikr.since||clock(),clock());p.dhikrLastAt=Math.min(p.dhikrLastAt||0,clock());
     if(device?.preferences?.reminders?.dhikr?.enabled===true)p.dhikrLastAt=Math.max(p.dhikrLastAt,Math.min(dhikrTimestamp(device.preferences.dhikrLastAt),clock()));}
    const needsSchedule=needsPrayerTimings(p);
    const rows=needsSchedule?await scheduleRows(p,clock(),{cache:db.cache,fetcher}):{};
    const today=cityDay(clock(),p.city.timezone),ready=PRAYER_KEYS.every(key=>Number.isFinite(serverTimings(today,rows,p)?.[key]));
    if(needsSchedule&&!ready)fail(503,'На эту дату нет проверенного расписания');
    if(!device){const welcome={hash:'connected-'+clock(),at:clock(),kind:'test',message:'Фоновые уведомления SALAH подключены.'};if(await send({id:auth.id,subscription:sub},welcome)!=='sent')fail(400,'Телефон не подтвердил доставку. Повторите подключение.');}
    await db.upsert({id:auth.id,token_hash:tokenHash,endpoint_hash:endpointHash,subscription:sub,preferences:p,now:clock()});
    return reply({saved:true,enabled:p.reminders.enabled});
   }
   if(!device)fail(404,'Подписка не найдена');
   if(action==='unsubscribe'){await db.remove(auth.id);return reply({removed:true});}
   const event={hash:'test-'+clock(),at:clock(),kind:'test',message:'Фоновые уведомления SALAH подключены.'};
   if(await send(device,event)!=='sent')fail(503,'Не удалось доставить проверку');
   return reply({sent:true});
  }catch(error){return reply({error:error instanceof PushError?error.message:'Сервис доставки временно недоступен'},error instanceof PushError?error.status:503);}
 };
}
