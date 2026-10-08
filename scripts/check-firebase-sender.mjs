import assert from 'node:assert/strict';
import{firebaseSupportPayload,createFirebaseSupportSender}from '../supabase/functions/background-reminders/firebase-support-sender.mjs';
const now=Date.now(),device={user_id:'11111111-1111-4111-8111-111111111111',token:'a'.repeat(160)},event={messageId:'22222222-2222-4222-8222-222222222222',thread:'33333333-3333-4333-8333-333333333333',at:now-1000,body:'must never leave the server'};
const payload=firebaseSupportPayload(device,event,now);assert.ok(!JSON.stringify(payload).includes(event.body));assert.equal(payload.message.data.user,device.user_id);assert.equal(payload.message.android.priority,'high');
assert.throws(()=>firebaseSupportPayload(device,{...event,at:now+1},now));assert.throws(()=>firebaseSupportPayload(device,{...event,at:now-86400000},now));
assert.throws(()=>createFirebaseSupportSender({credential:{project_id:'foreign'}}));
const keys=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const privateBytes=await crypto.subtle.exportKey('pkcs8',keys.privateKey),pem='-----BEGIN PRIVATE KEY-----\n'+Buffer.from(privateBytes).toString('base64')+'\n-----END PRIVATE KEY-----';
const credential={type:'service_account',project_id:'salah-8b73f',client_email:'test-sender@salah-8b73f.iam.gserviceaccount.com',token_uri:'https://oauth2.googleapis.com/token',private_key:pem};
let authCalls=0,pushCalls=0,expired=false;
const sender=createFirebaseSupportSender({credential,clock:()=>now,fetcher:async(url,options)=>{
 if(url==='https://oauth2.googleapis.com/token'){authCalls++;const assertion=options.body.get('assertion'),parts=assertion.split('.');assert.equal(JSON.parse(Buffer.from(parts[1],'base64url')).scope,'https://www.googleapis.com/auth/firebase.messaging');assert.ok(await crypto.subtle.verify('RSASSA-PKCS1-v1_5',keys.publicKey,Buffer.from(parts[2],'base64url'),new TextEncoder().encode(parts[0]+'.'+parts[1])));return new Response(JSON.stringify({access_token:'test-only-token',expires_in:3600}));}
 assert.equal(url,'https://fcm.googleapis.com/v1/projects/salah-8b73f/messages:send');pushCalls++;assert.ok(!options.body.includes(pem));return expired?new Response(JSON.stringify({error:{details:[{errorCode:'UNREGISTERED'}]}}),{status:404}):new Response('{}');
}});
assert.equal(await sender(device,event),'sent');assert.equal(await sender(device,event),'sent');assert.equal(authCalls,1);assert.equal(pushCalls,2);
expired=true;assert.equal(await sender(device,event),'expired');
console.log('PASS sender project binding, signed OAuth scope, token cache, private content exclusion and expired device handling; no live delivery');
