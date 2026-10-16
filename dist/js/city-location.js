// A city lookup starts only from the explicit location button. No IP fallback or tracking.
const failure=(code,message)=>Object.assign(new Error(message),{code});
export function getDevicePosition({geolocation=globalThis.navigator?.geolocation,signal,setTimer=setTimeout,clearTimer=clearTimeout}={}){
 return new Promise((resolve,reject)=>{
  let settled=false,attempt=0,timer;
  const cleanup=()=>{clearTimer(timer);signal?.removeEventListener('abort',abort)};
  const finish=(error,position)=>{if(settled)return;settled=true;cleanup();error?reject(error):resolve(position)};
  const abort=()=>{const error=new Error('Location cancelled');error.name='AbortError';finish(error)};
  if(signal?.aborted){abort();return}signal?.addEventListener('abort',abort,{once:true});
  if(!geolocation?.getCurrentPosition){finish(failure(2,'Geolocation unavailable'));return}
  const run=high=>{
   if(settled)return;const id=++attempt,timeout=high?15000:10000;
   const failed=error=>{if(settled||id!==attempt)return;clearTimer(timer);const code=error?.code===1||error?.name==='SecurityError'?1:error?.code===3?3:2;if(code!==1&&!high){run(true);return}finish(failure(code,code===1?'Location permission denied':code===3?'Location timed out':'Location unavailable'))};
   // Some WebViews never invoke their timeout callback; this also bounds that case.
   timer=setTimer(()=>failed({code:3}),timeout+250);
   try{geolocation.getCurrentPosition(position=>{if(settled||id!==attempt)return;const c=position?.coords;if(!Number.isFinite(c?.latitude)||Math.abs(c.latitude)>90||!Number.isFinite(c?.longitude)||Math.abs(c.longitude)>180){failed({code:2});return}finish(null,position)},failed,{enableHighAccuracy:high,timeout,maximumAge:high?0:15*60*1000})}catch(error){failed(error)}
  };
  run(false);
 });
}
