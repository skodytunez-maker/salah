import{settings,defaults,normalizeSettings,read,updateSettings}from './storage.js';
import{t,translateUi,subscribeLanguage,getLocale}from './i18n.js';
import{esc}from './ui.js';

const fields=['glassEnabled','glassTableTransparency','glassPlayerTransparency'];
const runtimes=new WeakMap(),mounts=new WeakMap();
const pick=value=>({glassEnabled:value.glassEnabled===true,glassTableTransparency:Number.isInteger(value.glassTableTransparency)&&value.glassTableTransparency>=0&&value.glassTableTransparency<=100?value.glassTableTransparency:defaults.glassTableTransparency,glassPlayerTransparency:Number.isInteger(value.glassPlayerTransparency)&&value.glassPlayerTransparency>=0&&value.glassPlayerTransparency<=100?value.glassPlayerTransparency:defaults.glassPlayerTransparency});
const signature=value=>fields.map(key=>String(value[key])).join(':');
const validLevel=value=>Number.isInteger(value)&&value>=0&&value<=100;
const percentage=value=>new Intl.NumberFormat(getLocale(),{style:'percent',maximumFractionDigits:0}).format(value/100);

function runtimeFor(doc,win){
 let runtime=runtimes.get(doc);if(runtime)return runtime;
 let references=0,last=signature(pick(settings)),previewOwner=null,preview={};
 const views=new Set();
 const state=()=>({...pick(settings),...preview});
 const apply=()=>{const value=state(),root=doc.documentElement;if(!root)return;if(value.glassEnabled){root.setAttribute('data-glass-mode','on');root.style.setProperty('--glass-table-alpha',(1-.26*value.glassTableTransparency/100).toFixed(4));root.style.setProperty('--glass-player-alpha',(1-.22*value.glassPlayerTransparency/100).toFixed(4));}else{root.removeAttribute('data-glass-mode');root.style.removeProperty('--glass-table-alpha');root.style.removeProperty('--glass-player-alpha');}};
 const publish=reason=>{apply();for(const view of views)view(state(),reason);};
 const sync=(reason='settings',clear=false)=>{const next=signature(pick(settings)),changed=next!==last;last=next;if(clear||changed){preview={};previewOwner=null;}publish(changed?reason:'unchanged');};
 const local=()=>sync('settings');
 const external=event=>{if(event.key!==null&&event.key!=='salah:settings')return;Object.assign(settings,pick(normalizeSettings(read('settings',{}))));sync('storage');};
 runtime={
  retain(){if(references++===0){win.addEventListener('salah:settings-changed',local);win.addEventListener('storage',external);}sync();let released=false;return()=>{if(released)return;released=true;if(--references===0){preview={};previewOwner=null;apply();win.removeEventListener('salah:settings-changed',local);win.removeEventListener('storage',external);runtimes.delete(doc);}};},
  state,
  subscribe(view){views.add(view);view(state(),'mount');return()=>views.delete(view);},
  preview(owner,key,value){if(!pick(settings).glassEnabled||!fields.slice(1).includes(key)||!validLevel(value))return;if(previewOwner!==owner){preview={};previewOwner=owner;}preview[key]=value;publish('preview');},
  cancel(owner){if(previewOwner!==owner)return;preview={};previewOwner=null;publish('cancel');},
  sync
 };
 runtimes.set(doc,runtime);return runtime;
}

// One small event-driven style owner. No frame loop, media, route or network work.
export function initGlassInterface({doc=document,win=window}={}){return runtimeFor(doc,win).retain();}

