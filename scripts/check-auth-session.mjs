import assert from 'node:assert/strict';
import {createSessionGuard} from '../dist/js/auth-session.js';
let now=0,checks=0,refreshes=0,outs=0,failure=null,release=null,recover=false;
let session={access_token:'fixture-0',user:{id:'fixture-user'}};
const auth={getSession:async()=>({data:{session}}),getUser:async token=>{checks++;const user=session?.user;if(release)await release.promise;return{data:{user},error:failure};},refreshSession:async()=>{refreshes++;if(recover){session={...session,access_token:'recovered-fixture'};failure=null;}return{data:{session}};},signOut:async options=>{assert.equal(options.scope,'local');outs++;session=null;return{};}};
const guard=createSessionGuard({getAuth:()=>auth,now:()=>now});
assert.equal((await guard({force:true})).state,'valid');assert.equal(checks,1,'A forced check must verify Auth using the existing access token');assert.equal(refreshes,0,'A valid access token must not be rotated to check a session');
for(let i=0;i<20;i++){now+=30001;assert.equal((await guard({force:true})).state,'valid');}assert.equal(refreshes,0);assert.equal(checks,21);
failure={status:503};assert.equal((await guard({force:true})).state,'unavailable');assert.equal(outs,0);assert.ok(session);
failure={code:'bad_jwt',status:403};recover=true;assert.equal((await guard({force:true})).state,'valid');assert.equal(refreshes,1,'An Auth-rejected access token gets one recovery, not a logout');assert.equal(outs,0);recover=false;
failure={code:'session_not_found',status:403};assert.equal((await guard({force:true})).state,'revoked');assert.equal(outs,1);assert.equal(session,null);
session={access_token:'fixture-old',user:{id:'fixture-user'}};let resolve;release={promise:new Promise(r=>resolve=r)};failure={code:'session_not_found',status:403};const stale=guard({force:true});await new Promise(r=>setImmediate(r));session={access_token:'fixture-new-account',user:{id:'another-user'}};resolve();assert.equal((await stale).state,'changed');assert.equal(outs,1,'An old response cannot sign out a newer account');
release=null;failure=null;assert.equal((await guard({force:true})).state,'valid');
// Concurrent UI checks share one server request.
let finish;release={promise:new Promise(r=>finish=r)};const before=checks;const a=guard({force:true}),b=guard({force:true});await new Promise(r=>setImmediate(r));finish();assert.equal((await a).state,'valid');assert.equal((await b).state,'valid');assert.equal(checks,before+1);assert.equal(refreshes,1);
console.log('PASS: repeated and concurrent Auth checks do not rotate tokens; revoked sessions close; temporary outages and stale replies cannot sign out a valid new session.');

// Expired JWT recovery is bounded and preserves temporary network failures.
for(const recoveryError of [{status:503},{code:'refresh_token_already_used',status:400},null]){
 let rotations=0,refusals=0,closed=0,active={access_token:'expired-fixture',user:{id:'fixture-user'}};
 const retryGuard=createSessionGuard({getAuth:()=>({getSession:async()=>({data:{session:active}}),getUser:async()=>{refusals++;return{error:{code:'bad_jwt',status:403}};},refreshSession:async()=>{rotations++;if(recoveryError)return{error:recoveryError};active={...active,access_token:'renewed-fixture'};return{data:{session:active}};},signOut:async()=>{closed++;active=null;return{};}})});
 const result=await retryGuard({force:true});assert.equal(rotations,1);assert.equal(refusals,recoveryError?1:2);assert.equal(result.state,recoveryError?.status===503?'unavailable':'revoked');assert.equal(closed,recoveryError?.status===503?0:1);
}
console.log('PASS: expired-JWT recovery never loops; transient recovery failure preserves the session; confirmed refusal ends only the current local session.');

// An intermediary 401/403 without an Auth error code is not session revocation.
for(const status of [401,403]){
 let ended=0,active={access_token:'network-fixture',user:{id:'fixture-user'}};
 const networkGuard=createSessionGuard({getAuth:()=>({getSession:async()=>({data:{session:active}}),getUser:async()=>({error:{status}}),signOut:async()=>{ended++;active=null;return{};}})});
 assert.equal((await networkGuard({force:true})).state,'unavailable');assert.equal(ended,0);assert.ok(active);
}
// A pending signed-out result cannot mask a successful fresh login.
let finishRead,firstRead=true,live=null;
const readGate=new Promise(resolve=>finishRead=resolve);
const eventGuard=createSessionGuard({getAuth:()=>({getSession:async()=>{if(firstRead){firstRead=false;const old=live;await readGate;return{data:{session:old}};}return{data:{session:live}};},getUser:async()=>({data:{user:live.user}})})});
const oldRead=eventGuard();
live={access_token:'signed-in-fixture',user:{id:'fixture-user'}};
eventGuard.acceptRefresh(live);
assert.equal((await eventGuard()).state,'valid');
finishRead();assert.equal((await oldRead).state,'changed');
assert.equal((await eventGuard()).state,'valid');
console.log('PASS: intermediary refusals preserve login; stale pre-login work cannot hide a fresh signed-in session.');
