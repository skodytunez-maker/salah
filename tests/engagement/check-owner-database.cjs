const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const requireStaff=require('node:module').createRequire(path.resolve(__dirname,'../staff/package.json'));const{PGlite}=requireStaff('@electric-sql/pglite');
async function run(){
 const db=await PGlite.create();let checks=0;const now=Date.parse('2026-11-02T07:00:00Z'),day=86400000,iso=n=>new Date(n).toISOString();const yes=(v,note)=>{assert.ok(v,note);checks++;};
 const owner='dc1eb1cc-6f8f-472f-a937-735fbfbba4b7',users=[owner,crypto.randomUUID(),crypto.randomUUID()],sessions=users.map(()=>crypto.randomUUID()),webId=crypto.randomUUID(),nativeId=crypto.randomUUID();
 try{
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema salah_push_private;create schema salah_support_private;
   create table auth.users(id uuid primary key,email_confirmed_at timestamptz,is_anonymous boolean default false,banned_until timestamptz,created_at timestamptz,last_sign_in_at timestamptz);
   create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id)on delete cascade,not_after timestamptz);
   create table auth.mfa_factors(user_id uuid references auth.users(id)on delete cascade,factor_type text,status text);
   create table public.app_presence(user_id uuid references auth.users(id)on delete cascade,app text,tab_id uuid,last_seen timestamptz);
   create table public.app_notification_status(user_id uuid references auth.users(id)on delete cascade,session_id uuid,permission text,push_device_id uuid,checked_at timestamptz);
   create table salah_push_private.devices(id uuid primary key,enabled boolean,subscription jsonb,preferences jsonb,updated_at timestamptz);
   create table salah_support_private.native_devices(id uuid primary key,user_id uuid references auth.users(id)on delete cascade,session_id uuid,enabled boolean,token text,token_hash text,updated_at timestamptz);`);
  await db.exec(fs.readFileSync(path.resolve(__dirname,'../../supabase/migrations/20261102133755_owner_return_campaigns.sql'),'utf8'));
  for(let i=0;i<3;i++){await db.query('insert into auth.users values($1,$2,false,null,$3,$4)',[users[i],iso(now-40*day),iso(now-60*day),iso(now-10*day)]);await db.query('insert into auth.sessions values($1,$2,null)',[sessions[i],users[i]]);}
  await db.query("insert into auth.mfa_factors values($1,'totp','verified')",[owner]);
  await db.query('insert into salah_push_private.devices values($1,true,$2,$3,$4)',[webId,JSON.stringify({endpoint:'https://web.push.apple.com/test'}),JSON.stringify({city:{timezone:'Asia/Yekaterinburg'},reminders:{enabled:true}}),iso(now-9*day)]);
  await db.query("insert into public.app_notification_status values($1,$2,'granted',$3,$4)",[users[1],sessions[1],webId,iso(now-9*day)]);
  await db.query('insert into salah_support_private.native_devices(id,user_id,session_id,enabled,token,token_hash,updated_at)values($1,$2,$3,true,$4,$5,$6)',[nativeId,users[2],sessions[2],'test-token'.repeat(20),'a'.repeat(64),iso(now-9*day)]);
  const audience=async(at=now)=>(await db.query('select a from salah_return_private.audience(7,$1::timestamptz)a',[iso(at)])).rows.map(r=>r.a);
  const request=async(action,input,at=now,uid=owner,sid=sessions[0])=>(await db.query('select salah_return_private.request($1,$2,$3,$4::jsonb,$5::timestamptz)as value',[uid,sid,action,JSON.stringify(input),iso(at)])).rows[0].value;
  const claim=async(id,at=now)=>(await db.query('select salah_return_private.claim($1,$2::timestamptz)as value',[id,iso(at)])).rows[0].value;
  const details=async(id,token,at=now)=>(await db.query('select salah_return_private.job_details($1,$2,$3::timestamptz)as value',[id,token,iso(at)])).rows[0].value;
  const complete=async(id,token,state,at=now)=>db.query('select salah_return_private.complete($1,$2,$3,$4::timestamptz)',[id,token,state,iso(at)]);
  yes((await audience()).length===1,'Unknown native timezone is not guessed');await db.query("update salah_support_private.native_devices set time_zone='Asia/Yekaterinburg'where id=$1",[nativeId]);yes((await audience()).length===2);
  await assert.rejects(()=>request('preview',{id:crypto.randomUUID(),body:'Откройте SALAH',days:7},now,users[1],sessions[1]),e=>e.code==='42501');checks++;
  const id=crypto.randomUUID(),input={id,body:'Уделим несколько минут Корану? Откройте SALAH.',days:7};let report=await request('preview',input);yes(report.state==='draft'&&report.inactive===2&&report.reachable===2&&report.sent===0);
  yes((await request('preview',input)).reachable===2,'Repeated preview cannot duplicate recipients');await assert.rejects(()=>request('preview',{...input,body:'Другой текст SALAH'}),e=>e.code==='40001');checks++;
  let jobs=(await db.query('select *from salah_return_private.recipients where campaign_id=$1 order by user_id',[id])).rows;yes(await claim(jobs[0].id)===null,'Draft cannot send');
  report=await request('queue',{id});yes(report.state==='queued');yes((await request('queue',{id})).queued===2,'Repeated Queue is idempotent');
  yes(await claim(jobs[0].id,now-12*3600000)===null,'No night delivery');
  const first=jobs.find(j=>j.user_id===users[1]),second=jobs.find(j=>j.user_id===users[2]);let lease=await claim(first.id);yes(lease);yes(await claim(first.id)===null,'Active lease prevents repeated send');yes((await details(first.id,lease.token)).device===webId);
  await complete(first.id,crypto.randomUUID(),'sent');yes((await request('status',{id})).sent===0,'Wrong lease cannot commit');
  await db.query("insert into public.app_presence values($1,'salah',$2,$3)",[users[1],crypto.randomUUID(),iso(now+1)]);yes(await details(first.id,lease.token,now+2)===null,'Another-device visit cancels');await complete(first.id,lease.token,'skipped',now+3);
  lease=await claim(second.id);yes(lease);await complete(second.id,lease.token,'sent');report=await request('status',{id});yes(report.sent===1&&report.skipped===1&&report.state==='complete');yes((await audience()).length===0,'Recent visitor and weekly cooldown excluded');
  const expired=crypto.randomUUID();await request('preview',{...input,id:expired});await assert.rejects(()=>request('queue',{id:expired},now+11*60000),e=>e.code==='40001');checks++;
  const cancel=crypto.randomUUID();await request('preview',{...input,id:cancel});yes((await request('cancel',{id:cancel})).state==='cancelled');
  await db.query('delete from public.app_presence where user_id=$1',[users[1]]);yes((await audience()).length===1);
  for(const [field,value]of[['banned_until',iso(now+day)],['is_anonymous',true],['email_confirmed_at',null]]){await db.query('update auth.users set '+field+'=$2 where id=$1',[users[1],value]);yes((await audience()).length===0,field);await db.query('update auth.users set banned_until=null,is_anonymous=false,email_confirmed_at=$2 where id=$1',[users[1],iso(now-40*day)]);}
  await db.query('update auth.sessions set not_after=$2 where id=$1',[sessions[1],iso(now-1)]);yes((await audience()).length===0);await db.query('update auth.sessions set not_after=null where id=$1',[sessions[1]]);
  await db.query('update salah_push_private.devices set enabled=false where id=$1',[webId]);yes((await audience()).length===0);await db.query('update salah_push_private.devices set enabled=true where id=$1',[webId]);
  const duplicate=crypto.randomUUID();await db.query('insert into salah_push_private.devices select $1,enabled,subscription,preferences,updated_at from salah_push_private.devices where id=$2',[duplicate,webId]);await db.query("insert into public.app_notification_status values($1,$2,'granted',$3,$4)",[users[1],sessions[1],duplicate,iso(now-8*day)]);yes((await audience()).length===1,'One device per account');
  const retryId=crypto.randomUUID();await request('preview',{...input,id:retryId});await request('queue',{id:retryId});const retryJob=(await db.query('select id from salah_return_private.recipients where campaign_id=$1',[retryId])).rows[0];
  let retryLease=await claim(retryJob.id);await complete(retryJob.id,retryLease.token,'retry');yes(await claim(retryJob.id,now+60000)===null,'Retry must wait ten minutes');
  retryLease=await claim(retryJob.id,now+10*60000);yes(retryLease);await complete(retryJob.id,retryLease.token,'retry',now+10*60000);
  retryLease=await claim(retryJob.id,now+20*60000);yes(retryLease);await complete(retryJob.id,retryLease.token,'retry',now+20*60000);yes(await claim(retryJob.id,now+30*60000)===null,'No fourth delivery attempt');yes((await request('status',{id:retryId},now+30*60000)).failed===1,'Exhausted retry is terminal');
  for(const role of['anon','authenticated']){await db.exec('set role '+role);await assert.rejects(()=>db.query('select *from salah_return_private.campaigns'),e=>e.code==='42501');checks++;await assert.rejects(()=>db.query('select salah_return_private.audience(7,now())'),e=>e.code==='42501');checks++;await db.exec('reset role');}
  yes((await db.query("select bool_and(relrowsecurity)as ok from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='salah_return_private'and c.relkind='r'")).rows[0].ok,'RLS on every campaign table');
  await db.query('delete from auth.users where id=$1',[users[2]]);yes((await db.query('select count(*)as n from salah_return_private.receipts where user_id=$1',[users[2]])).rows[0].n===0,'Deleted account receipts removed');
  console.log('PASS: '+checks+' real PostgreSQL owner campaign checks (draft/queue, no extra opt-in, owner-only, leases, return cancellation, cooldown, sessions, permissions, one device/account, privacy).');return checks;
 }finally{await db.close();}
}
module.exports={run};if(require.main===module)run().catch(e=>{console.error(e);process.exitCode=1;});
