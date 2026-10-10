import{OWNER_PROJECT_URL,OWNER_PUBLIC_KEY}from './owner-auth.js';
import{read,write}from './storage.js';
import{RECITERS}from './quran-reciters.js';
import{listeningDayKey}from './reciter-popularity-core.js';
import{safeListener}from './reciter-ranking-core.js';
const endpoint=OWNER_PROJECT_URL+'/functions/v1/reciter-competition',allowed=new Set(RECITERS.filter(r=>!r.variantOf).map(r=>r.id));
let account=()=>({signedIn:false}),client=()=>null,snapshot=()=>({totals:{},days:{}}),enabled=()=>false,initialized=false,own=null,scope=null,inflight=null,lastUpload=0,lastOwn=0,lastSignature='',retryAt=0;
export const competitionOwn=()=>own&&scope===account().userId?own:null;
export const competitionAvatar=id=>endpoint+'?avatar='+encodeURIComponent(id);
const announce=()=>window.dispatchEvent(new Event('salah:competition-updated'));
async function request(body=null){
 const user=account().userId;if(!account().signedIn||!user)throw Error('Войдите в аккаунт');
 // Auth status events can run inside the SDK session lock. Leave that callback before requesting the session.
 await new Promise(resolve=>setTimeout(resolve,0));if(account().userId!==user)throw Error('Аккаунт изменился');
 const{data,error}=await client().auth.getSession();if(error||data?.session?.user?.id!==user||account().userId!==user)throw Error('Войдите в аккаунт');
 const response=await fetch(endpoint+(body?'':'?own=true&day='+listeningDayKey(Date.now())+'&participation='+(enabled()?'on':'off')),{method:body?'POST':'GET',headers:{apikey:OWNER_PUBLIC_KEY,Authorization:'Bearer '+data.session.access_token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(15000)});
 if(account().userId!==user)throw Error('Аккаунт изменился');if(!response.ok){const error=Error(response.status===429?'Повторим синхронизацию чуть позже':'Не удалось сохранить. Проверьте соединение.');error.status=response.status;throw error;}return response.json();
}
export async function refreshCompetitionOwn(){if(!account().signedIn){own=null;return null;}const user=account().userId;const data=await request();if(user!==account().userId)return null;own=data;lastOwn=Date.now();announce();return own;}
export async function saveCompetitionSettings(values){await request({action:'settings',...values});await refreshCompetitionOwn();}
export function sharedPersonalTotals(local,period){const cloud=competitionOwn()?.totals?.[period];if(!cloud)return local;const merged={...local};for(const[id,n]of Object.entries(cloud))if(allowed.has(id)&&Number.isSafeInteger(n)&&n>=0)merged[id]=Math.max(merged[id]||0,n);return merged;}
export async function loadCompetition(period='all'){
 const day=listeningDayKey(Date.now());const response=await fetch(endpoint+'?period='+encodeURIComponent(period)+'&day='+day,{headers:{apikey:OWNER_PUBLIC_KEY},credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('unavailable');const data=await response.json();if(data.period!==period||data.day!==day||!Array.isArray(data.items))throw Error('invalid');
 const seen=new Set();return data.items.flatMap(row=>{const person=safeListener(row);if(!person||seen.has(person.id)||!allowed.has(row.reciter)||!Number.isSafeInteger(row.seconds)||row.seconds<=0||!Number.isSafeInteger(row.rank)||row.rank<=0)return[];seen.add(person.id);return[{...person,reciter:row.reciter,seconds:row.seconds,rank:row.rank}];});
}
function deviceId(){const key='competition-device-v1:'+account().userId;let id=read(key,null);if(!/^[a-f0-9-]{36}$/i.test(id||'')){id=crypto.randomUUID();if(!write(key,id))throw Error('Не удалось сохранить устройство');}return id;}
export async function connectCompetitionNotifications(period){
 if(window.Capacitor?.isNativePlatform?.())throw Error('Для уведомлений рейтинга пока используйте SALAH в браузере или с главного экрана.');
 if(!isSecureContext||!('Notification'in window)||!navigator.serviceWorker||!('PushManager'in window))throw Error('На iPhone сначала добавьте SALAH на экран «Домой».');
 const permission=Notification.permission==='granted'?'granted':await Notification.requestPermission();if(permission!=='granted')throw Error('Уведомления не разрешены');
 const configResponse=await fetch(OWNER_PROJECT_URL+'/functions/v1/background-reminders/config',{credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(10000)});if(!configResponse.ok)throw Error('Не удалось подключить уведомления');const config=await configResponse.json();
 const text=config.publicKey||config.vapidPublicKey;if(typeof text!=='string')throw Error('Не удалось получить ключ уведомлений');const bytes=Uint8Array.from(atob(text.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
 const registration=await navigator.serviceWorker.getRegistration('./')||await navigator.serviceWorker.register('./sw.js');await Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>setTimeout(()=>reject(Error('Телефон не ответил. Повторите подключение.')),15000))]);const subscription=await registration.pushManager.getSubscription()||await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes});
 const result=await request({action:'device',device:deviceId(),subscription:subscription.toJSON()});if(result.ok!==true)throw Error('Не удалось сохранить устройство');await saveCompetitionSettings({notify:true,period});
}
export async function syncCompetitionNow(force=false){
 const user=account().signedIn?account().userId:null;if(scope!==user){scope=user;own=null;lastSignature='';lastUpload=lastOwn=retryAt=0;}
 if(!user||!enabled()||navigator.onLine===false||inflight||Date.now()<retryAt)return;
 const task=(async()=>{try{
  if(!own||Date.now()-lastOwn>60000)await refreshCompetitionOwn();if(!own?.enabled||own.mode==='hidden')return;
  const source=snapshot(),totals=Object.fromEntries(Object.entries(source.totals||{}).filter(([id,n])=>allowed.has(id)&&Number.isFinite(n)&&n>=0).map(([id,n])=>[id,Math.floor(n)]));
  const days=Object.fromEntries(Object.entries(source.days||{}).map(([day,rows])=>[day,Object.fromEntries(Object.entries(rows).filter(([id,n])=>allowed.has(id)&&Number.isFinite(n)&&n>=0).map(([id,n])=>[id,Math.floor(n)]))]));
  const signature=JSON.stringify({totals,days});if(!Object.keys(totals).length||signature===lastSignature&&!force||Date.now()-lastUpload<15000)return;
  await request({action:'snapshot',device:deviceId(),totals,days,timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC'});if(user!==account().userId)return;lastSignature=signature;lastUpload=Date.now();await refreshCompetitionOwn();
 }catch{retryAt=Date.now()+15000;}})();inflight=task;try{await task;}finally{if(inflight===task)inflight=null;}
}
export function initCompetition({getAccount,getClient,getSnapshot,isEnabled}){if(initialized)return;initialized=true;account=getAccount;client=getClient;snapshot=getSnapshot;enabled=isEnabled;
 setInterval(()=>void syncCompetitionNow(),15000);window.addEventListener('salah:personal-listening',()=>void syncCompetitionNow());window.addEventListener('online',()=>void syncCompetitionNow());window.addEventListener('salah:counter-status',()=>void syncCompetitionNow());window.addEventListener('salah:popularity-updated',()=>{lastOwn=0;void syncCompetitionNow();});document.addEventListener('visibilitychange',()=>{if(!document.hidden)void syncCompetitionNow();});void syncCompetitionNow();
}
