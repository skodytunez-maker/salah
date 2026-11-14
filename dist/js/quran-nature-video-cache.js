export const NATURE_VIDEO_BASE='https://skodytunez-maker.github.io/salah/assets/player-nature-video-495/';
export const NATURE_VIDEO_KINDS=Object.freeze(['rain','wind','fire','forest','ocean']);
export const natureVideoUrl=kind=>NATURE_VIDEO_KINDS.includes(kind)?NATURE_VIDEO_BASE+kind+'.mp4':null;

// Only compressed bytes are warmed. No media elements, decoder, identity or background timer.
export function createNatureVideoCache({fetcher=globalThis.fetch,Controller=globalThis.AbortController,BlobClass=globalThis.Blob,createUrl=blob=>URL.createObjectURL(blob),revokeUrl=url=>URL.revokeObjectURL(url),canWarm=()=>false,connection=()=>globalThis.navigator?.connection,maxBytes=16*1024*1024}={}){
 const entries=new Map(),failed=new Set();let bytes=0,job=null,disposed=false,preferred=null,inflightBytes=0;
 const allowed=()=>{const c=connection();return !disposed&&canWarm()&&!c?.saveData&&!['slow-2g','2g'].includes(c?.effectiveType);};
 const valid=task=>!disposed&&job===task&&!task.controller?.signal.aborted&&allowed();
 async function read(response,task){
  const limit=maxBytes-bytes,length=Number(response.headers?.get?.('Content-Length'));
  if(!response.ok||response.status!==200||response.type==='opaque'||!/^(video\/mp4)(?:;|$)/i.test(response.headers?.get?.('Content-Type')||'')){try{await response.body?.cancel?.();}catch{}throw Error('Invalid video response');}
  if(Number.isFinite(length)&&length>limit){try{await response.body?.cancel?.();}catch{}throw Error('Video cache budget');}
  if(response.body?.getReader){
   const reader=response.body.getReader(),chunks=[];task.reader=reader;let total=0;
   try{while(true){if(!valid(task))throw Error('Cancelled warming');const part=await reader.read();if(part.done)break;total+=part.value.byteLength;if(total>limit){await reader.cancel();throw Error('Video cache budget');}inflightBytes=total;chunks.push(part.value);}return new BlobClass(chunks,{type:'video/mp4'});}
   catch(error){try{await reader.cancel();}catch{}throw error;}
   finally{inflightBytes=0;if(task.reader===reader)task.reader=null;reader.releaseLock?.();}
  }
  if(!Number.isFinite(length)||length<=0||length>limit||typeof response.blob!=='function')throw Error('Unbounded response');
  const blob=await response.blob();if(blob.size>limit)throw Error('Video cache budget');return blob;
 }
 function stop(){const previous=job;job=null;previous?.controller?.abort();try{if(previous?.reader)void Promise.resolve(previous.reader.cancel()).catch(()=>{});}catch{}inflightBytes=0;}
 function warm(kind){
  if(!natureVideoUrl(kind)||!allowed()||typeof fetcher!=='function'||typeof Controller!=='function')return Promise.resolve();preferred=kind;if(job)return job.promise;
  const task={controller:typeof Controller==='function'?new Controller():null,promise:null};job=task;
  task.promise=(async()=>{
   while(valid(task)){
    const order=[...NATURE_VIDEO_KINDS.filter(k=>k!==preferred),preferred],next=order.find(k=>!entries.has(k)&&!failed.has(k));if(!next)break;
    try{
     const response=await fetcher(natureVideoUrl(next),{mode:'cors',credentials:'omit',cache:'force-cache',priority:'low',signal:task.controller?.signal});
     const blob=await read(response,task);if(!valid(task))break;
     if(!blob.size||bytes+blob.size>maxBytes)throw Error('Video cache budget');
     const url=createUrl(blob);if(!valid(task)){revokeUrl(url);break;}entries.set(next,{url,blob,bytes:blob.size});bytes+=blob.size;
    }catch{if(!valid(task))break;failed.add(next);}
   }
  })().finally(()=>{if(job===task)job=null;});return task.promise;
 }
 return{get:kind=>entries.get(kind)?.url||null,warm,stop,retry(kind){failed.delete(kind);},get state(){return{bytes,inflightBytes,entries:entries.size,warming:!!job,failed:[...failed]};},destroy(){if(disposed)return;disposed=true;stop();for(const entry of entries.values())try{revokeUrl(entry.url);}catch{}entries.clear();failed.clear();bytes=0;}};
}
