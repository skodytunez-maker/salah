import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const load=async path=>import('data:text/javascript;base64,'+Buffer.from(await fs.readFile(new URL(path,import.meta.url),'utf8')).toString('base64'));
const {cleanActivityDays,createCounterHandler}=await load('../supabase/functions/adhkar-sync/index.ts');
const {safeOwnerUserDetails,createOwnerHandler,validOwnerActivityDay}=await load('../supabase/functions/owner-access/index.ts');
const at=Date.parse('2026-10-30T12:00:00Z');
assert.deepEqual(cleanActivityDays(undefined,at),[]);
assert.deepEqual(cleanActivityDays(['2026-10-31','2026-10-23'],at),['2026-10-23','2026-10-31']);
for(const bad of [['2026-02-30'],['2026-10-22'],['2026-11-02'],['2026-10-30','2026-10-30'],{},'2026-10-30',Array(9).fill('2026-10-30')])assert.throws(()=>cleanActivityDays(bad,at));
assert.equal(validOwnerActivityDay('2026-10-31',at),true);assert.equal(validOwnerActivityDay('2026-10-28',at),false);
const uid='11111111-1111-4111-8111-111111111111',sid='22222222-2222-4222-8222-222222222222',device='33333333-3333-4333-8333-333333333333';
const project='https://kbltwszfvphgbxdbczsb.supabase.co';
const claims={sub:uid,iss:project+'/auth/v1',session_id:sid,aal:'aal1'};
const user={id:uid,email_confirmed_at:'2026-01-01',is_anonymous:false};
let merged=null;
const config={getUser:async()=>({data:{user}}),getClaims:async()=>({data:{claims}}),isSessionActive:async()=>true,db:{rate:async()=>true,read:async()=>({}),merge:async(userId,component,days)=>{merged={userId,component,days};return{example:1};}}};
const body={device,sequence:1,seed:{},delta:{example:1}},today=new Date().toISOString().slice(0,10);
const post=value=>new Request(project+'/functions/v1/adhkar-sync',{method:'POST',headers:{Authorization:'Bearer fixture-token-with-enough-characters','Content-Type':'application/json',Origin:'https://skodytunez-maker.github.io'},body:JSON.stringify(value)});
let response=await createCounterHandler(config)(post({...body,activityDays:[today]}));assert.equal(response.status,200);assert.deepEqual(merged,{userId:uid,component:body,days:[today]});assert.deepEqual(await response.json(),{totals:{example:1}});
for(const invalid of [{...body,user_id:device,activityDays:[today]},{...body,activityDays:[{day:today,count:1}]},{...body,activityDays:[today],items:['secret']}]){
 merged=null;assert.equal((await createCounterHandler(config)(post(invalid))).status,400);assert.equal(merged,null);
}
for(const invalidConfig of [{...config,isSessionActive:async()=>false},{...config,getUser:async()=>({data:{user:{...user,is_anonymous:true}}})}]){
 merged=null;const denied=await createCounterHandler(invalidConfig)(post({...body,activityDays:[today]}));assert.ok([401,403].includes(denied.status));assert.equal(merged,null);
}
const minimal=safeOwnerUserDetails({adhkar:{day:today,active:true,items:['secret'],counts:{secret:9},times:[Date.now()]}},uid);
assert.deepEqual(minimal.adhkar,{day:today,active:true});assert.doesNotMatch(JSON.stringify(minimal),/secret|counts|times/);
const owner='dc1eb1cc-6f8f-472f-a937-735fbfbba4b7';let selected=null;
const ownerConfig={getUser:async()=>({data:{user:{id:owner,email_confirmed_at:'2026-01-01',factors:[{status:'verified',factor_type:'totp'}]}}}),getClaims:async()=>({data:{claims:{...claims,sub:owner,aal:'aal2'}}}),isSessionActive:async()=>true,readUser:async(id,day)=>{selected={id,day};return{adhkar:{day,active:true}};}};
const req=new Request(project+'/functions/v1/owner-access?mode=user&ids='+uid+'&activityDay='+today,{headers:{Authorization:'Bearer fixture-token-with-enough-characters'}});
response=await createOwnerHandler(ownerConfig)(req);assert.equal(response.status,200);assert.deepEqual(selected,{id:uid,day:today});assert.deepEqual((await response.json()).adhkar,{day:today,active:true});
selected=null;assert.equal((await createOwnerHandler({...ownerConfig,getUser:config.getUser})(req)).status,403);assert.equal(selected,null);
console.log('PASS: bounded day-only input, JWT-owned writes, no cross-user activity, revoked/anonymous denied, owner MFA read and minimal boolean output; old counter body remains compatible.');
