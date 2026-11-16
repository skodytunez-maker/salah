import{createAppStateReporter,appSection}from './app-state-core.js';
import{guestActivityId}from './activity-presence-core.js';
import{personalDataAllowed}from './audience.js';
import{accountAuthClient,OWNER_PROJECT_URL,OWNER_PUBLIC_KEY}from './owner-auth.js';
import{counterSyncStatus}from './counter-account.js';
import{APP_VERSION}from './app-release.js';
import{settings}from './storage.js';
import{guestSelectedContext}from './guest-context.js';
let initialized=false;
const sessionId=session=>{try{const value=JSON.parse(atob(session.access_token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).session_id;return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value||'')?value:null;}catch{return null;}};
export function initAppState({playback,getAccount=counterSyncStatus,getClient=accountAuthClient,getCreditPaused=()=>null}={}){
 if(initialized||!personalDataAllowed())return;initialized=true;
 let session=null,auth=null,authSubscription=null,revision=0,disposed=false,pageHidden=false;
 const identity=()=>{if(!personalDataAllowed())return null;const account=getAccount();if(account?.identityKnown!==true)return null;
  const device=guestActivityId(account,localStorage);if(device)return{scope:'guest:'+device,guest:true,device};
  if(!account.signedIn||!account.userId||session?.user?.id!==account.userId)return null;const sid=sessionId(session);return sid?{scope:'account:'+account.userId+':'+sid,id:account.userId,sessionId:sid}:null;
 };
 const send=async(packet,{identity:person,signal,keepalive})=>{
  if(disposed||signal.aborted||navigator.onLine===false||identity()?.scope!==person.scope)throw Error('changed');
  let token=null;
  if(!person.guest){
   let currentSession=session;
   if(!keepalive){await new Promise(resolve=>setTimeout(resolve,0));const result=await getClient()?.auth.getSession();if(result?.error)throw Error('session');currentSession=result?.data?.session;}
   if(disposed||signal.aborted||currentSession?.user?.id!==person.id||sessionId(currentSession)!==person.sessionId||identity()?.scope!==person.scope)throw Error('changed');token=currentSession.access_token;
  }
  if(signal.aborted||identity()?.scope!==person.scope||JSON.stringify(packet.selectedCity)!==JSON.stringify(guestSelectedContext(settings.city)))throw Error('changed');
  const response=await fetch(OWNER_PROJECT_URL+'/functions/v1/listening-now',{method:'POST',headers:{apikey:OWNER_PUBLIC_KEY,...(token?{Authorization:'Bearer '+token}:{}),'Content-Type':'application/json'},body:JSON.stringify(packet),signal,keepalive,credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer'});
  if(disposed||!response.ok||identity()?.scope!==person.scope)throw Error('unavailable');
 };
 const reporter=createAppStateReporter({getIdentity:identity,getView:()=>({visible:!document.hidden&&!pageHidden,section:appSection(location)}),getPlayback:()=>playback?.state,getCreditPaused,getSelectedCity:()=>settings.city,appVersion:APP_VERSION,send,now:()=>performance.now()});
 const sample=(force=false)=>{if(!disposed)reporter.sample({force,keepalive:document.hidden||pageHidden});};
 const refreshSession=()=>{let next;try{next=getClient()?.auth;}catch{return;}if(!next)return;
  if(auth!==next){authSubscription?.unsubscribe?.();auth=next;session=null;revision++;const subscription=auth.onAuthStateChange((_event,value)=>{revision++;session=value;setTimeout(()=>sample(),0);});authSubscription=subscription?.data?.subscription;}
  const version=revision,currentAuth=auth;void auth.getSession().then(({data,error})=>{if(!disposed&&!error&&auth===currentAuth&&version===revision){session=data.session;sample();}}).catch(()=>{});
 };
 const listeners=[],listen=(target,name,callback,options)=>{target.addEventListener(name,callback,options);listeners.push(()=>target.removeEventListener(name,callback,options));};
 const action=event=>reporter.action(event);
 listen(document,'pointerdown',action,true);listen(document,'keydown',action,true);listen(document,'wheel',action,{capture:true,passive:true});
 for(const name of ['hashchange','online','salah:settings-changed','salah:listening-credit-status'])listen(window,name,()=>sample());
 listen(window,'salah:counter-status',()=>{refreshSession();sample();});
 listen(document,'visibilitychange',()=>{if(!document.hidden)pageHidden=false;sample(true);});listen(window,'pageshow',()=>{pageHidden=false;sample(true);});
 listen(window,'pagehide',()=>{pageHidden=true;reporter.sample({force:true,keepalive:true});});
 const unsubscribe=playback?.subscribe(()=>sample()),timer=setInterval(()=>sample(),15000);
 refreshSession();sample();
 return()=>{if(disposed)return;disposed=true;revision++;clearInterval(timer);for(const remove of listeners)remove();if(typeof unsubscribe==='function')unsubscribe();authSubscription?.unsubscribe?.();reporter.dispose();initialized=false;};
}
