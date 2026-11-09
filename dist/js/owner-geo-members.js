import{esc}from './ui.js';
import{ownerUserRow}from './owner-user-list.js';
import{createStaffAvatarManager}from './owner-team-avatars.js';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function geoMembersModel(value,period,selection,page){
 if(value?.period!==period||value.page!==page||value.selection?.kind!==selection.kind||value.selection?.city!==selection.city||value.selection?.country!==selection.country||!Number.isSafeInteger(value.total)||value.total<0||!Array.isArray(value.users)||value.users.length>50||value.users.length>value.total)throw Error('invalid_members');
 const seen=new Set();for(const user of value.users){if(!uuid.test(user?.id||'')||seen.has(user.id)||typeof user.nickname!=='string'||!user.nickname.trim()||user.nickname.length>40||typeof user.online!=='boolean')throw Error('invalid_members');seen.add(user.id);}
 return value;
}
export function mountOwnerGeoMembers(host,{load,isActive=()=>true,onBack=()=>{},onUser=()=>{},onDenied=()=>{}}){
 let generation=0,disposed=false,selection=null,period=7,page=1,model=null,avatars=null,avatarFrame=null;
 const alive=()=>!disposed&&isActive();
 const doc=host.ownerDocument,win=doc.defaultView;
 const hydrateAvatars=()=>{if(avatars&&model&&alive())void avatars.hydrate(host);};
 const onAvatarScroll=()=>{if(!alive()||avatarFrame!==null)return;avatarFrame=win.requestAnimationFrame(()=>{avatarFrame=null;hydrateAvatars();});};
 const stopAvatars=()=>{avatars?.dispose();avatars=null;win.removeEventListener('scroll',onAvatarScroll,true);if(avatarFrame!==null){win.cancelAnimationFrame(avatarFrame);avatarFrame=null;}};

 const render=(message='')=>{
  if(!alive()){stopAvatars();host.innerHTML='';return;}
  const label=selection.kind==='city'?[selection.city,selection.country].filter(Boolean).join(', '):selection.country;
  host.innerHTML='<button type="button" class="text-button owner-geo-back" id="owner-geo-back" data-geo-back>← География</button><h3 class="owner-geo-members-title">'+esc(label)+'</h3><p class="owner-geo-note">Аккаунты за '+(period===1?'24 часа':period+' дней')+(model?' · '+model.total.toLocaleString('ru-RU'):'')+'</p><p role="status" aria-live="polite" class="owner-geo-status">'+esc(message)+'</p>'+(model?'<div class="owner-user-rows">'+model.users.map(user=>ownerUserRow(user)).join('')+'</div>'+(!model.users.length?'<p class="owner-geo-note">За этот период пользователей нет.</p>':'')+(model.total>50?'<div class="owner-geo-pagination"><button type="button" class="text-button" data-geo-prev '+(page===1?'disabled':'')+'>Назад</button><span>'+page+' / '+Math.ceil(model.total/50)+'</span><button type="button" class="text-button" data-geo-next '+(page*50>=model.total?'disabled':'')+'>Далее</button></div>':''):'')+'<button type="button" class="text-button owner-geo-members-refresh" data-geo-refresh>Обновить</button>';
  host.querySelector('[data-geo-back]').onclick=onBack;host.querySelector('[data-geo-refresh]').onclick=refresh;
  host.querySelectorAll('[data-user]').forEach(button=>button.onclick=()=>{const user=model.users.find(u=>u.id===button.dataset.user);if(user)onUser(user,button);});
  if(model?.users.length&&!avatars){
   avatars=createStaffAvatarManager({doc,isActive:alive,includeNode:node=>{const rect=node.getBoundingClientRect();return rect.height>0&&rect.bottom>=-120&&rect.top<=win.innerHeight+120;}});
   win.addEventListener('scroll',onAvatarScroll,{passive:true,capture:true});
  }
  hydrateAvatars();
  const prev=host.querySelector('[data-geo-prev]'),next=host.querySelector('[data-geo-next]');if(prev)prev.onclick=()=>{page--;model=null;void refresh();};if(next)next.onclick=()=>{page++;model=null;void refresh();};
 };
 const clear=()=>{generation++;model=null;stopAvatars();host.innerHTML='';};
 const refresh=async()=>{const version=++generation;render(model?'Обновляем…':'Загружаем пользователей…');try{const result=await load(period,selection,page);if(version!==generation||!alive())return;model=geoMembersModel(result,period,selection,page);render();}catch(e){if(version!==generation||disposed)return;if(e?.status===401||e?.status===403||!alive()){clear();onDenied();return;}render(model?'Не удалось обновить. Показан последний список.':'Не удалось загрузить пользователей.');}};
 return{open(next,days){stopAvatars();selection={...next};period=days;page=1;model=null;return refresh();},refresh,clear,dispose(){clear();disposed=true;}};
}
