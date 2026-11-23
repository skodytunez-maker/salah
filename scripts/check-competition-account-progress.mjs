import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import{createCompetitionFastProgress,wholeCompetitionSnapshot}from '../dist/js/competition-fast-progress.js';
import{addListeningDay,listeningDayKey,listeningPeriodTotals}from '../dist/js/reciter-popularity-core.js';
import{competitionSnapshot,competitionProgress}from '../supabase/functions/reciter-competition/core.mjs';
import{RECITERS}from '../dist/js/quran-reciters.js';
import{safeListener}from '../dist/js/reciter-ranking-core.js';

// Exercise the real registered-account adapter and real compact producer together.
// Only the platform clock/scheduler, authenticated SDK and HTTP gateway are fixtures.
// No audio, notification, real account or remote service is created.
const source=await fs.readFile(new URL('../dist/js/competition-client.js',import.meta.url),'utf8');
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222',reciter='ar.alafasy',day='2026-11-16';
const ACK={ok:true,progressVersion:1,accepted:true};
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
const session=user=>({data:{session:{user:{id:user},access_token:'token:'+user}}});
const ledger=seconds=>({totals:{[reciter]:seconds},days:{[day]:{[reciter]:seconds}}});

function fixture({firstFull=ACK,firstSnapshot=ledger(100)}={}){
 let clock=0,serial=0,auth={signedIn:true,userId:A},value=firstSnapshot,participating=true,activePosts=0,peakPosts=0,sdkCalls=0,inAuthCallback=true;
 const epoch=Date.parse(day+'T12:00:00Z'),timers=new Map(),intervals=[],stored=new Map(),events=new Map(),docEvents=new Map(),requests=[],creditReplies=[],plans=new Map(),sdkPlans=[],producers=[];
 class ClockDate extends Date{constructor(...args){super(...(args.length?args:[epoch+clock]));}static now(){return epoch+clock;}}
 const schedule=(fn,delay=0)=>{const id=++serial;timers.set(id,{at:clock+Math.max(0,Number(delay)||0),fn});return id;},cancel=id=>timers.delete(id);
 const listen=(map,name,fn)=>{if(!map.has(name))map.set(name,new Set());map.get(name).add(fn);};
 const emit=(name)=>{for(const fn of [...events.get(name)||[]])fn({type:name});};
 const doc={hidden:false,addEventListener:(name,fn)=>listen(docEvents,name,fn),removeEventListener:(name,fn)=>docEvents.get(name)?.delete(fn)};
 const win={addEventListener:(name,fn)=>listen(events,name,fn),removeEventListener:(name,fn)=>events.get(name)?.delete(fn),dispatchEvent:event=>{emit(event.type);return true;}};
 const queue=(action,plan)=>{if(!plans.has(action))plans.set(action,[]);plans.get(action).push(plan);};
 queue('snapshot',{data:firstFull});
 const fetch=async(url,options={})=>{
  assert.equal(inAuthCallback,false,'Auth callbacks must be left before network work');
  const body=options.body?JSON.parse(options.body):null,action=body?.action||'own',entry={url,body,action,user:options.headers?.Authorization?.slice(7),signal:options.signal,keepalive:options.keepalive,at:clock,jsonStarted:false,finished:false};requests.push(entry);
  const isPost=options.method==='POST';if(isPost){activePosts++;peakPosts=Math.max(peakPosts,activePosts);}
  const plan=plans.get(action)?.shift();
  return{ok:true,status:200,async json(){entry.jsonStarted=true;try{
   if(plan?.json)return await plan.json;
   if(plan?.error)throw plan.error;
   if(plan?.data)return structuredClone(plan.data);
   if(body)return{...ACK};
   return{enabled:true,mode:'initial',id:auth.userId,notify:false,period:'all',totals:{all:{},day:{},week:{},month:{}}};
  }finally{entry.finished=true;if(isPost)activePosts--;}}};
 };
 const context=vm.createContext({
  personalDataAllowed:()=>true,OWNER_PROJECT_URL:'https://fixture.invalid',OWNER_PUBLIC_KEY:'public-fixture',RECITERS,safeListener,listeningDayKey,listeningPeriodTotals,wholeCompetitionSnapshot,
  createCompetitionFastProgress:options=>{const producer=createCompetitionFastProgress({...options,now:()=>clock,schedule,cancel});producers.push(producer);return producer;},
  read:(key,fallback)=>stored.has(key)?stored.get(key):fallback,write:(key,next)=>{stored.set(key,structuredClone(next));return true;},
  window:win,document:doc,navigator:{onLine:true},Date:ClockDate,Intl,URL,URLSearchParams,AbortController,AbortSignal,
  Event:class{constructor(type){this.type=type;}},crypto:{randomUUID:()=> 'aaaaaaaa-aaaa-4aaa-8aaa-'+String(++serial).padStart(12,'0')},
  setTimeout:schedule,clearTimeout:cancel,setInterval:(fn,ms)=>{intervals.push({fn,ms});return intervals.length;},clearInterval(){},fetch,console,
 });
 const api=vm.runInContext(source.replace(/^import.*\n/gm,'').replace(/export /g,'')+';({initCompetition,syncCompetitionNow,competitionOwn,sendCompetitionPresence,localCompetitionTotals});',context);
 const client={auth:{getSession:async()=>{assert.equal(inAuthCallback,false,'The SDK cannot run inside an Auth state callback');sdkCalls++;if(sdkPlans.length)return sdkPlans.shift().promise;return session(auth.userId);}}};
 api.initCompetition({getAccount:()=>auth,getClient:()=>client,getSnapshot:()=>value,isEnabled:()=>participating,credit:{receive:(key,result,options)=>creditReplies.push({key,result:structuredClone(result),options}),resumeToken:()=>null}});
 assert.equal(sdkCalls,0,'Initialization yields past the Auth callback before reading the session');inAuthCallback=false;
 const due=()=>[...timers].filter(([,timer])=>timer.at<=clock).sort((a,b)=>a[1].at-b[1].at||a[0]-b[0]);
 async function drain(){for(let turn=0;turn<28;turn++){for(const[id,timer]of due()){if(!timers.delete(id))continue;timer.fn();}await new Promise(resolve=>setImmediate(resolve));}}
 async function advance(ms){const target=clock+ms;for(let turn=0;turn<1000;turn++){const next=[...timers].filter(([,timer])=>timer.at<=target).sort((a,b)=>a[1].at-b[1].at||a[0]-b[0])[0];if(!next)break;clock=Math.max(clock,next[1].at);await drain();}clock=target;await drain();}
 return{api,doc,win,requests,creditReplies,intervals,queue,drain,advance,emit,producers,sdkPlans,
  get clock(){return clock;},get sdkCalls(){return sdkCalls;},get activePosts(){return activePosts;},get peakPosts(){return peakPosts;},
  get snapshot(){return value;},setSnapshot(next){value=next;},setSeconds(seconds){value.totals[reciter]=seconds;value.days[day][reciter]=seconds;},
  setAccount(user){auth=user?{signedIn:true,userId:user}:{signedIn:false,userId:null};emit('salah:counter-status');},
  posts:action=>requests.filter(row=>row.body&&(!action||row.action===action)),owns:()=>requests.filter(row=>row.action==='own'),
  progress({final=false}={}){emit(final?'salah:personal-listening-final':'salah:personal-listening-progress');},
  dispose(){for(const producer of producers)producer.dispose();timers.clear();},
 };
}

