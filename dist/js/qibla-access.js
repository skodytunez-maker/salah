import{getDevicePosition}from './city-location.js';
import{personalDataAllowed}from './audience.js';

// Qibla uses a fresh precise fix without changing the saved prayer city.
export function getQiblaPosition({geolocation=globalThis.navigator?.geolocation,signal,setTimer,clearTimer,allowed=personalDataAllowed}={}){
  let permitted=false;try{permitted=allowed()===true;}catch{}
  if(!permitted)return Promise.reject(Object.assign(new Error('Location is unavailable in restricted mode'),{code:1,restricted:true}));
  const fresh=typeof geolocation?.getCurrentPosition==='function'?{
    getCurrentPosition:(ok,fail,options)=>geolocation.getCurrentPosition(ok,fail,{...options,enableHighAccuracy:true,maximumAge:0})
  }:geolocation;
  return getDevicePosition({geolocation:fresh,signal,setTimer,clearTimer});
}

export function createQiblaLocationController({onState=()=>{},geolocation=globalThis.navigator?.geolocation,getPosition=getQiblaPosition,allowed=personalDataAllowed,Controller=globalThis.AbortController,now=Date.now}={}){
  let disposed=false,generation=0,position=null,lastTimestamp=null,pending=null,watchId=null;
  const cancelled=()=>Object.assign(new Error('Location cancelled'),{name:'AbortError'});
  const restricted=()=>Object.assign(new Error('Location is unavailable in restricted mode'),{code:1,restricted:true});
  const accessAllowed=()=>{try{return allowed()===true;}catch{return false;}};
  const current=token=>!disposed&&token===generation;
  const valid=value=>{const c=value?.coords;return Number.isFinite(c?.latitude)&&Math.abs(c.latitude)<=90&&Number.isFinite(c?.longitude)&&Math.abs(c.longitude)<=180&&(c.accuracy===undefined||Number.isFinite(c.accuracy)&&c.accuracy>=0);};
  const emit=(phase,error=null)=>{if(!disposed)onState({phase,position,error});};
  function clearWatch(){const id=watchId;watchId=null;if(id!==null)try{geolocation?.clearWatch?.(id);}catch{}}
  function stop(){generation++;const previous=pending;pending=null;try{previous?.controller?.abort();}catch{}previous?.cancel();clearWatch();}
  async function start(){
    if(disposed)throw cancelled();
    stop();const token=generation;lastTimestamp=null;emit('locating');
    let request,reportedFallback=null;
    try{
      if(!accessAllowed())throw restricted();
      request={controller:typeof Controller==='function'?new Controller():null,cancel:null};pending=request;
      const fix=await new Promise((resolve,reject)=>{
        request.cancel=()=>reject(cancelled());
        try{Promise.resolve(getPosition({geolocation,signal:request.controller?.signal,allowed})).then(resolve,reject);}catch(error){reject(error);}
      });
      if(!current(token))throw cancelled();
      if(!accessAllowed())throw restricted();
      if(!valid(fix))throw Object.assign(new Error('Location unavailable'),{code:2});
      position=fix;lastTimestamp=Number.isFinite(fix.timestamp)?fix.timestamp:now();emit('position');
      if(current(token)&&typeof geolocation?.watchPosition==='function'){
        let watching=true;
        const failed=error=>{
          if(!current(token)||!watching)return;
          if(error?.code===1||error?.name==='SecurityError'){watching=false;clearWatch();position=null;reportedFallback=error;emit('fallback',error);}
          else emit('position',error);
        };
        try{
          const id=geolocation.watchPosition(value=>{
            if(!current(token)||!watching)return;
            if(!accessAllowed()){failed(restricted());return;}
            if(!valid(value))return;
            if(Number.isFinite(value.timestamp)&&Number.isFinite(lastTimestamp)&&value.timestamp<lastTimestamp)return;
            position=value;lastTimestamp=Number.isFinite(value.timestamp)?value.timestamp:now();emit('position');
          },failed,{enableHighAccuracy:true,maximumAge:0,timeout:15000});
          if(current(token)&&watching)watchId=id;else if(id!==null&&id!==undefined)try{geolocation.clearWatch?.(id);}catch{}
        }catch(error){failed(error);}
      }
      if(!current(token))throw cancelled();
      if(reportedFallback)throw reportedFallback;
      return position;
    }catch(error){if(current(token)){position=null;if(error!==reportedFallback)emit('fallback',error);}throw error;}
    finally{if(pending===request)pending=null;}
  }
  return{start,retry:start,stop,destroy(){if(disposed)return;disposed=true;stop();position=null;},get position(){return position;}};
}

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
