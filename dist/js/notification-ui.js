import{t}from './i18n.js';
import{esc,uiMessage,uiLeaf,uiAttribute,uiTextAttributes}from './ui.js';
// Explicit notification UI descriptors. A server error or user-supplied title
// stays plain text and is never searched for a matching translation.
export const notice=(key,params={})=>uiMessage('notifyUi.'+key,params);
export const noticeText=value=>value&&typeof value==='object'&&typeof value.key==='string'?t(value.key,value.params||{}):String(value??'');
export const noticeMarkup=value=>value&&typeof value==='object'&&typeof value.key==='string'?uiLeaf(value.key,value.params||{}):esc(value);
export const noticeLeaf=(key,params={})=>uiLeaf('notifyUi.'+key,params);
export const noticeAttr=(key,params={},attribute='aria-label')=>uiAttribute('notifyUi.'+key,params,attribute);
export const noticeAttrs=(key,params={})=>uiTextAttributes('notifyUi.'+key,params);
export function noticeError(key,params={}){const value=notice(key,params),error=Error(noticeText(value));error.notice=value;return error;}
export const noticeErrorValue=(error,fallback='connectFailed')=>error?.notice||error?.message||notice(fallback);
