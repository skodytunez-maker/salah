import assert from 'node:assert/strict';
import{readFile}from 'node:fs/promises';
import{Window}from '../tests/staff/node_modules/happy-dom/lib/index.js';
import{setInterfaceLanguage,t}from '../dist/js/i18n.js';
import ru from '../dist/js/i18n/practice/ru.js';
import en from '../dist/js/i18n/practice/en.js';
import az from '../dist/js/i18n/practice/az.js';
import tg from '../dist/js/i18n/practice/tg.js';
import uz from '../dist/js/i18n/practice/uz.js';
import{findNames}from '../dist/js/allah-names-core.js';

assert.deepEqual(Object.keys(ru).sort(),Object.keys(en).sort());
for(const[key,value]of Object.entries(ru)){assert.equal(typeof value,'string');assert.equal(typeof en[key],'string');const params=s=>[...s.matchAll(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g)].map(x=>x[1]).sort();assert.deepEqual(params(value),params(en[key]),key);}
for(const[language,catalogue]of Object.entries({az,tg,uz})){assert.deepEqual(Object.keys(catalogue).sort(),Object.keys(ru).sort(),language);for(const[key,value]of Object.entries(catalogue)){assert.equal(typeof value,'string');assert.ok(value.trim()&&!value.includes('\uFFFD'),language+':'+key);const params=s=>[...s.matchAll(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g)].map(x=>x[1]).sort();assert.deepEqual(params(value),params(ru[key]),language+':'+key);}assert.ok(findNames(catalogue['namesUi.searchPlaceholder'].split(':').at(-1).trim()).length,language+' source-name example must actually be searchable');}
const w=new Window({url:'https://salah.invalid/#adhkar'}),doc=w.document;
Object.assign(globalThis,{window:w,document:doc,location:w.location,localStorage:w.localStorage,Event:w.Event,CustomEvent:w.CustomEvent});
doc.body.innerHTML='<main></main><dialog id="modal"><div id="modal-content"></div></dialog><div id="toast" hidden></div>';
const host=doc.querySelector('main'),content=async file=>JSON.parse(await readFile(new URL('../dist/data/'+file,import.meta.url),'utf8'));
const adhkar=await content('adhkar.json'),duas=await content('daily-dua.json');let fetches=0;
globalThis.fetch=async input=>{fetches++;return{ok:true,json:async()=>structuredClone(String(input).includes('daily-dua')?duas:adhkar)}};
class Audio{static instances=[];constructor(src){this.src=src;this.paused=true;this.currentTime=7;this.duration=60;Audio.instances.push(this)}play(){this.paused=false;this.onplay?.();this.onplaying?.();return Promise.resolve()}pause(){this.paused=true;this.onpause?.()}load(){}removeAttribute(){this.src=''}addEventListener(){}removeEventListener(){}}
globalThis.Audio=Audio;
const {showAdhkar,stopAdhkar}=await import('../dist/js/adhkar.js');
const {showDailyDuas,stopDailyDuas}=await import('../dist/js/daily-dua.js');
const {showAllahNames}=await import('../dist/js/allah-names.js');
const {showArabicAlphabet}=await import('../dist/js/arabic-alphabet.js');
const {stopAlphabetName}=await import('../dist/js/arabic-alphabet-name-audio.js');
const {showUmrah,stopUmrah}=await import('../dist/js/umrah.js');
const stored=()=>JSON.stringify(Object.fromEntries(Object.keys(localStorage).filter(k=>k!=='salah:settings').sort().map(k=>[k,localStorage.getItem(k)])));
const click=async selector=>{const node=host.querySelector(selector);assert.ok(node,selector);await node.onclick({currentTarget:node,target:node,stopPropagation(){},preventDefault(){}});};
const assertKeys=()=>{if(process.env.REPORT_PRACTICE_UI){const leftovers=[];const walk=node=>{if(node.nodeType===3&&/[А-Яа-я]/.test(node.textContent)&&!node.parentElement.closest('[lang="ru"],[lang="ar"],[translate="no"],[data-i18n]'))leftovers.push(node.textContent.trim());for(const child of node.childNodes||[])walk(child)};walk(host);console.log(location.hash,JSON.stringify(leftovers));}for(const node of host.querySelectorAll('[data-i18n],[data-i18n-aria-label],[data-i18n-placeholder]'))for(const attribute of['data-i18n','data-i18n-aria-label','data-i18n-placeholder']){const key=node.getAttribute(attribute);if(key)assert.notEqual(t(key),key,'Missing UI key '+key);}};

