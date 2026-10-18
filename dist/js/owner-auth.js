import{personalDataAllowed}from './audience.js';
import{createAuthTransport}from './auth-transport.js';
import{createSessionGuard}from './auth-session.js';
// Public connection key; owner authority is always checked by the server.
export const OWNER_PROJECT_URL='https://kbltwszfvphgbxdbczsb.supabase.co';
export const OWNER_PUBLIC_KEY='sb_publishable_D2OGfXHyZCN_DQJpR9LTNg_mOD03jnR';
const SESSION_KEY='salah-owner-session-v1'; // Excluded from personal backups.
let client=null,verified=false,verifiedAt=0,verifiedUserId=null,pending=null,revision=0,mfaRequired=false;
const listeners=new Set();
function publish(){for(const fn of listeners)fn();}
function revoke(){mfaRequired=false;const changed=verified;verified=false;verifiedAt=0;verifiedUserId=null;if(changed)publish();}
const ownerScreenActive=()=>typeof location==='undefined'||['#account','#admin','#more','#support'].includes(location.hash.split('?')[0]);
function authClient(){
 if(!personalDataAllowed())throw Error('Личные данные защищены: аккаунт в этом режиме недоступен.');
 if(!client){
  if(!window.supabase?.createClient)throw Error('Сервис входа пока недоступен.');
  client=window.supabase.createClient(OWNER_PROJECT_URL,OWNER_PUBLIC_KEY,{global:{fetch:createAuthTransport()},auth:{storageKey:SESSION_KEY,persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,lockAcquireTimeout:10000}});
  client.auth.onAuthStateChange((event,session)=>{
   const sameOwner=event==='TOKEN_REFRESHED'&&session?.user?.id&&session.user.id===verifiedUserId&&verified;
   if(event==='TOKEN_REFRESHED')checkAccountSession.acceptRefresh(session);
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
async function callOwner(session,query='',{binary=false}={}){
 if(!session?.access_token)throw Error('Войдите в аккаунт владельца.');
 let response;
 try{for(let attempt=0;attempt<2;attempt++){try{response=await fetch(OWNER_PROJECT_URL+'/functions/v1/owner-access'+query,{method:'GET',headers:{apikey:OWNER_PUBLIC_KEY,Authorization:'Bearer '+session.access_token},cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(15000)});if(![502,504].includes(response.status)||attempt)break;}catch(error){if(attempt)throw error;}await new Promise(resolve=>setTimeout(resolve,400));}}
 catch{revoke();throw Error('Не удалось проверить доступ. Проверьте интернет.');}
 if(!response.ok){if(response.status===401||response.status===403||!query)revoke();if(response.status===401)throw Error('Вход истёк. Войдите снова.');if(response.status===403){const denied=Error('Этот аккаунт не имеет доступа к кабинету.');denied.status=403;throw denied;}if(response.status===503&&query)throw Error('Статистика ещё не подключена.');throw Error('Сервис кабинета временно недоступен.');}
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
   if(checked.state!=='valid'||!checked.session){revoke();return false;}
   let result;try{result=await callOwner(checked.session)}catch(error){if(error.status===403){revoke();return false}throw error}
   if(started!==revision)continue;
   if(result.owner!==true){revoke();mfaRequired=result.mfaRequired===true;return false;}
   const changed=!verified;verified=true;verifiedAt=Date.now();verifiedUserId=checked.session.user?.id||null;if(changed)publish();return true;
  }
  revoke();return false;
 })();
 pending=task;try{return await task;}finally{if(pending===task)pending=null;}
}
export async function signInOwner(email,password){
 const {error}=await authClient().auth.signInWithPassword({email:email.trim(),password});
 if(error)throw Error('Не удалось войти. Проверьте почту и пароль.');
 if(!await verifyOwner()&&!mfaRequired)throw Error('Не удалось подтвердить доступ владельца. Попробуйте снова.');
}

export async function ownerMfaFactors(){
 if(!mfaRequired)throw Error('Сначала войдите в аккаунт владельца.');
 const {data,error}=await authClient().auth.mfa.listFactors();
 if(error)throw Error('Не удалось проверить Google Authenticator. Повторите попытку.');
 return (data.totp||[]).filter(factor=>factor.status==='verified');
}
export async function enrollOwnerMfa(){
 if(!mfaRequired||!await verifyOwner()&&!mfaRequired)throw Error('Сначала войдите в аккаунт владельца.');
 const {data,error}=await authClient().auth.mfa.enroll({factorType:'totp',friendlyName:'SALAH '+Date.now(),issuer:'SALAH'});
 if(error)throw Error('Не удалось подготовить привязку. Повторите попытку.');
 return data;
}
export async function verifyOwnerMfa(factorId,code){
 if(!mfaRequired)throw Error('Сначала войдите в аккаунт владельца.');
 if(!/^[0-9]{6}$/.test(code))throw Error('Введите шесть цифр из Google Authenticator.');
 const {error}=await authClient().auth.mfa.challengeAndVerify({factorId,code});
 if(error)throw Error('Код не подошёл. Введите новый код из Google Authenticator.');
 if(!await verifyOwner())throw Error('Не удалось подтвердить защищённый вход. Попробуйте снова.');
}

export async function signOutOwner(){
 revision++;revoke();
 const {error}=await authClient().auth.signOut({scope:'local'});
 if(error)throw Error('Не удалось завершить вход. Проверьте интернет и повторите.');
 publish();
}
export async function ownerStatistics(days=7){
 if(![1,7,30].includes(days))throw Error('Неизвестный период.');
 const {data,error}=await authClient().auth.getSession();
 if(error)throw Error('Войдите снова.');
 return callOwner(data.session,'?mode=stats&days='+days);
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

export async function ownerUsers(page=1){if(!Number.isSafeInteger(page)||page<1||page>10000)throw Error("Неизвестная страница.");const {data,error}=await authClient().auth.getSession();if(error)throw Error("Войдите снова.");return callOwner(data.session,"?mode=users&page="+page);}

export async function ownerUserDetails(id){
 if(typeof id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))throw Error('Неизвестный пользователь.');
 const {data,error}=await authClient().auth.getSession();if(error)throw Error('Войдите снова.');
 return callOwner(data.session,'?mode=user&ids='+encodeURIComponent(id));
}
export async function ownerUserAvatar(id){
 if(typeof id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))throw Error('Неизвестный пользователь.');
 const {data,error}=await authClient().auth.getSession();if(error)throw Error('Войдите снова.');
 const blob=await callOwner(data.session,'?mode=user-avatar&ids='+encodeURIComponent(id),{binary:true});
 if(blob.type!=='image/jpeg'||blob.size<3||blob.size>200000)throw Error('Фото недоступно.');
 const bytes=new Uint8Array(await blob.slice(0,3).arrayBuffer());if(bytes[0]!==255||bytes[1]!==216||bytes[2]!==255)throw Error('Фото недоступно.');
 return blob;
}

export async function ownerReleases(){const {data,error}=await authClient().auth.getSession();if(error)throw Error('Войдите снова.');return callOwner(data.session,'?mode=releases');}
