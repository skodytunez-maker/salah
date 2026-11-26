import assert from 'node:assert/strict';
import{createTeamPreviewAccess,initTeamPreviewAccess,requestTeamPreviewActor,teamPreviewKnowledgeHint,teamPreviewVerified}from '../dist/js/team-preview-access.js';
import{checkAccountSession}from '../dist/js/owner-auth.js';
import{Window}from '../tests/staff/node_modules/happy-dom/lib/index.js';
import{showKnowledge}from '../dist/js/knowledge.js';
const uid='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
let clock=0,calls=0,session={access_token:'fixture-session-token-a',user:{id:uid,email_confirmed_at:'2026-11-13',is_anonymous:false,user_metadata:{owner:true,role:'admin'}}},value=null,changes=0;
const gate=createTeamPreviewAccess({checkSession:async()=>session?{state:'valid',session}:{state:'signed-out'},requestActor:async token=>{calls++;assert.equal(token,session.access_token);return value;},now:()=>clock});
gate.subscribe(()=>changes++);
assert.equal(await gate.verify(),false);assert.equal(gate.verified(),false,'User-editable metadata does not grant preview access');
for(const role of ['moderator','teacher','user']){value={id:uid,owner:false,role,mfaRequired:false};assert.equal(await gate.verify({force:true}),false);}
for(const invalid of [{id:other,owner:false,role:'admin',mfaRequired:false},{id:uid,owner:false,role:'admin',mfaRequired:true},{id:uid,owner:false,role:'admin'},{id:uid,owner:true,role:'admin',mfaRequired:false}]){value=invalid;assert.equal(await gate.verify({force:true}),false);}
value={id:uid,owner:false,role:'admin',mfaRequired:false,nickname:'Private',permissions:['all'],city:'Never stored'};
assert.equal(await gate.verify({force:true}),true);assert.deepEqual(gate.actor(),{id:uid,owner:false,role:'admin'});assert.equal(changes,1);
const before=calls;assert.equal(await gate.verify(),true);assert.equal(calls,before,'A fresh token-bound grant is reused');assert.equal(await gate.accessToken(),session.access_token);
clock+=61000;assert.equal(gate.verified(),false);assert.equal(gate.actor(),null);await gate.verify();assert.equal(gate.verified(),true);assert.equal(changes,2,'A restored grant publishes immediately');
value=null;assert.equal(await gate.verify({force:true}),false);assert.equal(gate.actor(),null);await assert.rejects(gate.accessToken(),/защищённый вход/);
session=null;const absent=calls;assert.equal(await gate.verify(),false);assert.equal(calls,absent,'Signed-out users cannot call the staff endpoint');
session={access_token:'fixture-session-token-b',user:{id:uid,email_confirmed_at:'2026-11-13'}};
let release,requests=0;
const pending=createTeamPreviewAccess({checkSession:async()=>({state:'valid',session}),requestActor:async()=>{requests++;return new Promise(resolve=>{release=resolve;});}});
const first=pending.verify(),second=pending.verify();await new Promise(resolve=>setImmediate(resolve));assert.equal(requests,1,'Concurrent entries share one pinned-token gate');release({id:uid,owner:false,role:'admin',mfaRequired:false});assert.deepEqual(await Promise.all([first,second]),[true,true]);
const stale=pending.verify({force:true});await new Promise(resolve=>setImmediate(resolve));pending.clear();release({id:uid,owner:false,role:'admin',mfaRequired:false});assert.equal(await stale,false);assert.equal(pending.actor(),null);
const failure=createTeamPreviewAccess({checkSession:async()=>({state:'valid',session}),requestActor:async()=>{throw Error('network');}});await assert.rejects(failure.verify(),/network/);assert.equal(failure.actor(),null);
let selectedToken='old-token',finishNew;
const renewed=createTeamPreviewAccess({checkSession:async()=>({state:'valid',session:{...session,access_token:selectedToken}}),requestActor:(token,{signal})=>new Promise((resolve,reject)=>{if(token==='new-token')finishNew=resolve;signal.addEventListener('abort',()=>reject(new DOMException('Cancelled','AbortError')),{once:true});})});
const outdated=renewed.verify();await new Promise(resolve=>setImmediate(resolve));selectedToken='new-token';const refreshed=renewed.verify();await new Promise(resolve=>setImmediate(resolve));finishNew({id:uid,owner:false,role:'admin',mfaRequired:false});assert.equal(await outdated,false);assert.equal(await refreshed,true);assert.equal(renewed.verified(),true,'Cancelling an old token cannot clear a newer valid grant');
const responseActor={id:uid,owner:false,role:'admin',mfaRequired:false};
assert.deepEqual(await requestTeamPreviewActor('fixture-session-token-c',{fetcher:async(url,options)=>{assert.ok(url.endsWith('/staff-cabinet'));assert.equal(options.method,'POST');assert.equal(options.headers.Authorization,'Bearer fixture-session-token-c');assert.deepEqual(JSON.parse(options.body),{action:'gate',args:{}});assert.equal(options.cache,'no-store');assert.equal(options.credentials,'omit');assert.equal(options.redirect,'error');return Response.json({data:responseActor});}}),responseActor);
assert.equal(await requestTeamPreviewActor('fixture-token',{fetcher:async()=>new Response('',{status:403})}),null);

