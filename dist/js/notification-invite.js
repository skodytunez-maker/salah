import {normalizeReminders,PRAYER_KEYS} from './reminder-events.js';
import {setUiMessage} from './ui.js';
import {notice,noticeLeaf,noticeAttr,noticeMarkup} from './notification-ui.js';
// One additional invitation requested by the owner; a second refusal remains final.
export const INVITE_KEY='salah:notification-invite-v2';
export function inviteEligible({signedIn=false,city=null,reminders,push={},seen=false}={}){
 // This invitation may explain a past refusal, but never changes settings by rendering.
 return signedIn===true&&!!city&&(!push.hasDevice||push.permission==='denied')&&!seen;
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
  const state=getState(),configured=state.reminders?.enabled===true,denied=state.push?.permission==='denied',canEnable=state.push?.supported&&!denied,visible=state.signedIn&&(finished||inviteEligible({...state,seen:seen()}));
  const key=JSON.stringify([visible,configured,finished,message,state.push?.supported,state.push?.guide,denied]);
  if(signature===key)return;signature=key;
  if(!visible){host.innerHTML='';return;}
  host.innerHTML='<section class="notification-invite" '+noticeAttr('inviteLabel')+'><h2>'+noticeLeaf(configured?'inviteTitle':'invitePrayerTitle')+'</h2>'+(finished?'<p role="status">'+noticeMarkup(message)+'</p><div class="notification-invite-actions"><a class="text-button" href="#settings">'+noticeLeaf('notificationSettings')+'</a><button type="button" class="text-button" data-invite-dismiss>'+noticeMarkup({key:'common.close'})+'</button></div>':'<p>'+noticeLeaf(configured?'inviteConfigured':'inviteDescription')+'</p>'+(canEnable?'<p class="notification-invite-consent">'+noticeLeaf('inviteConsent')+'</p>':'<p>'+noticeMarkup(denied?notice('inviteDenied'):state.push?.guideUi||state.push?.guide||notice('inviteUnsupported'))+'</p>')+(message?'<p role="status">'+noticeMarkup(message)+'</p>':'')+'<div class="notification-invite-actions"><button type="button" class="button" data-invite-enable>'+noticeLeaf(canEnable?'enableNotifications':'howEnable')+'</button><button type="button" class="text-button" data-invite-dismiss>'+noticeLeaf('notNow')+'</button></div>');
  host.querySelector('[data-invite-dismiss]').onclick=()=>{if(!remember('dismissed')){message=notice('inviteSaveFailed');finished=true;signature='';draw();return;}finished=false;signature='';draw();};
  const button=host.querySelector('[data-invite-enable]');
  if(button)button.onclick=async()=>{
   const current=getState();if(busy||!inviteEligible({...current,seen:seen()}))return;
   if(!remember('started')){finished=true;message=notice('inviteSaveFailed');signature='';draw();return;}
   if(!current.push?.supported||current.push?.permission==='denied'){signature='';draw();openSettings();return;}
   busy=true;button.disabled=true;setUiMessage(button,notice('connecting'));host.querySelector('[data-invite-dismiss]').disabled=true;
   try{const result=await enable();connected=result?.ready===true;if(connected)remember('connected');message=connected?notice('inviteConnected'):result?.messageUi||result?.message||notice('invitePending');}
   catch{message=notice('inviteConnectFailed');}
   finally{busy=false;finished=connected;signature='';draw();}
  };
 }
 return {mount(container){if(container!==host){host=container;signature='';}draw();},refresh:draw};
}
