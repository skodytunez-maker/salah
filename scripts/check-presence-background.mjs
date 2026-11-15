import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import{randomUUID}from 'node:crypto';
import{Window}from '../tests/staff/node_modules/happy-dom/lib/index.js';
import{createPlaybackPresenceReporter}from '../dist/js/listener-presence-core.js';
import{createActivityReporter,activityView,guestActivityId}from '../dist/js/activity-presence-core.js';
import{createListeningCreditPolicy}from '../dist/js/listening-credit-core.js';
import{guestSelectedContext}from '../dist/js/guest-context.js';

const flush=async()=>{for(let i=0;i<5;i++)await new Promise(resolve=>setImmediate(resolve));};
const sources=await Promise.all(['listener-presence.js','activity-presence.js'].map(name=>fs.readFile(new URL('../dist/js/'+name,import.meta.url),'utf8')));
for(const person of ['account','guest'])for(const hold of ['manual','night']){
 let clock=Date.parse(hold==='night'?'2026-11-15T01:00:00Z':'2026-11-15T12:00:00Z');
 const id=randomUUID(),source=person+':'+id,credit=createListeningCreditPolicy({now:()=>clock,timeZone:()=> 'UTC',source:()=>source,readState:()=>({version:1,observedAt:clock-2*3600000,lastAction:clock-2*3600000,holds:{}})});
 if(hold==='manual'){credit.receive(source,{creditPaused:true,creditPauseToken:randomUUID()});clock+=1000;}
 assert.equal(credit.paused(),true);assert.deepEqual(credit.segments(1,clock),[]);
 const w=new Window({url:'https://fixture.invalid/#quran?surah=2'}),doc=w.document;
 Object.defineProperty(doc,'hidden',{value:false,writable:true,configurable:true});
 doc.body.innerHTML='<main id="app"><div class="quran-reader"><article class="quran-verse"></article></div></main>';
 w.localStorage.setItem('salah:guest-device-v1',id);
 const callbacks=[],timers=[],sent=[],state={status:'paused',reciter:'ar.alafasy',surah:{number:2},trackPositionSeconds:0};
 const playback={state,subscribe:fn=>callbacks.push(fn)},account={identityKnown:true,signedIn:person==='account',userId:person==='account'?id:null};
 const core=options=>createPlaybackPresenceReporter({...options,now:()=>clock,schedule:()=>1,cancel(){}});
 const context=vm.createContext({createPlaybackPresenceReporter:core,createActivityReporter,activityView,guestActivityId,guestSelectedContext,
  personalDataAllowed:()=>true,competitionOwn:()=>({enabled:true,mode:'profile',creditPaused:true}),popularityEnabled:()=>true,credit,
  counterSyncStatus:()=>account,settings:{city:{name:'Тюмень',country:'Россия'}},OWNER_PROJECT_URL:'https://fixture.invalid',OWNER_PUBLIC_KEY:'fixture',
  accountAuthClient:()=>({auth:{onAuthStateChange(){},getSession:async()=>({data:{session:null}})}}),
  sendCompetitionPresence:async(packet,options)=>{sent.push({packet,options});},fetch:async(_url,options)=>{sent.push({packet:JSON.parse(options.body),options});return{ok:true};},
  window:w,document:doc,location:w.location,localStorage:w.localStorage,navigator:{onLine:true},crypto:{randomUUID},Event:w.Event,MutationObserver:class{observe(){}},
  setInterval:fn=>{timers.push(fn);return timers.length;},setTimeout:fn=>{queueMicrotask(fn);return 1;}});
 const index=person==='account'?0:1,init=vm.runInContext(sources[index].replace(/^import.*$/gm,'').replaceAll('export ','')+';'+(person==='account'?'initListenerPresence':'initActivityPresence')+';',context);
 init({playback,getAccount:()=>account,isEnabled:()=>true});await flush();
 const audio=()=>sent.filter(row=>row.packet.kind==='listening'||row.packet.action==='presence'),active=row=>person==='guest'?row.packet.active:row.packet.playing;
 const emit=async()=>{for(const callback of callbacks)callback(state);await flush();};
 assert.equal(audio().length,0,'A paused player creates no audio presence');
 state.status='playing';await emit();clock+=1000;state.trackPositionSeconds++;await emit();
 assert.equal(active(audio().at(-1)),true,person+' audio is reported despite '+hold+' Top pause');
 doc.hidden=true;doc.dispatchEvent(new w.Event('visibilitychange'));await flush();
 const before=audio().length;w.dispatchEvent(new w.Event('pagehide'));await flush();
 assert.ok(audio().length>before);assert.equal(active(audio().at(-1)),true,person+' pagehide preserves recently advancing audio');
 assert.equal(audio().at(-1).options.keepalive,true);
 const hiddenStart=audio().length;clock+=15001;state.trackPositionSeconds+=15;await emit();
 assert.ok(audio().length>hiddenStart);assert.equal(active(audio().at(-1)),true,'Real media progress can renew a background heartbeat');assert.equal(audio().at(-1).options.keepalive,true);
 assert.equal(credit.paused(),true,'A presence signal does not resume Top credit');assert.deepEqual(credit.segments(1,clock),[]);
 clock+=21000;for(const timer of timers)timer();await flush();
 assert.equal(active(audio().at(-1)),false,'A playing label without recent advancement does not create an indefinite lease');
 clock+=1000;state.trackPositionSeconds++;await emit();assert.equal(active(audio().at(-1)),true);
 state.status='paused';await emit();assert.equal(active(audio().at(-1)),false,'An actual background pause still sends false');
 w.dispatchEvent(new w.Event('pagehide'));await flush();assert.equal(active(audio().at(-1)),false,'Pagehide cannot restart paused audio');
 state.status='playing';await emit();clock+=1000;state.trackPositionSeconds++;await emit();assert.equal(active(audio().at(-1)),true);
 state.status='idle';state.reciter=null;await emit();assert.equal(active(audio().at(-1)),false,'An actual stop clears presence too');
 if(person==='guest')assert.ok(sent.filter(row=>row.packet.kind==='reading').every((row,index)=>index===0?row.packet.active===true:row.packet.active===false),'Mounted text stays inactive during listening and while hidden');
 await w.happyDOM.close();
}

let clock=1000;const state={status:'playing',reciter:'ar.alafasy',trackPositionSeconds:0},pending=[];
const reporter=createPlaybackPresenceReporter({getState:()=>state,getUserId:()=> 'fixture',isEligible:()=>true,now:()=>clock,schedule:()=>1,cancel(){},send:async(packet,options)=>{pending.push({packet,options});if(!options.keepalive)await new Promise(()=>{});}});
reporter.sample();clock+=1000;state.trackPositionSeconds++;reporter.sample();await flush();const ordinary=pending.at(-1);
reporter.sample({force:true,keepalive:true});await flush();assert.equal(ordinary.options.signal.aborted,true);assert.equal(pending.at(-1).options.keepalive,true);assert.equal(pending.at(-1).packet.playing,true);assert.ok(pending.at(-1).packet.sequence>ordinary.packet.sequence,'A pagehide keepalive supersedes a pending normal heartbeat without changing playing state');
reporter.dispose();
console.log('PASS: real account/guest bridges retain advancing playback on pagehide during manual and night Top holds, background media heartbeats remain independent of credit, real pause/stop/stall clears status, reading stays hidden, and pending requests upgrade to ordered keepalive. No backend writes.');
