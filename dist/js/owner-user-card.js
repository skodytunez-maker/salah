import{esc}from './ui.js';
import{notificationLabels}from './notification-status.js';
export const validOwnerUserId=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export function ownerUserDate(value){return typeof value==='string'&&Number.isFinite(Date.parse(value))?new Date(value).toLocaleString('ru-RU',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'Нет данных';}
export function ownerUserCard(user){
 const status=notificationLabels(user.notifications),nickname=typeof user.nickname==='string'&&user.nickname.trim()?user.nickname:'Без ника';
 const version=Number.isSafeInteger(user.appVersion)&&user.appVersion>=1&&user.appVersion<=1000000&&ownerUserDate(user.versionCheckedAt)!=='Нет данных'?String(user.appVersion):'Нет данных';
 const flag=(label,connected,info,unknown=false)=>'<button type="button" class="owner-notification-flag'+(connected?' is-connected':'')+(unknown?' is-unknown':'')+'" title="'+esc(info)+'" aria-label="'+esc(info)+'" aria-controls="owner-notification-info" aria-expanded="false" data-notification-info="'+esc(info)+'"><span>'+label+'</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg></button>';
 const row=(label,value)=>'<div><dt>'+esc(label)+'</dt><dd>'+esc(value)+'</dd></div>';
 return '<section class="owner-user-card" aria-labelledby="owner-user-name"><header><div class="owner-user-avatar" aria-hidden="true">'+esc(Array.from(nickname.trim())[0].toLocaleUpperCase('ru-RU'))+'</div><div><h3 id="owner-user-name" tabindex="-1">'+esc(nickname)+'</h3><span class="presence-status'+(user.online?' is-online':'')+'"><i aria-hidden="true"></i>'+(user.online?'В сети':'Не в сети')+'</span></div></header><dl>'+row('Последнее посещение',ownerUserDate(user.lastSeenAt))+row('Регистрация',ownerUserDate(user.joinedAt))+row('Последний вход',ownerUserDate(user.lastSignInAt))+row('Версия SALAH',version)+'</dl><div class="owner-card-notifications">'+flag('Намаз',status.state==='enabled',status.primary,status.state==='unknown')+flag('Доставка',status.state==='enabled'&&user.notifications?.background===true,status.state==='unknown'?'Доставка: нет данных':user.notifications?.background===true&&status.state==='enabled'?'Фоновая доставка подключена':status.secondary||'Фоновая доставка не подключена',status.state==='unknown')+'</div><p class="owner-notification-info" id="owner-notification-info" role="status" hidden></p></section>';
}
export function bindOwnerNotificationInfo(card){
 const info=card.querySelector('#owner-notification-info');if(!info)return;info.hidden=true;
 const buttons=Array.from(card.querySelectorAll('[data-notification-info]'));
 for(const button of buttons)button.onclick=()=>{const message=button.getAttribute('data-notification-info'),close=!info.hidden&&info.textContent===message;info.textContent=close?'':message;info.hidden=close;for(const item of buttons)item.setAttribute('aria-expanded',String(item===button&&!close));};
}
