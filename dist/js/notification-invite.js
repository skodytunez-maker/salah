import {normalizeReminders,PRAYER_KEYS} from './reminder-events.js';
import {esc} from './ui.js';
export const INVITE_KEY='salah:notification-invite-v1';
export function inviteEligible({signedIn=false,city=null,reminders,push={},seen=false}={}){
 // Existing preferences (including an explicit off) and past device choices win.
 return signedIn===true&&!!city&&(reminders===undefined||reminders?.enabled===true)&&!push.hasDevice&&push.permission!=='denied'&&!seen;
}
export function standardReminderPreferences(value){
 const next=normalizeReminders(value);next.enabled=true;next.jumuah.enabled=true;
 for(const key of PRAYER_KEYS)next.prayers[key].atTime=true;
 return next;
}
export function createNotificationInvite({getState,enable,openSettings=()=>{},storage=globalThis.localStorage}){
 let host=null,signature='',busy=false,finished=false,message='',connected=false;
 const seen=()=>{try{return ['dismissed','connected'].includes(storage.getItem(INVITE_KEY));}catch{return true;}};
 const remember=value=>{try{storage.setItem(INVITE_KEY,value);return true;}catch{return false;}};
 function draw(){
  if(!host?.isConnected||busy)return;
  const state=getState(),configured=state.reminders!==undefined,visible=state.signedIn&&(finished||inviteEligible({...state,seen:seen()}));
  const key=JSON.stringify([visible,configured,finished,message,state.push?.supported,state.push?.guide]);
  if(signature===key)return;signature=key;
  if(!visible){host.innerHTML='';return;}
  host.innerHTML='<section class="notification-invite" aria-label="Уведомления о намазах и Джума"><h2>'+ (configured?'Уведомления SALAH':'Намазы и Джума')+'</h2>'+(finished?'<p role="status">'+esc(message)+'</p><div class="notification-invite-actions"><a class="text-button" href="#settings">Настройки уведомлений</a><button type="button" class="text-button" data-invite-dismiss>Закрыть</button></div>':(configured?'<p>Выбранные напоминания могут приходить, когда SALAH закрыто. Подключите этот телефон.</p>':'<p>Уведомления о пяти намазах и Джума в пятницу в 09:00 — по времени вашего города.</p>')+(state.push?.supported?'<p class="notification-invite-consent">При подключении сервис доставки сохранит подписку, координаты выбранного города и настройки напоминаний.</p>':'<p>'+esc(state.push?.guide||'В этом режиме фоновые уведомления недоступны. Откройте настройки для подсказки.')+'</p>')+(message?'<p role="status">'+esc(message)+'</p>':'')+'<div class="notification-invite-actions"><button type="button" class="button" data-invite-enable>'+(state.push?.supported?'Включить уведомления':'Как включить')+'</button><button type="button" class="text-button" data-invite-dismiss>Не сейчас</button></div>');
  host.querySelector('[data-invite-dismiss]').onclick=()=>{if(!remember('dismissed')){message='Не удалось сохранить выбор. Проверьте хранилище устройства.';finished=true;signature='';draw();return;}finished=false;signature='';draw();};
  const button=host.querySelector('[data-invite-enable]');
  if(button)button.onclick=async()=>{
   const current=getState();if(busy||!inviteEligible({...current,seen:seen()}))return;
   if(!remember('started')){finished=true;message='Не удалось сохранить выбор. Проверьте хранилище устройства.';signature='';draw();return;}
   if(!current.push?.supported){signature='';draw();openSettings();return;}
   busy=true;button.disabled=true;button.textContent='Подключаем…';host.querySelector('[data-invite-dismiss]').disabled=true;
   try{const result=await enable();connected=result?.ready===true;if(connected)remember('connected');message=connected?'Фоновые уведомления подключены на этом устройстве.':result?.message||'Доставка пока не подключена. Проверьте настройки уведомлений.';}
   catch{message='Не удалось подключить доставку. Повторите в настройках уведомлений.';}
   finally{busy=false;finished=connected;signature='';draw();}
  };
 }
 return {mount(container){if(container!==host){host=container;signature='';}draw();},refresh:draw};
}
