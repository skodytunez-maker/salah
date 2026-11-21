import{personalDataAllowed}from '../dist/js/audience.js';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const requireFromStaff=createRequire(new URL('../tests/staff/package.json',import.meta.url));
const root=new URL('../',import.meta.url),source=await fs.readFile(new URL('supabase/functions/error-summary/index.ts',root),'utf8');
const {createErrorHandler,createErrorStore,validBatch,diagnosticRateHash}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const batch={id:'11111111-1111-4111-8111-111111111111',version:226,events:[{route:'adhkar',kind:'script',module:'adhkar',screen:'phone',count:2}]};
assert.equal(validBatch(batch),true);
for(const altered of [{...batch,email:'secret'},{...batch,events:[{...batch.events[0],message:'secret'}]},{...batch,events:[{...batch.events[0],route:'quran?token=secret'}]},{...batch,events:[{...batch.events[0],module:'user@email.com'}]},{...batch,events:[{...batch.events[0],count:21}]},{...batch,events:[{...batch.events[0],count:NaN}]}])assert.equal(validBatch(altered),false);
const h1=await diagnosticRateHash('192.0.2.1','fixture-secret','2026-10-07'),h2=await diagnosticRateHash('192.0.2.1','fixture-secret','2026-10-08');assert.notEqual(h1,h2);assert.notEqual(h1,await diagnosticRateHash('192.0.2.1','different-fixture','2026-10-07'));await assert.rejects(diagnosticRateHash('192.0.2.1',''));
let owner=false,recorded=0,limited=false,reads=0;
const handler=createErrorHandler({rateHash:async()=> 'a'.repeat(64),ownerGate:async()=>owner,record:async(value,hash)=>{assert.deepEqual(value,batch);assert.match(hash,/^[a-f0-9]{64}$/);if(limited)return false;recorded++;return true;},read:async days=>{reads++;return {days,total:2,rows:batch.events.map(e=>({...e,version:226})),more:false};}});
const post=async(value,origin='https://skodytunez-maker.github.io')=>handler(new Request('https://example.test/error-summary',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify(value)}));
assert.equal((await post(batch,'https://evil.example')).status,403);assert.equal((await post({...batch,token:'secret'})).status,400);assert.equal(recorded,0);
assert.equal((await post(batch)).status,200);limited=true;const throttled=await post(batch);assert.equal(throttled.status,429);assert.equal(throttled.headers.get('Retry-After'),'900');assert.equal(throttled.headers.get('Access-Control-Expose-Headers'),'Retry-After');
const get=token=>handler(new Request('https://example.test/error-summary?days=7',{headers:token?{Authorization:'Bearer fixture-owner-token'}:{}}));
assert.equal((await get()).status,401);assert.equal((await get(true)).status,403);assert.equal(reads,0);owner=true;assert.equal((await get(true)).status,200);assert.equal(reads,1);

const ui=await fs.readFile(new URL('dist/js/error-reporting.js',root),'utf8');
const executable=ui.replace(/^import[^\n]*\n/gm,'').replace(/\bexport /g,'')+'\n;({createErrorReporter,sendErrorBatch,errorContext,errorModule,expectedDiagnosticFailure,ownDiagnosticSource});';
const summary=await fs.readFile(new URL('dist/js/owner-error-summary.js',root),'utf8');
const summaryValidation=summary.replace(/^import[^\n]*\n/gm,'').replace(/\bexport /g,'')+'\n;({validErrorSummary,errorSummaryRows});';
const {validErrorSummary,errorSummaryRows}=vm.runInNewContext(summaryValidation,{ownerLeaf:value=>value,uiNumberLeaf:String,uiLeaf:(_key,fallback)=>fallback});
const local=requireFromStaff('@electric-sql/pglite');
const db=await local.PGlite.create();
const sql=await fs.readFile(new URL('supabase/error-summary-schema.sql',root),'utf8');
const testSql=await fs.readFile(new URL('supabase/error-summary-test-schema.sql',root),'utf8');
await db.exec("create role anon; create role authenticated;");
await db.exec(sql);
await db.exec(testSql);
await db.exec(testSql);
for(const role of ['anon','authenticated']){
 await db.exec('set role '+role);
 await assert.rejects(db.query('select * from salah_errors_private.test_receipts'),/permission denied/);
 await db.exec('reset role');
}
const sqlTag=client=>(parts,...args)=>client.query(parts.reduce((query,part,i)=>query+(i?'$'+i:'')+part,''),args).then(result=>result.rows);
const realSql=Object.assign(sqlTag(db),{begin:work=>db.transaction(tx=>work(sqlTag(tx)))});
const realStore=createErrorStore(realSql);
const bearer='Bearer fixture-owner-token',healthBearer='Bearer fixture-local-health';
const handlerOnDb=createErrorHandler({...realStore,ownerGate:async token=>token===bearer.slice(7),healthToken:healthBearer.slice(7),rateHash:async()=> 'b'.repeat(64)});
const endpoint='https://example.test/functions/v1/error-summary';
const makeRequest=(suffix,token)=>new Request(endpoint+suffix,{headers:token?{Authorization:token}:{}});
const readLocal=async days=>{
 const response=await handlerOnDb(makeRequest('?days='+days,bearer));
 assert.equal(response.status,200);
 const result=await response.json();
 assert.equal(validErrorSummary(result),true);
 return result;
};
let summaryResult=await readLocal(7);
assert.deepEqual(summaryResult,{days:7,total:0,rows:[],more:false,lastReportAt:null,lastTest:null});
assert.equal((await handlerOnDb(makeRequest('?mode=health'))).status,401);
assert.equal((await handlerOnDb(makeRequest('?mode=health',healthBearer))).status,200);
const unhealthy=createErrorHandler({...realStore,healthToken:healthBearer.slice(7),health:async()=>{throw Error('offline');}});
assert.equal((await unhealthy(makeRequest('?mode=health',healthBearer))).status,503);

