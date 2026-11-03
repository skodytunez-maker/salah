import{createAuthLock}from '../dist/js/auth-transport.js';
import{personalDataAllowed}from '../dist/js/audience.js';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createContext,Script} from 'node:vm';
import {createSessionGuard} from '../dist/js/auth-session.js';

// Three tabs share SDK refresh events. Fixtures never contact Auth or use real tokens.
const source=await readFile(new URL('../dist/js/owner-auth.js',import.meta.url),'utf8');
const executable=source.replace(/^import[^\n]*\n/gm,'').replace(/\bexport /g,'')+'\n;({verifyOwner,accountAuthClient,ownerVerified,initOwnerAccess});';
const lessonMarkers=[];const callbacks=[],queue=[],tabs=[],routes=[],storageListeners=[];
let now=1000,refreshes=0,userChecks=0,gates=0,allow=true;
let session={access_token:'fixture-0',user:{id:'11111111-1111-4111-8111-111111111111',email_confirmed_at:'2026-10-02'}};
for(let i=0;i<3;i++){
 const auth={
  onAuthStateChange:fn=>{callbacks.push(fn);},
  getSession:async()=>({data:{session}}),
  getUser:async token=>{userChecks++;assert.equal(token,session.access_token);return{data:{user:session.user}};},
  refreshSession:async()=>{refreshes++;session={...session,access_token:'fixture-'+refreshes};for(const fn of callbacks)fn('TOKEN_REFRESHED',session);for(const listener of storageListeners)listener({key:'salah-owner-session-v1',newValue:JSON.stringify(session)});return{data:{session}};},
  signOut:async()=>({error:null})
 };
 const location={hash:'#account'};routes.push(location);
 const context=createContext({syncLessonNotificationAccount:value=>lessonMarkers.push(value),personalDataAllowed,createAuthLock,location,Date:{now:()=>now},createSessionGuard,createAuthTransport:()=>()=>{},localStorage:{getItem:()=>session?JSON.stringify(session):null},document:{addEventListener(){}},setInterval:()=>0,window:{supabase:{createClient:()=>({auth})},addEventListener:(type,fn)=>{if(type==='storage')storageListeners.push(fn);}},setTimeout:fn=>{queue.push(fn);return queue.length;},fetch:async()=>{gates++;return allow?Response.json({owner:true}):Response.json({error:'owner_only'},{status:403});},AbortSignal,Error,URLSearchParams});
 const tab=new Script(executable).runInContext(context);tab.accountAuthClient();tab.initOwnerAccess(()=>{});tabs.push(tab);
}
await tabs[0].verifyOwner({verifySession:true});
let rounds=0;
while(queue.length&&rounds++<40){const task=queue.splice(0);for(const fn of task)fn();for(let i=0;i<25;i++)await Promise.resolve();}
const observed={refreshes,gates,rounds,queued:queue.length};
if(process.argv.includes('--baseline'))console.log(JSON.stringify(observed));
else{
 assert.equal(queue.length,0,'A refresh event must settle, not start another refresh loop');
 assert.equal(refreshes,0,'UI checks cannot rotate tokens in any starting tab');assert.ok(userChecks<=3,'Live Auth checks stay bounded');
 assert.ok(gates<=6,'Server owner checks remain bounded');
 assert.ok(tabs.every(tab=>tab.ownerVerified()));
 // Routine renewal of the same verified owner does not collapse the cabinet.
 session={...session,access_token:'fixture-next'};for(const fn of callbacks)fn('TOKEN_REFRESHED',session);assert.ok(lessonMarkers.slice(-3).every(value=>value===session.user.id),'Only the confirmed account ID is sent to the lesson notification marker');
 assert.ok(tabs.every(tab=>tab.ownerVerified()));
 while(queue.length){const task=queue.splice(0);for(const fn of task)fn();for(let i=0;i<25;i++)await Promise.resolve();}
 for(const route of routes)route.hash='#home';
 session={...session,access_token:'fixture-home'};const beforeHome=gates;for(const fn of callbacks)fn('TOKEN_REFRESHED',session);
 assert.equal(queue.length,0);assert.equal(gates,beforeHome,'Home does not request owner-only data');
 // A cached owner grant does not defeat a subsequent server refusal.
 allow=false;assert.equal(await tabs[0].verifyOwner(),false,'A server refusal returns false and revokes the cached UI grant');assert.equal(tabs[0].ownerVerified(),false);
 session=null;for(const listener of storageListeners)listener({key:'salah-owner-session-v1',newValue:null});assert.ok(tabs.every(tab=>!tab.ownerVerified()),'Removal immediately hides owner-only UI');while(queue.length){for(const fn of queue.splice(0))fn();for(let i=0;i<25;i++)await Promise.resolve();}assert.ok(tabs.every(tab=>!tab.ownerVerified()));
 console.log('PASS: SDK and storage refresh events settle across three tabs; owner checks stay bounded; server refusal and session removal revoke access.');
}

