import {createNativeReminderConnection} from './native-reminders.js';
import {normalizeReminders} from './reminder-events.js';
import {readDhikrActivity} from './dhikr-reminder.js';
import {esc} from './ui.js';
import {connectNativeAdhanAudio} from './native-adhan.js';
import {connectNativeReminderNavigation} from './native-reminder-navigation.js';

export function nativeReminderPlugin(cap=globalThis.Capacitor){
 return cap?.isNativePlatform?.()===true&&cap.getPlatform?.()==='android'&&cap.Plugins?.SalahReminders||null;
}
export function createNativeBackgroundReminders({getSettings,getContext,toast=()=>{},plugin=nativeReminderPlugin(),clock=()=>Date.now()}={}){
 if(!plugin)return null;
 const audioConnection=connectNativeAdhanAudio(plugin);
 const navigationConnection=connectNativeReminderNavigation(plugin);
 let mounted=null,busy=false,needsSync=false,destroyed=false,configured=false,lastAt=0,lastSettings='',lastDays,lastDay='',lastActivity=0,permission='default',adhanSupported=false;
 const context=()=>{const s=getSettings(),c=getContext()||{};return {...c,cityKey:s.city?c.cityKey:null,timeZone:c.timeZone||s.city?.timezone,dhikrLastAt:readDhikrActivity()};};
 const connection=createNativeReminderConnection({plugin,getContext:context,now:clock,getPreferences:nativeStatus=>{
  permission=nativeStatus.notifications?'granted':nativeStatus.permission==='denied'?'denied':'default';adhanSupported=nativeStatus.adhan===true;
  configured=configured||nativeStatus.configured===true||nativeStatus.pending>0;
  const value=normalizeReminders(getSettings().reminders);
  // Keep the saved foreground-azan preference. Until native audio is supported,
  // only the copied delivery plan is notification-only; never rewrite settings.
  if(!adhanSupported)for(const prayer of Object.values(value.prayers))prayer.adhan=false;
  return value;
 }});
 const messages={connected:'Подключено.',disabled:'Напоминания выключены.',notification_permission:'Разрешите уведомления.',alarm_permission:'Разрешите точное время.',no_future_events:'Расписание ещё загружается.',not_scheduled:'Подключение не готово.',error:'Не удалось подключить. Повторите.',unavailable:'Недоступно на этом устройстве.'};
 function draw(){
  if(!mounted?.isConnected||destroyed)return;
  const status=connection.status(),enabled=getSettings().reminders?.enabled===true;
  mounted.innerHTML='<h3>Когда SALAH свёрнуто</h3><p class="reminder-voice-note">Уведомления без интернета.</p>'+(!adhanSupported?'<p class="reminder-voice-note">Полный азан — пока SALAH открыто.</p>':'')+'<button type="button" class="button secondary" data-native-enable'+(busy||!enabled||!getSettings().city?' disabled':'')+'>'+(busy?'Подключаем…':status.status==='connected'?'Проверить подключение':'Подключить')+'</button><p class="reminder-status" role="status">'+esc(messages[status.status]||'Проверьте подключение.')+'</p>';
  mounted.querySelector('[data-native-enable]').onclick=enable;
 }
 async function sync(force=false){
  if(destroyed)return;
  if(busy){if(force)needsSync=true;return;}
  const s=getSettings(),c=getContext()||{},signature=JSON.stringify([s.reminders,c.cityKey]),activity=s.reminders?.dhikr?.enabled===true?readDhikrActivity():0,at=clock();
  if(!force&&signature===lastSettings&&c.days===lastDays&&c.today===lastDay&&activity===lastActivity&&at-lastAt>=0&&at-lastAt<60000)return;
  lastSettings=signature;lastDays=c.days;lastDay=c.today;lastActivity=activity;lastAt=at;busy=true;
  try{await connection.refresh()}finally{busy=false;draw();if(needsSync){needsSync=false;void sync(true);}}
 }
 async function enable(){
  if(busy||destroyed||getSettings().reminders?.enabled!==true||!getSettings().city)return {ready:false,message:'Включите напоминания и выберите город.'};
  busy=true;draw();
  try{const result=await connection.enable();return {ready:result.status==='connected',message:messages[result.status]||'Проверьте подключение.'};}
  catch{toast('Не удалось подключить напоминания.');return {ready:false,message:'Не удалось подключить.'};}
  finally{busy=false;draw();if(needsSync){needsSync=false;void sync(true);}}
 }
 const settingsChanged=()=>void sync(true);
 const resumed=()=>{if(document.visibilityState==='visible')void sync(true);};
 globalThis.window?.addEventListener('salah:settings-changed',settingsChanged);
 globalThis.document?.addEventListener('visibilitychange',resumed);
 void sync(true);
 return {mount(container){mounted=container;draw();},nativeSync:sync,nativeAudioActive:()=>adhanSupported&&connection.status().status==='connected',enable,active:()=>connection.status().status==='connected',invitationState:()=>({supported:true,permission,hasDevice:configured||connection.status().status==='connected',guide:''}),destroy(){destroyed=true;audioConnection.destroy();navigationConnection.destroy();mounted=null;globalThis.window?.removeEventListener('salah:settings-changed',settingsChanged);globalThis.document?.removeEventListener('visibilitychange',resumed);}};
}
