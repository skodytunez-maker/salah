import assert from 'node:assert/strict';
import{NATURE_SOUNDS,createQuranNatureAudio}from '../dist/js/quran-nature-audio.js';
import{loadNatureRecording}from '../dist/js/quran-nature-recordings.js';
import{foregroundAudioBusy}from '../dist/js/audio-focus.js';
assert.equal(NATURE_SOUNDS.length,5);assert.equal(new Set(NATURE_SOUNDS.map(x=>x.id)).size,5);
for(const item of NATURE_SOUNDS){assert.ok(item.audio.endsWith('/'+item.id+'.mp3'));assert.ok(item.wallpaper.endsWith('/'+item.id+'.jpg'));assert.equal(item.loopStart,2);assert.equal(item.loopEnd,34);}
const contexts=[],timers=new Map();let timerId=0;
class Param{value=0;cancelScheduledValues(){}setValueAtTime(value){this.value=value;}linearRampToValueAtTime(value){this.value=value;}}
class Context{
 state='suspended';currentTime=0;destination={};resumeCalls=0;suspendCalls=0;closed=false;sources=[];gains=[];
 constructor(){contexts.push(this);}
 createGain(){const gain={gain:new Param(),connect(){},disconnect(){}};this.gains.push(gain);return gain;}
 createBufferSource(){const node={connect(){},disconnect(){},stopped:false,stop(at){this.stopped=true;this.stopAt=at;},start(...args){this.started=args;}};this.sources.push(node);return node;}
 async resume(){this.resumeCalls++;this.state='running';this.onstatechange?.();}
 async suspend(){this.suspendCalls++;this.state='suspended';this.onstatechange?.();}
 async close(){this.closed=true;this.state='closed';}
}
const buffer=kind=>({kind,duration:34,numberOfChannels:2});
const setup=load=>createQuranNatureAudio({AudioContext:Context,load,schedule:fn=>{timers.set(++timerId,fn);return timerId;},cancel:key=>timers.delete(key)});
const loaded=[],busy=foregroundAudioBusy(),audio=setup(async kind=>{loaded.push(kind);return buffer(kind);});
assert.equal(audio.state.kind,null);assert.equal(contexts.length,0);await audio.select('rain');assert.equal(contexts.length,0,'Selecting a paused theme cannot acquire audio ownership');assert.equal(loaded.length,0,'Paused selection does not fetch/decode audio');
await audio.sync(true);const c=contexts[0],mix=c.gains[0];assert.equal(audio.state.playing,true);assert.equal(c.sources[0].loopStart,2);assert.equal(c.sources[0].loopEnd,34);assert.deepEqual(c.sources[0].started,[0,2]);assert.equal(c.sources[0].buffer.numberOfChannels,2,'Stereo recordings are not flattened to mono');assert.equal(audio.state.volume,25,'The visible default stays at 25%');assert.ok(Math.abs(mix.gain.value-.225)<1e-12,'The actual default mix reserves headroom');
await audio.sync(false);const stale=[...timers.values()].at(-1);await audio.sync(true);stale();assert.equal(c.suspendCalls,0,'A stale pause cannot suspend resumed Quran ambience');assert.equal(loaded.length,1);assert.equal(c.sources.length,1,'Pause/resume retains the existing background phase');assert.ok(Math.abs(mix.gain.value-.225)<1e-12,'Pause/resume retains the lowered mix target');
assert.equal(foregroundAudioBusy(),busy,'Ambient graph never acquires Quran accounting/focus ownership');
await audio.sync(false);for(const fn of [...timers.values()])fn();timers.clear();await Promise.resolve();assert.equal(c.state,'suspended');await audio.sync(true);assert.equal(c.state,'running');
const resumeCalls=c.resumeCalls;c.state='interrupted';await audio.sync(true);await audio.sync(true);assert.equal(c.resumeCalls,resumeCalls,'No repeated automatic resume after a system interruption');assert.equal(audio.state.systemPaused,true);await audio.unlock();assert.equal(audio.state.playing,true);
const previous=c.sources.at(-1);await audio.select('ocean');assert.equal(previous.stopped,true);assert.equal(c.sources.at(-1).buffer.kind,'ocean');
await audio.setVolume(25);const low=mix.gain.value;await audio.setVolume(75);assert.ok(mix.gain.value>low*2);await audio.setVolume(100);assert.equal(mix.gain.value,.9,'The actual maximum nature gain is 90%');assert.equal(audio.state.volume,100,'The visible and saved mix scale still reaches 100%');await audio.setVolume(101);assert.equal(audio.state.volume,100);assert.equal(mix.gain.value,.9,'An invalid level cannot bypass the ceiling');await audio.setVolume(0);assert.equal(mix.gain.value,0,'Zero stays fully silent');assert.equal(audio.state.volume,0);assert.equal(audio.state.playing,false);await audio.setVolume(50);assert.equal(mix.gain.value,.45,'The actual midpoint remains linear');assert.equal(audio.state.volume,50);assert.equal(audio.state.playing,true);
await audio.select('rain');assert.equal(loaded.filter(x=>x==='rain').length,1,'Recently decoded recording is reused');
await audio.select('wind');await audio.select('ocean');assert.equal(loaded.filter(x=>x==='ocean').length,2,'Decoded cache is bounded to two recordings');
assert.equal(await audio.select('unknown'),false);await audio.select(null);assert.equal(audio.state.playing,false);audio.destroy();assert.equal(c.closed,true);assert.equal(timers.size,0);
const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
const pending=new Map(),signals=new Map(),race=setup((kind,context,{signal})=>{signals.set(kind,signal);return new Promise(resolve=>pending.set(kind,resolve));});
await race.select('rain');const first=race.sync(true);await flush();assert.equal(race.state.loading,true);
const second=race.select('wind');await flush();assert.equal(signals.get('rain').aborted,true);pending.get('wind')(buffer('wind'));await second;pending.get('rain')(buffer('rain'));await first;
const raceContext=contexts.at(-1);assert.equal(race.state.kind,'wind');assert.equal(race.state.playing,true);assert.equal(raceContext.sources.length,1);assert.equal(raceContext.sources[0].buffer.kind,'wind','A late old download cannot replace the current selection');
const paused=race.select('forest');await flush();await race.sync(false);pending.get('forest')(buffer('forest'));await paused;assert.equal(race.state.playing,false);assert.equal(raceContext.sources.length,1,'A download completed after pause cannot start a source');
await race.select('ocean');const destroyed=race.sync(true);await flush();race.destroy();pending.get('ocean')(buffer('ocean'));await destroyed;assert.equal(raceContext.closed,true);assert.equal(race.state.playing,false,'Dispose during load cannot create a ghost source');
let attempts=0;const failure=setup(async kind=>{if(++attempts===1)throw Error('network');return buffer(kind);});await failure.select('fire');await failure.sync(true);assert.equal(failure.state.error,true);await failure.sync(true);await failure.sync(true);assert.equal(attempts,1,'A failed recording waits for an explicit retry instead of fetching on every playback tick');await failure.select('fire');assert.equal(failure.state.error,false);assert.equal(failure.state.playing,true);failure.destroy();
let unsupportedLoads=0;const unsupported=createQuranNatureAudio({AudioContext:null,load:()=>{unsupportedLoads++;}});await unsupported.select('wind');await unsupported.sync(true);assert.equal(unsupported.state.supported,false);assert.equal(unsupportedLoads,0);unsupported.destroy();
let requested=false;const decoded=await loadNatureRecording('rain',{decodeAudioData:async bytes=>{assert.equal(bytes.byteLength,4);return buffer('rain');}},{fetcher:async(url,options)=>{requested=true;assert.ok(url.pathname.endsWith('/assets/player-nature-493/rain.mp3'));assert.equal(options.credentials,'same-origin');return{ok:true,arrayBuffer:async()=>new ArrayBuffer(4)};}});assert.equal(requested,true);assert.equal(decoded.numberOfChannels,2);
await assert.rejects(()=>loadNatureRecording('rain',{}, {fetcher:async()=>({ok:false})}));
await assert.rejects(()=>loadNatureRecording('rain',{decodeAudioData:async()=>({duration:34,numberOfChannels:1})},{fetcher:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)})}));
console.log('PASS: selected stereo file loops, default-off/no paused downloads, independent mix and Quran ownership, bounded two-buffer cache, pause/resume phase, stale suspension, load races, abort/dispose, retry and supported-format validation.');

const fs=await import('node:fs/promises'),crypto=await import('node:crypto');
const manifest=JSON.parse(await fs.readFile(new URL('../dist/data/nature-sources-493.json',import.meta.url),'utf8'));
for(const record of manifest.recordings){const bytes=await fs.readFile(new URL('../dist/'+record.file,import.meta.url));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),record.sha256,'Deployed recording must match the processed master: '+record.id);assert.equal(record.channels,2);assert.equal(record.loopEnd-record.loopStart,32);assert.equal(record.page.startsWith('https://freesound.org/'),true);const sound=NATURE_SOUNDS.find(s=>s.id===record.id);assert.equal(sound.name,record.name);await fs.access(new URL('../dist/'+sound.wallpaper.replace(/^\.\//,''),import.meta.url));}
assert.equal(manifest.recordings.length,5);
console.log('PASS: all five shipped recordings match their master SHA256 and loop/source metadata; every theme has its wallpaper.');
