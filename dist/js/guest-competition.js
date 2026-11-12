import{createGuestCompetitionTracker}from './guest-competition-core.js';
import{personalDataAllowed}from './audience.js';
import{read,write}from './storage.js';
import{OWNER_PROJECT_URL,OWNER_PUBLIC_KEY}from './owner-auth.js';
import{guestActivityId}from './activity-presence-core.js';
let tracker=null;
export const guestCompetitionOwn=period=>tracker?.own(period)||null;
export const recordGuestListening=(id,seconds,at)=>{void tracker?.progress(id,seconds,at).catch(()=>{});};
export function initGuestCompetition({getAccount,getClient,now=Date.now}){
 if(tracker||!personalDataAllowed())return;
 const account=()=>personalDataAllowed()?getAccount():null;
 tracker=createGuestCompetitionTracker({getAccount:account,now,
 readState:()=>read('guest-competition-v1',null),writeState:s=>write('guest-competition-v1',s),
 randomSecret:()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join(''),
 activityDevice:()=>guestActivityId(getAccount(),localStorage),
 exclusive:fn=>navigator.locks?.request?navigator.locks.request('salah:guest-competition-v1',fn):Promise.resolve().then(fn),
 changed:()=>window.dispatchEvent(new Event('salah:guest-competition-updated')),
 send:async(body,{userId}={})=>{
  if(navigator.onLine===false)throw Error('offline');let token=null;
  if(userId){await new Promise(resolve=>setTimeout(resolve,0));const{data,error}=await getClient().auth.getSession();if(error||data?.session?.user?.id!==userId||account()?.userId!==userId||!account()?.signedIn)throw Error('changed');token=data.session.access_token;}
  const response=await fetch(OWNER_PROJECT_URL+'/functions/v1/guest-competition',{method:'POST',headers:{apikey:OWNER_PUBLIC_KEY,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body),credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(15000)});
  if(!response.ok){const error=Error('unavailable');error.status=response.status;throw error;}const result=await response.json();if(result.ok!==true)throw Error('unavailable');return result;
 }});
 const sync=()=>void tracker.sync();setInterval(sync,15000);
 for(const name of ['salah:counter-status','online','pageshow'])window.addEventListener(name,()=>void tracker.sync({force:true}));
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync();});sync();
}
