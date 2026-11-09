import{staffIcon}from './staff-markup.js';
import{esc}from './ui.js';
import{notificationLabels}from './notification-status.js';
import{formatListeningTime}from './reciter-popularity-core.js';
import{reciterInfo}from './quran-reciters.js';
import{reciterImageUrl}from './approved-catalog.js';
import{awardInfo,awardArtwork,awardPeriod,calendarAward,validAwardDate}from './quran-awards-core.js';
export const validOwnerUserId=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export function ownerUserDate(value){return typeof value==='string'&&Number.isFinite(Date.parse(value))?new Date(value).toLocaleString('ru-RU',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'Нет данных';}
function ownerAvatar(url,nickname){
 if(typeof url!=='string'||!url.startsWith('blob:'))return '<div class="owner-user-avatar" aria-hidden="true">'+esc(Array.from(nickname.trim())[0].toLocaleUpperCase('ru-RU'))+'</div>';
 return '<button type="button" class="owner-user-avatar owner-avatar-open" aria-label="Увеличить аватарку пользователя" aria-haspopup="dialog"><img src="'+esc(url)+'" alt=""></button><dialog class="owner-avatar-preview" aria-label="Аватарка пользователя"><button type="button" class="owner-avatar-close" aria-label="Закрыть фото">×</button><img src="'+esc(url)+'" alt="Аватарка пользователя"></dialog>';
}
export function bindOwnerAvatarPreview(card){
 const button=card.querySelector('.owner-avatar-open'),preview=card.querySelector('.owner-avatar-preview');if(!button||!preview)return;
 button.onclick=event=>{event.stopPropagation();if(!preview.open)preview.showModal();};
 preview.querySelector('.owner-avatar-close').onclick=()=>preview.close();
 preview.onclick=event=>{event.stopPropagation();if(event.target===preview)preview.close();};
 preview.addEventListener('close',()=>{if(button.isConnected)button.focus();});
}
function reciterRow(row,time){let info;try{info=reciterInfo(row.id);}catch{info={name:'Чтец',portrait:null};}return '<li><img class="owner-profile-reciter-image" src="'+esc(reciterImageUrl(info.portrait))+'" alt="" width="40" height="40" loading="lazy" decoding="async"><span>'+esc(info.name)+'</span><strong>'+time(row.seconds)+'</strong></li>';}
function ownerAwards(awards){
 const tiles=awards.slice(0,20).map(row=>{
  const info=awardInfo(row.kind);if(!info)return '';
  return '<li><button type="button" class="owner-award-button" data-owner-award="'+info.kind+'" aria-haspopup="dialog"><img src="'+esc(awardArtwork(info.kind))+'" alt="" loading="lazy"><strong>'+esc(info.title)+(row.count>1?' · '+row.count:'')+'</strong></button></li>';
 }).join('');
 return '<section class="owner-profile-panel owner-profile-awards" aria-labelledby="owner-profile-awards-title"><h2 id="owner-profile-awards-title">Награды</h2>'+(tiles?'<ul class="owner-award-grid">'+tiles+'</ul><dialog class="owner-award-dialog" aria-labelledby="owner-award-dialog-title"><div class="owner-award-dialog-content"></div></dialog>':'<p class="muted">Пока нет полученных наград.</p>')+'</section>';
}
export function bindOwnerAwardHistory(card,awards){
 const dialog=card.querySelector('.owner-award-dialog');if(!dialog)return;
 const content=dialog.querySelector('.owner-award-dialog-content');let opener=null;
 dialog.onkeydown=event=>{if(event.key==='Escape')event.stopPropagation();};
 dialog.onclick=event=>{if(event.target===dialog)dialog.close();};
 dialog.addEventListener('close',()=>{content.replaceChildren();if(opener?.isConnected)opener.focus({preventScroll:true});opener=null;});
 card.querySelectorAll('[data-owner-award]').forEach(button=>button.onclick=()=>{
  if(dialog.open)return;
  const row=awards?.find(award=>award.kind===button.dataset.ownerAward),info=awardInfo(row?.kind);if(!info)return;
  const wins=(Array.isArray(row.wins)?row.wins:[]).filter(win=>validAwardDate(win.start)&&validAwardDate(win.end)&&win.end>win.start&&Number.isSafeInteger(win.seconds)&&win.seconds>0).slice(0,200);
  const earned=typeof row.earnedAt==='string'&&Number.isFinite(Date.parse(row.earnedAt))?new Date(row.earnedAt).toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric'}):null;
  const history=wins.length?'<p class="muted">История побед</p><div class="owner-award-wins">'+wins.map(win=>'<p><span>'+esc(awardPeriod({...win,kind:info.kind}))+'</span><b>'+esc(formatListeningTime(win.seconds))+'</b></p>').join('')+'</div>'+(row.count>wins.length?'<p class="muted">Показано '+wins.length+' из '+row.count+' побед.</p>':''):'<p class="muted">'+(earned?(row.count>1?'Последнее получение · ':'Получена · ')+esc(earned):calendarAward(info.kind)?'Периоды побед пока не сохранены.':'Дата получения не сохранена.')+'</p>';
  content.innerHTML='<img src="'+esc(awardArtwork(info.kind))+'" alt=""><h2 id="owner-award-dialog-title">'+esc(info.title)+'</h2>'+history+'<button type="button" class="text-button" autofocus>Закрыть</button>';
  content.querySelector('button').onclick=()=>dialog.close();
  opener=button;dialog.showModal();
 });
}
export function ownerUserStatistics(details){
 if(!details)return '';
 const time=value=>Number.isSafeInteger(value)&&value>=0?esc(formatListeningTime(value)):'Нет данных';
 const periods=details.periods||{},reciters=Array.isArray(details.reciters)?details.reciters:[],awards=Array.isArray(details.awards)?details.awards:[];
 const listening='<section class="owner-profile-panel owner-profile-listening" aria-labelledby="owner-profile-listening-title"><h2 id="owner-profile-listening-title">Прослушивание</h2>'+(details.connected?'<div class="owner-profile-total"><span>Всего прослушано</span><strong>'+time(periods.all)+'</strong></div><dl class="owner-profile-periods">'+[['day','Сегодня'],['week','За неделю'],['month','За месяц']].map(([period,label])=>'<div><dt>'+label+'</dt><dd>'+time(periods[period])+'</dd></div>').join('')+'</dl>':'<p class="muted">Данные прослушивания ещё не сохранены.</p>')+'</section>';
 const activity='<section class="owner-profile-panel owner-profile-activity" aria-labelledby="owner-profile-activity-title"><div><h2 id="owner-profile-activity-title">Азкары</h2><span>Сегодня</span></div><strong class="'+(details.adhkar?.active===true?'is-active':'')+'">'+(typeof details.adhkar?.active==='boolean'?(details.adhkar.active?'Есть отметка':'Пока нет отметок'):'Данных пока нет')+'</strong></section>';
 const favorites=reciters.length?'<section class="owner-profile-panel owner-profile-favorites" aria-labelledby="owner-profile-favorites-title"><h2 id="owner-profile-favorites-title">Любимые чтецы</h2><ol class="owner-profile-reciters">'+reciters.slice(0,5).map(row=>reciterRow(row,time)).join('')+'</ol></section>':'';
 const achievements=ownerAwards(awards);
 const checkpoint=details.context?.reading,validPage=Number.isInteger(checkpoint?.page)&&checkpoint.page>=1&&checkpoint.page<=604&&['madani','tajweed'].includes(checkpoint.edition);
 const reading='<section class="owner-profile-panel owner-profile-reading" aria-labelledby="owner-profile-reading-title"><h2 id="owner-profile-reading-title">Чтение Корана</h2><dl class="owner-profile-context"><div><dt>Последняя страница</dt><dd>'+(validPage?'Стр. '+checkpoint.page+' / 604':'Пока нет данных')+'</dd></div>'+(validPage?'<div><dt>'+(checkpoint.edition==='madani'?'Мединский мусхаф':'Цветной таджвид')+'</dt><dd>'+esc(ownerUserDate(checkpoint.savedAt))+'</dd></div>':'')+'</dl></section>';
 return listening+reading+activity+favorites+achievements;
}
export function ownerUserCardPreview(label){
 const nickname=typeof label==='string'&&label.trim()?label:'Карточка пользователя';
 return '<article class="owner-user-card owner-profile owner-profile-preview" aria-busy="true" aria-labelledby="owner-user-name"><section class="owner-profile-identity"><header class="owner-profile-hero">'+(label?ownerAvatar(null,nickname):'<div class="owner-user-avatar" aria-hidden="true"></div>')+'<h1 id="owner-user-name" tabindex="-1">'+esc(nickname)+'</h1></header></section><div class="owner-profile-sections" aria-hidden="true"><div class="owner-profile-panel"><span></span><span></span><span></span></div></div></article>';
}
export function ownerUserCard(user,{details=null,avatarUrl=null,loading=false,error=''}={}){
 const writeLink=validOwnerUserId(user.id)?'<a class="button owner-user-write" href="#support?owner=1&amp;user='+encodeURIComponent(user.id)+'">'+staffIcon('messages')+'<span>Написать</span></a>':'';
 const status=notificationLabels(user.notifications),nickname=typeof user.nickname==='string'&&user.nickname.trim()?user.nickname:'Без ника';
 const flag=(label,connected,info,unknown=false)=>'<button type="button" class="owner-notification-flag'+(connected?' is-connected':'')+(unknown?' is-unknown':'')+'" title="'+esc(info)+'" aria-label="'+esc(info)+'" aria-controls="owner-notification-info" aria-expanded="false" data-notification-info="'+esc(info)+'"><span>'+label+'</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg></button>';
 const row=(label,value)=>'<div><dt>'+esc(label)+'</dt><dd>'+esc(value)+'</dd></div>';
 return '<article class="owner-user-card owner-profile" aria-labelledby="owner-user-name"><section class="owner-profile-identity"><header class="owner-profile-hero">'+ownerAvatar(avatarUrl,nickname)+'<div><h1 id="owner-user-name" tabindex="-1">'+esc(nickname)+'</h1><span class="presence-status'+(user.online?' is-online':'')+'"><i aria-hidden="true"></i>'+(user.online?'В сети':'Не в сети')+'</span></div></header>'+writeLink+'<p class="owner-profile-status" role="status">'+esc(error||(loading?'Загружаем профиль…':''))+'</p></section><div class="owner-profile-sections">'+ownerUserStatistics(details)+'<section class="owner-profile-panel owner-profile-account" aria-labelledby="owner-profile-account-title"><h2 id="owner-profile-account-title">Об аккаунте</h2><dl>'+row('Город для намаза',typeof details?.context?.city==='string'&&details.context.city.trim()?[details.context.city.trim().slice(0,160),typeof details.context.country==='string'?details.context.country.trim().slice(0,160):''].filter(Boolean).join(', '):'Пока нет данных')+row('Регистрация',typeof user.joinedAt==='string'&&Number.isFinite(Date.parse(user.joinedAt))?new Date(user.joinedAt).toLocaleDateString('ru-RU',{day:'numeric',month:'short',year:'numeric'}):'Нет данных')+row('Последнее посещение',user.online?'В сети':ownerUserDate(user.lastSeenAt))+'</dl><div class="owner-card-notifications">'+flag('Намаз',status.state==='enabled',status.primary,status.state==='unknown')+flag('Доставка',status.state==='enabled'&&user.notifications?.background===true,status.state==='unknown'?'Доставка: нет данных':user.notifications?.background===true&&status.state==='enabled'?'Фоновая доставка подключена':status.secondary||'Фоновая доставка не подключена',status.state==='unknown')+'</div><p class="owner-notification-info" id="owner-notification-info" role="status" hidden></p></section></div></article>';

}
export function bindOwnerNotificationInfo(card){
 bindOwnerAvatarPreview(card);
 const info=card.querySelector('#owner-notification-info');if(!info)return;info.hidden=true;
 const buttons=Array.from(card.querySelectorAll('[data-notification-info]'));
 for(const button of buttons)button.onclick=()=>{const message=button.getAttribute('data-notification-info'),close=!info.hidden&&info.textContent===message;info.textContent=close?'':message;info.hidden=close;for(const item of buttons)item.setAttribute('aria-expanded',String(item===button&&!close));};
}
