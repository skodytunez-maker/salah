import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

let startupRequests=0;
const originalNavigator=Object.getOwnPropertyDescriptor(globalThis,'navigator');
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{geolocation:{getCurrentPosition(){startupRequests++;}}}});
const{getQiblaPosition,createQiblaLocationController}=await import('../dist/js/qibla-access.js');
assert.equal(startupRequests,0,'Importing Qibla access never asks for location');
if(originalNavigator)Object.defineProperty(globalThis,'navigator',originalNavigator);else delete globalThis.navigator;

const position={coords:{latitude:24.47,longitude:39.61,accuracy:8},timestamp:1800000000000};
function fixture(){
 const calls=[],timers=new Map();let serial=0;
 const geolocation={getCurrentPosition(ok,fail,options){assert.equal(this,geolocation,'The platform geolocation receiver is preserved');calls.push({ok,fail,options});}};
 const setTimer=(fn,delay)=>{const id=++serial;timers.set(id,{fn,delay});return id;},clearTimer=id=>timers.delete(id);
 return{calls,timers,geolocation,setTimer,clearTimer,allowed:()=>true};
}
function assertFresh(call,timeout){assert.deepEqual(call.options,{enableHighAccuracy:true,timeout,maximumAge:0});}

let f=fixture(),pending=getQiblaPosition(f);
assert.equal(f.calls.length,1);assertFresh(f.calls[0],10000);
f.calls[0].ok(position);assert.equal(await pending,position);assert.equal(f.timers.size,0);

// Both attempts remain fresh and precise; the bounded helper's retry cannot reuse a cache.
f=fixture();pending=getQiblaPosition(f);f.calls[0].fail({code:2});
assert.equal(f.calls.length,2);assertFresh(f.calls[0],10000);assertFresh(f.calls[1],15000);
f.calls[0].ok({...position,coords:{...position.coords,latitude:1}});
f.calls[1].ok(position);assert.equal(await pending,position,'A late first-attempt fix cannot replace the retry');assert.equal(f.timers.size,0);

f=fixture();pending=getQiblaPosition(f);const denied=assert.rejects(pending,error=>error.code===1&&!error.restricted);
f.calls[0].fail({code:1});await denied;assert.equal(f.calls.length,1,'Permission denial never retries');assert.equal(f.timers.size,0);

f=fixture();await assert.rejects(getQiblaPosition({...f,geolocation:null}),error=>error.code===2);assert.equal(f.calls.length,0);assert.equal(f.timers.size,0);
for(const allowed of [()=>false,()=>undefined,()=>{throw Error('policy unavailable');}]){
 f=fixture();await assert.rejects(getQiblaPosition({...f,allowed}),error=>error.code===1&&error.restricted===true);
 assert.equal(f.calls.length,0,'Restricted mode rejects before any GPS request');assert.equal(f.timers.size,0);
}
const originalCapacitor=Object.getOwnPropertyDescriptor(globalThis,'Capacitor');
try{
 Object.defineProperty(globalThis,'Capacitor',{configurable:true,value:{isNativePlatform:()=>true,getPlatform:()=> 'android'}});
 f=fixture();const{allowed,...restrictedOptions}=f;
 await assert.rejects(getQiblaPosition(restrictedOptions),error=>error.code===1&&error.restricted===true);
 assert.equal(f.calls.length,0,'The default audience policy protects an unapproved Families-mode native session');
 let defaultRequests=0;const protectedController=createQiblaLocationController({getPosition:()=>{defaultRequests++;return position;},geolocation:f.geolocation});
 await assert.rejects(protectedController.start(),error=>error.code===1&&error.restricted===true);assert.equal(defaultRequests,0);protectedController.destroy();
}finally{if(originalCapacitor)Object.defineProperty(globalThis,'Capacitor',originalCapacitor);else delete globalThis.Capacitor;}