// Render the real hub and its shipped cascade: a translated label is text,
// while its localized number owns exactly one badge, without a nested badge.
const hubStyle=doc.createElement('style');hubStyle.textContent=await readFile(new URL('../dist/style.css',import.meta.url),'utf8')+'\n'+await readFile(new URL('../dist/css/adhkar-hub.css',import.meta.url),'utf8');doc.head.append(hubStyle);
setInterfaceLanguage('ru');location.hash='#adhkar';await showAdhkar(host,'morning');
const hub=host.firstElementChild,library=host.querySelector('.hybrid-library'),hubRequests=fetches,hubProgress=stored();
const libraryButtons=[...library.querySelectorAll('button')],labels=libraryButtons.map(button=>button.querySelector('[data-i18n]')),counts=libraryButtons.map(button=>button.querySelector('[data-practice-number]'));
for(const [index,button]of libraryButtons.entries()){
 assert.equal(w.getComputedStyle(labels[index]).backgroundColor,'transparent','A library label must not receive the numeric badge background');
 assert.equal(labels[index].className,'hybrid-library-label');assert.equal(counts[index].className,'hybrid-library-count');
 assert.equal(counts[index].parentElement,button,'The numeric leaf is the badge, with no extra badge wrapper');
 assert.equal(button.querySelectorAll('span').length,2,'Each library button has one text label and one numeric badge');
 assert.notEqual(w.getComputedStyle(counts[index]).backgroundColor,'rgba(0, 0, 0, 0)');assert.equal(w.getComputedStyle(counts[index]).display,'grid');assert.equal(counts[index].getAttribute('dir'),'ltr');
}
for(const language of['ru','en','az','tg','uz','kk','de','ar']){
 setInterfaceLanguage(language);assert.equal(host.firstElementChild,hub);assert.equal(host.querySelector('.hybrid-library'),library);
 for(const[index,key]of['adhkarUi.allAdhkar','adhkarUi.favoriteAdhkar'].entries()){
  assert.equal(libraryButtons[index].querySelector('[data-i18n]'),labels[index]);assert.equal(libraryButtons[index].querySelector('[data-practice-number]'),counts[index]);
  assert.equal(labels[index].textContent,t(key));assert.equal(counts[index].textContent,new Intl.NumberFormat(language).format(index?0:adhkar.items.length));assert.equal(libraryButtons[index].querySelectorAll('span').length,2);
 }
 assert.equal(fetches,hubRequests);assert.equal(stored(),hubProgress,'Changing labels must not alter dhikr progress or preferences');
}
await click('#all-dhikr');assert.equal(host.querySelectorAll('.dhikr-list-card').length,adhkar.items.length,'The all-adhkar button keeps its original action');await click('#dhikr-back');await click('#favorite-dhikr');assert.equal(host.querySelectorAll('.dhikr-list-card').length,0);assert.ok(host.querySelector('[data-i18n="adhkarUi.favoriteHint"]'),'The favorites button keeps its empty-state action');
stopAdhkar();hubStyle.remove();
console.log('PASS: actual Adhkar hub and shipped CSS keep one unboxed label plus one numeric badge in all 8 languages, including RTL; locale updates preserve nodes, progress, requests and both library navigation actions.');

setInterfaceLanguage('ru');location.hash='#adhkar?group=morning&view=card&item=tasbih';await showAdhkar(host,'morning');
assert.ok(host.querySelector('#adhkar-count'));const screen=host.firstElementChild,original=host.querySelector('.dhikr-passage'),sourceText=original.querySelector('.transliteration').textContent;
await click('#dhikr-play');const audio=Audio.instances.at(-1),progress=stored(),requests=fetches;
setInterfaceLanguage('en');assert.equal(host.firstElementChild,screen);assert.equal(host.querySelector('.dhikr-passage'),original);assert.equal(host.querySelector('.transliteration').textContent,sourceText);assert.equal(host.querySelector('.lesson-top>span').textContent,'Morning adhkar');assert.equal(host.querySelector('#adhkar-completed-count').textContent,'0 of '+adhkar.groups.morning.ids.length+' completed');assert.equal(host.querySelector('#dhikr-play').getAttribute('aria-label'),en['adhkarUi.audioPause']);assert.equal(audio.paused,false);assert.equal(audio.currentTime,7);assert.equal(stored(),progress);assert.equal(fetches,requests);assertKeys();
setInterfaceLanguage('ru');assert.equal(host.querySelector('.lesson-top>span').textContent,'Утренние азкары');stopAdhkar();

location.hash='#adhkar?view=counter';await showAdhkar(host,'morning');const counter=host.querySelector('#free-tap'),target=host.querySelector('#counter-custom');target.value='71';await click('#short-dhikr-choose');const form=doc.querySelector('#short-custom-form');form.hidden=false;form.elements.title.value='Мой зикр <span>';form.elements.text.value='Мой текст';const saved=stored();setInterfaceLanguage('en');assert.equal(host.querySelector('#free-tap'),counter);assert.equal(target.value,'71');assert.equal(form.elements.title.value,'Мой зикр <span>');assert.equal(form.elements.text.value,'Мой текст');assert.equal(doc.querySelector('#short-dhikr-picker h2').textContent,en['adhkarUi.chooseDhikr']);assert.equal(stored(),saved);assertKeys();doc.querySelector('#modal').close();stopAdhkar();

