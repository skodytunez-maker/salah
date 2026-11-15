import{claimPlayback,registerPlayback}from './media-playback-focus.js';
import{actionIcon,actionLabel}from './action-icons.js';
import{setForegroundAudio}from './audio-focus.js';
import{quranPlayback}from './quran-session.js';
import{createBroadcastAudio}from './broadcast-audio.js';
import{t,subscribeLanguage}from './i18n.js';
import{uiLeaf,uiAttribute,setUiAttribute,translateQuranUi}from './quran-ui.js';
import{esc}from './ui.js';
export const BROADCAST_CHANNELS=Object.freeze([
 {id:'makkah',get name(){return t('quranUi.broadcastMakkah');},get place(){return t('quranUi.broadcastMakkahPlace');},video:'eC4LfEVxvKg',url:'https://www.youtube.com/user/SaudiQuranTv/live'},
 {id:'madinah',get name(){return t('quranUi.broadcastMadinah');},get place(){return t('quranUi.broadcastMadinahPlace');},video:'Rs7St51oDDc',url:'https://www.youtube.com/user/SaudiSunnahTv/live'}
]);
export const broadcastIcon='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="13" rx="3"/><path d="m10 8 5 3-5 3zM8 21h8M12 17v4"/></svg>';
export function broadcastButton(compact=false){return '<button type="button" class="quran-broadcast-button'+(compact?' is-compact':'')+'" data-quran-broadcast>'+broadcastIcon+'<span><strong>'+uiLeaf(compact?'quranUi.broadcastCompact':'quranUi.broadcastLive')+'</strong>'+(compact?'':'<small>'+uiLeaf('quranUi.broadcastPlaces')+'</small>')+'</span><span class="quran-live-badge"><i></i>'+uiLeaf('quranUi.broadcastBadge')+'</span></button>'}
// Keep the same iframe connected to the body: reparenting or recreating it restarts YouTube.
export function createQuranBroadcast({doc=document,win=window,playback=quranPlayback,createAudio=createBroadcastAudio}={}){
 let root=null,section=null,screen=null,selected=null,mini=false,detach=null,returnFocus=null,inertSiblings=[],audioMode=false,liveAudio=null,offLanguage=null,lastAudioStatus='loading';
 const audioOwner={};registerPlayback(audioOwner,stop);
 const restorePage=()=>{for(const [element,previous]of inertSiblings)element.inert=previous;inertSiblings=[]};
 const lockPage=()=>{restorePage();for(const element of doc.body.children){if(element===root||element.matches('dialog,script,style,link'))continue;inertSiblings.push([element,element.inert]);element.inert=true}};
 const focusBack=()=>{if(returnFocus?.isConnected&&!returnFocus.inert)returnFocus.focus();else doc.querySelector('#app')?.focus({preventScroll:true})};
 function setMode(value,{focus=true}={}){
  if(!root)return;mini=value;root.classList.toggle('is-mini',mini);root.setAttribute('role',mini?'region':'dialog');root.setAttribute('aria-label',mini?t('quranUi.broadcastRegion',{name:selected.name}):t('quranUi.broadcastDialog'));
  if(mini){root.removeAttribute('aria-modal');restorePage();if(focus)focusBack()}else{root.setAttribute('aria-modal','true');lockPage();if(focus)section.querySelector('[data-broadcast-size]').focus()}
  const size=section.querySelector('[data-broadcast-size]');size.innerHTML=actionIcon(mini?'expand':'collapse');setUiAttribute(size,'aria-label',mini?'quranUi.broadcastExpand':'quranUi.broadcastCollapse');size.setAttribute('aria-expanded',String(!mini));
 }
 function minimize(options){setMode(true,options)}
 function paintAudioText(){
  if(!audioMode||!screen)return;const button=screen.querySelector('[data-audio-toggle]'),note=screen.querySelector('[data-audio-status]');if(!button||!note)return;
  button.setAttribute('aria-label',t(['paused','error','idle'].includes(lastAudioStatus)?'quranUi.broadcastPlay':'quranUi.broadcastPause'));
  note.textContent=t({playing:'quranUi.broadcastAudioPlaying',paused:'quranUi.broadcastPaused',loading:'quranUi.broadcastConnecting',error:'quranUi.broadcastError',idle:'quranUi.broadcastStopped'}[lastAudioStatus]||'quranUi.broadcastStopped');
 }
 function paintLabels(){
  if(!root||!selected)return;translateQuranUi(root);root.setAttribute('aria-label',mini?t('quranUi.broadcastRegion',{name:selected.name}):t('quranUi.broadcastDialog'));
  setUiAttribute(section.querySelector('[data-broadcast-size]'),'aria-label',mini?'quranUi.broadcastExpand':'quranUi.broadcastCollapse');
  section.querySelector('.quran-broadcast-place').textContent=selected.place;section.querySelector('.quran-broadcast-title').textContent=selected.name;
  section.querySelector('[data-broadcast-audio]').textContent=t(audioMode?'quranUi.broadcastVideo':'quranUi.broadcastAudio');
  section.querySelector('.quran-broadcast-note').textContent=t(audioMode?'quranUi.broadcastStreamSource':'quranUi.broadcastVideoSource');
  const frame=screen.querySelector('iframe');if(frame)frame.title=t('quranUi.broadcastFrame',{name:selected.name});paintAudioText();
 }
 function renderAudio(){
  lastAudioStatus='loading';screen.innerHTML='<div class="quran-live-audio"><span class="quran-live-audio-icon" aria-hidden="true">'+broadcastIcon+'</span><div><strong>'+uiLeaf('quranUi.broadcastAudioTitle')+'</strong><span data-audio-status role="status">'+esc(t('quranUi.broadcastConnecting'))+'</span></div><button type="button" data-audio-toggle aria-label="'+esc(t('quranUi.broadcastPause'))+'">Ⅱ</button></div>';
  liveAudio??=createAudio({doc,win,onState:state=>{if(!audioMode||!screen)return;lastAudioStatus=state.status;setForegroundAudio(audioOwner,['loading','playing'].includes(state.status));const button=screen.querySelector('[data-audio-toggle]');if(!button)return;const paused=['paused','error','idle'].includes(state.status);button.innerHTML=actionIcon(paused?'play':'pause');paintAudioText();}});
  screen.querySelector('[data-audio-toggle]').onclick=()=>{if(['error','idle'].includes(liveAudio.state.status)){const element=liveAudio.start(selected);if(element)screen.append(element)}else liveAudio.toggle()};
  const element=liveAudio.start(selected);if(element)screen.append(element);paintAudioText();
 }
 function show(id,{force=false}={}){
  const channel=BROADCAST_CHANNELS.find(c=>c.id===id);if(!channel||selected?.id===id&&!force)return;selected=channel;
  for(const button of section.querySelectorAll('[data-channel]'))button.setAttribute('aria-pressed',String(button.dataset.channel===id));
  section.querySelector('.quran-broadcast-place').textContent=channel.place;section.querySelector('.quran-broadcast-title').textContent=channel.name;section.querySelector('a').href=channel.url;
  if(audioMode){screen.replaceChildren();renderAudio();paintLabels();return}
  setForegroundAudio(audioOwner,true);const frame=doc.createElement('iframe');frame.title=t('quranUi.broadcastFrame',{name:channel.name});frame.src='https://www.youtube-nocookie.com/embed/'+channel.video+'?autoplay=1&playsinline=1&rel=0';frame.referrerPolicy='strict-origin-when-cross-origin';frame.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';frame.allowFullscreen=true;frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-presentation');screen.replaceChildren(frame);paintLabels();
 }
 function switchAudio(){audioMode=!audioMode;root.classList.toggle('is-audio',audioMode);if(!audioMode){liveAudio?.stop();liveAudio=null}section.querySelector('[data-broadcast-audio]').setAttribute('aria-pressed',String(audioMode));show(selected.id,{force:true})}
 function stop(){
  setForegroundAudio(audioOwner,false);if(!root)return;offLanguage?.();offLanguage=null;const wasFull=!mini;restorePage();detach?.();detach=null;win.removeEventListener('hashchange',route);liveAudio?.stop();liveAudio=null;audioMode=false;screen.replaceChildren();root.remove();root=section=screen=selected=null;doc.body.classList.remove('has-quran-broadcast');if(wasFull)focusBack();returnFocus=null;
 }
 const route=()=>minimize({focus:false});
 function open(){
  claimPlayback(audioOwner);
  if(root){returnFocus=doc.activeElement;setMode(false);return}
  playback.pause();returnFocus=doc.activeElement;root=doc.createElement('aside');root.className='quran-broadcast-overlay';
  root.innerHTML='<section class="quran-broadcast-dialog"><div class="quran-broadcast-heading"><div><span class="eyebrow">'+uiLeaf('quranUi.broadcastHeading')+'</span><h2 class="quran-broadcast-title"></h2></div><div class="quran-broadcast-controls"><button type="button" data-broadcast-size '+uiAttribute('quranUi.broadcastCollapse')+' aria-expanded="true">'+actionIcon('collapse')+'</button><button type="button" data-broadcast-stop '+uiAttribute('quranUi.broadcastStop')+'>×</button></div></div><div class="quran-broadcast-tabs" role="group" '+uiAttribute('quranUi.broadcastChannelChoice')+'>'+BROADCAST_CHANNELS.map(c=>'<button type="button" data-channel="'+c.id+'" aria-pressed="false">'+uiLeaf(c.id==='makkah'?'quranUi.broadcastMakkah':'quranUi.broadcastMadinah')+'</button>').join('')+'</div><p class="quran-broadcast-place"></p><div class="quran-broadcast-screen"></div><p class="quran-broadcast-note"></p><a class="text-button quran-broadcast-external" target="_blank" rel="noopener noreferrer">'+uiLeaf('quranUi.broadcastExternal')+' '+actionIcon('external')+'</a></section>';
  doc.body.append(root);section=root.querySelector('.quran-broadcast-dialog');screen=section.querySelector('.quran-broadcast-screen');
  const audioButton=doc.createElement('button');audioButton.type='button';audioButton.className='button secondary quran-broadcast-audio-button';audioButton.setAttribute('data-broadcast-audio','');audioButton.setAttribute('aria-pressed','false');audioButton.textContent=t('quranUi.broadcastAudio');screen.before(audioButton);audioButton.onclick=switchAudio;
  for(const button of section.querySelectorAll('[data-channel]'))button.onclick=()=>show(button.dataset.channel);
  section.querySelector('[data-broadcast-size]').onclick=()=>setMode(!mini);section.querySelector('[data-broadcast-stop]').onclick=stop;
  root.onclick=event=>{if(event.target===root&&!mini)minimize()};
  root.onkeydown=event=>{
   if(event.key==='Escape'&&!mini){event.preventDefault();minimize();return}
   if(event.key!=='Tab'||mini)return;const controls=[...section.querySelectorAll('button,a[href],iframe')];const first=controls[0],last=controls.at(-1);if(event.shiftKey&&doc.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&doc.activeElement===last){event.preventDefault();first.focus()}
  };
  offLanguage=subscribeLanguage(paintLabels);show('makkah');setMode(false);doc.body.classList.add('has-quran-broadcast');win.addEventListener('hashchange',route);
  detach=playback.subscribe(state=>{if(['loading','playing'].includes(state.status))stop()});
 }
 return{open,minimize,stop,get state(){return{active:!!root,minimized:mini,channel:selected?.id||null,audio:audioMode}}};
}
let broadcast=null;
export function openQuranBroadcast(){(broadcast??=createQuranBroadcast()).open()}
export function minimizeQuranBroadcast(){broadcast?.minimize({focus:false})}
export function stopQuranBroadcast(){broadcast?.stop()}
export function bindQuranBroadcast(container){for(const button of container.querySelectorAll('[data-quran-broadcast]'))button.onclick=openQuranBroadcast}