let radioNow=0,radioAccount={state:'valid',session},radioReply=responseActor;
const radioGate=createTeamPreviewAccess({checkSession:async()=>radioAccount,requestActor:async()=>{if(radioReply instanceof Error)throw radioReply;return radioReply;},now:()=>radioNow});
assert.equal(radioGate.radioHint(),false);
assert.equal(await radioGate.verify(),true);
radioNow=45000;radioReply=Error('offline');
await assert.rejects(radioGate.verify({force:true}),/offline/);
assert.equal(radioGate.verified(),false);
assert.equal(radioGate.actor(),null);
assert.equal(radioGate.radioHint(),true,'Previously verified account keeps only the inactive Radio label during a brief failure');
await assert.rejects(radioGate.accessToken(),/offline/);
radioAccount={state:'unavailable'};assert.equal(await radioGate.verify({force:true}),false);assert.equal(radioGate.radioHint(),true);
radioNow=75000;assert.equal(radioGate.radioHint(),false);
radioAccount={state:'valid',session};radioReply=responseActor;assert.equal(await radioGate.verify({force:true}),true);assert.equal(radioGate.verified(),true);
radioReply=null;assert.equal(await radioGate.verify({force:true}),false);assert.equal(radioGate.radioHint(),false,'Explicit denial removes the Radio label immediately');
radioReply=responseActor;assert.equal(await radioGate.verify({force:true}),true);radioAccount={state:'signed-out'};assert.equal(await radioGate.verify({force:true}),false);assert.equal(radioGate.radioHint(),false);

