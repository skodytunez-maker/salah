import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../supabase/functions/owner-access/index.ts',import.meta.url),'utf8');
const {createOwnerHandler:createRawOwnerHandler}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const createOwnerHandler=args=>createRawOwnerHandler({isSessionActive:async()=>true,...args});
let authCalls=0,statsCalls=0;
const user={id:'dc1eb1cc-6f8f-472f-a937-735fbfbba4b7',email_confirmed_at:'2026-10-02',is_anonymous:false,factors:[{status:'verified',factor_type:'totp'}]};
const claims={sub:user.id,iss:'https://kbltwszfvphgbxdbczsb.supabase.co/auth/v1',aal:'aal2',session_id:'11111111-1111-4111-8111-111111111111'};
const getClaims=async()=>({data:{claims}});
const handler=createOwnerHandler({getClaims,getUser:async token=>{authCalls++;return token==='valid-owner-token'?{data:{user}}:token==='other-user-token'?{data:{user:{...user,id:'someone-else',user_metadata:{owner:true}}}}:{error:new Error('invalid')};},statsToken:'server-only-test-token',fetcher:async(url,options)=>{statsCalls++;assert.equal(url.origin,'https://salah-saadi.goatcounter.com');assert.equal(url.pathname,'/api/v0/stats/total');assert.equal(options.headers.Authorization,'Bearer server-only-test-token');return Response.json({total:12,stats:[{day:'2026-10-02',daily:12}],token:'never expose'});}});
const request=(token,query='',extra={})=>new Request('https://project.supabase.co/functions/v1/owner-access'+query,{headers:{...(token?{Authorization:'Bearer '+token}:{}),...extra}});
assert.equal((await handler(request(null))).status,401);
assert.equal((await handler(request('forged-owner-token'))).status,401);
assert.equal((await handler(request('other-user-token','?mode=stats'))).status,403);
assert.equal(statsCalls,0);
assert.equal((await handler(request('valid-owner-token','',{Origin:'https://evil.example'}))).status,403);
const gate=await handler(request('valid-owner-token','',{Origin:'https://skodytunez-maker.github.io'}));
assert.equal(gate.status,200);assert.equal(gate.headers.get('Cache-Control'),'no-store, private');assert.equal(gate.headers.get('Access-Control-Allow-Origin'),'https://skodytunez-maker.github.io');assert.deepEqual(await gate.json(),{owner:true,statisticsConnected:true});
assert.equal((await handler(request('valid-owner-token','?mode=stats&url=https://evil.example'))).status,400);
assert.equal((await handler(request('valid-owner-token','?mode=stats&days=365'))).status,400);
assert.equal((await handler(new Request('https://project.supabase.co/',{method:'POST'}))).status,405);
const stats=await handler(request('valid-owner-token','?mode=stats&days=7'));
assert.equal(stats.status,200);const result=await stats.json();assert.equal(result.total,12);assert.deepEqual(result.stats,[{day:'2026-10-02',visitors:12}]);assert.ok(!JSON.stringify(result).includes('token'));assert.equal(statsCalls,1);
const unconfirmed=createOwnerHandler({getUser:async()=>({data:{user:{...user,email_confirmed_at:null}}})});
assert.equal((await unconfirmed(request('valid-owner-token'))).status,403);
const unavailable=createOwnerHandler({getUser:async()=>{throw Error('private provider error')}});
assert.equal((await unavailable(request('valid-owner-token'))).status,503);
const noStats=createOwnerHandler({getUser:async()=>({data:{user}})});
assert.equal((await noStats(request('valid-owner-token','?mode=stats'))).status,503);
assert.equal(authCalls,6); // Each eligible request was verified with Auth.
console.log('PASS: no session, forged token, other user and unconfirmed owner denied; verified owner allowed; fixed read-only statistics; private responses never cached.');

