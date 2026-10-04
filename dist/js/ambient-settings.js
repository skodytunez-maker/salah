import{initAmbientAudio}from './ambient-audio.js';
import{updateSettings}from './storage.js';
import{toast}from './ui.js';
let detach=null;
export function mountAmbientSettings(container){
 detach?.();detach=null;
 const root=container.querySelector('#ambient-sound-settings');if(!root)return;
 const audio=initAmbientAudio();
 root.innerHTML='<details class="ambient-settings"><summary>Звуки атмосферы</summary><label class="switch-row" for="ambient-enabled"><span>Включить звук</span><input id="ambient-enabled" type="checkbox"></label><label for="ambient-sound">Фоновый звук</label><select id="ambient-sound"><option value="rain">Дождь</option><option value="wind">Тихий ветер</option></select><div class="ambient-volume"><label for="ambient-volume">Громкость</label><output for="ambient-volume" id="ambient-volume-value"></output></div><input id="ambient-volume" type="range" min="0" max="60" step="1"><p class="muted ambient-note">Плавное включение. Пауза во время Корана, трансляции и Азана.</p><p class="ambient-status" role="status"></p><button type="button" class="button secondary" data-ambient-retry hidden>Включить звук</button></details>';
 const enabled=root.querySelector('#ambient-enabled'),sound=root.querySelector('#ambient-sound'),range=root.querySelector('#ambient-volume'),output=root.querySelector('output'),status=root.querySelector('[role="status"]'),retry=root.querySelector('[data-ambient-retry]');
 const save=value=>{if(!updateSettings(value))toast('Не удалось сохранить настройку звука.');};
 enabled.onchange=()=>{save({ambientEnabled:enabled.checked});if(enabled.checked)void audio.unlock();};
 sound.onchange=()=>save({ambientSound:sound.value});
 range.oninput=()=>{output.value=range.value+'%';void audio.previewVolume(Number(range.value));};
 range.onchange=()=>{save({ambientVolume:Number(range.value)});void audio.previewVolume(null);};
 retry.onclick=()=>void audio.unlock();
 const render=state=>{
  enabled.checked=state.enabled;sound.value=state.sound;range.value=String(state.volume);output.value=state.volume+'%';
  enabled.disabled=!state.supported;
  status.textContent=state.reason==='tap'?'Коснитесь экрана, чтобы включить звук.':state.reason==='unsupported'?'Звук недоступен в этом браузере.':state.reason==='error'?'Не удалось включить звук. Попробуйте ещё раз.':state.reason==='foreground'?'На паузе — идёт воспроизведение.':'';
  status.hidden=!status.textContent;retry.hidden=!state.enabled||!['tap','error'].includes(state.reason);
 };
 const unsubscribe=audio.subscribe(render),cleanup=()=>{unsubscribe();window.removeEventListener('hashchange',route);void audio.previewVolume(null);if(detach===cleanup)detach=null;};
 const route=()=>{if(!root.isConnected)cleanup();};window.addEventListener('hashchange',route);detach=cleanup;
}
