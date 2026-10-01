import assert from 'node:assert/strict';
let session=null,authCallback,allowed=false,requests=0,changed=0;
globalThis.window={supabase:{createClient:(_url,key,options)=>{
 assert.ok(key.startsWith('sb_publishable_'));
 assert.equal(options.auth.detectSessionInUrl,false);
 assert.equal(options.auth.storageKey,'salah-owner-session-v1');
 return {auth:{
  onAuthStateChange:fn=>{authCallback=fn;},
  getSession:async()=>({data:{session}}),
  signInWithPassword:async()=>({error:null}),
  signOut:async()=>{session=null;authCallback('SIGNED_OUT',null);return{error:null};}
 }};
}}};
globalThis.fetch=async(url,options)=>{requests++;assert.equal(options.cache,'no-store');assert.equal(options.credentials,'omit');assert.ok(url.startsWith('https://kbltwszfvphgbxdbczsb.supabase.co/functions/v1/owner-access'));return allowed?Response.json({owner:true}):Response.json({error:'owner_only'},{status:403});};
const {verifyOwner,ownerVerified,onOwnerChange,signOutOwner}=await import('../dist/js/owner-auth.js');
onOwnerChange(()=>changed++);
assert.equal(await verifyOwner(),false);assert.equal(requests,0);assert.equal(ownerVerified(),false);
session={access_token:'forged-token'};
await assert.rejects(verifyOwner(),/не имеет доступа/);assert.equal(ownerVerified(),false);assert.equal(changed,0);
// Only the successful server response authorizes menu visibility.
session={access_token:'verified-user-session'};allowed=true;
assert.equal(await verifyOwner(),true);assert.equal(ownerVerified(),true);assert.equal(changed,1);
// A later server denial removes access immediately, even with a saved session.
allowed=false;await assert.rejects(verifyOwner());assert.equal(ownerVerified(),false);assert.equal(changed,2);
allowed=true;await verifyOwner();await signOutOwner();assert.equal(ownerVerified(),false);
console.log('PASS: saved session alone does not authorize; server deny removes owner access; sign-out revokes the menu.');