const originalWindow=globalThis.window,originalFetch=globalThis.fetch;
const retryDocument=Object.assign(new EventTarget(),{hidden:false});
const retryWindow=Object.assign(new EventTarget(),{
 location:{hash:'#knowledge'},
 supabase:{createClient:()=>({auth:{
  getSession:async()=>({data:{session}}),
  getUser:async()=>authUnavailable?{error:Error('network')}:{data:{user:session.user}},
  onAuthStateChange(){}
 }})}
});
let authUnavailable=false,gateStatus=503,gateRequests=0,signedIn=true,stop;
const retryCallbacks=new Set();
const settle=()=>new Promise(resolve=>setImmediate(resolve));
const goto=hash=>{retryWindow.location.hash=hash;retryWindow.dispatchEvent(new Event('hashchange'));};
function begin(hash){
 stop?.();
 checkAccountSession.invalidate();
 retryWindow.location.hash=hash;
 gateRequests=0;
 stop=initTeamPreviewAccess({
  getAccount:()=>({signedIn,userId:signedIn?uid:null}),
  doc:retryDocument,win:retryWindow,interval:()=>1,cancel:()=>{},
  scheduleRetry:callback=>{retryCallbacks.add(callback);return callback;},
  cancelRetry:callback=>retryCallbacks.delete(callback)
 });
}
async function retry(){
 assert.equal(retryCallbacks.size,1);
 const [callback]=retryCallbacks;
 retryCallbacks.delete(callback);
 callback();
 await settle();
}
globalThis.window=retryWindow;
globalThis.fetch=async(url)=>{
 assert.ok(url.endsWith('/staff-cabinet'));
 gateRequests++;
 return gateStatus===200?Response.json({data:responseActor}):new Response('',{status:gateStatus});
};
try{
 begin('#home');
 await settle();
 assert.equal(gateRequests,1);
 goto('#knowledge');
 await settle();
 assert.equal(gateRequests,2);
 assert.equal(retryCallbacks.size,0,'The public Knowledge page does not schedule a new request');
 goto('#knowledge?view=alphabet');
 await settle();
 assert.equal(gateRequests,2);
 assert.equal(retryCallbacks.size,0);
 goto('#knowledge?view=muallim');
 await settle();
 assert.equal(teamPreviewVerified(),false,'A failed probe never grants preview access');
 gateStatus=200;
 await retry();
 assert.equal(gateRequests,3);
 assert.equal(teamPreviewVerified(),true,'The selected private screen can recover without leaving Knowledge');

 gateStatus=503;
 begin('#knowledge?preview=live-stream');
 await settle();
 await retry();
 assert.equal(gateRequests,2);
 assert.equal(retryCallbacks.size,0,'A persistent outage receives just one automatic retry');
 assert.equal(teamPreviewVerified(),false);

 gateStatus=403;
 begin('#knowledge?view=online-lessons');
 await settle();
 assert.equal(gateRequests,1);
 assert.equal(retryCallbacks.size,0,'Explicit denial does not trigger an automatic retry');
 assert.equal(teamPreviewVerified(),false);

 gateStatus=200;
 authUnavailable=true;
 begin('#knowledge?view=teacher-preview');
 await settle();
 assert.equal(gateRequests,0);
 authUnavailable=false;
 await retry();
 assert.equal(gateRequests,1);
 assert.equal(teamPreviewVerified(),true,'Temporary Auth failure can recover without relaxing the role gate');

 gateStatus=503;
 begin('#knowledge?view=muallim&bookPage=2');
 await settle();
 assert.equal(retryCallbacks.size,1);
 goto('#knowledge?view=alphabet');
 await settle();
 assert.equal(retryCallbacks.size,0,'Leaving the selected preview cancels its retry');
 assert.equal(gateRequests,1);

 begin('#knowledge?view=muallim');
 await settle();
 assert.equal(retryCallbacks.size,1);
 signedIn=false;
 retryWindow.dispatchEvent(new Event('salah:counter-status'));
 await settle();
 assert.equal(retryCallbacks.size,0,'Signing out cancels a scheduled retry');
 assert.equal(gateRequests,1);
 assert.equal(teamPreviewVerified(),false);
 signedIn=true;

 const dom=new Window({url:'https://example.invalid/salah/#knowledge'});
 const host=dom.document.body.appendChild(dom.document.createElement('main'));
 const options={learningUserId:uid,mountCabinetLink:()=>{}};
 const loadKnowledge=hash=>showKnowledge(host,{...options,hash});
 gateStatus=200;
 begin('#knowledge');
 await settle();
 loadKnowledge('#knowledge');
 const lessons=host.querySelector('[data-upcoming="online-lessons"]');
 assert.equal(lessons.tagName,'A');
 gateStatus=503;
 retryWindow.dispatchEvent(new Event('online'));
 await settle();
 assert.equal(teamPreviewVerified(),false,'Temporary unavailability never leaves a current grant');
 assert.equal(teamPreviewKnowledgeHint(uid),true);
 assert.equal(teamPreviewKnowledgeHint(other),false,'Navigation hint binds to the last verified account');
 loadKnowledge('#knowledge');
 assert.equal(host.querySelector('[data-upcoming="online-lessons"]'),lessons,'A temporary failure keeps the same card without flickering to Soon');
 goto('#knowledge?view=online-lessons');
 await settle();
 loadKnowledge('#knowledge?view=online-lessons');
 const accessStatus=host.querySelector('[data-knowledge-access-preview="online-lessons"]');
 assert.ok(accessStatus?.querySelector('[role="status"]'));
 assert.equal(host.querySelector('iframe,.native-course'),null,'The visible link cannot mount protected content without access');
 gateStatus=200;
 await accessStatus.querySelector('button').onclick();
 assert.equal(teamPreviewVerified(),true,'Manual retry uses the current verified account');
 gateStatus=403;
 retryWindow.dispatchEvent(new Event('online'));
 await settle();
 loadKnowledge('#knowledge');
 assert.equal(teamPreviewKnowledgeHint(uid),false,'Explicit denial removes the navigation hint');
 assert.equal(host.querySelector('[data-upcoming="online-lessons"] button').disabled,true);
 await dom.happyDOM.close();
}finally{
 stop?.();
 checkAccountSession.invalidate();
 globalThis.window=originalWindow;
 globalThis.fetch=originalFetch;
}
console.log('PASS: team preview role/MFA, token/TTL binding, explicit denial, single private-route retry on temporary failure, stable private-card navigation on temporary failures, cancellation on navigation/sign-out and fail-closed access.');
