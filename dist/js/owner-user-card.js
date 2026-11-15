import{listeningTime}from './ranking-ui.js';
import{awardUiTitle,awardUiPeriod}from './quran-award-history.js';
import{ownerDateMessageLeaf,uiNumberLeaf,ownerMessage,ownerLeaf,ownerText,ownerMarkup,ownerError,ownerHeading,ownerDate,ownerDateLeaf,ownerPaint,watchOwnerUi,stopOwnerUi,uiMessage,uiLeaf,uiSet,uiRaw,uiAttrs,uiAttribute,uiAttributeAttrs,t,getLocale}from './owner-i18n.js';
import{staffIcon}from './staff-markup.js';
import{esc}from './ui.js';
import{notificationLabels}from './notification-status.js';
import{formatListeningTime}from './reciter-popularity-core.js';
import{reciterInfo}from './quran-reciters.js';
import{reciterImageUrl}from './approved-catalog.js';
import{awardInfo,awardArtwork,awardPeriod,calendarAward,validAwardDate}from './quran-awards-core.js';
function listeningMarkup(seconds){return Number.isSafeInteger(seconds)&&seconds>=0?'<span data-owner-ui-listening-seconds="'+seconds+'">'+esc(listeningTime(seconds))+'</span>':ownerLeaf('Нет данных');}
function awardTitleMarkup(info,row){return typeof row?.title==='string'&&row.title.length?'<span lang="" dir="auto" translate="no">'+esc(awardUiTitle(info.kind,row))+'</span>':uiLeaf('rankingUi.awardTitle'+info.kind[0].toUpperCase()+info.kind.slice(1),info.title);}
function refreshCardText(card){for(const node of card.querySelectorAll('[data-owner-ui-listening-seconds]')){const seconds=Number(node.dataset.ownerUiListeningSeconds);if(Number.isSafeInteger(seconds)&&seconds>=0)uiRaw(node,listeningTime(seconds));}for(const node of card.querySelectorAll('[data-owner-award-period]')){const kind=node.dataset.ownerAwardPeriod,start=node.dataset.ownerAwardStart,end=node.dataset.ownerAwardEnd;if(awardInfo(kind)&&validAwardDate(start)&&validAwardDate(end))uiRaw(node,awardUiPeriod({kind,start,end}));}}
export const validOwnerUserId=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export function ownerUserDate(value){return typeof value==='string'&&Number.isFinite(Date.parse(value))?new Date(value).toLocaleString(getLocale(),{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}):ownerMessage('Нет данных');}
function ownerAvatar(url,nickname){
 if(typeof url!=='string'||!url.startsWith('blob:'))return '<div class="owner-user-avatar" aria-hidden="true" lang="" dir="auto" translate="no">'+esc(Array.from(nickname.trim())[0].toLocaleUpperCase('ru-RU'))+'</div>';
 return "<button type=\"button\" class=\"owner-user-avatar owner-avatar-open\" aria-label=\"Увеличить аватарку пользователя\" data-i18n-aria-label=\"ownerUi.zoomAvatar\" aria-haspopup=\"dialog\"><img src=\""+esc(url)+"\" alt=\"\"></button><dialog class=\"owner-avatar-preview\" aria-label=\"Аватарка пользователя\" data-i18n-aria-label=\"ownerUi.avatar\"><button type=\"button\" class=\"owner-avatar-close\" aria-label=\"Закрыть фото\" data-i18n-aria-label=\"ownerUi.closePhoto\">×</button><img src=\""+esc(url)+'" alt="Аватарка пользователя"></dialog>';
}
export function bindOwnerAvatarPreview(card){
 const button=card.querySelector('.owner-avatar-open'),preview=card.querySelector('.owner-avatar-preview');if(!button||!preview)return;
 button.onclick=event=>{event.stopPropagation();if(!preview.open)preview.showModal();};
 preview.querySelector('.owner-avatar-close').onclick=()=>preview.close();
 preview.onclick=event=>{event.stopPropagation();if(event.target===preview)preview.close();};
 preview.addEventListener('close',()=>{if(button.isConnected)button.focus();});
}
function reciterRow(row,time){let info,missing=false;try{info=reciterInfo(row.id);}catch{missing=true;info={name:'Чтец',portrait:null};}return '<li><img class="owner-profile-reciter-image" src="'+esc(reciterImageUrl(info.portrait))+'" alt="" width="40" height="40" loading="lazy" decoding="async"><span>'+(missing?ownerLeaf('Чтец'):'<span lang="" dir="auto" translate="no">'+esc(info.name)+'</span>')+'</span><strong>'+time(row.seconds)+'</strong></li>';}

