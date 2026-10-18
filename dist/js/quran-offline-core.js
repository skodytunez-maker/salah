import{completeAudioResponse}from './quran-offline-store.js';
const cancelled=()=>new DOMException('Загрузка приостановлена','AbortError');
export async function downloadAudioFiles({urls,store,fetcher=fetch,signal,onProgress=()=>{},idleTimeoutMs=45000}){
 if(!Array.isArray(urls)||!urls.length||new Set(urls).size!==urls.length)throw Error('Неизвестная аудиозапись');
 const controller=new AbortController(),abort=()=>controller.abort();signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
 let next=0,done=0,bytes=0,failure=null;const partial=new Map();
 const progress=(phase='downloading')=>onProgress(done,bytes+[...partial.values()].reduce((a,b)=>a+b,0),{phase,total:urls.length});
 const check=()=>{if(controller.signal.aborted)throw cancelled();};
 try{
  const results=await Promise.allSettled(Array.from({length:Math.min(2,urls.length)},async()=>{
   try{while(next<urls.length){
    check();const url=urls[next++];progress('connecting');let blob=await store.getAudio(url);check();
    if(!blob){
     let timer,timedOut=false,reader;const arm=()=>{clearTimeout(timer);timer=setTimeout(()=>{timedOut=true;controller.abort();},idleTimeoutMs);};arm();
     try{
      const response=await fetcher(url,{signal:controller.signal,credentials:'omit',cache:'no-store'});
      if(!completeAudioResponse(response))throw Error('Не удалось скачать полную аудиозапись');
      arm();
      if(response.body?.getReader){
       reader=response.body.getReader();let received=0;
       // Stream into the browser's Blob store, without retaining a long surah's chunks in JS.
       const body=new ReadableStream({async pull(output){try{const part=await reader.read();check();if(part.done){output.close();return;}received+=part.value.byteLength;partial.set(url,received);arm();progress();output.enqueue(part.value);}catch(error){output.error(error);}},cancel(reason){return reader.cancel(reason);}});
       blob=await new Response(body,{headers:{'Content-Type':response.headers.get('Content-Type')}}).blob();
      }else blob=await response.blob();
      check();if(!blob.size)throw Error('Пустая аудиозапись');
      const length=Number(response.headers.get('Content-Length'));if(length>0&&!response.headers.has('Content-Encoding')&&length!==blob.size)throw Error('Загрузка записи оборвалась');
      clearTimeout(timer);partial.set(url,blob.size);progress('saving');
      await store.putAudio(url,blob);
     }catch(error){if(timedOut){const timeout=Error('Аудиосервер долго не отвечает. Повторите скачивание.');timeout.name='TimeoutError';throw timeout;}throw error;}
     finally{clearTimeout(timer);if(reader){try{await reader.cancel();}catch{}reader.releaseLock();}}
    }
    check();partial.delete(url);bytes+=blob.size;done++;progress();
   }}catch(error){if(!failure)failure=error;controller.abort();throw error;}
  }));
  if(failure)throw failure;const rejected=results.find(r=>r.status==='rejected');if(rejected)throw rejected.reason;check();return bytes;
 }finally{signal?.removeEventListener('abort',abort);}
}
export function createQuranDownloadQueue({loadSurah,saveSurah,hasSurah=()=>true}){
 let task=null,controller=null,state={status:'idle',reciter:null,total:0,done:0,bytes:0,surah:null,verse:0,error:null};const listeners=new Set();
 const emit=()=>{for(const listener of listeners)try{listener({...state});}catch{}};
 return {
  get state(){return {...state};},
  get busy(){return !!task;},
  subscribe(listener){listeners.add(listener);listener({...state});return()=>listeners.delete(listener);},
  pause(){if(task){state.status='pausing';emit();controller.abort();}},
  start(reciter,numbers){
   if(task)return task;
   const selected=[...new Set(numbers)].filter(n=>Number.isInteger(n)&&n>=1&&n<=114&&hasSurah(reciter,n));if(!selected.length)return Promise.reject(Error('Нет доступных сур'));
   controller=new AbortController();const current=controller;
   state={status:'downloading',reciter,total:selected.length,done:0,bytes:0,surah:selected[0],verse:0,error:null};
   task=Promise.resolve().then(async()=>{
    try{
     for(const number of selected){
      if(current.signal.aborted)throw cancelled();state.surah=number;state.verse=0;emit();
      const surah=await loadSurah(number);if(current.signal.aborted)throw cancelled();
      const bytes=await saveSurah(surah,reciter,(count,partialBytes)=>{state.verse=count;state.currentBytes=partialBytes;emit();},current.signal);
      state.done++;state.bytes+=bytes;state.currentBytes=0;emit();
     }
     state.status='complete';
    }catch(error){state.status=error.name==='AbortError'?'paused':'error';state.reason=String(error.message||'').slice(0,180);state.error=error.name==='QuotaExceededError'?'Недостаточно места на устройстве':error.name==='AbortError'?null:error.name==='TimeoutError'?'Аудиосервер долго не отвечает. Можно продолжить скачивание.':'Загрузка прервана. Можно продолжить.';}
    finally{task=null;controller=null;emit();}
    return {...state};
   });emit();return task;
  }
 };
}
