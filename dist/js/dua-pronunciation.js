import{claimPlayback,registerPlayback}from './media-playback-focus.js';
import{setForegroundAudio}from './audio-focus.js';
import{safeDuaAudio}from './daily-dua-recordings.js';
import{preloadPronunciation}from './pronunciation-preload.js';
const owner='daily-dua-pronunciation',play='<path d="m9 6 9 6-9 6Z"/>',pause='<path d="M9 6v12M15 6v12"/>';
export function duaAudioMarkup(recording){return recording?'<div class="dua-audio"><button type="button" class="dua-audio-button" aria-label="Слушать дуа"><svg viewBox="0 0 24 24" aria-hidden="true">'+play+'</svg><span>Слушать</span></button><span class="dua-audio-status" role="status"></span></div>':'<p class="dua-audio-pending">Аудио к этой формулировке пока готовим.</p>';}
export function mountDuaPronunciation(root,recording,{AudioClass=globalThis.Audio}={}){
 const button=root.querySelector('.dua-audio-button'),status=root.querySelector('.dua-audio-status');if(!button||!safeDuaAudio(recording?.url))return()=>{};
 let audio=null,disposed=false;
 try{audio=new AudioClass(recording.url);preloadPronunciation(audio);}catch{}
 const valid=instance=>!disposed&&instance===audio;
 function paint(playing){if(disposed)return;button.removeAttribute('aria-busy');button.setAttribute('aria-label',playing?'Приостановить произношение':'Слушать дуа');button.querySelector('svg').innerHTML=playing?pause:play;button.querySelector('span').textContent=playing?'Пауза':'Слушать';}
 function stop(){const instance=audio;audio=null;if(instance){for(const key of ['onplay','onplaying','onpause','onerror','onended'])instance[key]=null;instance.pause();if(instance.removeAttribute)instance.removeAttribute('src');else instance.src='';instance.load?.();}setForegroundAudio(owner,false);}
 function paused(){audio?.pause();setForegroundAudio(owner,false);paint(false);}
 const unregister=registerPlayback(owner,paused);
 button.onclick=async event=>{event.stopPropagation();if(disposed)return;if(audio&&!audio.paused){paused();status.textContent='';return;}if(audio?.error)stop();if(!audio||!audio.onended){const instance=audio||new AudioClass(recording.url);audio=instance;instance.onplay=()=>{if(!valid(instance)){instance.pause();return;}setForegroundAudio(owner,true);paint(true);button.setAttribute('aria-busy','true');};instance.onplaying=()=>{if(valid(instance)&&!instance.paused){paint(true);status.textContent='';}};instance.onpause=()=>{if(valid(instance)){setForegroundAudio(owner,false);paint(false);status.textContent='';}};instance.onended=()=>{if(valid(instance)){stop();paint(false);status.textContent='';}};instance.onerror=()=>{if(valid(instance)){stop();paint(false);status.textContent='Не удалось включить запись. Нажмите ещё раз.';}};}const instance=audio;claimPlayback(owner);button.setAttribute('aria-busy','true');status.textContent='Подключаем запись…';try{await instance.play();if(!valid(instance))instance.pause();else if(!instance.paused){button.removeAttribute('aria-busy');status.textContent='';}}catch{if(valid(instance)){stop();paint(false);status.textContent='Не удалось включить запись. Нажмите ещё раз.';}}};
 return()=>{if(disposed)return;stop();disposed=true;button.onclick=null;unregister();};
}
