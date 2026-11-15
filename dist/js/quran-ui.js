// Only explicitly tagged Quran interface leaves are translated. Scripture,
// edition values, reader names and connected controls are never scanned or rebuilt.
import{t,subscribeLanguage}from './i18n.js';
import{esc,modal as showModal}from './ui.js';
const encoded=params=>esc(JSON.stringify(params||{}));
const parameters=(node,suffix='')=>{try{const value=JSON.parse(node.getAttribute('data-quran-ui'+suffix+'-params')||'{}');return value&&typeof value==='object'&&!Array.isArray(value)?value:{};}catch{return {};}};
export const uiTextAttributes=(key,params={})=>'data-quran-ui-key="'+esc(key)+'" data-quran-ui-params="'+encoded(params)+'"';
export const uiLeaf=(key,params={})=>'<span '+uiTextAttributes(key,params)+'>'+esc(t(key,params))+'</span>';
export const uiAttribute=(key,params={},attribute='aria-label')=>{if(!['aria-label','title','placeholder'].includes(attribute))throw Error('invalid_ui_attribute');return 'data-quran-ui-'+attribute+'="'+esc(key)+'" data-quran-ui-'+attribute+'-params="'+encoded(params)+'" '+attribute+'="'+esc(t(key,params))+'"';};
export function setUiLabel(node,key,params={}){if(!node)return;node.setAttribute('data-quran-ui-key',key);node.setAttribute('data-quran-ui-params',JSON.stringify(params));node.textContent=t(key,params);}
export function setUiAttribute(node,attribute,key,params={}){if(!node)return;if(!['aria-label','title','placeholder'].includes(attribute))throw Error('invalid_ui_attribute');node.setAttribute('data-quran-ui-'+attribute,key);node.setAttribute('data-quran-ui-'+attribute+'-params',JSON.stringify(params));node.setAttribute(attribute,t(key,params));}
export function clearUiLabel(node,text=''){if(!node)return;node.removeAttribute('data-quran-ui-key');node.removeAttribute('data-quran-ui-params');node.textContent=text;}
export function translateQuranUi(root){
 const selector='[data-quran-ui-key],[data-quran-ui-aria-label],[data-quran-ui-title],[data-quran-ui-placeholder]';
 for(const node of [...(root?.matches?.(selector)?[root]:[]),...(root?.querySelectorAll?.(selector)||[])]){
  const params=parameters(node),key=node.getAttribute('data-quran-ui-key');if(key)node.textContent=t(key,params);
  for(const attribute of ['aria-label','title','placeholder']){const key=node.getAttribute('data-quran-ui-'+attribute);if(key)node.setAttribute(attribute,t(key,parameters(node,'-'+attribute)));}
 }
}
export function bindQuranUi(root,paint=()=>{}){const draw=()=>{translateQuranUi(root);paint();};draw();return subscribeLanguage(draw);}
export function translateReciterGroups(select){const names={'Избранные чтецы':'favorites','Другие чтецы':'other','Имамы Мекки':'makkah','Имамы Медины':'madinah'};for(const group of select?.querySelectorAll('optgroup')||[]){group.dataset.quranUiGroup||=names[group.label]||'';if(group.dataset.quranUiGroup)group.label=t('player.group.'+group.dataset.quranUiGroup);}}
export function downloadErrorKey(state){return state?.error==='Недостаточно места на устройстве'?'downloadUi.errorSpace':state?.error==='Аудиосервер долго не отвечает. Можно продолжить скачивание.'?'downloadUi.errorTimeout':'downloadUi.errorInterrupted';}
let stopModalLanguage=null;
export function quranModal(markup){
 stopModalLanguage?.();showModal(markup);const content=document.getElementById('modal-content'),dialog=content?.closest('dialog');if(!content||!dialog)return;
 const first=content.firstChild,off=bindQuranUi(content),observer=typeof MutationObserver==='function'?new MutationObserver(()=>{if(content.firstChild!==first)dispose();}):null;
 function dispose(){off();observer?.disconnect();dialog.removeEventListener('close',dispose);if(stopModalLanguage===dispose)stopModalLanguage=null;}
 observer?.observe(content,{childList:true});dialog.addEventListener('close',dispose,{once:true});stopModalLanguage=dispose;
}
