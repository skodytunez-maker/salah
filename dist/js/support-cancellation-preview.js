import{title,modal,closeModal}from './ui.js';
import{subscriptionMarkup,supportUnlinkMarkup}from './support-subscription.js';
// Public UI review only: no account, billing request, storage or saved payment method.
export function mountSupportCancellationPreview(host){
 if(host.querySelector('[data-support-cancellation-preview]'))return;
 host.querySelector('[data-support-subscription]')?._subscriptionCleanup?.();
 let closed=false,dialog=null;
 const initial=()=>({status:'active',amount:150,method:{type:'bank_card',last4:'1234'},nextChargeAt:'2026-11-18T10:00:00Z'});
 let state=initial();
 host.innerHTML='<section class="financial-support support-cancellation-preview" data-support-cancellation-preview><a class="financial-support-back" href="#support-salah">‹ Поддержать SALAH</a>'+title('Моя поддержка')+'<p class="support-preview-note" role="note"><strong>Проверка интерфейса · тестовые данные</strong><br>Пример отмены ежемесячной поддержки. Реальных списаний и привязанной карты здесь нет.</p><section class="support-subscription" data-support-preview-state aria-label="Пример управления поддержкой"></section><button type="button" class="button secondary" data-support-preview-reset hidden>Показать кнопку снова</button></section>';
 const slot=host.querySelector('[data-support-preview-state]'),reset=host.querySelector('[data-support-preview-reset]');
 const draw=()=>{if(closed)return;slot.innerHTML=subscriptionMarkup(state);reset.hidden=state.status!=='cancelled';slot.querySelector('[data-support-unlink]')?.addEventListener('click',()=>{
  modal(supportUnlinkMarkup(state));dialog=document.querySelector('.support-unlink-dialog');
  dialog.insertAdjacentHTML('afterbegin','<p class="support-preview-note"><strong>Проверка интерфейса · тестовые данные</strong></p>');
  dialog.querySelector('[data-close]').focus({preventScroll:true});
  dialog.querySelector('[data-support-confirm]').onclick=()=>{if(closed||!dialog?.isConnected)return;state={status:'cancelled'};closeModal();dialog=null;draw();};
 });};
 reset.onclick=()=>{state=initial();draw();};
 const cleanup=()=>{if(closed)return;closed=true;window.removeEventListener('hashchange',routeChanged);if(dialog?.isConnected)closeModal();dialog=null;if(host._supportCancellationCleanup===cleanup)host._supportCancellationCleanup=null;};
 const routeChanged=()=>{if(location.hash!=='#support-salah?review=cancellation')cleanup();};
 host._supportCancellationCleanup=cleanup;window.addEventListener('hashchange',routeChanged);draw();
}
