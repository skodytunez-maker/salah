import assert from 'node:assert/strict';
import{createLiveListeningTotal,createSharedListeningMotion}from '../dist/js/listening-summary.js';
for(const listeners of [2,5]){
 let clock=0;const raw=createLiveListeningTotal(),motion=createSharedListeningMotion({now:()=>clock}),scope={key:'user:all:today',eligible:true};
 const read=(server,local)=>motion.sample(raw.sample(server,{reciter:local},scope),{key:scope.key,server});
 assert.equal(read(1000,0),1000);
 clock=15000;assert.equal(read(1000,15),1015,'Local measured progress is immediate');
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
