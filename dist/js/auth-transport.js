// Bound Auth requests without logging credentials or abandoning an uncancelled request.
export function createAuthTransport({request=(...args)=>fetch(...args),timeout=15000}={}){
 return async(input,options={})=>{
  const controller=new AbortController();
  const upstream=options.signal||(typeof Request!=='undefined'&&input instanceof Request?input.signal:null);
  const cancel=()=>controller.abort(upstream.reason);
  if(upstream?.aborted)cancel();else upstream?.addEventListener('abort',cancel,{once:true});
  const timer=setTimeout(()=>controller.abort(new DOMException('Auth request timed out','TimeoutError')),timeout);
  try{return await request(input,{...options,signal:controller.signal});}
  finally{clearTimeout(timer);upstream?.removeEventListener('abort',cancel);}
 };
}

// Keep profile/MFA writes and refresh-token rotation in one queue. The pinned
// SDK otherwise permits a late profile response to restore pre-refresh tokens.
// A busy browser lock is temporary unavailability: never steal it and run two
// session writers at once. Browsers without Web Locks use the SDK process queue.
export function createAuthLock({locks=globalThis.navigator?.locks,TimeoutError=Error,fallbackLock,setTimer=setTimeout,clearTimer=clearTimeout}={}){
 if(!locks?.request)return fallbackLock;
 return async(name,acquireTimeout,fn)=>{
  const controller=new AbortController();let timer;
  const unavailable=()=>new TimeoutError('Account session is busy. Retry later.');
  if(acquireTimeout>0)timer=setTimer(()=>controller.abort(),acquireTimeout);
  try{
   return await locks.request(name,acquireTimeout===0?{mode:'exclusive',ifAvailable:true}:{mode:'exclusive',signal:controller.signal},async lock=>{
    clearTimer(timer);if(!lock)throw unavailable();
    return await fn();
   });
  }catch(error){if(controller.signal.aborted)throw unavailable();throw error;}
  finally{clearTimer(timer);}
 };
}
