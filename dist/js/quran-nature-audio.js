export const NATURE_SOUNDS=Object.freeze([{id:'rain',name:'Дождь'},{id:'wind',name:'Ветер'},{id:'fire',name:'Костёр'},{id:'forest',name:'Лес'},{id:'ocean',name:'Океан'}]);
export const NATURE_MAX_VOLUME=40;
const valid=kind=>NATURE_SOUNDS.some(sound=>sound.id===kind);
// Locally generated sound textures: no downloads, songs or outside recordings.
export function natureSamples(kind,{sampleRate=16000,seconds=24,random=Math.random}={}){
 if(!valid(kind))throw Error('Unknown nature sound');
 const data=new Float32Array(Math.ceil(sampleRate*seconds));let brown=0,pink=0,crackle=0,peak=0;
 for(let i=0;i<data.length;i++){
  const t=i/sampleRate,white=random()*2-1;brown=(brown+.025*white)/1.025;pink=.93*pink+.07*white;
  let value=0;
  if(kind==='rain')value=white*.23+pink*.52+brown*.7;
  if(kind==='wind')value=(brown*3+pink*.12)*(.55+.22*Math.sin(t*.63)+.14*Math.sin(t*1.43));
  if(kind==='ocean')value=(brown*2.3+pink*.6+white*.07)*(.35+.65*((1-Math.cos(t*Math.PI/4))/2)**1.8);
  if(kind==='fire'){if(random()<.001)crackle=(random()*.5+.1);crackle*=.94;value=brown*1.2+pink*.14+white*crackle;}
  if(kind==='forest'){
   value=brown*.9+pink*.18;const phase=t%7.7;
   if(phase>1.1&&phase<1.36){const p=(phase-1.1)/.26,envelope=Math.sin(Math.PI*p)**2;value+=Math.sin(2*Math.PI*(2300*(phase-1.1)+1900*(phase-1.1)**2))*envelope*.08;}
  }
  data[i]=value;peak=Math.max(peak,Math.abs(value));
 }
 const seam=Math.min(512,Math.floor(data.length/8)),scale=peak>.8?.8/peak:1;
 for(let i=0;i<data.length;i++)data[i]*=scale;
 for(let i=0;i<seam;i++){const mix=i/(seam-1),end=data.length-seam+i;data[end]=data[end]*(1-mix)+data[i]*mix;}
 return{data,sampleRate,loopStart:seam/sampleRate};
}
export function createQuranNatureAudio({AudioContext=globalThis.AudioContext||globalThis.webkitAudioContext,schedule=setTimeout,cancel=clearTimeout,generate=natureSamples,volume=12}={}){
 let context=null,source=null,gain=null,kind=null,wanted=false,armed=false,disposed=false,revision=0,stopJob=null,selfSuspended=false,error=false;
 volume=Number.isInteger(volume)?Math.max(0,Math.min(NATURE_MAX_VOLUME,volume)):12;
 const listeners=new Set(),state=()=>({kind,volume,supported:typeof AudioContext==='function',playing:!!(kind&&wanted&&armed&&volume>0&&context?.state==='running'),error,systemPaused:!!(kind&&wanted&&armed&&context&&context.state!=='running'&&!selfSuspended)});
 const emit=()=>{const s=state();for(const fn of listeners)try{fn(s);}catch{}};
 function stopSource(){try{source?.stop();source?.disconnect();}catch{}source=null;}
 function graph(){if(context&&context.state!=='closed')return;context=new AudioContext({latencyHint:'playback'});gain=context.createGain();gain.gain.value=0;gain.connect(context.destination);context.onstatechange=emit;}
 function makeSource(){stopSource();if(!kind||!context)return;const samples=generate(kind),buffer=context.createBuffer(1,samples.data.length,samples.sampleRate);buffer.getChannelData(0).set(samples.data);source=context.createBufferSource();source.buffer=buffer;source.loop=true;source.loopStart=samples.loopStart;source.loopEnd=buffer.duration;source.connect(gain);source.start(0,samples.loopStart);}
 function level(value,seconds=.15){if(!gain||!context)return;const p=gain.gain,t=context.currentTime;if(p.cancelAndHoldAtTime)p.cancelAndHoldAtTime(t);else{p.cancelScheduledValues(t);p.setValueAtTime(p.value,t);}p.linearRampToValueAtTime(value,t+seconds);}
 async function sync(value=wanted){
  if(disposed)return;wanted=!!value;const ticket=++revision;if(stopJob!==null)cancel(stopJob);stopJob=null;
  if(kind&&wanted&&volume>0&&!armed&&!error&&typeof AudioContext==='function'){await unlock();return;}
  if(!context||!armed||!kind){emit();return;}
  if(!wanted||!volume){level(0,.1);emit();stopJob=schedule(()=>{stopJob=null;if(disposed||ticket!==revision)return;selfSuspended=true;void context.suspend().catch(()=>{});},140);return;}
  try{if(context.state==='suspended'&&selfSuspended){selfSuspended=false;await context.resume();}if(disposed||ticket!==revision)return;if(context.state==='running'){level(volume/100*.4);error=false;}emit();}catch{error=true;level(0,0);emit();}
 }
 async function unlock(){if(disposed||!kind||typeof AudioContext!=='function'){emit();return;}const chosen=kind;try{graph();const resumed=context.resume();await resumed;if(disposed||kind!==chosen)return;armed=true;selfSuspended=false;error=false;if(!source)makeSource();await sync();}catch{if(!disposed&&kind===chosen){error=true;emit();}}}
 async function select(value){if(value!==null&&!valid(value))return false;kind=value;revision++;if(stopJob!==null)cancel(stopJob);stopJob=null;if(!kind){level(0,.08);stopSource();armed=false;if(context){selfSuspended=true;void context.suspend().catch(()=>{});}emit();return true;}error=false;try{if(context&&armed)makeSource();if(wanted)await unlock();else emit();}catch{error=true;emit();}return true;}
 return{select,unlock,sync,get state(){return state();},setVolume(value){if(!Number.isInteger(value)||value<0||value>NATURE_MAX_VOLUME)return;volume=value;return sync();},subscribe(fn){listeners.add(fn);fn(state());return()=>listeners.delete(fn);},destroy(){disposed=true;revision++;if(stopJob!==null)cancel(stopJob);stopSource();listeners.clear();if(context){context.onstatechange=null;void context.close().catch(()=>{});}context=null;}};
}
