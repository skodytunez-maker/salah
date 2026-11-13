import{checkAccountSession,OWNER_PROJECT_URL,OWNER_PUBLIC_KEY}from './owner-auth.js';
const eligible=actor=>actor&&actor.mfaRequired===false&&((actor.owner===true&&actor.role==='owner')||(actor.owner===false&&actor.role==='admin'));
export async function requestTeamPreviewActor(token,{signal,fetcher=globalThis.fetch}={}){
 const controller=new AbortController(),abort=()=>controller.abort(),timer=setTimeout(abort,10000);if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});
 try{const response=await fetcher(OWNER_PROJECT_URL+'/functions/v1/staff-cabinet',{method:'POST',headers:{apikey:OWNER_PUBLIC_KEY,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({action:'gate',args:{}}),cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',redirect:'error',signal:controller.signal});
 if([401,403].includes(response.status))return null;
 if(!response.ok)throw Error('Не удалось проверить доступ команды.');
 const result=await response.json();return result.data;
 }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
}
export function createTeamPreviewAccess({checkSession=checkAccountSession,requestActor=requestTeamPreviewActor,now=Date.now,ttl=60000}={}){
 let actor=null,token=null,at=0,revision=0,pending=null;
 const listeners=new Set(),emit=()=>{for(const fn of listeners)fn();};
 const clear=()=>{revision++;pending?.controller.abort();pending=null;const changed=Boolean(actor);actor=null;token=null;at=0;if(changed)emit();};
 const verified=()=>Boolean(actor&&now()>=at&&now()-at<ttl);
 async function verify({force=false}={}){
  const began=revision,checked=await checkSession({force});
  if(began!==revision)return false;
  const session=checked.session;
  if(checked.state!=='valid'||!session?.access_token||!session.user?.id||!session.user.email_confirmed_at||session.user.is_anonymous){clear();return false;}
  if(!force&&verified()&&actor.id===session.user.id&&token===session.access_token)return true;
  if(pending?.userId===session.user.id&&pending.token===session.access_token)return pending.task;
  pending?.controller.abort();
  const controller=new AbortController(),entry={controller,userId:session.user.id,token:session.access_token,task:null},ticket=revision;
  entry.task=(async()=>{
   try{
    const value=await requestActor(session.access_token,{signal:controller.signal});
    if(controller.signal.aborted||ticket!==revision||pending!==entry)return false;
    if(!eligible(value)||value.id!==session.user.id){clear();return false;}
    const changed=!verified()||actor?.id!==value.id||actor?.role!==value.role;
    actor=Object.freeze({id:value.id,owner:value.owner,role:value.role});token=session.access_token;at=now();
    if(changed)emit();return true;
   }catch(error){const cancelled=controller.signal.aborted;if(ticket===revision&&pending===entry)clear();if(cancelled)return false;throw error;}
   finally{if(pending===entry)pending=null;}
  })();pending=entry;return entry.task;
 }
 return{verified,verify,clear,actor:()=>verified()?actor:null,knownActor:()=>actor,
  subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},
  async accessToken(){if(!await verify()||!verified()||!token)throw Error('Подтвердите защищённый вход команды.');return token;}
 };
}
const shared=createTeamPreviewAccess();
export const teamPreviewVerified=()=>shared.verified();
export const teamPreviewActor=()=>shared.actor();
export const verifiedTeamPreviewId=()=>shared.actor()?.id||null;
export const verifyTeamPreviewAccess=options=>shared.verify(options);
export const teamPreviewAccessToken=()=>shared.accessToken();
export const onTeamPreviewChange=listener=>shared.subscribe(listener);
let stopInit=null;
export function initTeamPreviewAccess({getAccount,onChange=()=>{},doc=document,win=window,interval=setInterval,cancel=clearInterval}={}){
 stopInit?.();let userId=null,lastAttempted=null,working=null,retryEligible=false,lastRoute=null;
 const active=()=>!doc.hidden&&['#home','#knowledge','#radio','#more','#staff'].includes((win.location?.hash||'#home').split('?')[0]);
 async function refresh(force=false){
  const state=getAccount(),id=state.signedIn?state.userId:null;
  if(id!==userId){userId=id;lastAttempted=null;working=null;retryEligible=false;shared.clear();}
  if(!id||!active()||working||!force&&lastAttempted===id&&!shared.knownActor())return;
  lastAttempted=id;const job=shared.verify({force});working=job;
  try{const permitted=await job;if(working===job)retryEligible=permitted;}catch{}finally{if(working===job)working=null;}
 }
 const account=()=>{const state=getAccount(),id=state.signedIn?state.userId:null;if(id!==userId){shared.clear();lastAttempted=null;}void refresh();};
 const resume=()=>{if(!doc.hidden)void refresh(true);},route=()=>{const next=(win.location?.hash||'#home').split('?')[0],changed=next!==lastRoute;lastRoute=next;void refresh(changed&&!shared.knownActor());};
 win.addEventListener('salah:counter-status',account);win.addEventListener('hashchange',route);win.addEventListener('online',resume);doc.addEventListener('visibilitychange',resume);
 const timer=interval(()=>{if(shared.knownActor()||retryEligible)void refresh(true);},45000),off=shared.subscribe(onChange);
 void refresh();
 stopInit=()=>{cancel(timer);off();win.removeEventListener('salah:counter-status',account);win.removeEventListener('hashchange',route);win.removeEventListener('online',resume);doc.removeEventListener('visibilitychange',resume);shared.clear();};
 return stopInit;
}
