import{personalDataAllowed}from '../dist/js/audience.js';
import assert from 'node:assert/strict';import fs from 'node:fs/promises';import vm from 'node:vm';import{RECITERS,reciterInfo}from '../dist/js/quran-reciters.js';import{createListeningMeter,formatListeningTime,listeningDayKey,listeningPeriodTotals,addListeningDay}from '../dist/js/reciter-popularity-core.js';const source=await fs.readFile(new URL('../dist/js/reciter-popularity.js',import.meta.url),'utf8'),store=new Map();let now=new Date('2026-11-10T18:58:00Z').getTime(),accepted=false;const requests=[];function setup(){let tick;let state={reciter:'ar.alafasy',surah:{number:1},index:0,positionSeconds:0,status:'playing'};const context=vm.createContext({personalDataAllowed,initGuestCompetition(){},recordGuestListening(){},initListenerPresence(){},initCompetition(){},read:(k,d)=>store.has(k)?store.get(k):d,write:(k,v)=>{store.set(k,structuredClone(v));return true;},esc:String,OWNER_PROJECT_URL:'https://fixture.invalid',OWNER_PUBLIC_KEY:'fixture',RECITERS,reciterInfo,createListeningMeter,formatListeningTime,listeningDayKey,listeningPeriodTotals,addListeningDay,Date,window:{addEventListener(){},dispatchEvent(){}},document:{hidden:false,addEventListener(){}},navigator:{onLine:true},crypto:{randomUUID:()=> '11111111-1111-4111-8111-111111111111'},Event:class{},setInterval:f=>tick=f,AbortSignal,fetch:async(u,o)=>{requests.push(JSON.parse(o.body));return {ok:true,status:200,json:async()=>({ok:true,counted:accepted})};}});const api=vm.runInContext(source.replace(/^import.*\n/gm,'').replace(/^export \{.*\};?$/gm,'').replace(/export /g,'')+';({initReciterPopularity});',context);api.initReciterPopularity({playback:{get state(){return {...state};},subscribe:f=>f()},getAccount:()=>({signedIn:true,userId:'fixture-user'}),getClient:()=>({auth:{getSession:async()=>({data:{session:{user:{id:'fixture-user'},access_token:'fixture-token'}}})}}),now:()=>now});return{tick:()=>tick(),pause:()=>{state.status='paused';},step:async n=>{for(let i=0;i<n;i++){now+=1000;state.positionSeconds+=1;await tick();}}};}let app=setup();await app.step(65);assert.equal(requests.length,1);assert.equal(store.get('reciter-minute-queue-v2:fixture-user').length,1,'A 200 response with counted:false retains the minute');await app.step(10);assert.equal(requests.length,1,'Rejected minutes wait rather than hammering the server');const original=requests[0].eventId;accepted=true;app=setup();await app.step(1);assert.equal(requests.at(-1).eventId,original,'Reload retries the same idempotency key');assert.equal(store.get('reciter-minute-queue-v2:fixture-user').length,0,'Only accepted minutes leave the saved queue');const meter=createListeningMeter();meter.sample({reciter:'ar.alafasy',surah:{number:1},index:0,positionSeconds:0,status:'playing'},0,true);assert.equal(meter.sample({reciter:'ar.alafasy',surah:{number:1},index:0,positionSeconds:600,status:'playing'},600000,true).length,10,'Ten actual background minutes produce ten report events');console.log('PASS: counted:false retry, durable reload queue, stable event keys, successful acknowledgment and background minutes.');

