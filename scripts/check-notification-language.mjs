import assert from 'node:assert/strict';
import {NOTIFICATION_LANGUAGES,notificationLanguage,reminderNotificationText} from '../dist/js/notification-language.js';
import {buildNativeReminderPlan} from '../dist/js/native-reminder-plan.js';
import {createNativeReminderConnection} from '../dist/js/native-reminders.js';
import {localTimestamp,buildReminderEvents} from '../dist/js/reminder-events.js';
import {pushPreferences} from '../dist/js/push-reminders.js';
import {preferences,eventsFor,notification} from '../supabase/functions/background-reminders/core.mjs';
import {DAILY_REMINDER_MESSAGES} from '../dist/js/daily-reminder-messages.js';
const timeZone='Asia/Yekaterinburg',today='2026-11-13',now=localTimestamp(today,'04:00',timeZone);
const reminders={enabled:true,prayers:{Fajr:{atTime:true,beforeMinutes:15}},adhkar:{morning:{enabled:true,mode:'time',time:'07:00'},evening:{enabled:true,mode:'time',time:'18:00'}},tahajjud:{enabled:true},jumuah:{enabled:true},dhikr:{enabled:true,since:now-86400000}};
const context={today,cityKey:'unchanged-city',timeZone,timingsFor:day=>Object.fromEntries([['Fajr','05:00'],['Dhuhr','12:30'],['Asr','14:00'],['Maghrib','16:30'],['Isha','18:20']].map(([key,time])=>[key,localTimestamp(day,time,timeZone)]))};
const source=buildReminderEvents(reminders,context),reference=buildNativeReminderPlan(reminders,context,{now});
const identity=events=>events.map(({id,at,kind,key,adhan,voice})=>({id,at,kind,key,adhan,voice}));
const settings={city:{name:'Тюмень',latitude:57.15,longitude:65.52,timezone:timeZone},method:3,school:0,highLatitude:3,reminders};
const rows=Object.fromEntries(['2026-11-12',today,'2026-11-14'].map(day=>[day,{timings:Object.fromEntries(Object.entries(context.timingsFor(day)).map(([key,at])=>[key,new Date(at).toISOString()]))}]));
for(const language of NOTIFICATION_LANGUAGES){
 const plan=buildNativeReminderPlan(reminders,{...context,language},{now});
 assert.deepEqual(identity(plan.events),identity(reference.events),'Language changes text, not time or identity: '+language);
 for(const event of source){
  const body=reminderNotificationText(event,language);
  assert.equal(typeof body,'string');assert.ok(body.length>0&&!/[{}]/.test(body));
  if(event.kind==='dhikr')assert.equal(body,event.message,'Unverified religious translations are never invented');
  else if(language!=='ru')assert.notEqual(body,event.message,'Recognized delivery frames are translated');
 }
 const client=pushPreferences({...settings,uiLanguage:language,history:{secret:true},email:'private@example.invalid'}),server=preferences(client);
 assert.equal(client.language,language);assert.equal(server.language,language);
 assert.equal('history'in server,false);assert.equal('email'in server,false);assert.equal('uiLanguage'in server,false);
 assert.deepEqual(eventsFor(server,rows,now).map(({id,at})=>({id,at})),eventsFor(preferences({...client,language:'ru'}),rows,now).map(({id,at})=>({id,at})));
 const event={kind:'prayer',key:'Fajr',phase:'at',at:now,hash:'same-hash',language,message:'Наступило время Фаджра'};
 assert.equal(notification(event,now).body,reminderNotificationText(event,language));
 assert.equal(notification(event,now).tag,'salah-push-same-hash');
}
assert.equal(preferences(settings).language,'ru','Legacy devices keep their language');
for(const language of ['auto','ru-RU','AR','en<script>',{},null])assert.throws(()=>preferences({...settings,language}),error=>error.status===400);
for(const bad of ['auto',null,{},'xx'])assert.equal(notificationLanguage(bad),'ru');
for(const entry of DAILY_REMINDER_MESSAGES)for(const language of NOTIFICATION_LANGUAGES)assert.equal(reminderNotificationText({kind:'dhikr',message:entry.text},language),entry.text);
const lesson={kind:'classroom',lessonTime:'10:00',lessonTitle:'Name <user content>',message:'old'};
assert.equal(reminderNotificationText(lesson,'en'),'Your lesson today at 10:00: Name <user content>','A lesson name is not translated or interpreted as HTML');
assert.equal(reminderNotificationText({kind:'owner-return',message:'Owner text'},'ar'),'Owner text');
let language='ru',pending=0,prompts=0;const schedules=[];
const plugin={getStatus:async()=>({notifications:true,exactAlarms:true,adhan:true,pending}),replaceSchedule:async({events})=>{schedules.push(events);pending=events.length;return{scheduled:pending};},clearSchedule:async()=>{pending=0;},requestNotificationPermission:async()=>{prompts++;},requestExactAlarmPermission:async()=>{prompts++;}};
const connection=createNativeReminderConnection({plugin,getPreferences:()=>reminders,getContext:()=>({...context,language}),now:()=>now});
await connection.refresh();language='ar';await connection.refresh();await connection.refresh();
assert.equal(schedules.length,2,'A language change replaces existing alarms exactly once');
assert.deepEqual(identity(schedules[0]),identity(schedules[1]));assert.equal(prompts,0);
assert.notEqual(schedules[0].find(e=>e.kind==='prayer').message,schedules[1].find(e=>e.kind==='prayer').message);
console.log('PASS: eight delivery languages preserve event IDs, timestamps, tags, preferences, opt-outs and religious source text; native locale replacement never requests permission or duplicates alarms.');
