import {normalizeReminders,PRAYER_KEYS} from './reminder-events.js';
import {read,settings} from './storage.js';
const PUSH_KEY='salah:push-install-v1';
export function notificationSnapshot(value,{permission='unsupported',device=null,subscription=false}={}){
 const reminders=normalizeReminders(value?.reminders);
 const enabled=reminders.enabled&&PRAYER_KEYS.some(key=>reminders.prayers[key].atTime||reminders.prayers[key].beforeMinutes>0);
 const valid=permission==='granted'&&subscription&&device?.saved===true&&!device.pendingRemoval&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(device.id||'')&&/^[a-f0-9]{64}$/.test(device.token||'');
 return {enabled,permission:['granted','denied','default','unsupported'].includes(permission)?permission:'unsupported',browser:reminders.browserNotifications,device:valid?{id:device.id,token:device.token}:null};
}
export async function readNotificationSnapshot(){
 const permission=typeof Notification==='undefined'?'unsupported':Notification.permission;let device=null,subscription=false;
 try{device=JSON.parse(localStorage.getItem(PUSH_KEY)||'null');if(permission==='granted'&&device?.saved&&!device.pendingRemoval){const registration=await navigator.serviceWorker?.getRegistration();subscription=!!await registration?.pushManager?.getSubscription();}}catch{}
 return notificationSnapshot(read('settings',settings),{permission,device,subscription});
}
const date=value=>Number.isFinite(Date.parse(value))?new Date(value).toLocaleString('ru-RU',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'';
export function notificationLabels(value){
 if(!value||!Number.isFinite(Date.parse(value.checkedAt)))return {state:'unknown',primary:'Намаз: нет данных',secondary:'',checked:''};
 const enabled=value.enabled===true,background=value.background===true&&enabled;
 return {state:enabled?'enabled':'disabled',primary:'Намаз: '+(enabled?'напоминания включены':'напоминания выключены'),secondary:background?'Фоновая доставка подключена':!enabled?'':value.permissionGranted===true?'Фоновая доставка не подключена':value.permissionDenied===true?'Уведомления запрещены на устройстве':'Уведомления не разрешены на устройстве',checked:'Проверено '+date(value.checkedAt)};
}
