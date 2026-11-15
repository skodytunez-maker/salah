import{personalDataAllowed}from './audience.js';
import{competitionOwn,sendCompetitionPresence}from './competition-client.js';
import{createPlaybackPresenceReporter}from './listener-presence-core.js';
let started=false;
export function initListenerPresence({playback,getAccount,isEnabled}){
 if(started||!personalDataAllowed())return;started=true;
 const reporter=createPlaybackPresenceReporter({getState:()=>playback.state,getUserId:()=>getAccount().signedIn?getAccount().userId:null,isEligible:()=>{const own=competitionOwn();return personalDataAllowed()&&navigator.onLine!==false&&isEnabled()&&own?.enabled===true&&['initial','profile'].includes(own.mode);},send:(packet,options)=>{if(navigator.onLine===false)return Promise.reject(Error('offline'));return sendCompetitionPresence(packet,options);}});
 const sample=(force=false)=>reporter.sample({force,keepalive:document.hidden});
 playback.subscribe(()=>sample());
 window.addEventListener('online',()=>sample(true));
 for(const event of ['salah:counter-status','salah:competition-updated','salah:listener-visibility','salah:popularity-consent'])window.addEventListener(event,()=>sample());
 // Hiding the page does not stop its audio. Preserve only real, recent advancement.
 window.addEventListener('pagehide',()=>reporter.sample({force:true,keepalive:true}));window.addEventListener('pageshow',()=>sample(true));
 document.addEventListener('visibilitychange',()=>sample(true));
 setInterval(()=>sample(),15000);
}
