import assert from 'node:assert/strict';
import{createTeamPreviewAccess,requestTeamPreviewActor}from '../dist/js/team-preview-access.js';
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
const responseActor={id:uid,owner:false,role:'admin',mfaRequired:false};
assert.deepEqual(await requestTeamPreviewActor('fixture-session-token-c',{fetcher:async(url,options)=>{assert.ok(url.endsWith('/staff-cabinet'));assert.equal(options.method,'POST');assert.equal(options.headers.Authorization,'Bearer fixture-session-token-c');assert.deepEqual(JSON.parse(options.body),{action:'gate',args:{}});assert.equal(options.cache,'no-store');assert.equal(options.credentials,'omit');assert.equal(options.redirect,'error');return Response.json({data:responseActor});}}),responseActor);
assert.equal(await requestTeamPreviewActor('fixture-token',{fetcher:async()=>new Response('',{status:403})}),null);
console.log('PASS: owner/admin-only preview role, MFA, metadata ignored, minimal actor, token/TTL binding, fresh-grant events, no signed-out requests, deduplication, stale cancellation and no owner-data request.');
