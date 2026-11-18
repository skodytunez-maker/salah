import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {PGlite} from '../tests/staff/node_modules/@electric-sql/pglite/dist/index.js';
const db=await PGlite.create();
await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE SCHEMA auth;CREATE SCHEMA storage;
CREATE TABLE auth.users(id uuid PRIMARY KEY,email_confirmed_at timestamptz,is_anonymous boolean DEFAULT false,raw_user_meta_data jsonb DEFAULT '{}',created_at timestamptz DEFAULT now());
CREATE TABLE auth.sessions(id uuid PRIMARY KEY,user_id uuid REFERENCES auth.users(id),not_after timestamptz);
CREATE TABLE auth.mfa_factors(user_id uuid,factor_type text,status text);
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql AS $$SELECT nullif(current_setting('request.jwt.claims',true),'')::jsonb$$;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT (auth.jwt()->>'sub')::uuid$$;
CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
CREATE TABLE storage.objects(bucket_id text,name text,metadata jsonb);`);
for(const name of ['migrations/20261004_support.sql','migrations/20261006190000_support_owner_inbox.sql','migrations/20261006184246_support_photos.sql','migrations/20261006185543_support_owner_status.sql','migrations/20261006193106_support_user_replies.sql','migrations/20261006212555_support_owner_read_status.sql','migrations/20261006215958_support_owner_messages.sql','support-media-notifications.sql','migrations/20261011194033_staff_cabinet.sql','migrations/20261011221126_staff_support_privacy.sql','migrations/20261118103824_support_chat_actions_516.sql'])await db.exec(await readFile(new URL('../supabase/'+name,import.meta.url),'utf8'));
const owner='dc1eb1cc-6f8f-472f-a937-735fbfbba4b7',user=randomUUID(),other=randomUUID(),sessions=new Map();
for(const id of [owner,user,other]){const sid=randomUUID();sessions.set(id,sid);await db.query("INSERT INTO auth.users(id,email_confirmed_at)VALUES($1,now());",[id]);await db.query('INSERT INTO auth.sessions(id,user_id)VALUES($1,$2)',[sid,id]);}
await db.query("INSERT INTO auth.mfa_factors VALUES($1,'totp','verified')",[owner]);
async function actor(id,mfa=true){await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:id,session_id:sessions.get(id),aal:mfa?'aal2':'aal1'})]);}
const invoke=async(action,args,asOwner=false)=>(await db.query('select public.support_chat_request($1,$2,$3,$4::jsonb) data',['salah',asOwner,action,JSON.stringify(args)])).rows[0].data;
const legacyRead=async(id,asOwner=false)=>(await db.query('select public.support_read($1,$2,$3) data',[id,'salah',asOwner])).rows[0].data;
await actor(user);const thread=randomUUID();await db.query('select public.support_create($1,$2,$3,$4,$5)',[thread,'salah','Test','Initial','516']);
let data=await invoke('read',{threadId:thread});assert.equal(data.messages.length,1);assert.equal(data.messages[0].canDeleteEveryone,true);
await actor(other);await assert.rejects(invoke('read',{threadId:thread}),e=>e.code==='42501');
await actor(owner,false);await assert.rejects(invoke('read',{threadId:thread},true),e=>e.code==='42501');
await actor(owner);const reply=randomUUID();await invoke('reply',{threadId:thread,messageId:reply,body:'Answer',replyTo:thread},true);
data=await invoke('read',{threadId:thread},true);assert.equal(data.messages[1].reply.body,'Initial');
await actor(user);const op=randomUUID();await invoke('delete',{threadId:thread,messageId:thread,scope:'self',operationId:op});assert.equal((await legacyRead(thread)).messages.length,1);assert.equal((await invoke('read',{threadId:thread})).messages[0].reply.available,false);
await actor(owner);assert.equal((await legacyRead(thread,true)).messages.length,2,'Self does not hide the peer copy');await assert.rejects(invoke('delete',{threadId:thread,messageId:thread,scope:'everyone',operationId:randomUUID()},true),e=>e.code==='42501');
await actor(user);await invoke('delete',{threadId:thread,messageId:thread,scope:'everyone',operationId:randomUUID()});await actor(owner);assert.equal((await legacyRead(thread,true)).messages.length,1);
const clearOp=randomUUID();await invoke('clear',{threadId:thread,scope:'everyone',operationId:clearOp},true);assert.equal((await legacyRead(thread,true)).messages.length,0);
const next=randomUUID();await invoke('reply',{threadId:thread,messageId:next,body:'Future',replyTo:null},true);await invoke('clear',{threadId:thread,scope:'everyone',operationId:clearOp},true);assert.equal((await legacyRead(thread,true)).messages[0].body,'Future','An old clear retry does not erase future messages');
await assert.rejects(invoke('clear',{threadId:thread,scope:'self',operationId:clearOp},true),e=>e.code==='22023');
await actor(user);await invoke('clear',{threadId:thread,scope:'self',operationId:randomUUID()});assert.equal((await legacyRead(thread)).messages.length,0);await actor(owner);assert.equal((await legacyRead(thread,true)).messages.length,1);
await actor(user);await assert.rejects(invoke('reply',{threadId:thread,messageId:randomUUID(),body:'Reply',replyTo:thread}),e=>e.message==='reply_unavailable');
// Exercise the original read/photo/status/staff paths, not only the new RPC.
const photoThread=randomUUID(),foreignThread=randomUUID();
await db.query('select public.support_create($1,$2,$3,$4,$5)',[photoThread,'salah','Photo','Private photograph','516']);
await db.query("INSERT INTO salah_support_private.photos(message_id,uploader_id,object_path,size_bytes)VALUES($1,$2,$3,100)",[photoThread,user,'salah/'+user+'/'+photoThread+'.jpg']);
const photos=async(id,asOwner=false)=>(await db.query('select public.support_photo_manifest($1,$2,$3) data',[id,'salah',asOwner])).rows[0].data;
assert.equal((await photos(photoThread)).length,1);
await invoke('delete',{threadId:photoThread,messageId:photoThread,scope:'self',operationId:randomUUID()});
assert.equal((await photos(photoThread)).length,0,'Self-hidden attachments cannot receive a new signed URL');
await actor(owner);assert.equal((await photos(photoThread,true)).length,1,'The other participant retains their attachment');
assert.equal((await db.query('select count(*) n from salah_support_private.notification_events where message_id=$1',[photoThread])).rows[0].n,1,'Self deletion does not revoke the peer notification');
await actor(user);await invoke('delete',{threadId:photoThread,messageId:photoThread,scope:'everyone',operationId:randomUUID()});
await actor(owner);assert.equal((await photos(photoThread,true)).length,0);
assert.equal((await db.query('select count(*) n from salah_support_private.notification_events where message_id=$1',[photoThread])).rows[0].n,0,'Everyone deletion revokes web/native queue rows transactionally');
// Replaying an already sent/deleted ID must never restore its body or queue.
await actor(user);await invoke('reply',{threadId:photoThread,messageId:photoThread,body:'Resurrected',replyTo:null});
assert.equal((await legacyRead(photoThread)).messages.length,0);
assert.equal((await db.query('select count(*) n from salah_support_private.notification_events where message_id=$1',[photoThread])).rows[0].n,0);
await actor(other);await db.query('select public.support_create($1,$2,$3,$4,$5)',[foreignThread,'salah','Other case','Other private text','516']);
await actor(owner);await assert.rejects(invoke('reply',{threadId:photoThread,messageId:randomUUID(),body:'Cross-case quote',replyTo:foreignThread},true),e=>e.message==='reply_unavailable');
const incoming=randomUUID();await invoke('reply',{threadId:photoThread,messageId:incoming,body:'Queued answer',replyTo:null},true);
await actor(user);await invoke('delete',{threadId:photoThread,messageId:incoming,scope:'self',operationId:randomUUID()});
assert.equal((await db.query('select count(*) n from salah_support_private.notification_events where message_id=$1',[incoming])).rows[0].n,0,'Self deletion revokes notifications addressed to that account');
const userStatus=(await db.query("select public.support_user_status('salah') data")).rows[0].data;assert.equal(userStatus.latest,null);
// Shared support keeps its original permission + explicit-sharing boundary.
await db.query("INSERT INTO salah_staff_private.members(user_id,role,permissions)VALUES($1,'moderator',ARRAY['support'])",[other]);
await db.query("INSERT INTO auth.mfa_factors VALUES($1,'totp','verified')",[other]);
await actor(other);await assert.rejects(db.query("select salah_staff_private.request('support.read',$1::jsonb)",[JSON.stringify({id:photoThread})]),e=>e.code==='42501');
await db.query('UPDATE public.support_threads SET team_visible=true WHERE id=$1',[photoThread]);
const shared=(await db.query("select salah_staff_private.request('support.read',$1::jsonb) data",[JSON.stringify({id:photoThread})])).rows[0].data;
assert.equal(shared.messages.length,1);assert.equal(shared.messages[0].id,incoming);assert.equal(shared.photos.length,0,'Deleted attachments stay absent from shared support');
await actor(owner);await invoke('clear',{threadId:photoThread,scope:'everyone',operationId:randomUUID()},true);
await actor(other);assert.equal((await db.query("select salah_staff_private.request('support.read',$1::jsonb) data",[JSON.stringify({id:photoThread})])).rows[0].data.messages.length,0);
// Unrelated SAHABA support remains on its existing protocol and history.
await actor(other);const sahaba=randomUUID();await db.query('select public.support_create($1,$2,$3,$4,$5)',[sahaba,'sahaba','Other app','Unchanged','516']);
const separate=(await db.query('select public.support_read($1,$2,$3) data',[sahaba,'sahaba',false])).rows[0].data;
assert.equal(separate.messages[0].body,'Unchanged');assert.equal(separate.visibilityVersion,undefined);
await assert.rejects(db.query('select public.support_chat_request($1,$2,$3,$4::jsonb)',['sahaba',false,'clear',JSON.stringify({threadId:sahaba,scope:'everyone',operationId:randomUUID()})]),e=>e.code==='22023');
await db.query('UPDATE auth.sessions SET not_after=now()-interval \'1 second\' WHERE id=$1',[sessions.get(user)]);
await actor(user);await assert.rejects(invoke('read',{threadId:thread}),e=>e.code==='42501');
for(const relation of ['chat_hidden','chat_history','chat_operations']){
 const acl=(await db.query("select c.relrowsecurity rls,has_table_privilege('authenticated',c.oid,'SELECT') readable from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='salah_support_private' and c.relname=$1",[relation])).rows[0];assert.equal(acl.rls,true);assert.equal(acl.readable,false);
}
await db.close();console.log('PASS: real support migration, current-session/MFA and per-thread authorization, reply visibility, self/everyone deletion, legacy filtering and idempotent clear after future messages.');
