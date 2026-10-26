import assert from 'node:assert/strict';
import{createLiveListeningTotal,createSharedListeningMotion}from '../dist/js/listening-summary.js';
for(const listeners of [2,5,200]){
 const raw=createLiveListeningTotal(),motion=createSharedListeningMotion(),scope={key:'user:all:today',eligible:true};
 const read=(server,local)=>motion.sample(raw.sample(server,{reciter:local},scope),{key:scope.key,server});
 assert.equal(read(1000,0),1000);
 for(let second=1;second<=15;second++)assert.equal(read(1000,second),1000+second);
 const server=1000+listeners*15;assert.equal(read(server,15),server,'A server snapshot replaces the value once; it cannot start a fast queue');
 for(let frame=0;frame<240;frame++)assert.equal(motion.tick(),server,'Timer frames cannot invent intermediate seconds');
 assert.equal(read(server,16),server+1,'Measured local time still appears immediately');
 assert.equal(motion.sample(900,{server:900,key:scope.key}),900,'Server corrections are immediate');
 assert.equal(motion.sample(600,{server:600,key:'other:day:tomorrow'}),600,'Scope changes cannot carry time');
 motion.reset();assert.equal(motion.tick(),null);
}
const guest=createSharedListeningMotion();assert.equal(guest.sample(100,{server:100,key:'guest'}),100);assert.equal(guest.sample(100000,{server:100000,key:'guest'}),100000);assert.equal(guest.tick(),100000);
for(const value of [null,NaN,-1,Infinity,1.5])assert.equal(guest.sample(value,{server:100,key:'guest'}),null);
console.log('PASS: real confirmed snapshots, measured local time, no accelerated replay or timer-created seconds, corrections, scope reset and invalid input.');
