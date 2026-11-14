import{personalDataAllowed}from './audience.js';
import{guestRankKnown}from './guest-competition-core.js';

export const GUEST_REGISTRATION_NUDGE_KEY='salah:guest-registration-nudge-v1';
export const GUEST_REGISTRATION_NUDGE_DELAY=7*86400000;
export const GUEST_REGISTRATION_LISTENING_SECONDS=600;
const SAFE_VIEWS=new Set(['all','new','favorites','ruqyah','my-top','salah-top']);
const BLOCKERS='dialog[open],[role="dialog"][aria-modal="true"],#quran-global-player.is-expanded,.staff-cabinet,#support-root,.quran-reader,.mushaf-shell,.quran-recognition,.dua-reader,.adhkar-shell,.dhikr-list-shell,.lesson-content,.owner-learning-shell,.audience-gate,.award-presentation,.series-celebration';
function view(hash=''){
 const[route,query='']=String(hash).replace(/^#/,'').split('?'),params=new URLSearchParams(query);
 return{route:route||'home',params};
}
function safeView(hash){const{route,params}=view(hash);return route==='home'||route==='quran'&&params.get('view')==='reciters'&&SAFE_VIEWS.has(params.get('filter')||'all');}
function rankingView(hash){const{route,params}=view(hash);return route==='quran'&&params.get('view')==='reciters'&&params.get('filter')==='salah-top';}
export function guestRegistrationEligible({account,allowed=false,visible=false,blocked=false,listeningSeconds=0,ranking=false,dismissedAt=0,now=Date.now()}={}){
 if(!guestRankKnown(account)||account.reason==='session_expired'||!allowed||!visible||blocked)return false;
 if(!Number.isSafeInteger(now)||now<=0||!Number.isSafeInteger(dismissedAt)||dismissedAt<0)return false;
 if(dismissedAt&&now-dismissedAt<GUEST_REGISTRATION_NUDGE_DELAY)return false;
 return ranking===true||Number.isFinite(listeningSeconds)&&listeningSeconds>=GUEST_REGISTRATION_LISTENING_SECONDS;
}

// A quiet inline card: no modal, autofocus, listening timer, permission prompt or network call.
// getListeningSeconds must read the existing real-playback meter, never wall-clock elapsed time.
export function initGuestRegistrationNudge({getAccount,getListeningSeconds=()=>0,getContainer,canShow=()=>true,isAllowed=personalDataAllowed,doc=globalThis.document,win=globalThis.window,storage,now=Date.now}={}){
 let disposed=false,queued=false,card=null,sessionDismissedAt=0;
 if(typeof getAccount!=='function'||!doc||!win)return{refresh(){},dismiss(){},destroy(){}};
 if(storage===undefined)try{storage=win.localStorage;}catch{storage=null;}
 const readDismissed=()=>{try{const raw=storage?.getItem(GUEST_REGISTRATION_NUDGE_KEY);if(!storage)return null;if(raw===null||raw==='')return sessionDismissedAt;const n=Number(raw);return Number.isSafeInteger(n)&&n>0?Math.max(n,sessionDismissedAt):null;}catch{return null;}};
 function visible(node){
  if(!node?.isConnected)return false;
  for(let current=node;current&&current!==doc;current=current.parentElement){
   if(current.hidden||current.hasAttribute?.('inert')||current.getAttribute?.('aria-hidden')==='true'||current.tagName==='DIALOG'&&!current.open)return false;
   const style=win.getComputedStyle?.(current);if(style?.display==='none'||style?.visibility==='hidden')return false;
  }
  return true;
 }
 function blocked(){
  const active=doc.activeElement;
  if(active&&visible(active)&&active.matches?.('input,textarea,select,[contenteditable]:not([contenteditable="false"])'))return true;
  if([...doc.querySelectorAll(BLOCKERS+',form')].some(visible))return true;
  return !canShow();
 }
 function remove(){card?.remove();card=null;}
 function dismiss(){
  const at=now();if(Number.isSafeInteger(at)&&at>0){sessionDismissedAt=at;try{storage?.setItem(GUEST_REGISTRATION_NUDGE_KEY,String(at));}catch{}}
  remove();
 }
 function refresh(){
  if(disposed)return;
  let account,allowed=false,seconds=0,dismissedAt,host;
  try{
   account=getAccount();allowed=isAllowed()===true;dismissedAt=readDismissed();
   if(!guestRankKnown(account)||account.reason==='session_expired'||!allowed||dismissedAt===null||!safeView(win.location.hash)||doc.hidden||doc.visibilityState==='hidden'){remove();return;}
   seconds=getListeningSeconds();host=getContainer?getContainer():doc.querySelector('#app .competition-page,#app .quran-reciters-library,#app .app-home-shell')||doc.getElementById('app');
   if(!visible(host)||!guestRegistrationEligible({account,allowed,visible:true,blocked:blocked(),listeningSeconds:seconds,ranking:rankingView(win.location.hash),dismissedAt,now:now()})){remove();return;}
  }catch{remove();return;}
  if(card?.isConnected&&card.parentElement===host)return;
  remove();card=doc.createElement('section');card.className='panel guest-registration-nudge';card.setAttribute('role','region');card.setAttribute('aria-labelledby','guest-registration-nudge-title');
  card.innerHTML='<div class="panel-head"><h2 id="guest-registration-nudge-title">Сохраните прослушанное</h2></div><p>Создайте аккаунт, чтобы сохранить прослушанное в профиле и продолжить на других устройствах.</p><p class="muted">Сейчас история гостя связана с этим браузером или приложением. Коран можно слушать и без регистрации.</p><div class="admin-actions"><a class="button" href="#account" data-guest-registration-open>Создать аккаунт или войти</a><button type="button" class="text-button" data-guest-registration-dismiss>Не сейчас</button></div>';
  card.querySelector('[data-guest-registration-dismiss]').addEventListener('click',dismiss);
  card.querySelector('[data-guest-registration-open]').addEventListener('click',event=>{
   let guest=false;try{const account=getAccount();guest=guestRankKnown(account)&&account.reason!=='session_expired'&&isAllowed()===true;}catch{}
   event.preventDefault();if(!guest){remove();return;}dismiss();win.location.hash='account';
  });
  host.prepend(card);
 }
 const schedule=()=>{if(disposed||queued)return;queued=true;Promise.resolve().then(()=>{queued=false;refresh();});};
 const onStorage=event=>{if(event.key===GUEST_REGISTRATION_NUDGE_KEY||event.key===null)schedule();};
 const windowEvents=['hashchange','pageshow','salah:counter-status','salah:personal-listening','salah:personal-listening-progress','salah:guest-competition-updated','salah:settings-changed'];
 const documentEvents=['visibilitychange','focusin','focusout','close','toggle'];
 for(const name of windowEvents)win.addEventListener(name,schedule);
 for(const name of documentEvents)doc.addEventListener(name,schedule,true);
 win.addEventListener('storage',onStorage);
 const observer=typeof win.MutationObserver==='function'?new win.MutationObserver(schedule):null;
 if(doc.body)observer?.observe(doc.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','open','class','aria-hidden','inert']});
 refresh();
 return{refresh,dismiss,destroy(){if(disposed)return;disposed=true;observer?.disconnect();for(const name of windowEvents)win.removeEventListener(name,schedule);for(const name of documentEvents)doc.removeEventListener(name,schedule,true);win.removeEventListener('storage',onStorage);remove();}};
}
