import{createPlaybackPresenceReporter}from './listener-presence-core.js';
import{accountAuthClient,OWNER_PROJECT_URL,OWNER_PUBLIC_KEY}from './owner-auth.js';
import{counterSyncStatus}from './counter-account.js';
import{competitionOwn}from './competition-client.js';
import{popularityEnabled}from './reciter-popularity.js';
import{personalDataAllowed}from './audience.js';
import{createActivityReporter,activityView,guestActivityId}from './activity-presence-core.js';
let initialized=false;
function sessionScope(session){try{const claims=JSON.parse(atob(session.access_token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));return session.user.id+':'+claims.session_id;}catch{return null;}}
export function initActivityPresence({playback}={}){
 if(initialized||!personalDataAllowed())return;initialized=true;let session=null,revision=0,guestListener=null,guestDevice=null;
 const identity=()=>{const state=counterSyncStatus();if(!personalDataAllowed())return null;
  const device=guestActivityId(state,localStorage);if(device)return{id:device,scope:'guest:'+device,guest:true,device};
  if(!session||!state.signedIn||state.userId!==session.user.id)return null;const scope=sessionScope(session);return scope?{id:state.userId,scope,token:session.access_token}:null;
 };
 const send=async(packet,options)=>{const person=options.identity;if(!person)throw Error('changed');
  const body=person.guest?{...packet,action:'guest-activity',device:person.device}:packet;
  const response=await fetch(OWNER_PROJECT_URL+'/functions/v1/listening-now',{method:'POST',headers:{apikey:OWNER_PUBLIC_KEY,...(!person.guest?{Authorization:'Bearer '+person.token}:{}),'Content-Type':'application/json'},body:JSON.stringify(body),signal:options.signal,keepalive:options.keepalive,credentials:'omit',referrerPolicy:'no-referrer'});
  if(!response.ok)throw Error('unavailable');
 };
 const reporter=createActivityReporter({getIdentity:identity,getView:()=>activityView(document,location,playback?.state),
 eligible:()=>{if(!personalDataAllowed()||navigator.onLine===false)return false;const person=identity();if(person?.guest)return true;const own=competitionOwn();return popularityEnabled()&&own?.enabled===true&&['initial','profile'].includes(own.mode);},send});
 const sample=()=>{const person=identity(),device=person?.guest?person.device:null;
  if(device!==guestDevice){guestListener?.dispose();guestListener=null;guestDevice=device;
   if(device&&playback)guestListener=createPlaybackPresenceReporter({getState:()=>playback.state,getUserId:()=>device,isEligible:()=>identity()?.scope==='guest:'+device&&navigator.onLine!==false,send:(packet,options)=>send({action:'guest-activity',kind:'listening',tab:packet.tab,sequence:packet.sequence,active:packet.playing},{...options,identity:{guest:true,device}})});
  }
  reporter.sample();guestListener?.sample();
 };
 accountAuthClient().auth.onAuthStateChange((_event,value)=>{revision++;session=value;setTimeout(sample,0);});
 const before=revision;setTimeout(()=>{void accountAuthClient().auth.getSession().then(({data,error})=>{if(!error&&before===revision){session=data.session;sample();}}).catch(()=>{});},0);
 window.addEventListener('salah:dhikr-presence-counted',event=>{const current=identity(),account=event.detail?.account;if(current?.guest&&account==='guest')reporter.counted(current.id);else reporter.counted(account);});
 for(const name of ['hashchange','online','pageshow','salah:counter-status','salah:competition-updated','salah:listener-visibility','salah:popularity-consent'])window.addEventListener(name,sample);
 document.addEventListener('visibilitychange',sample);
 window.addEventListener('pagehide',()=>{reporter.stop();guestListener?.stop({keepalive:true});});
 playback?.subscribe(sample);
 const observer=new MutationObserver(sample);observer.observe(document.getElementById('app'),{childList:true,subtree:true});
 // The player lives outside #app. Its native dialog may cover the still-mounted text.
 for(const dialog of document.querySelectorAll('dialog'))observer.observe(dialog,{attributes:true,attributeFilter:['open']});
 setInterval(sample,15000);sample();
}
