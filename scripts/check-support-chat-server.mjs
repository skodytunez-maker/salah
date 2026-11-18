import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../supabase/functions/support-messages/index.ts',import.meta.url),'utf8');
const {createSupportHandler}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const user='11111111-1111-4111-8111-111111111111',session='22222222-2222-4222-8222-222222222222',thread='33333333-3333-4333-8333-333333333333';
const claims={sub:user,session_id:session,iss:'https://kbltwszfvphgbxdbczsb.supabase.co/auth/v1',aal:'aal1'};
const calls=[];let authCalls=0;
const services={getUser:async()=>{authCalls++;return{data:{user:{id:user,email_confirmed_at:'2026-11-18',is_anonymous:false}}};},getClaims:async()=>({data:{claims}}),invoke:async(name,args,signed)=>{calls.push({name,args,signed});return{ok:true};}};
const request=(args,headers={})=>new Request('https://service.invalid/support',{method:'POST',headers:{Origin:'https://skodytunez-maker.github.io',Authorization:'Bearer signed-test-token','Content-Type':'application/json',...headers},body:JSON.stringify({name:'support_chat_request',args})});
const wrap=(action,args)=>({p_app:'salah',p_owner:false,p_action:action,p_args:args});
const valid=[wrap('read',{threadId:thread}),wrap('reply',{threadId:thread,messageId:user,body:'Reply',replyTo:session}),wrap('delete',{threadId:thread,messageId:user,scope:'self',operationId:session}),wrap('clear',{threadId:thread,scope:'everyone',operationId:session})];
for(const args of valid){const response=await createSupportHandler(services)(request(args));assert.equal(response.status,200);assert.equal(response.headers.get('Cache-Control'),'no-store, private');assert.deepEqual(calls.at(-1).args,args);assert.deepEqual(calls.at(-1).signed,claims);}
const before=calls.length,authBefore=authCalls;
for(const args of [
 {...valid[0],p_owner:'true'}, {...valid[0],p_action:'drop'}, {...valid[0],p_args:[]},
 wrap('read',{threadId:thread,user_id:user}), wrap('read',{threadId:'bad'}),
 wrap('reply',{threadId:thread,messageId:user,body:'',replyTo:null}),
 wrap('reply',{threadId:thread,messageId:user,body:'x'.repeat(3001),replyTo:null}),
 wrap('reply',{threadId:thread,messageId:user,body:'Reply',replyTo:'bad'}),
 wrap('delete',{threadId:thread,messageId:user,scope:'all',operationId:session}),
 wrap('delete',{threadId:thread,scope:'everyone',operationId:session}),
 wrap('clear',{threadId:thread,scope:'everyone'}),
 wrap('clear',{threadId:thread,scope:'everyone',operationId:session,messageId:user}),
 {...valid[0],p_app:'sahaba'}
])assert.ok((await createSupportHandler(services)(request(args))).status>=400);
assert.equal(calls.length,before);assert.equal(authCalls,authBefore,'Malformed operations fail before credentials or SQL are touched');
assert.equal((await createSupportHandler(services)(request(valid[3],{Authorization:''}))).status,401);
assert.equal((await createSupportHandler(services)(request(valid[3],{Origin:'https://evil.invalid'}))).status,403);
assert.equal((await createSupportHandler({...services,getClaims:async()=>({data:{claims:{...claims,sub:thread}}})})(request(valid[3]))).status,401);
for(const [error,status] of [[{code:'42501'},403],[{code:'22023'},400],[{message:'reply_unavailable'},429],[{message:'secret database details'},503]]){
 const response=await createSupportHandler({...services,invoke:async()=>{throw error;}})(request(valid[2]));assert.equal(response.status,status);assert.ok(!(await response.text()).includes('database details'));
}
assert.equal((await createSupportHandler(services)(request({...valid[0],p_app:'sahaba'},{Origin:'https://sahaba-learning.skodytunez.chatgpt.site'}))).status,400,'The new protocol cannot mutate the separate SAHABA app');
console.log('PASS support chat HTTP: exact nested actions, signed initiating identity, app/origin separation, no-store replies and bounded safe errors.');