// Capability is acknowledged by the real full snapshot, then actual eligible
// events send compact cumulative points every second without a per-tick own GET.
let h=fixture();await h.drain();
assert.equal(h.posts('snapshot').length,1);assert.equal(h.posts('snapshot')[0].body.totals[reciter],100);
assert.equal(h.owns().length,2,'One own read before the initial full and one after its acknowledgement');
for(let seconds=101;seconds<=105;seconds++){await h.advance(1000);h.setSeconds(seconds);h.progress();await h.drain();const point=h.posts('progress').at(-1);assert.equal(point.body.totals[reciter],seconds);assert.equal(point.body.days[day][reciter],seconds);assert.equal(point.at,(seconds-100)*1000);assert.equal(point.user,'token:'+A);assert.equal(point.signal.aborted,false);}
assert.equal(h.posts('progress').length,5);assert.equal(h.owns().length,2,'Fast progress never reloads the entire own profile');assert.equal(h.posts('snapshot').length,1,'The compact path does not become one full snapshot per second');
const beforeIdle=h.posts().length;await h.advance(3000);h.progress();await h.drain();assert.equal(h.posts().length,beforeIdle,'A clock tick or duplicate event cannot invent eligible listening');
h.doc.hidden=true;h.setSeconds(106);h.progress();await h.drain();assert.equal(h.posts('progress').at(-1).body.totals[reciter],106,'A hidden page still uploads actual metered progress');
await h.advance(1000);h.setSeconds(107);h.progress({final:true});await h.drain();assert.equal(h.posts('progress').at(-1).keepalive,true,'A genuine final progress event requests a bounded keepalive upload');assert.equal(h.owns().length,2);assert.equal(h.peakPosts,1);h.dispose();