f=fixture();const aborted=new AbortController();aborted.abort();
await assert.rejects(getQiblaPosition({...f,signal:aborted.signal}),{name:'AbortError'});assert.equal(f.calls.length,0);
f=fixture();const controller=new AbortController();pending=getQiblaPosition({...f,signal:controller.signal});
const cancelled=assert.rejects(pending,{name:'AbortError'});controller.abort();await cancelled;assert.equal(f.timers.size,0);
f.calls[0].ok(position);f.calls[0].fail({code:2});await Promise.resolve();assert.equal(f.calls.length,1,'Late callbacks after abort cannot retry or resolve the cancelled request');

f=fixture();pending=getQiblaPosition(f);const timeout=assert.rejects(pending,error=>error.code===3);
assert.equal([...f.timers.values()][0].delay,10250);[...f.timers.values()][0].fn();
assert.equal(f.calls.length,2);assertFresh(f.calls[1],15000);assert.equal([...f.timers.values()][0].delay,15250);
[...f.timers.values()][0].fn();await timeout;assert.equal(f.timers.size,0,'Missing platform callbacks still have a bounded deadline');

const fix=(timestamp,latitude=24.47,accuracy=8)=>({coords:{latitude,longitude:39.61,accuracy},timestamp});
function controllerFixture(extra={}){
 const requests=[],watches=[],cleared=[],states=[];
 const geolocation={watchPosition(ok,fail,options){const id=watches.length;watches.push({ok,fail,options});return id;},clearWatch:id=>cleared.push(id)};
 const getPosition=options=>new Promise((resolve,reject)=>requests.push({options,resolve,reject}));
 const controller=createQiblaLocationController({geolocation,getPosition,allowed:()=>true,now:()=>2000,onState:state=>states.push(state),...extra});
 return{controller,requests,watches,cleared,states};
}
let c=controllerFixture();assert.equal(c.requests.length,0);assert.equal(c.watches.length,0,'Constructing a controller never starts location');
pending=c.controller.start();assert.deepEqual(c.states.at(-1),{phase:'locating',position:null,error:null});
assert.equal(c.watches.length,0,'Continuous location starts only after a granted initial fix');
const first=fix(1000);c.requests[0].resolve(first);assert.equal(await pending,first);assert.equal(c.controller.position,first);
assert.deepEqual(c.watches[0].options,{enableHighAccuracy:true,maximumAge:0,timeout:15000});
let stateCount=c.states.length;c.watches[0].ok(fix(999));c.watches[0].ok(fix(1100,91));c.watches[0].ok(fix(1100,24.47,-1));
assert.equal(c.states.length,stateCount,'Old timestamps, invalid coordinates and invalid accuracy never replace the last fix');
const improved=fix(1100,24.48,3);c.watches[0].ok(improved);assert.equal(c.controller.position,improved);assert.equal(c.states.at(-1).error,null);
for(const code of [3,2]){const error={code};c.watches[0].fail(error);assert.deepEqual(c.states.at(-1),{phase:'position',position:improved,error});}
c.watches[0].ok(fix(1200));assert.equal(c.states.at(-1).error,null,'A good watch fix clears a transient accuracy/unavailable warning');
const deniedWatch={code:1};c.watches[0].fail(deniedWatch);assert.deepEqual(c.states.at(-1),{phase:'fallback',position:null,error:deniedWatch});assert.deepEqual(c.cleared,[0],'Watch ID zero is cleared on denial');
stateCount=c.states.length;c.watches[0].ok(fix(1300));assert.equal(c.states.length,stateCount,'Queued watch callbacks cannot revive denied location');
assert.equal(c.controller.retry,c.controller.start);pending=c.controller.retry();c.requests[1].resolve(fix(1000));await pending;
assert.equal(c.controller.position.timestamp,1000,'A retry starts a new timestamp generation');c.controller.stop();assert.deepEqual(c.cleared,[0,1]);
stateCount=c.states.length;c.watches[1].ok(fix(1400));c.watches[1].fail({code:1});assert.equal(c.states.length,stateCount);c.controller.destroy();c.controller.destroy();

