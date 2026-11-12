import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import{randomUUID}from 'node:crypto';
import{PGlite}from '../tests/staff/node_modules/@electric-sql/pglite/dist/index.js';
import{guestRankPacket,guestRankHash,createGuestRankHandler}from '../supabase/functions/guest-competition/core.mjs';
import{createGuestRankDb}from '../supabase/functions/guest-competition/db.mjs';
import{combinedPublicBoard}from '../supabase/functions/reciter-competition/guest-board.mjs';
import{createGuestCompetitionTracker}from '../dist/js/guest-competition-core.js';
import{createListeningMeter,listeningDayKey}from '../dist/js/reciter-popularity-core.js';
import{safeListener}from '../dist/js/reciter-ranking-core.js';
import{competitionMarkup}from '../dist/js/competition-view.js';
import{ownerUserCard}from '../dist/js/owner-user-card.js';
const device=randomUUID(),activity=randomUUID(),secret='a'.repeat(64),user={id:randomUUID(),session:randomUUID()},other={id:randomUUID(),session:randomUUID()},day=listeningDayKey(Date.now()),reciter='ar.alafasy';
const pg=new PGlite();await pg.exec(`create role anon;create role authenticated;create role service_role bypassrls;
create schema auth;create schema storage;create schema salah_competition_private;create schema salah_visits_private;
create table auth.users(id uuid primary key,email_confirmed_at timestamptz,is_anonymous boolean,banned_until timestamptz,raw_user_meta_data jsonb);
create table auth.sessions(id uuid primary key,user_id uuid,not_after timestamptz);
create table storage.objects(bucket_id text,name text);
create table public.reciter_listener_visibility(user_id uuid primary key,public_id uuid,mode text,listener_hash text);
create table public.reciter_popularity_minutes(listener_hash text,day date,reciter text,minutes integer,extra_seconds integer);
create table salah_competition_private.preferences(user_id uuid primary key,enabled boolean);
create table salah_competition_private.totals(user_id uuid,device_id uuid,reciter text,seconds bigint,initial_seconds bigint);
create table salah_competition_private.days(user_id uuid,device_id uuid,day date,reciter text,seconds integer,initial_seconds integer);
create table salah_competition_private.legacy(user_id uuid,reciter text,seed_seconds bigint,seconds bigint);
create table salah_competition_private.legacy_days(user_id uuid,reciter text,day date,seconds bigint);
create table salah_competition_private.favorite_state(user_id uuid,period text,bucket date,reciter text);
create table salah_competition_private.listener_presence(user_id uuid,session_id uuid,playing boolean,reported_at timestamptz);
create table salah_visits_private.guest_activity_presence(device_hash text,kind text,active boolean,reported_at timestamptz);
create table salah_visits_private.activity_budgets(bucket timestamptz primary key,hits integer);
create table salah_visits_private.activity_daily_budgets(day date primary key,hits integer);`);
await pg.exec(await fs.readFile(new URL('../supabase/guest-competition.sql',import.meta.url),'utf8'));
for(const u of [user,other]){
 await pg.query("insert into auth.users values($1,now(),false,null,'{\"nickname\":\"Private account\"}')",[u.id]);await pg.query('insert into auth.sessions values($1,$2,null)',[u.session,u.id]);
 await pg.query('insert into salah_competition_private.preferences values($1,true)',[u.id]);await pg.query("insert into public.reciter_listener_visibility values($1,$2,'initial',null)",[u.id,randomUUID()]);
}
await pg.query('insert into salah_competition_private.totals values($1,$2,$3,19,19)',[user.id,randomUUID(),reciter]);
await pg.query('insert into salah_competition_private.days values($1,$2,$3,$4,19,19)',[user.id,randomUUID(),day,reciter]);
function tag(connection){
 const sql=(parts,...args)=>{let query='';const values=[];parts.forEach((part,i)=>{query+=part;if(i<args.length){values.push(args[i]);query+='$'+values.length;}});
 return{then(resolve,reject){return(query.includes('pg_advisory_xact_lock')?Promise.resolve([]):connection.query(query,values).then(r=>r.rows)).then(resolve,reject);}};};
 sql.json=JSON.stringify;sql.begin=fn=>connection.transaction(tx=>fn(tag(tx)));return sql;
}
const sql=tag(pg),db=createGuestRankDb(sql),packet=(action,extra={})=>guestRankPacket({action,device,secret,...extra});
const registered=await db.apply(packet('register',{activity}));assert.match(registered.nickname,/^Гость [A-F0-9]{6}$/);assert.ok(!JSON.stringify(registered).includes(secret));
assert.equal((await db.apply(packet('register',{activity}))).id,registered.id,'Registration retries use one player');
await assert.rejects(db.apply(guestRankPacket({action:'register',device,activity,secret:'b'.repeat(64)})),/forbidden/);
await pg.query("update salah_competition_private.guest_players set created_at=now()-interval '120 seconds'");
const snapshot=(seconds=60,days={[day]:{[reciter]:seconds}})=>packet('snapshot',{totals:{[reciter]:seconds},days,timeZone:'UTC'});
await db.apply(snapshot());await db.apply(snapshot());await db.apply(snapshot(30));
assert.equal(Number((await pg.query('select seconds from salah_competition_private.guest_totals')).rows[0].seconds),60,'Retries and stale snapshots cannot double or decrease time');
await assert.rejects(db.apply(snapshot(5000)),/invalid_growth/);
const secondDay=new Date(Date.now()-86400000).toISOString().slice(0,10);
await assert.rejects(db.apply(snapshot(60,{[secondDay]:{[reciter]:60}})),/invalid_growth/);
let board=await combinedPublicBoard(sql,'all',day,{},true);assert.equal(board.listeningTotal,79);assert.equal(board.items[0].guest,true);assert.equal(board.items[0].rank,1);assert.equal(board.items[0].totalSeconds,60);assert.equal(board.items[1].totalSeconds,19);
assert.ok(!JSON.stringify(board).includes(secret)&&!JSON.stringify(board).includes(device)&&!JSON.stringify(board).includes(user.id)&&!JSON.stringify(board).includes('Private account'));
const guest=safeListener(board.items[0]);assert.equal(guest.guest,true);assert.equal(guest.hasPhoto,false);
const html=competitionMarkup(board.items,{owner:true},'total');assert.ok(!html.includes('data-competition-person="'+registered.id+'"'),'Guest rows do not open a nonexistent account card');
const headHash=await guestRankHash('salah-guest-v1:',activity);await pg.query("insert into salah_visits_private.guest_activity_presence values($1,'listening',true,now())",[headHash]);assert.equal((await combinedPublicBoard(sql,'all',day,{},true)).items[0].activeForSeconds,45);
await db.apply(packet('claim'),user);await db.apply(packet('claim'),user);
await assert.rejects(db.apply(packet('claim'),other),/claimed/);await assert.rejects(db.apply(snapshot(70)),/claimed/);
for(const period of ['day','week','month','all']){const transferred=await combinedPublicBoard(sql,period,day,{},true);assert.equal(transferred.items.length,1);assert.equal(transferred.items[0].guest,undefined);assert.equal(transferred.items[0].totalSeconds,79);assert.equal(transferred.listeningTotal,79,'Ownership transfer conserves the shared total');}
const next={action:'register',device:randomUUID(),activity,secret:'c'.repeat(64)};await db.apply(guestRankPacket(next));await pg.query('delete from auth.sessions where id=$1',[other.session]);await assert.rejects(db.apply(guestRankPacket({action:'claim',device:next.device,secret:next.secret}),other));
for(const role of ['anon','authenticated']){await pg.exec('set role '+role);await assert.rejects(pg.query('select secret_hash from salah_competition_private.guest_players'),/permission denied/);await pg.exec('reset role');}
const rls=(await pg.query("select relrowsecurity from pg_class where relname in('guest_players','guest_totals','guest_days')")).rows;assert.equal(rls.length,3);assert.ok(rls.every(x=>x.relrowsecurity));
const handler=createGuestRankHandler(db),req=(body,origin='https://skodytunez-maker.github.io')=>new Request('https://fixture.invalid',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
assert.equal((await handler(req({action:'claim',device,secret}))).status,401);assert.equal((await handler(req({action:'register',device,secret,activity},'https://other.invalid'))).status,403);assert.equal((await handler(req({action:'register',device,secret,activity,user_id:user.id}))).status,400);
await pg.close();
// Real media progress feeds a durable guest-only ledger, and claiming is retry-safe.
let auth={identityKnown:false,signedIn:false,userId:null},state=null,clock=Date.now(),remoteClaimed=false,lost=false,calls=[];
const clone=s=>s?structuredClone(s):null;
const tracker=createGuestCompetitionTracker({getAccount:()=>auth,readState:()=>clone(state),writeState:s=>(state=clone(s),true),randomId:()=>device,randomSecret:()=>secret,activityDevice:()=>activity,now:()=>clock,
 send:async(body,options)=>{calls.push({body,options});if(body.action==='register')return{ok:true,id:registered.id};if(body.action==='snapshot'&&remoteClaimed){const e=Error('claimed');e.status=409;throw e;}if(body.action==='claim'){remoteClaimed=true;if(!lost){lost=true;throw Error('lost response');}}return{ok:true};}});
await tracker.sync({force:true});assert.equal(calls.length,0);assert.equal(await tracker.progress(reciter,10),false);
auth={identityKnown:true,signedIn:false,userId:null};await tracker.sync({force:true});assert.equal(state.enrolled,true);
const meter=createListeningMeter({onProgress:(_,n)=>void tracker.progress(reciter,n,clock)});
const audio=(position,status='playing',seekRevision=0)=>({reciter,surah:{number:1},positionSeconds:position,status,seekRevision});
meter.sample(audio(0),clock,true);clock+=1000;meter.sample(audio(1),clock,true);await new Promise(resolve=>setImmediate(resolve));assert.equal(state.totals[reciter],1);
clock+=10000;meter.sample(audio(1,'paused'),clock,true);await new Promise(resolve=>setImmediate(resolve));assert.equal(state.totals[reciter],1,'Pause/stationary audio creates no seconds');
clock+=1000;meter.sample(audio(500,'playing',1),clock,true);await new Promise(resolve=>setImmediate(resolve));assert.equal(state.totals[reciter],1,'Seeking creates no seconds');
auth={identityKnown:true,signedIn:true,userId:user.id};clock+=20000;await tracker.sync({force:true});assert.equal(state.claimedBy,null,'A lost response does not clear unconfirmed transfer');clock+=20000;await tracker.sync({force:true});assert.equal(state.claimedBy,user.id);assert.equal(calls.filter(x=>x.body.action==='claim').length,2);
assert.equal(await tracker.progress(reciter,20),false,'Registered playback cannot continue the old guest ledger');
const card=ownerUserCard({id:user.id,nickname:'Fixture',appVersion:478,versionCheckedAt:'2026-11-12T10:00:00Z'});assert.match(card,/Версия SALAH/);assert.match(card,/>478</);
assert.ok(!ownerUserCard({id:user.id,appVersion:'<script>',versionCheckedAt:'bad'}).includes('<script>'),'Invalid version metadata stays unknown');
console.log('PASS: guest capability, actual PostgreSQL ledger/ranking, retry/stale bounds, private RLS, one-time authenticated transfer with conserved totals, real media progress and restored owner-only app version.');
