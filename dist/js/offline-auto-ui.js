import{offlineAutoPolicy}from './offline-auto-policy.js';
import{t,subscribeLanguage,translateUi}from './i18n.js';
import{uiLeaf}from './ui.js';
let detach=null;
export function mountOfflineAutoSetting(root,{policy=offlineAutoPolicy}={}){
 detach?.();detach=null;if(!root)return()=>{};
 root.className='cache-storage-settings';root.innerHTML='<h3>'+uiLeaf('offlineAutoUi.title')+'</h3><label class="switch-row"><span>'+uiLeaf('offlineAutoUi.enable')+'</span><input type="checkbox" data-offline-auto></label><p class="muted">'+uiLeaf('offlineAutoUi.note')+'</p><p class="muted" data-offline-auto-status role="status" aria-live="polite"></p>';
 const input=root.querySelector('[data-offline-auto]'),status=root.querySelector('[data-offline-auto-status]');let failed=false,disposed=false;
 const paint=()=>{if(disposed)return;input.checked=policy.enabled();const key=failed?'offlineAutoUi.saveFailed':input.checked?'offlineAutoUi.on':'offlineAutoUi.off';status.dataset.i18n=key;status.textContent=t(key);translateUi(root);};
 input.onchange=()=>{failed=!policy.set(input.checked);paint();};
 const offPolicy=policy.subscribe(paint),offLanguage=subscribeLanguage(paint),route=()=>{if(!root.isConnected)cleanup();};
 const cleanup=()=>{if(disposed)return;disposed=true;offPolicy();offLanguage();window.removeEventListener('hashchange',route);input.onchange=null;if(detach===cleanup)detach=null;};
 window.addEventListener('hashchange',route);detach=cleanup;paint();return cleanup;
}
