import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {makeQuranPlaylist} from '../dist/js/quran-playlist.js';
import {RECITERS,reciterInfo,reciterHasSurah} from '../dist/js/quran-reciters.js';
import {createQuranSession} from '../dist/js/quran-session.js';
const catalog=JSON.parse(await fs.readFile(new URL('../dist/data/quran-index.json',import.meta.url),'utf8'));
let seed=1729;const random=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);
const queue=makeQuranPlaylist(catalog,{random,currentSurah:1});
assert.equal(queue.length,114);assert.equal(new Set(queue.map(t=>t.surah)).size,114,'Each chapter appears once in a generated playlist');assert.notEqual(queue[0].surah,1,'Shuffle changes the current chapter when alternatives exist');
for(const [i,track]of queue.entries()){assert.ok(reciterHasSurah(track.reciter,track.surah));assert.ok(Object.isFrozen(track));if(i&&RECITERS.some(r=>!r.variantOf&&r.name!==reciterInfo(queue[i-1].reciter).name&&reciterHasSurah(r.id,track.surah)))assert.notEqual(reciterInfo(track.reciter).name,reciterInfo(queue[i-1].reciter).name,'Use a different reader when a matching recording exists');}
const restricted=reciterInfo('ar.abdelazizsheim');const limited=makeQuranPlaylist(catalog,{reciters:[restricted],random:()=>0});assert.deepEqual(limited.map(t=>t.surah).sort((a,b)=>a-b),restricted.availableSurahs.slice().sort((a,b)=>a-b));assert.ok(limited.every(t=>t.reciter===restricted.id));
assert.deepEqual(makeQuranPlaylist(catalog,{reciters:[]}),[]);assert.deepEqual(makeQuranPlaylist({surahs:[{number:0},{number:115},{number:1},{number:1}]},{reciters:[restricted],random:()=>1}).map(t=>t.surah),[1]);
assert.ok(makeQuranPlaylist(catalog,{random:()=>NaN}).length);assert.ok(makeQuranPlaylist(catalog,{random:()=>Infinity}).length);
console.log('PASS: 114 unique chapters, available reader recordings, reader variety, current-chapter avoidance and bounded random selection.');

globalThis.window={};
const surah=number=>({number,verses:[{ayah:1,number:1},{ayah:2,number:2}]});
const tracks=[];const media={update(){},clear(){}};
const createPlayer=options=>{const track={options,destroyed:false,state:{positionSeconds:0},play(){options.onState({status:'playing',index:0,ayah:null,timingStatus:'unavailable'});},pause(){options.onState({status:'paused',index:0,ayah:null,timingStatus:'unavailable'});},toggle(){this.play();},destroy(){this.destroyed=true;}};tracks.push(track);return track;};
const flush=async()=>{for(let i=0;i<8;i++)await new Promise(r=>setImmediate(r));};
const session=createQuranSession({load:async n=>surah(n),loadCatalog:async()=>catalog,createPlayer,media,random:()=>0});
assert.equal(tracks.length,0,'No autoplay before the user builds a playlist');
assert.equal(await session.startPlaylist(),true);assert.equal(session.state.status,'playing');assert.equal(session.state.playlist.index,0);assert.equal(session.state.playlist.tracks.length,114);assert.equal(session.state.canPrevious,false);
const first=session.state.playlist.tracks[0],second=session.state.playlist.tracks[1];
tracks.at(-1).options.onState({status:'ended',index:0,ayah:null,timingStatus:'unavailable'});await flush();assert.equal(session.state.surah.number,second.surah);assert.equal(session.state.playlist.index,1,'End of the complete chapter advances the generated queue');
await session.changeSurah(-1);assert.equal(session.state.surah.number,first.surah);assert.equal(session.state.playlist.index,0,'Previous uses playlist order rather than Quran chapter order');
session.pause();assert.equal(session.state.status,'paused');assert.equal(session.state.playlist.tracks.length,114);session.toggle();assert.equal(session.state.status,'playing');
await session.playPlaylistEntry(113);assert.equal(session.state.canNext,false);tracks.at(-1).options.onState({status:'ended',index:0,ayah:null,timingStatus:'unavailable'});await flush();assert.equal(session.state.status,'ended');assert.equal(session.state.playlist.index,113,'The playlist ends without wrapping');
await session.start(surah(1),'ar.alafasy');assert.equal(session.state.playlist,null,'A deliberate normal selection leaves the generated queue');
session.stop();assert.equal(session.state.playlist,null);

let resolveCatalog;const pending=createQuranSession({load:async n=>surah(n),loadCatalog:()=>new Promise(resolve=>resolveCatalog=resolve),createPlayer,media});
const building=pending.startPlaylist();pending.pause();resolveCatalog(catalog);assert.equal(await building,false);assert.equal(pending.state.status,'paused');assert.equal(pending.state.playlist,null,'An interruption cancels a not-yet-started playlist');
const stopped=pending.startPlaylist();pending.stop();resolveCatalog(catalog);assert.equal(await stopped,false);assert.equal(pending.state.status,'stopped','Closing during generation never starts audio later');

const loads=new Map();let immediate=true;
const racing=createQuranSession({load:n=>immediate?Promise.resolve(surah(n)):new Promise(resolve=>loads.set(n,resolve)),loadCatalog:async()=>catalog,createPlayer,media,random:()=>0});
await racing.startPlaylist();immediate=false;const a=racing.playPlaylistEntry(1),b=racing.playPlaylistEntry(2);const target=racing.state.playlist.tracks[2].surah,old=racing.state.playlist.tracks[1].surah;loads.get(target)(surah(target));await b;loads.get(old)(surah(old));await a;assert.equal(racing.state.surah.number,target,'A late queue load cannot replace the latest selection');racing.stop();
console.log('PASS: user-triggered playlist, full-chapter continuation, queue previous/next, pause/resume, finite ending, manual exit and cancellation/race guards.');

const delayedLoads=new Map();let deferQueue=false;const pausedQueue=createQuranSession({load:n=>deferQueue?new Promise(resolve=>delayedLoads.set(n,resolve)):Promise.resolve(surah(n)),loadCatalog:async()=>catalog,createPlayer,media,random:()=>0});
await pausedQueue.startPlaylist();const queueIdentity=pausedQueue.state.playlist.id;deferQueue=true;const loadingQueue=pausedQueue.playPlaylistEntry(1),pausedTarget=pausedQueue.state.surah.number;pausedQueue.pause();delayedLoads.get(pausedTarget)(surah(pausedTarget));await loadingQueue;assert.equal(pausedQueue.state.status,'paused');deferQueue=false;pausedQueue.toggle();await flush();assert.equal(pausedQueue.state.status,'playing');assert.equal(pausedQueue.state.playlist.id,queueIdentity,'Resume during a queue load preserves the generated playlist');assert.equal(pausedQueue.state.playlist.index,1);pausedQueue.stop();
console.log('PASS: pausing and resuming an in-flight queue item retains the playlist.');
