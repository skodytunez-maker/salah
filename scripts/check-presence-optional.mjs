import assert from 'node:assert/strict';import{readFile}from 'node:fs/promises';
const source=await readFile(new URL('../dist/js/account-presence.js',import.meta.url),'utf8');const begin=source.indexOf('export async function optionalPresenceSnapshot'),end=source.indexOf('let initialized=',begin);const{optionalPresenceSnapshot}=await import('data:text/javascript,'+encodeURIComponent(source.slice(begin,end)));
let cleared=0,deadline;const timers={setTimer:fn=>{deadline=fn;return 1;},clearTimer:()=>cleared++};
const frozen=optionalPresenceSnapshot(()=>new Promise(()=>{}),timers);await Promise.resolve();deadline();assert.equal(await frozen,null,'Stalled Push API cannot block the account heartbeat');assert.equal(cleared,1);
assert.equal(await optionalPresenceSnapshot(()=>{throw Error('unsupported')},timers),null);assert.equal(await optionalPresenceSnapshot(async()=>{throw Error('denied')},timers),null);
const snapshot={enabled:false,permission:'unsupported',browser:false,device:null};assert.deepEqual(await optionalPresenceSnapshot(async()=>snapshot,timers),snapshot);assert.equal(cleared,4);
assert.match(source,/keepalive:!active/,'Foreground Android reports use ordinary cancellable fetch; only page-close requests need keepalive');
console.log('PASS optional notification deadline, rejection containment, actual snapshot and ordinary foreground transport.');