function ownerAwards(awards){
 const tiles=awards.slice(0,20).map(row=>{
  const info=awardInfo(row.kind);if(!info)return '';
  return '<li><button type="button" class="owner-award-button" data-owner-award="'+info.kind+'" aria-haspopup="dialog"><img src="'+esc(awardArtwork(info.kind))+'" alt="" loading="lazy"><strong>'+awardTitleMarkup(info,row)+(row.count>1?' · '+uiNumberLeaf(row.count):'')+'</strong></button></li>';
 }).join('');
 return "<section class=\"owner-profile-panel owner-profile-awards\" aria-labelledby=\"owner-profile-awards-title\"><h2 id=\"owner-profile-awards-title\" data-i18n=\"ownerUi.awards\">Награды</h2>"+(tiles?'<ul class="owner-award-grid">'+tiles+'</ul><dialog class="owner-award-dialog" aria-labelledby="owner-award-dialog-title"><div class="owner-award-dialog-content"></div></dialog>':"<p class=\"muted\" data-i18n=\"ownerUi.noAwards\">Пока нет полученных наград.</p>")+'</section>';
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
  const history=wins.length?"<p class=\"muted\" data-i18n=\"ownerUi.victoryHistory\">История побед</p><div class=\"owner-award-wins\">"+wins.map(win=>'<p><span>'+'<span data-owner-award-period="'+esc(info.kind)+'" data-owner-award-start="'+esc(win.start)+'" data-owner-award-end="'+esc(win.end)+'">'+esc(awardUiPeriod({...win,kind:info.kind}))+'</span>'+'</span><b>'+listeningMarkup(win.seconds)+'</b></p>').join('')+'</div>'+(row.count>wins.length?'<p class="muted">'+uiLeaf('ownerUi.shownWins','Показано {shown} из {total} побед.',{shown:wins.length,total:row.count})+'</p>':''):'<p class="muted">'+(earned?ownerDateMessageLeaf(row.count>1?'lastEarned':'earned',row.earnedAt,'longDate'):ownerLeaf(calendarAward(info.kind)?'Периоды побед пока не сохранены.':'Дата получения не сохранена.'))+'</p>';
  ownerPaint(content,'<img src="'+esc(awardArtwork(info.kind))+'" alt=""><h2 id="owner-award-dialog-title">'+awardTitleMarkup(info,row)+'</h2>'+history+"<button type=\"button\" class=\"text-button\" autofocus data-i18n=\"common.close\">Закрыть</button>");
  content.querySelector('button').onclick=()=>dialog.close();
  opener=button;dialog.showModal();
 });
}
export function ownerUserStatistics(details){
 if(!details)return '';
 const time=value=>listeningMarkup(value);
 const periods=details.periods||{},reciters=Array.isArray(details.reciters)?details.reciters:[],awards=Array.isArray(details.awards)?details.awards:[];
 const listening="<section class=\"owner-profile-panel owner-profile-listening\" aria-labelledby=\"owner-profile-listening-title\"><h2 id=\"owner-profile-listening-title\" data-i18n=\"ownerUi.listening\">Прослушивание</h2>"+(details.connected?"<div class=\"owner-profile-total\"><span data-i18n=\"ownerUi.listenedTotal\">Всего прослушано</span><strong>"+time(periods.all)+'</strong></div><dl class="owner-profile-periods">'+[['day','Сегодня'],['week','За неделю'],['month','За месяц']].map(([period,label])=>'<div><dt>'+ownerLeaf(label)+'</dt><dd>'+time(periods[period])+'</dd></div>').join('')+'</dl>':"<p class=\"muted\" data-i18n=\"ownerUi.listeningNotSaved\">Данные прослушивания ещё не сохранены.</p>")+'</section>';
 const activity="<section class=\"owner-profile-panel owner-profile-activity\" aria-labelledby=\"owner-profile-activity-title\"><div><h2 id=\"owner-profile-activity-title\" data-i18n=\"nav.adhkar\">Азкары</h2><span data-i18n=\"ownerUi.today\">Сегодня</span></div><strong class=\""+(details.adhkar?.active===true?'is-active':'')+'">'+ownerLeaf(typeof details.adhkar?.active==='boolean'?(details.adhkar.active?'Есть отметка':'Пока нет отметок'):'Данных пока нет')+'</strong></section>';
 const favorites=reciters.length?"<section class=\"owner-profile-panel owner-profile-favorites\" aria-labelledby=\"owner-profile-favorites-title\"><h2 id=\"owner-profile-favorites-title\" data-i18n=\"ownerUi.favoriteReciters\">Любимые чтецы</h2><ol class=\"owner-profile-reciters\">"+reciters.slice(0,5).map(row=>reciterRow(row,time)).join('')+'</ol></section>':'';
 const achievements=ownerAwards(awards);
 const checkpoint=details.context?.reading,validPage=Number.isInteger(checkpoint?.page)&&checkpoint.page>=1&&checkpoint.page<=604&&['madani','tajweed'].includes(checkpoint.edition);
 const reading="<section class=\"owner-profile-panel owner-profile-reading\" aria-labelledby=\"owner-profile-reading-title\"><h2 id=\"owner-profile-reading-title\" data-i18n=\"ownerUi.quranReading\">Чтение Корана</h2><dl class=\"owner-profile-context\"><div><dt data-i18n=\"ownerUi.lastPage\">Последняя страница</dt><dd>"+(validPage?uiLeaf('ownerUi.pageOf','Стр. {page} / 604',{page:checkpoint.page}):ownerLeaf('Пока нет данных'))+'</dd></div>'+(validPage?'<div><dt>'+ownerLeaf(checkpoint.edition==='madani'?'Мединский мусхаф':'Цветной таджвид')+'</dt><dd>'+userDateMarkup(checkpoint.savedAt)+'</dd></div>':'')+'</dl></section>';
 return listening+reading+activity+favorites+achievements;
}
export function ownerUserCardPreview(label){
 const nickname=typeof label==='string'&&label.trim()?label:'Карточка пользователя';
 return '<article class="owner-user-card owner-profile owner-profile-preview" aria-busy="true" aria-labelledby="owner-user-name"><section class="owner-profile-identity"><header class="owner-profile-hero">'+(label?ownerAvatar(null,nickname):'<div class="owner-user-avatar" aria-hidden="true"></div>')+'<h1 id="owner-user-name" tabindex="-1" lang="" dir="auto" translate="no">'+ (label?esc(nickname):ownerLeaf('Карточка пользователя'))+'</h1></header></section><div class="owner-profile-sections" aria-hidden="true"><div class="owner-profile-panel"><span></span><span></span><span></span></div></div></article>';
}
function userDateMarkup(value,format='dateTime'){return typeof value==='string'&&Number.isFinite(Date.parse(value))?ownerDateLeaf(value,format):ownerLeaf('Нет данных');}
export function ownerUserCard(user,{details=null,avatarUrl=null,loading=false,error=''}={}){
 const writeLink=validOwnerUserId(user.id)?'<a class="button owner-user-write" href="#support?owner=1&amp;user='+encodeURIComponent(user.id)+'">'+staffIcon('messages')+ownerLeaf('Написать')+'</a>':'';
 const status=notificationLabels(user.notifications),nickname=typeof user.nickname==='string'&&user.nickname.trim()?user.nickname:ownerMessage('Без ника');
 const flag=(label,connected,info,key,unknown=false)=>'<button type="button" class="owner-notification-flag'+(connected?' is-connected':'')+(unknown?' is-unknown':'')+'" title="'+esc(info)+'" aria-label="'+esc(info)+'"'+uiAttributeAttrs('title',key)+uiAttributeAttrs('aria-label',key)+' aria-controls="owner-notification-info" aria-expanded="false" data-notification-key="'+esc(key)+'" data-notification-info="'+esc(info)+'">'+ownerLeaf(label)+'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg></button>';
 const row=(label,html)=>'<div><dt>'+ownerLeaf(label)+'</dt><dd>'+html+'</dd></div>';
 const city=typeof details?.context?.city==='string'&&details.context.city.trim()?[details.context.city.trim().slice(0,160),typeof details.context.country==='string'?details.context.country.trim().slice(0,160):''].filter(Boolean).join(', '):null;
 const version=Number.isSafeInteger(user.appVersion)&&user.appVersion>=1&&user.appVersion<=1000000&&Number.isFinite(Date.parse(user.versionCheckedAt));
 const deliveryKey=status.state==='unknown'?'ownerUi.deliveryUnknown':user.notifications?.background===true&&status.state==='enabled'?'ownerUi.backgroundConnected':status.secondaryKey||'ownerUi.backgroundDisconnected';
 const deliveryInfo=status.state==='unknown'?ownerMessage('Доставка: нет данных'):user.notifications?.background===true&&status.state==='enabled'?ownerMessage('Фоновая доставка подключена'):status.secondary||ownerMessage('Фоновая доставка не подключена');
 return ownerMarkup('<article class="owner-user-card owner-profile" aria-labelledby="owner-user-name"><section class="owner-profile-identity"><header class="owner-profile-hero">'+ownerAvatar(avatarUrl,nickname)+'<div><h1 id="owner-user-name" tabindex="-1" lang="" dir="auto" translate="no">'+esc(nickname)+'</h1><span class="presence-status'+(user.online?' is-online':'')+'"><i aria-hidden="true"></i>'+ownerLeaf(user.online?'В сети':'Не в сети')+'</span></div></header>'+writeLink+'<p class="owner-profile-status" role="status">'+ownerLeaf(error||(loading?'Загружаем профиль…':''))+'</p></section><div class="owner-profile-sections">'+ownerUserStatistics(details)+'<section class="owner-profile-panel owner-profile-account" aria-labelledby="owner-profile-account-title"><h2 id="owner-profile-account-title">'+ownerLeaf('Об аккаунте')+'</h2><dl>'+row('Город для намаза',city?'<span lang="" dir="auto" translate="no">'+esc(city)+'</span>':ownerLeaf('Пока нет данных'))+row('Версия SALAH',version?'<span dir="ltr">'+String(user.appVersion)+'</span>':ownerLeaf('Пока нет данных'))+row('Версия проверена',userDateMarkup(user.versionCheckedAt))+row('Регистрация',userDateMarkup(user.joinedAt,'date'))+row('Последнее посещение',user.online?ownerLeaf('В сети'):userDateMarkup(user.lastSeenAt))+'</dl><div class="owner-card-notifications">'+flag('Намаз',status.state==='enabled',status.primary,status.primaryKey,status.state==='unknown')+flag('Доставка',status.state==='enabled'&&user.notifications?.background===true,deliveryInfo,deliveryKey,status.state==='unknown')+'</div><p class="owner-notification-info" id="owner-notification-info" role="status" hidden></p></section></div></article>');
}
export function bindOwnerNotificationInfo(card){
 bindOwnerAvatarPreview(card);watchOwnerUi(card,()=>refreshCardText(card));
 const info=card.querySelector('#owner-notification-info');if(!info)return;info.hidden=true;
 const buttons=Array.from(card.querySelectorAll('[data-notification-info]'));
 for(const button of buttons)button.onclick=()=>{const key=button.getAttribute('data-notification-key'),message=key?t(key):button.getAttribute('data-notification-info'),close=!info.hidden&&info.textContent===message;if(close)uiRaw(info,'');else if(key)uiSet(info,key,message);else ownerText(info,message);info.hidden=close;for(const item of buttons)item.setAttribute('aria-expanded',String(item===button&&!close));};
}
