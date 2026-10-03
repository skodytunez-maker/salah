import{modal}from './ui.js';
import{quranPlayback}from './quran-session.js';
export const BROADCAST_CHANNELS=Object.freeze([
 {id:'makkah',name:'Мекка',place:'Масджид аль-Харам',video:'eC4LfEVxvKg',url:'https://www.youtube.com/user/SaudiQuranTv/live'},
 {id:'madinah',name:'Медина',place:'Мечеть Пророка ﷺ',video:'Rs7St51oDDc',url:'https://www.youtube.com/user/SaudiSunnahTv/live'}
]);
export const broadcastIcon='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="13" rx="3"/><path d="m10 8 5 3-5 3zM8 21h8M12 17v4"/></svg>';
export function broadcastButton(compact=false){return '<button type="button" class="quran-broadcast-button'+(compact?' is-compact':'')+'" data-quran-broadcast>'+broadcastIcon+'<span><strong>'+(compact?'Трансляция':'Прямой эфир')+'</strong>'+(compact?'':'<small>Мекка и Медина</small>')+'</span><span class="quran-live-badge"><i></i>ЭФИР</span></button>'}
let cleanup=null;
export function stopQuranBroadcast(){const finish=cleanup;cleanup=null;finish?.()}
export function openQuranBroadcast(){
 stopQuranBroadcast();quranPlayback.pause();
 modal('<section class="quran-broadcast-dialog"><div class="modal-heading"><div><span class="eyebrow">ТРАНСЛЯЦИЯ</span><h2>Священные мечети</h2></div><button type="button" class="text-button" data-close aria-label="Закрыть трансляцию">×</button></div><div class="quran-broadcast-tabs" role="group" aria-label="Выбор трансляции">'+BROADCAST_CHANNELS.map(c=>'<button type="button" data-channel="'+c.id+'" aria-pressed="false">'+c.name+'</button>').join('')+'</div><p class="quran-broadcast-place"></p><div class="quran-broadcast-screen"></div><p class="quran-broadcast-note">Каналы Saudi Quran TV и Saudi Sunnah TV · YouTube</p><a class="text-button quran-broadcast-external" target="_blank" rel="noopener noreferrer">Открыть эфир на YouTube ↗</a></section>');
 const dialog=document.getElementById('modal'),section=dialog.querySelector('.quran-broadcast-dialog'),screen=section.querySelector('.quran-broadcast-screen');
 const show=id=>{
  const channel=BROADCAST_CHANNELS.find(c=>c.id===id);if(!channel)return;
  for(const button of section.querySelectorAll('[data-channel]'))button.setAttribute('aria-pressed',String(button.dataset.channel===id));
  section.querySelector('.quran-broadcast-place').textContent=channel.place;section.querySelector('a').href=channel.url;
  const frame=document.createElement('iframe');frame.title='Прямой эфир · '+channel.name;frame.src='https://www.youtube-nocookie.com/embed/'+channel.video+'?autoplay=1&playsinline=1&rel=0';frame.referrerPolicy='strict-origin-when-cross-origin';frame.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';frame.allowFullscreen=true;frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-presentation');screen.replaceChildren(frame);
 };
 for(const button of section.querySelectorAll('[data-channel]'))button.onclick=()=>show(button.dataset.channel);
 const close=()=>stopQuranBroadcast(),route=()=>{dialog.close();stopQuranBroadcast()};
 cleanup=()=>{screen.replaceChildren();dialog.removeEventListener('close',close);window.removeEventListener('hashchange',route);if(section.isConnected&&dialog.open)dialog.close()};
 dialog.addEventListener('close',close);window.addEventListener('hashchange',route);show('makkah');
}
export function bindQuranBroadcast(container){for(const button of container.querySelectorAll('[data-quran-broadcast]'))button.onclick=openQuranBroadcast}
