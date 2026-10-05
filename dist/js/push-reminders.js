import {normalizeReminders,PRAYER_KEYS} from './reminder-events.js';
import {esc} from './ui.js';
const API='https://kbltwszfvphgbxdbczsb.supabase.co/functions/v1/background-reminders';
const KEY='salah:push-install-v1';
const IOS=()=>/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const installed=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
export function pushPreferences(s){
 const p={city:s.city&&{name:s.city.name,latitude:s.city.latitude,longitude:s.city.longitude,timezone:s.city.timezone},method:s.method,school:s.school,highLatitude:s.highLatitude,tyumenTimeSource:s.tyumenTimeSource||'auto',offsets:Object.fromEntries(PRAYER_KEYS.map(k=>[k,Number(s.offsets?.[k]||0)])),tableOffsets:Object.fromEntries(PRAYER_KEYS.map(k=>[k,Number(s.tableOffsets?.[k]||0)])),mosque:s.mosque===true,mosqueTimes:s.mosque===true?{...s.mosqueTimes}:{},reminders:normalizeReminders(s.reminders)};
 p.reminders.browserNotifications=false;return p;
}
function read(){try{const state=JSON.parse(localStorage.getItem(KEY)||'null');return state&&/^[a-f0-9]{64}$/.test(state.token)&&typeof state.id==='string'?state:null;}catch{return null;}}
function notifyStatus(){window.dispatchEvent(new Event('salah:notification-status-changed'));}
function write(state){localStorage.setItem(KEY,JSON.stringify(state));notifyStatus();}
function newDevice(){const state={id:crypto.randomUUID(),token:Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join(''),saved:false,pendingRemoval:false,lastSync:0};write(state);return state;}
function keyBytes(value){return Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));}
export async function waitForPushOperation(task,timeoutMs=10000){
 let timer;
 try{return await Promise.race([task,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Телефон не ответил. Повторите проверку подключения.')),timeoutMs);})]);}
 finally{clearTimeout(timer);}
}
export function pushConnectionReport({supported=false,enabled=false,city=false,permission='default',subscription=false,saved=false,current=false,service=false}={}){
 const checks=[
  {label:'Напоминания',ok:enabled,detail:'Включите напоминания выше.'},
  {label:'Город',ok:city,detail:'Выберите город в настройках.'},
  {label:'Разрешение телефона',ok:supported&&permission==='granted',detail:!supported?'В этом режиме фоновые веб-уведомления не поддерживаются.':permission==='denied'?'Разрешите уведомления в системных настройках SALAH.':'Нажмите «Включить фоновые уведомления».'},
  {label:'Подписка телефона',ok:subscription,detail:'Нажмите «Включить фоновые уведомления».'},
  {label:'Сервис доставки',ok:service,detail:'Проверьте интернет и повторите проверку.'},
  {label:'Сохранение настроек',ok:saved&&current,detail:'Нажмите «Обновить подключение», чтобы сохранить текущие настройки.'}
 ];
 return {ready:checks.every(row=>row.ok),checks:checks.map(row=>({...row,detail:row.ok?'Готово':row.detail}))};
}
export function createPushReminders({getSettings,toast=()=>{}}){
 let mounted=null,busy=false,status='',config=null,onlineReady=false,needsSync=false,timer,state=read(),lastSignature=state?.signature||'',configLoading=null,lastConfigAttempt=0,diagnostic=null;
 const supported=()=>globalThis.isSecureContext&&'Notification'in globalThis&&'PushManager'in globalThis&&!!navigator.serviceWorker&&(!IOS()||installed());
 async function call(action,body){
  const response=await fetch(API+'/'+action,{method:body?'POST':'GET',mode:'cors',cache:'no-store',credentials:'omit',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000)});
  const result=await response.json().catch(()=>({}));if(!response.ok)throw Error(result.error||'Доставка временно недоступна');return result;
 }
 const deviceBody=()=>({id:state.id,token:state.token});
 async function registration(){
  const reg=await waitForPushOperation((async()=>{const found=await navigator.serviceWorker.getRegistration();return found?.active?found:await navigator.serviceWorker.ready;})());
  if(!reg?.active||!reg.pushManager)throw Error('Фоновая служба SALAH ещё не готова. Обновите приложение и повторите подключение.');
  return reg;
 }
 async function loadConfig(force=false){
  if(configLoading)return configLoading;
  if(!force&&lastConfigAttempt&&Date.now()-lastConfigAttempt<30000)return;
  lastConfigAttempt=Date.now();
  configLoading=(async()=>{try{const next=await call('config'),bytes=typeof next.publicKey==='string'?keyBytes(next.publicKey):null;if(!bytes||bytes.length!==65||bytes[0]!==4)throw Error();config=next;if(!state||status.startsWith('Сервис доставки пока недоступен.'))status=state?.saved&&onlineReady?(normalizeReminders(getSettings().reminders).enabled?'Фоновые уведомления подключены.':'Подписка сохранена. Напоминания выключены переключателем выше.'):'Доставка готова к подключению.';}catch{config=null;status='Сервис доставки пока недоступен. Настройки напоминаний сохранены.';}finally{draw();}})();
  try{await configLoading}finally{configLoading=null}
 }

 async function sync(force=false){
  if(busy){needsSync=true;return;}
  if(!state||(!state.pendingRemoval&&(!supported()||Notification.permission!=='granted')))return;
  const p=pushPreferences(getSettings()),signature=JSON.stringify(p);
  if(!force&&!state.pendingRemoval&&state.saved&&onlineReady&&signature===lastSignature&&Date.now()-state.lastSync<86400000)return;
  busy=true;draw();
  try{
   if(state.pendingRemoval){await call('unsubscribe',deviceBody());localStorage.removeItem(KEY);state=null;notifyStatus();onlineReady=false;status='Фоновая подписка отключена.';return;}
   if(!p.city)throw Error('Сначала выберите город.');
   const reg=await registration(),sub=await waitForPushOperation(reg.pushManager.getSubscription());
   if(!sub){onlineReady=false;status='Нажмите «Включить фоновые уведомления», чтобы возобновить подписку.';return;}
   await call('subscribe',{...deviceBody(),subscription:sub.toJSON(),preferences:p});
   state={...state,saved:true,lastSync:Date.now(),signature};write(state);lastSignature=signature;onlineReady=true;
   status=p.reminders.enabled?'Фоновые уведомления подключены.':'Подписка сохранена. Напоминания выключены переключателем выше.';
  }catch(error){onlineReady=false;status='Не удалось сохранить доставку: '+error.message+'. Попробуем при следующем подключении.';}
  finally{busy=false;draw();if(needsSync){needsSync=false;queue();}}
 }
 async function enable(){
  if(busy||!supported()||!getSettings().city||!normalizeReminders(getSettings().reminders).enabled)return;
  // Permission is requested directly by this button, never on app startup.
  const permissionTask=Notification.requestPermission();busy=true;status='Подключаем…';draw();
  try{
   if(await permissionTask!=='granted')throw Error('Разрешите уведомления в настройках телефона.');
   if(!config)await loadConfig(true);if(!config)throw Error('Сервис доставки пока недоступен. Повторите позже.');
   if(!state)state=newDevice();
   const reg=await registration();let sub=await waitForPushOperation(reg.pushManager.getSubscription());
   const wanted=keyBytes(config.publicKey),actual=sub?.options?.applicationServerKey;
   if(sub&&(!state.saved||actual&&!sameKey(new Uint8Array(actual),wanted))){if(!await waitForPushOperation(sub.unsubscribe()))throw Error('Телефон не обновил подписку. Повторите подключение.');sub=null;}
   if(!sub)sub=await waitForPushOperation(reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:wanted}));
   state.pendingRemoval=false;write(state);busy=false;await sync(true);
  }catch(error){status=error.message||'Не удалось подключить уведомления.';toast(status);}
  finally{busy=false;draw();}
 }
 async function disable(){
  if(busy||!state)return;busy=true;draw();
  try{
   const reg=await registration(),sub=await waitForPushOperation(reg.pushManager.getSubscription());if(sub&&!await waitForPushOperation(sub.unsubscribe()))throw Error('Телефон не отключил подписку. Повторите попытку.');
   onlineReady=false;state={...state,saved:false,pendingRemoval:true};write(state);
   try{await call('unsubscribe',deviceBody());localStorage.removeItem(KEY);state=null;notifyStatus();status='Фоновые уведомления отключены.';}catch{status='На телефоне отключены. Удалим серверную подписку при следующем подключении.';}
  }catch(error){status=error.message;}
  finally{busy=false;draw();}
 }
 async function test(){
  if(busy||!onlineReady||!state)return;busy=true;draw();
  try{await call('test',deviceBody());status='Проверка отправлена. Посмотрите уведомления телефона.';}catch(error){status=error.message;}
  finally{busy=false;draw();}
 }
 async function diagnose(){
  if(busy)return;busy=true;diagnostic=null;status='Проверяем подключение…';draw();
  try{
   state=read();await loadConfig(true);let subscription=false;
   if(supported()&&Notification.permission==='granted'){
    try{const reg=await registration();subscription=!!await waitForPushOperation(reg.pushManager.getSubscription());}catch{subscription=false;}
   }
   const p=pushPreferences(getSettings());
   const selected=PRAYER_KEYS.some(key=>p.reminders.prayers[key].atTime||p.reminders.prayers[key].beforeMinutes>0)||Object.values(p.reminders.adhkar).some(row=>row.enabled)||p.reminders.jumuah.enabled||p.reminders.tahajjud.enabled;
   diagnostic=pushConnectionReport({supported:supported(),enabled:p.reminders.enabled&&selected,city:!!p.city,permission:typeof Notification==='undefined'?'unsupported':Notification.permission,subscription,saved:!!state?.saved&&!state.pendingRemoval,current:onlineReady&&lastSignature===JSON.stringify(p),service:!!config});
   status=diagnostic.ready?'Подключение готово. Доставку проверьте тестовым уведомлением.':'Подключение требует внимания. Проверьте пункты ниже.';
  }catch{status='Не удалось проверить подключение. Повторите позже.';}
  finally{busy=false;draw();if(needsSync){needsSync=false;queue();}}
 }
 function draw(){
  if(!mounted?.isConnected)return;
  const p=normalizeReminders(getSettings().reminders),active=!!state?.saved&&!state.pendingRemoval&&typeof Notification!=='undefined'&&Notification.permission==='granted';
  let guide='';if(IOS()&&!installed())guide='На iPhone откройте SALAH в Safari → «Поделиться» → «На экран Домой». Затем включите уведомления из установленного приложения (iOS 16.4 или новее).';
  else if(!supported())guide='Этот браузер не поддерживает фоновые уведомления. На телефоне попробуйте установленное SALAH в Safari или Chrome.';
  else if(Notification.permission==='denied')guide='Уведомления запрещены. Разрешите их в системных настройках SALAH.';
  mounted.innerHTML='<h3>Когда SALAH свёрнуто</h3><p class="reminder-voice-note">Уведомления о намазах, Тахаджуде, азкарах и Джума по настройкам выше. Звук — системный; полный Азан прослушивается в открытом приложении.</p>'+(!active?'<p class="reminder-voice-note">При включении Supabase сохранит подписку, координаты выбранного города и параметры напоминаний. История молитв и счётчики не передаются сервису уведомлений.</p>':'')+(guide?'<p class="reminder-notice">'+esc(guide)+'</p>':'')+(!p.enabled?'<p class="reminder-voice-note">Сначала включите напоминания переключателем выше.</p>':'')+'<div class="reminder-preview"><button type="button" data-push-enable '+(!supported()||!p.enabled||!getSettings().city||!config||busy||!!guide?'disabled':'')+'>'+(active?'Обновить подключение':'Включить фоновые уведомления')+'</button>'+(state?'<button type="button" data-push-disable '+(busy?'disabled':'')+'>Отключить</button>':'')+'</div>'+(active?'<button class="button secondary" type="button" data-push-test '+(busy||!onlineReady?'disabled':'')+'>Тестовое уведомление</button>':'')+'<p class="reminder-status" role="status">'+esc(status||(config?'Доставка готова к подключению.':'Проверяем доступность доставки…'))+'</p>';
  mounted.innerHTML+='<button class="button secondary" type="button" data-push-diagnose '+(busy?'disabled':'')+'>Проверить подключение</button>'+(diagnostic?'<ul class="reminder-voice-note">'+diagnostic.checks.map(row=>'<li>'+esc(row.label)+': '+esc(row.detail)+'</li>').join('')+'</ul>':'');
  mounted.querySelector('[data-push-enable]').onclick=enable;const off=mounted.querySelector('[data-push-disable]');if(off)off.onclick=disable;const check=mounted.querySelector('[data-push-test]');if(check)check.onclick=test;mounted.querySelector('[data-push-diagnose]').onclick=diagnose;
 }
 function queue(){clearTimeout(timer);timer=setTimeout(()=>sync(),1200);}
 window.addEventListener('salah:settings-changed',()=>{diagnostic=null;queue();draw();});
 window.addEventListener('storage',event=>{if(event.key==='salah:settings'){queue();}else if(event.key===KEY){state=read();onlineReady=false;queue();draw();}});
 window.addEventListener('online',()=>{loadConfig(true);sync(true);});
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){state=read();if(!config)loadConfig();sync();}});
 loadConfig();sync(true);
 return {mount(container){mounted=container;draw();},active:()=>!!state?.saved&&!state.pendingRemoval&&onlineReady&&lastSignature===JSON.stringify(pushPreferences(getSettings()))&&supported()&&Notification.permission==='granted',sync};
}
function sameKey(a,b){return a.length===b.length&&a.every((n,i)=>n===b[i]);}
