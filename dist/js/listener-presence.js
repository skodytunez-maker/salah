import{personalDataAllowed}from './audience.js';
import{competitionOwn,sendCompetitionPresence}from './competition-client.js';
import{createPlaybackPresenceReporter}from './listener-presence-core.js';
let started=false;
export function initListenerPresence({playback,getAccount,isEnabled}){
 if(started||!personalDataAllowed())return;started=true;
 const reporter=createPlaybackPresenceReporter({getState:()=>playback.state,getUserId:()=>getAccount().signedIn?getAccount().userId:null,isEligible:()=>{const own=competitionOwn();return personalDataAllowed()&&navigator.onLine!==false&&isEnabled()&&own?.enabled===true&&own.mode==='profile';},send:(packet,options)=>{if(navigator.onLine===false)return Promise.reject(Error('offline'));return sendCompetitionPresence(packet,options);}});
 playback.subscribe(()=>reporter.sample());
 window.addEventListener('online',()=>reporter.sample({force:true}));
 for(const event of ['salah:counter-status','salah:competition-updated','salah:listener-visibility','salah:popularity-consent'])window.addEventListener(event,()=>reporter.sample());
 window.addEventListener('pagehide',()=>reporter.stop({keepalive:true}));window.addEventListener('pageshow',()=>reporter.sample({force:true}));
 setInterval(()=>reporter.sample(),15000);
}