// A late refresh response cannot replace a newer broadcast renewal.
let current={access_token:'old',user:{id:'fixture-user'}},release;
const guard=createSessionGuard({getAuth:()=>({getSession:async()=>({data:{session:current}}),getUser:()=>new Promise(done=>release=done)}),now:()=>1000});
const pending=guard({force:true});for(let i=0;!release&&i<10;i++)await Promise.resolve();
current={access_token:'newer',user:{id:'fixture-user'}};guard.acceptRefresh(current);release({data:{user:{id:'fixture-user'}}});
assert.equal((await pending).state,'changed');assert.equal((await guard()).session.access_token,'newer');

for(const fn of callbacks)fn('SIGNED_OUT',null);assert.ok(lessonMarkers.slice(-3).every(value=>value===null),'Lesson notification identity clears on sign-out');

// Minimal Web Locks contract: FIFO acquisition, abort only queued requests, and
// ifAvailable never starts work while another session writer holds the lock.
function fixtureLocks(){
 const slots=new Map();const calls=[];
 return {calls,request(name,options,fn){
  calls.push(options);assert.ok(!options.steal,'An active session writer must never lose its lock');
  let slot=slots.get(name);if(!slot){slot={held:false,queue:[]};slots.set(name,slot);}
  if(slot.held&&options.ifAvailable)return Promise.resolve().then(()=>fn(null));
  return new Promise((resolve,reject)=>{
   const item={run:null};const abort=()=>{slot.queue=slot.queue.filter(v=>v!==item);reject(options.signal.reason);};
   item.run=()=>{slot.held=true;options.signal?.removeEventListener('abort',abort);Promise.resolve().then(()=>fn({name})).then(resolve,reject).finally(()=>{slot.held=false;slot.queue.shift()?.run();});};
   if(options.signal?.aborted){abort();return;}options.signal?.addEventListener('abort',abort,{once:true});
   if(slot.held)slot.queue.push(item);else item.run();
  });
 }};
}
// Use the shipped SDK and the actual account client options, not a stub of its
// refresh/write behavior. A delayed profile update must retain rotated tokens.
for(const coordination of ['process','web']){
 const locks=fixtureLocks();
 const sdkSource=await readFile(new URL('../dist/js/vendor/supabase.js',import.meta.url),'utf8');
 const sdkContext=createContext({console:{...console,warn(){}},URL,Headers,Request,Response,AbortController,AbortSignal,DOMException,setTimeout,clearTimeout,setInterval,clearInterval,WebSocket:class{}});
 new Script(sdkSource).runInContext(sdkContext);const sdk=sdkContext.supabase;
 const transport=await import('../dist/js/auth-transport.js');
 let configuration;
 const captureContext=createContext({personalDataAllowed:()=>true,createSessionGuard:()=>()=>{},createAuthTransport:()=>()=>{},createAuthLock:options=>transport.createAuthLock({...options,locks:coordination==='web'?locks:null}),syncLessonNotificationAccount(){},window:{supabase:{...sdk,createClient:(_url,_key,options)=>{configuration=options;return{auth:{onAuthStateChange(){}}};}}}});
 new Script(executable).runInContext(captureContext).accountAuthClient();
 const values=new Map();const key=configuration.auth.storageKey;
 const user={id:'11111111-1111-4111-8111-111111111111',email_confirmed_at:'2026-10-02',user_metadata:{nickname:'Before'}};
 const initial={access_token:'access-before',refresh_token:'refresh-before',expires_at:Math.floor(Date.now()/1000)+3600,user,token_type:'bearer'};
 values.set(key,JSON.stringify(initial));
 const storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
 let serverUser=user;let releaseProfile,profileStarted;const profileReady=new Promise(r=>profileStarted=r);
 const request=async(url,options)=>{
  if(String(url).endsWith('/user')&&options.method==='PUT'){profileStarted();await new Promise(r=>releaseProfile=r);serverUser={...user,user_metadata:{nickname:'After'}};return Response.json(serverUser);}
  if(String(url).includes('/logout'))return new Response(null,{status:204});
  if(String(url).includes('/token?'))return Response.json({...initial,access_token:'access-after',refresh_token:'refresh-after',expires_in:3600,user:serverUser});
  throw Error('Unexpected offline fixture request '+url);
 };
 const clientOptions={...configuration,global:{fetch:request},auth:{...configuration.auth,storage,autoRefreshToken:false}};
 const auth=sdk.createClient('https://fixture.invalid','fixture-key',clientOptions).auth;
 const peer=sdk.createClient('https://fixture.invalid','fixture-key',clientOptions).auth;
 await Promise.all([auth.initialize(),peer.initialize()]);
 const profile=auth.updateUser({data:{nickname:'After'}});await profileReady;
 const renewal=peer.refreshSession();
 // Without serialized operations the rotation settles first and the pending
 // profile update subsequently writes its older copy of both tokens.
 await new Promise(r=>setTimeout(r,0));releaseProfile();
 assert.equal((await profile).error,null);assert.equal((await renewal).error,null);
 const saved=JSON.parse(values.get(key));
 console.log(JSON.stringify({case:'real-sdk-profile-renewal',coordination,nickname:saved.user.user_metadata.nickname,keptRotation:saved.refresh_token==='refresh-after'}));
 assert.equal(saved.refresh_token,'refresh-after','A pending profile update must never put an already-used refresh token back in storage');
 assert.equal(saved.access_token,'access-after');assert.equal(saved.user.user_metadata.nickname,'After');
 const pendingProfileReady=new Promise(r=>profileStarted=r);
 const pendingProfile=auth.updateUser({data:{nickname:'After'}});await pendingProfileReady;
 const logout=peer.signOut({scope:'local'});await new Promise(r=>setTimeout(r,0));releaseProfile();
 assert.equal((await pendingProfile).error,null);assert.equal((await logout).error,null);
 assert.equal(values.has(key),false,'Explicit sign-out must win over a pending profile response in every context');
 await auth.dispose();await peer.dispose();
}

// A busy/frozen tab causes a bounded retry, never a parallel operation or a
// credential deletion. The next attempt works after the held writer completes.
{
 const locks=fixtureLocks();let deadline,release,ran=0;
 const TimeoutError=class extends Error{};
 const lock=createAuthLock({locks,TimeoutError,setTimer:fn=>{deadline=fn;return 1;},clearTimer(){}});
 const held=lock('session-fixture',-1,()=>new Promise(r=>release=r));await new Promise(r=>setTimeout(r,0));
 await assert.rejects(lock('session-fixture',0,async()=>{ran++;}),TimeoutError);
 const waiting=lock('session-fixture',10000,async()=>{ran++;});const rejected=assert.rejects(waiting,TimeoutError);deadline();await rejected;
 assert.equal(ran,0);release();await held;
 assert.equal(await lock('session-fixture',10000,async()=>{ran++;return 'resumed';}),'resumed');assert.equal(ran,1);
 assert.ok(locks.calls.every(options=>!options.steal));
 console.log('PASS: cross-tab busy/timeout skips preserve the active writer; later retry resumes without stealing a lock.');
}
