import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Script,createContext} from 'node:vm';
import {validateDuaCatalogue,safeDuaSource,cleanDuaFavorites,filterDuas,duaRoute,duaPassage} from '../dist/js/daily-dua-core.js';

const catalogue=validateDuaCatalogue(JSON.parse(await readFile(new URL('../dist/data/daily-dua.json',import.meta.url),'utf8')));
assert.equal(catalogue.items.length,32);
assert.equal(catalogue.categories.length,11);
assert.deepEqual(filterDuas(catalogue,{query:'перед близостью'}).map(i=>i.id),['before-intimacy']);
assert.deepEqual(filterDuas(catalogue,{query:'перед едой'}).map(i=>i.id),['before-meal','forgot-before-meal']);
assert.equal(filterDuas(catalogue,{category:'food'}).length,3);
assert.deepEqual(filterDuas(catalogue,{query:'кунут'}).map(i=>i.id),['dua-qunut']);
assert.deepEqual(filterDuas(catalogue,{query:'истихара'}).map(i=>i.id),['dua-istikhara']);
assert.equal(filterDuas(catalogue,{category:'prayer'}).length,4);
const qunut=catalogue.items.find(item=>item.id==='dua-qunut');
assert.deepEqual(qunut.variants.map(value=>value.id),['hasan','hanafi']);
assert.equal(duaPassage(qunut).transliteration,qunut.transliteration,'The existing wording remains the default');
assert.equal(duaPassage(qunut,'invalid').id,'hasan');
assert.deepEqual(filterDuas(catalogue,{query:'наста‘иинука'}).map(i=>i.id),['dua-qunut']);
for(const variant of qunut.variants){assert.match(variant.arabic,/[\u0621-\u064a]/);assert.match(variant.transliteration,/[А-Яа-я]/);assert.doesNotMatch(variant.transliteration,/\b[Вв]а\b/);assert.equal(variant.transliteration.at(-1),'.')}
for(const mutate of [data=>data.items.find(i=>i.id==='dua-qunut').variants.push(qunut.variants[0]),data=>data.items.find(i=>i.id==='dua-qunut').variants[1].source.url='https://islamqa.org/other/',data=>data.items.find(i=>i.id==='dua-qunut').variants[1].translation='',data=>data.items.find(i=>i.id==='dua-qunut').variants[1].target=1]){const invalid=structuredClone(catalogue);mutate(invalid);assert.throws(()=>validateDuaCatalogue(invalid))}
for(const url of ['https://islamqa.org.evil.invalid/hanafi/qibla-hanafi/42476/qunut-in-witr-prayer-5/','https://islamqa.org/hanafi/qibla-hanafi/42476/qunut-in-witr-prayer-5/?x=1'])assert.equal(safeDuaSource(url),null);
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
const adhkarSource=await readFile(new URL('../dist/js/adhkar.js',import.meta.url),'utf8');
const adhkarHistorySource=adhkarSource.slice(adhkarSource.indexOf("const adhkarParentKey="),adhkarSource.indexOf('function rememberView('));
function browser(hash='#adhkar?view=duas',storage=new Storage(),fetchImpl=async()=>({ok:true,json:async()=>structuredClone(catalogue)}),{trail=[],adhkarHistory=false}={}){
 const host=new Element(),body=new Element('body'),notices=[],events=new Map(),entries=[...trail.map(hash=>({hash,state:null})),{hash,state:null}];let at=entries.length-1,module;
 const location={get hash(){return entries[at].hash},set hash(hash){entries[at].hash=hash}};
 const win={addEventListener(type,fn){if(!events.has(type))events.set(type,[]);events.get(type).push(fn)},removeEventListener(type,fn){events.set(type,(events.get(type)||[]).filter(f=>f!==fn))},dispatchEvent(event){for(const fn of events.get(event.type)||[])fn(event)},scrollTo(){}};
 win.history={get state(){return entries[at].state},replaceState(state,_title,url){entries[at]={hash:url??location.hash,state}},pushState(state,_title,url){entries.splice(at+1);entries.push({hash:url,state});at++},back(){if(at){at--;win.dispatchEvent(new Event('popstate'));win.dispatchEvent(new Event('hashchange'))}},forward(){if(at<entries.length-1){at++;win.dispatchEvent(new Event('popstate'));win.dispatchEvent(new Event('hashchange'))}}};
 const context=createContext({document:{body},location,URL,URLSearchParams,AbortController,setTimeout,clearTimeout,console,Event,window:win,
  read:(key,fallback)=>{try{const value=storage.getItem('salah:'+key);return value===null?fallback:JSON.parse(value)}catch{return fallback}},
  write:(key,value)=>{storage.setItem('salah:'+key,JSON.stringify(value));return true},
  esc:value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),toast:value=>notices.push(value),
  validateDuaCatalogue,safeDuaSource,cleanDuaFavorites,filterDuas,duaRoute,duaPassage,fetch:fetchImpl
 });
 const ensure=new Script(adhkarHistorySource+';ensureAdhkarMenuHistory;').runInContext(context);
 module=new Script(executable).runInContext(context);
 const open=()=>{if(adhkarHistory)ensure();return module.showDailyDuas(host)};
 win.addEventListener('hashchange',()=>{if(location.hash.includes('view=duas'))open();else{module.stopDailyDuas();host.innerHTML='<h1>Азкары</h1>'}});
 return {host,location,storage,notices,module,window:win,open,nativeBack:()=>win.history.back(),nativeForward:()=>win.history.forward(),get entries(){return entries.map(e=>e.hash)},get at(){return at},select:selector=>{const el=host.querySelector(selector);assert.ok(el,selector);return el}};
}
let page=browser();await page.open();assert.equal(page.host.querySelectorAll('[data-dua-open]').length,catalogue.items.length);
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
console.log('PASS: 32 sourced duas, categories/search/favorites, source safety, no counters, exact reader restoration, navigation and cancelled-load/retry behavior.');

