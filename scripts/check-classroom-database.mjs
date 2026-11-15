import{PGlite}from '../tests/staff/node_modules/@electric-sql/pglite/dist/index.js';import fs from 'node:fs/promises';import assert from 'node:assert/strict';
import{createPushHandler,digest}from '../supabase/functions/background-reminders/core.mjs';
import{classroomPushEvent}from '../supabase/functions/background-reminders/classroom-push.mjs';
import{reminderNotificationText}from '../dist/js/notification-language.js';
const db=new PGlite();await db.exec("create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email_confirmed_at timestamptz,is_anonymous boolean,banned_until timestamptz);create table auth.sessions(id uuid primary key,user_id uuid references auth.users);create table public.app_notification_status(user_id uuid,session_id uuid,permission text,push_device_id uuid,checked_at timestamptz);create schema salah_push_private;create table salah_push_private.devices(id uuid primary key,subscription jsonb,preferences jsonb,updated_at timestamptz);");
const schema=await fs.readFile(new URL('../supabase/migrations/20261026114530_private_classroom_schedule.sql',import.meta.url),'utf8');await db.exec(schema);await db.exec(await fs.readFile(new URL('../supabase/migrations/20261026120131_private_classroom_active_reminder_index.sql',import.meta.url),'utf8'));
const rights=await db.query("select c.relname,c.relrowsecurity,has_table_privilege('anon',c.oid,'select') a,has_table_privilege('authenticated',c.oid,'select') u from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='salah_classroom_private' and c.relkind='r'");assert.equal(rights.rows.length,3);assert.ok(rights.rows.every(r=>r.relrowsecurity&&!r.a&&!r.u));assert.equal((await db.query("select has_schema_privilege('authenticated','salah_classroom_private','usage') allowed")).rows[0].allowed,false);
const now=Date.now(),owner='dc1eb1cc-6f8f-472f-a937-735fbfbba4b7',user='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222',session='33333333-3333-4333-8333-333333333333',device='44444444-4444-4444-8444-444444444444',id='A'.repeat(32);
for(const uid of [owner,user,other])await db.query("insert into auth.users(id,email_confirmed_at,is_anonymous)values($1,now(),false)",[uid]);
await db.query('insert into auth.sessions(id,user_id)values($1,$2)',[session,user]);
await db.query('insert into salah_push_private.devices(id,subscription,updated_at)values($1,$2::jsonb,now())',[device,JSON.stringify({endpoint:'https://web.push.apple.com/fixture'})]);
await db.query("insert into public.app_notification_status values($1,$2,'granted',$3,now()-interval '1 minute')",[user,session,device]);
await db.query("insert into salah_classroom_private.lessons(id,owner_id,invite_hash,details,starts_at,ends_at,reminder_at)values($1,$2,$3,$4::jsonb,to_timestamp($5/1000.0),to_timestamp($6/1000.0),to_timestamp($7/1000.0))",[id,owner,'a'.repeat(64),JSON.stringify({title:'Арабский язык',timeZone:'Asia/Yekaterinburg',maxParticipants:10}),now+10800000,now+14400000,now-20000]);
await db.query('insert into salah_classroom_private.enrollments values($1,$2,$3,true,now())',[id,user,'Ученик']);
const runtime=await fs.readFile(new URL('../supabase/functions/background-reminders/runtime.txt',import.meta.url),'utf8');
const eventSql=/async classroomEvents\(now\)\{return sql`([\s\S]*?)`;\}/.exec(runtime)?.[1];const activeSql=/async classroomActive\(device,id,revision\)\{const\[r\]=await sql`([\s\S]*?)`;/.exec(runtime)?.[1];assert.ok(eventSql&&activeSql);
const candidates=()=>db.query(eventSql.replaceAll('${now}',String(now)));
const current=()=>db.query(activeSql.replaceAll('${id}',"'"+id+"'").replaceAll('${revision}','1').replaceAll('${device}',"'"+device+"'"));
assert.equal((await candidates()).rows.length,1);assert.equal((await current()).rows[0].active,true);
// Use the actual private adapter projection, not a hand-made row containing
// preferences: otherwise a missing SELECT column is hidden by formatter tests.
const sent=[],ledger=new Map();
const dispatchDb={
 config:async()=>({cron_secret:'fixture-cron',vapid:{publicKey:'fixture-public',privateKey:'fixture-private'}}),
 lease:async()=>true,release:async()=>{},cleanup:async()=>{},active:async()=>[],
 classroomEvents:async()=>{const result=await candidates();return result.rows;},
 classroomActive:async()=>Boolean((await current()).rows[0].active),
 claim:async(device,hash)=>{const key=device+':'+hash;if(ledger.has(key))return false;ledger.set(key,'sending');return true;},
 complete:async(device,hash,state)=>ledger.set(device+':'+hash,state)
};
const dispatch=createPushHandler({db:dispatchDb,clock:()=>now,webpush:{sendNotification:async(subscription,text,options)=>sent.push({subscription,payload:JSON.parse(text),options})}});
const runDispatch=async()=>{const response=await dispatch(new Request('https://fixture.invalid/background-reminders/dispatch',{method:'POST',headers:{'X-Salah-Cron':'fixture-cron'}}));assert.equal(response.status,200);return response.json();};
let originalIdentity=null;
for(const language of ['en','ar',undefined]){
 const preferences={city:{name:'private-city-marker',latitude:11.25,longitude:22.5,timezone:'private-zone-marker'},history:{secret:'private-history-marker'},email:'private-email-marker',token:'private-secret-marker',...(language?{language}:{})};
 await db.query('update salah_push_private.devices set preferences=$1::jsonb where id=$2',[JSON.stringify(preferences),device]);
 const projected=(await candidates()).rows[0];assert.deepEqual(projected.preferences,preferences,'The authenticated adapter carries the existing device language privately');
 const sourceEvent=classroomPushEvent(projected,now);assert.ok(sourceEvent);
 ledger.clear();sent.length=0;assert.equal((await runDispatch()).delivered,1);assert.equal(sent.length,1);
 const payload=sent[0].payload,selected=language||'ru';
 assert.equal(payload.language,selected);assert.equal(payload.body,reminderNotificationText(sourceEvent,selected));assert.ok(payload.body.includes('Арабский язык'),'The original lesson title is not translated');
 assert.equal(payload.tag,'salah-push-'+sourceEvent.hash);assert.equal(payload.at,sourceEvent.at);assert.equal(payload.expiresAt,Math.min(sourceEvent.startsAt,sourceEvent.at+15*60000));assert.equal(payload.user,user);assert.equal(payload.lessonId,id);assert.equal(payload.url,'#lesson?class='+id);
 assert.deepEqual(Object.keys(payload).sort(),['title','body','language','tag','url','kind','user','lessonId','at','expiresAt'].sort());
 assert.doesNotMatch(JSON.stringify(payload),/preferences|latitude|longitude|history|email|token|private-(?:city|zone|history|email|secret)-marker/,'Private preference fields never enter the delivery payload');
 const identity={tag:payload.tag,at:payload.at,expiresAt:payload.expiresAt,kind:payload.kind,url:payload.url,user:payload.user,lessonId:payload.lessonId};
 if(originalIdentity)assert.deepEqual(identity,originalIdentity,'Locale does not change delivery identity or instants');else originalIdentity=identity;
 assert.equal((await runDispatch()).delivered,0,'An already sent reminder is not repeated');
 await db.query('update salah_push_private.devices set preferences=$1::jsonb where id=$2',[JSON.stringify({...preferences,language:language==='en'?'ar':'en'}),device]);
 assert.equal((await runDispatch()).delivered,0,'Changing language does not resend the same reminder');assert.equal(sent.length,1);
}
console.log('PASS: actual classroom SQL projection reaches the real push sender in English, Arabic and legacy Russian; identity, expiry, source title and dedup stay unchanged, private preferences stay out of the payload.');

await db.query("update salah_classroom_private.lessons set state='live'");assert.equal((await candidates()).rows.length,1,'early-open live room still receives its scheduled reminder');assert.equal((await current()).rows[0].active,true);await db.query("update salah_classroom_private.lessons set state='planned'");
await db.query('update salah_classroom_private.enrollments set reminders_enabled=false');assert.equal((await candidates()).rows.length,0);assert.equal((await current()).rows[0].active,false);
await db.query('update salah_classroom_private.enrollments set reminders_enabled=true');await db.query("insert into public.app_notification_status values($1,$2,'granted',$3,now())",[other,'55555555-5555-4555-8555-555555555555',device]);assert.equal((await candidates()).rows.length,0,'changed account on the device excludes the old owner');assert.equal((await current()).rows[0].active,false);
await db.query('delete from public.app_notification_status where user_id=$1',[other]);await db.query('delete from auth.sessions');assert.equal((await candidates()).rows.length,0,'revoked session excludes delivery');await db.query('insert into auth.sessions(id,user_id)values($1,$2)',[session,user]);
await db.query("update salah_classroom_private.lessons set state='cancelled'");assert.equal((await candidates()).rows.length,0);assert.equal((await current()).rows[0].active,false);
await db.query("update salah_classroom_private.lessons set state='planned',revision=2");assert.equal((await current()).rows[0].active,false,'stale revision is rejected before send');
await db.query("update salah_classroom_private.lessons set reminder_at=now()-interval '10 minutes'");assert.equal((await candidates()).rows.length,0,'missed reminders are not sent late');
await db.close();console.log('PASS: actual PostgreSQL schema, all tables RLS, no browser-role reads, enrolled/opt-in-only delivery, account/device reassignment, revoked session, cancellation, revision and stale-time safeguards. No remote database was modified.');
