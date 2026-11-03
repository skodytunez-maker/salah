import{createGuestPresence}from './guest-presence-core.js';
import{counterSyncStatus}from './counter-account.js';
import{OWNER_PROJECT_URL,OWNER_PUBLIC_KEY}from './owner-auth.js';
import{personalDataAllowed}from './audience.js';
let started=false;
export function initGuestPresence(){
 if(started||!personalDataAllowed())return;started=true;
 const presence=createGuestPresence({storage:localStorage,randomUUID:()=>crypto.randomUUID(),identity:counterSyncStatus,visible:()=>!document.hidden&&personalDataAllowed(),online:()=>navigator.onLine!==false,
  send:async id=>{const response=await fetch(OWNER_PROJECT_URL+'/functions/v1/guest-presence',{method:'POST',headers:{apikey:OWNER_PUBLIC_KEY,'Content-Type':'application/json'},body:JSON.stringify({device:id}),credentials:'omit',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(8000)});return response.ok;}});
 const tick=()=>{void presence.tick();};
 window.addEventListener('salah:counter-status',tick);window.addEventListener('online',tick);window.addEventListener('pageshow',tick);document.addEventListener('visibilitychange',tick);setInterval(tick,60000);tick();
}