const firstFactor=createOwnerHandler({getUser:async()=>({data:{user}}),getClaims:async()=>({data:{claims:{...claims,aal:'aal1'}}}),statsToken:'never-forward',fetcher:async()=>{throw Error('MFA was bypassed');}});
assert.deepEqual(await (await firstFactor(request('valid-owner-token'))).json(),{owner:false,mfaRequired:true});
assert.equal((await firstFactor(request('valid-owner-token','?mode=stats'))).status,403);
const forgedClaims=createOwnerHandler({getUser:async()=>({data:{user}}),getClaims:async()=>({error:new Error('bad signature')})});
assert.equal((await forgedClaims(request('valid-owner-token'))).status,401);
const wrongIssuer=createOwnerHandler({getUser:async()=>({data:{user}}),getClaims:async()=>({data:{claims:{...claims,iss:'https://another-project.supabase.co/auth/v1'}}})});
assert.equal((await wrongIssuer(request('valid-owner-token'))).status,401);
const removedFactor=createOwnerHandler({getUser:async()=>({data:{user:{...user,factors:[]}}}),getClaims});
assert.deepEqual(await (await removedFactor(request('valid-owner-token'))).json(),{owner:false,mfaRequired:true});
console.log('PASS: owner password alone cannot read statistics; signed AAL2 and active TOTP required; bad signature, wrong issuer, removed factor denied.');

let usersCalls=0;
const usersOwner=createOwnerHandler({getUser:async()=>({data:{user}}),getClaims,readUsers:async page=>{usersCalls++;assert.equal(page,1);return{total:1,users:[{email:'never-return@example.test',nickname:'<test>',joinedAt:'2026-10-02T01:00:00Z',lastSignInAt:'2026-10-02T01:05:00Z',privateSecret:'never-return'}]};}});
const listed=await usersOwner(request('valid-owner-token','?mode=users&page=1'));assert.equal(listed.status,200);const list=await listed.json();assert.equal(list.users[0].nickname,'<test>');assert.ok(!JSON.stringify(list).includes('never-return'));assert.equal(usersCalls,1);
assert.equal((await usersOwner(request('valid-owner-token','?mode=users&page=0'))).status,400);
assert.equal((await usersOwner(request('valid-owner-token','?mode=users&days=7'))).status,400);
const usersFirstFactor=createOwnerHandler({getUser:async()=>({data:{user}}),getClaims:async()=>({data:{claims:{...claims,aal:'aal1'}}}),readUsers:async()=>{throw Error('private user list leaked');}});
assert.equal((await usersFirstFactor(request('valid-owner-token','?mode=users'))).status,403);
const usersOther=createOwnerHandler({getUser:async()=>({data:{user:{...user,id:'11111111-1111-4111-8111-111111111111',user_metadata:{owner:true}}}}),getClaims,readUsers:async()=>{throw Error('private user list leaked');}});
assert.equal((await usersOther(request('valid-owner-token','?mode=users'))).status,403);
console.log('PASS: only MFA owner sees paginated nicknames and sign-in dates; emails/metadata/secrets excluded; password alone and forged role cannot read users.');

for(const mode of ['gate','stats','users']){let leaked=false;const revokedHandler=createOwnerHandler({getUser:async()=>({data:{user}}),getClaims,isSessionActive:async(uid,sid)=>{assert.equal(uid,user.id);assert.equal(sid,claims.session_id);return false;},statsToken:'never-return',fetcher:async()=>{leaked=true;return Response.json({});},readUsers:async()=>{leaked=true;return{};}});assert.equal((await revokedHandler(request('valid-owner-token','?mode='+mode))).status,401);assert.equal(leaked,false);}
const missingSessionId=createOwnerHandler({getUser:async()=>({data:{user}}),getClaims:async()=>({data:{claims:{...claims,session_id:undefined}}})});assert.equal((await missingSessionId(request('valid-owner-token'))).status,401);
const sessionDbUnavailable=createOwnerHandler({getUser:async()=>({data:{user}}),getClaims,isSessionActive:async()=>{throw Error('Private database error');}});assert.equal((await sessionDbUnavailable(request('valid-owner-token'))).status,503);
console.log('PASS: revoked or missing signed session denied before owner data; unavailable session check fails closed.');

const presenceOwner=createOwnerHandler({getUser:async()=>({data:{user}}),getClaims,now:()=>Date.parse('2026-10-02T12:00:00Z'),readUsers:async()=>({total:3,online:1,users:[{nickname:'Online',online:true,lastSeenAt:'2026-10-02T11:59:50Z'},{nickname:'Stale',online:true,lastSeenAt:'2026-10-02T11:58:00Z'},{nickname:'Offline',online:false,lastSeenAt:'2026-10-02T11:59:50Z'}]})});const onlineResult=await(await presenceOwner(request('valid-owner-token','?mode=users'))).json();assert.equal(onlineResult.online,1);assert.deepEqual(onlineResult.users.map(u=>u.online),[true,false,false]);console.log('PASS: online presence is bounded by server freshness, private data fields excluded.');

