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
