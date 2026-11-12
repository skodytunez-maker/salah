// Closed programme planner: only measured, complete recordings enter the queue.
export function shuffleRadio(items,random=Math.random){
 const result=items.slice();
 for(let i=result.length-1;i>0;i--){const value=random();const j=Math.floor((Number.isFinite(value)?Math.max(0,Math.min(.999999999,value)):0)*(i+1));[result[i],result[j]]=[result[j],result[i]];}
 return result;
}
export function selectRadioProgram(recordings,{target=3600,random=Math.random}={}){
 if(!Number.isInteger(target)||target<60||target>7200)throw Error('Неверная длительность программы');
 const seen=new Set(),tracks=shuffleRadio(recordings,random).filter(track=>{
  const key=track.reciter+':'+track.surah;
  if(seen.has(key)||typeof track.reciter!=='string'||!Number.isInteger(track.surah)||track.surah<78||track.surah>114||!Number.isFinite(track.duration)||track.duration<10||track.duration>240)return false;
  seen.add(key);return true;
 }).slice(0,180);
 // Immutable paths keep each recording in the solution at most once.
 const paths=Array(target+1).fill(null);paths[0]={track:null,previous:null};
 for(const track of tracks){const seconds=Math.ceil(track.duration);for(let total=target;total>=seconds;total--)if(!paths[total]&&paths[total-seconds])paths[total]={track,previous:paths[total-seconds]};}
 let total=target;while(total&&!paths[total])total--;
 const remaining=[];for(let path=paths[total];path?.track;path=path.previous)remaining.push(path.track);
 const ordered=[];
 while(remaining.length){const previous=ordered.at(-1);let index=remaining.findIndex(x=>x.reciter!==previous?.reciter&&x.surah!==previous?.surah);if(index<0)index=remaining.findIndex(x=>x.surah!==previous?.surah);if(index<0)index=0;ordered.push(remaining.splice(index,1)[0]);}
 const duration=ordered.reduce((sum,x)=>sum+x.duration,0);
 return {tracks:ordered,duration,target,complete:duration>=target-90};
}
export async function measureRadioCandidates(candidates,{probe,signal,onProgress=()=>{},concurrency=3}={}){
 const result=[];let cursor=0,done=0;
 await Promise.all(Array.from({length:Math.min(3,Math.max(1,concurrency))},async()=>{
  while(cursor<candidates.length&&!signal?.aborted){
   const track=candidates[cursor++];let duration=null;
   try{duration=await probe(track.url,signal);}catch{}
   if(signal?.aborted)break;
   if(Number.isFinite(duration)&&duration>=10&&duration<=240)result.push({...track,duration});
   onProgress(++done,candidates.length);
  }
 }));
 if(signal?.aborted)throw Object.assign(Error('Подбор отменён'),{name:'AbortError'});
 return result;
}
export function probeRadioDuration(url,signal,{createAudio=()=>new Audio(),timeout=8000}={}){
 return new Promise(resolve=>{
  if(signal?.aborted){resolve(null);return;}
  const audio=createAudio();let settled=false,timer;
  const finish=value=>{if(settled)return;settled=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);audio.onloadedmetadata=null;audio.onerror=null;try{audio.pause();audio.removeAttribute('src');audio.load();}catch{}resolve(value);};
  const abort=()=>finish(null);
  signal?.addEventListener('abort',abort,{once:true});
  audio.preload='metadata';audio.onloadedmetadata=()=>finish(Number.isFinite(audio.duration)?audio.duration:null);audio.onerror=abort;
  timer=setTimeout(abort,timeout);
  try{audio.src=url;audio.load();}catch{abort();}
 });
}