const recorded=requests[0].occurredAt;
assert.equal(recorded,new Date('2026-11-10T18:59:00Z').getTime(),'Queue stores completion of the listened minute');
assert.equal(requests.at(-1).occurredAt,recorded,'Retries preserve playback time as well as event ID');
app.pause();now+=86400000;await app.tick();assert.equal(requests.at(-1).occurredAt,recorded,'Stationary paused audio never creates new minutes');
store.clear();requests.length=0;
store.set('reciter-minute-queue-v1:fixture-user',[{reciter:'ar.alafasy',eventId:original,consent:true,createdAt:now-86400000}]);
store.set('reciter-personal-listening-v1:fixture-user',{totals:{'ar.alafasy':1234},days:{'2026-11-10':{'ar.alafasy':1234}}});
app=setup();app.pause();await app.tick();
assert.equal(requests.length,0,'Undated legacy queue cannot invent listening on the upload day');
assert.equal(store.get('reciter-personal-listening-v1:fixture-user').totals['ar.alafasy'],1234,'Canonical saved listening history is retained');
const completed=[],datedMeter=createListeningMeter({onMinute:(id,time)=>completed.push({id,time})});
const began=new Date('2026-11-10T18:58:30Z').getTime();
datedMeter.sample({reciter:'ar.idrisabkar',surah:{number:1},positionSeconds:0,status:'playing'},began,true);
datedMeter.sample({reciter:'ar.idrisabkar',surah:{number:1},positionSeconds:180,status:'playing'},began+180000,true);
assert.deepEqual(completed.map(x=>x.time),[60000,120000,180000].map(n=>began+n),'Suspended timers retain individual minute instants across midnight');
const {recordedMinuteDay}=await import('../supabase/functions/reciter-popularity/recorded-minute.mjs');
const stamp=new Date('2026-11-11T10:00:00Z').getTime();
assert.equal(recordedMinuteDay({occurredAt:began,timeZone:'Asia/Yekaterinburg'},stamp),'2026-11-10');
assert.equal(recordedMinuteDay({occurredAt:began+180000,timeZone:'Asia/Yekaterinburg'},stamp),'2026-11-11');
assert.equal(recordedMinuteDay({},stamp),null,'Old live clients keep the three-argument API');
for(const body of [{timeZone:'UTC'},{occurredAt:stamp+600000,timeZone:'UTC'},{occurredAt:stamp-30*86400000,timeZone:'UTC'},{occurredAt:stamp,timeZone:'invalid'},{occurredAt:'2026-11-11',timeZone:'UTC'}])assert.throws(()=>recordedMinuteDay(body,stamp));
console.log('PASS: dated durable queue, immutable retries, midnight minute instants, legacy queue quarantine, saved totals retained and strict server timestamp validation.');

const {PGlite}=await import('../tests/staff/node_modules/@electric-sql/pglite/dist/index.js');
const db=new PGlite();
try{
 await db.exec('create role anon;create role authenticated;create role service_role;');
 const baseSql=await fs.readFile(new URL('../supabase/reciter-popularity.sql',import.meta.url),'utf8');
 await db.exec(baseSql.slice(0,baseSql.indexOf('select cron.schedule')));
 await db.exec(await fs.readFile(new URL('../supabase/migrations/20261111000000_recorded_listening_minutes.sql',import.meta.url),'utf8'));
 const call=(day,id=original)=>db.query("select public.reciter_popularity_add(repeat('a',64),'ar.idrisabkar',$1::uuid,"+day+") added",[id]);
 assert.equal((await call('current_date-1')).rows[0].added,true);
 assert.equal((await db.query('select day=current_date-1 as correct,minutes from public.reciter_popularity_minutes')).rows[0].correct,true,'Late upload belongs to yesterday');
 assert.equal((await call('current_date-1')).rows[0].added,true,'Idempotent retry is acknowledged');
 assert.equal((await db.query('select sum(minutes)::integer n from public.reciter_popularity_minutes')).rows[0].n,1);
 assert.equal((await call('current_date','22222222-2222-4222-8222-222222222222')).rows[0].added,false,'Timestamp support keeps the anti-spam rate limit');
 await db.exec("update public.reciter_popularity_events set created_at=now()-interval '60 seconds'");
 assert.equal((await call('current_date','22222222-2222-4222-8222-222222222222')).rows[0].added,true);
 await assert.rejects(call('current_date-30','33333333-3333-4333-8333-333333333333'));
 await assert.rejects(call('current_date+2','33333333-3333-4333-8333-333333333333'));
 assert.equal((await db.query("select count(*)::integer n from information_schema.routine_privileges where routine_name='reciter_popularity_add' and grantee in('anon','authenticated','PUBLIC')")).rows[0].n,0,'RPC remains private');
 console.log('PASS: real SQL yesterday/today isolation, duplicate event protection, unchanged rate limit, invalid-date rejection and private RPC grants.');
}finally{await db.close();}
