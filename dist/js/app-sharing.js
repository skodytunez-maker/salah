import{toast,modal}from './ui.js';
export const PUBLIC_APP_URL='https://skodytunez-maker.github.io/salah/';
export function createAppSharing({navigator:device=globalThis.navigator,notify=toast,fallback=showLink}={}){
 let pending=false;
 async function copy(){
  try{if(!device?.clipboard?.writeText)throw Error();await device.clipboard.writeText(PUBLIC_APP_URL);notify('Ссылка на SALAH скопирована.');}
  catch{fallback(PUBLIC_APP_URL);}
 }
 return{
  async share(){
   if(pending)return;pending=true;
   try{
    if(typeof device?.share==='function'){
     try{await device.share({title:'SALAH',url:PUBLIC_APP_URL});return;}
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
export function bindAppSharing(container){
 const actions=createAppSharing();
 const share=container.querySelector('#share-app'),copy=container.querySelector('#copy-app-link');
 if(share)share.onclick=()=>actions.share();
 if(copy)copy.onclick=()=>actions.copy();
 const qr=container.querySelector('#show-app-qr');if(qr)qr.onclick=showAppQr;
}
