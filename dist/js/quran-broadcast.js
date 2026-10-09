import{actionIcon,actionLabel}from './action-icons.js';
import{setForegroundAudio}from './audio-focus.js';
import{quranPlayback}from './quran-session.js';
import{createBroadcastAudio}from './broadcast-audio.js';
export const BROADCAST_CHANNELS=Object.freeze([
 {id:'makkah',name:'Мекка',place:'Масджид аль-Харам',video:'eC4LfEVxvKg',url:'https://www.youtube.com/user/SaudiQuranTv/live'},
 {id:'madinah',name:'Медина',place:'Мечеть Пророка ﷺ',video:'Rs7St51oDDc',url:'https://www.youtube.com/user/SaudiSunnahTv/live'}
]);
export const broadcastIcon='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="13" rx="3"/><path d="m10 8 5 3-5 3zM8 21h8M12 17v4"/></svg>';
export function broadcastButton(compact=false){return '<button type="button" class="quran-broadcast-button'+(compact?' is-compact':'')+'" data-quran-broadcast>'+broadcastIcon+'<span><strong>'+(compact?'Трансляция':'Прямой эфир')+'</strong>'+(compact?'':'<small>Мекка и Медина</small>')+'</span><span class="quran-live-badge"><i></i>ЭФИР</span></button>'}
// Keep the same iframe connected to the body: reparenting or recreating it restarts YouTube.
export function createQuranBroadcast({doc=document,win=window,playback=quranPlayback,createAudio=createBroadcastAudio}={}){
 let root=null,section=null,screen=null,selected=null,mini=false,detach=null,returnFocus=null,inertSiblings=[],audioMode=false,liveAudio=null;
 const audioOwner={};
 const restorePage=()=>{for(const [element,previous]of inertSiblings)element.inert=previous;inertSiblings=[]};
 const lockPage=()=>{restorePage();for(const element of doc.body.children){if(element===root||element.matches('dialog,script,style,link'))continue;inertSiblings.push([element,element.inert]);element.inert=true}};
 const focusBack=()=>{if(returnFocus?.isConnected&&!returnFocus.inert)returnFocus.focus();else doc.querySelector('#app')?.focus({preventScroll:true})};
 function setMode(value,{focus=true}={}){
  if(!root)return;mini=value;root.classList.toggle('is-mini',mini);root.setAttribute('role',mini?'region':'dialog');root.setAttribute('aria-label',mini?'Трансляция · '+selected.name:'Трансляция священных мечетей');
  if(mini){root.removeAttribute('aria-modal');restorePage();if(focus)focusBack()}else{root.setAttribute('aria-modal','true');lockPage();if(focus)section.querySelector('[data-broadcast-size]').focus()}
  const size=section.querySelector('[data-broadcast-size]');size.innerHTML=actionIcon(mini?'expand':'collapse');size.setAttribute('aria-label',mini?'Развернуть трансляцию':'Свернуть трансляцию');size.setAttribute('aria-expanded',String(!mini));
 }
 function minimize(options){setMode(true,options)}
 function renderAudio(){
  screen.innerHTML='<div class="quran-live-audio"><span class="quran-live-audio-icon" aria-hidden="true">'+broadcastIcon+'</span><div><strong>Аудиоэфир</strong><span data-audio-status role="status">Подключаем эфир…</span></div><button type="button" data-audio-toggle aria-label="Приостановить эфир">Ⅱ</button></div>';
  liveAudio??=createAudio({doc,win,onState:state=>{if(!audioMode||!screen)return;setForegroundAudio(audioOwner,['loading','playing'].includes(state.status));const button=screen.querySelector('[data-audio-toggle]'),note=screen.querySelector('[data-audio-status]');if(!button||!note)return;const paused=['paused','error','idle'].includes(state.status);button.innerHTML=actionIcon(paused?'play':'pause');button.setAttribute('aria-label',paused?'Воспроизвести эфир':'Приостановить эфир');note.textContent={playing:'Звук в фоне',paused:'На паузе',loading:'Подключаем эфир…',error:'Не удалось подключиться. Нажмите кнопку воспроизведения',idle:'Эфир остановлен'}[state.status]}});
  screen.querySelector('[data-audio-toggle]').onclick=()=>{if(['error','idle'].includes(liveAudio.state.status)){const element=liveAudio.start(selected);if(element)screen.append(element)}else liveAudio.toggle()};
  const element=liveAudio.start(selected);if(element)screen.append(element);
 }
 function show(id,{force=false}={}){
  const channel=BROADCAST_CHANNELS.find(c=>c.id===id);if(!channel||selected?.id===id&&!force)return;selected=channel;
  for(const button of section.querySelectorAll('[data-channel]'))button.setAttribute('aria-pressed',String(button.dataset.channel===id));
  section.querySelector('.quran-broadcast-place').textContent=channel.place;section.querySelector('.quran-broadcast-title').textContent=channel.name;section.querySelector('a').href=channel.url;
  if(audioMode){screen.replaceChildren();renderAudio();return}
  setForegroundAudio(audioOwner,true);const frame=doc.createElement('iframe');frame.title='Прямой эфир · '+channel.name;frame.src='https://www.youtube-nocookie.com/embed/'+channel.video+'?autoplay=1&playsinline=1&rel=0';frame.referrerPolicy='strict-origin-when-cross-origin';frame.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';frame.allowFullscreen=true;frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-presentation');screen.replaceChildren(frame);
 }
 function switchAudio(){audioMode=!audioMode;root.classList.toggle('is-audio',audioMode);if(!audioMode){liveAudio?.stop();liveAudio=null}section.querySelector('[data-broadcast-audio]').textContent=audioMode?'Смотреть видео':'Слушать в фоне';section.querySelector('[data-broadcast-audio]').setAttribute('aria-pressed',String(audioMode));section.querySelector('.quran-broadcast-note').textContent=audioMode?'Поток Saudi Quran TV / Saudi Sunnah TV · Quran.tv':'Каналы Saudi Quran TV и Saudi Sunnah TV · YouTube';show(selected.id,{force:true})}
 function stop(){
  setForegroundAudio(audioOwner,false);if(!root)return;const wasFull=!mini;restorePage();detach?.();detach=null;win.removeEventListener('hashchange',route);liveAudio?.stop();liveAudio=null;audioMode=false;screen.replaceChildren();root.remove();root=section=screen=selected=null;doc.body.classList.remove('has-quran-broadcast');if(wasFull)focusBack();returnFocus=null;
 }
 const route=()=>minimize({focus:false});
 function open(){
  if(root){returnFocus=doc.activeElement;setMode(false);return}
  playback.pause();returnFocus=doc.activeElement;root=doc.createElement('aside');root.className='quran-broadcast-overlay';
  root.innerHTML='<section class="quran-broadcast-dialog"><div class="quran-broadcast-heading"><div><span class="eyebrow">ПРЯМОЙ ЭФИР</span><h2 class="quran-broadcast-title">Мекка</h2></div><div class="quran-broadcast-controls"><button type="button" data-broadcast-size aria-label="Свернуть трансляцию" aria-expanded="true">'+actionIcon('collapse')+'</button><button type="button" data-broadcast-stop aria-label="Выключить трансляцию">×</button></div></div><div class="quran-broadcast-tabs" role="group" aria-label="Выбор трансляции">'+BROADCAST_CHANNELS.map(c=>'<button type="button" data-channel="'+c.id+'" aria-pressed="false">'+c.name+'</button>').join('')+'</div><p class="quran-broadcast-place"></p><div class="quran-broadcast-screen"></div><p class="quran-broadcast-note">Каналы Saudi Quran TV и Saudi Sunnah TV · YouTube</p><a class="text-button quran-broadcast-external" target="_blank" rel="noopener noreferrer">Открыть эфир на YouTube '+actionIcon('external')+'</a></section>';
  doc.body.append(root);section=root.querySelector('.quran-broadcast-dialog');screen=section.querySelector('.quran-broadcast-screen');
  const audioButton=doc.createElement('button');audioButton.type='button';audioButton.className='button secondary quran-broadcast-audio-button';audioButton.setAttribute('data-broadcast-audio','');audioButton.setAttribute('aria-pressed','false');audioButton.textContent='Слушать в фоне';screen.before(audioButton);audioButton.onclick=switchAudio;
  for(const button of section.querySelectorAll('[data-channel]'))button.onclick=()=>show(button.dataset.channel);
  section.querySelector('[data-broadcast-size]').onclick=()=>setMode(!mini);section.querySelector('[data-broadcast-stop]').onclick=stop;
  root.onclick=event=>{if(event.target===root&&!mini)minimize()};
  root.onkeydown=event=>{
   if(event.key==='Escape'&&!mini){event.preventDefault();minimize();return}
   if(event.key!=='Tab'||mini)return;const controls=[...section.querySelectorAll('button,a[href],iframe')];const first=controls[0],last=controls.at(-1);if(event.shiftKey&&doc.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&doc.activeElement===last){event.preventDefault();first.focus()}
  };
  show('makkah');setMode(false);doc.body.classList.add('has-quran-broadcast');win.addEventListener('hashchange',route);
  detach=playback.subscribe(state=>{if(['loading','playing'].includes(state.status))stop()});
 }
 return{open,minimize,stop,get state(){return{active:!!root,minimized:mini,channel:selected?.id||null,audio:audioMode}}};
}
let broadcast=null;
export function openQuranBroadcast(){(broadcast??=createQuranBroadcast()).open()}
export function minimizeQuranBroadcast(){broadcast?.minimize({focus:false})}
export function stopQuranBroadcast(){broadcast?.stop()}
export function bindQuranBroadcast(container){for(const button of container.querySelectorAll('[data-quran-broadcast]'))button.onclick=openQuranBroadcast}