location.hash='#adhkar?view=duas&category=sleep&item=before-sleep';await showDailyDuas(host);const reader=host.querySelector('.dua-reader'),passage=host.querySelector('.dua-passage'),qunutText=passage.textContent;await click('.dua-audio-button');const pronunciation=Audio.instances.at(-1),duaRequests=fetches;setInterfaceLanguage('ru');setInterfaceLanguage('en');assert.equal(host.querySelector('.dua-reader'),reader);assert.equal(host.querySelector('.dua-passage'),passage);assert.equal(passage.textContent.replace('Meaning','Перевод смысла'),qunutText.replace('Meaning','Перевод смысла'));assert.equal(pronunciation.paused,false);assert.equal(fetches,duaRequests);assertKeys();stopDailyDuas();

location.hash='#knowledge?view=names';showAllahNames(host);const search=host.querySelector('[data-names-search]');search.value='Рахман';search.oninput();const namesScreen=host.firstElementChild,names=host.querySelector('#names-list'),answers=names.textContent,review=stored();setInterfaceLanguage('ru');setInterfaceLanguage('en');assert.equal(host.firstElementChild,namesScreen);assert.equal(host.querySelector('[data-names-search]'),search);assert.equal(search.value,'Рахман');assert.equal(names.textContent,answers);assert.equal(stored(),review);assert.equal(host.querySelector('#names-title').textContent,'The Beautiful Names of Allah');assertKeys();

location.hash='#knowledge?view=alphabet&letter=ba';showArabicAlphabet(host);const alphabet=host.firstElementChild,letter=host.querySelector('#alphabet-letter-title').textContent;await click('[data-alphabet-name]');const sound=Audio.instances.at(-1),letterProgress=stored();setInterfaceLanguage('ru');setInterfaceLanguage('en');assert.equal(host.firstElementChild,alphabet);assert.equal(host.querySelector('#alphabet-letter-title').textContent,letter);assert.equal(host.querySelector('[data-alphabet-name]').getAttribute('aria-label'),'Stop the letter name: Ба');assert.equal(sound.paused,false);assert.equal(stored(),letterProgress);assertKeys();stopAlphabetName();

location.hash='#umrah?step=tawaf';await showUmrah(host);const lesson=host.querySelector('.umrah-page'),lessonText=host.querySelector('.umrah-lesson').textContent,position=stored(),umrahRequests=fetches;setInterfaceLanguage('ru');setInterfaceLanguage('en');assert.equal(host.querySelector('.umrah-page'),lesson);assert.equal(host.querySelector('.umrah-lesson').textContent.replace('Sources','Источники'),lessonText.replace('Sources','Источники'));assert.equal(stored(),position);assert.equal(fetches,umrahRequests);assert.match(host.querySelector('.umrah-progress').textContent,/Step 6 of 10/);assertKeys();stopUmrah();
function audit(){const leftovers=[];const visit=node=>{if(node.nodeType===3&&/[А-Яа-я]/.test(node.textContent)&&!node.parentElement.closest('[lang="ru"],[lang="ar"],[translate="no"],[data-i18n]'))leftovers.push(node.textContent.trim());for(const child of node.childNodes||[])visit(child);};visit(host);assert.deepEqual(leftovers,[],location.hash+' has unbound UI');}
for(const hash of['#adhkar','#adhkar?group=morning','#adhkar?group=morning&view=summary']){location.hash=hash;await showAdhkar(host,'morning');audit();stopAdhkar();}
for(const hash of['#adhkar?view=duas','#adhkar?view=duas&category=food','#adhkar?view=duas&favorites=1']){location.hash=hash;await showDailyDuas(host);audit();stopDailyDuas();}
location.hash='#knowledge?view=names&name=qabid';showAllahNames(host);audit();host.querySelector('[data-names-quiz]').onclick();audit();
location.hash='#knowledge?view=alphabet';showArabicAlphabet(host);audit();host.querySelector('[data-quiz-start]').onclick();audit();stopAlphabetName();
for(const hash of['#umrah','#umrah?view=history','#umrah?view=tips','#umrah?view=complete']){location.hash=hash;await showUmrah(host);audit();stopUmrah();}
globalThis.fetch=async()=>({ok:true,json:async()=>({edition:1,fetchedAt:'2026-10-04T05:00:00Z',rows:[{mosque:'mecca',prayer:'fajr',at:'2026-10-03T22:01:00Z',day:'2026-10-04',imam:'اسم الإمام'}]})});
location.hash='#umrah?view=imams&month=2026-10&day=2026-10-04';await showUmrah(host);audit();stopUmrah();

console.log('PASS: explicit practice RU/EN keys and parameters, all practice views and actual adhkar/dua/audio/counter/forms/names/alphabet/Umrah state survive language changes; source passages and names stay original and no extra data requests occur.');
