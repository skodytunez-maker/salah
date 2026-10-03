import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../supabase/functions/account-presence/index.ts',import.meta.url),'utf8');
const {createPresenceHandler}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const id='11111111-1111-4111-8111-111111111111',sid='22222222-2222-4222-8222-222222222222',tab='33333333-3333-4333-8333-333333333333';
const user={id,email_confirmed_at:'2026-10-03',is_anonymous:false};
const claims={sub:id,iss:'https://kbltwszfvphgbxdbczsb.supabase.co/auth/v1',session_id:sid};
const input={p_app:'salah',p_tab:tab,p_active:true,p_sequence:1};let writes=[];
const services={getUser:async()=>({data:{user}}),getClaims:async()=>({data:{claims}}),isSessionActive:async(uid,session)=>{assert.equal(uid,id);assert.equal(session,sid);return true;},record:async(uid,data)=>writes.push({uid,data})};
const request=(data=input,options={})=>new Request('https://project.test/functions/v1/account-presence'+(options.query||''),{method:options.method||'POST',headers:{Origin:'https://skodytunez-maker.github.io',Authorization:'Bearer valid-user-token','Content-Type':'application/json',...options.headers},body:options.method==='GET'||options.method==='OPTIONS'?undefined:options.raw??JSON.stringify(data)});
const handler=createPresenceHandler(services);
for(const [data,options,status]of [
 [input,{headers:{Authorization:''}},401],
 [input,{headers:{Origin:'https://evil.example'}},403],
 [input,{method:'GET'},405],
 [input,{query:'?user_id='+id},400],
 [input,{headers:{'Content-Type':'text/plain'}},415],
 [{...input,user_id:id},{},400],
 [{...input,p_app:'sahaba'},{},400],
 [{...input,p_active:'true'},{},400],
 [{...input,p_tab:'bad'},{},400],
 [{...input,p_sequence:Number.MAX_SAFE_INTEGER+1},{},400],
 [input,{raw:'x'.repeat(1025)},413]
])assert.equal((await handler(request(data,options))).status,status);
assert.equal(writes.length,0,'Malformed, anonymous and cross-origin calls cannot write');
for(const override of [
 {getUser:async()=>({error:Error('bad token')})},
 {getClaims:async()=>({error:Error('bad signature')})},
 {getClaims:async()=>({data:{claims:{...claims,sub:sid}}})},
 {getClaims:async()=>({data:{claims:{...claims,iss:'https://another.example/auth/v1'}}})},
 {getClaims:async()=>({data:{claims:{...claims,session_id:undefined}}})},
 {getUser:async()=>({data:{user:{...user,email_confirmed_at:null}}})},
 {getUser:async()=>({data:{user:{...user,is_anonymous:true}}})},
 {isSessionActive:async()=>false}
])assert.equal((await createPresenceHandler({...services,...override})(request())).status,401);
assert.equal(writes.length,0,'Unconfirmed, forged or revoked sessions cannot write');
const response=await handler(request());assert.equal(response.status,200);assert.deepEqual(await response.json(),{ok:true});assert.equal(response.headers.get('Cache-Control'),'no-store, private');assert.equal(response.headers.get('Access-Control-Allow-Origin'),'https://skodytunez-maker.github.io');assert.deepEqual(writes,[{uid:id,data:input}]);
assert.equal((await createPresenceHandler({...services,isSessionActive:async()=>{throw Error('private database failure')}})(request())).status,503);
const failed=await createPresenceHandler({...services,record:async()=>{throw Error('private database failure')}})(request());assert.equal(failed.status,503);assert.ok(!(await failed.text()).includes('private database failure'));
assert.match(source,/clock_timestamp\(\)/,'Visit time must come from the server');
assert.match(source,/where excluded\.sequence>app_presence\.sequence/,'A delayed offline request cannot replace a newer foreground record');
console.log('PASS: presence writes only for the verified caller; anonymous, forged, revoked, foreign origin and supplied user ID denied; database errors fail closed; no user data returned.');