const savedProgress=JSON.stringify({version:2,totals:{tasbih:300},days:{'2026-10-06':{evening:{tasbih:50}}}});
const qunutStorage=new Storage();qunutStorage.setItem('salah:adhkar-progress-v2',savedProgress);
page=browser('#adhkar?view=duas&category=prayer&item=dua-qunut',qunutStorage);await page.open();
assert.equal(page.host.querySelectorAll('[data-dua-variant]').length,2);
const shell=page.select('.dua-reader'),passage=page.select('.dua-passage'),writes=page.host.writes;
await page.select('[data-dua-variant="hanafi"]').click();
assert.equal(page.host.writes,writes,'Changing wording does not rebuild the reader');assert.equal(page.select('.dua-reader'),shell);assert.equal(page.select('.dua-passage'),passage);
assert.equal(page.select('[data-dua-passage="arabic"]').textContent,qunut.variants[1].arabic);
assert.equal(page.select('[data-dua-passage="transliteration"]').textContent,qunut.variants[1].transliteration);
assert.equal(page.select('.dua-meaning p').textContent,qunut.variants[1].translation);
assert.equal(page.select('.dua-source a').href,qunut.variants[1].source.url);
assert.equal(page.select('[data-dua-variant="hanafi"]').attributes['aria-pressed'],'true');
assert.equal(page.select('[data-dua-variant="hasan"]').attributes['aria-pressed'],'false');
assert.match(page.location.hash,/variant=hanafi/);
const arabic=page.select('[data-dua-text="arabic"]');arabic.checked=true;arabic.onchange({target:arabic});
await page.select('[data-dua-variant="hasan"]').click();assert.equal(page.select('[data-dua-passage="arabic"]').hidden,false,'Text display preferences survive switching');
assert.equal(page.select('[data-dua-passage="transliteration"]').textContent,qunut.transliteration);
await page.select('[data-dua-variant="hanafi"]').click();
page=browser(page.location.hash,qunutStorage);await page.open();assert.equal(page.select('[data-dua-passage="transliteration"]').textContent,qunut.variants[1].transliteration,'Reload restores selected wording');
await page.select('[data-dua-favorite="dua-qunut"]').click();assert.deepEqual(JSON.parse(qunutStorage.getItem('salah:daily-dua-favorites')),['dua-qunut'],'Both wordings share one favorite');
await page.select('#dua-next').click();assert.match(page.location.hash,/item=dua-istikhara/);assert.doesNotMatch(page.location.hash,/variant=/);assert.equal(page.host.querySelector('.dua-variants'),null);
await page.select('#dua-prev').click();assert.equal(page.select('[data-dua-passage="transliteration"]').textContent,qunut.transliteration);
await page.select('#dua-list').click();assert.equal(page.host.querySelectorAll('[data-dua-open]').length,catalogue.items.filter(item=>item.category==='prayer').length);assert.doesNotMatch(page.location.hash,/variant=/);
assert.equal(qunutStorage.getItem('salah:adhkar-progress-v2'),savedProgress,'Changing Qunut never touches unfinished daily progress');
page=browser('#adhkar?view=duas&item=dua-qunut&variant=missing');await page.open();assert.equal(page.select('[data-dua-passage="transliteration"]').textContent,qunut.transliteration);
console.log('PASS: both Qunut wordings in one reader, live text/source updates, reload, preferences, favorites, navigation and preserved daily progress.');

