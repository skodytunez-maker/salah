// Quiet, cancellable work after a stable foreground interval. No DOM, network,
// storage permissions, audio, timers tied to prayer layout, or readiness flags.
export function createAutomaticOffline({policy,run,identity,eligible,reflect=()=>{},clock=Date.now,setTimer=setTimeout,clearTimer=clearTimeout,delay=5000,retry=900000,recheck=21600000}={}){
 let disposed=false,timer=null,monitor=null,controller=null,task=null,lastKey='',lastAt=0,lastOK=false;
 const clear=()=>{if(timer!==null)clearTimer(timer);timer=null;};
 const schedule=wait=>{clear();if(!disposed&&policy.enabled())timer=setTimer(()=>{timer=null;void pump();},wait);};
 function interrupt(){controller?.abort();return task||Promise.resolve();}
 function wake(){if(disposed)return;void interrupt();schedule(delay);}
 async function pump(){
  if(disposed||task||!policy.enabled())return;
  if(!eligible()){schedule(30000);return;}
  const key=identity(),remaining=(lastOK?recheck:retry)-(clock()-lastAt);
  if(key===lastKey&&remaining>0){schedule(remaining);return;}
  const ownController=new AbortController(),signal=ownController.signal;controller=ownController;reflect(true);
  const watch=()=>{if(disposed||signal.aborted||!policy.enabled()||!eligible()||identity()!==key){ownController.abort();return;}monitor=setTimer(watch,2000);};monitor=setTimer(watch,2000);
  const ownTask=Promise.resolve().then(()=>run(signal));task=ownTask;
  try{await ownTask;if(!signal.aborted){lastKey=key;lastAt=clock();lastOK=true;}}
  catch{if(!signal.aborted){lastKey=key;lastAt=clock();lastOK=false;}}
  finally{if(monitor!==null)clearTimer(monitor);monitor=null;if(task===ownTask){task=null;controller=null;reflect(false);schedule(signal.aborted?delay:lastOK?recheck:retry);}}
 }
 const offPolicy=policy.subscribe(value=>{if(value){wake();return;}clear();return interrupt();});
 schedule(delay);
 return{wake,runNow:pump,async stop(){if(disposed)return;disposed=true;clear();offPolicy();await interrupt();if(monitor!==null)clearTimer(monitor);monitor=null;reflect(false);},get active(){return!!task;}};
}
