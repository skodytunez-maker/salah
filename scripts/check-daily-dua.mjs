import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Script,createContext} from 'node:vm';
import {validateDuaCatalogue,safeDuaSource,cleanDuaFavorites,filterDuas,duaRoute} from '../dist/js/daily-dua-core.js';

const catalogue=validateDuaCatalogue(JSON.parse(await readFile(new URL('../dist/data/daily-dua.json',import.meta.url),'utf8')));
assert.equal(catalogue.items.length,21);
assert.equal(catalogue.categories.length,7);
assert.deepEqual(filterDuas(catalogue,{query:'перед близостью'}).map(i=>i.id),['before-intimacy']);
assert.deepEqual(filterDuas(catalogue,{query:'перед едой'}).map(i=>i.id),['before-meal','forgot-before-meal']);
assert.equal(filterDuas(catalogue,{category:'food'}).length,3);
assert.deepEqual(filterDuas(catalogue,{favoritesOnly:true},['after-wudu']).map(i=>i.id),['after-wudu']);
assert.deepEqual(cleanDuaFavorites(['after-wudu','missing','after-wudu',{},'before-intimacy'],catalogue),['after-wudu','before-intimacy']);
assert.deepEqual(cleanDuaFavorites({bad:true},catalogue),[]);
assert.deepEqual(duaRoute('#adhkar?view=duas&category=constructor&item=missing',catalogue),{category:'',query:'',favoritesOnly:false,item:null});
for(const url of ['javascript:alert(1)','https://sunnah.com.evil.invalid/a','https://user:pass@sunnah.com/bukhari:141','http://sunnah.com/bukhari:141'])assert.equal(safeDuaSource(url),null);
for(const mutate of [data=>data.items.push(data.items[0]),data=>data.items[0].category='missing',data=>data.items[0].source.url='javascript:alert(1)',data=>data.items[0].target=1]){const invalid=structuredClone(catalogue);mutate(invalid);assert.throws(()=>validateDuaCatalogue(invalid))}
for(const item of catalogue.items){assert.match(item.arabic,/[\u0621-\u064a]/);assert.match(item.transliteration,/[А-Яа-я]/);assert.doesNotMatch(item.transliteration,/\b[Вв]а\b/);assert.equal(item.transliteration.at(-1),'.');assert.equal('target' in item,false)}
assert.match(catalogue.items.find(i=>i.id==='before-intimacy').transliteration,/разақтанаа/);
assert.match(catalogue.items.find(i=>i.id==='leaving-home').transliteration,/тауаккальту/);

// Reuse the small browser-primitives fixture from the existing resume check.
// The handlers exercised below are the production daily-dua module itself.
const fixture=await readFile(new URL('./check-adhkar-resume.mjs',import.meta.url),'utf8');
const helpers=fixture.slice(fixture.indexOf('const decode='),fixture.indexOf('function browser('));
const {Storage,Element}=new Script(helpers+'\n;({Storage,Element});').runInNewContext();
const source=await readFile(new URL('../dist/js/daily-dua.js',import.meta.url),'utf8');
const executable=source.replace(/^import[^\n]*\n/gm,'').replace(/\bexport (?=(?:async )?function)/g,'')+'\n;({showDailyDuas,stopDailyDuas});';
function browser(hash='#adhkar?view=duas',storage=new Storage(),fetchImpl=async()=>({ok:true,json:async()=>structuredClone(catalogue)})){
 const host=new Element(),location={hash},body=new Element('body'),notices=[];
 const context=createContext({document:{body},location,URL,URLSearchParams,AbortController,setTimeout,clearTimeout,console,
  window:{history:{state:null,replaceState(_state,_title,url){location.hash=url}},scrollTo(){}},
  read:(key,fallback)=>{try{const value=storage.getItem('salah:'+key);return value===null?fallback:JSON.parse(value)}catch{return fallback}},
  write:(key,value)=>{storage.setItem('salah:'+key,JSON.stringify(value));return true},
  esc:value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),toast:value=>notices.push(value),
  validateDuaCatalogue,safeDuaSource,cleanDuaFavorites,filterDuas,duaRoute,fetch:fetchImpl
 });
 const module=new Script(executable).runInContext(context);
 return {host,location,storage,notices,module,open:()=>module.showDailyDuas(host),select:selector=>{const el=host.querySelector(selector);assert.ok(el,selector);return el}};
}
let page=browser();await page.open();assert.equal(page.host.querySelectorAll('[data-dua-open]').length,21);
const search=page.select('#dua-search');search.value='близостью';search.oninput({target:search});assert.equal(page.host.querySelectorAll('[data-dua-open]').length,1);
await page.select('[data-dua-favorite="before-intimacy"]').click();assert.deepEqual(JSON.parse(page.storage.getItem('salah:daily-dua-favorites')),['before-intimacy']);
await page.select('[data-dua-open="before-intimacy"]').click();assert.match(page.location.hash,/item=before-intimacy/);assert.match(page.host.textContent,/разақтанаа/);assert.equal(page.host.querySelector('#adhkar-count'),null);
assert.equal(page.select('#dua-prev').disabled,true);assert.equal(page.select('#dua-next').disabled,true);
await page.select('#dua-list').click();assert.equal(page.host.querySelectorAll('[data-dua-open]').length,1,'Reader back preserves search');
page=browser('#adhkar?view=duas&category=family&item=before-intimacy',page.storage);await page.open();assert.match(page.host.textContent,/Перед супружеской близостью/);
await page.select('#dua-next').click();assert.match(page.location.hash,/item=for-parents/);
await page.select('#dua-prev').click();assert.match(page.location.hash,/item=before-intimacy/);
await page.select('#dua-list').click();await page.select('#dua-favorites-only').click();assert.equal(page.host.querySelectorAll('[data-dua-open]').length,1);
await page.select('[data-dua-favorite="before-intimacy"]').click();assert.equal(page.host.querySelectorAll('[data-dua-open]').length,0);
assert.equal(page.storage.getItem('salah:adhkar-progress-v2'),null,'Everyday reading never creates or resets prayer counters');
const translated=page.host.innerHTML;page.module.stopDailyDuas();assert.equal(page.host.innerHTML,translated);
let release;const gate=new Promise(resolve=>release=resolve);
page=browser('#adhkar?view=duas',new Storage(),async()=>{await gate;return {ok:true,json:async()=>structuredClone(catalogue)}});
const pending=page.open();page.module.stopDailyDuas();page.host.innerHTML='<p>Другой раздел</p>';release();await pending;assert.equal(page.host.textContent,'Другой раздел','A late load cannot overwrite a newer screen');
page=browser('#adhkar?view=duas',new Storage(),async()=>{throw Error('offline')});await page.open();assert.ok(page.host.querySelector('#dua-retry'));assert.ok(page.host.querySelector('#dua-back'));
console.log('PASS: 21 sourced duas, categories/search/favorites, source safety, no counters, exact reader restoration, navigation and cancelled-load/retry behavior.');
