import {esc,modal,closeModal} from './ui.js';
import {OWNER_PROJECT_URL,OWNER_PUBLIC_KEY} from './owner-auth.js';
const methodName=method=>({'bank_card':'Банковская карта','sbp':'СБП','sberbank':'SberPay','tinkoff_bank':'T‑Pay','yoo_money':'ЮMoney','alfabank':'AlfaPay'}[method?.type]||'Способ оплаты')+(method?.last4?' •••• '+method.last4:'');
const date=value=>value&&Number.isFinite(Date.parse(value))?new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric',timeZone:'Europe/Moscow'}).format(new Date(value)):'Дата ещё не назначена';
export function subscriptionMarkup(state){
 const head='<div class="support-subscription-head"><h2>Моя поддержка</h2></div>';
 if(state.status==='signed-out')return head+'<p>Войдите, чтобы управлять ежемесячной поддержкой.</p><a class="button secondary" href="#account">Войти в аккаунт</a>';
 if(state.status==='loading')return head+'<p role="status">Проверяем состояние поддержки…</p>';
 if(state.status==='error')return head+'<p role="alert">Не удалось получить данные. Проверьте соединение.</p><button class="button secondary" type="button" data-support-retry>Повторить</button>';
 if(state.status==='none')return head+'<p>Ежемесячная поддержка не подключена.</p><p class="muted">Способ оплаты не привязан. Автоматических списаний нет.</p>';
 if(state.status==='cancelled')return head+'<p class="support-subscription-success" role="status">Ежемесячная поддержка отключена</p><p>Способ оплаты отвязан от SALAH. Повторных списаний не будет.</p><p class="muted">Все функции приложения остаются доступны.</p>';
 return head+'<span class="support-subscription-badge">'+(state.status==='active'?'Подключена':'Ожидает подтверждения')+'</span><strong class="support-subscription-amount">'+esc(new Intl.NumberFormat('ru-RU').format(state.amount))+' ₽ <small>/ месяц</small></strong><dl><div><dt>Следующее списание</dt><dd>'+esc(date(state.nextChargeAt))+'</dd></div><div><dt>Способ оплаты</dt><dd>'+esc(state.method?methodName(state.method):'Ещё не привязан')+'</dd></div></dl><button class="button support-subscription-unlink" type="button" data-support-unlink>Отключить поддержку и отвязать</button><p class="muted">Вы можете отключить повторные списания самостоятельно.</p>';
}
export function supportUnlinkMarkup(state){
 return '<section class="support-unlink-dialog"><h2>Отключить поддержку?</h2><p>Способ оплаты будет отвязан от SALAH. Повторные списания прекратятся.</p><p class="muted">Все функции приложения останутся доступны.</p><p class="support-unlink-method">'+esc(state.method?methodName(state.method):'Ежемесячная поддержка')+'</p><p data-support-unlink-error role="alert" hidden></p><div class="support-unlink-actions"><button class="button support-subscription-unlink" type="button" data-support-confirm>Отключить и отвязать</button><button class="button secondary" type="button" data-close>Оставить поддержку</button></div></section>';
}
export function createSubscriptionRequest({account,client,fetcher=fetch}){
 return async(action=null)=>{
  const id=account().signedIn?account().userId:null;if(!id)throw Error('sign_in_required');
  await new Promise(resolve=>setTimeout(resolve,0));
  if(account().userId!==id)throw Error('account_changed');
  const result=await client().auth.getSession();const session=result.data?.session;
  if(result.error||session?.user?.id!==id||account().userId!==id)throw Error('sign_in_required');
  const response=await fetcher(OWNER_PROJECT_URL+'/functions/v1/support-billing',{method:action?'POST':'GET',headers:{apikey:OWNER_PUBLIC_KEY,Authorization:'Bearer '+session.access_token,...(action?{'Content-Type':'application/json'}:{})},...(action?{body:JSON.stringify({action})}:{}),credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store',signal:AbortSignal.timeout(15000)});
  if(account().userId!==id||!account().signedIn)throw Error('account_changed');
  if(!response.ok)throw Error('request_failed');const data=await response.json();
  if(!['none','pending','active','cancelled'].includes(data?.status)||data.paymentEnabled!==false||action&&data.unlinked!==true||['active','pending'].includes(data.status)&&(!Number.isSafeInteger(data.amount)||data.amount<150))throw Error('invalid_response');
  return data;
 };
}
export function mountSupportSubscription(host,{account,client,fetcher=fetch}){
 const slot=host.querySelector('[data-support-subscription]');if(!slot||typeof account!=='function'||typeof client!=='function')return;
 if(slot._subscriptionCleanup)slot._subscriptionCleanup();
 let generation=0,disposed=false,opened=null,busy=false,scope=null;const request=createSubscriptionRequest({account,client,fetcher});
 const render=state=>{slot.innerHTML=subscriptionMarkup(state);slot.querySelector('[data-support-retry]')?.addEventListener('click',load);slot.querySelector('[data-support-unlink]')?.addEventListener('click',()=>confirmUnlink(state));};
 const active=()=>!disposed&&slot.isConnected&&host.contains(slot)&&location.hash.split('?')[0]==='#support-salah';
 async function load(){
  const current=++generation;if(opened?.isConnected){closeModal();opened=null;}busy=false;
  scope=account().signedIn?account().userId:null;
  if(!account().signedIn){render({status:'signed-out'});return;}
  render({status:'loading'});
  try{const state=await request();if(active()&&current===generation)render(state);}catch{if(active()&&current===generation)render({status:'error'});}
 }
 function confirmUnlink(state){
  const id=account().userId;if(!active()||!id)return;
  modal(supportUnlinkMarkup(state));
  const dialog=document.querySelector('.support-unlink-dialog');opened=dialog;dialog.querySelector('[data-close]').focus({preventScroll:true});
  dialog.querySelector('[data-support-confirm]').onclick=async()=>{
   if(busy||!active()||account().userId!==id)return;busy=true;
   const button=dialog.querySelector('[data-support-confirm]'),leave=dialog.querySelector('[data-close]'),error=dialog.querySelector('[data-support-unlink-error]'),nativeDialog=dialog.closest('dialog');
   const preventDismiss=e=>e.preventDefault();nativeDialog?.addEventListener('cancel',preventDismiss);
   button.disabled=true;leave.disabled=true;button.textContent='Отключаем…';error.hidden=true;
   try{const result=await request('unlink');if(!active()||account().userId!==id)return;generation++;render(result);if(opened===dialog&&dialog.isConnected){closeModal();opened=null;}}
   catch{if(active()&&account().userId===id&&dialog.isConnected){error.hidden=false;error.textContent='Отключение не подтверждено. Повторите попытку.';button.disabled=false;leave.disabled=false;button.textContent='Отключить и отвязать';}}
   finally{nativeDialog?.removeEventListener('cancel',preventDismiss);busy=false;}
  };
 }
 const changed=()=>{if(active()&&scope!==(account().signedIn?account().userId:null))void load();};
 const routeChanged=()=>{if(!active())cleanup();};
 function cleanup(){disposed=true;generation++;window.removeEventListener('salah:counter-status',changed);window.removeEventListener('hashchange',routeChanged);if(opened?.isConnected){closeModal();opened=null;}slot._subscriptionCleanup=null;}
 slot._subscriptionCleanup=cleanup;window.addEventListener('salah:counter-status',changed);window.addEventListener('hashchange',routeChanged);void load();
}
