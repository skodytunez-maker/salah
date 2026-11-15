import{UI_LANGUAGES,resolveInterfaceLanguage}from './interface-languages.js';
import{t,getLanguage,getDirection,setInterfaceLanguage,subscribeLanguage,translateUi}from './i18n.js';
import{settings,read,updateSettings}from './storage.js';
import{esc,toast}from './ui.js';
const mountedDocuments=new WeakMap();
const preference=()=>{const value=read('settings',settings)?.uiLanguage;return value==='auto'||UI_LANGUAGES.some(item=>item.code===value)?value:'ru';};
export function initializeInterfaceLanguage({doc=document,win=window}={}){
 if(mountedDocuments.has(doc))return mountedDocuments.get(doc);
 let disposed=false;
 const paint=()=>{if(disposed)return;doc.documentElement.lang=getLanguage();doc.documentElement.dir=getDirection();translateUi(doc);};
 const sync=()=>{if(disposed)return;setInterfaceLanguage(resolveInterfaceLanguage(preference(),win.navigator.languages||[win.navigator.language]));paint();};
 const off=subscribeLanguage(()=>{paint();win.dispatchEvent(new win.CustomEvent('salah:interface-language-changed',{detail:{language:getLanguage()}}));});
 const storage=event=>{if(event.key===null||event.key==='salah:settings')sync();};
 win.addEventListener('storage',storage);win.addEventListener('salah:settings-changed',sync);win.addEventListener('languagechange',sync);sync();
 const dispose=()=>{if(disposed)return;disposed=true;off();win.removeEventListener('storage',storage);win.removeEventListener('salah:settings-changed',sync);win.removeEventListener('languagechange',sync);mountedDocuments.delete(doc);};
 mountedDocuments.set(doc,dispose);return dispose;
}
export function languageSettingsMarkup(){return '<label class="interface-language-setting"><span data-i18n="language.interface">'+esc(t('language.interface'))+'</span><select data-interface-language aria-label="'+esc(t('language.interface'))+'" data-i18n-aria-label="language.interface"><option value="auto" data-i18n="language.system">'+esc(t('language.system'))+'</option>'+UI_LANGUAGES.map(item=>'<option value="'+item.code+'" lang="'+item.code+'" dir="'+item.direction+'">'+esc(item.name)+'</option>').join('')+'</select></label>';}
export function mountLanguageSettings(host){
 const select=host.querySelector('[data-interface-language]');if(!select)return()=>{};
 let disposed=false;const paint=()=>{if(disposed)return;select.value=preference();translateUi(host);};
 const change=()=>{const selected=select.value;if(selected!=='auto'&&!UI_LANGUAGES.some(item=>item.code===selected)){paint();return;}
  const saved=updateSettings({uiLanguage:selected});paint();toast(t(saved?'language.saved':'language.saveFailed'));
 };
 select.addEventListener('change',change);const off=subscribeLanguage(paint);paint();
 return()=>{if(disposed)return;disposed=true;select.removeEventListener('change',change);off();};
}
