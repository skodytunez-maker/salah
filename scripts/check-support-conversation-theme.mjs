import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {supportFixture} from '../tests/support/chat-fixture.mjs';
import {CONVERSATION_THEMES} from '../dist/js/conversation-themes.js';

const {db,owner,user,other,actor,sessions}=await supportFixture();
try {
 await db.exec(await readFile(new URL('../supabase/migrations/20261125023000_support_conversation_theme.sql',import.meta.url),'utf8'));
 const src=await readFile(new URL('../supabase/functions/support-messages/index.ts',import.meta.url),'utf8');
 const {createSupportHandler}=await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
 let caller=user,secured=true,writeCalls=0;
 const handler=createSupportHandler({
  getUser:async()=>({data:{user:{id:caller,email_confirmed_at:'2026-11-22'}}}),
  getClaims:async()=>({data:{claims:{sub:caller,iss:'https://kbltwszfvphgbxdbczsb.supabase.co/auth/v1',session_id:sessions.get(caller),aal:secured?'aal2':'aal1'}}}),
  invoke:async(name,args)=>{
   await actor(caller,secured);
   if(name==='support_conversation_theme'){
    writeCalls++;
    return (await db.query('select salah_support_private.conversation_theme($1,$2,$3) data',[args.p_thread,args.p_owner,args.p_theme])).rows[0].data;
   }
   assert.equal(name,'support_conversation_request');
   const chat=(await db.query('select public.support_conversation_request($1,$2,$3,$4::jsonb) data',[args.p_app,args.p_owner,args.p_action,JSON.stringify(args.p_args)])).rows[0].data;
   return {...chat,sharedTheme:(await db.query('select salah_support_private.conversation_theme($1,$2) data',[args.p_args.threadId,args.p_owner])).rows[0].data};
  },
 });
 const send=async(name,args)=>{
  const response=await handler(new Request('https://fixture.invalid/support',{
   method:'POST',headers:{Origin:'https://skodytunez-maker.github.io',Authorization:'Bearer signed-test-token','Content-Type':'application/json'},
   body:JSON.stringify({name,args}),
  }));
  assert.equal(response.headers.get('Cache-Control'),'no-store, private');
  const json=await response.json();
  return {status:response.status,...json};
 };
 async function makeCase(contact,app='salah'){
  const id=randomUUID();
  await db.query("insert into public.support_threads(id,user_id,app,subject,version) values($1,$2,$3,'Тема','561')",[id,contact,app]);
  return id;
 }
 const first=await makeCase(user),later=await makeCase(user),unrelated=await makeCase(other),outside=await makeCase(user,'sahaba');
 const save=(id,theme,isOwner=false)=>send('support_conversation_theme',{p_app:'salah',p_thread:id,p_owner:isOwner,p_theme:theme});
 const read=(id,isOwner=false)=>send('support_conversation_request',{p_app:'salah',p_owner:isOwner,p_action:'read',p_args:{threadId:id}});
 assert.deepEqual((await read(first)).data.sharedTheme,{theme:null,version:0});
 assert.deepEqual((await save(first,'stars')).data,{theme:'stars',version:1});
 assert.deepEqual((await read(later)).data.sharedTheme,{theme:'stars',version:1},'The theme belongs to the conversation, not a single ticket');
 caller=owner;secured=false;
 assert.equal((await save(first,'lake',true)).status,403,'The owner must have current MFA');
 secured=true;
 assert.deepEqual((await read(later,true)).data.sharedTheme,{theme:'stars',version:1});
 assert.deepEqual((await save(later,'lake',true)).data,{theme:'lake',version:2});
 caller=user;
 assert.deepEqual((await read(first)).data.sharedTheme,{theme:'lake',version:2});
 assert.equal((await read(outside)).status,403);
 const preMalformed=writeCalls;
 for(const value of ['custom','https://fixture.invalid/photo',{},null])assert.equal((await save(later,value)).status,400);
 assert.equal(writeCalls,preMalformed,'No photo or arbitrary payload reaches the database');
 assert.equal((await save(unrelated,'stars')).status,403);
 caller=other;
 assert.equal((await read(first)).status,403);
 assert.equal((await save(first,'stars')).status,403);
 assert.equal((await save(first,'stars',true)).status,403);
 caller=user;
 for(const [n,item] of CONVERSATION_THEMES.entries())assert.deepEqual((await save(first,item.id)).data,{theme:item.id,version:n+3});
 const preExpired=(await read(first)).data.sharedTheme;
 await db.query("update auth.sessions set not_after=now()-interval '1 minute' where id=$1",[sessions.get(user)]);
 assert.equal((await save(first,'default')).status,403);
 caller=owner;
 assert.deepEqual((await read(first,true)).data.sharedTheme,preExpired);
 const {rows:[grants]}=await db.query("select has_function_privilege('authenticated','salah_support_private.conversation_theme(uuid,boolean,text)','execute') as endpoint,has_table_privilege('authenticated','salah_support_private.conversation_themes','select') as direct,relrowsecurity as rls from pg_class where oid='salah_support_private.conversation_themes'::regclass");
 assert.deepEqual(grants,{endpoint:false,direct:false,rls:true});
 console.log('PASS shared Support theme HTTP and PostgreSQL: two participants, same conversation, allowed themes, private storage, MFA/session/outsider rejection.');
} finally {
 await db.close();
}
