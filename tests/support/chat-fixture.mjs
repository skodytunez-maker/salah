import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {PGlite} from '../staff/node_modules/@electric-sql/pglite/dist/index.js';
export async function supportFixture(){
 const db=await PGlite.create();
 await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE SCHEMA auth;CREATE SCHEMA storage;
 CREATE TABLE auth.users(id uuid PRIMARY KEY,email_confirmed_at timestamptz,is_anonymous boolean DEFAULT false,raw_user_meta_data jsonb DEFAULT '{}',created_at timestamptz DEFAULT now());
 CREATE TABLE auth.sessions(id uuid PRIMARY KEY,user_id uuid REFERENCES auth.users(id),not_after timestamptz);
 CREATE TABLE auth.mfa_factors(user_id uuid,factor_type text,status text);
 CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql AS $$SELECT nullif(current_setting('request.jwt.claims',true),'')::jsonb$$;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT (auth.jwt()->>'sub')::uuid$$;
 CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 CREATE TABLE storage.objects(bucket_id text,name text,metadata jsonb);`);
 for(const name of ['migrations/20261004_support.sql','migrations/20261006190000_support_owner_inbox.sql','migrations/20261006184246_support_photos.sql','migrations/20261006185543_support_owner_status.sql','migrations/20261006193106_support_user_replies.sql','migrations/20261006212555_support_owner_read_status.sql','migrations/20261006215958_support_owner_messages.sql','support-media-notifications.sql','migrations/20261011194033_staff_cabinet.sql','migrations/20261011221126_staff_support_privacy.sql','migrations/20261118103824_support_chat_actions_516.sql','migrations/20261118144430_support_conversations_517.sql'])await db.exec(await readFile(new URL('../../supabase/'+name,import.meta.url),'utf8'));
 const owner='dc1eb1cc-6f8f-472f-a937-735fbfbba4b7',user=randomUUID(),other=randomUUID(),sessions=new Map();
 for(const id of [owner,user,other]){const sid=randomUUID();sessions.set(id,sid);await db.query('INSERT INTO auth.users(id,email_confirmed_at)VALUES($1,now())',[id]);await db.query('INSERT INTO auth.sessions(id,user_id)VALUES($1,$2)',[sid,id]);}
 await db.query("INSERT INTO auth.mfa_factors VALUES($1,'totp','verified')",[owner]);
 async function actor(id,mfa=true){await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:id,session_id:sessions.get(id),aal:mfa?'aal2':'aal1'})]);}
 const invoke=async(action,args,asOwner=false)=>(await db.query('select public.support_chat_request($1,$2,$3,$4::jsonb) data',['salah',asOwner,action,JSON.stringify(args)])).rows[0].data;
 const legacyRead=async(id,asOwner=false)=>(await db.query('select public.support_read($1,$2,$3) data',[id,'salah',asOwner])).rows[0].data;
 return {db,owner,user,other,sessions,actor,invoke,legacyRead};
}
