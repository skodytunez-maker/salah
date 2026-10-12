const fs=require('node:fs');
const assert=require('node:assert/strict');
const {PGlite}=require('@electric-sql/pglite');
const crypto=require('node:crypto');
const app='../..';
const owner='dc1eb1cc-6f8f-472f-a937-735fbfbba4b7';
const admin=crypto.randomUUID(),mod=crypto.randomUUID(),outsider=crypto.randomUUID();
let checks=0;
async function main(){
 const db=await PGlite.create();
 await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE SCHEMA auth;CREATE SCHEMA storage;CREATE SCHEMA salah_support_private;
 CREATE TABLE auth.users(id uuid PRIMARY KEY,email_confirmed_at timestamptz,is_anonymous boolean DEFAULT false,raw_user_meta_data jsonb DEFAULT '{}',created_at timestamptz DEFAULT now());
 CREATE TABLE auth.sessions(id uuid PRIMARY KEY,user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,not_after timestamptz);
 CREATE TABLE auth.mfa_factors(user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,factor_type text,status text);
 CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql AS $$SELECT nullif(current_setting('request.jwt.claims',true),'')::jsonb$$;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT (auth.jwt()->>'sub')::uuid$$;
 CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 CREATE TABLE public.support_threads(id uuid PRIMARY KEY,user_id uuid,app text,subject text,version integer,status text,created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now(),owner_seen_at timestamptz DEFAULT '-infinity',user_seen_at timestamptz DEFAULT '-infinity');
 CREATE TABLE public.support_messages(id uuid PRIMARY KEY,thread_id uuid,author_id uuid,owner_reply boolean,body text,created_at timestamptz DEFAULT clock_timestamp());
 CREATE TABLE salah_support_private.photos(message_id uuid,object_path text,photo_index integer);`);
 await db.exec(fs.readFileSync(require('node:path').resolve(__dirname,app,'supabase/migrations/20261011194033_staff_cabinet.sql'),'utf8'));
 await db.exec(fs.readFileSync(require('node:path').resolve(__dirname,app,'supabase/migrations/20261011221126_staff_support_privacy.sql'),'utf8'));
 await db.exec(fs.readFileSync(require('node:path').resolve(__dirname,app,'supabase/migrations/20261012160940_staff_message_status.sql'),'utf8'));
 await db.exec(fs.readFileSync(require('node:path').resolve(__dirname,app,'supabase/migrations/20261012174334_staff_background_notifications.sql'),'utf8'));
 const sessions=new Map();
 for(const [user,nickname] of [[owner,'Владелец (тест)'],[admin,'Админ (тест)'],[mod,'Модератор (тест)'],[outsider,'Не сотрудник (тест)']]){
  const sid=crypto.randomUUID();sessions.set(user,sid);
  await db.query(`INSERT INTO auth.users(id,email_confirmed_at,raw_user_meta_data)VALUES($1,now(),$2)`,[user,JSON.stringify({nickname,role:'owner',staff:true})]);
  await db.query(`INSERT INTO auth.sessions(id,user_id)VALUES($1,$2)`,[sid,user]);
  await db.query(`INSERT INTO auth.mfa_factors VALUES($1,'totp','verified')`,[user]);
 }
 async function as(user,aal='aal2',sid=sessions.get(user)){await db.query(`SELECT set_config('request.jwt.claims',$1,false)`,[JSON.stringify({sub:user,session_id:sid,aal})]);}
 async function rpc(action,args={}){const fn=action.startsWith('chat.push.')?'chat_push_request':action.startsWith('chat.')?'chat_request':'request';return (await db.query(`SELECT salah_staff_private.${fn}($1,$2::jsonb) AS data`,[action,JSON.stringify(args)])).rows[0].data;}
 const yes=(x)=>{assert.ok(x);checks++;};
 async function denied(fn,code){await assert.rejects(fn,e=>e.code===code);checks++;}
 await as(outsider);await denied(()=>rpc('gate'),'42501');
 await as(owner);yes((await rpc('gate')).owner);
 await rpc('member.set',{userId:admin,role:'admin',active:true});await rpc('member.set',{userId:mod,role:'moderator',active:true});
 await as(mod);yes((await rpc('gate')).permissions.join()==='support');await denied(()=>rpc('member.list'),'42501');await denied(()=>rpc('draft.list',{kind:'reciter'}),'42501');
 await as(admin,'aal1');yes((await rpc('gate')).mfaRequired);await denied(()=>rpc('draft.list',{kind:'reciter'}),'42501');
 await as(admin);const draft=crypto.randomUUID(),payload={name:'Тестовый чтец'};
 let row=await rpc('draft.save',{id:draft,kind:'reciter',entityId:'ar.test-reciter',payload});yes(row.revision===1);
 yes((await rpc('draft.list',{kind:'reciter'})).length===1);yes((await rpc('draft.get',{id:draft,kind:'reciter'})).id===draft);
 await denied(()=>rpc('draft.save',{id:draft,kind:'reciter',entityId:'ar.test-reciter',payload,revision:2}),'P0001');
 row=await rpc('draft.save',{id:draft,kind:'reciter',entityId:'ar.test-reciter',payload,revision:1});yes(row.revision===2);
 const asset=crypto.randomUUID();await rpc('asset.register',{id:draft,kind:'reciter',assetId:asset,path:`${admin}/${draft}/${asset}.jpg`,bytes:200,width:100,height:200,sha256:'0'.repeat(64)});yes((await rpc('asset.list',{id:draft,kind:'reciter'})).length===1);
 row=await rpc('draft.submit',{id:draft,kind:'reciter',revision:2});yes(row.status==='submitted');await denied(()=>rpc('catalog.publish',{id:draft,revision:3,payload:{id:'ar.test-reciter'}}),'42501');
 await as(owner);yes((await rpc('review.list')).length===1);
 row=await rpc('review.return',{id:draft,revision:3,note:'Исправьте тест'});yes(row.status==='changes_requested');
 await as(admin);row=await rpc('draft.save',{id:draft,kind:'reciter',entityId:'ar.test-reciter',payload,revision:4});row=await rpc('draft.submit',{id:draft,revision:5});
 await as(owner);row=await rpc('catalog.publish',{id:draft,revision:6,payload:{id:'ar.test-reciter',name:'Тестовый чтец'}});yes(row.status==='published');
 await denied(()=>rpc('catalog.publish',{id:draft,revision:6,payload:{id:'ar.test-reciter'}}),'P0001');
 await as(mod);await denied(()=>rpc('draft.get',{id:draft,kind:'wallpaper'}),'42501');
 const support=crypto.randomUUID(),sahaba=crypto.randomUUID();await db.query(`INSERT INTO support_threads(id,user_id,app,subject,version,status)VALUES($1,$2,'salah','Тест',298,'new'),($3,$2,'sahaba','Другой проект',298,'new')`,[support,outsider,sahaba]);
 yes((await rpc('support.list')).length===0);await denied(()=>rpc('support.read',{id:support}),'42501');await denied(()=>rpc('support.close',{id:support}),'42501');await denied(()=>rpc('support.reply',{id:support,messageId:crypto.randomUUID(),body:'Нет доступа'}),'42501');await denied(()=>rpc('support.share',{id:support,visible:true}),'42501');
 await as(admin);await denied(()=>rpc('support.share',{id:support,visible:true}),'42501');await as(owner,'aal1');await denied(()=>rpc('support.share',{id:support,visible:true}),'42501');await as(owner);await denied(()=>rpc('support.share',{id:sahaba,visible:true}),'42501');yes((await rpc('support.list')).length===0);await rpc('support.share',{id:support,visible:true});await as(mod);yes((await rpc('support.list')).length===1);await denied(()=>rpc('support.read',{id:sahaba}),'42501');yes((await rpc('support.read',{id:support})).thread.id===support);
 await rpc('support.reply',{id:support,messageId:crypto.randomUUID(),body:'Тестовый ответ'});await rpc('support.close',{id:support});await denied(()=>rpc('support.reply',{id:support,messageId:crypto.randomUUID(),body:'Закрыт'}),'22023');
 await as(owner);await rpc('support.share',{id:support,visible:false});await as(mod);yes((await rpc('support.list')).length===0);await denied(()=>rpc('support.read',{id:support}),'42501');yes((await db.query('select count(*) as n from support_threads')).rows[0].n===2);
 yes((await rpc('chat.contacts')).length===2);const team=(await rpc('chat.rooms'))[0];yes(team.kind==='team');
 const dm=await rpc('chat.open',{userId:admin});yes(dm.kind==='direct');await denied(()=>rpc('chat.open',{userId:outsider}),'42501');
 const file=crypto.randomUUID();await rpc('chat.file.register',{roomId:dm.id,fileId:file,path:`${mod}/${dm.id}/${file}/test.txt`,filename:'test.txt',mimeType:'text/plain',bytes:4,sha256:'1'.repeat(64)});
 const mid=crypto.randomUUID();await rpc('chat.send',{roomId:dm.id,messageId:mid,body:'Привет 🙂',files:[file]});await rpc('chat.send',{roomId:dm.id,messageId:mid,body:'Привет 🙂',files:[file]});

 const ownStatus=await rpc('chat.status');yes(ownStatus.pending===0&&ownStatus.latest===null);
 await as(owner);const privateStatus=await rpc('chat.status');yes(privateStatus.pending===0&&privateStatus.rooms.every(r=>r.id!==dm.id));
 await as(admin,'aal1');await denied(()=>rpc('chat.status'),'42501');await as(outsider);await denied(()=>rpc('chat.status'),'42501');
 await as(admin);const unreadStatus=await rpc('chat.status');yes(unreadStatus.pending===1&&unreadStatus.latest.id===mid&&unreadStatus.latest.room===dm.id);yes(!JSON.stringify(unreadStatus).includes('Привет'));yes(unreadStatus.rooms[0].unread===1);yes((await rpc('chat.status')).pending===1);
 await rpc('chat.read',{roomId:dm.id});yes((await rpc('chat.status')).pending===0);
 await as(mod);
 let chat=await rpc('chat.read',{roomId:dm.id});yes(chat.messages.length===1&&chat.files.length===1);
 await as(owner);await denied(()=>rpc('chat.read',{roomId:dm.id}),'42501');yes((await rpc('chat.rooms')).every(r=>r.id!==dm.id));
 await as(admin);chat=await rpc('chat.read',{roomId:dm.id});yes(chat.messages[0].body==='Привет 🙂');
 await as(mod);chat=await rpc('chat.read',{roomId:dm.id});yes(chat.messages[0].seen);
 // Identical timestamps require a compound cursor: no message may disappear.
 for(let i=0;i<81;i++)await db.query(`INSERT INTO salah_staff_private.chat_messages(id,room_id,author_id,body,created_at)VALUES($1,$2,$3,$4,'2026-01-01T12:00:00.123456Z')`,[crypto.randomUUID(),dm.id,mod,'История '+i]);
 const first=await rpc('chat.read',{roomId:dm.id}),oldest=first.messages[0];yes(first.messages.length===80);
 const second=await rpc('chat.read',{roomId:dm.id,before:oldest.created_at,beforeId:oldest.id});yes(second.messages.length===2);yes(new Set([...first.messages,...second.messages].map(m=>m.id)).size===82);
 await denied(()=>rpc('chat.send',{roomId:team.id,messageId:crypto.randomUUID(),body:'',files:[file]}),'42501');
 await as(owner);await rpc('member.set',{userId:admin,role:'admin',active:false});await as(admin);await denied(()=>rpc('chat.read',{roomId:dm.id}),'42501');
 await as(mod,'aal2',crypto.randomUUID());await denied(()=>rpc('gate'),'42501');
 await as(mod);await db.query(`UPDATE auth.sessions SET not_after=now()-interval '1 second' WHERE id=$1`,[sessions.get(mod)]);await denied(()=>rpc('gate'),'42501');
 const tables=(await db.query(`SELECT relname,relrowsecurity FROM pg_class JOIN pg_namespace n ON n.oid=relnamespace WHERE n.nspname='salah_staff_private' AND relkind='r'`)).rows;yes(tables.length===11&&tables.every(t=>t.relrowsecurity));
 yes((await db.query(`SELECT has_schema_privilege('authenticated','salah_staff_private','USAGE') AS allowed`)).rows[0].allowed===false);
 yes((await db.query(`SELECT has_function_privilege('authenticated','salah_staff_private.request(text,jsonb)','EXECUTE') AS allowed`)).rows[0].allowed===false);

 // Execute the production SQL adapter against an isolated PostgreSQL engine.
 await db.exec(`CREATE SCHEMA salah_competition_private;
 CREATE TABLE salah_competition_private.events(id uuid PRIMARY KEY,user_id uuid,period text,bucket date,old_place integer,new_place integer,created_at timestamptz);
 CREATE TABLE salah_competition_private.preferences(user_id uuid PRIMARY KEY,enabled boolean,notify boolean,period text,time_zone text);
 CREATE TABLE public.reciter_listener_visibility(user_id uuid PRIMARY KEY,mode text);
 CREATE TABLE salah_competition_private.devices(id uuid PRIMARY KEY,user_id uuid,session_id uuid,subscription jsonb,enabled boolean,updated_at timestamptz);
 CREATE TABLE salah_competition_private.deliveries(device_id uuid,event_id uuid,state text,updated_at timestamptz,PRIMARY KEY(device_id,event_id));
 CREATE TABLE salah_competition_private.days(day date);CREATE TABLE salah_competition_private.legacy_days(day date);CREATE TABLE salah_competition_private.favorite_state(period text,bucket date);
 CREATE TABLE public.fixture_competition_place(user_id uuid PRIMARY KEY,place integer);
 CREATE FUNCTION public.competition_refresh() RETURNS integer LANGUAGE sql AS 'SELECT 0';
 CREATE FUNCTION public.competition_board(text,date) RETURNS TABLE(user_id uuid,place integer) LANGUAGE sql AS 'SELECT user_id,place FROM public.fixture_competition_place';`);
 const listener=crypto.randomUUID(),pushSession=crypto.randomUUID(),device=crypto.randomUUID(),event=crypto.randomUUID();
 await db.query(`INSERT INTO auth.users(id,email_confirmed_at)VALUES($1,now());`,[listener]);await db.query(`INSERT INTO auth.sessions(id,user_id)VALUES($1,$2)`,[pushSession,listener]);
 await db.query(`INSERT INTO salah_competition_private.preferences VALUES($1,true,true,'all','UTC')`,[listener]);await db.query(`INSERT INTO public.reciter_listener_visibility VALUES($1,'initials')`,[listener]);await db.query(`INSERT INTO salah_competition_private.devices VALUES($1,$2,$3,'{"endpoint":"https://fixture.invalid/push"}',true,now())`,[device,listener,pushSession]);await db.query(`INSERT INTO public.fixture_competition_place VALUES($1,2)`,[listener]);
 await db.query(`INSERT INTO salah_competition_private.events VALUES($1,$2,'all','1970-01-01',1,2,now()-interval '1 second')`,[event,listener]);
 const runtime=fs.readFileSync(require('node:path').resolve(__dirname,app,'supabase/functions/background-reminders/runtime.txt'),'utf8').replace(/\r\n/g,'\n');
 const adapterSource=runtime.slice(runtime.indexOf('const db={'),runtime.indexOf('let firebaseSender'));
 const sql=async(strings,...values)=>{let query=strings[0];for(let i=0;i<values.length;i++)query+='$'+(i+1)+strings[i+1];return(await db.query(query,values)).rows;};sql.json=JSON.stringify;
 const adapter=require('node:vm').runInNewContext(adapterSource+';db',{sql,String,Number,Math});
 const {dispatchCompetitionPush}=await import('../../supabase/functions/background-reminders/competition-push.mjs');const sent=[];const send=async(row,notice)=>{sent.push({row,notice});return'sent';};
 yes(await dispatchCompetitionPush({db:adapter,send,clock:Date.now})===1);yes(sent.length===1&&sent[0].notice.kind==='competition');yes(Number.isFinite(sent[0].notice.at)&&Math.abs(Date.now()-sent[0].notice.at)<60000);yes(sent[0].row.event_id===event);yes((await db.query(`SELECT state FROM salah_competition_private.deliveries WHERE event_id=$1`,[event])).rows[0].state==='sent');
 yes(await dispatchCompetitionPush({db:adapter,send,clock:Date.now})===0);yes(sent.length===1);
 const retaken=crypto.randomUUID();await db.query(`INSERT INTO salah_competition_private.events VALUES($1,$2,'all','1970-01-01',1,2,now())`,[retaken,listener]);await db.query(`UPDATE public.fixture_competition_place SET place=1 WHERE user_id=$1`,[listener]);yes(await dispatchCompetitionPush({db:adapter,send,clock:Date.now})===0);yes(sent.length===1);await db.query(`UPDATE public.fixture_competition_place SET place=2 WHERE user_id=$1`,[listener]);
 await db.query(`UPDATE salah_competition_private.preferences SET notify=false WHERE user_id=$1`,[listener]);yes((await adapter.competitionEvents(Date.now())).length===0);await db.query(`UPDATE salah_competition_private.preferences SET notify=true WHERE user_id=$1`,[listener]);
 await db.query(`UPDATE public.reciter_listener_visibility SET mode='hidden' WHERE user_id=$1`,[listener]);yes((await adapter.competitionEvents(Date.now())).length===0);await db.query(`UPDATE public.reciter_listener_visibility SET mode='initials' WHERE user_id=$1`,[listener]);
 await db.query(`UPDATE salah_competition_private.devices SET enabled=false WHERE id=$1`,[device]);yes((await adapter.competitionEvents(Date.now())).length===0);await db.query(`UPDATE salah_competition_private.devices SET enabled=true WHERE id=$1`,[device]);
 await db.query(`UPDATE auth.sessions SET not_after=now()-interval '1 second' WHERE id=$1`,[pushSession]);yes((await adapter.competitionEvents(Date.now())).length===0);await db.query(`UPDATE auth.sessions SET not_after=null WHERE id=$1`,[pushSession]);
 await db.query(`UPDATE salah_competition_private.events SET created_at=now()-interval '2 hours' WHERE id=$1`,[retaken]);yes((await adapter.competitionEvents(Date.now())).length===0);
 console.log('PASS: production competition SQL parses and dispatches once; retaken ranks, disabled notices, hidden profiles, disabled devices, expired sessions and stale events are suppressed.');


 // Staff delivery uses the same production dispatcher adapter, never public grants.
 const {dispatchStaffPush}=await import('../../supabase/functions/background-reminders/staff-push.mjs');
 await db.query('UPDATE auth.sessions SET not_after=null WHERE id=$1',[sessions.get(mod)]);await as(owner);await rpc('member.set',{userId:admin,role:'admin',active:true});
 const staffDevice=crypto.randomUUID(),ownerDevice=crypto.randomUUID(),nativeDevice=crypto.randomUUID();
 const subscription={endpoint:'https://web.push.apple.com/local-fixture',keys:{p256dh:'local-fixture',auth:'local-fixture'}};
 const register=(id,account,extra={})=>rpc('chat.push.register',{device:id,account,platform:'web',subscription,...extra});
 await as(outsider);await denied(()=>register(staffDevice,outsider),'42501');await as(admin,'aal1');await denied(()=>register(staffDevice,admin),'42501');await as(admin);await denied(()=>register(staffDevice,owner),'42501');
 yes((await register(staffDevice,admin)).enabled);yes((await rpc('chat.push.status',{device:staffDevice})).enabled);yes(!JSON.stringify(await rpc('chat.push.status',{device:staffDevice})).includes('endpoint'));
 yes((await adapter.staffPushEvents()).length===0,'Historical messages before opt-in must not send');
 const incomingStaff=crypto.randomUUID();await db.query('INSERT INTO salah_staff_private.chat_messages(id,room_id,author_id,body)VALUES($1,$2,$3,$4)',[incomingStaff,dm.id,mod,'Private fixture text']);
 let candidates=await adapter.staffPushEvents();yes(candidates.length===1&&candidates[0].message_id===incomingStaff&&Number.isFinite(Number(candidates[0].at)));yes(!JSON.stringify(candidates).includes('Private fixture text'));
 await as(owner);yes(!(await rpc('chat.push.status',{device:staffDevice})).enabled);await denied(()=>register(staffDevice,owner),'42501');yes((await register(ownerDevice,owner,{subscription:{...subscription,endpoint:subscription.endpoint+'/owner'}})).enabled);yes((await adapter.staffPushEvents()).every(r=>r.user_id!==owner),'Owner is not a private-chat participant');
 await as(admin);const ownStaff=crypto.randomUUID(),redactedStaff=crypto.randomUUID();await db.query('INSERT INTO salah_staff_private.chat_messages(id,room_id,author_id,body,redacted)VALUES($1,$2,$3,$4,false),($5,$2,$6,$4,true)',[ownStaff,dm.id,admin,'Fixture',redactedStaff,mod]);yes((await adapter.staffPushEvents()).length===1,'Own and redacted messages suppressed');
 const staffSent=[];const staffSend=async(r,e)=>{staffSent.push(e);return'sent';};yes(await dispatchStaffPush({db:adapter,send:staffSend,sender:null,clock:Date.now})===1);yes(await dispatchStaffPush({db:adapter,send:staffSend,sender:null,clock:Date.now})===0);yes(staffSent.length===1&&staffSent[0].message==='Новое сообщение команды');
 const retryMessage=crypto.randomUUID();await db.query('INSERT INTO salah_staff_private.chat_messages(id,room_id,author_id,body)VALUES($1,$2,$3,$4)',[retryMessage,dm.id,mod,'Retry fixture']);
 yes(await dispatchStaffPush({db:adapter,send:async()=>{throw Error('fixture transport');},sender:null,clock:Date.now})===0);yes((await db.query('SELECT state FROM salah_staff_private.push_deliveries WHERE device_id=$1 AND message_id=$2',[staffDevice,retryMessage])).rows[0].state==='retry');yes(await adapter.staffPushClaim(staffDevice,retryMessage,Date.now()));yes(!await adapter.staffPushClaim(staffDevice,retryMessage,Date.now()));await adapter.staffPushComplete(staffDevice,retryMessage,'retry');
 await rpc('chat.read',{roomId:dm.id});yes(!(await adapter.staffPushActive(staffDevice,retryMessage)));yes(await dispatchStaffPush({db:adapter,send:staffSend,sender:null,clock:Date.now})===0);
 const unreadStaff=crypto.randomUUID();await db.query('INSERT INTO salah_staff_private.chat_messages(id,room_id,author_id,body)VALUES($1,$2,$3,$4)',[unreadStaff,dm.id,mod,'Unread fixture']);
 await rpc('chat.push.remove',{device:staffDevice,account:admin});yes(!(await adapter.staffPushActive(staffDevice,unreadStaff)));yes(!(await register(staffDevice,admin,{renew:true})).enabled,'Silent renew never reverses explicit off');await register(staffDevice,admin);yes(!(await adapter.staffPushActive(staffDevice,unreadStaff)),'Reenabled notifications start from opt-in time');
 const freshStaff=crypto.randomUUID();await db.query('INSERT INTO salah_staff_private.chat_messages(id,room_id,author_id,body)VALUES($1,$2,$3,$4)',[freshStaff,dm.id,mod,'Fresh fixture']);yes(await adapter.staffPushActive(staffDevice,freshStaff));await adapter.staffPushExpire(staffDevice);yes((await rpc('chat.push.status',{device:staffDevice})).reason==='expired');yes((await register(staffDevice,admin,{renew:true})).enabled);yes(await adapter.staffPushActive(staffDevice,freshStaff));
 await as(owner);await rpc('member.set',{userId:admin,role:'admin',active:false});yes(!(await adapter.staffPushActive(staffDevice,freshStaff)));await as(admin);await denied(()=>rpc('chat.push.status',{device:staffDevice}),'42501');await as(owner);await rpc('member.set',{userId:admin,role:'admin',active:true});await as(admin);
 await db.query('UPDATE auth.sessions SET not_after=now()-interval \'1 second\' WHERE id=$1',[sessions.get(admin)]);yes(!(await adapter.staffPushActive(staffDevice,freshStaff)));await db.query('UPDATE auth.sessions SET not_after=null WHERE id=$1',[sessions.get(admin)]);
 await db.query('UPDATE auth.mfa_factors SET status=\'unverified\' WHERE user_id=$1',[admin]);yes(!(await adapter.staffPushActive(staffDevice,freshStaff)));await db.query('UPDATE auth.mfa_factors SET status=\'verified\' WHERE user_id=$1',[admin]);
 await db.query('UPDATE auth.users SET email_confirmed_at=null WHERE id=$1',[admin]);yes(!(await adapter.staffPushActive(staffDevice,freshStaff)));await db.query('UPDATE auth.users SET email_confirmed_at=now() WHERE id=$1',[admin]);
 yes((await rpc('chat.push.register',{device:nativeDevice,account:admin,platform:'android',token:'x'.repeat(160)})).enabled);const nativeStaff=crypto.randomUUID();await db.query('INSERT INTO salah_staff_private.chat_messages(id,room_id,author_id,body)VALUES($1,$2,$3,$4)',[nativeStaff,dm.id,mod,'Native fixture']);
 let nativeSends=0;await dispatchStaffPush({db:adapter,send:staffSend,sender:async(r,event)=>{yes(event.kind==='staff'&&event.thread===dm.id&&!event.body);nativeSends++;return'sent';},clock:Date.now});yes(nativeSends===1);yes(await dispatchStaffPush({db:adapter,send:staffSend,sender:async()=>{throw Error('duplicate');},clock:Date.now})===0);
 for(const functionName of ['chat_push_request(text,jsonb)','push_candidates(uuid,uuid)'])yes((await db.query('SELECT has_function_privilege(\'authenticated\',$1,\'EXECUTE\') AS allowed',['salah_staff_private.'+functionName])).rows[0].allowed===false);
 for(const tableName of ['push_devices','push_deliveries'])yes((await db.query('SELECT has_table_privilege(\'authenticated\',$1,\'SELECT,INSERT,UPDATE,DELETE\') AS allowed',['salah_staff_private.'+tableName])).rows[0].allowed===false);
 console.log('PASS production staff push SQL: verified staff/session/MFA, explicit opt-in, private rooms, generic payloads, unread-only sending, retries, dedupe, opt-out, revoked role, native route and denied public access.');

 await db.close();fs.writeFileSync(require('node:path').join(process.env.RUNNER_TEMP||require('node:os').tmpdir(),'salah-staff-database-checks.json'),JSON.stringify({localOnly:true,checks,passed:true,engine:'PGlite 0.5.8',date:new Date().toISOString()},null,2));console.log(`Local database checks passed: ${checks}`);
}
main().catch(e=>{console.error(e);process.exitCode=1});
