export const SLEEP_MINUTES=Object.freeze([15,30,45,60]);
export function createQuranSleepTimer({now=Date.now,schedule=setTimeout,cancel=clearTimeout,onExpire=()=>{},onChange=()=>{}}={}){
 let mode=null,deadline=null,job=null,disposed=false,revision=0;
 const state=()=>({mode,deadline,remaining:deadline===null?null:Math.max(0,Math.ceil((deadline-now())/1000))});
 const clearJob=()=>{if(job!==null)cancel(job);job=null;};
 function clear(){revision++;clearJob();mode=null;deadline=null;onChange(state());}
 function expire(){if(mode===null||disposed)return false;clear();onExpire();return true;}
 function check(){return !disposed&&deadline!==null&&now()>=deadline?expire():false;}
 function wake(ticket){if(disposed||ticket!==revision||mode===null)return;job=null;if(check())return;onChange(state());if(deadline!==null)job=schedule(()=>wake(ticket),Math.max(1,Math.min(1000,deadline-now())));}
 return{set(value){if(disposed)return false;if(value!==null&&value!=='end'&&!SLEEP_MINUTES.includes(value))return false;clearJob();const ticket=++revision;mode=value;deadline=typeof value==='number'?now()+value*60000:null;onChange(state());if(deadline!==null)job=schedule(()=>wake(ticket),Math.min(1000,deadline-now()));return true;},clear,check,surahEnded:()=>mode==='end'?expire():check(),get state(){return state();},destroy(){disposed=true;revision++;clearJob();mode=null;deadline=null;}};
}
