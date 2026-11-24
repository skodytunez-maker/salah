import{NATURE_SOUNDS,natureRecording,loadNatureRecording}from './quran-nature-recordings.js';
export{NATURE_SOUNDS};
export const NATURE_MAX_VOLUME=100;
export const NATURE_DEFAULT_VOLUME=25;
// Keep headroom in the nature mix without changing the user's 0–100 scale.
const NATURE_MIX_CEILING=.9;
export function createQuranNatureAudio({AudioContext=globalThis.AudioContext||globalThis.webkitAudioContext,load=loadNatureRecording,AbortController=globalThis.AbortController,volume=NATURE_DEFAULT_VOLUME,onExternalPause=()=>{}}={}){
 let context=null,gain=null,active=null,kind=null,wanted=false,armed=false,disposed=false,revision=0,suspension=null,selfSuspended=false,error=false,loading=false,job=null;
 volume=Number.isInteger(volume)?Math.max(0,Math.min(100,volume)):25;
 const listeners=new Set(),cache=new Map(),retiring=new Set();
 const state=()=>({kind,volume,supported:typeof AudioContext==='function',loading,playing:!!(kind&&wanted&&armed&&volume>0&&active?.kind===kind&&context?.state==='running'),error,systemPaused:!!(kind&&wanted&&armed&&context&&context.state!=='running'&&!selfSuspended)});
 const emit=()=>{const s=state();for(const fn of listeners)try{fn(s);}catch{}};
 function ramp(param,value,seconds){const t=context.currentTime;if(param.cancelAndHoldAtTime)param.cancelAndHoldAtTime(t);else{param.cancelScheduledValues(t);param.setValueAtTime(param.value,t);}param.linearRampToValueAtTime(value,t+seconds);}
 function level(value,seconds=.15){if(gain&&context)ramp(gain.gain,value,seconds);}
 function disconnect(entry){try{entry.node.disconnect();entry.envelope.disconnect();}catch{}retiring.delete(entry);}
 function stopSource(immediate=false){
  const entry=active;active=null;if(!entry)return;
  retiring.add(entry);entry.node.onended=()=>disconnect(entry);
  try{if(immediate){entry.node.stop();disconnect(entry);}else{ramp(entry.envelope.gain,0,.08);entry.node.stop(context.currentTime+.1);}}catch{disconnect(entry);}
 }
 function graph(){
  if(context&&context.state!=='closed')return;
  const audioContext=new AudioContext({latencyHint:'playback'});
  context=audioContext;
  gain=context.createGain();
  gain.gain.value=0;
  gain.connect(context.destination);
  let previousState=context.state;
  context.onstatechange=()=>{
   if(disposed||context!==audioContext)return;
   const nextState=audioContext.state;
   // WebKit can direct the system pause to an audible ambient context.
   const externalPause=previousState==='running'&&nextState==='suspended'&&
    !selfSuspended&&kind&&active?.kind===kind&&wanted&&armed&&volume>0;
   previousState=nextState;
   if(externalPause)onExternalPause();
   emit();
  };
 }
 function abortLoad(){if(job){job.controller?.abort();job=null;}loading=false;}
 async function bufferFor(chosen){
  if(cache.has(chosen)){const buffer=cache.get(chosen);cache.delete(chosen);cache.set(chosen,buffer);return buffer;}
  if(job?.kind===chosen)return job.promise;
  abortLoad();const task={kind:chosen,controller:typeof AbortController==='function'?new AbortController():null};
  loading=true;job=task;emit();
  task.promise=Promise.resolve().then(()=>load(chosen,context,{signal:task.controller?.signal})).then(buffer=>{
   if(disposed||task.controller?.signal.aborted)throw Error('Cancelled nature load');
   if(kind===chosen){cache.set(chosen,buffer);while(cache.size>2)cache.delete(cache.keys().next().value);}
   return buffer;
  }).finally(()=>{if(job===task){job=null;loading=false;emit();}});
  return task.promise;
 }
 function makeSource(chosen,buffer){
  stopSource();const entry=natureRecording(chosen),node=context.createBufferSource(),envelope=context.createGain();
  envelope.gain.value=0;envelope.connect(gain);node.buffer=buffer;node.loop=true;node.loopStart=entry.loopStart;node.loopEnd=Math.min(entry.loopEnd,buffer.duration);node.connect(envelope);
  active={kind:chosen,node,envelope};node.start(0,entry.loopStart);ramp(envelope.gain,1,.12);
 }
 function suspendGraph(){
  if(!context||context.state==='closed'||selfSuspended)return;
  selfSuspended=true;
  try{const task=Promise.resolve(context.suspend()).catch(()=>{if(suspension===task)selfSuspended=false;});suspension=task;void task.finally(()=>{if(suspension===task)suspension=null;});}catch{selfSuspended=false;}
 }
 function quiet(){
  // A background page may stop receiving JS timers immediately after Pause.
  // Silence and suspend in the command itself, retaining the selected buffer.
  level(0,0);suspendGraph();emit();
 }
 async function sync(value=wanted){
  if(disposed)return;wanted=!!value;const ticket=++revision;
  if(!kind||!wanted||!volume){if(context&&armed)quiet();else emit();return;}
  if(error){emit();return;}
  if(!armed){if(!error&&typeof AudioContext==='function')await unlock();else emit();return;}
  try{
   if(suspension)await suspension;
   if(disposed||ticket!==revision)return;
   if(context.state==='suspended'&&selfSuspended){selfSuspended=false;await context.resume();}
   if(disposed||ticket!==revision)return;
   if(context.state!=='running'){emit();return;}
   const chosen=kind,buffer=active?.kind===chosen?null:await bufferFor(chosen);
   if(disposed||ticket!==revision||kind!==chosen||!wanted||!volume)return;
   if(active?.kind!==chosen)makeSource(chosen,buffer);
   level(volume/100*NATURE_MIX_CEILING);error=false;emit();
  }catch{if(!disposed&&ticket===revision){error=true;loading=false;level(0,0);emit();}}
 }
 async function unlock(){
  if(disposed||!kind||typeof AudioContext!=='function'){emit();return;}
  const chosen=kind,ticket=revision;
  try{graph();if(suspension)await suspension;if(disposed||kind!==chosen||ticket!==revision)return;const resumed=context.resume();await resumed;if(disposed||kind!==chosen||ticket!==revision)return;armed=true;selfSuspended=false;error=false;await sync();}
  catch{if(!disposed&&kind===chosen&&ticket===revision){error=true;emit();}}
 }
 async function select(value){
  if(value!==null&&!natureRecording(value))return false;
  kind=value;revision++;abortLoad();stopSource();error=false;
  if(!kind){quiet();armed=false;return true;}
  emit();if(wanted&&volume>0)await unlock();return true;
 }
 function halt(){
  if(disposed)return;wanted=false;armed=false;revision++;abortLoad();stopSource(true);
  for(const entry of [...retiring]){try{entry.node.stop();}catch{}disconnect(entry)}
  level(0,0);error=false;
  suspendGraph();
  emit();
 }
 return{select,unlock,sync,halt,get state(){return state();},setVolume(value){if(!Number.isInteger(value)||value<0||value>100)return;volume=value;return sync();},subscribe(fn){listeners.add(fn);fn(state());return()=>listeners.delete(fn);},destroy(){
  disposed=true;revision++;abortLoad();stopSource(true);for(const entry of [...retiring]){try{entry.node.stop();}catch{}disconnect(entry);}cache.clear();listeners.clear();if(context){context.onstatechange=null;void context.close().catch(()=>{});}context=null;
 }};
}
