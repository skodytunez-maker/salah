import{esc}from './ui.js';
import{notificationLabels}from './notification-status.js';
export const validOwnerUserId=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export function ownerUserDate(value){return typeof value==='string'&&Number.isFinite(Date.parse(value))?new Date(value).toLocaleString('ru-RU',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'Нет данных';}
export function ownerUserCard(user){
 const status=notificationLabels(user.notifications),nickname=typeof user.nickname==='string'&&user.nickname.trim()?user.nickname:'Без ника';
 const version=Number.isSafeInteger(user.appVersion)&&user.appVersion>=1&&user.appVersion<=1000000&&ownerUserDate(user.versionCheckedAt)!=='Нет данных'?String(user.appVersion):'Нет данных';
 const row=(label,value)=>'<div><dt>'+esc(label)+'</dt><dd>'+esc(value)+'</dd></div>';
 return '<section class="owner-user-card" aria-labelledby="owner-user-name"><header><div class="owner-user-avatar" aria-hidden="true">'+esc(Array.from(nickname.trim())[0].toLocaleUpperCase('ru-RU'))+'</div><div><h3 id="owner-user-name" tabindex="-1">'+esc(nickname)+'</h3><span class="presence-status'+(user.online?' is-online':'')+'"><i aria-hidden="true"></i>'+(user.online?'В сети':'Не в сети')+'</span></div></header><dl>'+row('Последнее посещение',ownerUserDate(user.lastSeenAt))+row('Регистрация',ownerUserDate(user.joinedAt))+row('Последний вход',ownerUserDate(user.lastSignInAt))+row('Версия SALAH',version)+row('Версия проверена',version==='Нет данных'?'Нет данных':ownerUserDate(user.versionCheckedAt))+row('Последнее сохранение',ownerUserDate(user.lastSavedAt))+'</dl><div class="owner-card-notifications is-'+status.state+'"><strong>'+esc(status.primary)+'</strong>'+(status.secondary?'<span>'+esc(status.secondary)+'</span>':'')+(status.checked?'<small>'+esc(status.checked)+'</small>':'')+'</div></section>';
}
