import {normalizeReminders,PRAYER_KEYS} from './reminder-events.js';
import {read,settings} from './storage.js';
import {t,getLocale} from './i18n.js';
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
const date=value=>Number.isFinite(Date.parse(value))?new Date(value).toLocaleString(getLocale(),{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'';
export function notificationLabels(value){
 if(!value||!Number.isFinite(Date.parse(value.checkedAt)))return {state:'unknown',primary:t('notifyUi.statusUnknown'),secondary:'',checked:'',primaryKey:'notifyUi.statusUnknown',secondaryKey:null,checkedKey:null,checkedParams:{}};
 const enabled=value.enabled===true,background=value.background===true&&enabled;
 const primaryKey=enabled?'notifyUi.statusEnabled':'notifyUi.statusDisabled',secondaryKey=background?'notifyUi.statusBackground':!enabled?null:value.permissionGranted===true?'notifyUi.statusBackgroundOff':value.permissionDenied===true?'notifyUi.statusDenied':'notifyUi.statusNotAllowed',checkedKey='notifyUi.statusChecked',checkedParams={date:date(value.checkedAt)};
 return {state:enabled?'enabled':'disabled',primary:t(primaryKey),secondary:secondaryKey?t(secondaryKey):'',checked:t(checkedKey,checkedParams),primaryKey,secondaryKey,checkedKey,checkedParams};
}
