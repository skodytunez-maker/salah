import{t,translateUi,subscribeLanguage}from './i18n.js';
const languageBindings=new WeakMap();
// A screen owns its explicit UI leaves. Replacing/removing it releases this
// listener; changing the locale never remounts a form or runs screen logic.
export function bindUiLanguage(root,repaint=()=>translateUi(root)){
 if(!root)return()=>{};languageBindings.get(root)?.();
 let observer=null,stopped=false;const dialog=root.closest?.('dialog'),stopLanguage=subscribeLanguage(()=>{if(!root.isConnected){dispose();return;}repaint();});
 function dispose(){if(stopped)return;stopped=true;stopLanguage();observer?.disconnect();dialog?.removeEventListener('close',dispose);if(languageBindings.get(root)===dispose)languageBindings.delete(root);}
 dialog?.addEventListener('close',dispose,{once:true});
 const Observer=root.ownerDocument?.defaultView?.MutationObserver||globalThis.MutationObserver;
 if(Observer&&root.ownerDocument?.body){observer=new Observer(()=>{if(!root.isConnected)dispose();});observer.observe(root.ownerDocument.body,{childList:true,subtree:true});}
 languageBindings.set(root,dispose);repaint();return dispose;
}
export function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
// Explicit messages carry only their own UI key and parameters. Plain user text
// is never searched for a matching translation or treated as a catalogue key.
export const uiMessage=(key,params={})=>({key,params:{...params}});
export const uiError=(key,params={})=>Object.assign(Error(t(key,params)),{uiMessage:uiMessage(key,params)});
export function setUiMessage(node,value){if(!node)return;if(value&&typeof value==='object'&&typeof value.key==='string'){node.setAttribute('data-i18n',value.key);node.setAttribute('data-i18n-params',JSON.stringify(value.params||{}));node.textContent=t(value.key,value.params||{});}else{node.removeAttribute('data-i18n');node.removeAttribute('data-i18n-params');node.textContent=String(value??'');}}
export const uiTextAttributes=(key,params={})=>'data-i18n="'+esc(key)+'" data-i18n-params="'+esc(JSON.stringify(params))+'"';
export const uiLeaf=(key,params={})=>'<span '+uiTextAttributes(key,params)+'>'+esc(t(key,params))+'</span>';
export const uiAttribute=(key,params={},name='aria-label')=>'data-i18n-'+name+'="'+esc(key)+'" data-i18n-params="'+esc(JSON.stringify(params))+'" '+name+'="'+esc(t(key,params))+'"';
export function setUiAttribute(node,name,key,params={}){if(!node)return;node.setAttribute('data-i18n-'+name,key);node.setAttribute('data-i18n-params',JSON.stringify(params));node.setAttribute(name,t(key,params));}
export function toast(text){const el=document.getElementById('toast');setUiMessage(el,text);el.hidden=false;clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>el.hidden=true,4000)}
export function modal(content){const el=document.getElementById('modal');document.getElementById('modal-content').innerHTML=content;for(const button of el.querySelectorAll('[data-close]'))if(button.textContent.trim()==='×'){const key=button.getAttribute('data-i18n-aria-label')||button.getAttribute('data-i18n')||'common.close';button.removeAttribute('data-i18n');button.setAttribute('data-i18n-aria-label',key);}translateUi(el);if(!el.open)el.showModal();el.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>el.close()))}
export function closeModal(){document.getElementById('modal').close()}
export function title(text,sub=''){return '<div class="page-head"><div><h1>'+esc(text)+'</h1><p class="muted">'+esc(sub)+'</p></div></div>'}
