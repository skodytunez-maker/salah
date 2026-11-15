import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import{randomUUID}from 'node:crypto';
import{Window}from '../tests/staff/node_modules/happy-dom/lib/index.js';
import{createAppStateReporter,appSection}from '../dist/js/app-state-core.js';
import{guestActivityId}from '../dist/js/activity-presence-core.js';
import{appStatePacket}from '../supabase/functions/listening-now/app-state.mjs';

const flush=async()=>{for(let i=0;i<8;i++)await new Promise(resolve=>setImmediate(resolve));};
function timers(now){let id=0;const rows=new Map();return{schedule(fn,delay){rows.set(++id,{fn,at:now()+delay});return id;},cancel(key){rows.delete(key);},run(){for(let i=0;i<50;i++){const ready=[...rows].find(([,row])=>row.at<=now());if(!ready)return;rows.delete(ready[0]);ready[1].fn();}throw Error('timer loop');},size:()=>rows.size};}
assert.equal(appSection({hash:'#quran?view=reciters&search=PRIVATE-QUERY'}),'reciters');assert.equal(appSection({hash:'#quran?surah=2'}),'quran');assert.equal(appSection({hash:'#unknown?message=PRIVATE'}),'other');
assert.equal(appSection({hash:'#learning'}),'lesson');assert.equal(appSection({hash:''}),'home');
let clock=100000,person={scope:'guest:'+randomUUID(),guest:true,device:randomUUID()},view={visible:true,section:'home'},state={status:'paused',reciter:'ar.alafasy',surah:{number:2},trackPositionSeconds:0},credit=true;
const sent=[],scheduler=timers(()=>clock),reporter=createAppStateReporter({getIdentity:()=>person,getView:()=>view,getPlayback:()=>state,getCreditPaused:()=>credit,appVersion:500,send:async(packet,options)=>sent.push({packet,options}),now:()=>clock,randomId:randomUUID,schedule:scheduler.schedule,cancel:scheduler.cancel});
const step=async(ms=1000)=>{clock+=ms;scheduler.run();reporter.sample();await flush();};
reporter.sample();await flush();assert.equal(sent[0].packet.playerState,'paused');assert.equal(sent[0].packet.actionSequence,0);assert.equal(sent[0].packet.actionAgeMs,null);assert.equal(sent[0].packet.creditPaused,true);
for(const event of [{type:'pointerdown',isTrusted:false},{type:'wheel',isTrusted:false},{type:'scroll',isTrusted:true},{type:'keydown',isTrusted:true,repeat:true},{type:'pointerdown',isTrusted:true,button:2},{type:'pointerdown',isTrusted:true,isPrimary:false}])assert.equal(reporter.action(event),false);
for(let i=0;i<100;i++)assert.equal(reporter.action({type:'keydown',isTrusted:true,key:'PRIVATE-KEY',target:{value:'PRIVATE-INPUT'}}),true);
await flush();assert.equal(sent.length,1,'A burst of trusted actions coalesces instead of making a request per key');
clock+=999;scheduler.run();await flush();assert.equal(sent.length,1);clock++;scheduler.run();await flush();assert.equal(sent.length,2);assert.equal(sent.at(-1).packet.actionSequence,100);assert.equal(sent.at(-1).packet.actionAgeMs,1000);
await step(15000);assert.equal(sent.at(-1).packet.actionSequence,100,'Heartbeat polling is not a user action');assert.equal(sent.at(-1).packet.actionAgeMs,16000);
state.status='playing';await step();assert.equal(sent.at(-1).packet.playerState,'unknown','A play label alone is not proven playback');state.trackPositionSeconds++;await step();assert.equal(sent.at(-1).packet.playerState,'playing');
view.visible=false;reporter.sample({force:true,keepalive:true});await flush();assert.equal(sent.at(-1).packet.visible,false);assert.equal(sent.at(-1).packet.playerState,'playing');assert.equal(sent.at(-1).packet.creditPaused,true);assert.equal(sent.at(-1).options.keepalive,true);
assert.equal(reporter.action({type:'pointerdown',isTrusted:true}),false,'Hidden/synthetic page activity cannot resume an action clock');
state.trackPositionSeconds+=15;await step(15000);assert.equal(sent.at(-1).packet.playerState,'playing');assert.equal(sent.at(-1).packet.actionSequence,100);
await step(21000);assert.equal(sent.at(-1).packet.playerState,'unknown','A missing progress signal is unknown, never fake pause/sleep');
state.status='paused';await step();assert.equal(sent.at(-1).packet.playerState,'paused');state.status='idle';await step();assert.equal(sent.at(-1).packet.playerState,'stopped');
await step(86400001);assert.equal(sent.at(-1).packet.actionAgeMs,86400000,'A positive action sequence retains a bounded numeric age after 24 hours');assert.doesNotThrow(()=>appStatePacket(sent.at(-1).packet),'An old action cannot make every subsequent heartbeat fail server validation');
const oldTab=sent.at(-1).packet.tab;person={scope:'account:'+randomUUID(),id:randomUUID()};view={visible:true,section:'PRIVATE-SECTION'};credit=false;reporter.sample();await flush();
assert.notEqual(sent.at(-1).packet.tab,oldTab);assert.equal(sent.at(-1).packet.action,'app-state');assert.equal(sent.at(-1).packet.section,'other');assert.equal(sent.at(-1).packet.actionSequence,0);assert.equal(sent.at(-1).packet.actionAgeMs,null);assert.equal(sent.at(-1).packet.creditPaused,false);assert.ok(!Object.hasOwn(sent.at(-1).packet,'device'));
for(const{packet}of sent){assert.deepEqual(Object.keys(packet).sort(),['action','actionAgeMs','actionSequence','appVersion','creditPaused',...(packet.action==='guest-state'?['device']:[]),'playerState','section','sequence','tab','visible'].sort());assert.ok(!JSON.stringify(packet).includes('PRIVATE'));assert.ok(packet.sequence>=1&&packet.sequence<=2147483647);assert.doesNotThrow(()=>appStatePacket(packet));}
const count=sent.length;person=null;reporter.sample();await flush();assert.equal(sent.length,count);reporter.dispose();assert.equal(scheduler.size(),0);

