import{uiError}from './ui.js';
import{dateKey}from './prayers.js';
import{syncLessonNotificationAccount}from './lesson-notification-account.js';
import{personalDataAllowed}from './audience.js';
import{createAuthTransport,createAuthLock}from './auth-transport.js';
import{createSessionGuard}from './auth-session.js';
// Public connection key; owner authority is always checked by the server.
export const OWNER_PROJECT_URL='https://kbltwszfvphgbxdbczsb.supabase.co';
export const OWNER_PUBLIC_KEY='sb_publishable_D2OGfXHyZCN_DQJpR9LTNg_mOD03jnR';
const SESSION_KEY='salah-owner-session-v1'; // Excluded from personal backups.
let client=null,verified=false,verifiedAt=0,verifiedUserId=null,pending=null,revision=0,mfaRequired=false;
const listeners=new Set();
function publish(){for(const fn of listeners)fn();}
function revoke(){mfaRequired=false;const changed=verified;verified=false;verifiedAt=0;verifiedUserId=null;if(changed)publish();}
const ownerScreenActive=()=>typeof location==='undefined'||['#account','#admin','#more','#support','#radio'].includes(location.hash.split('?')[0])||(location.hash.split('?')[0]==='#knowledge'&&!/view=(?:alphabet|names)(?:&|$)/.test(location.hash));
function authClient(){
 if(!personalDataAllowed())throw uiError('ownerAuthUi.restricted');
 if(!client){
  if(!window.supabase?.createClient)throw uiError('ownerAuthUi.unavailable');
  client=window.supabase.createClient(OWNER_PROJECT_URL,OWNER_PUBLIC_KEY,{global:{fetch:createAuthTransport()},auth:{storageKey:SESSION_KEY,persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,lockAcquireTimeout:10000,lock:createAuthLock({TimeoutError:window.supabase.NavigatorLockAcquireTimeoutError,fallbackLock:window.supabase.processLock})}});
  client.auth.onAuthStateChange((event,session)=>{
   syncLessonNotificationAccount(session?.user?.email_confirmed_at&&!session.user.is_anonymous?session.user.id:null);
   const sameOwner=event==='TOKEN_REFRESHED'&&session?.user?.id&&session.user.id===verifiedUserId&&verified;
   if(['TOKEN_REFRESHED','SIGNED_IN','PASSWORD_RECOVERY'].includes(event))checkAccountSession.acceptRefresh(session);
   else if(event==='SIGNED_OUT')checkAccountSession.invalidate();
   revision++;if(!sameOwner)revoke();
   // A routine renewal must not collapse the already verified cabinet. Its
   // existing 60-second grant still expires; every data request checks the server.
   if(ownerScreenActive())setTimeout(()=>verifyOwner().catch(()=>{}),0);
  });
 }
 return client;
}
export function ownerVerified(){return verified&&Date.now()-verifiedAt<60000;}
export function verifiedOwnerId(){return ownerVerified()?verifiedUserId:null;}
export function ownerNeedsMfa(){return mfaRequired;}
export function onOwnerChange(fn){listeners.add(fn);return()=>listeners.delete(fn);}
async function callOwner(session,query='',{binary=false,signal=null}={}){
 if(!session?.access_token)throw uiError('ownerAuthUi.signIn');
 let response;
 try{for(let attempt=0;attempt<(query?2:1);attempt++){try{if(signal?.aborted)throw Error('cancelled');const timeout=AbortSignal.timeout(query?15000:8000),requestSignal=signal&&typeof AbortSignal.any==='function'?AbortSignal.any([signal,timeout]):timeout;response=await fetch(OWNER_PROJECT_URL+'/functions/v1/owner-access'+query,{method:'GET',headers:{apikey:OWNER_PUBLIC_KEY,Authorization:'Bearer '+session.access_token},cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:requestSignal});if(signal?.aborted)throw Error('cancelled');if(![502,504].includes(response.status)||attempt||!query)break;}catch(error){if(signal?.aborted||attempt||!query)throw error;}await new Promise(resolve=>setTimeout(resolve,400));}}
 catch{if(signal?.aborted)throw Object.assign(uiError('ownerAuthUi.cancelled'),{name:'AbortError'});revoke();throw uiError('ownerAuthUi.verifyFailed');}
 if(!response.ok){if(response.status===401||response.status===403||!query)revoke();if(response.status===401)throw Object.assign(uiError('ownerAuthUi.expired'),{status:401});if(response.status===403){const denied=uiError('ownerAuthUi.denied');denied.status=403;throw denied;}if(response.status===503&&query)throw uiError('ownerAuthUi.statsUnavailable');throw uiError('ownerAuthUi.workspaceUnavailable');}
 return binary?response.blob():response.json();
}
export async function verifyOwner({verifySession=false}={}){
 if(pending)return pending;
 const task=(async()=>{
  const auth=authClient();
  // A session refresh can finish during the server check. Recheck the current
  // session instead of displaying a login form for a successfully renewed one.
  for(let attempt=0;attempt<3;attempt++){
   const started=revision;
   const checked=await checkAccountSession({force:verifySession&&attempt===0});
   if(started!==revision)continue;
   if(checked.state==='unavailable'||checked.state==='changed')throw Object.assign(uiError('ownerAuthUi.sessionUnavailable'),{status:503});
   if(checked.state!=='valid'||!checked.session){revoke();return false;}
   let result;try{result=await callOwner(checked.session)}catch(error){if(error.status===403){revoke();return false}throw error}
   if(started!==revision)continue;
   if(result.owner!==true){revoke();mfaRequired=result.mfaRequired===true;return false;}
   // A grant can expire while the underlying session remains valid. Notify Home
   // controls when a fresh server check restores it, including after backgrounding.
   const changed=!ownerVerified()||verifiedUserId!==checked.session.user?.id;verified=true;verifiedAt=Date.now();verifiedUserId=checked.session.user?.id||null;if(changed)publish();return true;
  }
  revoke();return false;
 })();
 pending=task;try{return await task;}finally{if(pending===task)pending=null;}
}
export async function signInOwner(email,password){
 const {error}=await authClient().auth.signInWithPassword({email:email.trim(),password});
 if(error)throw uiError('accountUi.credentialsInvalid');
 if(!await verifyOwner()&&!mfaRequired)throw uiError('ownerAuthUi.ownerVerifyFailed');
}

