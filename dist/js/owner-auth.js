// Public connection key; owner authority is always checked by the server.
export const OWNER_PROJECT_URL='https://kbltwszfvphgbxdbczsb.supabase.co';
export const OWNER_PUBLIC_KEY='sb_publishable_D2OGfXHyZCN_DQJpR9LTNg_mOD03jnR';
const SESSION_KEY='salah-owner-session-v1'; // Excluded from personal backups.
let client=null,verified=false,verifiedAt=0,pending=null,revision=0;
const listeners=new Set();
function publish(){for(const fn of listeners)fn();}
function revoke(){const changed=verified;verified=false;verifiedAt=0;if(changed)publish();}
function authClient(){
 if(!client){
  if(!window.supabase?.createClient)throw Error('Сервис входа пока недоступен.');
  client=window.supabase.createClient(OWNER_PROJECT_URL,OWNER_PUBLIC_KEY,{auth:{storageKey:SESSION_KEY,persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  client.auth.onAuthStateChange(()=>{revision++;revoke();queueMicrotask(()=>verifyOwner().catch(()=>{}));});
 }
 return client;
}
export function ownerVerified(){return verified&&Date.now()-verifiedAt<60000;}
export function onOwnerChange(fn){listeners.add(fn);return()=>listeners.delete(fn);}
async function callOwner(session,query=''){
 if(!session?.access_token)throw Error('Войдите в аккаунт владельца.');
 let response;
 try{response=await fetch(OWNER_PROJECT_URL+'/functions/v1/owner-access'+query,{method:'GET',headers:{apikey:OWNER_PUBLIC_KEY,Authorization:'Bearer '+session.access_token},cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(15000)});}
 catch{revoke();throw Error('Не удалось проверить доступ. Проверьте интернет.');}
 if(!response.ok){revoke();if(response.status===401)throw Error('Вход истёк. Войдите снова.');if(response.status===403)throw Error('Этот аккаунт не имеет доступа к кабинету.');if(response.status===503)throw Error('Статистика ещё не подключена.');throw Error('Сервис кабинета временно недоступен.');}
 return response.json();
}
export async function verifyOwner(){
 if(pending)return pending;
 const task=(async()=>{
  const auth=authClient();const {data,error}=await auth.auth.getSession();
  if(error||!data.session){revoke();return false;}
  const started=revision;
  const result=await callOwner(data.session);
  if(started!==revision)return false;
  if(result.owner!==true){revoke();return false;}
  const changed=!verified;verified=true;verifiedAt=Date.now();if(changed)publish();return true;
 })();
 pending=task;try{return await task;}finally{if(pending===task)pending=null;}
}
export async function signInOwner(email,password){
 const {error}=await authClient().auth.signInWithPassword({email:email.trim(),password});
 if(error)throw Error('Не удалось войти. Проверьте почту и пароль.');
 if(!await verifyOwner())throw Error('Не удалось подтвердить доступ владельца. Попробуйте снова.');
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
 const resume=()=>{let stored=false;try{stored=Boolean(localStorage.getItem(SESSION_KEY));}catch{}if(stored)verifyOwner().catch(()=>{});};
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){revoke();resume();}});
 window.addEventListener('online',resume);
 window.addEventListener('storage',event=>{if(event.key===SESSION_KEY){revision++;revoke();resume();}});
 setInterval(()=>{if(!document.hidden&&verified)verifyOwner().catch(()=>{});},45000);
 resume();
}
