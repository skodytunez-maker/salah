import{settingsSectionLabel}from './settings-section-label.js';
import{personalDataAllowed}from './audience.js';
import {normalizeReminders,PRAYER_KEYS} from './reminder-events.js';
import {esc} from './ui.js';
import {resolveInterfaceLanguage} from './interface-languages.js';
import {notice,noticeText,noticeMarkup,noticeLeaf,noticeError,noticeErrorValue} from './notification-ui.js';
const API='https://kbltwszfvphgbxdbczsb.supabase.co/functions/v1/background-reminders';
const KEY='salah:push-install-v1';
const IOS=()=>/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const nativeRuntime=()=>globalThis.Capacitor?.isNativePlatform?.()===true;
const NATIVE_GUIDE=notice('nativeGuide');
const installed=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
export function pushPreferences(s){
 const p={city:s.city&&{name:s.city.name,latitude:s.city.latitude,longitude:s.city.longitude,timezone:s.city.timezone},method:s.method,school:s.school,highLatitude:s.highLatitude,tyumenTimeSource:s.tyumenTimeSource||'auto',offsets:Object.fromEntries(PRAYER_KEYS.map(k=>[k,Number(s.offsets?.[k]||0)])),tableOffsets:Object.fromEntries(PRAYER_KEYS.map(k=>[k,Number(s.tableOffsets?.[k]||0)])),mosque:s.mosque===true,mosqueTimes:s.mosque===true?{...s.mosqueTimes}:{},reminders:normalizeReminders(s.reminders)};
 p.language=resolveInterfaceLanguage(s.uiLanguage,globalThis.navigator?.languages||[globalThis.navigator?.language]);
 p.reminders.browserNotifications=false;return p;
}
function read(){try{const state=JSON.parse(localStorage.getItem(KEY)||'null');return state&&/^[a-f0-9]{64}$/.test(state.token)&&typeof state.id==='string'?state:null;}catch{return null;}}
function notifyStatus(){window.dispatchEvent(new Event('salah:notification-status-changed'));}
function write(state){localStorage.setItem(KEY,JSON.stringify(state));notifyStatus();}
function newDevice(){const state={id:crypto.randomUUID(),token:Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join(''),saved:false,pendingRemoval:false,lastSync:0};write(state);return state;}
function keyBytes(value){return Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));}
export async function waitForPushOperation(task,timeoutMs=10000){
 let timer;
 try{return await Promise.race([task,new Promise((_,reject)=>{timer=setTimeout(()=>reject(noticeError('phoneTimeout')),timeoutMs);})]);}
 finally{clearTimeout(timer);}
}
export function pushConnectionReport({supported=false,enabled=false,city=false,permission='default',subscription=false,saved=false,current=false,service=false}={}){
 const checks=[
  {labelKey:'reportReminders',ok:enabled,detailKey:'reportEnable'},
  {labelKey:'reportCity',ok:city,detailKey:'reportCityHint'},
  {labelKey:'reportPermission',ok:supported&&permission==='granted',detailKey:!supported?'reportUnsupported':permission==='denied'?'reportPermissionHint':'reportEnableHint'},
  {labelKey:'reportSubscription',ok:subscription,detailKey:'reportEnableHint'},
  {labelKey:'reportDelivery',ok:service,detailKey:'reportInternet'},
  {labelKey:'reportSaved',ok:saved&&current,detailKey:saved?'reportUpdate':'reportConnect'}
 ];
 return {ready:checks.every(row=>row.ok),checks:checks.map(row=>({...row,detailKey:row.ok?'ready':row.detailKey,label:noticeText(notice(row.labelKey)),detail:noticeText(notice(row.ok?'ready':row.detailKey))}))};
}
export function createPushReminders({getSettings,toast=()=>{}}){
 let mounted=null,busy=false,status='',config=null,onlineReady=false,needsSync=false,timer,state=read(),lastSignature=state?.signature||'',configLoading=null,lastConfigAttempt=0,diagnostic=null;
 const supported=()=>personalDataAllowed()&&!nativeRuntime()&&globalThis.isSecureContext&&'Notification'in globalThis&&'PushManager'in globalThis&&!!navigator.serviceWorker&&(!IOS()||installed());
 async function call(action,body){
  if(!personalDataAllowed())throw noticeError('dataProtected');
  const response=await fetch(API+'/'+action,{method:body?'POST':'GET',mode:'cors',cache:'no-store',credentials:'omit',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000)});
  const result=await response.json().catch(()=>({}));if(!response.ok)throw(result.error?Error(result.error):noticeError('deliveryUnavailable'));return result;
 }
 const deviceBody=()=>({id:state.id,token:state.token});
 async function registration(){
  const reg=await waitForPushOperation((async()=>{const found=await navigator.serviceWorker.getRegistration();return found?.active?found:await navigator.serviceWorker.ready;})());
  if(!reg?.active||!reg.pushManager)throw noticeError('serviceWorkerNotReady');
  return reg;
 }
 async function loadConfig(force=false){
  if(configLoading)return configLoading;
  if(!force&&lastConfigAttempt&&Date.now()-lastConfigAttempt<30000)return;
  lastConfigAttempt=Date.now();
  configLoading=(async()=>{try{const next=await call('config'),bytes=typeof next.publicKey==='string'?keyBytes(next.publicKey):null;if(!bytes||bytes.length!==65||bytes[0]!==4)throw Error();config=next;if(!state||status?.key==='notifyUi.deliveryServiceDown')status=state?.saved&&onlineReady?(normalizeReminders(getSettings().reminders).enabled?notice('backgroundConnected'):notice('subscriptionSavedOff')):notice('deliveryReady');}catch{config=null;status=notice('deliveryServiceDown');}finally{draw();}})();
  try{await configLoading}finally{configLoading=null}
 }

 async function sync(force=false){
  if(busy){needsSync=true;return;}
  if(!state||(!state.pendingRemoval&&(!supported()||Notification.permission!=='granted')))return;
  const p=pushPreferences(getSettings()),signature=JSON.stringify(p);
  if(!force&&!state.pendingRemoval&&state.saved&&onlineReady&&signature===lastSignature&&Date.now()-state.lastSync<86400000)return;
  busy=true;draw();
  try{
   if(state.pendingRemoval){await call('unsubscribe',deviceBody());localStorage.removeItem(KEY);state=null;notifyStatus();onlineReady=false;status=notice('subscriptionRemoved');return;}
   if(!p.city)throw noticeError('chooseCityFirst');
   const reg=await registration(),sub=await waitForPushOperation(reg.pushManager.getSubscription());
   if(!sub){onlineReady=false;status=notice('resumeSubscription');return;}
   await call('subscribe',{...deviceBody(),subscription:sub.toJSON(),preferences:p});
   state={...state,saved:true,lastSync:Date.now(),signature};write(state);lastSignature=signature;onlineReady=true;
   status=p.reminders.enabled?notice('backgroundConnected'):notice('subscriptionSavedOff');
  }catch(error){onlineReady=false;status=notice('deliverySaveFailed',{error:noticeText(noticeErrorValue(error))});}
  finally{busy=false;draw();if(needsSync){needsSync=false;queue();}}
 }
 async function enable({supportOnly=false}={}){
  if(busy||!supported()||!getSettings().city||(!supportOnly&&!normalizeReminders(getSettings().reminders).enabled)||Notification.permission==='denied')return {ready:false,message:noticeText(notice('permissionAndSettings')),messageUi:notice('permissionAndSettings')};
  // Permission is requested directly by this button, never on app startup.
  let connected=false;busy=true;status=notice('connecting');draw();
  try{
   if(await Notification.requestPermission()!=='granted')throw noticeError('allowInSettings');
   if(!config)await loadConfig(true);if(!config)throw noticeError('serviceRetryLater');
   if(!state)state=newDevice();
   const reg=await registration();let sub=await waitForPushOperation(reg.pushManager.getSubscription());
   const wanted=keyBytes(config.publicKey),actual=sub?.options?.applicationServerKey;
   if(sub&&(!state.saved||actual&&!sameKey(new Uint8Array(actual),wanted))){if(!await waitForPushOperation(sub.unsubscribe()))throw noticeError('phoneUpdateFailed');sub=null;}
   if(!sub)sub=await waitForPushOperation(reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:wanted}));
   state.pendingRemoval=false;write(state);busy=false;await sync(true);connected=onlineReady&&!!state?.saved&&!state.pendingRemoval&&lastSignature===JSON.stringify(pushPreferences(getSettings()))&&Notification.permission==='granted';
  }catch(error){status=noticeErrorValue(error)||notice('connectNotificationsFailed');toast(noticeText(status));}
  finally{busy=false;draw();}
  return {ready:connected,message:noticeText(status),messageUi:typeof status==='object'?status:undefined};
 }
 async function disable(){
  if(busy||!state)return;busy=true;draw();
  try{
   const reg=await registration(),sub=await waitForPushOperation(reg.pushManager.getSubscription());if(sub&&!await waitForPushOperation(sub.unsubscribe()))throw noticeError('phoneDisconnectFailed');
   onlineReady=false;state={...state,saved:false,pendingRemoval:true};write(state);
   try{await call('unsubscribe',deviceBody());localStorage.removeItem(KEY);state=null;notifyStatus();status=notice('backgroundDisabled');}catch{status=notice('serverRemovalPending');}
  }catch(error){status=noticeErrorValue(error);}
  finally{busy=false;draw();}
 }
 async function test(){
  if(busy||!onlineReady||!state)return;busy=true;draw();
  try{await call('test',deviceBody());status=notice('testSent');}catch(error){status=noticeErrorValue(error);}
  finally{busy=false;draw();}
 }
 async function diagnose(){
  if(busy)return;busy=true;diagnostic=null;status=notice('checkingConnection');draw();
  try{
   state=read();await loadConfig(true);let subscription=false;
   if(supported()&&Notification.permission==='granted'){
    try{const reg=await registration();subscription=!!await waitForPushOperation(reg.pushManager.getSubscription());}catch{subscription=false;}
   }
   const p=pushPreferences(getSettings());
   const selected=PRAYER_KEYS.some(key=>p.reminders.prayers[key].atTime||p.reminders.prayers[key].beforeMinutes>0)||Object.values(p.reminders.adhkar).some(row=>row.enabled)||p.reminders.jumuah.enabled||p.reminders.tahajjud.enabled||p.reminders.dhikr.enabled;
   diagnostic=pushConnectionReport({supported:supported(),enabled:p.reminders.enabled&&selected,city:!!p.city,permission:typeof Notification==='undefined'?'unsupported':Notification.permission,subscription,saved:!!state?.saved&&!state.pendingRemoval,current:onlineReady&&lastSignature===JSON.stringify(p),service:!!config});
   status=diagnostic.ready?notice('diagnosticReady'):notice('diagnosticAttention');
  }catch{status=notice('diagnosticFailed');}
  finally{busy=false;draw();if(needsSync){needsSync=false;queue();}}
 }
 function draw(){
  if(!mounted?.isConnected)return;
  const p=normalizeReminders(getSettings().reminders),active=!!state?.saved&&!state.pendingRemoval&&typeof Notification!=='undefined'&&Notification.permission==='granted';
  let guide='';if(nativeRuntime())guide=NATIVE_GUIDE;else if(IOS()&&!installed())guide=notice('iphoneInstall');
  else if(!supported())guide=notice('browserUnsupported');
  else if(Notification.permission==='denied')guide=notice('notificationsBlocked');
  mounted.innerHTML='<h3>'+settingsSectionLabel('background',noticeLeaf('backgroundTitle'))+'</h3><p class="reminder-voice-note">'+noticeLeaf('webBackgroundDescription')+'</p>'+(!active?'<p class="reminder-voice-note">'+noticeLeaf('webConsent')+'</p>':'')+(guide?'<p class="reminder-notice">'+noticeMarkup(guide)+'</p>':'')+(!p.enabled?'<p class="reminder-voice-note">'+noticeLeaf('masterFirst')+'</p>':'')+'<div class="reminder-preview"><button type="button" data-push-enable '+(!supported()||!p.enabled||!getSettings().city||!config||busy||!!guide?'disabled':'')+'>'+noticeLeaf(active?'updateConnection':'enableBackground')+'</button>'+(state?'<button type="button" data-push-disable '+(busy?'disabled':'')+'>'+noticeLeaf('disconnect')+'</button>':'')+'</div>'+(active?'<button class="button secondary" type="button" data-push-test '+(busy||!onlineReady?'disabled':'')+'>'+noticeLeaf('testNotification')+'</button>':'')+'<p class="reminder-status" role="status">'+noticeMarkup(status||notice(config?'deliveryReady':'checkingDelivery'))+'</p>';
  mounted.innerHTML+='<button class="button secondary" type="button" data-push-diagnose '+(busy?'disabled':'')+'>'+noticeLeaf('checkConnection')+'</button>'+(diagnostic?'<ul class="reminder-voice-note">'+diagnostic.checks.map(row=>'<li>'+noticeLeaf(row.labelKey)+': '+noticeLeaf(row.detailKey)+'</li>').join('')+'</ul>':'');
  mounted.querySelector('[data-push-enable]').onclick=enable;const off=mounted.querySelector('[data-push-disable]');if(off)off.onclick=disable;const check=mounted.querySelector('[data-push-test]');if(check)check.onclick=test;mounted.querySelector('[data-push-diagnose]').onclick=diagnose;
 }
 function queue(){clearTimeout(timer);timer=setTimeout(()=>{timer=null;sync();},1200);}
 window.addEventListener('salah:settings-changed',()=>{diagnostic=null;queue();draw();});
 window.addEventListener('salah:interface-language-changed',()=>{queue();draw();});
 window.addEventListener('storage',event=>{if(event.key==='salah:settings'){queue();}else if(event.key===KEY){state=read();onlineReady=false;queue();draw();}});
 window.addEventListener('salah:enable-support-notifications',event=>{if(typeof event.detail?.reply==='function')void enable({supportOnly:true}).then(event.detail.reply);});
 window.addEventListener('online',()=>{loadConfig(true);sync(true);});
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){state=read();if(!config)loadConfig();sync();}});
 loadConfig();sync(true);
 return {enable,invitationState:()=>({supported:supported(),permission:typeof Notification==='undefined'?'unsupported':Notification.permission,hasDevice:!!state&&(state.saved===true||state.pendingRemoval===true),guide:noticeText(nativeRuntime()?NATIVE_GUIDE:IOS()&&!installed()?notice('iphoneHomeGuide'):!supported()?notice('installedGuide'):''),guideUi:nativeRuntime()?NATIVE_GUIDE:IOS()&&!installed()?notice('iphoneHomeGuide'):!supported()?notice('installedGuide'):null}),mount(container){mounted=container;draw();},active:()=>!!state?.saved&&!state.pendingRemoval&&onlineReady&&lastSignature===JSON.stringify(pushPreferences(getSettings()))&&supported()&&Notification.permission==='granted',sync};
}
function sameKey(a,b){return a.length===b.length&&a.every((n,i)=>n===b[i]);}
