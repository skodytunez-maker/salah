import assert from 'node:assert/strict';
import {randomUUID,webcrypto}from 'node:crypto';
import {createEngine,nextMonth,TERMS_VERSION}from '../supabase/functions/support-billing-test/engine.mjs';
import {createTestProvider,testConfiguration}from '../supabase/functions/support-billing-test/provider.mjs';
import {createTestHandler}from '../supabase/functions/support-billing-test/http.mjs';
import {createRequire}from 'node:module';
import fs from 'node:fs/promises';
globalThis.crypto??=webcrypto;
const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222',shop='999999';
const body={amount:300,consent:true,termsVersion:TERMS_VERSION};
function fixture(){
 const rows=new Map(),queues=new Map(),payments=new Map(),byKey=new Map();let now=Date.parse('2026-01-31T12:00:00Z'),posts=0,loseResponse=false;
 const store={async lock(user,fn){
  const previous=queues.get(user)||Promise.resolve();let release;const gate=new Promise(r=>release=r);queues.set(user,previous.then(()=>gate));await previous;
  try{const result=await fn(structuredClone(rows.get(user)??null));rows.set(user,structuredClone(result.state));return result.value;}finally{release();}
 }};
 const provider={async create(payload,key){
  posts++;if(byKey.has(key))return structuredClone(payments.get(byKey.get(key)));
  const id=randomUUID(),p={id,test:true,recipient:{account_id:shop},metadata:payload.metadata,amount:payload.amount,status:'pending',paid:false,
   payment_method:{id:payload.payment_method_id||randomUUID(),type:'bank_card',saved:true,card:{last4:'1234',first6:'555555',expiry_year:'2030'}},
   confirmation:{confirmation_url:'https://yoomoney.ru/checkout/payments/v2/contract?orderId='+id}};
  payments.set(id,p);byKey.set(key,id);if(loseResponse){loseResponse=false;throw Error('timeout after accepted');}return structuredClone(p);
 },async get(id){if(!payments.has(id))throw Error('missing');return structuredClone(payments.get(id));}};
 const engine=createEngine({store,provider,shop,now:()=>now,randomUUID});
 const paid=id=>Object.assign(payments.get(id),{status:'succeeded',paid:true,captured_at:new Date(now).toISOString()});
 return {rows,payments,engine,paid,get posts(){return posts;},advance:t=>now=Date.parse(t),lose:()=>loseResponse=true};
}
assert.equal(nextMonth('2026-01-31T12:00:00Z',31),'2026-02-28T12:00:00.000Z');
assert.equal(nextMonth('2026-02-28T12:00:00Z',31),'2026-03-31T12:00:00.000Z');
let f=fixture();
await assert.rejects(()=>f.engine.checkout(a,{...body,consent:false}),/consent_required/);
await assert.rejects(()=>f.engine.checkout(a,{...body,termsVersion:'old'}),/consent_required/);
for(const amount of [0,149,300.5,15001,'300',NaN])await assert.rejects(()=>f.engine.checkout(a,{...body,amount}),/invalid_amount/);
assert.equal(f.posts,0);
const [one,two]=await Promise.all([f.engine.checkout(a,body),f.engine.checkout(a,body)]);
assert.equal(f.payments.size,1,'Double click creates one provider payment');assert.equal(one.confirmationUrl,two.confirmationUrl);
assert.equal((await f.engine.read(b)).status,'none','Account isolation');
let s=f.rows.get(a),op=s.operations[0],id=op.paymentId;f.paid(id);
await f.engine.webhook(a,op.id,id);
const first=await f.engine.read(a);assert.equal(first.status,'active');assert.equal(first.nextChargeAt,'2026-02-28T12:00:00.000Z');
await f.engine.webhook(a,op.id,id);assert.deepEqual(await f.engine.read(a),first,'Duplicate success cannot extend subscription');
assert.doesNotMatch(JSON.stringify(first),new RegExp(f.payments.get(id).payment_method.id));
assert.doesNotMatch(JSON.stringify(f.rows.get(a)),/555555|expiry_year/,'No full card data is persisted');
await f.engine.renew(a);assert.equal(f.payments.size,1,'Not due yet');
f.advance('2026-02-28T12:00:00Z');
await Promise.all([f.engine.renew(a),f.engine.renew(a)]);assert.equal(f.payments.size,2,'Two workers use one operation');
op=f.rows.get(a).operations.at(-1);f.paid(op.paymentId);await f.engine.webhook(a,op.id,op.paymentId);
assert.equal((await f.engine.read(a)).nextChargeAt,'2026-03-31T12:00:00.000Z');
await f.engine.unlink(a);const cancelled=await f.engine.read(a);assert.equal(cancelled.method,null);assert.equal(cancelled.nextChargeAt,null);
await f.engine.webhook(a,op.id,op.paymentId);assert.equal((await f.engine.read(a)).status,'cancelled','Late callback cannot re-enable');
await f.engine.unlink(a);assert.equal(f.rows.get(a).revision,2,'Unlink idempotent');
f.advance('2027-01-01T00:00:00Z');await f.engine.renew(a);assert.equal(f.payments.size,2,'No charges after unlink');
// Initial success after cancellation also cannot attach a method.
f=fixture();await f.engine.checkout(a,body);op=f.rows.get(a).operations[0];await f.engine.unlink(a);f.paid(op.paymentId);
await f.engine.webhook(a,op.id,op.paymentId);assert.equal((await f.engine.read(a)).status,'cancelled');assert.equal(f.rows.get(a).method,null);
// Accepted request, lost response/transaction: same persisted idempotence key on retry.
f=fixture();f.lose();await assert.rejects(()=>f.engine.checkout(a,body),/timeout/);assert.equal(f.payments.size,1);assert.equal(f.rows.get(a).operations[0].paymentId,null);
await f.engine.checkout(a,body);assert.equal(f.payments.size,1);
// Never retry an unknown POST past YooKassa's 24h idempotence window.
f=fixture();f.lose();await assert.rejects(()=>f.engine.checkout(a,body));f.advance('2026-02-01T12:00:00Z');
assert.equal((await f.engine.reconcile(a)).needsReview,true);assert.equal(f.posts,1);await assert.rejects(()=>f.engine.checkout(a,body),/payment_in_progress/);
// Forged notification content cannot bypass provider verification.
f=fixture();await f.engine.checkout(a,body);op=f.rows.get(a).operations[0];const original=structuredClone(f.payments.get(op.paymentId));
for(const change of [{test:false},{recipient:{account_id:'1489995'}},{amount:{value:'500.00',currency:'RUB'}},{metadata:{salah_test_operation:randomUUID()}}]){
 Object.assign(f.payments.get(op.paymentId),change);await assert.rejects(()=>f.engine.webhook(a,op.id,op.paymentId),/payment_mismatch/);f.payments.set(op.paymentId,structuredClone(original));
}
assert.equal((await f.engine.read(a)).status,'pending');
// A paid card that was not saved must never become an automatic subscription.
let declined=fixture();await declined.engine.checkout(a,body);let declinedOp=declined.rows.get(a).operations[0];declined.paid(declinedOp.paymentId);declined.payments.get(declinedOp.paymentId).payment_method.saved=false;
await declined.engine.webhook(a,declinedOp.id,declinedOp.paymentId);assert.equal((await declined.engine.read(a)).status,'cancelled');assert.equal(declined.rows.get(a).method,null);
declined=fixture();await declined.engine.checkout(a,body);declinedOp=declined.rows.get(a).operations[0];declined.payments.get(declinedOp.paymentId).status='canceled';await declined.engine.webhook(a,declinedOp.id,declinedOp.paymentId);
assert.equal((await declined.engine.read(a)).status,'cancelled');declined.advance('2027-01-01T00:00:00Z');await declined.engine.renew(a);assert.equal(declined.payments.size,1);
// Unknown initial payment + cancellation + late success: never reattach the card.
declined=fixture();declined.lose();await assert.rejects(()=>declined.engine.checkout(a,body));declinedOp=declined.rows.get(a).operations[0];await declined.engine.unlink(a);const lateId=[...declined.payments.keys()][0];declined.paid(lateId);await declined.engine.webhook(a,declinedOp.id,lateId);
assert.equal((await declined.engine.read(a)).status,'cancelled');assert.equal(declined.rows.get(a).method,null);
// Config/API adapter prohibit live credentials and live response bodies.
assert.equal(testConfiguration(()=>''),null);
assert.throws(()=>createTestProvider({shop:'1489995',key:'test_abcdefghijk'}));
assert.throws(()=>createTestProvider({shop,key:'live_abcdefghijk'}));
let request;
const adapter=createTestProvider({shop,key:'test_abcdefghijk',fetcher:async(url,options)=>{request={url,...options};return Response.json({test:true});}});
await adapter.create({amount:{value:'300.00',currency:'RUB'}},a);assert.equal(request.headers['Idempotence-Key'],a);assert.equal(request.redirect,'error');
const live=createTestProvider({shop,key:'test_abcdefghijk',fetcher:async()=>Response.json({test:false})});await assert.rejects(()=>live.get(a),/live_payment_forbidden/);
// HTTP ownership, input size, allowlist and runner protection.
let verified=0;
const headers={Authorization:'Bearer '+'x'.repeat(30),'Content-Type':'application/json',Origin:'https://skodytunez-maker.github.io'};
const handler=createTestHandler({engine:f.engine,verify:async()=>{verified++;return {id:a};},allowUsers:[a],runnerSecret:'s'.repeat(64),findOperation:async()=>a});
const call=(method='GET',payload,path='',extra={})=>handler(new Request('https://fixture.invalid/support-billing-test'+path,{method,headers:{...headers,...extra},...(payload?{body:JSON.stringify(payload)}:{})}));
assert.equal((await call('GET',null,'',{Origin:'https://evil.invalid'})).status,403);assert.equal(verified,0);
assert.equal((await call('GET',null,'',{Authorization:''})).status,401);
assert.equal((await call('POST',{action:'unlink',user_id:b})).status,400);
assert.equal((await call('POST',{action:'checkout',...body,extra:'x'.repeat(9000)})).status,400);
assert.equal((await call('POST',null,'/renew')).status,401);
const denied=createTestHandler({engine:f.engine,verify:async()=>({id:b}),allowUsers:[a]});assert.equal((await denied(new Request('https://fixture.invalid',{headers}))).status,403);
const disabled=createTestHandler({engine:null});assert.equal((await disabled(new Request('https://fixture.invalid'))).status,503);
const fakeNotification={type:'notification',event:'payment.succeeded',object:{id:op.paymentId,status:'succeeded',paid:true,metadata:{salah_test_operation:op.id}}};
assert.equal((await call('POST',fakeNotification,'/webhook')).status,200);assert.equal((await f.engine.read(a)).status,'pending','Payload success is not trusted');
// Execute the actual migration with Postgres semantics; clients cannot read tokens.
const require=createRequire(new URL('../tests/staff/package.json',import.meta.url));const{PGlite}=require('@electric-sql/pglite');const db=await PGlite.create();
await db.exec('create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key);');
await db.exec(await fs.readFile(new URL('../supabase/migrations/20261020095414_support_billing_test.sql',import.meta.url),'utf8'));
await db.query('insert into auth.users values($1)',[a]);
await db.query('insert into salah_billing_test_private.accounts values($1,$2,now())',[a,JSON.stringify(f.rows.get(a))]);
for(const role of ['anon','authenticated']){await db.exec('set role '+role);await assert.rejects(()=>db.query('select * from salah_billing_test_private.accounts'),e=>e.code==='42501');await db.exec('reset role');}
await assert.rejects(()=>db.query("update salah_billing_test_private.accounts set state='{}'"),e=>e.code==='23514');
await db.close();
console.log('PASS: sandbox checkout/renewal/unlink; consent/ownership; duplicate requests/webhooks; lost response retries; 24h guard; late callback cancellation; private SQL schema; live key/payment rejection. No real provider calls.');
