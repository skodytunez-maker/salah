import{accountAuthClient,OWNER_PROJECT_URL,OWNER_PUBLIC_KEY}from './owner-auth.js';
import{createAuthTransport}from './auth-transport.js';
import{readNotificationSnapshot}from './notification-status.js';
import{APP_VERSION}from './app-release.js';
export function createPresence({send,visible,nextSequence,schedule,listen}){ let stopped=false,inFlight=0,lastActive,lastSequence;
 const transmit=(active,sequence)=>{try{return Promise.resolve(send(active,sequence));}catch{return Promise.reject(Error('presence_unavailable'));}};
 const update=()=>{if(stopped)return;const current=visible();if(current===lastActive&&(!current||inFlight>0))return;lastActive=current;const sequence=lastSequence=nextSequence();inFlight++;transmit(current,sequence).catch(()=>{if(lastSequence===sequence)lastActive=undefined;}).finally(()=>inFlight--);};
 update();const stopTimer=schedule(update),stopListen=listen(update);
 return()=>{if(stopped)return;stopped=true;stopTimer();stopListen();if(lastActive!==false)void transmit(false,nextSequence()).catch(()=>{});};
}
let initialized=false;
export function initAccountPresence(){if(initialized)return;initialized=true;let tab,sequence=0;try{tab=sessionStorage.getItem('salah-presence-tab')||crypto.randomUUID();sequence=Number(sessionStorage.getItem('salah-presence-sequence'))||0;sessionStorage.setItem('salah-presence-tab',tab)}catch{tab=crypto.randomUUID()}
 const nextSequence=()=>{sequence++;try{sessionStorage.setItem('salah-presence-sequence',String(sequence))}catch{}return sequence;};let stop=()=>{},token=null,revision=0;
 const auth=accountAuthClient().auth;
 const request=createAuthTransport();
 const send=async(accessToken,active,sequence)=>{const notification=active?await readNotificationSnapshot():null;const response=await request(OWNER_PROJECT_URL+'/functions/v1/account-presence',{method:'POST',headers:{apikey:OWNER_PUBLIC_KEY,Authorization:'Bearer '+accessToken,'Content-Type':'application/json'},body:JSON.stringify({p_app:'salah',p_tab:tab,p_active:active,p_sequence:sequence,...(active?{p_version:APP_VERSION}:{}),...(notification?{p_notifications:notification}:{})}),keepalive:true,cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'});if(!response.ok)throw Error('presence_unavailable');};
 const sessionChanged=session=>{if(token===(session?.access_token||null))return;stop();stop=()=>{};token=session?.access_token||null;if(!token)return;const accessToken=token;stop=createPresence({send:(active,seq)=>send(accessToken,active,seq),visible:()=>document.visibilityState==='visible',nextSequence,schedule:fn=>{const timer=setInterval(fn,30000);return()=>clearInterval(timer)},listen:fn=>{const hide=()=>{void send(accessToken,false,nextSequence()).catch(()=>{})};document.addEventListener('visibilitychange',fn);window.addEventListener('online',fn);window.addEventListener('pageshow',fn);window.addEventListener('salah:settings-changed',fn);window.addEventListener('salah:notification-status-changed',fn);window.addEventListener('pagehide',hide);return()=>{document.removeEventListener('visibilitychange',fn);window.removeEventListener('online',fn);window.removeEventListener('pageshow',fn);window.removeEventListener('salah:settings-changed',fn);window.removeEventListener('salah:notification-status-changed',fn);window.removeEventListener('pagehide',hide)}}});};
 auth.onAuthStateChange((_event,session)=>{revision++;sessionChanged(session)});const version=revision;auth.getSession().then(({data,error})=>{if(!error&&version===revision)sessionChanged(data.session)}).catch(()=>{});
}
