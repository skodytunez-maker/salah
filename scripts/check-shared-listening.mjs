import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import {createSharedFrameStore,createSharedListeningReporter} from '../dist/js/shared-listening-core.js';
import {createSharedListeningStream} from '../dist/js/shared-listening-stream.js';
import {createLiveListeningDb,liveListeningPacket,isLiveListeningDay} from '../supabase/functions/reciter-competition/live-listening.mjs';

const require=createRequire(new URL('../tests/staff/package.json',import.meta.url));
const {PGlite}=require('@electric-sql/pglite');
const pg=new PGlite();
const migrationRoot=new URL('../supabase/migrations/',import.meta.url);
const migration=(await fs.readdir(migrationRoot)).find(name=>name.endsWith('_shared_listening_frames.sql'));
assert.ok(migration);
const day=new Date().toISOString().slice(0,10);
const [a,b,sessionA,sessionB,deviceA,deviceB]=Array.from({length:6},(_,i)=>String(i+1).repeat(8)+'-1234-4123-8123-123456789abc');
const people=[{id:a,session:sessionA,device:deviceA,base:100},{id:b,session:sessionB,device:deviceB,base:200}];
const reciter='ar.alafasy';
try{
 await pg.exec([
  'create role anon;create role authenticated;create schema auth;create schema salah_competition_private;',
  'create table auth.users(id uuid primary key,email_confirmed_at timestamptz,is_anonymous boolean,banned_until timestamptz);',
  'create table auth.sessions(id uuid primary key,user_id uuid,not_after timestamptz);',
  'create table salah_competition_private.preferences(user_id uuid primary key,enabled boolean);',
  'create table public.reciter_listener_visibility(user_id uuid primary key,mode text,listener_hash text);',
  'create table salah_competition_private.totals(user_id uuid,device_id uuid,reciter text,seconds bigint,initial_seconds bigint,updated_at timestamptz,primary key(user_id,device_id,reciter));',
  'create table salah_competition_private.days(user_id uuid,device_id uuid,reciter text,day date,seconds integer,initial_seconds integer,primary key(user_id,device_id,reciter,day));',
  'create table salah_competition_private.legacy(user_id uuid,reciter text,seconds bigint,seed_seconds bigint);',
  'create table salah_competition_private.legacy_days(user_id uuid,day date,reciter text,seconds bigint);',
  'create table public.reciter_popularity_minutes(listener_hash text,day date,reciter text,minutes bigint,extra_seconds integer);',
  'create publication supabase_realtime;'
 ].join('\n'));
 await pg.exec(await fs.readFile(new URL('20261016012000_competition_period_seed_consistency.sql',migrationRoot),'utf8'));
 await pg.exec(await fs.readFile(new URL(migration,migrationRoot),'utf8'));
 for(const [i,p] of people.entries()){
  await pg.query('insert into auth.users values($1,now(),false,null)',[p.id]);
  await pg.query('insert into auth.sessions values($1,$2,null)',[p.session,p.id]);
  await pg.query('insert into salah_competition_private.preferences values($1,true)',[p.id]);
  await pg.query('insert into public.reciter_listener_visibility values($1,$2,$3)',[p.id,i?'profile':'initial','fixture'+i]);
  await pg.query("insert into salah_competition_private.totals values($1,$2,$3,$4,$4,now()-interval '30 seconds')",[p.id,p.device,reciter,p.base]);
  await pg.query('insert into salah_competition_private.days values($1,$2,$3,$4,$5,$5)',[p.id,p.device,reciter,day,p.base]);
 }
 const db=createLiveListeningDb({begin:work=>pg.transaction(tx=>work({unsafe:async(sql,params)=>(await tx.query(sql,params)).rows}))});
 const packet=(p,n)=>liveListeningPacket({action:'live-sample',device:p.device,day,rows:[{reciter,total:n,dayTotal:n}]});
 const official=async()=>Number((await pg.query("select sum(seconds) s from public.competition_scores('all',$1::date)",[day])).rows[0].s);
 const refresh=async()=>{await pg.exec("update public.salah_shared_listening set sampled_at=now()-interval '2 seconds'");return db.read(day);};
 const base=await db.read(day);
 assert.equal(base.totals.all,300);
 assert.deepEqual(await db.read(day),base,'Readers within a second get the same frame');
 assert.equal((await db.update(people[0],packet(people[0],101))).ok,true);
 assert.equal((await db.update(people[1],packet(people[1],201))).ok,true);
 const shared=await refresh();
 assert.deepEqual(shared.totals,{day:302,week:302,month:302,all:302});
 assert.equal(await official(),300,'Live samples cannot affect the ranked score');
 const stores=[createSharedFrameStore(),createSharedFrameStore()];
 for(const store of stores){
  assert.ok(store.accept(base,day));assert.ok(store.accept(shared,day));
  assert.equal(store.accept(base,day),false,'Delayed frame cannot rewind the total');
  assert.equal(store.accept(shared,day),false,'Duplicate frame cannot add seconds');
  assert.equal(store.get().totals.day,302);
 }
 const otherDevice=liveListeningPacket({action:'live-sample',device:deviceB,day,rows:[{reciter,total:202,dayTotal:202}]});
 assert.equal((await db.update(people[0],otherDevice)).needsSnapshot,true,'Another account device cannot receive live samples');
 await pg.exec("update salah_competition_private.live_listening_samples set reported_at=now()-interval '2 seconds'");
 await assert.rejects(db.update(people[0],packet(people[0],900)),/invalid_live_growth/);
 await pg.query('update salah_competition_private.totals set seconds=seconds+1 where user_id=$1',[a]);
 await pg.query('update salah_competition_private.days set seconds=seconds+1 where user_id=$1',[a]);
 assert.equal(await official(),301);
 const stale=await db.update(people[0],packet(people[0],100));
 assert.equal(stale.updated,false,'A stale retry is ignored after the durable snapshot');
 assert.equal(stale.needsSnapshot,false);
 assert.equal((await refresh()).totals.all,302,'A persisted snapshot absorbs already displayed seconds');
 await pg.query('update salah_competition_private.totals set seconds=seconds+1 where user_id=$1',[b]);
 await pg.query('update salah_competition_private.days set seconds=seconds+1 where user_id=$1',[b]);
 assert.equal((await refresh()).totals.all,302);
 assert.equal(await official(),302);
 const publication=await pg.query("select tablename from pg_publication_tables where pubname='supabase_realtime'");
 assert.deepEqual(publication.rows.map(x=>x.tablename),['salah_shared_listening']);
 for(const role of ['anon','authenticated']){
  await pg.exec('set role '+role);
  try{
   const visible=await pg.query('select * from public.salah_shared_listening');
   assert.deepEqual(Object.keys(visible.rows[0]).sort(),['day','revision','sampled_at','totals']);
   await assert.rejects(pg.exec("update public.salah_shared_listening set totals='{}'"),/permission denied/);
   await assert.rejects(pg.query('select * from salah_competition_private.live_listening_samples'),/permission denied/);
  }finally{await pg.exec('reset role');}
 }
 await pg.query("update public.reciter_listener_visibility set mode='hidden' where user_id=$1",[b]);
 assert.equal((await refresh()).totals.day,101);
 await assert.rejects(db.update(people[1],packet(people[1],202)),e=>e.status===401);
 await pg.query('delete from auth.sessions where id=$1',[sessionA]);
 await assert.rejects(db.update(people[0],packet(people[0],102)),e=>e.status===401);
 assert.equal(isLiveListeningDay('2026-02-31'),false);
 assert.throws(()=>liveListeningPacket({action:'live-sample',device:deviceA,day,user_id:b,rows:[{reciter,total:120,dayTotal:120}]}),/invalid_live_sample/);
}finally{await pg.close();}