c=controllerFixture();const initialPending=c.controller.start(),superseded=assert.rejects(initialPending,{name:'AbortError'});
pending=c.controller.start();await superseded;assert.equal(c.requests[0].options.signal.aborted,true);
c.requests[0].resolve(fix(9000));await Promise.resolve();assert.equal(c.watches.length,0,'An old entry fix cannot attach a watcher for the new entry');
c.requests[1].resolve(fix(1000));await pending;assert.equal(c.controller.position.timestamp,1000);assert.equal(c.watches.length,1);
pending=c.controller.retry();assert.deepEqual(c.cleared,[0]);assert.equal(c.states.at(-1).position.timestamp,1000,'Retry locating may show the labelled last fix');
const destroyed=assert.rejects(pending,{name:'AbortError'});c.controller.destroy();await destroyed;assert.equal(c.requests[2].options.signal.aborted,true);
stateCount=c.states.length;c.requests[2].resolve(fix(10000));c.watches[0].ok(fix(11000));await Promise.resolve();assert.equal(c.states.length,stateCount);
await assert.rejects(c.controller.start(),{name:'AbortError'});assert.equal(c.requests.length,3,'A disposed controller never requests location again');

for(const error of [{code:1},{code:2},{code:3},{code:1,restricted:true}]){
 c=controllerFixture();pending=c.controller.start();const rejected=assert.rejects(pending,value=>value===error);c.requests[0].reject(error);await rejected;
 assert.deepEqual(c.states.at(-1),{phase:'fallback',position:null,error});assert.equal(c.controller.position,null);assert.equal(c.watches.length,0);c.controller.destroy();
}
c=controllerFixture({allowed:()=>false});await assert.rejects(c.controller.start(),error=>error.code===1&&error.restricted===true);assert.equal(c.requests.length,0);assert.equal(c.watches.length,0);c.controller.destroy();
let allowedNow=true;c=controllerFixture({allowed:()=>allowedNow});pending=c.controller.start();allowedNow=false;
const newlyRestricted=assert.rejects(pending,error=>error.code===1&&error.restricted===true);c.requests[0].resolve(fix(1000));await newlyRestricted;assert.equal(c.watches.length,0,'A policy change during the initial request prevents watching');c.controller.destroy();
allowedNow=true;c=controllerFixture({allowed:()=>allowedNow});pending=c.controller.start();c.requests[0].resolve(fix(1000));await pending;allowedNow=false;c.watches[0].ok(fix(1100));assert.deepEqual(c.cleared,[0]);assert.equal(c.controller.position,null);assert.equal(c.states.at(-1).error.restricted,true);c.controller.destroy();
c=controllerFixture();pending=c.controller.start();const invalid=assert.rejects(pending,error=>error.code===2);c.requests[0].resolve(fix(1000,91));await invalid;assert.equal(c.watches.length,0);c.controller.destroy();

const synchronousClears=[],synchronousStates=[];
const synchronous=createQiblaLocationController({allowed:()=>true,getPosition:async()=>fix(1000),onState:state=>synchronousStates.push(state),geolocation:{watchPosition(ok,fail){fail({code:1});return 0;},clearWatch:id=>synchronousClears.push(id)}});
await assert.rejects(synchronous.start(),error=>error.code===1,'A synchronous watch denial must not return a discarded fix for a retry caller to reapply');assert.deepEqual(synchronousClears,[0],'Even synchronous denial before watchPosition returns clears ID zero');assert.equal(synchronousStates.at(-1).phase,'fallback');assert.equal(synchronous.position,null);assert.equal(synchronousStates.filter(state=>state.phase==='fallback').length,1);synchronous.destroy();

const source=await fs.readFile(new URL('../dist/js/qibla-access.js',import.meta.url),'utf8');
assert.match(source,/allowed=personalDataAllowed/,'Families and restricted mode remain the default policy');
assert.doesNotMatch(source,/\b(?:fetch|sendBeacon|localStorage|sessionStorage)\b|\b(?:setItem|removeItem)\s*\(/,'Location access never uploads coordinates or writes settings/storage');
console.log('PASS: fresh/high-accuracy Qibla fixes and continuous measured updates, restricted/denied/unavailable guards, stale timestamps, transient watch errors, ID-zero cleanup, retry/reentry/abort/disposal safety and no import-time request or coordinate upload/storage.');
