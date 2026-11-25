import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {supportFixture} from '../tests/support/chat-fixture.mjs';
import {supportVideoMime,supportMediaUrl,uploadSupportMedia} from '../dist/js/support-media.js';

const source=await readFile(new URL('../supabase/functions/support-messages/index.ts',import.meta.url),'utf8');
const {supportMediaHeader,createSupportHandler}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const mp4=Uint8Array.from([0,0,0,20,102,116,121,112,105,115,111,109,0,0,0,0,105,115,111,109]);
const mov=Uint8Array.from([0,0,0,8,119,105,100,101,0,0,0,20,102,116,121,112,113,116,32,32,0,0,0,0,113,116,32,32]);
assert(supportMediaHeader(mp4,'video/mp4'));assert(supportMediaHeader(mov,'video/quicktime'));
assert(supportMediaHeader(mp4,'audio/mp4'));
const webm=Uint8Array.from([26,69,223,163,159,66,130,132,119,101,98,109,0,0,0,0,0,0,0,0]);
assert(supportMediaHeader(webm,'audio/webm'));assert(!supportMediaHeader(webm,'audio/mp4'));
assert(!supportMediaHeader(mov,'video/mp4'));assert(!supportMediaHeader(new TextEncoder().encode('<svg onload=alert(1)>'),'video/mp4'));
assert.equal(supportVideoMime({name:'recording.mov',type:''}),'video/quicktime');
assert.equal(supportVideoMime({name:'fake.mp4',type:'text/html'}),null);
const base='https://kbltwszfvphgbxdbczsb.supabase.co/storage/v1/object/',signed=base+'upload/sign/support-chat-media/salah/fixture.mp4?token=test';
assert.equal(supportMediaUrl(signed,{upload:true}),signed);
assert.equal(supportMediaUrl(signed.replace('supabase.co','supabase.co.example.com'),{upload:true}),null);
assert.equal(supportMediaUrl(signed),null,'An upload token can never be used as a playback link');
let requests=0;
await uploadSupportMedia(signed,new File([mp4],'private-name.mp4',{type:'video/mp4'}),'video/mp4',{fetcher:async(url,req)=>{
 requests++;
 assert.equal(url,signed);assert.equal(req.method,'PUT');assert.equal(req.credentials,'omit');assert.equal(req.redirect,'error');
 assert.equal(req.body.get('').name,'video.mp4');assert.equal(req.body.get('').type,'video/mp4');
 assert.equal(req.headers['x-upsert'],'false');return new Response(null,{status:409});
}});
assert.equal(requests,1,'A duplicate upload can be confirmed by the server without replacing the stored file');

