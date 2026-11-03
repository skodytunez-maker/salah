import{mountOwnerReturnCampaign}from './owner-return.js';
import{mountOwnerVisitors}from './owner-visitors.js';
import{mountOwnerGeography}from './owner-geography.js';
import{ownerActivityView,bindOwnerActivity}from './owner-activity.js';
import{ownerUserRow}from './owner-user-list.js';
import{mountOwnerWorkspace}from './owner-workspace.js';
import{actionIcon,actionLabel}from './action-icons.js';
import{mountOwnerErrorSummary}from './owner-error-summary.js';
import{bindOwnerCardNavigation,createOwnerCardHistory}from './owner-card-navigation.js';
import{analyticsSite}from './analytics.js';
import{esc,title}from './ui.js';
import{notificationLabels}from './notification-status.js';
import{ownerUserCard,validOwnerUserId,bindOwnerNotificationInfo}from './owner-user-card.js';
import{createOwnerUserDetail}from './owner-user-detail.js';
import{ownerVerified,verifyOwner,signInOwner,signOutOwner,ownerStatistics,ownerGeography,ownerGeoMembers,ownerVisitors,ownerUsers,ownerReleases,ownerNeedsMfa,ownerMfaFactors,enrollOwnerMfa,verifyOwnerMfa,onOwnerChange}from './owner-auth.js';
let screen=0,period=7;

async function showMfa(app,active,options){
 app.innerHTML=(options.embedded?'<h2>Защищённый вход</h2>':title('Защищённый вход'))+'<section class="panel section owner-login"><h2>Google Authenticator</h2><div id="owner-mfa-step"><p class="muted" role="status">Проверяем второй этап входа…</p></div><button class="text-button" id="owner-mfa-logout">Выйти из аккаунта</button></section>';
 app.querySelector('#owner-mfa-logout').onclick=async()=>{await signOutOwner();if(active())showAdmin(app,options);};
 const area=app.querySelector('#owner-mfa-step');
 let factors;
 try{factors=await ownerMfaFactors();}catch(error){if(active())area.textContent=error.message;return;}
 if(!active())return;
 const codeForm=factorId=>{
  const form=app.querySelector('#owner-mfa-code');
  form.onsubmit=async event=>{
   event.preventDefault();const button=form.querySelector('button'),input=form.querySelector('input'),status=form.querySelector('[role="status"]');button.disabled=true;status.textContent='Проверяем код…';
   try{await verifyOwnerMfa(factorId,input.value.trim());if(active())showAdmin(app,options);}
   catch(error){if(active())status.textContent=error.message;}
   finally{input.value='';button.disabled=false;}
  };
 };
 const formHtml='<form id="owner-mfa-code"><div class="field"><label for="owner-totp">Код из Google Authenticator</label><input id="owner-totp" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" minlength="6" maxlength="6" required placeholder="000000"></div><button class="button" type="submit">Подтвердить вход</button><p class="muted" role="status" aria-live="polite"></p></form>';
 if(factors.length){
  area.innerHTML='<p class="muted">Введите одноразовый код для SALAH.</p>'+ (factors.length>1?'<div class="field"><label for="owner-factor">Аутентификатор</label><select id="owner-factor">'+factors.map(f=>'<option value="'+esc(f.id)+'">'+esc(f.friendly_name||'SALAH')+'</option>').join('')+'</select></div>':'')+formHtml;
  codeForm(factors[0].id);
  if(factors.length>1)app.querySelector('#owner-factor').onchange=event=>codeForm(event.target.value);
  return;
 }
 area.innerHTML='<p class="muted">Привяжите Google Authenticator к кабинету SALAH. Статистика откроется после подтверждения шестизначным кодом.</p><button class="button" id="owner-mfa-enroll">Настроить Google Authenticator</button><p class="muted" role="status" aria-live="polite"></p>';
 app.querySelector('#owner-mfa-enroll').onclick=async event=>{
  event.target.disabled=true;
  try{
   const enrollment=await enrollOwnerMfa();if(!active())return;
   area.innerHTML='<p class="muted">В Google Authenticator нажмите «+» и отсканируйте QR-код. Сохраните ключ в надёжном месте: он позволит восстановить коды при потере телефона.</p><img class="owner-mfa-qr" alt="QR-код для привязки Google Authenticator"><details class="owner-mfa-key"><summary>Ключ для ручного ввода и резервной копии</summary><p class="muted">Название: SALAH. Тип ключа: по времени. Не отправляйте этот ключ другим людям.</p><code></code></details>'+formHtml;
   const qr=enrollment.totp.qr_code;
   app.querySelector('.owner-mfa-qr').src=qr.startsWith('data:image/')?qr:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(qr);
   app.querySelector('.owner-mfa-key code').textContent=enrollment.totp.secret;
   codeForm(enrollment.id);
  }catch(error){if(active()){area.querySelector('[role="status"]').textContent=error.message;event.target.disabled=false;}}
 };
}

