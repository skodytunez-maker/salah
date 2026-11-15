import {esc,modal,closeModal,uiLeaf,uiMessage,setUiMessage,bindUiLanguage} from './ui.js';
import{getLocale,translateUi}from './i18n.js';
import {OWNER_PROJECT_URL,OWNER_PUBLIC_KEY} from './owner-auth.js';
const methodBrands=Object.freeze({sbp:'СБП',sberbank:'SberPay',tinkoff_bank:'T‑Pay',yoo_money:'ЮMoney',alfabank:'AlfaPay'});
const methodMarkup=method=>(method?.type==='bank_card'?uiLeaf('subscriptionUi.bankCard'):Object.hasOwn(methodBrands,method?.type)?esc(methodBrands[method.type]):uiLeaf('subscriptionUi.paymentMethod'))+(method?.last4?' •••• '+esc(method.last4):'');
const dateText=value=>new Intl.DateTimeFormat(getLocale(),{day:'numeric',month:'long',year:'numeric',timeZone:'Europe/Moscow',hourCycle:'h23'}).format(new Date(value));
const dateMarkup=value=>value&&Number.isFinite(Date.parse(value))?'<span data-subscription-date="'+esc(value)+'">'+esc(dateText(value))+'</span>':uiLeaf('subscriptionUi.dateUnset');
function paintSubscriptionValues(root){for(const node of root.querySelectorAll('[data-subscription-amount]'))node.textContent=new Intl.NumberFormat(getLocale()).format(Number(node.dataset.subscriptionAmount))+' ₽';for(const node of root.querySelectorAll('[data-subscription-date]'))node.textContent=dateText(node.dataset.subscriptionDate);}
export function subscriptionMarkup(state){
 const head='<div class="support-subscription-head"><h2>'+uiLeaf('extraUi.mySupport')+'</h2></div>';
 if(state.status==='signed-out')return head+'<p>'+uiLeaf('subscriptionUi.signInToManage')+'</p><a class="button secondary" href="#account">'+uiLeaf('subscriptionUi.signInAccount')+'</a>';
 if(state.status==='loading')return head+'<p role="status">'+uiLeaf('subscriptionUi.checking')+'</p>';
 if(state.status==='error')return head+'<p role="alert">'+uiLeaf('subscriptionUi.loadFailed')+'</p><button class="button secondary" type="button" data-support-retry>'+uiLeaf('common.retry')+'</button>';
 if(state.status==='none')return head+'<p>'+uiLeaf('extraUi.notConnected')+'</p><p class="muted">'+uiLeaf('extraUi.noAutoDebit')+'</p>';
 if(state.status==='cancelled')return head+'<p class="support-subscription-success" role="status">'+uiLeaf('subscriptionUi.disabled')+'</p><p>'+uiLeaf('subscriptionUi.unlinked')+'</p><p class="muted">'+uiLeaf('subscriptionUi.featuresAvailable')+'</p>';
 return head+'<span class="support-subscription-badge">'+uiLeaf(state.status==='active'?'subscriptionUi.active':'subscriptionUi.pending')+'</span><strong class="support-subscription-amount"><span data-subscription-amount="'+esc(state.amount)+'">'+esc(new Intl.NumberFormat(getLocale()).format(state.amount))+' ₽</span> <small>'+uiLeaf('subscriptionUi.perMonth')+'</small></strong><dl><div><dt>'+uiLeaf('subscriptionUi.nextCharge')+'</dt><dd>'+dateMarkup(state.nextChargeAt)+'</dd></div><div><dt>'+uiLeaf('subscriptionUi.paymentMethod')+'</dt><dd>'+ (state.method?methodMarkup(state.method):uiLeaf('subscriptionUi.methodUnset'))+'</dd></div></dl><button class="button support-subscription-unlink" type="button" data-support-unlink>'+uiLeaf('subscriptionUi.unlink')+'</button><p class="muted">'+uiLeaf('subscriptionUi.unlinkHint')+'</p>';
}
export function supportUnlinkMarkup(state){
 return '<section class="support-unlink-dialog"><h2>'+uiLeaf('subscriptionUi.confirmTitle')+'</h2><p>'+uiLeaf('subscriptionUi.confirmBody')+'</p><p class="muted">'+uiLeaf('subscriptionUi.featuresRemain')+'</p><p class="support-unlink-method">'+(state.method?methodMarkup(state.method):uiLeaf('extraUi.monthly'))+'</p><p data-support-unlink-error role="alert" hidden></p><div class="support-unlink-actions"><button class="button support-subscription-unlink" type="button" data-support-confirm>'+uiLeaf('subscriptionUi.unlinkAction')+'</button><button class="button secondary" type="button" data-close>'+uiLeaf('subscriptionUi.keepSupport')+'</button></div></section>';
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
 let generation=0,disposed=false,opened=null,busy=false,scope=null,stopDialogLanguage=null;const request=createSubscriptionRequest({account,client,fetcher});
 const stopLanguage=bindUiLanguage(slot,()=>{translateUi(slot);paintSubscriptionValues(slot);});
 const render=state=>{slot.innerHTML=subscriptionMarkup(state);slot.querySelector('[data-support-retry]')?.addEventListener('click',load);slot.querySelector('[data-support-unlink]')?.addEventListener('click',()=>confirmUnlink(state));};
 const active=()=>!disposed&&slot.isConnected&&host.contains(slot)&&location.hash.split('?')[0]==='#support-salah';
 async function load(){
  const current=++generation;if(opened?.isConnected){stopDialogLanguage?.();stopDialogLanguage=null;closeModal();opened=null;}busy=false;
  scope=account().signedIn?account().userId:null;
  if(!account().signedIn){render({status:'signed-out'});return;}
  render({status:'loading'});
  try{const state=await request();if(active()&&current===generation)render(state);}catch{if(active()&&current===generation)render({status:'error'});}
 }
 function confirmUnlink(state){
  const id=account().userId;if(!active()||!id)return;
  modal(supportUnlinkMarkup(state));
  const dialog=document.querySelector('.support-unlink-dialog');opened=dialog;stopDialogLanguage?.();stopDialogLanguage=bindUiLanguage(dialog,()=>{translateUi(dialog);paintSubscriptionValues(dialog);});dialog.querySelector('[data-close]').focus({preventScroll:true});
  dialog.querySelector('[data-support-confirm]').onclick=async()=>{
   if(busy||!active()||account().userId!==id)return;busy=true;
   const button=dialog.querySelector('[data-support-confirm]'),leave=dialog.querySelector('[data-close]'),error=dialog.querySelector('[data-support-unlink-error]'),nativeDialog=dialog.closest('dialog');
   const preventDismiss=e=>e.preventDefault();nativeDialog?.addEventListener('cancel',preventDismiss);
   button.disabled=true;leave.disabled=true;setUiMessage(button,uiMessage('subscriptionUi.unlinking'));error.hidden=true;
   try{const result=await request('unlink');if(!active()||account().userId!==id)return;generation++;render(result);if(opened===dialog&&dialog.isConnected){closeModal();opened=null;}}
   catch{if(active()&&account().userId===id&&dialog.isConnected){error.hidden=false;setUiMessage(error,uiMessage('subscriptionUi.unlinkFailed'));button.disabled=false;leave.disabled=false;setUiMessage(button,uiMessage('subscriptionUi.unlinkAction'));}}
   finally{nativeDialog?.removeEventListener('cancel',preventDismiss);busy=false;}
  };
 }
 const changed=()=>{if(active()&&scope!==(account().signedIn?account().userId:null))void load();};
 const routeChanged=()=>{if(!active())cleanup();};
 function cleanup(){disposed=true;generation++;stopLanguage();stopDialogLanguage?.();stopDialogLanguage=null;window.removeEventListener('salah:counter-status',changed);window.removeEventListener('hashchange',routeChanged);if(opened?.isConnected){closeModal();opened=null;}slot._subscriptionCleanup=null;}
 slot._subscriptionCleanup=cleanup;window.addEventListener('salah:counter-status',changed);window.addEventListener('hashchange',routeChanged);void load();
}
