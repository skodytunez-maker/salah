import {MAX_SUPPORT_VOICE_BYTES,supportVoiceMime} from './support-media.js';

const formats=['audio/mp4','audio/webm;codecs=opus','audio/webm'];
const MAX_RECORD_MS=120000;

export function createSupportVoiceRecorder({
 mediaDevices=globalThis.navigator?.mediaDevices,Recorder=globalThis.MediaRecorder,
 onState=()=>{},onRecorded=()=>{},isActive=()=>true,now=Date.now,
 setClock=setInterval,clearClock=clearInterval,setDeadline=setTimeout,clearDeadline=clearTimeout,
}={}){
 const available=typeof Recorder==='function'&&typeof mediaDevices?.getUserMedia==='function';
 let recording=null,stream=null,parts=[],bytes=0,epoch=0,clock=null,deadline=null,state='idle';
 const stopTracks=source=>source?.getTracks().forEach(track=>track.stop());
 const publish=(next,details)=>{state=next;onState(next,details);};
 function clean(){
  epoch++;if(clock!==null)clearClock(clock);if(deadline!==null)clearDeadline(deadline);
  clock=deadline=null;
  const current=recording;recording=null;parts=[];bytes=0;
  if(current){current.ondataavailable=current.onstop=current.onerror=null;if(current.state!=='inactive')try{current.stop();}catch{}}
  stopTracks(stream);stream=null;
 }
 function cancel(){if(state!=='idle'){clean();publish('idle');}}
 function fail(reason){clean();publish('error',reason);}
 function stop(){
  if(state!=='recording'||!recording)return;
  const current=recording;publish('finishing');
  if(deadline!==null)clearDeadline(deadline);
  deadline=setDeadline(()=>{if(recording===current)fail('failed');},5000);
  if(current.state!=='inactive')try{current.stop();}catch{fail('failed');}
 }
 async function start(){
  if(!available||!isActive()||!['idle','error'].includes(state))return false;
  const ticket=++epoch;publish('requesting');
  let acquired;
  try{acquired=await mediaDevices.getUserMedia({audio:true,video:false});}
  catch(error){if(ticket===epoch&&isActive())fail(error?.name==='NotAllowedError'?'denied':'failed');return false;}
  if(ticket!==epoch||!isActive()){stopTracks(acquired);if(ticket===epoch)cancel();return false;}
  stream=acquired;
  try{
   const format=formats.find(type=>Recorder.isTypeSupported?.(type));
   const current=new Recorder(stream,format?{mimeType:format,audioBitsPerSecond:64000}:undefined);
   recording=current;
   const live=()=>ticket===epoch&&recording===current;
   current.ondataavailable=({data})=>{
    if(!live()||!data?.size)return;
    bytes+=data.size;if(bytes>MAX_SUPPORT_VOICE_BYTES){fail('failed');return;}
    parts.push(data);
   };
   current.onerror=()=>{if(live())fail('failed');};
   current.onstop=()=>{
    if(!live())return;
    const mime=supportVoiceMime(current.mimeType||parts[0]?.type||format);
    const file=mime&&bytes>=16?new Blob(parts,{type:mime}):null;
    const allowed=isActive();clean();
    if(!allowed){publish('idle');return;}
    if(!file){publish('error','failed');return;}
    publish('idle');onRecorded(file);
   };
   const started=now();current.start(1000);publish('recording',{seconds:0});
   clock=setClock(()=>{if(live()&&state==='recording')publish('recording',{seconds:Math.floor((now()-started)/1000)});},1000);
   deadline=setDeadline(stop,MAX_RECORD_MS);
   return true;
  }catch{fail('failed');return false;}
 }
 return {available,start,stop,cancel,get state(){return state;}};
}
