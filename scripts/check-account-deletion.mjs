import assert from 'node:assert/strict';
import {createAccountDeletionHandler} from '../supabase/functions/account-delete/handler.mjs';

const uid='11111111-1111-4111-8111-111111111111',sid='22222222-2222-4222-8222-222222222222',token='a'.repeat(32);
const validUser={id:uid,email_confirmed_at:'2026-10-06T00:00:00Z',is_anonymous:false};
const validClaims={sub:uid,iss:'https://kbltwszfvphgbxdbczsb.supabase.co/auth/v1',session_id:sid};
let active=true,deleted=[],authCalls=0;
const handler=createAccountDeletionHandler({
 getUser:async value=>{authCalls++;assert.equal(value,token);return{data:{user:validUser}};},
 getClaims:async value=>{assert.equal(value,token);return{data:{claims:validClaims}};},
 isSessionActive:async(user,session)=>active&&user===uid&&session===sid,
 deleteUser:async user=>deleted.push(user)
});
const request=({origin='https://skodytunez-maker.github.io',method='POST',authorization='Bearer '+token,body={confirmation:'DELETE'},url='https://project.test/functions/v1/account-delete',headers={}}={})=>new Request(url,{method,headers:{Origin:origin,Authorization:authorization,'Content-Type':'application/json',...headers},body:method==='POST'?JSON.stringify(body):undefined});
const call=async options=>handler(request(options));

assert.equal((await call({method:'OPTIONS'})).status,204);
assert.equal((await call({origin:'https://evil.example'})).status,403);
assert.equal((await call({authorization:''})).status,401);
assert.equal((await call({body:{confirmation:'DELETE',user_id:uid}})).status,400);
assert.equal((await call({body:{confirmation:'delete'}})).status,400);
assert.equal((await handler(new Request('https://project.test/functions/v1/account-delete',{method:'POST',headers:{Origin:'https://skodytunez-maker.github.io',Authorization:'Bearer '+token,'Content-Type':'application/json'},body:'x'.repeat(1001)}))).status,413);
assert.equal((await call({url:'https://project.test/functions/v1/account-delete?uid='+uid})).status,400);
assert.equal((await call({method:'GET'})).status,405);
assert.equal(deleted.length,0);

active=false;assert.equal((await call()).status,401);active=true;
const anonymousHandler=createAccountDeletionHandler({getUser:async()=>({data:{user:{...validUser,is_anonymous:true}}}),getClaims:async()=>({data:{claims:validClaims}}),isSessionActive:async()=>true,deleteUser:async user=>deleted.push(user)});
assert.equal((await anonymousHandler(request())).status,401);
const unconfirmedHandler=createAccountDeletionHandler({getUser:async()=>({data:{user:{...validUser,email_confirmed_at:null}}}),getClaims:async()=>({data:{claims:validClaims}}),isSessionActive:async()=>true,deleteUser:async user=>deleted.push(user)});
assert.equal((await unconfirmedHandler(request())).status,401);
assert.equal(deleted.length,0);

const success=await call();assert.equal(success.status,200);assert.deepEqual(await success.json(),{deleted:true});assert.deepEqual(deleted,[uid]);assert.equal(authCalls,2);
const failedHandler=createAccountDeletionHandler({getUser:async()=>({data:{user:validUser}}),getClaims:async()=>({data:{claims:validClaims}}),isSessionActive:async()=>true,deleteUser:async()=>{throw Error('admin failure')}});
assert.equal((await failedHandler(request())).status,503);

console.log('PASS: deletion requires an explicit confirmation, allowed app origin, verified confirmed account and active session; only the authenticated UID is deleted; authorization, expiry and admin failures are denied safely.');

for(const origin of ['capacitor://localhost','http://localhost','https://localhost']){
 const pre=await call({origin,method:'OPTIONS'});assert.equal(pre.status,204);assert.equal(pre.headers.get('Access-Control-Allow-Origin'),origin);
 assert.equal((await call({origin,body:{}})).status,400);
 assert.equal((await call({origin,authorization:''})).status,401);
}
console.log('PASS: APK deletion entry retains explicit confirmation and authenticated identity checks. No real accounts deleted.');
