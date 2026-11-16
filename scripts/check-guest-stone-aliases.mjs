import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import{randomUUID}from 'node:crypto';
import{PGlite}from '../tests/staff/node_modules/@electric-sql/pglite/dist/index.js';
import{safeListener}from '../dist/js/reciter-ranking-core.js';
import{combinedPublicBoard}from '../supabase/functions/reciter-competition/guest-board.mjs';

const pg=new PGlite(),schema='salah_competition_private';
await pg.exec(`create role anon;create role authenticated;create role service_role bypassrls;
create schema ${schema};create table ${schema}.guest_players(public_id uuid primary key,claimed_by uuid,created_at timestamptz not null);
grant select on ${schema}.guest_players to service_role;`);
// Insert out of ID order, including two equal creation times. Assignment timestamps
// may legitimately tie, so they are never used to infer the order of assignment.
const previous=['33333333-3333-4333-8333-333333333333','22222222-2222-4222-8222-222222222222','00000000-0000-4000-8000-000000000000','11111111-1111-4111-8111-111111111111'];
const createdAt=[1000,2000,3000,2000];
for(let i=0;i<previous.length;i++)await pg.query(`insert into ${schema}.guest_players values($1,null,$2)`,[previous[i],new Date(createdAt[i]).toISOString()]);
await pg.exec(await fs.readFile(new URL('../supabase/migrations/20261114230126_guest_stone_aliases.sql',import.meta.url),'utf8'));
const aliases=async()=>((await pg.query(`select * from ${schema}.guest_aliases order by guest_id`)).rows);
const ensure=async id=>(await pg.query(`select ${schema}.ensure_guest_alias($1) as nickname`,[id])).rows[0].nickname;
const add=async()=>{const id=randomUUID();await pg.query(`insert into ${schema}.guest_players values($1,null,now())`,[id]);return id;};
const backfilled=new Map((await aliases()).map(row=>[row.guest_id,row.nickname]));
assert.deepEqual(previous.map(id=>backfilled.get(id)),['Гость · Янтарь','Гость · Нефрит','Гость · Агат','Гость · Сапфир'],'Backfill assigns by creation time, then public ID for equal creation times, independently of insertion order or assigned_at ties');
const before=(await aliases()).find(row=>row.guest_id===previous[0]);
assert.equal(await ensure(previous[0]),before.nickname);assert.equal(await ensure(previous[0]),before.nickname);
const after=(await aliases()).find(row=>row.guest_id===previous[0]);assert.deepEqual(after,before,'Retries never rename or re-date an assigned alias');
assert.equal(await ensure(randomUUID()),null,'The helper cannot enroll an unknown guest');
assert.equal((await aliases()).length,4);
for(let i=0;i<80;i++)assert.match(await ensure(await add()),/^Гость · [А-ЯЁ]/);
const at=async ordinal=>{await pg.query(`select setval('${schema}.guest_alias_sequence',$1::bigint,false)`,[String(ordinal)]);return ensure(await add());};
assert.equal(await at(1057),'Гость · Тихий светлый янтарь','The third naming tier stays friendly after all simple adjective/stone combinations');
assert.equal(await at(16506),'Гость · Ласковый серебристый александрит');
assert.equal(await at(17440),'Гость · Ласковый весенний корунд');
assert.equal(await at(17441),'Гость · Янтарь 17441','Finite friendly-pool exhaustion must not prevent guest enrollment');
assert.ok((await at('9223372036854775806')).length<=40,'The overflow name still fits the existing listener-name limit');
const all=await aliases();assert.equal(new Set(all.map(row=>row.nickname)).size,all.length);assert.ok(all.every(row=>row.nickname.length<=40&&!row.nickname.includes(row.guest_id)));
await pg.query(`update ${schema}.guest_players set claimed_by=$1 where public_id=$2`,[randomUUID(),previous[0]]);
assert.equal(await ensure(previous[0]),before.nickname,'Claiming a ledger retains its alias without assigning it to another profile');
await pg.query(`select setval('${schema}.guest_alias_sequence',100,false)`);
const serviceId=await add();await pg.exec('set role service_role');
assert.match(await ensure(serviceId),/^Гость · /,'Service execution works with SELECT on ledgers, INSERT on aliases and sequence USAGE only');
assert.equal((await pg.query(`select has_table_privilege(current_user,'${schema}.guest_aliases','UPDATE') as allowed`)).rows[0].allowed,false);
await assert.rejects(pg.query(`update ${schema}.guest_aliases set nickname='Гость · Изменён' where guest_id=$1`,[serviceId]),/permission denied/);
await pg.exec('reset role');
for(const role of ['anon','authenticated']){
 await pg.exec('set role '+role);
 await assert.rejects(pg.query(`select * from ${schema}.guest_aliases`),/permission denied/);
 await assert.rejects(ensure(previous[0]),/permission denied/);
 await pg.exec('reset role');
}
const security=(await pg.query(`select p.prosecdef,c.relrowsecurity from pg_proc p join pg_namespace n on n.oid=p.pronamespace cross join pg_class c where p.proname='ensure_guest_alias' and n.nspname=$1 and c.oid=$2::regclass`,[schema,schema+'.guest_aliases'])).rows[0];
assert.deepEqual(security,{prosecdef:false,relrowsecurity:true});
assert.deepEqual((await pg.query(`select column_name from information_schema.columns where table_schema=$1 and table_name='guest_aliases' order by ordinal_position`,[schema])).rows.map(row=>row.column_name),['guest_id','nickname','assigned_at'],'Aliases introduce no city, device or account-history fields');
await pg.close();

