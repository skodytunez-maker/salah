import{buildReminderEvents,normalizeReminders,shiftDay}from './reminder-events.js';

const MAX_PENDING=48;
const HORIZON_DAYS=7;
const MARKER='salahReminder';
const FUTURE_GUARD=3000;

const pluginFor=cap=>cap?.Plugins?.LocalNotifications;
export const nativeLocalNotificationsAvailable=(cap=globalThis.Capacitor)=>Boolean(pluginFor(cap)?.checkPermissions&&pluginFor(cap)?.getPending&&pluginFor(cap)?.schedule&&pluginFor(cap)?.cancel);

function managed(item){return item?.extra?.[MARKER]===true||item?.extra?.[MARKER]==='true'}
function publicKey(event){return [event.day,event.kind,event.key,event.phase,event.at].join('|')}
function stableId(value){
 let hash=2166136261;
 for(let i=0;i<value.length;i++){hash^=value.charCodeAt(i);hash=Math.imul(hash,16777619)>>>0}
 return (hash&0x7fffffff)||1;
}
function routeFor(event){return event.kind==='adhkar'?'#adhkar':'#home'}
function permissionValue(result){return ['granted','denied','prompt','prompt-with-rationale'].includes(result?.display)?result.display:'prompt'}

export function buildNativeLocalNotifications(setting,context,{now=Date.now(),horizonDays=HORIZON_DAYS,maxPending=MAX_PENDING}={}){
 const config=normalizeReminders(setting?.reminders);
 if(!config.enabled||!setting?.city||!context?.cityKey||typeof context?.timingsFor!=='function'||!shiftDay(context.today,0))return [];
 const days=Math.max(1,Math.min(14,Number.isInteger(horizonDays)?horizonDays:HORIZON_DAYS));
 const limit=Math.max(1,Math.min(MAX_PENDING,Number.isInteger(maxPending)?maxPending:MAX_PENDING));
 const unique=new Map();
 for(let offset=0;offset<days;offset++){
  const day=shiftDay(context.today,offset);if(!day)break;
  const events=buildReminderEvents(config,{...context,today:day,tomorrow:shiftDay(day,1),timeZone:context.timeZone||setting.city.timezone});
  for(const event of events){
   if(event.at<=now+FUTURE_GUARD||event.day<context.today)continue;
   const key=publicKey(event);if(!unique.has(key))unique.set(key,event);
  }
 }
 const ordered=[...unique.values()].sort((a,b)=>a.at-b.at||publicKey(a).localeCompare(publicKey(b))).slice(0,limit);
 const used=new Set();
 return ordered.map(event=>{
  let id=stableId(publicKey(event));while(used.has(id))id=id===2147483647?1:id+1;used.add(id);
  return {id,title:'SALAH',body:event.message,schedule:{at:new Date(event.at)},extra:{[MARKER]:true,route:routeFor(event)}};
 });
}

