import{modal,toast,esc}from './ui.js';
import{actionIcon}from './action-icons.js';
import{t}from './i18n.js';
let choosing=false;
export function showTvOutput({requestAudio,nav=globalThis.navigator,notify=toast,show=modal}={}){
 if(choosing)return Promise.resolve({status:'pending'});choosing=true;
 // Open the native picker in the click itself, preserving the user gesture.
 let request;try{request=requestAudio?.()||{status:'no-media'};}catch{request={status:'unavailable'};}
 return Promise.resolve(request).catch(()=>({status:'unavailable'})).then(result=>{
  if(result.status==='no-media')notify(t('outputUi.startFirst'));
  else if(result.status==='connected')notify(t('outputUi.connected'));
  else if(!['picker','cancelled'].includes(result.status)){
   const apple=/iPhone|iPad|iPod/i.test(nav?.userAgent||'');
   const message=result.status==='local-media'?'outputUi.localMedia':result.status==='denied'?'outputUi.denied':'outputUi.unavailable',hint=apple?'outputUi.appleHint':'outputUi.screenHint';
   show('<div class="modal-heading"><h2>'+actionIcon('tv')+' <span data-i18n="outputUi.title">'+esc(t('outputUi.title'))+'</span></h2><button type="button" class="text-button" data-close data-i18n="common.close">'+esc(t('common.close'))+'</button></div><p data-i18n="'+message+'">'+esc(t(message))+'</p><p class="muted" data-i18n="'+hint+'">'+esc(t(hint))+'</p>');
  }
  return result;
 }).finally(()=>{choosing=false;});
}
