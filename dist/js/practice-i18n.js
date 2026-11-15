import{t,getLocale,translateUi,subscribeLanguage}from './i18n.js';
import{esc,modal}from './ui.js';

// Explicit UI bindings only. Religious passages and user text never enter this map.
const validKey=key=>typeof key==='string'&&/^[a-z][a-zA-Z0-9]*(?:\.[a-zA-Z][a-zA-Z0-9]*)+$/.test(key);
export function uiMessage(key,fallback,parameters={}){const value=t(key,parameters);return value===key?String(fallback).replace(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g,(match,name)=>Object.hasOwn(parameters,name)?String(parameters[name]):match):value;}
export function uiAttrs(key,parameters={}){if(!validKey(key))throw Error('invalid_practice_ui_key');return ' data-i18n="'+esc(key)+'" data-i18n-params="'+esc(JSON.stringify(parameters))+'"';}
export function uiAttributeAttrs(attribute,key,parameters={}){if(!['aria-label','title','placeholder'].includes(attribute)||!validKey(key))throw Error('invalid_practice_ui_attribute');return' data-i18n-'+attribute+'="'+esc(key)+'" data-i18n-params="'+esc(JSON.stringify(parameters))+'"';}
export function uiLeaf(key,fallback,parameters={}){return'<span'+uiAttrs(key,parameters)+'>'+esc(uiMessage(key,fallback,parameters))+'</span>';}
export function uiSet(node,key,fallback,parameters={}){if(!node)return;node.removeAttribute('data-practice-number');const encoded=JSON.stringify(parameters),text=uiMessage(key,fallback,parameters);if(node.getAttribute('data-i18n')!==key)node.setAttribute('data-i18n',key);if(node.getAttribute('data-i18n-params')!==encoded)node.setAttribute('data-i18n-params',encoded);if(node.textContent!==text)node.textContent=text;}
export function uiAttribute(node,attribute,key,fallback,parameters={}){if(!node)return;if(!['aria-label','title','placeholder'].includes(attribute))throw Error('unsupported_ui_attribute');node.setAttribute('data-i18n-'+attribute,key);node.setAttribute('data-i18n-params',JSON.stringify(parameters));node.setAttribute(attribute,uiMessage(key,fallback,parameters));}
export function uiRaw(node,value){if(!node)return;node.removeAttribute('data-i18n');node.removeAttribute('data-i18n-params');node.removeAttribute('data-practice-number');if(node.textContent!==value)node.textContent=value;}
export function uiSource(node,value,sources){const key=Object.hasOwn(sources,value)?sources[value]:null;if(key)uiSet(node,key,value);else uiRaw(node,value);}
export function uiSourceLeaf(value,sources){const key=Object.hasOwn(sources,value)?sources[value]:null;return key?uiLeaf(key,value):esc(value);}
export function uiSourceMessage(value,sources){const key=Object.hasOwn(sources,value)?sources[value]:null;return key?uiMessage(key,value):value;}
export function uiParts(node,parts){if(!node)return;node.removeAttribute('data-i18n');node.removeAttribute('data-i18n-params');node.removeAttribute('data-practice-number');const doc=node.ownerDocument;node.replaceChildren(...parts.filter(part=>part!==null&&part!==undefined).map(part=>{if(typeof part!=='object')return doc.createTextNode(String(part));const leaf=doc.createElement('span');uiSet(leaf,part.key,part.fallback,part.parameters||{});return leaf;}));}
export function uiNumber(value,options={}){return Number.isFinite(value)?value.toLocaleString(getLocale(),options):'—';}
export function uiNumberAttrs(value){if(!Number.isFinite(value))throw Error('invalid_ui_number');return' data-practice-number="'+esc(String(value))+'" dir="ltr"';}
export function uiNumberLeaf(value){return'<span'+uiNumberAttrs(value)+'>'+esc(uiNumber(value))+'</span>';}
export function uiNumberSet(node,value){if(!node)return;uiRaw(node,uiNumber(value));if(Number.isFinite(value))node.setAttribute('data-practice-number',String(value));}
export function translatePracticeNumbers(root){const nodes=[...(root?.matches?.('[data-practice-number]')?[root]:[]),...(root?.querySelectorAll?.('[data-practice-number]')||[])];for(const node of nodes){const value=Number(node.getAttribute('data-practice-number'));if(Number.isFinite(value))node.textContent=uiNumber(value);}}
export function uiHtml(html,doc=globalThis.document){if(!doc)return html;const template=doc.createElement('template');template.innerHTML=html;translateUi(template.content);translatePracticeNumbers(template.content);return template.innerHTML;}
const modalBindings=new WeakMap();
export function uiModal(html){modal(uiHtml(html));const dialog=globalThis.document?.getElementById('modal');if(!dialog)return;modalBindings.get(dialog)?.();const off=watchPracticeUi(dialog),dispose=()=>{off();dialog.removeEventListener('close',dispose);modalBindings.delete(dialog);};modalBindings.set(dialog,dispose);dialog.addEventListener('close',dispose,{once:true});}
export function watchPracticeUi(host,afterTranslate=()=>{}){let off=null;const refresh=()=>{if(!host?.isConnected){off?.();return;}translateUi(host);translatePracticeNumbers(host);afterTranslate();};refresh();off=subscribeLanguage(refresh);return off;}
