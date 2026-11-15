import{uiLeaf,uiAttribute,bindUiLanguage,setUiMessage,uiMessage,uiError,setUiAttribute}from './ui.js';
import{t,translateUi,getLocale,subscribeLanguage}from './i18n.js';
import{ownerLiveActivity,verifyOwner,ownerVerified,ownerNeedsMfa,onOwnerChange}from './owner-auth.js';
import{counterSyncStatus}from './counter-account.js';
import{modal,closeModal,esc,toast}from './ui.js';
const labels={count:['listening','home.listening'],readers:['reading','home.reading'],dhikr:['dhikr','extraUi.activityDhikr']};
const guestCity=user=>{const value=user.selectedCity,clean=v=>typeof v==='string'&&v.trim()&&v.length<=160&&!/[\u0000-\u001f\u007f]/.test(v)?v.trim():null;if(!value||!clean(value.city))return uiLeaf('extraUi.cityMissing');return uiLeaf('extraUi.selectedCity',{city:clean(value.city)+(clean(value.country)?', '+clean(value.country):'')});};
export async function showHomeActivity(key){
 if(!labels[key])return;if(!ownerVerified()){let allowed=false;try{allowed=await verifyOwner();}catch(error){toast(error.uiMessage||error.message||uiMessage('extraUi.accessFailed'));return;}if(!allowed||!ownerVerified()){if(ownerNeedsMfa())location.hash='#admin';return;}}
 const account=counterSyncStatus().userId,doc=document;let closed=false,generation=0,page=1,busy=false,timer=null;
 modal('<section data-home-activity-members><div class="modal-head"><h2>'+uiLeaf(labels[key][1])+("</h2><button class=\"text-button\" data-close>"+uiLeaf("common.close")+"</button></div><p class=\"muted\">"+uiLeaf("extraUi.onlyOwner")+"</p><div data-home-members-content><p role=\"status\">"+uiLeaf("extraUi.loadingList")+"</p></div></section>"));
 const root=doc.querySelector('[data-home-activity-members]'),dialog=doc.getElementById('modal'),stopLocale=bindUiLanguage(root);
 const active=()=>!closed&&root.isConnected&&dialog.open&&counterSyncStatus().userId===account;
 const clear=()=>{if(closed)return;closed=true;stopLocale();generation++;clearInterval(timer);unsubscribe();window.removeEventListener('salah:counter-status',auth);dialog.removeEventListener('close',clear);if(root.isConnected)root.remove();};
 const auth=()=>{if(counterSyncStatus().userId!==account||!ownerVerified()&&!ownerNeedsMfa()){clear();if(dialog.open)closeModal();}};
 const unsubscribe=onOwnerChange(auth);window.addEventListener('salah:counter-status',auth);dialog.addEventListener('close',clear);
 async function refresh(){
  if(!active()||document.hidden||busy)return;busy=true;const ticket=++generation;
  try{const data=await ownerLiveActivity(labels[key][0],page);if(!active()||ticket!==generation)return;
   if(!data.users.length&&page>1){page=1;busy=false;await refresh();return;}
   const area=root.querySelector('[data-home-members-content]');
   area.innerHTML='<p class="muted">'+uiLeaf('extraUi.nowCount',{count:data.total})+'</p>'+(data.users.length?'<div class="owner-live-members">'+data.users.map(user=>user.guest?'<span class="owner-live-member">'+esc(user.nickname)+(" <small class=\"muted\">"+uiLeaf("extraUi.unregistered")+"</small><small class=\"muted\">")+guestCity(user)+'</small></span>':'<span class="owner-live-member">'+esc(user.nickname)+'</span>').join('')+'</div>':("<p>"+uiLeaf("extraUi.noPeople")+"</p>"))+(data.total>50?'<div class="button-row"><button class="text-button" data-live-prev '+(page===1?'disabled':'')+(">"+uiLeaf("common.back")+"</button><span>")+page+'</span><button class="text-button" data-live-next '+(page*50>=data.total?'disabled':'')+(">"+uiLeaf("ownerUi.next")+"</button></div>"):'');
   translateUi(area);area.querySelectorAll('a').forEach(link=>link.onclick=()=>{clear();closeModal();});
   const prev=area.querySelector('[data-live-prev]'),next=area.querySelector('[data-live-next]');
   if(prev)prev.onclick=()=>{page--;void refresh();};if(next)next.onclick=()=>{page++;void refresh();};
  }catch(error){if(active()&&ticket===generation){root.querySelector('[data-home-members-content]').innerHTML='<p role="status">'+(error.uiMessage?uiLeaf(error.uiMessage.key,error.uiMessage.params):error.message?esc(error.message):uiLeaf('extraUi.listUnavailable'))+'</p>';}}
  finally{busy=false;}
 }
 timer=setInterval(()=>void refresh(),15000);void refresh();
}
