import assert from 'node:assert/strict';
import{UI_LANGUAGES}from '../dist/js/interface-languages.js';
import{createInterfacePluralRules}from '../dist/js/interface-plurals.js';
import{UI_CATALOGUES}from '../dist/js/i18n-catalogues.js';
const ru=UI_CATALOGUES.ru;
const keys=Object.keys(ru).sort(),forms=value=>typeof value==='string'?[value]:Object.values(value);
const placeholders=value=>new Set(forms(value).flatMap(text=>[...text.matchAll(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g)].map(match=>match[1])));
for(const info of UI_LANGUAGES){
 const catalogue=UI_CATALOGUES[info.code];assert.deepEqual(Object.keys(catalogue).sort(),keys,info.code+' must cover every explicit UI key');
 const categories=createInterfacePluralRules(info.code).resolvedOptions().pluralCategories;
 for(const key of keys){
  const source=ru[key],entry=catalogue[key];assert.equal(typeof entry,typeof source,info.code+': '+key);
  if(typeof entry!=='string')for(const category of categories)assert.equal(typeof entry[category],'string',info.code+': '+key+'/'+category);
  const allowed=placeholders(source);
  for(const[category,text]of typeof entry==='string'?[['string',entry]]:Object.entries(entry)){
   assert.ok(typeof text==='string'&&text.trim(),info.code+': '+key+' has an empty entry');assert.doesNotMatch(text,/[<>]/,info.code+': '+key+' UI catalogues contain text only');
   const actual=placeholders(text);for(const name of actual)assert.ok(allowed.has(name),info.code+': '+key+' introduces an unknown placeholder '+name);
   for(const name of allowed)if(!(name==='count'&&['zero','one','two'].includes(category)))assert.ok(actual.has(name),info.code+': '+key+' loses '+name);
  }
 }
}
console.log('PASS: all eight interface catalogues have the complete shared key set, valid plural categories, text-only entries and preserved parameters, with natural implicit-count forms.');
