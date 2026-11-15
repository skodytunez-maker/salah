import{t}from './i18n.js';
import{esc,uiLeaf,uiAttribute,uiMessage}from './ui.js';
export const teamLeaf=(key,params={})=>uiLeaf('teamUi.'+key,params);
export const teamAttr=(key,params={},attribute='aria-label')=>uiAttribute('teamUi.'+key,params,attribute);
export const teamMessage=(key,params={})=>uiMessage('teamUi.'+key,params);
export const teamMarkup=value=>value&&typeof value==='object'&&typeof value.key==='string'?uiLeaf(value.key,value.params||{}):esc(value);
export const teamText=value=>value&&typeof value==='object'&&typeof value.key==='string'?t(value.key,value.params||{}):String(value??'');
