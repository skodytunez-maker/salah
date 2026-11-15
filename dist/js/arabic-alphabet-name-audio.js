// Letter-name recordings only; attribution: ../data/alphabet-audio-sources.json.
// No pronunciation scoring or concatenated syllable/example audio.
import{toast}from './ui.js';
import{uiMessage,uiSet,uiRaw,uiAttribute,watchPracticeUi}from './practice-i18n.js';
import{ALPHABET_RECORDINGS}from './arabic-alphabet-recordings.js';
import{ARABIC_LETTERS,letterById}from './arabic-alphabet-core.js';
import{claimPlayback,registerPlayback}from './media-playback-focus.js';
import{setForegroundAudio}from './audio-focus.js';
const owner='alphabet-name';
const audioLetter=id=>letterById(id)||(id==='hamza'?{id:'hamza',name:'Хамза',char:'ء'}:null);
export function alphabetAudioIdForGlyph(glyph){return ARABIC_LETTERS.find(letter=>letter.char===glyph)?.id||(['ء','أ','إ','ؤ','ئ'].includes(glyph)?'hamza':null);}
let audio=null,button=null,status=null,revision=0,pending=false,active=false;
const speaker='<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/></svg>';
function paint(){
 if(!button)return;
 const key=pending?'alphabetUi.loadingName':active?'alphabetUi.stopName':'alphabetUi.playName',fallback=pending?'Загрузка названия буквы: {name}':active?'Остановить название буквы: {name}':'Послушать название буквы: {name}',parameters={name:button.dataset.letterName};
 uiAttribute(button,'aria-label',key,fallback,parameters);
 uiSet(button.querySelector('.alphabet-name-action'),key,fallback,parameters);
 button.setAttribute('aria-pressed',String(active||pending));button.setAttribute('aria-busy',String(pending));
}
export function stopAlphabetName(){
 revision++;const old=audio;audio=null;active=false;pending=false;
 if(old){old.onplaying=old.onpause=old.onended=old.onerror=null;old.pause();old.removeAttribute('src');old.load();}
 setForegroundAudio(owner,false);paint();button=null;status=null;
}
registerPlayback(owner,stopAlphabetName);
globalThis.window?.addEventListener('hashchange',stopAlphabetName);
globalThis.window?.addEventListener('pagehide',stopAlphabetName);
export function alphabetNameControl(id,{glyph=null,tile=false}={}){
 if(!audioLetter(id)||!Object.hasOwn(ALPHABET_RECORDINGS,id))return '';
 const character=alphabetAudioIdForGlyph(glyph)===id?glyph:audioLetter(id).char;
 return '<div class="alphabet-name-audio"><button class="alphabet-name-glyph" type="button" data-alphabet-name="'+id+'" aria-pressed="false" aria-busy="false"><span class="alphabet-glyph" lang="ar" dir="rtl" translate="no">'+character+'</span>'+(tile?'<small class="alphabet-name-caption" lang="ru" translate="no">'+audioLetter(id).name+'</small>':'')+speaker+'<span class="alphabet-name-action" data-i18n="alphabetUi.listenName">Послушать название</span></button><span class="alphabet-name-status" role="status" aria-live="polite"></span></div>';
}
function bindNameControl(control,message,id){
 if(!control||!audioLetter(id)||!Object.hasOwn(ALPHABET_RECORDINGS,id))return;
 uiAttribute(control,'aria-label','alphabetUi.playName','Послушать название буквы: {name}',{name:audioLetter(id).name});
 uiSet(control.querySelector('.alphabet-name-action'),'alphabetUi.playName','Послушать название буквы: {name}',{name:audioLetter(id).name});
 control.dataset.letterName=audioLetter(id).name;
 control.onclick=()=>{
  if(audio&&button===control&&(active||pending)){stopAlphabetName();return;}
  stopAlphabetName();button=control;status=message;uiRaw(status,'');
  const a=audio=new Audio(ALPHABET_RECORDINGS[id]),ticket=revision;
  a.preload='none';claimPlayback(owner);pending=true;setForegroundAudio(owner,true);paint();
  const current=()=>a===audio&&ticket===revision&&control.isConnected;
  function finish(error=false){
   if(!current())return;
   const target=status;stopAlphabetName();
   if(error&&target?.isConnected){const fallback='Не удалось загрузить аудио. Проверьте интернет и нажмите на букву ещё раз.';uiSet(target,'alphabetUi.audioFailed',fallback);toast(uiMessage('alphabetUi.audioFailed',fallback));}
  }
  a.onplaying=()=>{if(!current()||a.paused)return;active=true;pending=false;paint();};
  a.onpause=()=>{if(current()&&a.paused)finish();};
  a.onended=()=>finish();a.onerror=()=>finish(true);
  try{Promise.resolve(a.play()).catch(()=>finish(true));}catch{finish(true);}
 };
}

const languageBindings=new WeakMap();
function watchControls(host){languageBindings.get(host)?.();languageBindings.set(host,watchPracticeUi(host.firstElementChild||host));}
export function bindAlphabetName(host,id){
 stopAlphabetName();bindNameControl(host.querySelector('[data-alphabet-name]'),host.querySelector('.alphabet-name-status'),id);watchControls(host);
}
export function bindAlphabetNames(host){
 stopAlphabetName();for(const control of host.querySelectorAll('[data-alphabet-name]'))bindNameControl(control,control.closest('.alphabet-name-audio').querySelector('.alphabet-name-status'),control.dataset.alphabetName);watchControls(host);
}
