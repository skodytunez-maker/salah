const imageAbort=()=>new DOMException('Image request cancelled','AbortError');
export function waitDecodedImage(image,{signal,timeoutMs=30000}={}){
 return new Promise((resolve,reject)=>{
  let settled=false,decoding=false,timer=null;
  const cleanup=()=>{image.removeEventListener('load',loaded);image.removeEventListener('error',failed);signal?.removeEventListener('abort',cancel);if(timer!==null)clearTimeout(timer);};
  const finish=(error)=>{if(settled)return;settled=true;cleanup();error?reject(error):resolve(image);};
  const failed=()=>finish(Error('Image did not load'));
  const cancel=()=>finish(imageAbort());
  async function loaded(){if(settled||decoding)return;decoding=true;try{if(!image.complete||!image.naturalWidth||!image.naturalHeight)throw Error('Incomplete image');if(typeof image.decode==='function')await image.decode();if(signal?.aborted)throw imageAbort();if(!image.complete||!image.naturalWidth||!image.naturalHeight)throw Error('Incomplete image');finish();}catch(error){finish(error);}}
  if(signal?.aborted){cancel();return;}
  image.addEventListener('load',loaded);image.addEventListener('error',failed);signal?.addEventListener('abort',cancel,{once:true});
  if(timeoutMs>0)timer=setTimeout(failed,timeoutMs);
  queueMicrotask(()=>{if(image.complete&&image.naturalWidth>0)void loaded();else if(image.complete&&image.getAttribute?.('src'))failed();});
 });
}
export async function loadDecodedImage(src,{signal,createImage=()=>new Image(),timeoutMs=30000}={}){
 if(signal?.aborted)throw imageAbort();const image=createImage();image.decoding='async';
 const pending=waitDecodedImage(image,{signal,timeoutMs}),cancel=()=>{try{image.removeAttribute('src');}catch{}};signal?.addEventListener('abort',cancel,{once:true});
 try{image.src=src;return await pending;}catch(error){cancel();throw error;}finally{signal?.removeEventListener('abort',cancel);}
}
// A portrait may change identity. Keep its existing neutral frame, never another
// reciter's photograph, visible while a replacement is incomplete.
export function createImagePresenter(image,{fallback='./assets/person.svg',load=loadDecodedImage}={}){
 let generation=0,controller=null,requested=null,task=null,disposed=false,failed=false;
 const alive=ticket=>!disposed&&ticket===generation&&image.isConnected!==false;
 function set(src,{retry=false}={}){
  if(disposed||!src)return Promise.resolve(false);if(requested===src&&!retry)return task||Promise.resolve(!failed);
  requested=src;failed=false;const ticket=++generation;controller?.abort();controller=new AbortController();const signal=controller.signal;image.setAttribute('data-image-pending','');
  task=(async()=>{
   for(const candidate of [...new Set([src,fallback].filter(Boolean))])try{
    const decoded=await load(candidate,{signal});if(!alive(ticket)||signal.aborted)return false;
    image.src=candidate;await waitDecodedImage(image,{signal});if(!alive(ticket)||signal.aborted)return false;
    // Keep the decoded source alive until the visible node has decoded it too.
    if(!decoded.complete||!decoded.naturalWidth)throw Error('Incomplete image');image.removeAttribute('data-image-pending');failed=candidate!==src;return true;
   }catch{if(!alive(ticket)||signal.aborted)return false;}
   failed=true;return false;
  })();return task;
 }
 return{set,retry(){return requested&&failed?set(requested,{retry:true}):task;},destroy(){disposed=true;generation++;controller?.abort();}};
}
// Initial lazy images keep their native loading policy. This observer never
// starts a hidden/offscreen catalogue download of its own.
const imageWatchers=new WeakMap();
export function watchDecodedImages(root,{selector='img[data-image-pending]',fallback='./assets/person.svg'}={}){
 imageWatchers.get(root)?.();let disposed=false,observer=null;const records=[];
 for(const image of root.querySelectorAll(selector)){
  const controller=new AbortController(),source=image.getAttribute('src');let presenter=null,failed=false;
  const run=()=>{void waitDecodedImage(image,{signal:controller.signal,timeoutMs:0}).then(()=>{if(!disposed&&image.isConnected&&image.getAttribute('src')===source)image.removeAttribute('data-image-pending');},()=>{if(disposed||controller.signal.aborted||!image.isConnected)return;failed=true;presenter=createImagePresenter(image,{fallback});void presenter.set(fallback);});};
  run();records.push({image,controller,get presenter(){return presenter;},retry(){if(!failed||!image.isConnected)return;presenter?.destroy();presenter=createImagePresenter(image,{fallback});void presenter.set(source);}});
 }
 const win=root.ownerDocument?.defaultView,online=()=>{if(!disposed)for(const record of records)record.retry();};
 const dispose=()=>{if(disposed)return;disposed=true;observer?.disconnect();win?.removeEventListener('online',online);for(const record of records){record.controller.abort();record.presenter?.destroy();}if(imageWatchers.get(root)===dispose)imageWatchers.delete(root);};
 imageWatchers.set(root,dispose);
 if(records.length){win?.addEventListener('online',online);const Observer=win?.MutationObserver;if(Observer&&root.ownerDocument?.body){observer=new Observer(()=>{for(const record of records)if(!record.image.isConnected){record.controller.abort();record.presenter?.destroy();}if(!root.isConnected||records.every(record=>!record.image.isConnected))dispose();});observer.observe(root.ownerDocument.body,{childList:true,subtree:true});}}
 return dispose;
}
