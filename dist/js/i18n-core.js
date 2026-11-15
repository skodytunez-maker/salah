import{languageInfo,UI_LANGUAGE_CODES}from './interface-languages.js';
import{createInterfacePluralRules}from './interface-plurals.js';
const CATEGORIES=new Set(['zero','one','two','few','many','other']);
const has=(value,key)=>Object.hasOwn(value,key);
const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
function copyMessage(value){
 if(typeof value==='string')return value;
 if(!record(value)||!has(value,'other')||Object.keys(value).some(key=>!CATEGORIES.has(key)||typeof value[key]!=='string'))throw Error('invalid_message');
 return Object.freeze({...value});
}
export function createTranslator(catalogues,{language='ru',fallback='ru'}={}){
 if(!record(catalogues)||!has(catalogues,fallback))throw Error('missing_fallback_catalogue');
 const messages=new Map(),rules=new Map(),listeners=new Set();
 for(const[code,catalogue]of Object.entries(catalogues)){
  if(!UI_LANGUAGE_CODES.includes(code)||!record(catalogue))throw Error('invalid_catalogue');
  const entries=new Map();for(const[key,value]of Object.entries(catalogue)){
   if(!/^[a-z][a-zA-Z0-9]*(?:[.][a-zA-Z][a-zA-Z0-9]*)+$/.test(key))throw Error('invalid_message_key');
   entries.set(key,copyMessage(value));
  }messages.set(code,entries);
 }
 let active=messages.has(language)?language:fallback;
 function resolve(key){for(const code of [active,fallback]){const catalogue=messages.get(code);if(catalogue?.has(key))return{code,value:catalogue.get(key)};}return null;}
 function t(key,parameters={}){
  const selected=resolve(key);if(!selected)return key;
  let template=selected.value;
  if(typeof template!=='string'){
   const count=parameters?.count;if(typeof count!=='number'||!Number.isFinite(count))throw Error('plural_count_required');
   if(!rules.has(selected.code))rules.set(selected.code,createInterfacePluralRules(selected.code));
   template=template[rules.get(selected.code).select(count)]??template.other;
  }
  return template.replace(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g,(match,key)=>record(parameters)&&has(parameters,key)?String(parameters[key]):match);
 }
 return{
  t,has:key=>resolve(key)!==null,getLanguage:()=>active,getLocale:()=>languageInfo(active).locale,getDirection:()=>languageInfo(active).direction,
  setLanguage(code){const next=messages.has(code)?code:fallback;if(next===active)return false;active=next;for(const listener of [...listeners])listener(active);return true;},
  subscribe(listener){if(typeof listener!=='function')throw Error('invalid_language_listener');listeners.add(listener);return()=>listeners.delete(listener);}
 };
}
// Only explicit SALAH UI leaves/attributes are translated. User text is never scanned.
export function translateUiElements(root,translator){
 if(!root)return;
 const attributes=[['data-i18n-aria-label','aria-label'],['data-i18n-title','title'],['data-i18n-placeholder','placeholder']];
 const selector='[data-i18n],'+attributes.map(([name])=>'['+name+']').join(',');
 const nodes=[...(root.matches?.(selector)?[root]:[]),...(root.querySelectorAll?.(selector)||[])];
 for(const node of nodes){
  const key=node.getAttribute('data-i18n');if(key&&translator.has(key))node.textContent=translator.t(key);
  for(const[source,target]of attributes){const name=node.getAttribute(source);if(name&&translator.has(name))node.setAttribute(target,translator.t(name));}
 }
}
