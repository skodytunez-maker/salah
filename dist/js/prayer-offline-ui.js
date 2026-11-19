import{prayerOfflineDownload}from './prayer-offline.js';
import{offlineAutoPolicy}from './offline-auto-policy.js';
import{t,getLocale,subscribeLanguage,translateUi}from './i18n.js';
import{esc,uiLeaf,uiMessage,setUiMessage}from './ui.js';
let detachPrayerOffline=null;
const prayerOfflineDate=day=>new Intl.DateTimeFormat(getLocale(),{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(day+'T12:00:00Z'));
export function mountPrayerOffline(root,{onChange=()=>{},create=()=>prayerOfflineDownload}={}){
 detachPrayerOffline?.();detachPrayerOffline=null;if(!root)return()=>{};
 const doc=root.ownerDocument,win=doc.defaultView||window;
 root.className='cache-storage-settings';
 root.innerHTML='<h3>'+uiLeaf('prayerOfflineUi.title')+'</h3><p data-prayer-offline-city translate="no" dir="auto"></p><p class="muted" data-prayer-offline-zone translate="no"></p><p class="muted" data-prayer-offline-note></p><p class="muted" data-prayer-offline-coverage></p><div data-prayer-offline-ranges></div><progress data-prayer-offline-progress max="12" value="0" hidden></progress><p class="muted" role="status" aria-live="polite" data-prayer-offline-status></p><div class="button-row"><button type="button" class="button secondary" data-prayer-offline-save></button><button type="button" class="button secondary" data-prayer-offline-cancel hidden>'+uiLeaf('prayerOfflineUi.cancel')+'</button></div><button type="button" class="text-button" data-prayer-offline-remove hidden>'+uiLeaf('prayerOfflineUi.remove')+'</button>';
 const find=name=>root.querySelector('[data-prayer-offline-'+name+']'),save=find('save'),cancel=find('cancel'),remove=find('remove'),status=find('status'),coverage=find('coverage'),ranges=find('ranges'),note=find('note'),progress=find('progress');
 const control=create({onChange});let disposed=false,observer=null;
 function paint(state=control.getState()){
  if(disposed)return;if(!root.isConnected){cleanup();return}
  const {context,coverage:data,running,reason}=state,numbers=new Intl.NumberFormat(getLocale()),params={ready:numbers.format(data.ready),total:numbers.format(data.total)};
  find('city').textContent=context?.city?.name||'';find('zone').textContent=context?.city?.timezone||'';
  setUiMessage(note,uiMessage(context?.tyumen?'prayerOfflineUi.tyumenNote':'prayerOfflineUi.note'));
  setUiMessage(coverage,uiMessage(context?.city?'prayerOfflineUi.coverage':'prayerOfflineUi.chooseCity',params));coverage.hidden=!context?.city;
  ranges.innerHTML=data.ranges.map(range=>'<p class="muted" data-i18n="prayerOfflineUi.range" data-i18n-params="'+esc(JSON.stringify({from:prayerOfflineDate(range.from),until:prayerOfflineDate(range.until)}))+'">'+esc(t('prayerOfflineUi.range',{from:prayerOfflineDate(range.from),until:prayerOfflineDate(range.until)}))+'</p>').join('');
  const key=running?'saving':({published:'tyumenPartial',changed:'changed',cancelled:'cancelled',removed:'removed',offline:'offline',storageFailed:'storageFailed',failed:'failed',chooseCity:'chooseCity',complete:'complete',partial:'partial'}[reason]||(!context?.city?'chooseCity':data.ready===data.total&&data.total?'complete':data.days>0?'partial':'empty'));
  setUiMessage(status,uiMessage('prayerOfflineUi.'+key,{done:numbers.format(state.done),total:numbers.format(data.total)}));
  setUiMessage(save,uiMessage(context?.tyumen?'prayerOfflineUi.savePublished':data.ready>0&&data.ready<data.total?'prayerOfflineUi.resume':'prayerOfflineUi.save'));
  save.disabled=running||!context?.city;cancel.hidden=!running;remove.hidden=!data.hasSaved;remove.disabled=running;progress.hidden=!running;progress.value=state.done;progress.max=data.total||12;
  progress.setAttribute('aria-label',t('prayerOfflineUi.saving',{done:numbers.format(state.done),total:numbers.format(data.total)}));
  root.toggleAttribute('data-prayer-offline-busy',running);translateUi(root);
 }
 save.onclick=()=>void control.save();cancel.onclick=()=>{offlineAutoPolicy.set(false);control.cancel();};remove.onclick=()=>{offlineAutoPolicy.set(false);control.clear();};
 let wasRunning=control.getState().running;const unsubscribe=control.subscribe(state=>{paint(state);if(control===prayerOfflineDownload&&wasRunning&&!state.running)onChange();wasRunning=state.running;}),offLanguage=subscribeLanguage(()=>paint()),settingsChanged=()=>control.refresh(),route=()=>{if(!root.isConnected)cleanup()},storageChanged=event=>{if(event.key===null||event.key==='salah:settings'||event.key?.startsWith('salah:prayer-cache:'))control.refresh()};
 function cleanup(){if(disposed)return;disposed=true;observer?.disconnect();unsubscribe();offLanguage();if(control===prayerOfflineDownload)control.cancel();else control.stop();win.removeEventListener('salah:settings-changed',settingsChanged);win.removeEventListener('online',settingsChanged);win.removeEventListener('offline',settingsChanged);win.removeEventListener('storage',storageChanged);win.removeEventListener('hashchange',route);if(detachPrayerOffline===cleanup)detachPrayerOffline=null}
 win.addEventListener('salah:settings-changed',settingsChanged);win.addEventListener('online',settingsChanged);win.addEventListener('offline',settingsChanged);win.addEventListener('storage',storageChanged);win.addEventListener('hashchange',route);
 const Observer=win.MutationObserver||globalThis.MutationObserver;if(Observer&&doc.body){observer=new Observer(route);observer.observe(doc.body,{childList:true,subtree:true})}
 detachPrayerOffline=cleanup;paint();return cleanup;
}
