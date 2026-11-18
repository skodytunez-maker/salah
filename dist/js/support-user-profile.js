import{mountConversationTheme,conversationThemeButton}from './conversation-theme-view.js';
import{ownerAccountUser,ownerUserDetails,ownerUserAvatar,verifiedOwnerId}from './owner-auth.js';
import{createOwnerUserDetail}from './owner-user-detail.js';
import{ownerUserCard,ownerUserCardPreview,validOwnerUserId,bindOwnerNotificationInfo,bindOwnerAwardHistory}from './owner-user-card.js';
import{createOwnerCardHistory}from './owner-card-navigation.js';
import{stopOwnerUi,watchOwnerUi}from './owner-i18n.js';
import{bindSwipeMotion}from './swipe-motion.js';
import{uiLeaf}from './ui.js';
import{t}from './i18n.js';

// This private overlay belongs to the current Support mount and actor. Closing
// it never reloads the conversation or creates a second Support request.
export function createSupportUserProfile({host,actorId,isActive=()=>true,getActor=verifiedOwnerId,loadUser=ownerAccountUser,loadDetails=ownerUserDetails,loadAvatar=ownerUserAvatar}={}){
 const doc=host.ownerDocument,win=doc.defaultView;
 let dialog=null,card=null,detail=null,opener=null,selected=null,user=null,epoch=0,disposed=false,stopSwipe=null,roomTheme=null;
 const active=()=>!disposed&&host.isConnected&&isActive()&&getActor()===actorId;
 const clear=()=>{
  epoch++;roomTheme?.dispose();roomTheme=null;detail?.dispose();detail=null;stopSwipe?.();stopSwipe=null;
  if(card)stopOwnerUi(card);if(dialog){stopOwnerUi(dialog);for(const nested of dialog.querySelectorAll('dialog[open]'))nested.close();dialog.close();dialog.remove();}
  dialog=card=null;selected=user=null;const restore=opener;opener=null;if(restore?.isConnected)restore.focus({preventScroll:true});
 };
 const history=createOwnerCardHistory({dismiss:clear,isActive:()=>!disposed&&host.isConnected&&isActive(),win,key:'salahOwnerCard'});
 function paint(state){
  if(!active()||!card||!user)return;
  const top=dialog.querySelector('.support-profile-body').scrollTop;stopOwnerUi(card);card.innerHTML=ownerUserCard(user,state);bindOwnerNotificationInfo(card);bindOwnerAwardHistory(card,state.details?.awards);
  const write=card.querySelector('.owner-user-write');if(write)write.onclick=event=>{event.preventDefault();history.back();};
  dialog.querySelector('.support-profile-body').scrollTop=top;
 }
 async function refresh(){
  if(!active()||!dialog||!selected)return;
  const id=selected,request=++epoch,button=dialog.querySelector('[data-support-profile-refresh]');button.disabled=true;
  // Remove the previous private card before retrying authorization or another
  // account summary. A failed lookup must never retain another person's data.
  detail?.dispose();detail=null;stopOwnerUi(card);user=null;card.innerHTML=ownerUserCardPreview(t('ownerUi.userCard'));
  try{
   const summary=await loadUser(id);if(!active()||request!==epoch||selected!==id)return;
   if(summary?.id!==id||!validOwnerUserId(summary.id))throw Error('profile_unavailable');user=summary;
   detail=createOwnerUserDetail({load:loadDetails,loadAvatar,isActive:()=>active()&&request===epoch&&selected===id,onChange:paint});await detail.select(id);
  }catch{if(active()&&request===epoch&&card){stopOwnerUi(card);card.innerHTML='<p role="status">'+uiLeaf('ownerUi.cardUnavailable')+'</p>';}}
  finally{if(active()&&request===epoch&&button.isConnected)button.disabled=false;}
 }
 return{
  open(person,source){
   if(!active()||!validOwnerUserId(person?.id))return false;
   if(dialog)return false;if(!history.open())return false;selected=person.id;opener=source;
   dialog=doc.createElement('dialog');dialog.className='support-user-profile';dialog.tabIndex=-1;dialog.setAttribute('aria-label',t('ownerUi.userCard'));
   dialog.innerHTML='<header class="support-profile-header"><button type="button" class="text-button" data-support-profile-back><svg aria-hidden="true" viewBox="0 0 24 24"><path d="m15 5-7 7 7 7"/></svg> '+uiLeaf('common.back')+'</button><button type="button" class="text-button" data-support-profile-refresh><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M20 7v5h-5M19 12a7 7 0 1 1-2-5l3 5"/></svg>'+uiLeaf('settingsExtra.update')+'</button></header><div class="support-profile-body"><div class="owner-profile-screen" data-support-profile-card></div></div>';
   host.append(dialog);card=dialog.querySelector('[data-support-profile-card]');
   roomTheme=mountConversationTheme(dialog,{actorId,scope:'support:'+selected,isActive:active});const themeButton=conversationThemeButton(doc);dialog.querySelector('.support-profile-header').insertBefore(themeButton,dialog.querySelector('[data-support-profile-refresh]'));themeButton.onclick=()=>roomTheme?.open(themeButton);
   dialog.querySelector('[data-support-profile-back]').onclick=()=>history.back();dialog.querySelector('[data-support-profile-refresh]').onclick=()=>void refresh();
   dialog.addEventListener('cancel',event=>{if(event.target===dialog){event.preventDefault();history.back();}});
   stopSwipe=bindSwipeMotion(dialog,{win,canStart:()=>active()&&!dialog.querySelector('dialog[open]')&&!doc.activeElement?.matches?.('input,textarea,select,[contenteditable="true"]'),swipeThreshold:{minDistance:48,maxDistance:100,distanceRatio:.18},canMove:direction=>direction===1,commit:()=>history.back()});
   watchOwnerUi(dialog,()=>dialog?.setAttribute('aria-label',t('ownerUi.userCard')));dialog.showModal();dialog.focus({preventScroll:true});void refresh();return true;
  },
  dispose(){if(disposed)return;clear();disposed=true;history.dispose();}
 };
}
