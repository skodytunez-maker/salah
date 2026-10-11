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
 const sessions=new Map();
 for(const [user,nickname] of [[owner,'Владелец (тест)'],[admin,'Админ (тест)'],[mod,'Модератор (тест)'],[outsider,'Не сотрудник (тест)']]){
  const sid=crypto.randomUUID();sessions.set(user,sid);
  await db.query(`INSERT INTO auth.users(id,email_confirmed_at,raw_user_meta_data)VALUES($1,now(),$2)`,[user,JSON.stringify({nickname,role:'owner',staff:true})]);
  await db.query(`INSERT INTO auth.sessions(id,user_id)VALUES($1,$2)`,[sid,user]);
  await db.query(`INSERT INTO auth.mfa_factors VALUES($1,'totp','verified')`,[user]);
 }
 async function as(user,aal='aal2',sid=sessions.get(user)){await db.query(`SELECT set_config('request.jwt.claims',$1,false)`,[JSON.stringify({sub:user,session_id:sid,aal})]);}
 async function rpc(action,args={}){const fn=action.startsWith('chat.')?'chat_request':'request';return (await db.query(`SELECT salah_staff_private.${fn}($1,$2::jsonb) AS data`,[action,JSON.stringify(args)])).rows[0].data;}
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
 yes((await rpc('support.list')).length===1);await denied(()=>rpc('support.read',{id:sahaba}),'42501');yes((await rpc('support.read',{id:support})).thread.id===support);
 await rpc('support.reply',{id:support,messageId:crypto.randomUUID(),body:'Тестовый ответ'});await rpc('support.close',{id:support});await denied(()=>rpc('support.reply',{id:support,messageId:crypto.randomUUID(),body:'Закрыт'}),'22023');
 yes((await rpc('chat.contacts')).length===2);const team=(await rpc('chat.rooms'))[0];yes(team.kind==='team');
 const dm=await rpc('chat.open',{userId:admin});yes(dm.kind==='direct');await denied(()=>rpc('chat.open',{userId:outsider}),'42501');
 const file=crypto.randomUUID();await rpc('chat.file.register',{roomId:dm.id,fileId:file,path:`${mod}/${dm.id}/${file}/test.txt`,filename:'test.txt',mimeType:'text/plain',bytes:4,sha256:'1'.repeat(64)});
 const mid=crypto.randomUUID();await rpc('chat.send',{roomId:dm.id,messageId:mid,body:'Привет 🙂',files:[file]});await rpc('chat.send',{roomId:dm.id,messageId:mid,body:'Привет 🙂',files:[file]});
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
 const tables=(await db.query(`SELECT relname,relrowsecurity FROM pg_class JOIN pg_namespace n ON n.oid=relnamespace WHERE n.nspname='salah_staff_private' AND relkind='r'`)).rows;yes(tables.length===9&&tables.every(t=>t.relrowsecurity));
 yes((await db.query(`SELECT has_schema_privilege('authenticated','salah_staff_private','USAGE') AS allowed`)).rows[0].allowed===false);
 yes((await db.query(`SELECT has_function_privilege('authenticated','salah_staff_private.request(text,jsonb)','EXECUTE') AS allowed`)).rows[0].allowed===false);
 await db.close();fs.writeFileSync(require('node:path').join(process.env.RUNNER_TEMP||require('node:os').tmpdir(),'salah-staff-database-checks.json'),JSON.stringify({localOnly:true,checks,passed:true,engine:'PGlite 0.5.8',date:new Date().toISOString()},null,2));console.log(`Local database checks passed: ${checks}`);
}
main().catch(e=>{console.error(e);process.exitCode=1});