let pendingAt=1000;const pending=[],pendingTimers=timers(()=>pendingAt),pendingId=randomUUID(),pendingView={visible:true,section:'home'};
const slow=createAppStateReporter({getIdentity:()=>({scope:'guest:'+pendingId,device:pendingId,guest:true}),getView:()=>pendingView,getPlayback:()=>({status:'paused'}),appVersion:500,now:()=>pendingAt,randomId:randomUUID,schedule:pendingTimers.schedule,cancel:pendingTimers.cancel,send:(packet,options)=>new Promise(resolve=>pending.push({packet,options,resolve}))});
slow.sample();await flush();for(let i=0;i<30;i++)assert.equal(slow.action({type:'wheel',isTrusted:true}),true);await flush();assert.equal(pending.length,1,'A slow connection retains one pending state instead of an action log');
pendingAt+=1000;pendingView.visible=false;assert.equal(slow.action({type:'wheel',isTrusted:true}),false);slow.sample({force:true,keepalive:true});await flush();assert.equal(pending.length,2);assert.equal(pending[0].options.signal.aborted,true);assert.equal(pending[1].packet.actionSequence,30);assert.equal(pending[1].options.keepalive,true);assert.ok(pending[1].packet.sequence>pending[0].packet.sequence);
pending[0].resolve();pending[1].resolve();await flush();slow.dispose();assert.equal(pendingTimers.size(),0);

