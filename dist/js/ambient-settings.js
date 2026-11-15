import{t,translateUi}from './i18n.js';
import{initAmbientAudio}from './ambient-audio.js';
import{updateSettings}from './storage.js';
import{esc,toast}from './ui.js';
let detach=null;
export function mountAmbientSettings(container){
 detach?.();detach=null;
 const root=container.querySelector('#ambient-sound-settings');if(!root)return;
 const audio=initAmbientAudio();
 root.innerHTML='<details class="ambient-settings"><summary data-i18n="ambientUi.title">'+esc(t('ambientUi.title'))+'</summary><label class="switch-row" for="ambient-enabled"><span data-i18n="ambientUi.enable">'+esc(t('ambientUi.enable'))+'</span><input id="ambient-enabled" type="checkbox"></label><label for="ambient-sound" data-i18n="ambientUi.sound">'+esc(t('ambientUi.sound'))+'</label><select id="ambient-sound"><option value="rain" data-i18n="ambientUi.rain">'+esc(t('ambientUi.rain'))+'</option><option value="wind" data-i18n="ambientUi.wind">'+esc(t('ambientUi.wind'))+'</option></select><div class="ambient-volume"><label for="ambient-volume" data-i18n="ambientUi.volume">'+esc(t('ambientUi.volume'))+'</label><output for="ambient-volume" id="ambient-volume-value"></output></div><input id="ambient-volume" type="range" min="0" max="60" step="1"><p class="muted ambient-note" data-i18n="ambientUi.note">'+esc(t('ambientUi.note'))+'</p><p class="ambient-status" role="status"></p><button type="button" class="button secondary" data-ambient-retry hidden data-i18n="ambientUi.enable">'+esc(t('ambientUi.enable'))+'</button></details>';
 translateUi(root);
 const enabled=root.querySelector('#ambient-enabled'),sound=root.querySelector('#ambient-sound'),range=root.querySelector('#ambient-volume'),output=root.querySelector('output'),status=root.querySelector('[role="status"]'),retry=root.querySelector('[data-ambient-retry]');
 const save=value=>{if(!updateSettings(value))toast(t('ambientUi.saveFailed'));};
 enabled.onchange=()=>{save({ambientEnabled:enabled.checked});if(enabled.checked)void audio.unlock();};
 sound.onchange=()=>save({ambientSound:sound.value});
 range.oninput=()=>{output.value=range.value+'%';void audio.previewVolume(Number(range.value));};
 range.onchange=()=>{save({ambientVolume:Number(range.value)});void audio.previewVolume(null);};
 retry.onclick=()=>void audio.unlock();
 const render=state=>{
  enabled.checked=state.enabled;sound.value=state.sound;range.value=String(state.volume);output.value=state.volume+'%';
  enabled.disabled=!state.supported;
  const key={tap:'ambientUi.tap',unsupported:'ambientUi.unsupported',error:'ambientUi.error',foreground:'ambientUi.foreground'}[state.reason];if(key)status.setAttribute('data-i18n',key);else status.removeAttribute('data-i18n');status.textContent=key?t(key):'';
  status.hidden=!status.textContent;retry.hidden=!state.enabled||!['tap','error'].includes(state.reason);
 };
 const unsubscribe=audio.subscribe(render),cleanup=()=>{unsubscribe();window.removeEventListener('hashchange',route);void audio.previewVolume(null);if(detach===cleanup)detach=null;};
 const route=()=>{if(!root.isConnected)cleanup();};window.addEventListener('hashchange',route);detach=cleanup;
}