let clock=Date.UTC(2026,10,21),nextId=1;
const route={href:'https://example.test/salah/',hash:'#account?secret=SECRET'};
function makeStorage(){
 const values=new Map();
 return{get length(){return values.size;},key:i=>[...values.keys()][i]??null,getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k),values};
}
function fixture({storage=makeStorage(),version=547,send,nav={onLine:true,doNotTrack:'0'},Observer=null}={}){
 const win=new EventTarget(),doc=new EventTarget(),timers=new Map();
 Object.assign(win,{location:route,innerWidth:390});doc.hidden=false;
 let timerId=0;
 const scope={personalDataAllowed,URL,AbortController,AbortSignal,crypto:{getRandomValues:crypto.getRandomValues.bind(crypto)},setTimeout,clearTimeout,
  fetch:()=>{throw Error('Unmocked network');},accountAuthClient:()=>({auth:{getSession:async()=>({data:{session:{access_token:bearer.slice(7)}}})}}),
  OWNER_PROJECT_URL:'https://example.test',OWNER_PUBLIC_KEY:'fixture',window:win,document:doc,navigator:nav,localStorage:storage};
 const api=vm.runInNewContext(executable,scope);
 const reporter=api.createErrorReporter({version,win,doc,nav,storage,Observer,send,now:()=>clock,
  makeId:()=>`11111111-1111-4111-8111-${String(nextId++).padStart(12,'0')}`,random:()=>1,
  setTimer:(fn,delay)=>{timers.set(++timerId,{fn,at:clock+delay});return timerId;},clearTimer:id=>timers.delete(id)});
 const emit=(name,props={})=>win.dispatchEvent(Object.assign(new Event(name),props));
 const error=(props={})=>emit('error',{filename:'https://example.test/salah/js/adhkar.js?token=SECRET',message:'password=SECRET',...props});
 const reply={api,reporter,win,doc,nav,storage,emit,error,timers};
 return reply;
}
const payloads=[];
let failure='network';
const transport=async(url,init)=>{
 const body=JSON.parse(init.body);
 payloads.push({url,body,auth:init.headers.Authorization});
 assert.ok(!JSON.stringify(body).includes('SECRET'));
 if(failure==='network')throw Error('Load failed');
 if(failure==='429')return new Response('{}',{status:429,headers:{'Retry-After':'120'}});
 if(failure==='503')return new Response('{}',{status:503});
 if(failure==='invalid ack')return new Response('{}',{status:200});
 const response=await handlerOnDb(new Request(url,init));
 if(failure==='lost ack')throw Error('Load failed after commit');
 return response;
};
const send=(events,version,opts)=>current.api.sendErrorBatch(events,version,{...opts,fetcher:transport});
let current=fixture({send});
current.error();
await current.reporter.flush();
assert.equal(payloads.length,0,'Off by default');
assert.equal(current.reporter.setEnabled(true),true);
current.error();
await current.reporter.flush();
assert.equal(current.reporter.status().state,'retrying');
assert.equal(current.reporter.status().pending,1);
const original=payloads[0].body;
assert.equal(original.events[0].route,'account');
assert.equal(original.events[0].module,'adhkar');
assert.equal(payloads[0].auth,undefined);
const {storage,nav}=current;
current.reporter.dispose();
current=fixture({storage,nav,version:548,send});
await current.reporter.flush();
assert.equal(payloads.length,1,'Backoff survives restart');
clock+=10000;failure='429';
await current.reporter.flush();
assert.equal(payloads.length,2);
clock+=119999;
await current.reporter.flush();
assert.equal(payloads.length,2,'Retry-After is respected');
clock+=1;failure='503';
await current.reporter.flush();
assert.equal(payloads.length,3);
clock+=20000;
await current.reporter.flush();
assert.equal(payloads.length,3,'Backoff increases on a second failure');
clock+=20000;failure='invalid ack';
await current.reporter.flush();
assert.equal(current.reporter.status().pending,1,'A 200 alone is insufficient');
clock+=80000;failure='lost ack';
await current.reporter.flush();
assert.equal(current.reporter.status().pending,1,'Server can commit without the client receiving the response');
assert.equal((await readLocal(7)).total,1);
clock+=160000;failure=null;
await current.reporter.flush();
assert.equal(current.reporter.status().pending,0);
assert.equal(current.reporter.status().lastConfirmedAt,clock);
assert.equal((await readLocal(7)).total,1,'Replaying the UUID does not inflate the count');
assert.ok(payloads.every(p=>JSON.stringify(p.body)===JSON.stringify(original)));

