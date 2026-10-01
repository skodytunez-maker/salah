import assert from 'node:assert/strict';
let session=null,authCallback,allowed=false,requests=0,changed=0,needsMfa=false;
globalThis.window={supabase:{createClient:(_url,key,options)=>{
 assert.ok(key.startsWith('sb_publishable_'));
 assert.equal(options.auth.detectSessionInUrl,false);
 assert.equal(options.auth.storageKey,'salah-owner-session-v1');
 return {auth:{
  onAuthStateChange:fn=>{authCallback=fn;},
  getSession:async()=>({data:{session}}),
  mfa:{listFactors:async()=>({data:{totp:[{id:'fixture-factor',status:'verified'}]}}),enroll:async()=>({data:{id:'fixture-factor',totp:{qr_code:'<svg/>',secret:'TEST-ONLY'}}}),challengeAndVerify:async({factorId,code})=>{assert.equal(factorId,'fixture-factor');if(code!=='123456')return {error:Error('invalid code')};needsMfa=false;return{error:null};}},
  signInWithPassword:async()=>({error:null}),
  signOut:async()=>{session=null;authCallback('SIGNED_OUT',null);return{error:null};}
 }};
}}};
globalThis.fetch=async(url,options)=>{requests++;assert.equal(options.cache,'no-store');assert.equal(options.credentials,'omit');assert.ok(url.startsWith('https://kbltwszfvphgbxdbczsb.supabase.co/functions/v1/owner-access'));if(needsMfa)return Response.json({owner:false,mfaRequired:true});if(allowed&&url.includes('mode=stats'))return Response.json({error:'statistics_not_connected'},{status:503});return allowed?Response.json({owner:true}):Response.json({error:'owner_only'},{status:403});};
const {verifyOwner,ownerVerified,onOwnerChange,signOutOwner,ownerStatistics,ownerNeedsMfa,ownerMfaFactors,verifyOwnerMfa}=await import('../dist/js/owner-auth.js');
onOwnerChange(()=>changed++);
assert.equal(await verifyOwner(),false);assert.equal(requests,0);assert.equal(ownerVerified(),false);
session={access_token:'forged-token'};
await assert.rejects(verifyOwner(),/не имеет доступа/);assert.equal(ownerVerified(),false);assert.equal(changed,0);
// Only the successful server response authorizes menu visibility.
session={access_token:'verified-user-session'};allowed=true;
assert.equal(await verifyOwner(),true);assert.equal(ownerVerified(),true);assert.equal(changed,1);
await assert.rejects(ownerStatistics(7),/ещё не подключена/);assert.equal(ownerVerified(),true);
// A later server denial removes access immediately, even with a saved session.
allowed=false;await assert.rejects(verifyOwner());assert.equal(ownerVerified(),false);assert.equal(changed,2);
allowed=true;await verifyOwner();await signOutOwner();assert.equal(ownerVerified(),false);
// Refresh arriving while the gate request is running must recheck the new
// session; it cannot authorize the stale response or strand a valid owner.
const originalFetch=globalThis.fetch;let refreshDuringGate=true;
await verifyOwner(); // Finish the sign-out callback's empty-session check.
session={access_token:'verified-user-session'};allowed=true;
globalThis.fetch=async(...args)=>{const response=await originalFetch(...args);if(refreshDuringGate){refreshDuringGate=false;authCallback('TOKEN_REFRESHED',session);}return response;};
const beforeRefresh=requests;assert.equal(await verifyOwner(),true);assert.equal(ownerVerified(),true);assert.equal(requests,beforeRefresh+2);
await signOutOwner();assert.equal(ownerVerified(),false);
console.log('PASS: saved session alone does not authorize; server deny removes owner access; sign-out revokes the menu.');

await verifyOwner();
session={access_token:'verified-user-session'};allowed=true;needsMfa=true;
assert.equal(await verifyOwner(),false);assert.equal(ownerVerified(),false);assert.equal(ownerNeedsMfa(),true);
assert.equal((await ownerMfaFactors())[0].id,'fixture-factor');
await assert.rejects(verifyOwnerMfa('fixture-factor','123'),/шесть цифр/);
await assert.rejects(verifyOwnerMfa('fixture-factor','000000'),/не подошёл/);assert.equal(ownerVerified(),false);
await verifyOwnerMfa('fixture-factor','123456');assert.equal(ownerVerified(),true);
await signOutOwner();assert.equal(ownerNeedsMfa(),false);
console.log('PASS: MFA setup/challenge keeps cabinet hidden until a valid second factor and server confirmation.');
