import{accountAuthClient,OWNER_PROJECT_URL,OWNER_PUBLIC_KEY,ownerVerified}from './owner-auth.js';
import{supportNotice}from './support-notice.js';
import{createNativeSupportClient}from './native-support-core.js';
let client=null;
export function initNativeSupportNotifications(){
 if(client)return client;
 const cap=globalThis.Capacitor,plugin=cap?.isNativePlatform?.()===true&&cap.getPlatform?.()==='android'?cap.Plugins?.SalahSupportPush:null;
 if(!plugin?.getStatus)return null;
 const auth=accountAuthClient();
 client=createNativeSupportClient({plugin,getSession:async()=>{const value=await auth.auth.getSession();return value.error?null:value.data?.session;},
 register:async(session,value)=>{
  const response=await fetch(OWNER_PROJECT_URL+'/functions/v1/native-support-devices',{method:'POST',headers:{apikey:OWNER_PUBLIC_KEY,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify({action:'register',device:value.device,token:value.token}),credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(15000)});
  const result=await response.json();if(!response.ok||result.ok!==true)throw Error(result.error||'registration_unavailable');
 },notice:value=>supportNotice({...value,generic:true,owner:ownerVerified()}),open:thread=>{const target='#support?thread='+thread;if(location.hash!==target)location.hash=target;else window.dispatchEvent(new CustomEvent('salah:support-open',{detail:{thread}}));}});
 const refresh=()=>void client.accountChanged().catch(()=>{});
 auth.auth.onAuthStateChange((_event,session)=>setTimeout(()=>void client.accountChanged(session).catch(()=>{}),0));
 plugin.addListener('message',value=>client.message(value)).catch(()=>{});
 plugin.addListener('open',value=>client.tap(value)).catch(()=>{});
 plugin.addListener('tokenChanged',()=>void client.sync().catch(()=>{})).catch(()=>{});
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refresh();});window.addEventListener('online',refresh);refresh();return client;
}
export async function enableNativeSupportNotifications(){
 const value=initNativeSupportNotifications();if(!value)return {ready:false,message:'Для фоновых уведомлений об ответах обновите приложение.'};
 try{await value.accountChanged();return await value.enable();}catch(error){return {ready:false,message:error?.message?.includes('notifications_denied')?'Разрешите уведомления SALAH в настройках телефона.':'Не удалось подключить уведомления. Проверьте интернет и повторите попытку.'};}
}
