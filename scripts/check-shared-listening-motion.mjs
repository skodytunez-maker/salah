import assert from 'node:assert/strict';
import{createLiveListeningTotal,createSharedListeningMotion}from '../dist/js/listening-summary.js';
for(const listeners of [2,5]){
 let clock=0;const raw=createLiveListeningTotal(),motion=createSharedListeningMotion({now:()=>clock}),scope={key:'user:all:today',eligible:true};
 const read=(server,local)=>motion.sample(raw.sample(server,{reciter:local},scope),{key:scope.key,server});
 assert.equal(read(1000,0),1000);
 for(let second=1;second<=15;second++){clock=second*1000;assert.equal(read(1000,second),1000+second,'Regular measured local seconds remain immediate');}
 const server=1000+listeners*15;assert.equal(read(server,15),1015,'New confirmed remote time starts smoothly');
 let previous=1015;
 for(let second=1;second<=15;second++){clock=15000+second*1000;const shown=read(server,15+second);assert.equal(shown-previous,listeners,'Display advances by the sum of actual simultaneous listening');previous=shown;}
 assert.equal(motion.tick(),previous,'Repeated renders do not add time');
 clock=90000;assert.equal(motion.tick(),server+15,'Pause and a stale server snapshot cannot create seconds');
 clock=100000;assert.equal(motion.tick(),server+15,'Animation stops at its real target');
 assert.equal(motion.sample(900,{server:900,key:scope.key}),900,'Privacy removal/server correction applies immediately');
 assert.equal(motion.sample(600,{server:600,key:'other:day:tomorrow'}),600,'Account/period/date changes cannot carry pending seconds');
 motion.reset();assert.equal(motion.tick(),null);
}
let clock=0;const guest=createSharedListeningMotion({now:()=>clock});
assert.equal(guest.sample(100,{server:100,key:'guest'}),100);clock=15000;assert.equal(guest.sample(130,{server:130,key:'guest'}),100);
clock=20000;assert.equal(guest.tick(),110,'Guests see confirmed contributions from two listeners at two seconds/second');
clock=100000;assert.equal(guest.tick(),130);
assert.equal(guest.sample(null,{server:null,key:'guest'}),null);assert.equal(guest.tick(),null);
console.log('PASS: confirmed 2- and 5-listener rates, immediate local progress, guest view, no extrapolation, paused/stale limits, privacy correction, scope reset and disposal.');

for(const listeners of [2,5]){
 let clock=0;const slow=createSharedListeningMotion({now:()=>clock});
 slow.sample(1000,{key:'delayed',server:1000});
 clock=60000;assert.equal(slow.sample(1000+listeners*60,{key:'delayed',server:1000+listeners*60}),1000);
 clock=61000;assert.equal(slow.tick(),1000+listeners,'A 60-second server delay must use its actual interval, not replay at 4x speed');
 clock=120000;assert.equal(slow.tick(),1000+listeners*60);clock=180000;assert.equal(slow.tick(),1000+listeners*60,'No seconds invented after the confirmed backlog ends');
}
let batchClock=0;const batched=createSharedListeningMotion({now:()=>batchClock});batched.sample(100,{key:'batches',server:100});
let previousBatch=100;
for(let second=1;second<=16;second++){
 batchClock=second*1000;
 const value=second%4===0?batched.sample(100+second,{key:'batches',server:100}):batched.tick();
 assert.ok(value-previousBatch<=1,'Four measured seconds received together never become a four-second jump');
 assert.ok(value<=100+Math.floor(second/4)*4,'Clock cannot go above already measured local progress');
 previousBatch=value;
}
batchClock=19000;assert.equal(batched.tick(),116,'After the audio pauses, only the remaining measured seconds finish painting');
batchClock=50000;assert.equal(batched.tick(),116);
let mixedClock=0;const mixed=createSharedListeningMotion({now:()=>mixedClock});mixed.sample(100,{key:'mixed',server:100});
mixedClock=15000;mixed.sample(130,{key:'mixed',server:130});
mixedClock=16000;assert.equal(mixed.tick(),102);
mixedClock=19000;assert.equal(mixed.sample(134,{key:'mixed',server:130}),109,'Local batch starts with one second while confirmed remote progress continues');
mixedClock=20000;assert.equal(mixed.tick(),112,'Independent local and remote confirmed queues can progress together');
mixedClock=100000;assert.equal(mixed.tick(),134,'Separate queues cannot double-count their common target');
mixed.sample(120,{key:'mixed',server:120});assert.equal(mixed.tick(),120,'Server correction drops all pending local and remote animation');
let fineClock=0;const fine=createSharedListeningMotion({now:()=>fineClock});fine.sample(100,{key:'frames',server:100});fineClock=60000;fine.sample(220,{key:'frames',server:220});
for(let frame=1;frame<=240;frame++){fineClock=60000+frame*250;const value=fine.tick();assert.equal(value,100+Math.floor(frame/2));}
console.log('PASS: real 60-second response intervals, no local batch jumps, separate confirmed queues, mixed progress, pause caps, corrections and 250ms timer pacing.');