// Exercise the actual bridge, including authenticated token/session races.
const source=await fs.readFile(new URL('../dist/js/app-state.js',import.meta.url),'utf8');
for(const guest of [true,false]){
 let at=100000,wall=Date.parse('2026-11-15T12:00:00Z'),allowed=true,paused=true,authCallback,blocked=false;const waiting=[],wire=[],actions={},uid=randomUUID(),sid=randomUUID(),device=randomUUID(),scheduled=timers(()=>at);
 const token=(user,session)=>'fixture.'+Buffer.from(JSON.stringify({sub:user,session_id:session})).toString('base64url')+'.fixture';
 let session=guest?null:{user:{id:uid},access_token:token(uid,sid)},account={identityKnown:true,signedIn:!guest,userId:guest?null:uid};
 const auth={onAuthStateChange(fn){authCallback=fn;return{data:{subscription:{unsubscribe(){}}}};},getSession(){return blocked?new Promise(resolve=>waiting.push(resolve)):Promise.resolve({data:{session}});}};
 const w=new Window({url:'https://fixture.invalid/#quran?view=reciters&input=PRIVATE-QUERY'}),doc=w.document;Object.defineProperty(doc,'hidden',{value:false,writable:true,configurable:true});w.localStorage.setItem('salah:guest-device-v1',device);
 const removed=[],add=doc.addEventListener.bind(doc),remove=doc.removeEventListener.bind(doc);doc.addEventListener=(type,fn,...options)=>{actions[type]=fn;add(type,fn,...options);};doc.removeEventListener=(type,fn,...options)=>{removed.push(type);remove(type,fn,...options);};
 const callbacks=[],playback={state:{status:'paused',reciter:'ar.alafasy',trackPositionSeconds:0},subscribe(fn){callbacks.push(fn);return()=>{};}};
 const context=vm.createContext({createAppStateReporter:options=>{assert.equal(options.now(),at,'The bridge supplies a monotonic clock for relative durations');return createAppStateReporter({...options,schedule:scheduled.schedule,cancel:scheduled.cancel});},appSection,guestActivityId,personalDataAllowed:()=>allowed,
  accountAuthClient:()=>({auth}),counterSyncStatus:()=>account,APP_VERSION:500,OWNER_PROJECT_URL:'https://fixture.invalid',OWNER_PUBLIC_KEY:'public',
  window:w,document:doc,location:w.location,localStorage:w.localStorage,navigator:{onLine:true},atob,crypto:{randomUUID},performance:{now:()=>at},Date:class extends Date{static now(){return wall;}},
  setTimeout:fn=>{queueMicrotask(fn);return 1;},setInterval:()=>1,clearInterval(){},fetch:async(url,options)=>{wire.push({url,options,packet:JSON.parse(options.body)});return{ok:true};}});
 const init=vm.runInContext(source.replace(/^import.*$/gm,'').replaceAll('export ','')+';initAppState;',context),dispose=init({playback,getAccount:()=>account,getClient:()=>({auth}),getCreditPaused:()=>paused});
 await flush();assert.equal(wire.length,1);assert.equal(wire[0].packet.section,'reciters');assert.equal(wire[0].packet.creditPaused,true);assert.equal(wire[0].packet.action,guest?'guest-state':'app-state');assert.equal(wire[0].options.headers.Authorization,guest?undefined:'Bearer '+session.access_token);
 if(guest)assert.equal(wire[0].packet.device,device);else assert.ok(!Object.hasOwn(wire[0].packet,'device'));
 assert.equal(actions.keydown({type:'keydown',isTrusted:false}),false);wall-=3600000;at+=1000;actions.pointerdown({type:'pointerdown',isTrusted:true,button:0,target:{value:'PRIVATE-INPUT'}});await flush();assert.equal(wire.at(-1).packet.actionSequence,1,'A backward device-clock change does not delay action reporting');
 assert.equal(actions.wheel({type:'wheel',isTrusted:false}),false);at+=1000;actions.wheel({type:'wheel',isTrusted:true});await flush();assert.equal(wire.at(-1).packet.actionSequence,2,'The bridge observes trusted wheel input');
 playback.state.status='playing';at+=1000;for(const fn of callbacks)fn();await flush();playback.state.trackPositionSeconds++;at+=1000;for(const fn of callbacks)fn();await flush();assert.equal(wire.at(-1).packet.playerState,'playing');
 w.dispatchEvent(new w.Event('pagehide'));await flush();assert.equal(wire.at(-1).packet.visible,false,'Pagehide is hidden even before document.hidden updates');assert.equal(wire.at(-1).packet.playerState,'playing');assert.equal(wire.at(-1).options.keepalive,true);assert.equal(wire.at(-1).packet.creditPaused,true);assert.equal(actions.keydown({type:'keydown',isTrusted:true}),false);doc.hidden=true;
 if(!guest){
  doc.hidden=false;w.dispatchEvent(new w.Event('pageshow'));await flush();at+=1000;blocked=true;actions.keydown({type:'keydown',isTrusted:true});await flush();assert.equal(waiting.length,1);
  const oldTab=wire.at(-1).packet.tab,newUid=randomUUID(),newSid=randomUUID();account={identityKnown:true,signedIn:true,userId:newUid};session={user:{id:newUid},access_token:token(newUid,newSid)};blocked=false;authCallback('SIGNED_IN',session);await flush();waiting.shift()({data:{session}});await flush();
  assert.ok(!wire.some(row=>row.packet.tab===oldTab&&row.options.headers.Authorization==='Bearer '+session.access_token),'An in-flight old session cannot send its packet using a new account token');
  assert.equal(wire.at(-1).packet.actionSequence,0,'A new account receives no previous account action clock');
 }
 for(const row of wire){assert.equal(row.options.credentials,'omit');assert.equal(row.options.referrerPolicy,'no-referrer');assert.equal(row.options.cache,'no-store');assert.ok(!/PRIVATE|"latitude"|"longitude"|"page"|"reciter"|"position"|"city"|"country"|"email"/.test(row.options.body));}
 allowed=false;const before=wire.length;at+=15000;scheduled.run();for(const fn of callbacks)fn();await flush();assert.equal(wire.length,before,'Privacy revocation stops subsequent sends');dispose();assert.ok(removed.includes('wheel'),'Dispose removes the wheel observer');await w.happyDOM.close();
}
console.log('PASS: bounded exact app-state packets, real playback versus unknown/stopped/paused, independent Top flag, 15s heartbeat, trusted visible action sequences with 1s coalescing, no input/query/location data, guest/account privacy and session-race guards. No production writes.');
