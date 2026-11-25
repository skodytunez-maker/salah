import assert from 'node:assert/strict';
import {createSupportVoiceRecorder} from '../dist/js/support-voice-recorder.js';

const records=[],states=[],engines=[];
class Recorder {
 static isTypeSupported(mime){return mime==='audio/mp4';}
 constructor(stream,options){this.state='inactive';this.mimeType=options.mimeType;engines.push(this);}
 start(block){assert.equal(block,1000);this.state='recording';}
 stop(){this.state='inactive';this.ondataavailable?.({data:new Blob(['0123456789abcdef'],{type:this.mimeType})});this.onstop?.();}
}
const source=()=>{
 let stopped=0;
 return {getTracks:()=>[{stop(){stopped++}}],get stopped(){return stopped;}};
};
let current=source(),active=true,permission,now=0;
const deadlines=new Map(),clocks=new Map();let count=0;
const timer=(map,fn,ms)=>{map.set(++count,{fn,ms});return count;};
const capture=createSupportVoiceRecorder({
 Recorder,mediaDevices:{getUserMedia:async options=>{assert.deepEqual(options,{audio:true,video:false});if(permission)return permission;return current;}},
 onState:(state,details)=>states.push([state,details]),onRecorded:file=>records.push(file),isActive:()=>active,now:()=>now,
 setClock:(fn,ms)=>timer(clocks,fn,ms),clearClock:id=>clocks.delete(id),setDeadline:(fn,ms)=>timer(deadlines,fn,ms),clearDeadline:id=>deadlines.delete(id),
});
assert(capture.available);
assert(await capture.start());assert.equal(capture.state,'recording');
now=1740;[...clocks.values()][0].fn();assert.deepEqual(states.at(-1),['recording',{seconds:1}]);
capture.stop();assert.equal(current.stopped,1);assert.equal(records.length,1);
assert.equal(records[0].type,'audio/mp4');assert.equal(records[0].size,16);
assert.equal(capture.state,'idle');assert.equal(clocks.size,0);assert.equal(deadlines.size,0);

current=source();assert(await capture.start());const late=engines.at(-1).onstop;capture.cancel();late();
assert.equal(current.stopped,1);assert.equal(records.length,1,'Cancel cannot leave even a late draft');
let grant;permission=new Promise(resolve=>{grant=resolve;});const deniedAfterLeaving=capture.start();
capture.cancel();current=source();grant(current);assert.equal(await deniedAfterLeaving,false);
assert.equal(current.stopped,1,'A permission granted after leaving cannot activate the microphone');
permission=null;
active=false;assert.equal(await capture.start(),false);active=true;
current=source();assert(await capture.start());
const max=[...deadlines.values()][0];assert.equal(max.ms,120000);max.fn();assert.equal(records.length,2);
assert.equal(current.stopped,1,'Limit ends recording and leaves a local draft');
current=source();assert(await capture.start());engines.at(-1).onerror();assert.deepEqual(states.at(-1),['error','failed']);
assert.equal(current.stopped,1);
const denied=createSupportVoiceRecorder({Recorder,mediaDevices:{getUserMedia:async()=>{throw new DOMException('Denied','NotAllowedError');}},onState:(state,details)=>states.push([state,details])});
assert.equal(await denied.start(),false);assert.deepEqual(states.at(-1),['error','denied']);
console.log('PASS Support microphone: permission, timer, maximum duration, local audio, cancellation, late grants, error cleanup.');
