import{ownerLiveActivity,verifyOwner,ownerVerified,ownerNeedsMfa,onOwnerChange}from './owner-auth.js';
import{counterSyncStatus}from './counter-account.js';
import{modal,closeModal,esc,toast}from './ui.js';
const labels={count:['listening','Слушают Коран'],readers:['reading','Читают Коран'],dhikr:['dhikr','Делают зикр']};
export async function showHomeActivity(key){
 if(!labels[key])return;if(!ownerVerified()){let allowed=false;try{allowed=await verifyOwner();}catch(error){toast(error.message||'Не удалось проверить доступ.');return;}if(!allowed||!ownerVerified()){if(ownerNeedsMfa())location.hash='#admin';return;}}
 const account=counterSyncStatus().userId,doc=document;let closed=false,generation=0,page=1,busy=false,timer=null;
 modal('<section data-home-activity-members><div class="modal-head"><h2>'+labels[key][1]+'</h2><button class="text-button" data-close>Закрыть</button></div><p class="muted">Только для владельца</p><div data-home-members-content><p role="status">Загружаем список…</p></div></section>');
 const root=doc.querySelector('[data-home-activity-members]'),dialog=doc.getElementById('modal');
 const active=()=>!closed&&root.isConnected&&dialog.open&&counterSyncStatus().userId===account;
 const clear=()=>{if(closed)return;closed=true;generation++;clearInterval(timer);unsubscribe();window.removeEventListener('salah:counter-status',auth);dialog.removeEventListener('close',clear);if(root.isConnected)root.remove();};
 const auth=()=>{if(counterSyncStatus().userId!==account||!ownerVerified()&&!ownerNeedsMfa()){clear();if(dialog.open)closeModal();}};
 const unsubscribe=onOwnerChange(auth);window.addEventListener('salah:counter-status',auth);dialog.addEventListener('close',clear);
 async function refresh(){
  if(!active()||document.hidden||busy)return;busy=true;const ticket=++generation;
  try{const data=await ownerLiveActivity(labels[key][0],page);if(!active()||ticket!==generation)return;
   if(!data.users.length&&page>1){page=1;busy=false;await refresh();return;}
   const area=root.querySelector('[data-home-members-content]');
   area.innerHTML='<p class="muted">Сейчас: '+data.total+'</p>'+(data.users.length?'<div class="owner-live-members">'+data.users.map(user=>user.guest?'<span class="owner-live-member">'+esc(user.nickname)+' <small class="muted">Без регистрации</small></span>':'<span class="owner-live-member">'+esc(user.nickname)+'</span>').join('')+'</div>':'<p>Сейчас никого нет.</p>')+(data.total>50?'<div class="button-row"><button class="text-button" data-live-prev '+(page===1?'disabled':'')+'>Назад</button><span>'+page+'</span><button class="text-button" data-live-next '+(page*50>=data.total?'disabled':'')+'>Далее</button></div>':'');
   area.querySelectorAll('a').forEach(link=>link.onclick=()=>{clear();closeModal();});
   const prev=area.querySelector('[data-live-prev]'),next=area.querySelector('[data-live-next]');
   if(prev)prev.onclick=()=>{page--;void refresh();};if(next)next.onclick=()=>{page++;void refresh();};
  }catch(error){if(active()&&ticket===generation){root.querySelector('[data-home-members-content]').innerHTML='<p role="status">'+esc(error.message||'Список временно недоступен.')+'</p>';}}
  finally{busy=false;}
 }
 timer=setInterval(()=>void refresh(),15000);void refresh();
}
