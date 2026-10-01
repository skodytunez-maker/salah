import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {subscription,preferences,eventsFor,dueEvents,serverTimings,createPushHandler,PUSH_ORIGIN,digest} from '../supabase/functions/background-reminders/core.mjs';
import {pushPreferences} from '../dist/js/push-reminders.js';
const root=new URL('../',import.meta.url),read=p=>readFile(new URL(p,root),'utf8');
const table=JSON.parse(await read('dist/data/tyumen-october-2026.json')).days;
const settings={city:{name:'Тюмень',latitude:57.1522,longitude:65.5272,timezone:'Asia/Yekaterinburg'},method:3,school:0,highLatitude:3,offsets:{},mosque:false,reminders:{enabled:true}};
let now=Date.parse('2026-10-02T15:21:20+05:00');
const p=preferences(settings);
assert.equal(serverTimings('2026-10-02',table,p).Asr,Date.parse('2026-10-02T15:21:00+05:00'));
assert.equal(serverTimings('2026-10-02',table,{...p,school:1}).Asr,Date.parse('2026-10-02T16:08:00+05:00'));
assert.equal(dueEvents(eventsFor(p,table,now),now)[0].key,'Asr');
assert.equal(dueEvents(eventsFor(p,table,now),now+90000).length,0,'Never send a stale reminder');
assert.equal(eventsFor({...p,reminders:{enabled:false}},table,now).length,0);
assert.equal(serverTimings('2026-11-01',table,p),null,'No unapproved Tyumen fallback');
assert.equal(serverTimings('2026-10-02',table,{...p,tableOffsets:{Asr:2}}).Asr,Date.parse('2026-10-02T15:23:00+05:00'));
const automatic=preferences({...settings,reminders:{enabled:true,adhkar:{morning:{enabled:true,mode:'prayer'},evening:{enabled:true,mode:'prayer'}}}});
const automaticEvents=eventsFor(automatic,table,now).filter(e=>e.kind==='adhkar'&&e.day==='2026-10-02');
assert.equal(automaticEvents.find(e=>e.key==='morning').at,Date.parse(table['2026-10-02'].timings.Fajr));
assert.equal(automaticEvents.find(e=>e.key==='evening').at,Date.parse(table['2026-10-02'].timings.Maghrib));
const legacyCustom=preferences({...settings,reminders:{enabled:true,adhkar:{morning:{enabled:true,time:'08:15'}}}});
assert.equal(legacyCustom.reminders.adhkar.morning.mode,'time','An old saved personal reminder must be preserved');
assert.equal(eventsFor(legacyCustom,table,now).find(e=>e.kind==='adhkar'&&e.key==='morning'&&e.day==='2026-10-02').at,Date.parse('2026-10-02T08:15:00+05:00'));

