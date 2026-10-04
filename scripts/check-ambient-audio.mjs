import assert from 'node:assert/strict';
globalThis.localStorage={getItem:()=>null,setItem:()=>{}};
const {createAmbientAudio,ambientPreferences}=await import('../dist/js/ambient-audio.js');
const {foregroundAudioBusy,setForegroundAudio,subscribeForegroundAudio}=await import('../dist/js/audio-focus.js');
const {normalizeSettings}=await import('../dist/js/storage.js');
class Parameter{constructor(value=0){this.value=value;this.ramps=[];this.targets=[]}setValueAtTime(v){this.value=v}cancelAndHoldAtTime(){}linearRampToValueAtTime(value,at){this.value=value;this.ramps.push({value,at})}setTargetAtTime(value,at,time){this.value=value;this.targets.push({value,at,time})}}
const contexts=[];
class Context{
 constructor(){this.currentTime=0;this.sampleRate=1000;this.state='suspended';this.resumeCalls=0;this.suspendCalls=0;contexts.push(this)}
 createGain(){return this.gain={gain:new Parameter(),connect(){},disconnect(){}}}
 createBiquadFilter(){const filter={frequency:new Parameter(),Q:new Parameter(),connect(){},disconnect(){}};(this.filters??=[]).push(filter);return filter}
 createBuffer(channels,length,rate){const data=Array.from({length:channels},()=>new Float32Array(length));return{duration:length/rate,getChannelData:i=>data[i]}}
 createBufferSource(){return this.source={connect(){},disconnect(){},start(){this.started=true},stop(){this.stopped=true}}}
 async resume(){this.resumeCalls++;if(this.fail)throw Error('blocked');this.state='running'}
 async suspend(){this.suspendCalls++;this.state='suspended'}
 async close(){this.state='closed'}
}
let chosen={ambientEnabled:false,ambientSound:'rain',ambientVolume:18},visible=true,route='home',busy=false,clockId=0;
const timers=new Map();
const sound=createAmbientAudio({getSettings:()=>chosen,AudioContext:Context,visible:()=>visible,route:()=>route,busy:()=>busy,schedule:(fn,ms)=>{const id=++clockId;timers.set(id,{fn,ms});return id},cancel:id=>timers.delete(id),random:()=>.6});
await sound.sync();await sound.unlock();assert.equal(contexts.length,0,'No allocation or autoplay by default');
chosen.ambientEnabled=true;await sound.sync();assert.equal(contexts.length,0,'A stored preference still requires a gesture');
await sound.unlock();const context=contexts[0];assert.equal(contexts.length,1);assert.equal(context.gain.gain.ramps.at(-1).at,6);assert.ok(Math.abs(context.gain.gain.ramps.at(-1).value-.063)<1e-8);assert.equal(sound.state.playing,true);
await sound.unlock();assert.equal(contexts.length,1,'Reuse one graph');
busy=true;await sound.sync();assert.equal(context.gain.gain.ramps.at(-1).value,0);assert.equal(context.gain.gain.ramps.at(-1).at,.12);assert.equal(sound.state.reason,'foreground');
const stale=[...timers.values()][0];busy=false;await sound.sync();stale.fn();assert.equal(context.suspendCalls,0,'A stale fade-out must not stop resumed playback');
chosen.ambientSound='wind';await sound.sync();assert.equal(context.filters[1].frequency.targets.at(-1).value,650);assert.equal(context.filters[1].frequency.targets.at(-1).time,.8);
await sound.previewVolume(90);assert.equal(sound.state.volume,60);assert.ok(context.gain.gain.ramps.at(-1).value<=.21);await sound.previewVolume(null);assert.equal(sound.state.volume,18);
visible=false;await sound.sync();assert.equal(sound.state.playing,false);for(const t of timers.values())await t.fn();timers.clear();assert.equal(context.state,'suspended');
visible=true;await sound.sync();assert.equal(context.gain.gain.ramps.at(-1).at,6);route='quran';await sound.sync();assert.equal(sound.state.reason,'paused');route='home';await sound.sync();
chosen.ambientVolume=0;await sound.sync();assert.equal(sound.state.reason,'quiet');chosen.ambientVolume=18;chosen.ambientEnabled=false;await sound.sync();assert.equal(context.gain.gain.ramps.at(-1).at,1.5);sound.destroy();assert.equal(context.state,'closed');assert.equal(context.source.stopped,true);assert.equal(timers.size,0);
chosen.ambientEnabled=true;const blocked=createAmbientAudio({getSettings:()=>chosen,AudioContext:class extends Context{constructor(){super();this.fail=true}},visible:()=>true,route:()=> 'home'});await blocked.unlock();assert.equal(blocked.state.reason,'error');assert.equal(blocked.state.playing,false);contexts.at(-1).fail=false;await blocked.unlock();assert.equal(blocked.state.playing,true);blocked.destroy();
const absent=createAmbientAudio({getSettings:()=>chosen,AudioContext:null});await absent.unlock();assert.equal(absent.state.supported,false);absent.destroy();
const a={},b={},changes=[];const detach=subscribeForegroundAudio(value=>changes.push(value));setForegroundAudio(a,true);setForegroundAudio(b,true);setForegroundAudio(a,false);assert.equal(foregroundAudioBusy(),true);setForegroundAudio(b,false);detach();assert.deepEqual(changes,[false,true,false]);
assert.deepEqual(ambientPreferences({ambientEnabled:'true',ambientVolume:99}),{enabled:false,sound:'rain',volume:18});const settings=normalizeSettings({school:0,weather:true,ambientEnabled:true,ambientSound:'wind',ambientVolume:12},{strict:true});assert.equal(settings.school,0);assert.equal(settings.weather,true);assert.equal(settings.ambientVolume,12);assert.throws(()=>normalizeSettings({ambientVolume:61},{strict:true}));
console.log('PASS: no default autoplay, gesture gate, soft fades, volume cap, lazy graph reuse, foreground priority, visibility, cancellation, retry, and saved preferences.');