// A snapshot lacking the full capability acknowledgement cannot enable fast
// writes optimistically. Existing deployments may still send only {ok:true}.
h=fixture({firstFull:{ok:true}});await h.drain();await h.advance(1000);h.setSeconds(101);h.progress();await h.drain();assert.equal(h.posts('progress').length,0,'All capability fields are required before fast account progress');h.dispose();

// A cancelled compact request retains the upload slot until its delayed JSON
// drains. Its stale hold must never reach credit.receive, and the full recovery
// must carry the latest cumulative eligible snapshot exactly once afterwards.
h=fixture();await h.drain();const delayed=deferred(),hold='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';h.queue('progress',{json:delayed.promise});await h.advance(1000);h.setSeconds(101);h.progress();await h.drain();
const stalled=h.posts('progress')[0];assert.equal(stalled.jsonStarted,true);assert.equal(h.activePosts,1);h.setSeconds(102);const full=h.api.syncCompetitionNow(true,{recovery:true});await h.drain();assert.equal(stalled.signal.aborted,true);assert.equal(h.posts('snapshot').length,1,'A full cannot overlap an aborted but undrained request');assert.equal(h.activePosts,1);
delayed.resolve({...ACK,creditPaused:true,creditPauseToken:hold});await h.drain();await full;
assert.equal(h.creditReplies.some(row=>row.result.creditPauseToken===hold),false,'An abort after HTTP but before delayed JSON is checked before applying hold state');assert.equal(h.posts('snapshot').length,2);assert.equal(h.posts('snapshot')[1].body.totals[reciter],102);assert.equal(h.peakPosts,1,'Full and compact uploads remain serialized while cancellation drains');
await h.advance(1000);h.setSeconds(103);h.progress();await h.drain();assert.equal(h.posts('progress').at(-1).body.totals[reciter],103,'The acknowledged full baseline restarts the real fast producer');h.dispose();

// Bind the original owner before a queued upload begins, not when the drained
// upload finally enters request(). Otherwise A's body could use B's session.
h=fixture();await h.drain();const queuedDrain=deferred();h.queue('progress',{json:queuedDrain.promise});await h.advance(1000);h.setSeconds(101);h.progress();await h.drain();h.setSeconds(102);const queuedFull=h.api.syncCompetitionNow(true,{recovery:true});await h.drain();assert.equal(h.posts('snapshot').length,1);
h.setSnapshot(ledger(5));h.setAccount(B);await h.drain();queuedDrain.resolve({...ACK});await h.drain();await queuedFull;
assert.equal(h.requests.some(row=>row.user==='token:'+B&&row.body?.totals?.[reciter]>=100),false,'A queued full cannot adopt the new account session');assert.equal(h.posts('snapshot').length,1,'The stale A full is rejected before fetch even though its upload slot opens after the account switch');
const newFull=h.api.syncCompetitionNow(true,{recovery:true});await h.drain();await newFull;assert.equal(h.posts('snapshot').at(-1).body.totals[reciter],5);assert.equal(h.posts('snapshot').at(-1).user,'token:'+B);assert.equal(h.api.competitionOwn().id,B);await h.advance(1000);h.setSeconds(6);h.progress();await h.drain();assert.equal(h.posts('progress').at(-1).body.totals[reciter],6);assert.equal(h.posts('progress').at(-1).user,'token:'+B,'Only B’s freshly metered eligible ledger resumes after account recovery');assert.equal(h.peakPosts,1);h.dispose();

