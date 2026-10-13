import assert from 'node:assert/strict';
import {createSessionGuard} from '../dist/js/auth-session.js';
let now=0,checks=0,refreshes=0,outs=0,failure=null,release=null;
let session={access_token:'fixture-0',user:{id:'fixture-user'}};
const auth={getSession:async()=>({data:{session}}),getUser:async token=>{checks++;const user=session?.user;if(release)await release.promise;return{data:{user},error:failure};},refreshSession:async()=>{refreshes++;return{data:{session}};},signOut:async options=>{assert.equal(options.scope,'local');outs++;session=null;return{};}};
const guard=createSessionGuard({getAuth:()=>auth,now:()=>now});
assert.equal((await guard({force:true})).state,'valid');assert.equal(checks,1,'A forced check must verify Auth using the existing access token');assert.equal(refreshes,0,'A valid access token must not be rotated to check a session');
for(let i=0;i<20;i++){now+=30001;assert.equal((await guard({force:true})).state,'valid');}assert.equal(refreshes,0);assert.equal(checks,21);
failure={status:503};assert.equal((await guard({force:true})).state,'unavailable');assert.equal(outs,0);assert.ok(session);
failure={code:'session_not_found',status:403};assert.equal((await guard({force:true})).state,'revoked');assert.equal(outs,1);assert.equal(session,null);
session={access_token:'fixture-old',user:{id:'fixture-user'}};let resolve;release={promise:new Promise(r=>resolve=r)};failure={code:'session_not_found',status:403};const stale=guard({force:true});await new Promise(r=>setImmediate(r));session={access_token:'fixture-new-account',user:{id:'another-user'}};resolve();assert.equal((await stale).state,'changed');assert.equal(outs,1,'An old response cannot sign out a newer account');
release=null;failure=null;assert.equal((await guard({force:true})).state,'valid');
// Concurrent UI checks share one server request.
let finish;release={promise:new Promise(r=>finish=r)};const before=checks;const a=guard({force:true}),b=guard({force:true});await new Promise(r=>setImmediate(r));finish();assert.equal((await a).state,'valid');assert.equal((await b).state,'valid');assert.equal(checks,before+1);assert.equal(refreshes,0);
console.log('PASS: repeated and concurrent Auth checks do not rotate tokens; revoked sessions close; temporary outages and stale replies cannot sign out a valid new session.');
