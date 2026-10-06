import assert from'node:assert/strict';import{readFile}from'node:fs/promises';
const source=await readFile(new URL('../supabase/functions/support-messages/index.ts',import.meta.url),'utf8'),{createSupportHandler}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const id='11111111-1111-4111-8111-111111111111',sid='22222222-2222-4222-8222-222222222222',user={id,email_confirmed_at:'2026-10-04',is_anonymous:false},claims={sub:id,iss:'https://kbltwszfvphgbxdbczsb.supabase.co/auth/v1',session_id:sid,aal:'aal1'};let calls=0,authCalls=0;
const args={p_app:'salah',p_owner:false,p_before:null},body={name:'support_list',args};
const services={getUser:async()=>{authCalls++;return{data:{user}}},getClaims:async()=>({data:{claims}}),invoke:async(name,args,signed)=>{calls++;assert.equal(name,'support_list');assert.equal(signed,claims);return[]}};
const request=(value=body,options={})=>new Request('https://service.test/support'+(options.query||''),{method:options.method||'POST',headers:{Origin:'https://skodytunez-maker.github.io',Authorization:'Bearer test-verified-token','Content-Type':'application/json',...options.headers},body:['GET','OPTIONS'].includes(options.method)?undefined:options.raw??JSON.stringify(value)});
for(const [input,options,status]of [[body,{headers:{Authorization:''}},401],[body,{headers:{Origin:'https://evil.test'}},403],[body,{method:'GET'},405],[body,{query:'?id='+id},400],[body,{headers:{'Content-Type':'text/plain'}},415],[body,{raw:'x'.repeat(20001)},413],[{name:'support_actor',args},{},400],[{...body,user_id:id},{},400],[{...body,args:{...args,user_id:id}},{},400],[{...body,args:{...args,p_app:'sahaba'}},{},403],[{...body,args:{...args,p_owner:'false'}},{},400],[{...body,args:{...args,p_before:'bad'}},{},400]])assert.equal((await createSupportHandler(services)(request(input,options))).status,status);
assert.equal(calls,0);assert.equal(authCalls,0);
let response=await createSupportHandler(services)(request());assert.equal(response.status,200);assert.deepEqual(await response.json(),{data:[]});assert.equal(authCalls,1);
for(const bad of [{sub:'33333333-3333-4333-8333-333333333333'},{iss:'https://evil.test'},{session_id:null}])assert.equal((await createSupportHandler({...services,getClaims:async()=>({data:{claims:{...claims,...bad}}})})(request())).status,401);
for(const patch of [{email_confirmed_at:null},{is_anonymous:true}])assert.equal((await createSupportHandler({...services,getUser:async()=>({data:{user:{...user,...patch}}})})(request())).status,401);
assert.equal((await createSupportHandler({...services,getClaims:async()=>({error:Error('signature')})})(request())).status,401);
assert.equal((await createSupportHandler({...services,getUser:async()=>{throw Error('secret')}})(request())).status,503);
for(const [error,status]of [[{code:'42501'},403],[{message:'support_rate_limit'},429],[{message:'secret=credential'},503]]){response=await createSupportHandler({...services,invoke:async()=>{throw error}})(request());assert.equal(response.status,status);assert.ok(!(await response.text()).includes('credential'));}
response=await createSupportHandler(services)(request(body,{method:'OPTIONS'}));assert.equal(response.status,204);assert.equal(response.headers.get('Access-Control-Allow-Origin'),'https://skodytunez-maker.github.io');
assert.equal((await createSupportHandler({...services,invoke:async()=>[]})(request({...body,args:{...args,p_app:'sahaba'}},{headers:{Origin:'https://sahaba-learning.skodytunez.chatgpt.site'}}))).status,200);
const inbox=await readFile(new URL('../supabase/migrations/20261006190000_support_owner_inbox.sql',import.meta.url),'utf8');
assert.ok(inbox.includes('owner_seen_at timestamptz'));assert.ok(inbox.includes('AS owner_unread'));assert.ok(inbox.includes('public.support_actor(p_owner)'));
assert.ok(inbox.includes("SECURITY DEFINER SET search_path=''"));assert.ok(inbox.includes('REVOKE ALL ON FUNCTION public.support_list'));
assert.ok(inbox.includes('owner_seen_at=coalesce('),'Opening or answering an owner thread advances its seen marker');
console.log('PASS: signed identity, fresh Auth checks, bounded input, strict operations, per-app origins, safe errors, owner unread migrations and no caller-provided authority. Database integration separately verifies active sessions and owner MFA.');

const ownerArgs={p_id:sid,p_user:id,p_app:'salah',p_subject:'Сообщение от SALAH',p_body:'Текст',p_version:'219'};
const recipientRequest={name:'support_owner_recipient',args:{p_user:id,p_app:'salah'}};
const ownerCreate={name:'support_owner_create',args:ownerArgs};
for(const invalid of [{...ownerCreate,args:{...ownerArgs,p_user:'invalid'}},{...ownerCreate,args:{...ownerArgs,p_owner:true}},{...ownerCreate,args:{...ownerArgs,p_app:'sahaba'}}]){
 assert.equal((await createSupportHandler(services)(request(invalid))).status,invalid.args.p_app==='sahaba'?403:400);
}
let ownerCalls=[];
const ownerServices={...services,invoke:async(name,params,signed)=>{ownerCalls.push({name,params,signed});return name==='support_owner_recipient'?{id:params.p_user,nickname:'Получатель'}:params.p_id}};
response=await createSupportHandler(ownerServices)(request(recipientRequest));assert.equal(response.status,200);
response=await createSupportHandler(ownerServices)(request(ownerCreate));assert.equal(response.status,200);assert.equal(ownerCalls[1].params.p_user,id);
assert.equal((await createSupportHandler({...ownerServices,invoke:async()=>{throw{code:'42501'}}})(request(ownerCreate))).status,403,'Database owner/MFA denial propagates without creating a message');
assert.equal((await createSupportHandler(ownerServices)(request(ownerCreate,{headers:{Authorization:''}}))).status,401);
console.log('PASS: owner compose/read operations accept only exact recipient UUIDs, preserve origin/app isolation and propagate server owner-MFA denial.');
