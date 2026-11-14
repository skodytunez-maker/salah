import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {normalizeReminders,buildReminderEvents,PRAYER_KEYS,shiftDay,localTimestamp} from '../dist/js/reminder-events.js';
import {normalizeDhikrReminder,dhikrEventForDay,readDhikrActivity,markDhikrActivity,DHIKR_ACTIVITY_KEY,DHIKR_MESSAGES,dhikrAllowedAt} from '../dist/js/dhikr-reminder.js';
import {pushPreferences} from '../dist/js/push-reminders.js';
import {preferences,eventsFor,createPushHandler,digest,PUSH_ORIGIN,notification,cityDay} from '../supabase/functions/background-reminders/core.mjs';
const city={name:'Тюмень',latitude:57.15,longitude:65.52,timezone:'Asia/Yekaterinburg'};
const start=Date.parse('2026-10-01T10:00:00+05:00'),DAY=86400000;
const quietPrayers=Object.fromEntries(PRAYER_KEYS.map(k=>[k,{atTime:false,beforeMinutes:0,adhan:false}]));
const reminders={enabled:true,prayers:quietPrayers,dhikr:{enabled:true,days:3,since:start}};
const settings={city,method:3,school:0,highLatitude:3,reminders};
const p=preferences(settings),at=Date.parse('2026-10-04T12:00:00+05:00');
const dhikr=(config,time)=>eventsFor(config,{},time).filter(e=>e.kind==='dhikr'&&e.at===time);
const configured=patch=>preferences({...settings,reminders:{...reminders,dhikr:{...reminders.dhikr,...patch}}});
const messageFor=day=>DHIKR_MESSAGES[((Math.floor(Date.parse(day+'T00:00:00Z')/DAY)%DHIKR_MESSAGES.length)+DHIKR_MESSAGES.length)%DHIKR_MESSAGES.length].text;
assert.equal(normalizeReminders({}).enabled,false,'No unsolicited master opt-in');
assert.equal(normalizeReminders({}).dhikr.enabled,false,'No unsolicited daily opt-in');
for(const days of [undefined,0,1,2,3,7,30]){
 const saved={enabled:true,days,since:start},normalized=normalizeDhikrReminder(saved);
 assert.equal(normalized.days,1,'Daily has no frequency choice');assert.equal(normalized.enabled,true);assert.equal(saved.days,days,'Normalization never changes saved consent');
}
assert.equal(normalizeDhikrReminder({enabled:false,since:start}).enabled,false,'An explicit opt-out is preserved');
assert.equal(normalizeDhikrReminder({enabled:'true',since:start}).enabled,false,'Consent is strictly boolean');
for(let offset=0;offset<Math.max(7,DHIKR_MESSAGES.length+1);offset++){
 const day=shiftDay('2026-10-01',offset),time=localTimestamp(day,'12:00',city.timezone),events=dhikr(p,time);
 assert.equal(events.length,1,'One reminder every local calendar day including the activation day');
 assert.equal(events[0].message,messageFor(day),'Content follows the calendar date, never an activity interval');
 assert.equal(events[0].adhan,false);assert.equal(events[0].timeZone,city.timezone);
}
assert.equal(dhikr(configured({since:at+1}),at).length,0,'No event before activation');
assert.equal(dhikr(configured({since:at}),at).length,1,'Activation exactly at the scheduled minute is allowed');
const afternoon=configured({since:Date.parse('2026-10-01T13:00:00+05:00')});
assert.equal(dhikr(afternoon,localTimestamp('2026-10-01','12:00',city.timezone)).length,0,'Afternoon activation never backdates the noon reminder');
assert.equal(dhikr(afternoon,localTimestamp('2026-10-02','12:00',city.timezone)).length,1,'Afternoon activation schedules tomorrow');
assert.equal(dhikr(configured({since:Date.parse('2025-01-01T00:00:00Z')}),at).length,1,'An old baseline does not add a waiting period');
assert.equal(dhikr(configured({since:0}),at).length,0);
for(const dhikrLastAt of [at-60000,at,at+DAY])assert.deepEqual(dhikr({...p,dhikrLastAt},at),dhikr(p,at),'Recent or future legacy activity never cancels daily scheduling');
assert.equal(dhikr(preferences({...settings,reminders:{...reminders,enabled:false}}),at).length,0);
assert.equal(dhikr(configured({enabled:false}),at).length,0);
assert.equal(settings.reminders.enabled,true);assert.equal(settings.reminders.dhikr.days,3,'Input preferences are not mutated');
const client=buildReminderEvents(reminders,{cityKey:'fixture',today:'2026-10-04',timeZone:city.timezone,timingsFor:()=>null});
assert.deepEqual(client,eventsFor(p,{},at),'Client and server share exactly the same daily scheduler');
const table=JSON.parse(await readFile(new URL('../dist/data/tyumen-october-2026.json',import.meta.url),'utf8')).days;
const dhuhrAt=Date.parse(table['2026-10-04'].timings.Dhuhr);
assert.equal(eventsFor(p,table,dhuhrAt).find(e=>e.kind==='dhikr'&&e.day==='2026-10-04').at,dhuhrAt,'The selected city timetable determines Dhuhr');
for(const value of ['2026-10-04T07:59:00+05:00','2026-10-04T22:00:00+05:00','2026-10-04T23:30:00+05:00','invalid',1e30,null]){
 const events=buildReminderEvents(reminders,{cityKey:'fixture',today:'2026-10-04',timeZone:city.timezone,timingsFor:()=>({Dhuhr:value})}).filter(e=>e.kind==='dhikr');
 assert.equal(events.find(e=>e.day==='2026-10-04').at,at,'Missing, invalid or out-of-window Dhuhr uses local noon');
}
assert.equal(buildReminderEvents(reminders,{cityKey:'fixture',today:'2026-10-04',timeZone:city.timezone,timingsFor:()=>{throw Error('offline')}}).find(e=>e.kind==='dhikr'&&e.day==='2026-10-04').at,at);
for(const [time,allowed] of [['07:59',false],['08:00',true],['21:59',true],['22:00',false]])assert.equal(dhikrAllowedAt(Date.parse('2026-10-04T'+time+':00+05:00'),city.timezone),allowed);
assert.equal(dhikrAllowedAt(at,'invalid/zone'),false);
assert.equal(dhikrEventForDay(reminders.dhikr,0,'2026-02-30',city.timezone,{localTimestamp,shiftDay,cityDay}),null);
assert.equal(dhikrEventForDay(reminders.dhikr,0,'2026-10-04','invalid/zone',{localTimestamp,shiftDay,cityDay}),null);
const nyCity={name:'New York',latitude:40.71,longitude:-74.01,timezone:'America/New_York'};
const ny=preferences({...settings,city:nyCity,reminders:{...reminders,dhikr:{enabled:true,since:Date.parse('2026-01-01T10:00:00-05:00')}}});
for(const [before,after,hours] of [['2027-03-13','2027-03-14',23],['2026-10-31','2026-11-01',25]]){
 const first=localTimestamp(before,'12:00',nyCity.timezone),second=localTimestamp(after,'12:00',nyCity.timezone);
 assert.equal((second-first)/3600000,hours,'Daily wall-clock scheduling follows DST rather than a 24-hour interval');
 assert.equal(dhikr(ny,first).length,1);assert.equal(dhikr(ny,second).length,1);assert.equal(dhikr(ny,second)[0].message,messageFor(after));
}
const midnight=localTimestamp('2026-11-01','00:00',city.timezone),midnightDays=eventsFor(p,{},midnight).filter(e=>e.kind==='dhikr');
assert.deepEqual(midnightDays.map(e=>e.day),['2026-10-31','2026-11-01','2026-11-02'],'Midnight and month rollover keep one candidate per city date');
assert.equal(dhikr(p,localTimestamp('2027-01-01','12:00',city.timezone))[0].message,messageFor('2027-01-01'),'Calendar rotation crosses year boundaries');
assert.equal(dhikr(ny,localTimestamp('2026-10-04','12:00',nyCity.timezone))[0].message,dhikr(p,at)[0].message,'The same calendar date has the same excerpt across time zones and activation dates');
// Storage events remain available to unrelated activity features; scheduling never reads them.
const map=new Map(),storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)},target=new EventTarget();let signals=0;target.addEventListener('salah:dhikr-activity',()=>signals++);
assert.equal(readDhikrActivity(storage),0);assert.equal(markDhikrActivity(start,storage,target),true);markDhikrActivity(start-1,storage,target);assert.equal(readDhikrActivity(storage),start);assert.equal(signals,2);assert.deepEqual([...map.keys()],[DHIKR_ACTIVITY_KEY]);
globalThis.localStorage=storage;
assert.equal('dhikrLastAt' in pushPreferences({...settings,reminders:{enabled:true}}),false,'No legacy timestamp upload without opt-in');
assert.equal('dhikrLastAt' in pushPreferences({...settings,reminders:{...reminders,enabled:false}}),false);
const outgoing=pushPreferences(settings);if('dhikrLastAt' in outgoing)assert.equal(outgoing.dhikrLastAt,start,'Older clients may still send an unused activity timestamp');
assert.equal(outgoing.reminders.enabled,true);assert.equal(outgoing.reminders.dhikr.enabled,true);assert.equal(outgoing.reminders.dhikr.days,1);
assert.equal('email' in preferences({...settings,email:'private',history:{},counts:{}}),false);
const schedulerSource=await readFile(new URL('../dist/js/dhikr-reminder.js',import.meta.url),'utf8');
assert.doesNotMatch(schedulerSource,/requestPermission|Notification\s*\(/,'Daily scheduling never asks for notification permission');
// Entire background handler with fake gateways: no real phone, provider or push service is contacted.
const id='7e3c95b2-feba-4c41-9de4-1260d0201d11',token='a'.repeat(64),sub={endpoint:'https://web.push.apple.com/test-device',keys:{p256dh:Buffer.from([4,...Array(64).fill(1)]).toString('base64url'),auth:Buffer.alloc(16,1).toString('base64url')}};
let now=at+20000,activePrefs=p,latest=p,devicePresent=true,lastSent=0,scheduleCalls=0,sent=[];const ledger=new Map();
const db={config:async()=>({cron_secret:'fixture',vapid:{publicKey:'fixture',privateKey:'fixture'}}),ensureConfig:async()=>({vapid:{publicKey:'fixture'}}),get:async()=>devicePresent?{id,token_hash:await digest(token),preferences:latest}:null,active:async()=>[{id,subscription:sub,preferences:activePrefs}],lastDhikrSent:async()=>lastSent,lease:async()=>true,release:async()=>{},cleanup:async()=>{},claim:async(i,h)=>{if(ledger.has(h))return false;ledger.set(h,'sending');return true},complete:async(i,h,state)=>{ledger.set(h,state);if(state==='sent')lastSent=now;},rate:async()=>true,upsert:async d=>latest=d.preferences,cache:{get:async()=>null,put:async()=>{}}};
const handler=createPushHandler({db,webpush:{sendNotification:async(s,b)=>sent.push(JSON.parse(b))},fetcher:async()=>{scheduleCalls++;throw Error('Unavailable prayer source')},clock:()=>now});
const request=()=>handler(new Request('https://fixture/background-reminders/dispatch',{method:'POST',headers:{'X-Salah-Cron':'fixture'}}));
const delivered=async()=>{const response=await request();assert.equal(response.status,200);return (await response.json()).delivered;};
function reset(config=p,time=at+20000){activePrefs=config;latest=config;devicePresent=true;now=time;lastSent=0;ledger.clear();sent=[];db.cache.get=async()=>null;}
assert.equal(await delivered(),1);assert.equal(sent[0].body,messageFor('2026-10-04'));assert.equal(sent[0].url,'#adhkar');assert.match(sent[0].tag,/^salah-push-dhikr-/);
assert.equal(await delivered(),0,'Repeated minute dispatches never duplicate a reminder');
ledger.clear();assert.equal(await delivered(),0,'The same calendar day remains deduplicated even with a new event claim');
reset();lastSent=now-3600000;assert.equal(await delivered(),0,'Recent sends remain blocked after timezone or option changes');
reset();lastSent=now-(22*3600000-1);assert.equal(await delivered(),0,'Timezone travel cannot bypass the conservative 22-hour guard');
for(const hours of [22,23,24,25]){reset();lastSent=now-hours*3600000;assert.equal(await delivered(),1,'A different city calendar date may send after '+hours+' hours');}
reset();latest={...p,dhikrLastAt:now};assert.equal(await delivered(),1,'Fresh activity during slow timetable loading no longer cancels a daily reminder');
reset();latest=configured({enabled:false});assert.equal(await delivered(),0,'Fresh opt-out cancels delivery after schedule lookup');
reset();latest=preferences({...settings,reminders:{...reminders,enabled:false}});assert.equal(await delivered(),0,'Fresh master opt-out cancels delivery');
reset();latest=configured({since:now+60000});assert.equal(await delivered(),0,'Fresh activation floor cannot receive an old event');
for(const cityPatch of [{name:'Другой город'},{timezone:'Europe/Moscow'},{latitude:58}]){
 reset();latest=preferences({...settings,city:{...city,...cityPatch}});assert.equal(await delivered(),0,'Fresh city changes invalidate a stale timetable');
}
reset();devicePresent=false;assert.equal(await delivered(),0,'A removed device is not sent a stale daily reminder');
for(const [before,after,hours] of [['2027-03-13','2027-03-14',23],['2026-10-31','2026-11-01',25]]){
 reset(ny,localTimestamp(after,'12:00',nyCity.timezone)+20000);lastSent=localTimestamp(before,'12:00',nyCity.timezone)+20000;
 assert.equal((now-lastSent)/3600000,hours);assert.equal(await delivered(),1,'Server dedupe permits a normal '+hours+'-hour DST day');
}
reset();let response=await handler(new Request('https://fixture/background-reminders/config',{headers:{Origin:PUSH_ORIGIN}}));let config=await response.json();assert.equal(config.remindersVersion,5);assert.deepEqual(config.features,['tahajjud','dhikr-inactivity','dhikr-daily'],'Old clients retain their supported-feature alias');
scheduleCalls=0;response=await handler(new Request('https://fixture/background-reminders/subscribe',{method:'POST',headers:{Origin:PUSH_ORIGIN},body:JSON.stringify({id,token,subscription:sub,preferences:settings})}));assert.equal(response.status,200);assert.equal(scheduleCalls,0,'Daily-only registration does not require prayer-provider availability');
assert.equal(latest.reminders.enabled,true);assert.equal(latest.reminders.dhikr.enabled,true);assert.equal(latest.reminders.dhikr.days,1);
response=await handler(new Request('https://fixture/background-reminders/subscribe',{method:'POST',headers:{Origin:PUSH_ORIGIN},body:JSON.stringify({id,token,subscription:sub,preferences:{...settings,reminders:{...reminders,enabled:false,dhikr:{enabled:false}}}})}));assert.equal(response.status,200);assert.equal(latest.reminders.enabled,false);assert.equal(latest.reminders.dhikr.enabled,false,'Subscription updates never re-enable an opted-out device');
reset(p,dhuhrAt+20000);db.cache.get=async()=>table;assert.equal(await delivered(),1,'Fresh server recheck retains the actual Dhuhr timetable');
assert.equal(sent[0].at,dhuhrAt);assert.equal(sent[0].kind,'dhikr');assert.equal(sent[0].timeZone,city.timezone);
const lateRows={...table,'2026-10-04':{...table['2026-10-04'],timings:{...table['2026-10-04'].timings,Dhuhr:'2026-10-04T21:59:30+05:00'}}};
reset(p,Date.parse('2026-10-04T22:00:00+05:00'));db.cache.get=async()=>lateRows;
assert.equal(await delivered(),0,'A delayed dispatch does not send in sleeping hours');
const lateEvent=eventsFor(p,lateRows,now).find(e=>e.kind==='dhikr'&&e.day==='2026-10-04');assert.equal(notification(lateEvent,now).expiresAt,now,'Gateway expiry stops at 22:00');
const listeners={},shown=[];let workerNow=at;
class FixtureDate extends Date{constructor(...args){super(...(args.length?args:[workerNow]));}static now(){return workerNow;}}
const sw=await readFile(new URL('../dist/sw.js',import.meta.url),'utf8');
vm.runInNewContext(sw,{self:{registration:{scope:PUSH_ORIGIN+'/salah/',showNotification:async(...args)=>shown.push(args)},location:{origin:PUSH_ORIGIN},addEventListener:(name,fn)=>listeners[name]=fn},URL,Intl,Date:FixtureDate,console});
const push=payload=>listeners.push({data:{json:()=>payload},waitUntil:()=>{}});
push({kind:'dhikr',timeZone:city.timezone,expiresAt:at+60000,body:'fixture'});assert.equal(shown.length,1,'Daytime delivery is displayed');
workerNow=Date.parse('2026-10-04T22:00:00+05:00');push({kind:'dhikr',timeZone:city.timezone,expiresAt:workerNow+60000,body:'fixture'});assert.equal(shown.length,1,'Worker suppresses nighttime delayed delivery');
workerNow=Date.parse('2026-10-05T07:59:00+05:00');push({kind:'dhikr',timeZone:city.timezone,expiresAt:workerNow+60000,body:'fixture'});assert.equal(shown.length,1);
workerNow=Date.parse('2026-10-05T08:00:00+05:00');push({kind:'dhikr',timeZone:city.timezone,expiresAt:workerNow+60000,body:'fixture'});assert.equal(shown.length,2);
push({kind:'dhikr',timeZone:city.timezone,expiresAt:workerNow-1,body:'expired'});assert.equal(shown.length,2,'Expired daily push never becomes a generic notice');
workerNow=Date.parse('2026-10-05T04:55:00+05:00');push({expiresAt:workerNow+60000,body:'Фаджр'});assert.equal(shown.length,3,'Prayer notifications retain their nighttime delivery');
const activitySource=await readFile(new URL('../dist/js/adhkar.js',import.meta.url),'utf8');assert.match(activitySource,/function card\([^)]*\)\{[^{}]*markDhikrActivity\(\)/);assert.match(activitySource,/result.ok&&action==='increment'\)\{markDhikrActivity\(\);emitAdhkarActivity\(account\);emitTransientDhikrPresence\(account\);\}/);
console.log('PASS: fixed daily opt-in, activation floor, calendar rotation, Dhuhr/noon, midnight/DST, activity independence, fresh opt-out/city checks, 22h and same-day guards, client/server parity and worker quiet hours.');