const {db,user,owner,other,actor,sessions}=await supportFixture();
try {
 await db.exec(await readFile(new URL('../supabase/migrations/20261125033000_support_reply_media.sql',import.meta.url),'utf8'));
 const thread=randomUUID(),draft=randomUUID();
 await db.query("insert into public.support_threads(id,user_id,app,subject,version) values($1,$2,'salah','Video test','561')",[thread,user]);
 let who=user,asOwner=false,validHeader=false,verifiedAuth=0;
 const request=(phase,tid,did,args,ownerMode=asOwner)=>db.query('select salah_support_private.reply_media_request($1,$2,$3,$4,$5::jsonb) data',[ownerMode,tid,did,phase,JSON.stringify(args)]).then(r=>r.rows[0].data);
 const handler=createSupportHandler({
  getUser:async()=>{verifiedAuth++;return{data:{user:{id:who,email_confirmed_at:'2026-11-25'}}};},
  getClaims:async()=>({data:{claims:{sub:who,session_id:sessions.get(who),iss:'https://kbltwszfvphgbxdbczsb.supabase.co/auth/v1',aal:'aal2'}}}),
  invoke:async(name,a)=>{
   await actor(who);
   if(name==='support_reply_media_start')return request('reserve',a.p_thread,a.p_id,{mime:a.p_mime,bytes:a.p_bytes},a.p_owner);
   assert.equal(name,'support_reply_media_finish');
   const value=await request('inspect',a.p_thread,a.p_id,{},a.p_owner);
   return request('publish',a.p_thread,a.p_id,{body:a.p_body,replyTo:a.p_reply_to,verified:value.uploaded&&validHeader},a.p_owner);
  },
 });
 async function send(action,id,options={}){
  const args={p_app:'salah',p_owner:asOwner,p_thread:thread,p_id:id,...(action==='start'?{p_mime:'video/mp4',p_bytes:mp4.length}:{p_body:'',p_reply_to:null}),...options};
  const response=await handler(new Request('https://fixture.invalid/support',{method:'POST',headers:{Origin:'https://skodytunez-maker.github.io',Authorization:'Bearer signed-test-token','Content-Type':'application/json'},body:JSON.stringify({name:'support_reply_media_'+action,args})}));
  return {code:response.status,...await response.json()};
 }
 const manifest=async(id)=>(await db.query('select salah_support_private.reply_media_manifest($1,$2,$3::uuid[]) data',[thread,asOwner,[id]])).rows[0].data;
 const upload=async(path,mime,bytes)=>db.query("insert into storage.objects(bucket_id,name,metadata) values('support-chat-media',$1,$2::jsonb)",[path,JSON.stringify({size:bytes,mimetype:mime})]);
 const authBefore=verifiedAuth;
 assert.equal((await send('start',draft,{p_mime:'text/html'})).code,400);
 assert.equal(verifiedAuth,authBefore,'Reject unsupported files before authorization or storage');
 const started=(await send('start',draft)).data;
 assert.equal(started.uploaded,false);assert(started.path.startsWith('salah/'+user+'/'+draft+'/'));
 assert.equal((await send('start',draft)).data.path,started.path);
 assert.equal((await send('finish',draft)).code,400,'An empty upload cannot create a message');
 assert.equal((await db.query('select count(*)::int as n from public.support_messages where id=$1',[draft])).rows[0].n,0);
 await upload(started.path,'video/mp4',mp4.length);
 assert.equal((await send('start',draft)).data.uploaded,true);
 assert.equal((await send('finish',draft)).code,400,'Unverified video bytes remain invisible');
 assert.deepEqual(await manifest(draft),[]);
 validHeader=true;
 assert.equal((await send('finish',draft)).data.messageId,draft);
 assert.equal((await send('finish',draft)).data.messageId,draft);
 assert.equal((await send('finish',draft,{p_body:'changed'})).code,400);
 assert.equal((await manifest(draft)).length,1);
 who=other;assert.equal((await send('start',draft)).code,403);
 await actor(other);await assert.rejects(()=>manifest(draft),e=>e.code==='42501');
 who=owner;asOwner=true;await actor(owner);assert.equal((await manifest(draft)).length,1);
 const ownerDraft=randomUUID(),ownerUpload=(await send('start',ownerDraft,{p_mime:'video/quicktime',p_bytes:mov.length})).data;
 await upload(ownerUpload.path,'video/quicktime',mov.length);
 assert.equal((await send('finish',ownerDraft,{p_body:'Video in reply',p_reply_to:draft})).code,200);
 who=user;asOwner=false;await actor(user);
 assert.equal((await manifest(ownerDraft))[0].mime,'video/quicktime');
 const voice=randomUUID(),voiceUpload=(await send('start',voice,{p_mime:'audio/webm',p_bytes:webm.length})).data;
 await upload(voiceUpload.path,'audio/webm',webm.length);
 assert.equal((await send('finish',voice)).code,200);
 assert.equal((await manifest(voice))[0].mime,'audio/webm');
 assert.equal((await send('start',randomUUID(),{p_mime:'audio/mp4',p_bytes:6291457})).code,400);
 await db.query("select public.support_conversation_request('salah',false,'clear',jsonb_build_object('threadId',$1::uuid,'scope','self','operationId',$2::uuid))",[thread,randomUUID()]);
 assert.deepEqual(await manifest(ownerDraft),[]);
 const {rows:[bucket]}=await db.query("select public,file_size_limit from storage.buckets where id='support-chat-media'");
 assert.equal(bucket.public,false);assert.equal(Number(bucket.file_size_limit),20971520);
 console.log('PASS private reply video: MP4/MOV, signed direct upload, retry, unfinished/invisible media, owner + user, and outsider rejection.');
} finally {
 await db.close();
}