let clock=0,seconds=100,scope=a,online=true;
const sent=[];
const reporter=createSharedListeningReporter({getSnapshot:()=>({totals:{[reciter]:seconds},days:{[day]:{[reciter]:seconds}}}),getScope:()=>scope,isEligible:()=>online,getDay:()=>day,getDevice:()=>deviceA,now:()=>clock,send:async packet=>{sent.push(packet);return{ok:true};}});
reporter.sample();
clock=1000;seconds++;reporter.sample();await Promise.resolve();
clock=2000;reporter.sample();
assert.equal(sent.length,1,'Paused playback creates no extra time');
online=false;clock=3000;seconds++;reporter.sample();
online=true;clock=4000;reporter.sample();
assert.equal(sent.length,1,'Reconnect does not resend the old sample');
clock=5000;seconds++;reporter.sample();await Promise.resolve();
assert.equal(sent.length,2);assert.equal(sent.at(-1).rows[0].total,103);
scope=b;clock=6000;seconds=25;reporter.sample();
assert.equal(sent.length,2,'Changing accounts establishes a fresh baseline');
reporter.stop();

const sockets=new Set();
const makeFrame=(revision,seconds)=>({day,revision,at:Date.now(),totals:{all:seconds,day:seconds,week:seconds,month:seconds}});
let frame=makeFrame(10,300);
function consumer(){
 const environment=new EventTarget();environment.document=new EventTarget();environment.document.hidden=false;
 environment.navigator={onLine:true};environment.setInterval=()=>1;environment.clearInterval=()=>{};
 environment.supabase={createClient(_url,_key,opts){
  assert.equal(opts.auth.persistSession,false);
  let callback;
  const channel={on(_type,filter,handler){assert.equal(filter.table,'salah_shared_listening');callback=handler;return this;},subscribe(){sockets.add(callback);return this;}};
  return{channel:()=>channel,removeAllChannels:async()=>sockets.delete(callback),realtime:{disconnect(){}}};
 }};
 const seen=[];
 const stream=createSharedListeningStream({getDay:()=>day,onChange:f=>seen.push(f?.totals.all),environment,fetcher:async()=>({ok:true,json:async()=>frame})});
 return{environment,seen,stream};
}
const clients=[consumer(),consumer()];
await new Promise(r=>setImmediate(r));
assert.deepEqual(clients.map(c=>c.stream.frame().totals.all),[300,300]);
frame=makeFrame(11,302);
for(const receive of sockets)receive({new:frame});
assert.deepEqual(clients.map(c=>c.stream.frame().totals.all),[302,302]);
clients[1].environment.navigator.onLine=false;clients[1].environment.dispatchEvent(new Event('offline'));
frame=makeFrame(12,303);
for(const receive of sockets)receive({new:frame});
assert.deepEqual(clients.map(c=>c.stream.frame().totals.all),[303,302]);
clients[1].environment.navigator.onLine=true;clients[1].environment.dispatchEvent(new Event('online'));
await new Promise(r=>setImmediate(r));
assert.deepEqual(clients.map(c=>c.stream.frame().totals.all),[303,303]);
for(const receive of sockets)receive({new:frame});
assert.deepEqual(clients.map(c=>c.seen),[[300,302,303],[300,302,303]]);
clients.forEach(c=>c.stream.close());assert.equal(sockets.size,0);
console.log('PASS: two viewers converge on the same measured total, pause and reconnect add no phantom seconds, persisted snapshots absorb live samples, and browser roles can read only aggregates.');
