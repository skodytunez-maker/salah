import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createContext,Script} from 'node:vm';
import {createSessionGuard} from '../dist/js/auth-session.js';

// Three tabs share SDK refresh events. Fixtures never contact Auth or use real tokens.
const source=await readFile(new URL('../dist/js/owner-auth.js',import.meta.url),'utf8');
const executable=source.replace(/^import[^\n]*\n/gm,'').replace(/\bexport /g,'')+'\n;({verifyOwner,accountAuthClient,ownerVerified});';
const callbacks=[],queue=[],tabs=[],routes=[];
let now=1000,refreshes=0,gates=0,allow=true;
let session={access_token:'fixture-0',user:{id:'11111111-1111-4111-8111-111111111111'}};
for(let i=0;i<3;i++){
 const auth={
  onAuthStateChange:fn=>{callbacks.push(fn);},
  getSession:async()=>({data:{session}}),
  refreshSession:async()=>{refreshes++;session={...session,access_token:'fixture-'+refreshes};for(const fn of callbacks)fn('TOKEN_REFRESHED',session);return{data:{session}};},
  signOut:async()=>({error:null})
 };
 const location={hash:'#account'};routes.push(location);
 const context=createContext({location,Date:{now:()=>now},createSessionGuard,createAuthTransport:()=>()=>{},window:{supabase:{createClient:()=>({auth})}},setTimeout:fn=>{queue.push(fn);return queue.length;},fetch:async()=>{gates++;return allow?Response.json({owner:true}):Response.json({error:'owner_only'},{status:403});},AbortSignal,Error,URLSearchParams});
 const tab=new Script(executable).runInContext(context);tab.accountAuthClient();tabs.push(tab);
}
await tabs[0].verifyOwner({verifySession:true});
let rounds=0;
while(queue.length&&rounds++<40){const task=queue.splice(0);for(const fn of task)fn();for(let i=0;i<25;i++)await Promise.resolve();}
const observed={refreshes,gates,rounds,queued:queue.length};
if(process.argv.includes('--baseline'))console.log(JSON.stringify(observed));
else{
 assert.equal(queue.length,0,'A refresh event must settle, not start another refresh loop');
 assert.equal(refreshes,1,'The other tabs reuse the SDK refresh instead of rotating the session again');
 assert.ok(gates<=6,'Server owner checks remain bounded');
 assert.ok(tabs.every(tab=>tab.ownerVerified()));
 // Routine renewal of the same verified owner does not collapse the cabinet.
 session={...session,access_token:'fixture-next'};for(const fn of callbacks)fn('TOKEN_REFRESHED',session);
 assert.ok(tabs.every(tab=>tab.ownerVerified()));
 while(queue.length){const task=queue.splice(0);for(const fn of task)fn();for(let i=0;i<25;i++)await Promise.resolve();}
 for(const route of routes)route.hash='#home';
 session={...session,access_token:'fixture-home'};const beforeHome=gates;for(const fn of callbacks)fn('TOKEN_REFRESHED',session);
 assert.equal(queue.length,0);assert.equal(gates,beforeHome,'Home does not request owner-only data');
 // A cached owner grant does not defeat a subsequent server refusal.
 allow=false;await assert.rejects(tabs[0].verifyOwner());assert.equal(tabs[0].ownerVerified(),false);
 console.log('PASS: three-tab Auth refresh settles once; owner checks stay bounded; subsequent server refusal still removes access.');
}

// A late refresh response cannot replace a newer broadcast renewal.
let current={access_token:'old'},release;
const guard=createSessionGuard({getAuth:()=>({getSession:async()=>({data:{session:current}}),refreshSession:()=>new Promise(done=>release=done)}),now:()=>1000});
const pending=guard({force:true});for(let i=0;!release&&i<10;i++)await Promise.resolve();
current={access_token:'newer'};guard.acceptRefresh(current);release({data:{session:{access_token:'older-response'}}});
assert.equal((await pending).session.access_token,'newer');assert.equal((await guard()).session.access_token,'newer');