const tokyo={...p,city:{name:'Tokyo',latitude:35.7,longitude:139.7,timezone:'Asia/Tokyo'},offsets:{Fajr:2,Dhuhr:0,Asr:-3,Maghrib:0,Isha:0},mosque:true,mosqueTimes:{Fajr:'05:00',Dhuhr:'12:00',Asr:'15:00',Maghrib:'18:00',Isha:'20:00'}};
assert.equal(serverTimings('2026-10-02',table,tokyo).Asr,Date.parse('2026-10-02T14:57:00+09:00'));
assert.throws(()=>preferences({...settings,school:'0'}));
assert.throws(()=>preferences({...settings,city:{...settings.city,timezone:'not/a/zone'}}));
assert.throws(()=>preferences({...settings,offsets:{Asr:61}}));
const owned=pushPreferences({...settings,email:'private@example.test',history:{private:1},weather:true});
assert.equal('email'in owned,false);assert.equal('history'in owned,false);assert.equal('weather'in owned,false);
const sub={endpoint:'https://web.push.apple.com/test-device',keys:{p256dh:Buffer.from([4,...Array(64).fill(1)]).toString('base64url'),auth:Buffer.alloc(16,1).toString('base64url')}};
assert.deepEqual(subscription(sub),sub);
for(const endpoint of ['http://web.push.apple.com/test','https://localhost/a','https://web.push.apple.com.evil.test/a','https://127.0.0.1/a','https://fcm.googleapis.com:9443/a','https://user:pw@web.push.apple.com/a'])assert.throws(()=>subscription({...sub,endpoint}));
assert.throws(()=>subscription({...sub,keys:{...sub.keys,p256dh:Buffer.alloc(65).toString('base64url')}}));
assert.throws(()=>subscription({...sub,keys:{...sub.keys,auth:'abc'}}));
const id='7e3c95b2-feba-4c41-9de4-1260d0201d11',token='a'.repeat(64);
function fixture(){
 const devices=new Map(),ledger=new Map(),rates=new Map(),cacheMap=new Map(),sent=[];let leased=false;
 const config={cron_secret:'test-cron-secret',vapid:{publicKey:'public-test',privateKey:'private-test'}};
 const db={config:async()=>config,ensureConfig:async()=>config,get:async k=>devices.get(k),count:async()=>devices.size,
  upsert:async d=>devices.set(d.id,d),remove:async k=>devices.delete(k),expire:async k=>devices.delete(k),active:async()=>[...devices.values()].filter(d=>d.preferences.reminders.enabled),
  rate:async(k,max,t)=>{const key=k+':'+Math.floor(t/60000),n=(rates.get(key)||0)+1;rates.set(key,n);return n<=max;},
  lease:async()=>leased?false:(leased=true),release:async()=>{leased=false;},
  claim:async(k,h)=>{const key=k+h;if(ledger.get(key)&&ledger.get(key)!=='retry')return false;ledger.set(key,'sending');return true;},complete:async(k,h,s)=>ledger.set(k+h,s),cleanup:async()=>{},
  cache:{get:async k=>cacheMap.get(k),put:async(k,v)=>cacheMap.set(k,v)}};
 const webpush={generateVAPIDKeys:()=>config.vapid,sendNotification:async(s,b,o)=>sent.push({s,body:JSON.parse(b),options:o})};
 const fetcher=async url=>new Response(JSON.stringify({days:url.endsWith('tyumen-first-asr.json')?{}:table}),{status:200});
 const handler=createPushHandler({db,webpush,fetcher,clock:()=>now});
 const call=(action,body,headers={},method='POST')=>handler(new Request('https://example.test/background-reminders/'+action,{method,headers:{Origin:PUSH_ORIGIN,...headers},body:body===undefined?undefined:JSON.stringify(body)}));
 return {db,devices,ledger,sent,call,handler};
}
let f=fixture();let result=await f.call('config',undefined,{},'GET');assert.equal(result.status,200);assert.deepEqual(await result.json(),{version:1,publicKey:'public-test'});
assert.equal((await f.call('subscribe',{id,token,subscription:sub,preferences:settings},{Origin:'https://evil.test'})).status,403);
assert.equal((await f.call('dispatch',{},{})).status,401);
assert.equal((await f.call('test',{id,token})).status,404);
f=fixture();result=await f.call('subscribe',{id,token,subscription:sub,preferences:settings});assert.equal(result.status,200);
assert.equal(f.devices.size,1);assert.equal(f.devices.get(id).token_hash,await digest(token));assert.equal(f.sent.length,1,'Registration verifies push gateway before saving');
assert.equal(JSON.stringify(f.devices.get(id)).includes(token),false,'Only a digest is retained');
assert.equal((await f.call('subscribe',{id,token:'b'.repeat(64),subscription:sub,preferences:settings})).status,403);
assert.equal((await f.call('unsubscribe',{id,token:'b'.repeat(64)})).status,403);
result=await f.call('dispatch',{}, {'X-Salah-Cron':'test-cron-secret'});assert.equal(result.status,200);assert.equal((await result.json()).delivered,1);
assert.equal(f.sent.at(-1).body.body,'Наступило время Асра');assert.equal(f.sent.at(-1).body.url,'#home');assert.ok(f.sent.at(-1).options.TTL<=120);
result=await f.call('dispatch',{}, {'X-Salah-Cron':'test-cron-secret'});assert.equal((await result.json()).delivered,0,'Minute retries cannot duplicate a delivered event');
now+=61000;result=await f.call('test',{id,token,message:'attacker message',url:'https://evil.test'});assert.equal(result.status,200);assert.equal(f.sent.at(-1).body.body,'Фоновые уведомления SALAH подключены.');
assert.equal((await f.call('test',{id,token})).status,429,'Limit test messages');
now+=61000;assert.equal((await f.call('unsubscribe',{id,token})).status,200);assert.equal(f.devices.size,0);
f=fixture();f.db.ensureConfig=async()=>{throw Error('SECRET_DATABASE_PASSWORD');};result=await f.call('config',undefined,{},'GET');assert.equal(result.status,503);assert.equal((await result.text()).includes('SECRET'),false);
f=fixture();f.db.upsert=async()=>{throw Error('duplicate-endpoint');};assert.equal((await f.call('subscribe',{id,token,subscription:sub,preferences:settings})).status,503);
const migration=await read('supabase/migrations/2026100201_background_reminders.sql');
for(const name of ['devices','config','deliveries','cache','limits'])assert.ok(migration.includes('alter table salah_push_private.'+name+' enable row level security'));
assert.ok(migration.includes('revoke all on all tables in schema salah_push_private from public,anon,authenticated'));
const client=await read('dist/js/push-reminders.js'),worker=await read('dist/sw.js'),backup=await read('dist/js/backup.js');
assert.ok(client.includes("const KEY='salah:push-install-v1'"));assert.ok(!backup.includes('push-install-v1'));
assert.ok(client.includes('crypto.getRandomValues(new Uint8Array(32))'));
assert.ok(worker.includes("self.addEventListener('push'"));assert.ok(worker.includes('Date.now()<data.expiresAt'));
assert.ok(!client.includes('privateKey'));assert.ok(!worker.includes('privateKey'));
console.log('PASS: Asr variants, city timezone, personal offsets, freshness, no invented times, push endpoint SSRF guard, device capability isolation, rate limit, fixed test messages, dispatch authentication, duplicate prevention, private RLS schema and secret-free personal backups.');
