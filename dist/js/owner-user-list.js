import{ownerMessage,ownerLeaf,ownerText,ownerMarkup,ownerError,ownerHeading,ownerDate,ownerDateLeaf,ownerPaint,watchOwnerUi,stopOwnerUi,uiMessage,uiLeaf,uiSet,uiRaw,uiAttrs,uiAttribute,uiAttributeAttrs,t,getLocale}from './owner-i18n.js';
import{esc}from './ui.js';
export function ownerUserLastSeen(value,{now=Date.now(),timeZone}={}){
 const date=new Date(value),at=date.getTime();if(!value||!Number.isFinite(at)||at>now)return ownerMessage('Нет данных о посещении');
 const common=timeZone?{timeZone}:{};if(now-at<86400000)return new Intl.DateTimeFormat(getLocale(),{...common,hour:'2-digit',minute:'2-digit',hour12:false}).format(date);
 const year=new Intl.DateTimeFormat(getLocale(),{...common,year:'numeric'});return new Intl.DateTimeFormat(getLocale(),{...common,day:'numeric',month:'short',...(year.format(date)!==year.format(new Date(now))?{year:'numeric'}:{})}).format(date);
}
function lastSeenMarkup(value,now){const date=new Date(value),at=date.getTime();if(!value||!Number.isFinite(at)||at>now)return ownerLeaf('Нет данных о посещении');const year=new Intl.DateTimeFormat(getLocale(),{year:'numeric'}),format=now-at<86400000?'visitTime':year.format(date)!==year.format(new Date(now))?'date':'dayMonth';return ownerDateLeaf(value,format,'Нет данных о посещении');}
export function ownerUserRow(user,{now=Date.now()}={}){
 const id=String(user.id||''),valid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id),nickname=String(user.nickname||ownerMessage('Пользователь')),letters=[...nickname.trim()].slice(0,2).join('').toUpperCase();
 return ownerMarkup('<button type="button" class="owner-user-row" data-user="'+esc(id)+'" '+(!valid?'disabled':'')+' aria-label="'+esc(uiMessage('ownerUi.openProfile','Открыть карточку: {name}',{name:nickname}))+'"'+uiAttributeAttrs('aria-label','ownerUi.openProfile',{name:nickname})+'><span class="owner-user-avatar"'+(valid?' data-member-avatar="'+esc(id)+'"':'')+' aria-hidden="true" lang="" dir="auto" translate="no">'+esc(letters)+'</span><span class="owner-user-copy"><strong lang="" dir="auto" translate="no">'+esc(nickname)+'</strong><small class="owner-user-time'+(user.online?' is-online':' owner-last-seen')+'">'+(user.online?ownerLeaf('В сети'):lastSeenMarkup(user.lastSeenAt,now))+'</small></span></button>');
}