export async function showAdmin(app,options={}){
 app.ownerDispose?.();
 const id=++screen;app.dataset.ownerScreen=String(id);
 const active=()=>app.dataset.ownerScreen===String(id)&&(options.isActive?options.isActive():location.hash.split('?')[0]==='#admin');
 app.innerHTML=(options.embedded?'':title('Кабинет владельца'))+'<section class="panel section"><p role="status">Проверяем доступ…</p></section>';
 let allowed=ownerVerified(),accessError=null;
 if(!allowed)try{allowed=await verifyOwner();}catch(error){accessError=error;}
 if(!active())return;
 if(!allowed&&accessError&&![401,403].includes(accessError.status)){
  app.innerHTML=(options.embedded?'':title('Кабинет владельца'))+'<section class="panel section owner-login"><p role="status">Сервис входа временно не отвечает. Не удалось проверить доступ к кабинету.</p><p class="muted">Повторная регистрация не нужна. Сохранённый вход не очищается.</p><button type="button" class="button" id="owner-access-retry">Повторить проверку</button><a class="text-button" href="#more">Вернуться в меню</a></section>';
  const retry=()=>{if(active()&&!document.hidden)void showAdmin(app,options);};
  const timer=setTimeout(retry,30000);window.addEventListener('online',retry);
  app.ownerDispose=()=>{clearTimeout(timer);window.removeEventListener('online',retry);};
  app.querySelector('#owner-access-retry').onclick=retry;return;
 }
 if(!allowed&&ownerNeedsMfa()){await showMfa(app,active,options);return;}
 if(!allowed){
  if(options.embedded){app.innerHTML='';return;}
  app.innerHTML=title('Вход владельца')+'<section class="panel section owner-login"><p class="muted">Войдите в личный аккаунт SALAH. Доступ к кабинету проверяется на сервере.</p><form id="owner-login"><div class="field"><label for="owner-email">Электронная почта</label><input id="owner-email" type="email" autocomplete="username" required maxlength="254"></div><div class="field"><label for="owner-password">Пароль</label><input id="owner-password" type="password" autocomplete="current-password" required maxlength="256"></div><button class="button" type="submit">Войти</button><p class="owner-status muted" role="status" aria-live="polite"></p></form><a class="text-button" href="#more">Вернуться в меню</a></section>';
  const form=app.querySelector('#owner-login');
  form.onsubmit=async event=>{
   event.preventDefault();const button=form.querySelector('button');const password=form.querySelector('#owner-password');const status=form.querySelector('.owner-status');button.disabled=true;status.textContent='Проверяем вход…';
   try{await signInOwner(form.querySelector('#owner-email').value,password.value);if(active())showAdmin(app,options);}
   catch(error){if(active())status.textContent=error.message;}
   finally{password.value='';button.disabled=false;}
  };
  return;
 }
 let stopActivity=()=>{},selectedActivityDay=null,lastStats=null,lastStatsPeriod=null;
 const site=analyticsSite();
 const detailedReports=site?'<a class="text-button owner-reports-link" href="'+esc(site)+'" target="_blank" rel="noopener noreferrer">Подробные отчёты в GoatCounter '+actionIcon('external')+'</a>':'';
 app.innerHTML=(options.embedded?'':title('Кабинет владельца'))+'<a class="list-button owner-support-link" href="#support?owner=1"><span>Обращения пользователей<span class="support-state-dot" data-owner-support-status hidden></span></span></a><section class="panel section admin-intro"><div class="owner-topline"><span class="owner-private"><span aria-hidden="true">●</span> Личный кабинет</span>'+(options.embedded?'':'<button class="text-button" id="owner-sign-out">Выйти</button>')+'</div><div class="owner-sections" role="tablist" aria-label="Разделы кабинета">'+[['users','Пользователи'],['activity','Посещения']].map(([view,label])=>'<button type="button" id="owner-tab-'+view+'" data-view="'+view+'" role="tab" aria-controls="owner-panel-'+view+'">'+label+(view==='users'?'<span id="owner-users-count" aria-live="polite">…</span>':'')+'</button>').join('')+'</div><div id="owner-periods" class="owner-periods" role="group" aria-label="Период статистики">'+[[1,'Сутки'],[7,'Неделя'],[30,'Месяц']].map(([days,label])=>'<button type="button" data-period="'+days+'" aria-pressed="'+(period===days)+'">'+label+'</button>').join('')+'</div><div id="owner-panel-users" class="owner-view owner-users" role="tabpanel" aria-labelledby="owner-tab-users" hidden><div id="owner-users-list"></div></div><div id="owner-panel-activity" class="owner-view" role="tabpanel" aria-labelledby="owner-tab-activity" hidden><div id="owner-visitors-content"></div><div class="owner-chart-heading"><span class="owner-activity-label">Посетители сайта</span><button type="button" class="text-button" id="owner-refresh">Обновить</button></div><p id="owner-activity-status" role="status" aria-live="polite"></p><div id="owner-activity-content"></div><div id="owner-geography-content"></div></div><section class="owner-release-history"><button type="button" class="text-button" id="owner-release-toggle" aria-expanded="false" aria-controls="owner-release-content">Изменения кабинета</button><div id="owner-release-content" class="owner-release-content" hidden></div></section></section>';
 const stopOwnerReturn=mountOwnerReturnCampaign(app.querySelector('#owner-panel-users'),{isActive:active});
 const visitors=mountOwnerVisitors(app.querySelector('#owner-visitors-content'),{load:ownerVisitors,isActive:()=>active()&&ownerVerified()});
 const geography=mountOwnerGeography(app.querySelector('#owner-geography-content'),{load:ownerGeography,loadMembers:ownerGeoMembers,onUser:(user,button)=>openUser(user,button),isActive:()=>active()&&ownerVerified()});
 mountOwnerErrorSummary(app.querySelector('.admin-intro'),{isActive:active});
 if(!active())return;const workspace=mountOwnerWorkspace(app,{isActive:active,onSelect:view=>selectView(view)});
 globalThis.window?.dispatchEvent?.(new Event('salah:support-status-refresh'));
 const history=app.querySelector('#owner-release-toggle'),historyContent=app.querySelector('#owner-release-content');let historyOpen=false;
 history.onclick=async()=>{historyOpen=!historyOpen;history.setAttribute('aria-expanded',String(historyOpen));historyContent.hidden=!historyOpen;
  if(!historyOpen||historyContent.dataset.loaded)return;historyContent.textContent='Загружаем изменения…';
  try{const data=await ownerReleases();if(!active()||!historyOpen)return;if(!Array.isArray(data.releases))throw Error('Не удалось загрузить изменения.');
   historyContent.innerHTML=data.releases.slice(0,12).map(row=>'<div><strong>'+esc(row.date)+(row.version?' · '+esc(row.version):'')+'</strong><ul>'+(Array.isArray(row.changes)?row.changes:[]).filter(x=>typeof x==='string').slice(0,8).map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul></div>').join('');historyContent.dataset.loaded='1';
  }catch(error){if(active()&&historyOpen)historyContent.textContent=error.message;}
 };
 const panels=Object.fromEntries(['home','users','activity','teachers','team','tools'].map(view=>[view,app.querySelector('#owner-panel-'+view)])),tabs=Array.from(app.querySelectorAll('[data-view]'));
 const requestedView=new URLSearchParams(location.hash.split('?')[1]||'').get('view');const initialView=requestedView==='overview'?'activity':requestedView;let selectedView=initialView==='profile'?'users':Object.hasOwn(panels,initialView)?initialView:'home',usersPage=1,usersLoad=0,usersBusy=false,usersLoaded=false,usersSnapshot=[],selectedUser=null,profileOpener=null;
 const cardArea=app.querySelector('#owner-panel-users');cardArea.insertAdjacentHTML('beforeend','<section class="owner-profile-screen" id="owner-user-detail" hidden><header class="owner-profile-navigation"><button type="button" class="text-button" id="owner-user-back">'+actionLabel('back','Пользователи')+'</button><button type="button" class="text-button" id="owner-user-refresh">Обновить</button></header><div id="owner-user-card"></div><p class="muted owner-card-status" id="owner-user-card-status" role="status" aria-live="polite"></p></section>');
 const detail=app.querySelector('#owner-user-detail'),card=app.querySelector('#owner-user-card'),cardStatus=app.querySelector('#owner-user-card-status');
 app.append?.(detail);
 let privateProfile={};
 const profileDetail=createOwnerUserDetail({isActive:active,onChange:state=>{privateProfile=state;renderCard();}});
 const renderCard=()=>{if(!selectedUser)return;const focused=document.activeElement?.id==='owner-user-name',markup=ownerUserCard(selectedUser,privateProfile);if(card.innerHTML!==markup){const top=card.scrollTop;card.innerHTML=markup;bindOwnerNotificationInfo(card);if(focused)card.querySelector('#owner-user-name').focus({preventScroll:true});card.scrollTop=top;}};
 let listPosition=null;
 const closeCard=()=>{const previous=selectedUser?.id;profileDetail.reset();privateProfile={};selectedUser=null;detail.hidden=true;card.innerHTML='';cardStatus.textContent='';app.classList.remove('owner-profile-open');document.body?.classList.remove('owner-profile-page');app.querySelector('#owner-users-list').hidden=false;if(profileOpener?.isConnected!==false&&profileOpener?.focus)profileOpener.focus({preventScroll:true});else Array.from(app.querySelectorAll('[data-user]')).find(button=>button.dataset.user===previous)?.focus({preventScroll:true});profileOpener=null;if(listPosition)window.scrollTo?.({...listPosition,behavior:'instant'});};
 const cardHistory=createOwnerCardHistory({dismiss:closeCard,isActive:active,win:window,profileUrl:href=>href.split('#')[0]+'#admin?view=profile',onRoute:()=>window.dispatchEvent?.(new Event('salah:route-history'))});
 const openUser=(user,opener=null)=>{if(!validOwnerUserId(user.id)||!cardHistory.open())return;profileOpener=opener;listPosition={left:window.scrollX||0,top:window.scrollY||0};selectedUser=user;renderCard();cardStatus.textContent='';app.querySelector('#owner-users-list').hidden=true;detail.hidden=false;app.classList.add('owner-profile-open');document.body?.classList.add('owner-profile-page');window.scrollTo?.({top:0,left:0,behavior:'instant'});card.scrollTop=0;card.querySelector('#owner-user-name').focus({preventScroll:true});void profileDetail.select(user.id);};
 app.querySelector('#owner-user-back').onclick=()=>cardHistory.back();
 bindOwnerCardNavigation(detail,{dismiss:()=>cardHistory.back(),isOpen:()=>!!selectedUser});
 app.querySelector('#owner-user-refresh').onclick=()=>{void profileDetail.refresh();return readUsers(true);};
  const readUsers=async(quiet=false)=>{if(quiet&&usersBusy)return;usersBusy=true;const version=++usersLoad,area=app.querySelector('#owner-users-list'),count=app.querySelector('#owner-users-count');if(!quiet||!area.children.length)area.innerHTML='<p class="muted" role="status">Загружаем пользователей…</p>';try{const result=await ownerUsers(usersPage);if(!active()||version!==usersLoad)return;if(!Number.isSafeInteger(result.total)||result.total<0||!Array.isArray(result.users))throw Error('Список пользователей временно недоступен.');count.textContent=result.total.toLocaleString('ru-RU');const date=value=>value?new Date(value).toLocaleString('ru-RU',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'Ещё не входил';usersSnapshot=result.users;usersLoaded=true;
 if(selectedUser){const current=usersSnapshot.find(user=>user.id===selectedUser.id);if(current){selectedUser=current;renderCard();cardStatus.textContent='';}else cardStatus.textContent='Пользователь сейчас на другой странице списка. Данные карточки пока не обновлены.';}
 const focusedUid=document.activeElement?.closest?.('[data-user]')?.dataset.user;area.innerHTML='<p class="owner-users-heading"><span>Зарегистрировано: '+result.total+'</span><span class="presence-status is-online">'+(result.online||0)+' в сети</span></p><div class="owner-user-rows">'+(result.users.length?result.users.map(user=>ownerUserRow(user)).join(''):'<p class="muted">Пока нет зарегистрированных пользователей.</p>')+'</div>'+(result.total>50?'<div class="button-row"><button class="text-button" id="users-prev" '+(usersPage===1?'disabled':'')+'>Назад</button><span>'+usersPage+' / '+Math.ceil(result.total/50)+'</span><button class="text-button" id="users-next" '+(usersPage*50>=result.total?'disabled':'')+'>Далее</button></div>':'')+'<button class="text-button" id="users-refresh">Обновить список</button>';area.querySelectorAll('[data-user]').forEach(button=>button.onclick=()=>{const user=usersSnapshot.find(row=>row.id===button.dataset.user);if(user)openUser(user);});void hydrateUserAvatars();if(focusedUid&&detail.hidden)Array.from(area.querySelectorAll('[data-user]')).find(button=>button.dataset.user===focusedUid)?.focus({preventScroll:true});const prev=area.querySelector('#users-prev'),next=area.querySelector('#users-next');if(prev)prev.onclick=()=>{usersPage--;readUsers();};if(next)next.onclick=()=>{usersPage++;readUsers();};area.querySelector('#users-refresh').onclick=()=>readUsers();}catch(error){if(active()&&version===usersLoad){if(selectedUser){cardStatus.textContent=error.message;return;}if(quiet&&usersLoaded){area.querySelector('#users-refresh').textContent='Не удалось обновить · Повторить';return;}count.textContent='—';area.innerHTML='<p class="muted" role="status">'+esc(error.message)+'</p><button type="button" class="text-button" id="users-retry">Повторить</button>';area.querySelector('#users-retry').onclick=()=>readUsers();}}finally{if(version===usersLoad)usersBusy=false;}};
 let listAvatars=null,avatarLoading=null,avatarBusy=false,avatarAgain=false,avatarScrollTimer=null;
 const hydrateUserAvatars=async()=>{if(!active()||selectedView!=='users'||selectedUser)return;if(avatarBusy){avatarAgain=true;return;}avatarBusy=true;try{if(!listAvatars){avatarLoading??=import('./owner-team-avatars.js');const {createStaffAvatarManager}=await avatarLoading;if(!active()||selectedView!=='users'||selectedUser)return;listAvatars=createStaffAvatarManager({isActive:()=>active()&&selectedView==='users'&&!selectedUser,includeNode:node=>{const r=node.getBoundingClientRect();return r.height>0&&r.bottom>=-120&&r.top<(window.innerHeight||800)+120;}});}await listAvatars.hydrate(app.querySelector('#owner-users-list'));}catch{}finally{avatarBusy=false;if(avatarAgain){avatarAgain=false;void hydrateUserAvatars();}}};
 const avatarScroll=()=>{if(!active()||selectedView!=='users'||selectedUser||avatarScrollTimer!==null)return;avatarScrollTimer=setTimeout(()=>{avatarScrollTimer=null;void hydrateUserAvatars();},100);};window.addEventListener('scroll',avatarScroll,{passive:true,capture:true});
 const selectView=view=>{if(view==='overview')view='activity';if(!Object.hasOwn(panels,view))view='home';if(!workspace.canLeave(view))return false;workspace.select(view);if(view!=='users'&&selectedUser)cardHistory.back();selectedView=view;if(view!=='users'){listAvatars?.dispose();listAvatars=null;}else void hydrateUserAvatars();for(const [name,panel]of Object.entries(panels))panel.hidden=name!==view;for(const tab of tabs){const selected=tab.dataset.view===view;tab.setAttribute('aria-selected',String(selected));tab.setAttribute('tabindex',selected?'0':'-1');}app.querySelector('#owner-periods').hidden=view!=='activity';if(view==='users'&&usersLoad>0)void readUsers(true);return true;};
 tabs.forEach((tab,index)=>{tab.onclick=()=>workspace.navigate(tab.dataset.view);tab.onkeydown=event=>{const target=event.key==='Home'?0:event.key==='End'?tabs.length-1:event.key==='ArrowRight'?(index+1)%tabs.length:event.key==='ArrowLeft'?(index+tabs.length-1)%tabs.length:null;if(target===null)return;event.preventDefault();workspace.navigate(tabs[target].dataset.view);if(tabs[target].getAttribute('aria-selected')==='true')tabs[target].focus();};});
 selectView(selectedView);
 const presenceTimer=setInterval(()=>{if(!active()){app.ownerDispose?.();return;}if(!document.hidden&&selectedView==='users')void readUsers(true);},30000);
 const closePolling=()=>{if(!active())app.ownerDispose?.();};window.addEventListener('hashchange',closePolling);
 app.ownerHandleRoute=hash=>{if(!active()||!ownerVerified()||hash.split('?')[0]!=='#admin')return false;const requested=new URLSearchParams(hash.split('?')[1]||'').get('view')||'home';if(requested==='profile')return !!selectedUser;const target=requested==='overview'?'activity':Object.hasOwn(panels,requested)?requested:'home';if(target!==selectedView)selectView(target);return true;};
 app.ownerDispose=()=>{stopOwnerReturn();visitors.dispose();geography.dispose();stopActivity();delete app.ownerHandleRoute;document.body?.classList.remove('owner-profile-page');listAvatars?.dispose();listAvatars=null;if(avatarScrollTimer!==null)clearTimeout(avatarScrollTimer);window.removeEventListener('scroll',avatarScroll,true);workspace.dispose();profileDetail.dispose();privateProfile={};cardHistory.dispose();clearInterval(presenceTimer);window.removeEventListener('hashchange',closePolling);};
 let load=0;
 const readStats=async()=>{
  void visitors.refresh(period);
  void geography.refresh(period);
  const version=++load,activity=app.querySelector('#owner-activity-content'),status=app.querySelector('#owner-activity-status'),button=app.querySelector('#owner-refresh');
  status.className='';status.textContent=lastStats?'Обновляем статистику…':'Загружаем статистику…';activity.setAttribute('aria-busy','true');button.disabled=true;button.textContent='Обновляем…';
  if(!lastStats)activity.innerHTML='<p class="muted" role="status">Загружаем статистику…</p>';
  try{
   const stats=await ownerStatistics(period);if(!active()||version!==load)return;
   if(!Number.isSafeInteger(stats.total)||stats.total<0||!Array.isArray(stats.stats))throw Error('Статистика временно недоступна.');
   const view=ownerActivityView(stats,period,selectedActivityDay,detailedReports);
   stopActivity();activity.innerHTML=view.html;stopActivity=bindOwnerActivity(activity,view.model,{onSelect:day=>selectedActivityDay=day});lastStats=stats;lastStatsPeriod=period;status.textContent='';
  }catch(error){if(active()&&version===load){
   if(error?.status===401||error?.status===403||!ownerVerified()){visitors.clear();geography.clear();stopActivity();lastStats=null;lastStatsPeriod=null;selectedActivityDay=null;}
   status.className='owner-activity-warning';status.textContent=lastStats?'Не удалось обновить. Показаны последние загруженные данные.':error.message;
   if(!lastStats)activity.innerHTML='';
   else{if(period!==lastStatsPeriod){void visitors.refresh(lastStatsPeriod);void geography.refresh(lastStatsPeriod);}period=lastStatsPeriod;app.querySelectorAll('[data-period]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.period)===period)));}
  }}finally{if(active()&&version===load){activity.setAttribute('aria-busy','false');button.disabled=false;button.textContent='Обновить';}}
 };
 app.querySelector('#owner-refresh').onclick=readStats;
 app.querySelectorAll('[data-period]').forEach(button=>button.onclick=()=>{period=Number(button.dataset.period);app.querySelectorAll('[data-period]').forEach(item=>item.setAttribute('aria-pressed',String(Number(item.dataset.period)===period)));readStats();});
 if(app.querySelector('#owner-sign-out'))app.querySelector('#owner-sign-out').onclick=async()=>{try{await signOutOwner();if(active())showAdmin(app,options);}catch(error){if(active())app.querySelector('#owner-activity-status').textContent=error.message;}};
 if(initialView==='profile'&&window.location){window.history?.replaceState(window.history.state,'','#admin?view=users');window.dispatchEvent?.(new Event('salah:route-history'));}readUsers();readStats();
}

// The account shell owns navigation. This panel never grants access from a
// saved session or client-side identity; the existing server gate and MFA stay.
export async function mountOwnerAccount(container,{isActive}={}){
 if(container.dataset.ownerAccountMount)return;container.dataset.ownerAccountMount='1';
 const active=()=>container.isConnected&&location.hash.split('?')[0]==='#account'&&(!isActive||isActive());let unsubscribe=()=>{};
 const cleanup=()=>{if(!active()){unsubscribe();delete container.dataset.ownerAccountMount;window.removeEventListener('hashchange',cleanup);}};
 const update=()=>{if(!active()){cleanup();return;}if(!ownerVerified()&&!ownerNeedsMfa()){container.hidden=true;container.replaceChildren?.();container.innerHTML='';return;}container.hidden=false;container.innerHTML='<a class="owner-cabinet-launch" href="#admin"><span>Кабинет владельца</span><span aria-hidden="true">→</span></a>';};
 unsubscribe=onOwnerChange(update);window.addEventListener('hashchange',cleanup);try{await verifyOwner();}catch{}update();
}
