import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import{PGlite}from '../tests/staff/node_modules/@electric-sql/pglite/dist/index.js';
const migration=await fs.readFile(new URL('../supabase/migrations/20261016012000_competition_period_seed_consistency.sql',import.meta.url),'utf8');
assert.ok(!/\b(insert|update|delete|truncate|grant|revoke|security\s+definer)\b/i.test(migration),'Repair reads existing history without changing data or widening access');
const db=new PGlite();
await db.exec(`create schema salah_competition_private;
create table salah_competition_private.totals(user_id uuid,device_id uuid,reciter text,seconds bigint,initial_seconds bigint);
create table salah_competition_private.days(user_id uuid,device_id uuid,day date,reciter text,seconds bigint,initial_seconds bigint);
create table salah_competition_private.legacy(user_id uuid,reciter text,seconds bigint,seed_seconds bigint);
create table salah_competition_private.legacy_days(user_id uuid,day date,reciter text,seconds bigint);
create table public.reciter_listener_visibility(user_id uuid,listener_hash text);
create table public.reciter_popularity_minutes(listener_hash text,day date,reciter text,minutes integer,extra_seconds integer);
insert into public.reciter_listener_visibility values('11111111-1111-4111-8111-111111111111','a'),('22222222-2222-4222-8222-222222222222','b'),('33333333-3333-4333-8333-333333333333','c');
-- Observed failure: lifetime import seed is zero, but a later minute is present
-- in legacy_days. It is already included in the 85-second device snapshot.
insert into salah_competition_private.totals values('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','one',85,3);
insert into salah_competition_private.days values('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','2026-10-16','one',85,3);
insert into salah_competition_private.legacy values('11111111-1111-4111-8111-111111111111','one',60,0);
insert into salah_competition_private.legacy_days values('11111111-1111-4111-8111-111111111111','2026-10-16','one',60);
insert into public.reciter_popularity_minutes values('a','2026-10-16','one',1,0);
-- Genuine imported history remains, but later daily baselines cannot exceed
-- the original 100-second lifetime baseline. Two devices add real growth.
insert into salah_competition_private.totals values('22222222-2222-4222-8222-222222222222','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','one',70,50),('22222222-2222-4222-8222-222222222222','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','one',70,50);
insert into salah_competition_private.days values('22222222-2222-4222-8222-222222222222','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','2026-10-01','one',70,50),('22222222-2222-4222-8222-222222222222','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','2026-10-16','one',70,50);
insert into salah_competition_private.legacy values('22222222-2222-4222-8222-222222222222','one',100,100);
insert into salah_competition_private.legacy_days values('22222222-2222-4222-8222-222222222222','2026-10-01','one',50),('22222222-2222-4222-8222-222222222222','2026-10-16','one',80);
-- Minute-channel growth can arrive before the next snapshot/ensure call.
insert into salah_competition_private.totals values('33333333-3333-4333-8333-333333333333','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','one',10,0);
insert into salah_competition_private.days values('33333333-3333-4333-8333-333333333333','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','2026-10-16','one',10,0);
insert into salah_competition_private.legacy values('33333333-3333-4333-8333-333333333333','one',5,0);
insert into public.reciter_popularity_minutes values('c','2026-10-16','one',0,18);
`);
await db.exec(migration);
const score=async(period,user)=>(await db.query('select seconds from public.competition_scores($1,$2::date) where user_id=$3::uuid',[period,'2026-10-16',user])).rows[0]?.seconds;
const first='11111111-1111-4111-8111-111111111111',second='22222222-2222-4222-8222-222222222222',third='33333333-3333-4333-8333-333333333333';
for(const p of ['day','week','month','all'])assert.equal(await score(p,first),85,'A late legacy minute is not added to snapshot growth again');
assert.equal(await score('all',second),140);assert.equal(await score('month',second),140,'Real legacy history and growth from both devices remain');
assert.equal(await score('day',second),70,'Daily baseline only receives its share of the lifetime import');
for(const p of ['day','week','month','all'])assert.equal(await score(p,third),18,'Fresh raw minute history is available in lifetime scores too');
for(const u of [first,second,third])for(const p of ['day','week','month'])assert.ok(await score(p,u)<=await score('all',u));
assert.equal(Number((await db.query('select sum(seconds) n from salah_competition_private.legacy_days')).rows[0].n),190,'The repair does not rewrite source history');
await db.close();
console.log('PASS: late-import duplication, bounded real legacy history, multi-device growth and fresh minute-channel lifetime totals.');