// Also bind the owner across the SDK's asynchronous session lock. Even a valid
// delayed A session cannot authorize a request after the app has become B.
h=fixture();await h.drain();const locked=deferred();h.sdkPlans.push(locked);const count=h.requests.length,presence=h.api.sendCompetitionPresence({action:'presence-fixture'},{userId:A}).then(()=>({ok:true}),error=>({error}));await h.drain();h.setSnapshot(ledger(7));h.setAccount(B);await h.drain();locked.resolve(session(A));await h.drain();const cancelled=await presence;assert.ok(cancelled.error,'An account change after the SDK lock rejects the old request');assert.equal(h.requests.slice(count).some(row=>row.action==='presence-fixture'),false,'No stale authenticated body reaches HTTP after SDK session resolution');h.dispose();

// A compact server reply requesting a new full baseline must force recovery
// before the regular fifteen-second upload throttle, and then resume fast mode.
h=fixture();await h.drain();h.queue('progress',{data:{ok:true,progressVersion:1,accepted:false,needsFull:true}});await h.advance(1000);h.setSeconds(101);h.progress();await h.drain();
assert.equal(h.posts('snapshot').length,2,'requestFull forces a real adapter recovery while the ordinary full throttle is still active');assert.equal(h.posts('snapshot')[1].at,1000);assert.equal(h.posts('snapshot')[1].body.totals[reciter],101);
await h.advance(1000);h.setSeconds(102);h.progress();await h.drain();assert.equal(h.posts('progress').at(-1).body.totals[reciter],102);assert.equal(h.peakPosts,1);h.dispose();

// Separate daily sums can land exactly on whole seconds while the same
// lifetime additions land just below that whole value in binary arithmetic.
const fractional={totals:{[reciter]:0},days:{}};
function measure(samples,calendarDay){
 const at=new Date(2026,10,calendarDay,12).getTime();
 for(const seconds of samples){
  fractional.totals[reciter]+=seconds;
  addListeningDay(fractional.days,reciter,seconds,at);
 }
}
measure([0.1,0.1,0.8],15);
const firstDay=structuredClone(fractional);
measure([0.2,0.6,0.2],16);
assert.equal(Math.floor(fractional.totals[reciter]),1);
const serverClock=Date.parse(day+'T12:00:00Z');
h=fixture({firstSnapshot:fractional});await h.drain();
const fullPacket=h.posts('snapshot')[0].body;
assert.equal(competitionSnapshot(fullPacket,serverClock).totals[reciter],2,'Full sync passes the real server validator despite accumulated floating-point noise');
assert.equal(Math.floor(fractional.totals[reciter]),1,'Transport leaves the original measured ledger intact');h.dispose();
h=fixture({firstSnapshot:firstDay});await h.drain();h.setSnapshot(fractional);h.progress();await h.drain();
const compactPacket=h.posts('progress')[0].body;
assert.equal(competitionProgress(compactPacket,serverClock).totals[reciter],2,'The compact producer agrees with full sync after a day rollover');h.dispose();
h=fixture({firstSnapshot:{...fractional,totals:{[reciter]:1.98}}});await h.drain();
assert.equal(h.posts('snapshot').length,0,'A real missing duration cannot be treated as floating-point noise');h.dispose();

console.log('PASS: actual registered adapter plus real fast producer, full capability ACK, eligible 1Hz/hidden/final progress without per-tick own GET, serialized cancellation drain, delayed-JSON hold rejection, bound queued/SDK account identity and forced full recovery.');