export function mountGlassSettings(host,{doc=host?.ownerDocument||document,win=doc.defaultView||window}={}){
 if(!host)return()=>{};mounts.get(host)?.();
 const stopInterface=initGlassInterface({doc,win}),runtime=runtimeFor(doc,win),owner={};
 const section=doc.createElement('details');section.className='glass-settings';
 const leaf=(key,tag='span')=>'<'+tag+' data-i18n="'+key+'">'+esc(t(key))+'</'+tag+'>';
 section.innerHTML='<summary>'+leaf('glassUi.title')+'</summary><label class="switch-row" for="glass-enabled">'+leaf('glassUi.enabled')+'<input id="glass-enabled" type="checkbox" aria-controls="glass-settings-controls" aria-describedby="glass-settings-note"></label><p class="muted" id="glass-settings-note" data-i18n="glassUi.note">'+esc(t('glassUi.note'))+'</p><fieldset class="glass-settings-controls" id="glass-settings-controls"><legend class="sr-only" data-i18n="glassUi.levels">'+esc(t('glassUi.levels'))+'</legend>'+[['table','glassUi.table','glassUi.tableAria'],['player','glassUi.player','glassUi.playerAria']].map(([kind,label,aria])=>'<div class="glass-settings-level"><label for="glass-'+kind+'-transparency">'+leaf(label)+'</label><output id="glass-'+kind+'-level" for="glass-'+kind+'-transparency" dir="ltr"></output><input id="glass-'+kind+'-transparency" data-glass-level="'+kind+'" type="range" min="0" max="100" step="1" dir="ltr" data-i18n-aria-label="'+aria+'" aria-label="'+esc(t(aria))+'" aria-describedby="glass-settings-note"></div>').join('')+'</fieldset><figure class="glass-preview"><figcaption data-i18n="glassUi.preview">'+esc(t('glassUi.preview'))+'</figcaption><div class="glass-preview-surfaces" aria-hidden="true"><div class="glass-preview-table">'+leaf('glassUi.table')+'<strong dir="ltr">—:—</strong></div><div class="glass-preview-player"><span class="glass-preview-play" aria-hidden="true">▶</span>'+leaf('glassUi.player')+'</div></div></figure><p class="muted" data-i18n="glassUi.offNote">'+esc(t('glassUi.offNote'))+'</p><button type="button" class="button secondary" data-glass-reset>'+leaf('glassUi.reset')+'</button><p class="muted" data-glass-status role="status" aria-live="polite" hidden></p>';
 host.append(section);
 const toggle=section.querySelector('#glass-enabled'),group=section.querySelector('fieldset'),status=section.querySelector('[data-glass-status]');
 const controls=[['glassTableTransparency',section.querySelector('#glass-table-transparency'),section.querySelector('#glass-table-level')],['glassPlayerTransparency',section.querySelector('#glass-player-transparency'),section.querySelector('#glass-player-level')]];
 let disposed=false,message=null;
 const showMessage=key=>{message=key;status.hidden=!key;if(key){status.setAttribute('data-i18n',key);status.textContent=t(key);}else{status.removeAttribute('data-i18n');status.textContent='';}};
 function paint(value,reason){if(disposed)return;toggle.checked=value.glassEnabled;group.disabled=!value.glassEnabled;for(const[key,input,output]of controls){input.disabled=!value.glassEnabled;input.value=String(value[key]);output.textContent=percentage(value[key]);input.setAttribute('aria-valuetext',percentage(value[key]));}if(['settings','storage'].includes(reason))showMessage(null);}
 function commit(patch){
  if(disposed)return;const before=pick(normalizeSettings(read('settings',settings)));runtime.cancel(owner);
  let saved=false;try{saved=updateSettings(patch);}catch{}
  if(!saved){const confirmed=pick(normalizeSettings(read('settings',before)));Object.assign(settings,confirmed);runtime.sync('rollback',true);showMessage('glassUi.saveFailed');return;}
  runtime.sync('commit',true);showMessage('glassUi.saved');
 }
 const enabled=()=>commit({glassEnabled:toggle.checked});toggle.addEventListener('change',enabled);
 const handlers=controls.map(([key,input])=>{const preview=()=>{if(!disposed&&pick(settings).glassEnabled)runtime.preview(owner,key,Number(input.value));},save=()=>{const value=Number(input.value);if(!disposed&&pick(settings).glassEnabled&&validLevel(value))commit({[key]:value});};input.addEventListener('input',preview);input.addEventListener('change',save);return{input,preview,save};});
 const reset=()=>commit({glassEnabled:defaults.glassEnabled,glassTableTransparency:defaults.glassTableTransparency,glassPlayerTransparency:defaults.glassPlayerTransparency});section.querySelector('[data-glass-reset]').addEventListener('click',reset);
 const offView=runtime.subscribe(paint),offLanguage=subscribeLanguage(()=>{if(disposed)return;translateUi(section);paint(runtime.state(),'language');if(message)showMessage(message);});translateUi(section);
 const dispose=()=>{if(disposed)return;disposed=true;toggle.removeEventListener('change',enabled);for(const item of handlers){item.input.removeEventListener('input',item.preview);item.input.removeEventListener('change',item.save);}section.querySelector('[data-glass-reset]').removeEventListener('click',reset);offLanguage();offView();runtime.cancel(owner);stopInterface();section.remove();if(mounts.get(host)===dispose)mounts.delete(host);};
 mounts.set(host,dispose);return dispose;
}
