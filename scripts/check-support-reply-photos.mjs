import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {supportFixture} from '../tests/support/chat-fixture.mjs';

const src=await readFile(new URL('../supabase/functions/support-messages/index.ts',import.meta.url),'utf8');
const {createSupportHandler,submitSupportReplyPhotos}=await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
const firstPhoto=Buffer.from([255,216,255,225,0,8,69,120,105,102,0,0,255,192,0,11,8,0,1,0,1,1,1,17,0,255,218,0,8,1,1,0,0,63,0,0,255,217]).toString('base64');
const secondBytes=Buffer.from(firstPhoto,'base64');secondBytes[secondBytes.length-3]=2;
const secondPhoto=secondBytes.toString('base64');
const {db,owner,user,other,actor,sessions}=await supportFixture();
try {
 await db.exec(await readFile(new URL('../supabase/migrations/20261125024500_support_reply_photos.sql',import.meta.url),'utf8'));
 const thread=randomUUID();
 await db.query("insert into public.support_threads(id,user_id,app,subject,version) values($1,$2,'salah','Test','561')",[thread,user]);
 let who=user,mfa=true,uploads=0,failAt=0;
 const objects=new Map();
 const handler=createSupportHandler({
  getUser:async()=>({data:{user:{id:who,email_confirmed_at:'2026-11-25'}}}),
  getClaims:async()=>({data:{claims:{sub:who,iss:'https://kbltwszfvphgbxdbczsb.supabase.co/auth/v1',session_id:sessions.get(who),aal:mfa?'aal2':'aal1'}}}),
  invoke:async(name,a,claims)=>{
   assert.equal(name,'support_reply_photos');
   await actor(who,mfa);
   return db.transaction(async tx=>{
    const storage={
     async upload(path,bytes,options){
      uploads++;
      if(uploads===failAt)return{error:{statusCode:'503'}};
      if(objects.has(path))return{error:{statusCode:'409'}};
      assert.equal(options.contentType,'image/jpeg');assert.equal(options.upsert,false);
      assert(!Buffer.from(bytes).includes(Buffer.from('Exif')));
      await tx.query("insert into storage.objects(bucket_id,name,metadata)values('support-photos',$1,$2::jsonb)",[path,JSON.stringify({size:bytes.length,mimetype:options.contentType})]);
      objects.set(path,bytes);
      return{error:null};
     },
     async remove(paths){
      for(const path of paths){objects.delete(path);await tx.query('delete from storage.objects where name=$1',[path]);}
     },
    };
    return submitSupportReplyPhotos(storage,a,claims,{
     begin:async(body,fingerprint,count)=>(await tx.query('select salah_support_private.begin_reply_photos($1,$2,$3,$4,$5,$6,$7) as data',[a.p_owner,a.p_thread,a.p_id,body,a.p_reply_to,fingerprint,count])).rows[0].data,
     register:(path,size,slot)=>tx.query('select salah_support_private.register_reply_photo($1,$2,$3,$4,$5)',[a.p_owner,a.p_id,path,size,slot]),
    });
   });
  },
 });
 const send=async(id,options={})=>{
  const req=new Request('https://fixture.invalid/support',{
   method:'POST',headers:{Origin:'https://skodytunez-maker.github.io',Authorization:'Bearer fixture-test-token','Content-Type':'application/json'},
   body:JSON.stringify({name:'support_reply_photos',args:{p_app:'salah',p_owner:false,p_thread:thread,p_id:id,p_body:'',p_reply_to:null,p_photos:[firstPhoto,secondPhoto],...options}}),
  });
  const response=await handler(req);return{status:response.status,...await response.json()};
 };
 const read=async(asOwner=false)=>(await db.query("select public.support_conversation_request('salah',$1,'read',jsonb_build_object('threadId',$2::uuid)) as data",[asOwner,thread])).rows[0].data;
 const photoReply=randomUUID();
 assert.equal((await send(photoReply,{p_photos:['not a JPEG']})).status,400);
 failAt=2;
 assert.equal((await send(photoReply)).status,503);
 assert.equal(objects.size,0);assert(!(await read()).messages.some(m=>m.id===photoReply),'A failed upload rolls back the message and clears its first photo');
 failAt=0;
 const received=await send(photoReply);assert.equal(received.status,200);assert.equal(received.data.messageId,photoReply);
 const afterCommit=uploads;
 assert.equal((await send(photoReply)).data.replay,true);assert.equal(uploads,afterCommit,'A lost acknowledgement retries without re-uploading or adding messages');
 assert.equal((await send(photoReply,{p_body:'changed after commit'})).status,400);
 assert.equal((await read()).photoManifest.filter(p=>p.message_id===photoReply).length,2);
 assert.equal((await read()).messages.filter(m=>m.id===photoReply).length,1);
 who=other;
 assert.equal((await send(randomUUID())).status,403);assert.equal(uploads,afterCommit);
 who=owner;mfa=false;
 assert.equal((await send(randomUUID(),{p_owner:true})).status,403);assert.equal(uploads,afterCommit);
 mfa=true;const answer=randomUUID();
 const reply=await send(answer,{p_owner:true,p_body:'Owner reply',p_reply_to:photoReply,p_photos:[firstPhoto]});assert.equal(reply.status,200);
 const ownerRead=await read(true);
 assert.equal(ownerRead.photoManifest.length,3);assert.equal(ownerRead.messages.find(m=>m.id===answer).body,'Owner reply');
 await actor(user);
 assert.equal((await read()).photoManifest.length,3);
 await db.query("select public.support_conversation_request('salah',false,'clear',jsonb_build_object('threadId',$1::uuid,'scope','self','operationId',$2::uuid))",[thread,randomUUID()]);
 assert.equal((await read()).photoManifest.length,0,'Photos hidden from this participant follow the conversation visibility rules');
 await actor(owner);
 assert.equal((await read(true)).photoManifest.length,3,'Self clear keeps the other participant’s photos');
 console.log('PASS Support reply photos: authenticated owner/user, valid JPEG and metadata, atomic failed upload, replay, rejected collision and private visibility.');
} finally {
 await db.close();
}
