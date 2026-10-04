import{mountSupportPanel}from './support-client.js';
import{accountAuthClient,ownerVerified}from './owner-auth.js';
import{APP_VERSION}from './app-release.js';
import{title}from './ui.js';
let cleanup=null;
export function stopSupport(){cleanup?.();cleanup=null}
export function showSupport(app){stopSupport();app.dataset.supportHash=location.hash;const owner=location.hash.includes('owner=1')&&ownerVerified();app.innerHTML='<a class="settings-back" href="'+(owner?'#account':'#more')+'"><span aria-hidden="true">‹</span>'+(owner?'Мой аккаунт':'Меню')+'</a>'+title(owner?'Обращения пользователей':'Написать в поддержку')+'<section class="panel section" id="support-root"></section>';cleanup=mountSupportPanel(app.querySelector('#support-root'),{auth:accountAuthClient(),app:'salah',version:APP_VERSION,owner,signInHref:'#account'});}
