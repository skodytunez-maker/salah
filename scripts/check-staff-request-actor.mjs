import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {staffUiError} from '../dist/js/staff-ui.js';

// Execute the actual shared transport. Auth refresh and fetch are controlled;
// no request leaves this process and no real token is read or logged.
const source=await fs.readFile(new URL('../dist/js/staff-transport.js',import.meta.url),'utf8');
const actorA='11111111-1111-4111-8111-111111111111',actorB='22222222-2222-4222-8222-222222222222';
const args={roomId:'33333333-3333-4333-8333-333333333333',scope:'everyone',operationId:'44444444-4444-4444-8444-444444444444'};
let resolveSession=async()=>({data:{session:{user:{id:actorA},access_token:'local-fixture-a'}}}),authCalls=0;
const sent=[],context=vm.createContext({accountAuthClient:()=>({auth:{getSession:()=>{authCalls++;return resolveSession();}}}),staffUiError,OWNER_PROJECT_URL:'https://fixture.invalid',OWNER_PUBLIC_KEY:'public-local-fixture',AbortSignal,
 fetch:async(url,options)=>{sent.push({url,options});return{ok:true,json:async()=>({data:{ok:true}})};}
});
vm.runInContext(source.split('\n').filter(line=>!line.startsWith('import')).join('\n').replaceAll('export async function','async function'),context);
const request=vm.runInContext('staffRequest',context),abort=e=>e?.name==='AbortError';
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve};}
const originalArgs=JSON.stringify(args),options={expectedActor:actorA};

// A request created for A may wait behind auth refresh. If that resolves as B,
// the same room may still be valid for B, so server membership alone cannot
// establish that B initiated this action.
let pending=deferred();resolveSession=()=>pending.promise;
const switched=request('chat.clear',args,new AbortController().signal,options);
pending.resolve({data:{session:{user:{id:actorB},access_token:'local-fixture-b'}}});
await assert.rejects(switched,abort,'An old action cannot adopt a newly resolved account');
assert.equal(sent.length,0);

const alreadyAborted=new AbortController();alreadyAborted.abort();const beforeAuth=authCalls;
await assert.rejects(request('chat.clear',args,alreadyAborted.signal,options),abort);
assert.equal(authCalls,beforeAuth,'Already aborted work never enters auth refresh');assert.equal(sent.length,0);

pending=deferred();resolveSession=()=>pending.promise;
const cancelled=new AbortController(),waiting=request('chat.clear',args,cancelled.signal,options);cancelled.abort();
pending.resolve({data:{session:{user:{id:actorA},access_token:'local-fixture-a'}}});
await assert.rejects(waiting,abort,'An abort during auth refresh prevents transport');assert.equal(sent.length,0);

pending=deferred();resolveSession=()=>pending.promise;
const missingAfterCancel=new AbortController(),cancelledAuth=request('chat.clear',args,missingAfterCancel.signal,options);missingAfterCancel.abort();
pending.resolve({data:{session:null},error:Error('local-auth-cancelled')});
await assert.rejects(cancelledAuth,abort,'Cancelled auth completion cannot trigger a sign-in error in a newer view');assert.equal(sent.length,0);

resolveSession=async()=>({data:{session:{user:{id:actorA},access_token:'local-fixture-refreshed-a'}}});
assert.deepEqual(await request('chat.clear',args,new AbortController().signal,options),{ok:true});
assert.equal(sent.length,1,'A refreshed token for the same actor remains usable');
assert.equal(sent[0].options.headers.Authorization,'Bearer local-fixture-refreshed-a');
assert.deepEqual(JSON.parse(sent[0].options.body),{action:'chat.clear',args});
assert.equal(sent[0].options.cache,'no-store');assert.equal(sent[0].options.credentials,'omit');assert.equal(sent[0].options.referrerPolicy,'no-referrer');
assert.equal(JSON.stringify(args),originalArgs);assert.deepEqual(options,{expectedActor:actorA});

// Existing support/push callers without a captured actor retain their contract.
resolveSession=async()=>({data:{session:{access_token:'local-fixture-legacy'}}});
assert.deepEqual(await request('chat.status'),{ok:true});assert.equal(sent.length,2);
assert.deepEqual(JSON.parse(sent[1].options.body),{action:'chat.status',args:{}});

resolveSession=async()=>({data:{session:null}});
await assert.rejects(request('chat.clear',args,undefined,options),e=>e.code==='sign_in_required');assert.equal(sent.length,2);
console.log('PASS: actual staff transport binds a queued action to its captured actor, cancels before auth/before fetch, accepts same-actor refresh and preserves unbound legacy callers; local auth/fetch fixtures only, no token output or network.');