export async function ownerMfaFactors(){
 if(!mfaRequired)throw uiError('ownerAuthUi.signInFirst');
 const {data,error}=await authClient().auth.mfa.listFactors();
 if(error)throw uiError('ownerAuthUi.factorCheckFailed');
 return (data.totp||[]).filter(factor=>factor.status==='verified');
}
export async function enrollOwnerMfa(){
 if(!mfaRequired||!await verifyOwner()&&!mfaRequired)throw uiError('ownerAuthUi.signInFirst');
 const {data,error}=await authClient().auth.mfa.enroll({factorType:'totp',friendlyName:'SALAH '+Date.now(),issuer:'SALAH'});
 if(error)throw uiError('ownerAuthUi.enrolFailed');
 return data;
}
export async function verifyOwnerMfa(factorId,code){
 if(!mfaRequired)throw uiError('ownerAuthUi.signInFirst');
 if(!/^[0-9]{6}$/.test(code))throw uiError('ownerAuthUi.enterCode');
 const {error}=await authClient().auth.mfa.challengeAndVerify({factorId,code});
 if(error)throw uiError('ownerAuthUi.invalidCode');
 if(!await verifyOwner())throw uiError('ownerAuthUi.mfaFailed');
}

export async function signOutOwner(){
 revision++;revoke();
 const {error}=await authClient().auth.signOut({scope:'local'});
 if(error)throw uiError('ownerAuthUi.signOutFailed');
 publish();
}
export async function ownerStatistics(days=7){
 if(![1,7,30].includes(days))throw uiError('ownerAuthUi.period');
 const {data,error}=await authClient().auth.getSession();
 if(error)throw uiError('deviceUi.signIn');
 return callOwner(data.session,'?mode=stats&days='+days);
}
export async function ownerGeography(days=7){
 if(![1,7,30].includes(days))throw uiError('ownerAuthUi.period');
 const {data,error}=await authClient().auth.getSession();if(error)throw uiError('deviceUi.signIn');
 return callOwner(data.session,'?mode=geography&days='+days);
}
export function initOwnerAccess(onChanged){
 onOwnerChange(onChanged);
 const resume=()=>{let stored=false;try{stored=Boolean(localStorage.getItem(SESSION_KEY));}catch{}if(stored&&ownerScreenActive())verifyOwner({verifySession:true}).catch(()=>{});};
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)resume();});
 window.addEventListener('online',resume);
 window.addEventListener('hashchange',resume);
 window.addEventListener('storage',event=>{if(event.key!==SESSION_KEY)return;
  // The SDK broadcasts routine renewals itself. Refreshing again on its storage
  // write makes all open tabs rotate and rebroadcast the session indefinitely.
  // Removal, malformed data or another account still revoke the UI immediately.
  let next;try{next=event.newValue&&JSON.parse(event.newValue);}catch{}
  if(!next?.user?.id||next.user.id!==verifiedUserId){revision++;revoke();}
  if(ownerScreenActive())setTimeout(()=>verifyOwner().catch(()=>{}),0);
 });
 setInterval(()=>{if(!document.hidden&&ownerScreenActive())verifyOwner().catch(()=>{});},45000);
 resume();
}

