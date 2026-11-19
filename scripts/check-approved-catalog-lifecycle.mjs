import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
const source=await fs.readFile(new URL('../dist/js/approved-catalog.js',import.meta.url),'utf8');
const turn=async()=>{for(let i=0;i<8;i++)await new Promise(resolve=>setImmediate(resolve));};
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
const row=(revision=1,id='ar.fixture')=>({kind:'reciter',id,revision,payload:{id,name:'Fixture '+revision,format:'surah',server:'https://server8.mp3quran.net/lhdan/',portrait:'assets/reciters/fixture.jpg'}});
const json=(revision=1)=>JSON.stringify({version:1,entries:[row(revision)]});
const reply=(revision=1)=>new Response(json(revision),{status:200});
function fixture(){
 let clock=Date.parse('2026-11-19T12:00:00Z'),serial=0,network=async()=>reply(),openGate=null,matchGate=null,writeHeld=false,saved=null,openFailure=false,activeWrites=0,maxWrites=0;
 const timers=new Map(),requests=[],writes=[];
 let opens=0,matches=0;
 class FixtureDate extends Date{static now(){return clock;}}
 const cache={async match(){matches++;return matchGate?matchGate.promise:saved===null?undefined:new Response(saved);},async put(_url,response){
  const text=await response.text(),entry={text,revision:JSON.parse(text).entries[0]?.revision??0};writes.push(entry);activeWrites++;maxWrites=Math.max(maxWrites,activeWrites);
  try{if(writeHeld){const gate=deferred();entry.resolve=()=>{saved=text;gate.resolve();};entry.reject=()=>gate.reject(Error('storage failed'));await gate.promise;}else saved=text;}finally{activeWrites--;}
 }};
 const context=vm.createContext({window:{},URL,Response,AbortController,AbortSignal:{timeout:()=>new AbortController().signal},Date:FixtureDate,setTimeout:(fn,ms)=>{timers.set(++serial,{fn,at:clock+ms});return serial;},clearTimeout:id=>timers.delete(id),caches:{open:()=>{opens++;if(openFailure)return Promise.reject(Error('storage denied'));return openGate?openGate.promise:Promise.resolve(cache);}},fetch:(url,options)=>{assert.equal(url,'https://kbltwszfvphgbxdbczsb.supabase.co/functions/v1/approved-catalog');assert.equal(options.credentials,'omit');assert.equal(options.referrerPolicy,'no-referrer');assert.equal(options.cache,'no-cache');assert.ok(!options.headers?.Authorization);requests.push({url,options});return network(url,options);}});
 const api=vm.runInContext(source.replaceAll('export ','')+';({approvedCatalog,applyApprovedReciters,applyApprovedWallpapers});',context);
 const start=(method=()=>api.approvedCatalog())=>{const state={done:false,value:null,error:null};state.task=Promise.resolve().then(method).then(value=>{state.done=true;state.value=value;return value;},error=>{state.done=true;state.error=error;throw error;});return state;};
 const advance=async ms=>{clock+=ms;for(let n=0;n<30;n++){const next=[...timers].find(([,t])=>t.at<=clock);if(!next)break;timers.delete(next[0]);next[1].fn();await turn();}};
 return{api,start,requests,writes,timers,cache,advance,setNetwork:fn=>network=fn,setSaved:text=>saved=text,getSaved:()=>saved,holdOpen(){openGate=deferred();return{resolve:()=>openGate.resolve(cache)};},holdMatch(){matchGate=deferred();return matchGate;},holdWrites:()=>writeHeld=true,denyOpen:()=>openFailure=true,get opens(){return opens;},get maxWrites(){return maxWrites;},get matches(){return matches;}};
}
// The actual public function must release startup after valid network data;
// persistence may be slow or permanently stalled without owning that result.
const held=fixture();held.holdWrites();const first=held.start();await turn();
assert.equal(held.writes.length,1);assert.equal(first.done,true,'A completed,validated catalogue must not wait for CacheStorage.put');assert.equal(first.value[0].revision,1);assert.equal(held.timers.size,0);
for(const revision of [2,3]){await held.advance(60001);held.setNetwork(async()=>reply(revision));const next=held.start();await turn();assert.equal(next.done,true);assert.equal(next.value[0].revision,revision);assert.equal(held.writes.length,1,'A pending cache writer cannot overlap or accumulate intermediate writes');}
held.writes[0].resolve();await turn();assert.equal(held.writes.length,2);assert.equal(held.writes[1].revision,3,'Only the newest pending validated catalogue follows the old write');assert.equal(held.maxWrites,1);
held.writes[1].resolve();await turn();assert.equal(JSON.parse(held.getSaved()).entries[0].revision,3,'An older delayed write never overwrites newer persisted data');
// A stalled cache open must not delay a working network or multiply opens.
const open=fixture(),openGate=open.holdOpen();const opened=open.start();await turn();assert.equal(opened.done,true);assert.equal(open.requests.length,1);
await open.advance(60001);open.setNetwork(async()=>reply(2));const openedAgain=open.start();await turn();assert.equal(openedAgain.done,true);assert.equal(open.opens,1,'Coalesce an outstanding cache open');openGate.resolve();await turn();assert.equal(JSON.parse(open.getSaved()).entries[0].revision,2);
// Network and response-body budgets cover WebViews that ignore abort.
for(const phase of ['fetch','body']){
 const timed=fixture(),late=deferred();timed.setSaved(json(4));
 timed.setNetwork(()=>phase==='fetch'?late.promise:Promise.resolve({ok:true,text:()=>late.promise}));
 const pending=timed.start();await turn();assert.equal(pending.done,false);await timed.advance(2499);assert.equal(pending.done,false);await timed.advance(1);
 assert.equal(pending.done,true);assert.equal(pending.value[0].revision,4,'A timed-out network returns only the verified offline cache');assert.equal(timed.requests[0].options.signal.aborted,true);assert.equal(timed.timers.size,0);
 late.resolve(phase==='fetch'?reply(2):json(2));await turn();const same=timed.start();await turn();assert.equal(same.value[0].revision,4,'Late fetch/body completion cannot replace the selected fallback');assert.equal(timed.writes.length,0);
}
// The complete optional fallback has one bounded storage-read budget.
for(const phase of ['open','match','body']){
 const stalled=fixture();stalled.setNetwork(async()=>{throw Error('offline');});let gate;
 if(phase==='open')gate=stalled.holdOpen();else if(phase==='match')gate=stalled.holdMatch();else stalled.setSaved(json(1));
 if(phase==='body')stalled.cache.match=async()=>({text:()=>new Promise(resolve=>{gate={resolve};})});
 const pending=stalled.start();await turn();assert.equal(pending.done,false);await stalled.advance(999);assert.equal(pending.done,false);await stalled.advance(1);
 assert.equal(pending.done,true);assert.equal(pending.value.length,0);assert.equal(stalled.timers.size,0,'No fallback timer survives its deadline');
 await stalled.advance(60001);stalled.setNetwork(async()=>reply(8));const current=stalled.start();await turn();assert.equal(current.done,true);assert.equal(current.value[0].revision,8);
 if(phase==='open')gate.resolve();else if(phase==='match')gate.resolve(new Response(json(1)));else gate.resolve(json(1));await turn();
 const still=stalled.start();await turn();assert.equal(still.value[0].revision,8,'A late optional cache result must not publish older rows');
}
// Retain full validation,known origins and last good in-memory data.
const invalid=fixture(),seed=invalid.start();await turn();assert.equal(seed.value[0].revision,1);
await invalid.advance(60001);invalid.setNetwork(async()=>new Response(JSON.stringify({version:1,entries:[row(2),{...row(3),payload:{...row(3).payload,portrait:'https://evil.invalid/photo.jpg'}}]})));
const rejected=invalid.start();await turn();assert.equal(rejected.value[0].revision,1,'A partially invalid response must not replace the previous complete catalogue');assert.equal(invalid.writes.length,1);
const invalidCache=fixture();invalidCache.setSaved(JSON.stringify({version:1,entries:[row(),{bad:true}]}));invalidCache.setNetwork(async()=>{throw Error('offline');});const corrupt=invalidCache.start();await turn();assert.equal(corrupt.done,true);assert.equal(corrupt.value.length,0,'Invalid cached subsets are not approved catalogues');
const huge=fixture();huge.setNetwork(async()=>({ok:true,text:async()=>json()+' '.repeat(500001)}));const oversized=huge.start();await turn();assert.equal(oversized.done,true);assert.equal(oversized.value.length,0);assert.equal(huge.writes.length,0);
// Coalesce concurrent callers and preserve the existing one-minute cadence.
const coalesced=fixture(),remote=deferred();coalesced.setNetwork(()=>remote.promise);const a=coalesced.start(),b=coalesced.start();await turn();assert.equal(coalesced.requests.length,1);remote.resolve(reply(5));await turn();assert.equal(a.value,b.value);const warm=coalesced.start();await turn();assert.equal(warm.value[0].revision,5);assert.equal(coalesced.requests.length,1);assert.equal(coalesced.timers.size,0);
const denied=fixture();denied.denyOpen();denied.setNetwork(async()=>{throw Error('offline');});const unavailable=denied.start();await turn();assert.equal(unavailable.done,true);assert.equal(unavailable.value.length,0);assert.equal(denied.timers.size,0);
const writeFailure=fixture();writeFailure.holdWrites();const good=writeFailure.start();await turn();writeFailure.writes[0].reject();await turn();assert.equal(good.done,true);await writeFailure.advance(60001);writeFailure.setNetwork(async()=>reply(2));const retry=writeFailure.start();await turn();assert.equal(retry.done,true);assert.equal(retry.value[0].revision,2);writeFailure.writes[1].resolve();await turn();
// The loader must not change how an active reader is protected by its caller.
const player=fixture();player.setNetwork(async()=>new Response(JSON.stringify({version:1,entries:[row(2),row(1,'ar.other-fixture')]})));const active={id:'ar.fixture',name:'Existing active reader',format:'surah'},reciters=[active];const protectedPlayer=player.start(()=>player.api.applyApprovedReciters(reciters,{updateExisting:false}));await turn();assert.equal(protectedPlayer.done,true);assert.equal(reciters[0],active);assert.equal(active.name,'Existing active reader');assert.ok(reciters.some(r=>r.id==='ar.other-fixture'));
console.log('PASS: actual public catalogue releases stalled cache writes/open,serializes/coalesces persistence,bounds fetch/body and optional cache fallback,ignores late results,retains complete validation/offline data/60s coalescing and active-reader semantics. Fault-injection timing is not a physical-phone benchmark.');
