// Keep the current session's sensor decision; iOS must ask within the entry gesture.
export function createSensorAccess(deviceOrientation) {
  let decision = null, pending = null;
  function request({ retry = false } = {}) {
    if (typeof deviceOrientation?.requestPermission !== 'function') return Promise.resolve('granted');
    if (pending) return pending;
    if (decision && !retry) return Promise.resolve(decision);
    try {
      const result = deviceOrientation.requestPermission(true);
      pending = Promise.resolve(result).then(value => {
        decision = value === 'granted' ? 'granted' : 'denied';
        return decision;
      }).finally(() => { pending = null; });
    } catch (error) {
      return Promise.reject(error);
    }
    return pending;
  }
  return { request };
}

// Reuse an existing grant on launch; iOS prompts are deferred to a real tap.
export function createAutomaticSensorAccess({access,target,onGranted=()=>{}}){
  let disposed=false,inFlight=false,finished=false;
  function detach(){for(const type of ['pointerup','click','keydown'])target.removeEventListener(type,onGesture,true);}
  function attempt(){
    if(disposed||inFlight||finished)return;
    inFlight=true;
    let result;
    try{result=access.request();}catch(error){inFlight=false;return;}
    Promise.resolve(result).then(decision=>{
      if(disposed)return;
      finished=true;detach();
      if(decision==='granted')onGranted();
    },()=>{}).finally(()=>{inFlight=false;});
  }
  function onGesture(event){
    if(event.type==='keydown'&&!['Enter',' '].includes(event.key))return;
    if(event.type==='pointerup'&&(event.isPrimary===false||event.button>0))return;
    attempt();
  }
  for(const type of ['pointerup','click','keydown'])target.addEventListener(type,onGesture,true);
  attempt();
  return ()=>{disposed=true;detach();};
}