const profileId='11111111-1111-4111-8111-111111111111';let profileCalls=0;const profileHandler=createOwnerHandler({getUser:async()=>({data:{user}}),getClaims,readProfiles:async ids=>{profileCalls++;assert.deepEqual(ids,[profileId]);return[{id:profileId,nickname:'  Мадина  ',email:'private@example.test',token:'secret'},{id:user.id,nickname:'Unrequested'}]}});
const profileResponse=await profileHandler(request('valid-owner-token','?mode=profiles&ids='+profileId));assert.equal(profileResponse.status,200);assert.deepEqual(await profileResponse.json(),{profiles:[{id:profileId,nickname:'Мадина'}]});assert.equal(profileCalls,1);
for(const query of ['?mode=profiles','?mode=profiles&ids=bad','?mode=profiles&ids='+profileId+','+profileId,'?mode=users&ids='+profileId,'?mode=profiles&ids='+profileId+'&page=1'])assert.equal((await profileHandler(request('valid-owner-token',query))).status,400);
assert.equal((await firstFactor(request('valid-owner-token','?mode=profiles&ids='+profileId))).status,403);assert.equal((await handler(request('other-user-token','?mode=profiles&ids='+profileId))).status,403);assert.equal((await handler(request(null,'?mode=profiles&ids='+profileId))).status,401);assert.equal(profileCalls,1);
console.log('PASS: only verified MFA owner can read bounded nicknames of selected accounts; other metadata and unrequested identities never returned.');

const notificationOwner=createOwnerHandler({getUser:async()=>({data:{user}}),getClaims,readUsers:async()=>({total:2,users:[{nickname:'Enabled',notificationCheckedAt:'2026-10-04T01:00:00Z',notificationEnabled:true,notificationBackground:true,notificationGranted:true,notificationDenied:false,push_token:'private',endpoint:'private',prayer_history:'private'},{nickname:'Unknown',notificationEnabled:true,notificationCheckedAt:null}]})});
const notificationResponse=await notificationOwner(request('valid-owner-token','?mode=users'));const notifications=await notificationResponse.json();assert.deepEqual(notifications.users[0].notifications,{enabled:true,background:true,permissionGranted:true,permissionDenied:false,checkedAt:'2026-10-04T01:00:00.000Z'});assert.equal(notifications.users[1].notifications,null);assert.ok(!JSON.stringify(notifications).includes('private'));
assert.match(source,/join auth.sessions a on a.id=s.session_id and a.user_id=s.user_id/,'Revoked device sessions must be excluded');assert.match(source,/d.subscription is not null/);assert.match(source,/d.updated_at>now\(\)-interval '90 days'/);assert.match(source,/jsonb_each/,'A saved subscription for adhkar alone is not a prayer subscription');
console.log('PASS: only MFA owner receives minimal notification states; absent reports stay unknown; revoked sessions, expired subscriptions and non-prayer reminders excluded.');

const releases=await handler(request('valid-owner-token','?mode=releases'));assert.equal(releases.status,200);assert.equal(releases.headers.get('Cache-Control'),'no-store, private');const privateChanges=await releases.json();assert.ok(privateChanges.releases[0].changes[0].includes('кабинета'));
const sahabaChanges=await(await handler(request('valid-owner-token','?mode=releases&app=sahaba'))).json();assert.ok(sahabaChanges.releases[0].changes.some(x=>x.includes('SAHABA')));
for(const token of [null,'forged-owner-token','other-user-token'])assert.ok([401,403].includes((await handler(request(token,'?mode=releases'))).status));
assert.equal((await firstFactor(request('valid-owner-token','?mode=releases'))).status,403);
for(const query of ['?mode=releases&app=unknown','?mode=releases&page=1','?mode=releases&days=7','?mode=stats&app=salah'])assert.equal((await handler(request('valid-owner-token',query))).status,400);
const revokedReleases=createOwnerHandler({getUser:async()=>({data:{user}}),getClaims,isSessionActive:async()=>false});assert.equal((await revokedReleases(request('valid-owner-token','?mode=releases'))).status,401);
console.log('PASS: private release history is available only to the active MFA owner, separately for each app.');