nav.onLine=false;
current.error();
await current.reporter.flush();
assert.equal(current.reporter.status().state,'offline');
current.reporter.dispose();
current=fixture({storage,nav,version:548,send});
assert.equal(current.reporter.status().pending,1);
nav.onLine=true;current.emit('online');await current.reporter.flush();
assert.equal((await readLocal(30)).total,2);
assert.equal(current.reporter.status().pending,0);

const testId=current.reporter.queueTest();
assert.ok(testId);
assert.equal(current.reporter.queueTest(),undefined,'At most one test per device queue');
await current.reporter.flush();
assert.equal(current.reporter.status().testPending,false);
assert.equal(current.reporter.status().lastTest.state,'sent');
const testPost=payloads.at(-1);
assert.match(testPost.url,/\?mode=test$/);
assert.equal(testPost.auth,bearer);
summaryResult=await readLocal(1);
assert.equal(summaryResult.total,2,'Test does not count as a real error');
assert.equal(summaryResult.lastTest.id,testId);
assert.equal(summaryResult.lastTest.version,548);
assert.ok(summaryResult.lastReportAt);
const retryTest=async(token,body=testPost.body)=>handlerOnDb(new Request(testPost.url,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:token}:{})},body:JSON.stringify(body)}));
assert.equal((await retryTest()).status,401);
assert.equal((await retryTest('Bearer fixture-nonowner-token')).status,403);
const replay=await (await retryTest(bearer)).json();
assert.equal(replay.confirmedAt,summaryResult.lastTest.at);
assert.equal((await db.query('select count(*)::int as n from salah_errors_private.test_receipts')).rows[0].n,1);
assert.equal((await retryTest(bearer,{...testPost.body,id:'22222222-2222-4222-8222-222222222222'})).status,429);
assert.equal((await retryTest(bearer,{...testPost.body,events:[{...testPost.body.events[0],route:'account'}]})).status,400);

// Terminal rejections are visible and never retried.
const reject=fixture({send:async()=>{throw Object.assign(Error(),{status:400});}});
reject.reporter.setEnabled(true);reject.error();await reject.reporter.flush();
assert.equal(reject.reporter.status().state,'rejected');
assert.equal(reject.reporter.status().pending,0);
reject.reporter.dispose();

// Concurrent clients share immutable queue keys, and consent revocation cancels an in-flight send.
const shared=makeStorage();
let cancellation,finish;
const front=fixture({storage:shared,send:async(events,version,opts)=>{cancellation=opts.signal;return new Promise(resolve=>{finish=resolve;});}});
front.reporter.setEnabled(true);front.error();
const back=fixture({storage:shared,version:549});
back.error();
assert.equal(front.reporter.status().pending,2);
const inFlight=front.reporter.flush();
back.reporter.setEnabled(false);
front.emit('storage',{key:'salah:diagnostics-v1'});
assert.equal(cancellation.aborted,true);
finish({ok:true});
await inFlight;
assert.equal(front.reporter.status().state,'disabled');
assert.equal([...shared.values.keys()].some(k=>k.startsWith('salah:diagnostic-')),false);
front.reporter.dispose();back.reporter.dispose();

