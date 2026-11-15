import assert from 'node:assert/strict';
import{readFile}from 'node:fs/promises';
import{randomUUID}from 'node:crypto';
import{PGlite}from '../tests/staff/node_modules/@electric-sql/pglite/dist/index.js';
import{createUpdate501Db,update501Audience}from '../supabase/functions/background-reminders/update-501-db.mjs';
import{UPDATE_501_COPY,UPDATE_501_UNTIL,UPDATE_501_RECEIPTS_UNTIL,update501Notice,dispatchUpdate501}from '../supabase/functions/background-reminders/update-501.mjs';
import{firebaseUpdate501Payload}from '../supabase/functions/background-reminders/firebase-update-501.mjs';
import{createPushHandler,PUSH_ORIGIN}from '../supabase/functions/background-reminders/core.mjs';
const pg=new PGlite(),NOW=Date.parse('2026-11-16T12:00:00Z'),DAY=86400000,iso=value=>new Date(value).toISOString(),uuid=()=>randomUUID();
await pg.exec("create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,email_confirmed_at timestamptz,is_anonymous boolean,banned_until timestamptz);create table auth.sessions(id uuid primary key,user_id uuid,not_after timestamptz);create table public.app_presence(user_id uuid,app text,app_version integer,version_checked_at timestamptz);create table public.app_notification_status(user_id uuid,tab_id uuid,session_id uuid,permission text,enabled boolean,push_device_id uuid,checked_at timestamptz);create schema salah_visits_private;create table salah_visits_private.app_state_presence(user_id uuid,app_version integer,reported_at timestamptz);create schema salah_support_private;create table salah_support_private.native_devices(id uuid primary key,user_id uuid,session_id uuid,enabled boolean,token text,time_zone text,updated_at timestamptz);");
// Exercise the actual private cache/device schema. Only its unrelated pgcrypto
// config default is replaced for the isolated WASM PostgreSQL fixture.
const migration=(await readFile(new URL('../supabase/migrations/2026100201_background_reminders.sql',import.meta.url),'utf8')).replace('create extension if not exists pgcrypto with schema extensions;','').replace("default encode(extensions.gen_random_bytes(32),'hex')","default 'fixture-secret'");
await pg.exec(migration);
function tag(connection){
 // postgres@3.4.9 uses the server-inferred json/jsonb serializer even for a
 // JavaScript string. Model that boundary, so pre-serialized JSON cannot
 // accidentally become a JSON string scalar instead of an object or array.
 const sql=(parts,...values)=>{let text='';for(let i=0;i<parts.length;i++){text+=parts[i];if(i<values.length)text+='$'+(i+1)}const wire=values.map((value,i)=>/^::jsonb\b/.test(parts[i+1])?JSON.stringify(value):value);return connection.query(text,wire).then(result=>result.rows)};
 sql.begin=work=>connection.transaction(tx=>work(tag(tx)));return sql;
}
const db=createUpdate501Db(tag(pg)),sub={endpoint:'https://web.push.apple.com/fixture',keys:{p256dh:Buffer.from([4,...Array(64).fill(1)]).toString('base64url'),auth:Buffer.alloc(16,1).toString('base64url')}};
let deviceCounter=0;
async function person(options={}){
 const value={user:uuid(),session:uuid(),device:uuid(),tab:uuid(),...options};
 const confirmed=options.confirmed===false?null:iso(NOW-DAY),version=Object.hasOwn(options,'version')?options.version:500;
 await pg.query('insert into auth.users values($1,$2,$3,$4)',[value.user,confirmed,options.anonymous===true,options.banned?iso(NOW+DAY):null]);
 if(!options.noSession)await pg.query('insert into auth.sessions values($1,$2,$3)',[value.session,value.user,options.expiredSession?iso(NOW-1):null]);
 await pg.query("insert into public.app_presence values($1,'salah',$2,$3)",[value.user,version,iso(options.versionAt??NOW-3600000)]);
 if(options.native){
  await pg.query('insert into salah_support_private.native_devices values($1,$2,$3,$4,$5,$6,$7)',[value.device,value.user,value.session,options.enabled!==false,options.token===null?null:'N'.repeat(160),options.zone===null?null:options.zone||'UTC',iso(options.updatedAt??NOW-60000)]);
 }else{
  const prefs={city:{timezone:options.zone===null?null:options.zone||'UTC'},language:options.language||'ru',reminders:{enabled:options.enabled!==false}};
  await pg.query('insert into salah_push_private.devices(id,token_hash,endpoint_hash,subscription,preferences,enabled,updated_at)values($1,$2,$3,$4,$5,$6,$7)',[value.device,'a'.repeat(64),(++deviceCounter).toString(16).padStart(64,'0'),options.subscription===null?null:sub,prefs,options.enabled!==false,iso(options.updatedAt??NOW-60000)]);
  // enabled=false is legitimate for an opted-in dhikr/adhkar-only device.
  await pg.query('insert into public.app_notification_status values($1,$2,$3,$4,false,$5,$6)',[value.user,value.tab,value.session,options.permission||'granted',value.device,iso(options.statusAt??NOW-60000)]);
 }
 return value;
}
const good=await person(),native=await person({native:true}),quiet=await person({zone:'Pacific/Honolulu'}),both=await person({language:'en'});
const secondDevice=uuid();await pg.query('insert into salah_support_private.native_devices values($1,$2,$3,true,$4,$5,$6)',[secondDevice,both.user,both.session,'B'.repeat(160),'UTC',iso(NOW-30000)]);
const deniedNative=await person({native:true});await pg.query("insert into public.app_notification_status values($1,$2,$3,'denied',false,null,$4)",[deniedNative.user,uuid(),deniedNative.session,iso(NOW-1000)]);
const unsupportedNative=await person({native:true});await pg.query("insert into public.app_notification_status values($1,$2,$3,'unsupported',false,null,$4)",[unsupportedNative.user,uuid(),unsupportedNative.session,iso(NOW-1000)]);
const fresh501=await person();await pg.query('insert into salah_visits_private.app_state_presence values($1,501,$2)',[fresh501.user,iso(NOW-500)]);
const other501=await person();await pg.query("insert into public.app_presence values($1,'salah',501,$2)",[other501.user,iso(NOW-500)]);
const rebound=await person(),otherOwner=await person({version:null});await pg.query("insert into public.app_notification_status values($1,$2,$3,'granted',false,$4,$5)",[otherOwner.user,uuid(),otherOwner.session,rebound.device,iso(NOW-1000)]);
const webDenied=await person();await pg.query("insert into public.app_notification_status values($1,$2,$3,'denied',false,$4,$5)",[webDenied.user,uuid(),webDenied.session,webDenied.device,iso(NOW-1000)]);
const excluded=[deniedNative,fresh501,other501,rebound,webDenied];
for(const options of [{version:501},{version:502},{version:null},{version:0},{versionAt:NOW-91*DAY},{confirmed:false},{anonymous:true},{banned:true},{zone:'not/a/zone'},{zone:null},{noSession:true},{expiredSession:true},{enabled:false},{permission:'default'},{permission:'denied'},{subscription:null},{native:true,zone:null},{native:true,zone:'not/a/zone'},{native:true,noSession:true},{native:true,expiredSession:true},{native:true,enabled:false},{native:true,token:null},{native:true,updatedAt:NOW-91*DAY}])excluded.push(await person(options));
const audience=await update501Audience(tag(pg),NOW),users=new Set(audience.map(row=>row.user));
for(const value of [good,native,quiet,both,unsupportedNative])assert.ok(users.has(value.user),'valid consent/channel must remain eligible');
for(const value of excluded)assert.ok(!users.has(value.user),'unknown/current version, session, permission, binding, timezone or user must be excluded');
assert.equal(audience.find(row=>row.user===both.user).device,secondDevice);assert.equal(audience.filter(row=>row.user===both.user).length,1,'one chosen channel per user');
const preview=await db.update501Preview(NOW);assert.equal(preview.eligible,5);assert.equal(preview.web,2);assert.equal(preview.native,3);assert.equal(preview.quiet,1);
const previewJson=JSON.stringify(preview);for(const privateValue of [good.user,native.user,good.device,sub.endpoint,'nativeToken','subscription','token'])assert.ok(!previewJson.includes(privateValue));
assert.equal((await db.update501Jobs(NOW)).length,0,'deployment does not arm or send');
assert.deepEqual(await db.update501Arm(NOW),{version:501,armed:true,recipients:5,until:iso(UPDATE_501_UNTIL)});
assert.deepEqual(await db.update501Arm(NOW+1),{version:501,armed:false,alreadyArmed:true});
const records=(await pg.query("select key,rows,expires_at from salah_push_private.cache where key like 'update-501:%'")).rows;
assert.equal(records.length,6);assert.ok(records.every(row=>+new Date(row.expires_at)===UPDATE_501_RECEIPTS_UNTIL));assert.ok(records.every(row=>!JSON.stringify(row.rows).includes(sub.endpoint)&&!JSON.stringify(row.rows).includes('N'.repeat(160))));
assert.equal((await db.update501Jobs(NOW)).some(row=>row.user===quiet.user),false,'quiet jobs stay pending until their daytime');
assert.equal((await db.update501Jobs(Date.parse('2026-11-16T18:00:00Z'))).some(row=>row.user===quiet.user),true);
await pg.query("insert into salah_push_private.cache select 'update-501:user:00000000-0000-4000-8000-'||lpad(i::text,12,'0'),jsonb_build_object('user','00000000-0000-4000-8000-'||lpad(i::text,12,'0'),'channel','native','state','pending','timeZone','UTC'),$1::timestamptz from generate_series(1,101)i",[iso(UPDATE_501_RECEIPTS_UNTIL)]);
const webOnlyJobs=await db.update501Jobs(NOW,false);assert.ok(webOnlyJobs.some(row=>row.user===good.user));assert.ok(webOnlyJobs.every(row=>row.channel!=='native'),'missing native sender cannot occupy the batch and starve web recipients');
await pg.query("delete from salah_push_private.cache where key like 'update-501:user:00000000-0000-4000-8000-%'");
assert.deepEqual(await Promise.all([db.update501Claim(good.user,NOW),db.update501Claim(good.user,NOW)]),[true,false],'atomic one-attempt claim');
assert.ok(await db.update501Active(good.user,NOW));await db.update501Complete(good.user,'failed');assert.equal(await db.update501Claim(good.user,NOW+1),false,'unknown/failed gateway outcome never retries');
assert.equal(await db.update501Active(good.user,NOW),null);
const forUser=user=>({...db,update501Jobs:async()=>[{user}]});
let sends=0;assert.equal(await dispatchUpdate501({db:forUser(native.user),clock:()=>NOW,send:async(row,event)=>{sends++;assert.equal(row.channel,'native');assert.equal(event.body,UPDATE_501_COPY.ru);throw Error('unknown gateway outcome')}}),0);
assert.equal(await dispatchUpdate501({db:forUser(native.user),clock:()=>NOW,send:async()=>{sends++;return'sent'}}),0);assert.equal(sends,1);
await pg.query('delete from salah_support_private.native_devices where id=$1',[secondDevice]);
assert.equal(await db.update501Claim(both.user,NOW),false,'removed chosen native device must not fall back to existing web device');
assert.equal((await pg.query("select rows->>'state' state from salah_push_private.cache where key=$1",['update-501:user:'+both.user])).rows[0].state,'skipped');
const freshAfterClaim={...db,update501Jobs:async()=>[{user:unsupportedNative.user}],update501Active:async(user,now)=>{await pg.query('update salah_support_private.native_devices set enabled=false where user_id=$1',[user]);return db.update501Active(user,now)}};
await dispatchUpdate501({db:freshAfterClaim,clock:()=>NOW,send:async()=>{throw Error('fresh native optout must suppress send')}});
assert.equal((await pg.query("select rows->>'state' state from salah_push_private.cache where key=$1",['update-501:user:'+unsupportedNative.user])).rows[0].state,'skipped');
const before22=Date.parse('2026-11-16T21:59:30Z'),event=update501Notice({user:uuid(),device:uuid(),channel:'web',version:500,timeZone:'UTC',language:'en'},before22);
assert.equal(event.expiresAt-before22,30000);assert.equal(event.url,'#settings');assert.equal(event.kind,'app-update');assert.equal(event.body,UPDATE_501_COPY.en);
for(const code of ['ru','en','az','tg','uz','kk','de','ar'])assert.equal(update501Notice({user:uuid(),device:uuid(),channel:'web',version:500,timeZone:'UTC',language:code},NOW).body,UPDATE_501_COPY[code]);
for(const patch of [{version:null},{version:501},{version:0},{timeZone:'invalid'},{user:'bad'},{channel:'support'}])assert.equal(update501Notice({user:uuid(),device:uuid(),channel:'web',version:500,timeZone:'UTC',...patch},NOW),null);
assert.equal(update501Notice({user:uuid(),device:uuid(),channel:'web',version:500,timeZone:'UTC'},Date.parse('2026-11-16T22:00:00Z')),null);
const nativePayload=firebaseUpdate501Payload({token:'x'.repeat(160),timeZone:'UTC'},event,before22);assert.equal(nativePayload.message.android.ttl,'30s');assert.equal(nativePayload.message.notification.body,event.body);assert.equal(nativePayload.message.android.priority,'normal');assert.equal(nativePayload.message.data,undefined);assert.equal(nativePayload.message.android.notification.click_action,undefined);
for(const changed of [{body:'arbitrary text'},{url:'#support?thread=fake'},{kind:'support'},{expiresAt:before22},{expiresAt:before22+120001}])assert.throws(()=>firebaseUpdate501Payload({token:'x'.repeat(160),timeZone:'UTC'},{...event,...changed},before22));
// Real handler paths use only the fixed cron-secret actions and never return
// recipient identifiers or delivery credentials.
let time=NOW,webSent=[],nativeSent=[],configHook=null;
const config={cron_secret:'fixture-cron-secret',vapid:{publicKey:'fixture-public',privateKey:'fixture-private'}};
const runtimeDb={...db,config:async()=>{if(configHook)await configHook();return config},lease:async()=>true,release:async()=>{},competitionEvents:async()=>[],supportEvents:async()=>[],nativeSupportEvents:async()=>[],active:async()=>[],cleanup:async()=>{}};
const handler=createPushHandler({db:runtimeDb,clock:()=>time,webpush:{sendNotification:async(...args)=>webSent.push(args)},firebaseUpdateSender:async(device,event)=>{nativeSent.push(firebaseUpdate501Payload(device,event,time));return'sent'}});
const request=(action,{secret='fixture-cron-secret',origin,body}={})=>new Request('https://fixture.invalid/'+action,{method:'POST',headers:{...(secret?{'X-Salah-Cron':secret}:{}),...(origin?{Origin:origin}:{})},...(body?{body:JSON.stringify(body)}:{})});
assert.equal((await handler(request('update-501-preview',{secret:null}))).status,401);
assert.equal((await handler(request('update-501-arm',{secret:'wrong'}))).status,401);
assert.equal((await handler(request('update-501-arm',{origin:PUSH_ORIGIN}))).status,401);
assert.equal((await handler(request('update-501-preview',{origin:'https://evil.invalid'}))).status,403);
const report=await handler(request('update-501-preview'));assert.equal(report.status,200);const reportText=await report.text();assert.ok(!reportText.includes('fixture-cron-secret'));assert.ok(!reportText.includes(quiet.user));
// Insert fixed pending snapshots for newly-created fixtures only within the
// isolated DB. Public arm cannot add them to an already-armed campaign.
async function plan(value){await pg.query('insert into salah_push_private.cache values($1,$2,$3)', ['update-501:user:'+value.user,{user:value.user,device:value.device,channel:value.native?'native':'web',timeZone:'UTC',state:'pending'},iso(UPDATE_501_RECEIPTS_UNTIL)])}
const actualWeb=await person({language:'en'}),actualNative=await person({native:true});await plan(actualWeb);await plan(actualNative);
const missingNative=await person({native:true});await plan(missingNative);
const noSender=createPushHandler({db:{...runtimeDb,update501Jobs:async()=>[{user:missingNative.user,channel:'native'}]},clock:()=>time,webpush:{sendNotification:async()=>{throw Error('native job must not fall back to web')}}});
assert.equal((await(await noSender(request('dispatch'))).json()).delivered,0);assert.equal((await pg.query("select rows->>'state' state from salah_push_private.cache where key=$1",['update-501:user:'+missingNative.user])).rows[0].state,'pending','missing sender leaves job pending before a one-attempt claim');
await pg.query("delete from salah_push_private.cache where key=$1",['update-501:user:'+missingNative.user]);
const dispatched=await handler(request('dispatch'));assert.equal(dispatched.status,200);assert.equal((await dispatched.json()).delivered,2);assert.equal(webSent.length,1);assert.equal(nativeSent.length,1);
assert.equal(JSON.parse(webSent[0][1]).url,'#settings');assert.equal(JSON.parse(webSent[0][1]).body,UPDATE_501_COPY.en);assert.equal(webSent[0][2].urgency,'normal');assert.equal(webSent[0][2].TTL,120);
await handler(request('dispatch'));assert.equal(webSent.length,1);assert.equal(nativeSent.length,1);
const updated=await person(),signedOut=await person(),lateOptout=await person();await plan(updated);await plan(signedOut);await plan(lateOptout);
await pg.query('update public.app_presence set app_version=501 where user_id=$1',[updated.user]);await pg.query('delete from auth.sessions where user_id=$1',[signedOut.user]);
// Opt-out while config is awaited must be checked once more at the gateway.
configHook=async()=>{await pg.query('update salah_push_private.devices set enabled=false where id=$1',[lateOptout.device])};
await handler(request('dispatch'));assert.equal(webSent.length,1);configHook=null;
for(const value of [updated,signedOut])assert.equal((await pg.query("select rows->>'state' state from salah_push_private.cache where key=$1",['update-501:user:'+value.user])).rows[0].state,'skipped');
for(const role of ['anon','authenticated']){await pg.exec('set role '+role);await assert.rejects(pg.query("select * from salah_push_private.cache where key like 'update-501:%'"),/permission denied/);await pg.exec('reset role')}
time=UPDATE_501_UNTIL;assert.equal((await handler(request('update-501-arm'))).status,410);assert.equal((await db.update501Jobs(time)).length,0);assert.equal(await dispatchUpdate501({db,clock:()=>time,send:async()=>{throw Error('expired send')}}),0);
await pg.query('delete from salah_push_private.cache where expires_at<$1::timestamptz-interval \'2 days\'',[iso(UPDATE_501_UNTIL+6*DAY)]);assert.ok((await pg.query("select key from salah_push_private.cache where key like 'update-501:%'")).rows.length>0,'standard cleanup retains receipts beyond deadline');
await pg.query('delete from salah_push_private.cache');assert.deepEqual(await db.update501Arm(UPDATE_501_UNTIL+10*DAY),{version:501,expired:true,armed:false});assert.equal((await pg.query('select count(*)::int n from salah_push_private.cache')).rows[0].n,0,'deleted receipts cannot rearm past immutable deadline');
await pg.close();
console.log('PASS: actual PostgreSQL update501 audience/once claims/private cache, fixed-deadline arming, fresh version/session/consent/binding, native/web delivery, quiet hours/TTL, no retries/fallback, secret-only aggregate endpoints and no rearm after cleanup.');
