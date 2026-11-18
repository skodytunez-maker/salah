import{t}from './i18n.js';
import{staffRequest}from './staff-transport.js';
import{enableNativeSupportNotifications}from './native-support-push.js';
import{prepareSupportPhoto}from './support-photo.js';
import{createSupportRpc}from './support-transport.js';
import{mountSupportPanel}from './support-client.js';
import{createSupportDiagnostics}from './support-diagnostics.js';
import{accountAuthClient,ownerVerified,verifyOwner,ownerNeedsMfa,ownerUserAvatar}from './owner-auth.js';
import{APP_VERSION}from './app-release.js';
import{title,uiLeaf,uiMessage}from './ui.js';
import{validOwnerUserId}from './owner-user-card.js';
async function enableSupportNotifications(){
 if(globalThis.Capacitor?.isNativePlatform?.()===true)return enableNativeSupportNotifications();
 return new Promise(resolve=>{let completed=false;const timer=setTimeout(()=>{if(!completed){completed=true;resolve({ready:false,message:t('supportUi.notificationTimeout'),uiMessage:uiMessage('supportUi.notificationTimeout')});}},60000);window.dispatchEvent(new CustomEvent('salah:enable-support-notifications',{detail:{reply:result=>{if(completed)return;completed=true;clearTimeout(timer);resolve(result)}}}));});
}
let cleanup=null,screen=0;
export function stopSupport(){screen++;cleanup?.();cleanup=null}
export async function showSupport(app){
 stopSupport();const id=screen,hash=location.hash,requested=new URLSearchParams(hash.split('?')[1]||'').get('owner')==='1';
 app.dataset.supportHash=hash;app.innerHTML='<section class="panel section" id="support-root"><p class="muted">'+uiLeaf('supportUi.opening')+'</p></section>';
 let owner;
 try{owner=ownerVerified()||await verifyOwner()}catch{
  if(id===screen&&app.isConnected&&location.hash===hash){app.innerHTML='<section class="panel section"><p>'+uiLeaf('supportUi.openFailed')+'</p><button type="button" class="button" id="support-retry">'+uiLeaf('common.retry')+'</button></section>';app.querySelector('#support-retry').onclick=()=>showSupport(app)}return;
 }
 if(id!==screen||!app.isConnected||location.hash!==hash)return;
 if(!owner&&(requested||ownerNeedsMfa())){app.innerHTML='<section class="panel section"><a class="button" href="#account?owner=1">'+uiLeaf('supportUi.ownerSignIn')+'</a></section>';return}
 app.innerHTML='<a class="settings-back" href="'+(owner?'#account':'#more')+'"><span aria-hidden="true">‹</span>'+uiLeaf(owner?'accountUi.myAccount':'nav.menu')+'</a>'+title(t(owner?'supportUi.requests':'supportUi.support')).replace('<h1>','<h1 data-i18n="'+(owner?'supportUi.requests':'supportUi.support')+'">')+'<section class="panel section" id="support-root"></section>';
 const client=accountAuthClient();cleanup=mountSupportPanel(app.querySelector('#support-root'),{auth:{auth:client.auth,rpc:createSupportRpc(client)},app:'salah',version:APP_VERSION,owner,loadSupportAvatar:owner?ownerUserAvatar:undefined,enableNotifications:enableSupportNotifications,signInHref:'#account',preparePhoto:owner?undefined:prepareSupportPhoto,createDiagnostics:owner?undefined:()=>createSupportDiagnostics({version:APP_VERSION}),setTeamVisibility:owner?((id,visible)=>staffRequest('support.share',{id,visible})):undefined,initialThreadId:new URLSearchParams(hash.split('?')[1]||'').get('thread'),recipientId:owner&&validOwnerUserId(new URLSearchParams(hash.split('?')[1]||'').get('user'))?new URLSearchParams(hash.split('?')[1]||'').get('user'):null});
}
