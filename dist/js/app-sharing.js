import{toast,modal}from './ui.js';
export const PUBLIC_APP_URL='https://skodytunez-maker.github.io/salah/';
export const PUBLIC_SHARE_URL=PUBLIC_APP_URL+'share.html';
export const APP_INVITE_TEXT='Приглашаю в SALAH — время намаза, Коран и азкары.';
export function createAppSharing({navigator:device=globalThis.navigator,notify=toast,fallback=showLink,text}={}){
 let pending=false;
 async function copy(){
  try{if(!device?.clipboard?.writeText)throw Error();await device.clipboard.writeText(PUBLIC_SHARE_URL);notify('Ссылка на SALAH скопирована.');}
  catch{fallback(PUBLIC_SHARE_URL);}
 }
 return{
  async share(){
   if(pending)return;pending=true;
   try{
    if(typeof device?.share==='function'){
     try{await device.share({title:'SALAH',...(text?{text}:{}),url:PUBLIC_SHARE_URL});return;}
     catch(error){if(error?.name==='AbortError')return;}
    }
    await copy();
   }finally{pending=false;}
  },
  async copy(){if(pending)return;pending=true;try{await copy();}finally{pending=false;}}
 };
}
function showLink(url){
 modal('<div class="modal-head"><h2>Ссылка на SALAH</h2><button class="icon-button" data-close aria-label="Закрыть">×</button></div><label for="app-share-url">Скопируйте ссылку и отправьте близким</label><input id="app-share-url" class="app-share-url" type="url" readonly value="'+url+'">');
 const field=document.getElementById('app-share-url');field.focus();field.select();
}
export function showAppQr(){
 modal('<div class="modal-head"><h2>QR-код SALAH</h2><button class="icon-button" data-close aria-label="Закрыть">×</button></div><p class="muted">Наведите камеру телефона, чтобы открыть приложение.</p><img class="app-share-qr-image" src="./assets/salah-qr.svg" alt="QR-код для открытия SALAH" width="280" height="280"><p class="app-share-address">'+PUBLIC_APP_URL+'</p><div class="button-row app-share-qr-actions"><a class="button" href="./assets/salah-qr.png" download="SALAH-QR.png">Скачать QR-код</a><button class="button secondary" type="button" id="qr-copy-app-link">Скопировать ссылку</button></div>');
 document.getElementById('qr-copy-app-link').onclick=()=>createAppSharing().copy();
}
const shareIcon='<path d="M12 15V3m-4 4 4-4 4 4M7 11H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-2"/>';
const linkIcon='<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2"/>';
const qrIcon='<rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="3" width="6" height="6" rx="1"/><rect x="3" y="15" width="6" height="6" rx="1"/><path d="M15 15h3v3h3v3h-6v-3m6-3v-3m-9 0v3"/>';
const icon=path=>'<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'+path+'</svg>';
export function appSharingMarkup(){
 return '<div class="app-share-row"><button type="button" class="app-share-main" id="share-app">'+icon(shareIcon)+'<span><strong>Пригласить друзей</strong></span></button><button type="button" class="app-share-copy" id="copy-app-link" aria-label="Скопировать ссылку на SALAH" title="Скопировать ссылку">'+icon(linkIcon)+'</button><button type="button" class="app-share-copy app-share-qr" id="show-app-qr" aria-label="Показать QR-код SALAH" title="QR-код SALAH">'+icon(qrIcon)+'</button></div>';
}
export function friendInviteMarkup(){
 return '<div class="release-dialog friend-invite-dialog"><span class="eyebrow">SALAH · Поделись благим</span><h2 tabindex="-1" autofocus>Пригласи друзей</h2><img class="friend-invite-art" src="./assets/updates/friend-invite-384.svg" alt="Отправь другу ссылку на SALAH" width="680" height="400"><p>Время намаза, Коран и азкары — отправь ссылку тем, кому это пригодится.</p><div class="friend-invite-actions"><button type="button" class="button" id="share-app">'+icon(shareIcon)+'<span>Пригласить друзей</span></button><button type="button" class="button secondary" id="copy-app-link" aria-label="Скопировать ссылку на SALAH" title="Скопировать ссылку">'+icon(linkIcon)+'</button></div><button type="button" class="text-button friend-invite-later" data-close>Позже</button></div>';
}
const FRIEND_INVITE_KEY='salah:friend-invite-until-v1',INVITE_WEEK=7*24*60*60*1000;
const inviteStorage=()=>{try{return globalThis.localStorage;}catch{return null;}};
export function createFriendInvite({storage=inviteStorage(),now=Date.now,actions,canShow=()=>true,doc=globalThis.document,win=globalThis.window,show=modal,schedule=setTimeout,cancel=clearTimeout,playback,delay=8000}={}){
 let dismissedUntil=0,timer=null,started=false,unsubscribe=null;
 const dialog=()=>doc?.getElementById('modal');
 function due(){
  let saved=0;try{saved=Number(storage?.getItem(FRIEND_INVITE_KEY))||0;}catch{}
  return Math.max(dismissedUntil,Number.isFinite(saved)?saved:0)<=now();
 }
 function offer(){
  timer=null;if(!due()||doc?.hidden||dialog()?.open||!canShow())return false;
  show(friendInviteMarkup());const content=doc.getElementById('modal-content');
  if(!content?.querySelector('.friend-invite-dialog'))return false;
  dismissedUntil=now()+INVITE_WEEK;try{storage?.setItem(FRIEND_INVITE_KEY,String(dismissedUntil));}catch{}
  bindAppSharing(content,actions);return true;
 }
 function refresh(){if(timer!==null)cancel(timer);timer=null;if(started&&due()&&!doc?.hidden&&canShow()&&!dialog()?.open)timer=schedule(offer,delay);}
 function start(){if(started)return;started=true;for(const event of ['hashchange','salah:release-dismissed'])win?.addEventListener(event,refresh);for(const event of ['visibilitychange','pointerdown','keydown'])doc?.addEventListener(event,refresh);dialog()?.addEventListener('close',refresh);unsubscribe=playback?.subscribe?.(refresh);refresh();}
 function stop(){started=false;if(timer!==null)cancel(timer);timer=null;for(const event of ['hashchange','salah:release-dismissed'])win?.removeEventListener(event,refresh);for(const event of ['visibilitychange','pointerdown','keydown'])doc?.removeEventListener(event,refresh);dialog()?.removeEventListener('close',refresh);unsubscribe?.();unsubscribe=null;}
 return {start,stop,offer,refresh};
}
export function bindAppSharing(container,actions=createAppSharing({text:APP_INVITE_TEXT})){
 const share=container.querySelector('#share-app'),copy=container.querySelector('#copy-app-link');
 if(share)share.onclick=()=>actions.share();
 if(copy)copy.onclick=()=>actions.copy();
 const qr=container.querySelector('#show-app-qr');if(qr)qr.onclick=showAppQr;
}