export function createNativeLocalReminders({getSettings,getContext,toast=()=>{},cap=globalThis.Capacitor}={}){
 const plugin=pluginFor(cap);
 const supported=()=>nativeLocalNotificationsAvailable(cap);
 let mounted=null,lastPermission='prompt',lastCount=0,busy=false,status='',timer=null,needsSync=false,destroyed=false;

 async function pending(){const value=await plugin.getPending();return Array.isArray(value?.notifications)?value.notifications:[]}
 async function clearManaged(){
  if(!supported())return 0;
  const ours=(await pending()).filter(managed);
  if(ours.length)await plugin.cancel({notifications:ours.map(item=>({id:item.id}))});
  lastCount=0;return ours.length;
 }
 function draw(){
  if(!mounted?.isConnected||destroyed)return;
  const p=normalizeReminders(getSettings()?.reminders),city=getSettings()?.city;
  const denied=lastPermission==='denied',granted=lastPermission==='granted';
  mounted.innerHTML='<h3>Когда SALAH свёрнуто</h3><p class="reminder-voice-note">Системные напоминания планируются прямо на этом телефоне. После загрузки расписания сервер для их доставки не нужен.</p><p class="reminder-voice-note">Полный Азан в фоне пока не включён — звук и показ уведомления контролирует система телефона.</p>'+
   (!p.enabled?'<p class="reminder-voice-note">Сначала включите «Азан и напоминания» выше.</p>':'')+
   (!city?'<p class="reminder-notice">Сначала выберите город.</p>':'')+
   (denied?'<p class="reminder-notice">Уведомления запрещены. Разрешите их в системных настройках SALAH.</p>':'')+
   '<div class="reminder-preview"><button type="button" data-native-notifications '+(busy||!p.enabled||!city||denied?'disabled':'')+'>'+(granted?'Обновить уведомления':'Разрешить уведомления')+'</button></div><p class="reminder-status" data-native-status role="status"></p>';
  const state=mounted.querySelector('[data-native-status]');if(state)state.textContent=status||(granted?(lastCount?'Запланировано: '+lastCount:'Расписание готово к синхронизации.'):'Разрешение запрашивается только после нажатия.');
  const button=mounted.querySelector('[data-native-notifications]');if(button)button.onclick=async()=>{if(granted)await sync(true);else await requestPermission();};
 }
 async function permission(){if(!supported())return'unsupported';try{return lastPermission=permissionValue(await plugin.checkPermissions())}catch{return lastPermission='prompt'}}
 async function sync(force=false){
  if(!supported()||destroyed)return{status:'unavailable',count:0};
  if(busy){needsSync=true;return{status:'queued',count:lastCount}};
  const setting=getSettings?.()||{},context=getContext?.()||{},preferences=normalizeReminders(setting.reminders);
  if(!preferences.enabled||!setting.city){
   busy=true;draw();try{const cleared=await clearManaged();status=preferences.enabled?'Выберите город, чтобы подготовить напоминания.':'Системные напоминания выключены.';return{status:'cleared',count:0,cleared}}catch{status='Не удалось обновить системные напоминания.';return{status:'error',count:lastCount}}finally{busy=false;draw();}
  }
  const wanted=buildNativeLocalNotifications(setting,context);
  if(!wanted.length){status='Нет загруженного будущего расписания. Откройте SALAH с интернетом и повторите.';draw();return{status:'no-data',count:lastCount}}
  const access=await permission();if(access!=='granted'){status=access==='denied'?'Уведомления запрещены в настройках телефона.':'Нажмите «Разрешить уведомления», чтобы включить системную доставку.';draw();return{status:'permission',permission:access,count:lastCount}}
  busy=true;draw();
  try{
   const ours=(await pending()).filter(managed),have=new Set(ours.map(item=>item.id)),need=new Set(wanted.map(item=>item.id));
   const same=!force&&have.size===need.size&&[...need].every(id=>have.has(id));
   if(same){lastCount=ours.length;status='Системные напоминания актуальны.';return{status:'unchanged',count:lastCount}}
   if(ours.length)await plugin.cancel({notifications:ours.map(item=>({id:item.id}))});
   if(await permission()!=='granted'){status='Разрешение на уведомления изменилось. Проверьте настройки телефона.';return{status:'permission',permission:lastPermission,count:0}}
   const scheduled=await plugin.schedule({notifications:wanted});
   const scheduledIds=Array.isArray(scheduled?.notifications)?scheduled.notifications.map(item=>item.id):wanted.map(item=>item.id);
   lastCount=scheduledIds.length;status='Системные напоминания обновлены: '+lastCount+'.';return{status:'updated',count:lastCount};
  }catch(error){status='Не удалось запланировать системные напоминания.';toast(status);return{status:'error',count:lastCount,error:error?.message||''}}
  finally{busy=false;draw();if(needsSync){needsSync=false;queue();}}
 }
 async function requestPermission(){
  if(!supported()||destroyed)return{status:'unavailable'};
  const setting=getSettings?.()||{};if(!normalizeReminders(setting.reminders).enabled||!setting.city)return{status:'disabled'};
  busy=true;status='Запрашиваем разрешение…';draw();
  try{
   const current=await permission();
   const result=current==='granted'?{display:'granted'}:await plugin.requestPermissions();
   lastPermission=permissionValue(result);
   if(lastPermission!=='granted'){status=lastPermission==='denied'?'Уведомления запрещены. Изменить разрешение можно в настройках телефона.':'Разрешение не получено.';return{status:'permission',permission:lastPermission}}
   status='Разрешение получено. Планируем напоминания…';
  }catch{status='Не удалось запросить разрешение.';return{status:'error'}}
  finally{busy=false;draw();}
  return sync(true);
 }
 function queue(){if(destroyed)return;if(timer)clearTimeout(timer);timer=setTimeout(()=>{timer=null;sync();},500)}
 function settingsChanged(){queue()}
 if(typeof window!=='undefined')window.addEventListener('salah:settings-changed',settingsChanged);
 if(supported())Promise.resolve().then(()=>sync()).catch(()=>{});
 function mount(container){mounted=container;draw();permission().then(()=>{draw();if(lastPermission==='granted')sync();});}
 function destroy(){destroyed=true;if(typeof window!=='undefined')window.removeEventListener('salah:settings-changed',settingsChanged);if(timer)clearTimeout(timer);timer=null;needsSync=false;mounted=null}
 return{mount,sync,requestPermission,active:()=>supported()&&lastPermission==='granted'&&lastCount>0,supported,destroy};
}
