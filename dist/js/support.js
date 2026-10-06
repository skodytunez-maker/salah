import{prepareSupportPhoto}from './support-photo.js';
import{createSupportRpc}from './support-transport.js';
import{mountSupportPanel}from './support-client.js';
import{createSupportDiagnostics}from './support-diagnostics.js';
import{accountAuthClient,ownerVerified,verifyOwner,ownerNeedsMfa}from './owner-auth.js';
import{APP_VERSION}from './app-release.js';
import{title}from './ui.js';
import{validOwnerUserId}from './owner-user-card.js';
let cleanup=null,screen=0;
export function stopSupport(){screen++;cleanup?.();cleanup=null}
export async function showSupport(app){
 stopSupport();const id=screen,hash=location.hash,requested=new URLSearchParams(hash.split('?')[1]||'').get('owner')==='1';
 app.dataset.supportHash=hash;app.innerHTML='<section class="panel section" id="support-root"><p class="muted">Открываем обращения…</p></section>';
 let owner;
 try{owner=ownerVerified()||await verifyOwner()}catch{
  if(id===screen&&app.isConnected&&location.hash===hash){app.innerHTML='<section class="panel section"><p>Не удалось открыть обращения.</p><button type="button" class="button" id="support-retry">Повторить</button></section>';app.querySelector('#support-retry').onclick=()=>showSupport(app)}return;
 }
 if(id!==screen||!app.isConnected||location.hash!==hash)return;
 if(!owner&&(requested||ownerNeedsMfa())){app.innerHTML='<section class="panel section"><a class="button" href="#account?owner=1">Войти в кабинет владельца</a></section>';return}
 app.innerHTML='<a class="settings-back" href="'+(owner?'#account':'#more')+'"><span aria-hidden="true">‹</span>'+(owner?'Мой аккаунт':'Меню')+'</a>'+title(owner?'Обращения пользователей':'Обращения в поддержку')+'<section class="panel section" id="support-root"></section>';
 const client=accountAuthClient();cleanup=mountSupportPanel(app.querySelector('#support-root'),{auth:{auth:client.auth,rpc:createSupportRpc(client)},app:'salah',version:APP_VERSION,owner,signInHref:'#account',preparePhoto:owner?undefined:prepareSupportPhoto,createDiagnostics:owner?undefined:()=>createSupportDiagnostics({version:APP_VERSION}),recipientId:owner&&validOwnerUserId(new URLSearchParams(hash.split('?')[1]||'').get('user'))?new URLSearchParams(hash.split('?')[1]||'').get('user'):null});
}
