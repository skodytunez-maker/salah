import{esc}from './ui.js';
export function ownerUserLastSeen(value,{now=Date.now(),timeZone}={}){
 const date=new Date(value),at=date.getTime();if(!value||!Number.isFinite(at)||at>now)return 'Нет данных о посещении';
 const common=timeZone?{timeZone}:{};if(now-at<86400000)return new Intl.DateTimeFormat('ru-RU',{...common,hour:'2-digit',minute:'2-digit',hour12:false}).format(date);
 const year=new Intl.DateTimeFormat('ru-RU',{...common,year:'numeric'});return new Intl.DateTimeFormat('ru-RU',{...common,day:'numeric',month:'short',...(year.format(date)!==year.format(new Date(now))?{year:'numeric'}:{})}).format(date);
}
export function ownerUserRow(user,{now=Date.now()}={}){
 const id=String(user.id||''),valid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id),nickname=String(user.nickname||'Пользователь'),letters=[...nickname.trim()].slice(0,2).join('').toUpperCase();
 return '<button type="button" class="owner-user-row" data-user="'+esc(id)+'" '+(!valid?'disabled':'')+' aria-label="Открыть карточку: '+esc(nickname)+'"><span class="owner-user-avatar"'+(valid?' data-member-avatar="'+esc(id)+'"':'')+' aria-hidden="true">'+esc(letters)+'</span><span class="owner-user-copy"><strong>'+esc(nickname)+'</strong><small class="owner-user-time'+(user.online?' is-online':' owner-last-seen')+'">'+esc(user.online?'В сети':ownerUserLastSeen(user.lastSeenAt,{now}))+'</small></span></button>';
}