// Preserve expected cancellation, foreground, source, redaction and rate-limit behavior.
let slow;
class FakeObserver{static supportedEntryTypes=['longtask'];constructor(fn){slow=fn;}observe(){}disconnect(){}}
const filtered=fixture({Observer:FakeObserver,send:async()=>({ok:true})});
filtered.reporter.setEnabled(true);
filtered.emit('unhandledrejection',{reason:{name:'AbortError'}});
filtered.emit('unhandledrejection',{reason:{name:'NotAllowedError'}});
filtered.doc.hidden=true;filtered.error();filtered.doc.hidden=false;
filtered.error({filename:'https://foreign.test/tracker.js'});
filtered.win.doNotTrack='1';filtered.error();filtered.win.doNotTrack='0';
assert.equal(filtered.reporter.status().pending,0);
filtered.error({filename:'https://example.test/salah/js/quran-reciter-library.js?SECRET'});
slow({getEntries:()=>[{duration:2400,startTime:10},{duration:2400,startTime:5000}]});
for(let i=0;i<3;i++)filtered.emit('unhandledrejection',{reason:{name:'TypeError',message:'Failed to fetch'}});
const records=()=>[...filtered.storage.values.entries()].filter(([k])=>k.includes('diagnostic-event-v2')).map(([,v])=>JSON.parse(v));
assert.deepEqual(records().map(r=>r.event.kind),['script','slow','resource']);
assert.equal(records()[0].event.module,'quran');
assert.ok(!JSON.stringify(records()).includes('SECRET'));
for(let i=0;i<100;i++)filtered.error();
assert.equal(records().length,20);
clock+=15*60000;
filtered.error();
assert.equal(records().length,21,'Capture resumes after the rate window');
filtered.reporter.dispose();

// Exercise the installed schema upgrade and the actual reporting transport.
const migration=await fs.readFile(new URL('supabase/migrations/20261121120208_quran_navigation_diagnostics.sql',root),'utf8');
await db.exec(`alter table salah_errors_private.counts drop constraint counts_module_check,
 add constraint counts_module_check check(module in('app','quran','adhkar','qibla','support','settings','qr-login','account-devices','weather','other'))`);
const olderTotal=(await readLocal(7)).total;
await db.exec(migration);
assert.equal((await readLocal(7)).total,olderTotal,'The migration keeps existing diagnostic aggregates');
for(const role of ['anon','authenticated']){
 await db.exec('set role '+role);
 await assert.rejects(db.query('select * from salah_errors_private.counts'),/permission denied/);
 await db.exec('reset role');
}

let navigationRequests=0;
const navigation=fixture({version:549,send:(events,version,options)=>navigation.api.sendErrorBatch(events,version,{
 ...options,fetcher:async(url,init)=>{
  navigationRequests++;
  const input=JSON.parse(init.body);
  assert.deepEqual(input.events,[{route:'quran',kind:'promise',module:'quran-navigation',screen:'phone',count:1}]);
  assert.equal(init.headers.Authorization,undefined);
  assert.ok(!JSON.stringify(input).includes('SECRET'));
  for(const event of [{...input.events[0],route:'home'},{...input.events[0],kind:'script'}]){
   assert.equal(validBatch({...input,events:[event]}),false);
  }
  return handlerOnDb(new Request(url,init));
 }
})});
assert.equal(navigation.reporter.queuePlayerNavigationFailure(),undefined,'Disabled diagnostics cannot count the failure');
navigation.reporter.setEnabled(true);
navigation.nav.doNotTrack='1';
assert.equal(navigation.reporter.queuePlayerNavigationFailure(),undefined,'Do Not Track also blocks functional reports');
navigation.nav.doNotTrack='0';
navigation.doc.hidden=true;
assert.equal(navigation.reporter.queuePlayerNavigationFailure(),undefined);
navigation.doc.hidden=false;
assert.ok(navigation.reporter.queuePlayerNavigationFailure());
await navigation.reporter.flush();
assert.equal(navigationRequests,1);
assert.equal(navigation.reporter.status().pending,0);
const withNavigation=await readLocal(7);
assert.equal(withNavigation.total,olderTotal+1);
const navigationRow=withNavigation.rows.find(row=>row.module==='quran-navigation');
assert.deepEqual(navigationRow,{version:549,route:'quran',kind:'promise',module:'quran-navigation',screen:'phone',count:1});
assert.match(errorSummaryRows([navigationRow]),/Коран[\s\S]*Не открылся плеер после возврата из списка сур/);
navigation.reporter.dispose();

assert.match(sql,/enable row level security/);assert.match(sql,/revoke all on all tables/);
assert.ok(!/user_id|email|session_id|message|stack/.test(sql+testSql));
assert.match(source,/on conflict do nothing returning id/);assert.match(source,/owner-access/);assert.match(source,/rate\.total\+units>100/);
assert.equal((source.match(/current_date-\$\{days-1\}::integer/g)||[]).length,2,'Both Postgres window queries require an explicit integer bind');
current.reporter.dispose();
await db.close();
console.log('PASS: real diagnostic SQL in PGlite, local queue, durable retry, consent revocation, duplicate receipt, owner-only synthetic test and health.');