// Shared session; authority is still checked only by protected server functions.
export const accountAuthClient=()=>authClient();
export const checkAccountSession=createSessionGuard({getAuth:()=>authClient().auth});

export async function ownerUsers(page=1){if(!Number.isSafeInteger(page)||page<1||page>10000)throw uiError('ownerAuthUi.page');const {data,error}=await authClient().auth.getSession();if(error)throw uiError('deviceUi.signIn');return callOwner(data.session,"?mode=users&page="+page);}

export async function ownerRankUser(id){
 if(typeof id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))throw uiError('ownerAuthUi.rankingUser');
 const {data,error}=await authClient().auth.getSession();
 if(error)throw uiError('deviceUi.signIn');
 const result=await callOwner(data.session,'?mode=rank-user&ids='+encodeURIComponent(id));
 return result.user;
}

// Private account lookup for Support; never feed an account ID to rank-user.
export async function ownerAccountUser(id){
 if(typeof id!=='string'||! /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))throw uiError('ownerAuthUi.user');
 const {data,error}=await authClient().auth.getSession();if(error)throw uiError('deviceUi.signIn');
 const result=await callOwner(data.session,'?mode=account-user&ids='+encodeURIComponent(id));
 return result.user;
}

export async function ownerUserDetails(id){
 if(typeof id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))throw uiError('ownerAuthUi.user');
 const {data,error}=await authClient().auth.getSession();if(error)throw uiError('deviceUi.signIn');
 return callOwner(data.session,'?mode=user&ids='+encodeURIComponent(id)+'&activityDay='+encodeURIComponent(dateKey()));
}
export async function ownerUserAvatar(id){
 if(typeof id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))throw uiError('ownerAuthUi.user');
 const {data,error}=await authClient().auth.getSession();if(error)throw uiError('deviceUi.signIn');
 const blob=await callOwner(data.session,'?mode=user-avatar&ids='+encodeURIComponent(id),{binary:true});
 if(blob.type!=='image/jpeg'||blob.size<3||blob.size>200000)throw uiError('ownerAuthUi.photo');
 const bytes=new Uint8Array(await blob.slice(0,3).arrayBuffer());if(bytes[0]!==255||bytes[1]!==216||bytes[2]!==255)throw uiError('ownerAuthUi.photo');
 return blob;
}

export async function ownerReleases(){const {data,error}=await authClient().auth.getSession();if(error)throw uiError('deviceUi.signIn');return callOwner(data.session,'?mode=releases');}

export async function ownerPreviewAccessToken(){
 if(!ownerVerified())throw uiError('ownerAuthUi.confirmOwner');
 const {data,error}=await authClient().auth.getSession(),session=data?.session;
 if(error||!session?.access_token||session.user?.id!==verifiedOwnerId())throw uiError('ownerAuthUi.confirmOwner');
 return session.access_token;
}

export async function ownerVisitors(days=7){
 if(![1,7,30].includes(days))throw uiError('ownerAuthUi.period');
 const {data,error}=await authClient().auth.getSession();if(error)throw uiError('deviceUi.signIn');
 return callOwner(data.session,'?mode=visitors&days='+days);
}

export async function ownerGeoMembers(days,selection,page=1){
 const {data,error}=await authClient().auth.getSession();if(error)throw uiError('deviceUi.signIn');
 const query=new URLSearchParams({mode:'geography-users',days:String(days),page:String(page),kind:selection.kind});if(selection.city)query.set('city',selection.city);if(selection.country)query.set('country',selection.country);
 return callOwner(data.session,'?'+query);
}

export async function ownerLiveActivity(kind,page=1){
 if(!['listening','reading','dhikr'].includes(kind)||!Number.isSafeInteger(page)||page<1||page>10000)throw uiError('ownerAuthUi.activityKind');
 const{data,error}=await authClient().auth.getSession();if(error)throw uiError('ownerAuthUi.checkFailed');
 return callOwner(data.session,'?mode=live&kind='+kind+'&page='+page);
}

export async function ownerAppActivity(page=1,{signal}={}){
 if(!Number.isSafeInteger(page)||page<1||page>10000)throw uiError('ownerAuthUi.page');
 const{data,error}=await authClient().auth.getSession();if(error)throw uiError('ownerAuthUi.checkFailed');
 return callOwner(data.session,'?mode=app-state&page='+page,{signal});
}
