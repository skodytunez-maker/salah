import{esc}from './ui.js';
import{notificationLabels}from './notification-status.js';
import{formatListeningTime}from './reciter-popularity-core.js';
import{reciterInfo}from './quran-reciters.js';
import{reciterImageUrl}from './approved-catalog.js';
import{QURAN_AWARDS,awardArtwork}from './quran-awards-core.js';
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
export function ownerUserStatistics(details){
 if(!details)return '';
 const time=value=>Number.isSafeInteger(value)&&value>=0?esc(formatListeningTime(value)):'Нет данных';
 const periods=details.periods||{},reciters=Array.isArray(details.reciters)?details.reciters:[],awards=Array.isArray(details.awards)?details.awards:[];
 return '<section class="owner-profile-listening" aria-labelledby="owner-profile-listening-title"><h4 id="owner-profile-listening-title">Прослушивание Корана</h4>'+(details.connected?'<p class="owner-profile-total"><span>Всего прослушано</span><strong>'+time(periods.all)+'</strong></p><dl class="owner-profile-periods">'+[['day','Сегодня'],['week','За неделю'],['month','За месяц']].map(([period,label])=>'<div><dt>'+label+'</dt><dd>'+time(periods[period])+'</dd></div>').join('')+'</dl>':'<p class="muted">Данные прослушивания ещё не сохранены.</p>')+(reciters.length?'<h4>Любимые чтецы</h4><ol class="owner-profile-reciters">'+reciters.slice(0,5).map(row=>reciterRow(row,time)).join('')+'</ol>':'')+'<p class="owner-profile-sync">Сохранённая статистика аккаунта'+(details.updatedAt?' · '+esc(ownerUserDate(details.updatedAt)):'')+'</p></section><section class="owner-profile-awards" aria-labelledby="owner-profile-awards-title"><h4 id="owner-profile-awards-title">Награды</h4><ul>'+awards.slice(0,15).map(row=>{const info=QURAN_AWARDS.find(award=>award.kind===row.kind);return info?'<li><img src="./'+esc(awardArtwork(row.kind))+'" alt="" loading="lazy"><span><strong>'+esc(info.title)+(row.count>1?' · '+row.count:'')+'</strong>'+(row.earnedAt?'<small>'+esc(ownerUserDate(row.earnedAt))+'</small>':'')+'</span></li>':'';}).join('')+'</ul>'+(awards.length?'':'<p class="muted">Пока нет полученных наград.</p>')+'</section>';
}
export function ownerUserCard(user,{details=null,avatarUrl=null,loading=false,error=''}={}){
 const writeLink=validOwnerUserId(user.id)?'<a class="button owner-user-write" href="#support?owner=1&amp;user='+encodeURIComponent(user.id)+'"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-2 2V11.5A8.5 8.5 0 0 1 10.5 3H12M14 10l6-6 2 2-6 6-3 1Z"/></svg><span>Написать</span></a>':'';
 const status=notificationLabels(user.notifications),nickname=typeof user.nickname==='string'&&user.nickname.trim()?user.nickname:'Без ника';
 const version=Number.isSafeInteger(user.appVersion)&&user.appVersion>=1&&user.appVersion<=1000000&&ownerUserDate(user.versionCheckedAt)!=='Нет данных'?String(user.appVersion):'Нет данных';
 const flag=(label,connected,info,unknown=false)=>'<button type="button" class="owner-notification-flag'+(connected?' is-connected':'')+(unknown?' is-unknown':'')+'" title="'+esc(info)+'" aria-label="'+esc(info)+'" aria-controls="owner-notification-info" aria-expanded="false" data-notification-info="'+esc(info)+'"><span>'+label+'</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg></button>';
 const row=(label,value)=>'<div><dt>'+esc(label)+'</dt><dd>'+esc(value)+'</dd></div>';
 return '<section class="owner-user-card owner-profile" aria-labelledby="owner-user-name"><header>'+ownerAvatar(avatarUrl,nickname)+'<div><h3 id="owner-user-name" tabindex="-1">'+esc(nickname)+'</h3><span class="presence-status'+(user.online?' is-online':'')+'"><i aria-hidden="true"></i>'+(user.online?'В сети':'Не в сети')+'</span></div></header>'+writeLink+'<p class="owner-profile-status" role="status">'+esc(error||(loading?'Загружаем профиль…':''))+'</p>'+ownerUserStatistics(details)+'<h4>Об аккаунте</h4><dl>'+row('Последнее посещение',ownerUserDate(user.lastSeenAt))+row('Синхронизация данных',ownerUserDate(user.lastSavedAt))+row('Регистрация',ownerUserDate(user.joinedAt))+row('Последний вход',ownerUserDate(user.lastSignInAt))+row('Версия SALAH',version)+'</dl><div class="owner-card-notifications">'+flag('Намаз',status.state==='enabled',status.primary,status.state==='unknown')+flag('Доставка',status.state==='enabled'&&user.notifications?.background===true,status.state==='unknown'?'Доставка: нет данных':user.notifications?.background===true&&status.state==='enabled'?'Фоновая доставка подключена':status.secondary||'Фоновая доставка не подключена',status.state==='unknown')+'</div><p class="owner-notification-info" id="owner-notification-info" role="status" hidden></p></section>';
}
export function bindOwnerNotificationInfo(card){
 bindOwnerAvatarPreview(card);
 const info=card.querySelector('#owner-notification-info');if(!info)return;info.hidden=true;
 const buttons=Array.from(card.querySelectorAll('[data-notification-info]'));
 for(const button of buttons)button.onclick=()=>{const message=button.getAttribute('data-notification-info'),close=!info.hidden&&info.textContent===message;info.textContent=close?'':message;info.hidden=close;for(const item of buttons)item.setAttribute('aria-expanded',String(item===button&&!close));};
}
