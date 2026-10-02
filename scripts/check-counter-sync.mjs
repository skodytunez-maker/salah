import assert from 'node:assert/strict';
import{readFile}from 'node:fs/promises';
const core=await import('../dist/js/counter-sync-core.js');
const source=await readFile(new URL('../supabase/functions/adhkar-sync/index.ts',import.meta.url),'utf8');
const {createCounterHandler,aggregateCounters,initialSeed}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222',OWNER='dc1eb1cc-6f8f-472f-a937-735fbfbba4b7';
let actor=A,confirmed=true,anonymous=false,aal='aal1',issuer='https://kbltwszfvphgbxdbczsb.supabase.co/auth/v1',valid=true,rate=true,sessionAlive=true;
const rows=new Map();let reads=0;
const db={rate:async()=>rate,read:async uid=>{reads++;return aggregateCounters([...(rows.get(uid)?.values()||[])]);},merge:async(uid,c)=>{let list=rows.get(uid);if(!list)rows.set(uid,list=new Map());const old=list.get(c.device);if(!old)list.set(c.device,{...c,seed:initialSeed(aggregateCounters([...list.values()]),c.seed)});else if(c.sequence>old.sequence)list.set(c.device,{...c,seed:old.seed});return aggregateCounters([...list.values()]);}};
const h=createCounterHandler({db,isSessionActive:async()=>sessionAlive,getUser:async()=>valid?{data:{user:{id:actor,is_anonymous:anonymous,email_confirmed_at:confirmed?'date':null,factors:[{status:'verified',factor_type:'totp'}]}}}:{error:true},getClaims:async()=>({data:{claims:{sub:actor,iss:issuer,aal,session_id:'33333333-3333-4333-8333-333333333333'}}})});
const request=(body=null,extra={})=>new Request('https://project.supabase.co/functions/v1/adhkar-sync'+(extra.query||''),{method:body?'POST':extra.method||'GET',headers:{Authorization:'Bearer valid-test-token',Origin:'https://skodytunez-maker.github.io','Content-Type':'application/json',...extra.headers},...(body?{body:JSON.stringify(body)}:{})});
assert.equal((await h(new Request('https://x.test'))).status,401);valid=false;assert.equal((await h(request())).status,401);valid=true;
for(const flag of ['confirmed','anonymous','issuer']){confirmed=flag!=='confirmed';anonymous=flag==='anonymous';issuer=flag==='issuer'?'https://evil.test':'https://kbltwszfvphgbxdbczsb.supabase.co/auth/v1';assert.equal((await h(request())).status,403);}confirmed=true;anonymous=false;issuer='https://kbltwszfvphgbxdbczsb.supabase.co/auth/v1';
actor=OWNER;assert.equal((await h(request())).status,403);aal='aal2';assert.equal((await h(request())).status,200);actor=A;aal='aal1';
assert.equal((await h(request(null,{headers:{Origin:'https://evil.test'}}))).status,403);
assert.equal((await h(request(null,{query:'?user='+B}))).status,400);
assert.equal((await h(request(null,{method:'DELETE'}))).status,405);
const comp={device:B,sequence:1,seed:{sayyid:10},delta:{}};
assert.equal((await h(request({...comp,user_id:B}))).status,400);
let response=await h(request(comp));assert.equal(response.status,200);assert.equal(response.headers.get('Cache-Control'),'no-store, private');assert.deepEqual(await response.json(),{totals:{sayyid:10}});
await h(request({...comp,sequence:2,delta:{sayyid:3}}));await h(request(comp));assert.deepEqual(await db.read(A),{sayyid:13});
actor=B;assert.deepEqual(await(await h(request())).json(),{totals:{}});actor=A;
rate=false;assert.equal((await h(request())).status,429);rate=true;
assert.throws(()=>core.cleanCounters(JSON.parse('{"__proto__":1}')));assert.throws(()=>core.cleanCounters({x:Infinity}));assert.throws(()=>core.cleanCounters({toString:1}));
class Memory{constructor(){this.m=new Map()}getItem(k){return this.m.get(k)??null}setItem(k,v){this.m.set(k,v)}removeItem(k){this.m.delete(k)}}
const KEY='salah:adhkar-progress-v2';let device=0;
const create=(s,send=async(uid,c)=>({totals:await db.merge(uid,c)}))=>core.createCounterSync({storage:s,uuid:()=>String(++device).padStart(8,'0')+'-0000-4000-8000-000000000000',request:send});
const get=s=>JSON.parse(s.getItem(KEY)).totals.sayyid||0;
const set=(s,n)=>{const d=JSON.parse(s.getItem(KEY)||'{"version":2,"totals":{},"days":{}}');d.totals.sayyid=n;s.setItem(KEY,JSON.stringify(d))};
rows.clear();const phone=new Memory();set(phone,30);const e=create(phone);await e.activate(A);assert.equal((await e.sync()).ok,true);assert.equal(get(phone),30);await e.sync();assert.equal(get(phone),30);
set(phone,31);await e.sync();assert.equal(get(phone),31);
const reinstall=new Memory(),r=create(reinstall);await r.activate(A);await r.sync();assert.equal(get(reinstall),31);set(reinstall,33);await r.sync();await e.sync();assert.equal(get(phone),33);
const imported=new Memory();set(imported,33);const i=create(imported);await i.activate(A);await i.sync();assert.equal(get(imported),33); // no double counting restored cloud total
let offline=true;const retry=create(phone,async(uid,c)=>{if(offline)throw Error('offline');return{totals:await db.merge(uid,c)}});await retry.activate(A);set(phone,35);assert.equal((await retry.sync()).ok,false);assert.equal(get(phone),35);offline=false;await retry.sync();assert.equal(get(phone),35);await r.sync();assert.equal(get(reinstall),35);
let release;const slow=create(phone,async(uid,c)=>{const totals=await db.merge(uid,c);await new Promise(done=>release=done);return{totals}});await slow.activate(A);set(phone,36);const running=slow.sync();while(!release)await new Promise(done=>setTimeout(done,0));set(phone,37);release();await running;assert.equal(get(phone),37);await e.sync();assert.equal(get(phone),37);
phone.removeItem(KEY);await e.sync();assert.equal(get(phone),37); // surviving sync metadata must not turn missing local data into a reset
await e.activate(null);assert.equal(get(phone),0);await e.activate(B);await e.sync();assert.equal(get(phone),0);await e.activate(A);await e.sync();assert.equal(get(phone),37);
const stale=create(phone);await stale.activate(A);await e.activate(B);assert.equal((await stale.sync()).ok,false);assert.equal(get(phone),0); // another tab cannot write a guest/other account into A
const corrupt=new Memory();corrupt.setItem(KEY,'broken');const ce=create(corrupt);await ce.activate(A);assert.equal((await ce.sync()).ok,false);assert.equal(corrupt.getItem(KEY),'broken');
const denied=new Memory();set(denied,4);const de=create(denied);await de.activate(A);const original=denied.setItem.bind(denied);denied.setItem=()=>{throw Error('quota')};assert.equal((await de.sync()).ok,false);denied.setItem=original;assert.equal(get(denied),4);
console.log('PASS: signed confirmed accounts isolated; owner requires MFA; duplicate/out-of-order retry, reinstall, legacy import, two devices, offline, concurrent increment, logout, cross-tab switch and failed storage preserve counters.');

sessionAlive=false;const readsBeforeRevoked=reads;assert.equal((await h(request())).status,401);assert.equal((await h(request(comp))).status,401);assert.equal(reads,readsBeforeRevoked);sessionAlive=true;
console.log('PASS: revoked session cannot read or change counters while its old access token has not expired.');

const unchanged=new Memory(),signals=[];set(unchanged,5);let cloudCount=5;
const stable=core.createCounterSync({storage:unchanged,uuid:()=>B,request:async()=>({totals:{sayyid:cloudCount,'free-dhikr':0}}),changed:kind=>signals.push(kind)});
await stable.activate(A);signals.length=0;await stable.sync();await stable.sync();
assert.deepEqual(signals,['synced','synced']);
cloudCount=7;await stable.sync();assert.equal(signals.at(-1),'saved');assert.equal(get(unchanged),7);
await stable.sync();assert.equal(signals.at(-1),'synced');
console.log('PASS: unchanged cloud totals do not rebuild the reading view; real changes still restore the counter.');