// Native iPhone Back uses real history, without clicking a DOM Back button.
for(const item of ['dua-istikhara','dua-qunut','before-intimacy']){
 page=browser('#adhkar?view=duas&item='+item,qunutStorage,undefined,{trail:['#home'],adhkarHistory:true});await page.open();
 assert.deepEqual(page.entries,['#home','#adhkar','#adhkar?view=duas',page.location.hash],'A direct reader has both collection and dua-library parents');
 assert.equal(page.window.history.state.salahDuaParent,true);const depth=page.entries.length;
 await page.open();assert.equal(page.entries.length,depth,'Refreshing a reader does not duplicate history');
 if(item==='dua-qunut'){await page.select('[data-dua-variant="hanafi"]').click();assert.equal(page.entries.length,depth,'Wording changes stay in one reader entry')}
 page.nativeBack();assert.equal(page.location.hash,'#adhkar?view=duas');assert.equal(page.host.querySelectorAll('[data-dua-open]').length,catalogue.items.length,'Native swipe returns to the dua library');
 page.nativeForward();assert.match(page.location.hash,new RegExp('item='+item));assert.ok(page.host.querySelector('.dua-reader'));
 await page.select('#dua-list').click();assert.equal(page.location.hash,'#adhkar?view=duas','The edge-swipe button action uses the same library parent');
 page.nativeBack();assert.equal(page.location.hash,'#adhkar','Only the next Back returns to morning/evening collections');
 assert.equal(qunutStorage.getItem('salah:adhkar-progress-v2'),savedProgress);
}
page=browser('#adhkar?view=duas&category=prayer&q=кунут',new Storage(),undefined,{adhkarHistory:true});await page.open();
await page.select('[data-dua-open="dua-qunut"]').click();page.nativeBack();assert.equal(page.host.querySelectorAll('[data-dua-open]').length,1);assert.match(page.location.hash,/category=prayer/);assert.equal(page.select('#dua-search').value,'кунут','Native Back preserves the filtered library');
await page.select('[data-dua-open="dua-qunut"]').click();assert.equal(page.entries.length,3,'Opening another reader replaces the old forward branch');
page=browser('#adhkar?view=duas&category=prayer',new Storage(),undefined,{adhkarHistory:true});await page.open();await page.select('[data-dua-open="dua-qunut"]').click();const depth=page.entries.length;
await page.select('#dua-next').click();assert.match(page.location.hash,/item=dua-istikhara/);assert.equal(page.entries.length,depth,'Paging never inserts intermediate reader history');page.nativeBack();assert.equal(page.host.querySelectorAll('[data-dua-open]').length,catalogue.items.filter(item=>item.category==='prayer').length);
console.log('PASS: native Back and Forward, direct reader/reload, Istikhara/Qunut/other duas, filtered library and stable history depth.');

const referenceData=JSON.parse(await (await import('node:fs/promises')).readFile(new URL('../dist/data/daily-dua.json',import.meta.url),'utf8'));
const qunutReference=referenceData.items.find(item=>item.id==='dua-qunut'),hanafiReference=qunutReference.variants.find(item=>item.id==='hanafi'),hasanReference=qunutReference.variants.find(item=>item.id==='hasan');
assert.match(hanafiReference.transliteration,/натаваккалю ‘аляйк/);assert.ok(hanafiReference.transliteration.indexOf('нарджуу рахматака')<hanafiReference.transliteration.indexOf('нахшаа ‘азаабак'));
assert.match(hanafiReference.arabic,/وَنَتَوَكَّلُ عَلَيْكَ/);assert.ok(!hanafiReference.arabic.includes('الْجِدَّ'));assert.equal(hanafiReference.transliteration.split('\n\n').length,2);
assert.equal(qunutReference.arabic,hasanReference.arabic);assert.equal(qunutReference.transliteration,hasanReference.transliteration);
console.log('PASS: supplied Hanafi reference has trust clause, matching Arabic/order and two parts; original Hasan variant retained.');