const person={id:randomUUID(),mode:'profile',nickname:'Гость · Янтарь',initial:'Г',hasPhoto:true};
assert.equal(safeListener({...person,guest:true}).guest,true);assert.equal(safeListener({...person,guest:true}).hasPhoto,false);
assert.equal(safeListener({...person,guest:false}).guest,undefined,'A registered account using a similar nickname is not reclassified as a guest');
assert.equal(safeListener(person).guest,undefined);assert.equal(safeListener({...person,nickname:'Гость ABCDEF',guest:true}).guest,true,'Cached legacy guest labels remain guest-safe');
assert.equal(safeListener({...person,nickname:'Гость',guest:true}).guest,true,'An unmatched guest retains the anonymous fallback');
for(const nickname of ['Гость · '+ 'x'.repeat(40),'Гость · \nЯнтарь'])assert.equal(safeListener({...person,nickname,guest:true}).guest,undefined);
// The real board query returns one SQL snapshot envelope, including its aggregate
// and revision. Keep the guest row unchanged while exercising that current shape.
const board=await combinedPublicBoard(async()=>[{items:[{id:person.id,guest:true,nickname:person.nickname,reciter:'idris',seconds:60,place:1,active_for_seconds:0,listening_total:60}],listening_total:60,revision:Date.now()*1000}],'day','2026-11-15');
const wire=board.items[0];assert.equal(wire.nickname,'Гость '+person.id.slice(0,6).toUpperCase());assert.equal(wire.guestDisplayName,person.nickname);
assert.ok(wire.guest===true&&/^Гость [A-F0-9]{6}$/.test(wire.nickname),'The old client guest predicate still matches a new board response during rollout');
assert.equal(safeListener(wire).nickname,person.nickname);assert.equal(safeListener(wire).guest,true);assert.equal(safeListener(wire).hasPhoto,false);
assert.equal(safeListener({...wire,guest:false}).guest,undefined);assert.equal(safeListener({...wire,guest:false}).nickname,wire.nickname,'Extra display fields never reclassify an ordinary account');
assert.equal(safeListener({...wire,guestDisplayName:'Гость · \nBad'}).nickname,wire.nickname);assert.equal(safeListener({...wire,guestDisplayName:'Гость · \nBad'}).guest,true,'Malformed friendly names preserve the safe legacy guest fallback');
console.log('PASS: real private migration/backfill, stable unique guest stone aliases across naming tiers and pool overflow, least-privilege service execution, no client grants/SECURITY DEFINER/geography, legacy wire guest detection and new friendly display with explicit guest flag. No production writes.');
