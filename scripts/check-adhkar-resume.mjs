
import {markDhikrActivity} from '../dist/js/dhikr-reminder.js';
import assert from 'node:assert/strict';
import {resolveBackAction} from '../dist/js/edge-back.js';
import {readFile} from 'node:fs/promises';
import {Script,createContext} from 'node:vm';
import {createFreeCounterStore} from '../dist/js/free-counter.js';
import {createAdhkarProgressStore} from '../dist/js/adhkar-progress.js';

// Exercise the actual screen module with its real progress store. The small DOM
// below supplies browser primitives only; routes and navigation come from the
// production handlers, not a second implementation of resume behavior.
const source=await readFile(new URL('../dist/js/adhkar.js',import.meta.url),'utf8');
const catalogue=JSON.parse(await readFile(new URL('../dist/data/adhkar.json',import.meta.url),'utf8'));
const executable=source.replace(/^import[^\n]*\n/gm,'').replace(/\bexport (?=(?:async )?function)/g,'')+'\n;({showAdhkar,stopAdhkar,updateAdhkarPeriod});';
const decode=value=>String(value).replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
class Storage {
  data=new Map();get length(){return this.data.size}key(index){return [...this.data.keys()][index]??null}
  getItem(key){return this.data.get(key)??null}setItem(key,value){this.data.set(key,String(value))}
}
class Element {
  constructor(tag='div',attributes={},parent=null){
    this.tagName=tag;this.attributes=attributes;this.parent=parent;this.children=[];this.listeners=new Map();this.dataset={};this.writes=0;this.hidden='hidden' in attributes;this.checked='checked' in attributes;this.disabled='disabled' in attributes;this.value=attributes.value??'';this.text='';
    for(const [key,value]of Object.entries(attributes))if(key.startsWith('data-'))this.dataset[key.slice(5).replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase())]=value;
    const classes=new Set((attributes.class||'').split(/\s+/).filter(Boolean));
    this.classList={add:(...names)=>names.forEach(name=>classes.add(name)),remove:(...names)=>names.forEach(name=>classes.delete(name)),contains:name=>classes.has(name),toggle:(name,force)=>{const add=force??!classes.has(name);if(add)classes.add(name);else classes.delete(name);return add}};
    this.style={setProperty:(key,value)=>{this.style[key]=String(value)}};
  }
  set innerHTML(html){this.writes++;this.html=String(html);this.children=[];this.text='';const stack=[this];const voidTags=new Set(['img','input','br','hr','meta','link']);for(const token of this.html.match(/<[^>]*>|[^<]+/g)||[]){
    if(token.startsWith('</')){if(stack.length>1)stack.pop();continue}
    if(token.startsWith('<')){const tag=/^<([\w-]+)/.exec(token)?.[1];if(!tag)continue;const attrs={};for(const match of token.slice(tag.length+1,-1).matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g))attrs[match[1]]=decode(match[2]??match[3]??match[4]??'');const parent=stack.at(-1),child=new Element(tag,attrs,parent);parent.children.push(child);if(!voidTags.has(tag)&&!token.endsWith('/>'))stack.push(child);
    }else stack.at(-1).text+=decode(token);
  }}
  get innerHTML(){return this.html||''}
  set textContent(value){this.text=String(value);this.children=[]}
  get textContent(){return this.text+this.children.map(child=>child.textContent).join('')}
  setAttribute(name,value){this.attributes[name]=String(value)}
  get isConnected(){return true}
  getClientRects(){return this.hidden?[]:[{}]}
  closest(selector){for(let node=this;node;node=node.parent)if(node.matches(selector))return node;return null}
  addEventListener(type,callback){if(!this.listeners.has(type))this.listeners.set(type,[]);this.listeners.get(type).push(callback)}
  dispatch(type,event={}){const e={currentTarget:this,target:this,preventDefault(){},stopPropagation(){},...event};return Promise.all((this.listeners.get(type)||[]).map(fn=>fn(e)))}
  removeEventListener(type,callback){this.listeners.set(type,(this.listeners.get(type)||[]).filter(fn=>fn!==callback))}
  async click(){const event={currentTarget:this,target:this};if(this.onclick)await this.onclick(event);await this.dispatch('click',event)}
  matches(selector){
    if(selector.endsWith(':last-child')){if(this.parent?.children.at(-1)!==this)return false;selector=selector.slice(0,-11)}
    const attribute=/^\[([^=\]]+)(?:="([^"]*)")?\]$/.exec(selector);if(attribute)return Object.hasOwn(this.attributes,attribute[1])&&(attribute[2]===undefined||this.attributes[attribute[1]]===attribute[2]);
    if(selector.startsWith('#'))return this.attributes.id===selector.slice(1);
    if(selector.startsWith('.'))return this.classList.contains(selector.slice(1));
    return this.tagName===selector;
  }
  querySelectorAll(selector){const result=[];const alternatives=selector.split(',').map(value=>value.trim().split(/\s+/));const visit=node=>{for(const child of node.children){if(alternatives.some(parts=>{if(!child.matches(parts.at(-1)))return false;let parent=child.parent;for(let index=parts.length-2;index>=0;index--){while(parent&&!parent.matches(parts[index]))parent=parent.parent;if(!parent)return false;parent=parent.parent}return true}))result.push(child);visit(child)}};visit(this);return result}
  querySelector(selector){return this.querySelectorAll(selector)[0]??null}
  checkValidity(){return true}reportValidity(){}
}
function browser({hash='#adhkar',storage=new Storage(),items=catalogue,day='2026-10-02',resumeEvening=null}={}){
  const entries=[{hash,state:null}];let historyIndex=0;
  const location={get hash(){return entries[historyIndex].hash},set hash(value){const next=value.startsWith('#')?value:'#'+value;if(next===this.hash)return;entries.splice(historyIndex+1);entries.push({hash:next,state:null});historyIndex++}};
  const body=new Element('body'),container=new Element(),events=new Map(),audio=[],notices=[];let scroll=0,fetches=0,currentDay=day,deferredLock=null;
  const window={history:{
    get state(){return entries[historyIndex].state},
    replaceState(state,_title,url){entries[historyIndex]={hash:url??location.hash,state}},
    pushState(state,_title,url){entries.splice(historyIndex+1);entries.push({hash:url??location.hash,state});historyIndex++},
    back(){if(historyIndex>0){historyIndex--;window.dispatchEvent(new Event('popstate'));window.dispatchEvent(new Event('hashchange'))}},
    forward(){if(historyIndex<entries.length-1){historyIndex++;window.dispatchEvent(new Event('popstate'));window.dispatchEvent(new Event('hashchange'))}}
   },addEventListener(type,fn){if(!events.has(type))events.set(type,[]);events.get(type).push(fn)},dispatchEvent(event){for(const fn of events.get(event.type)||[])fn(event)},removeEventListener(type,fn){events.set(type,(events.get(type)||[]).filter(f=>f!==fn))},clearTimeout,scrollTo(_x,y){scroll=y}};
  const context=createContext({location,window,document:{body,querySelector:selector=>container.querySelector(selector)},localStorage:storage,URLSearchParams,Event,Date,console,
    bindNativeCardSwipe:()=>()=>{},
    markDhikrActivity:()=>markDhikrActivity(Date.now(),storage,window),
    navigator:{locks:{request:async(_key,fn)=>{if(deferredLock){const gate=deferredLock;deferredLock=null;await gate}return fn()}},vibrate(){}},
    read:(key,fallback)=>{const value=storage.getItem('salah:'+key);return value===null?fallback:JSON.parse(value)},write:(key,value)=>{storage.setItem('salah:'+key,JSON.stringify(value));return true},settings:{haptic:false},
    esc:value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])),toast:notice=>notices.push(notice),modal(){},closeModal(){},dateKey:()=>currentDay,createAdhkarProgressStore,createFreeCounterStore,stopDailyDuas(){},showDailyDuas(){},
    recordingFor:(_kind,id)=>({url:'https://test.invalid/'+id+'.mp3'}),
    Audio:class {constructor(url){this.src=url;this.paused=true;this.pauseCalls=0;audio.push(this)}play(){this.paused=false;return Promise.resolve()}pause(){this.paused=true;this.pauseCalls++}},
    fetch:async()=>{fetches++;return {ok:true,json:async()=>structuredClone(items)}}
  });
  const module=new Script(executable,{filename:'adhkar.js'}).runInContext(context);
  return {module,container,location,storage,audio,notices,window,get historyEntries(){return entries.map(x=>x.hash)},get historyIndex(){return historyIndex},nativeBack:async()=>{window.history.back();await module.showAdhkar(container,'morning',{resumeEvening})},open:()=>module.showAdhkar(container,'morning',{resumeEvening}),select:selector=>{const node=container.querySelector(selector);assert.ok(node,'Expected control '+selector);return node},get fetches(){return fetches},get scroll(){return scroll},set scroll(value){scroll=value},setDay:value=>currentDay=value,setEveningContext:value=>{resumeEvening=value;module.updateAdhkarPeriod('evening',{resumeEvening})},deferTap:()=>{let release;deferredLock=new Promise(resolve=>release=resolve);return release}};
}
const params=page=>new URLSearchParams(page.location.hash.split('?')[1]||'');
const cardId=page=>page.select('#adhkar-count').dataset.dhikrId;
const assertHub=page=>assert.ok(page.container.querySelector('.hybrid-heading'));
const assertList=page=>assert.ok(page.container.querySelector('.dhikr-list-shell'));
async function assertUnchanged(page,period='evening'){
  const writes=page.container.writes,screen=page.container.children[0],scroll=page.scroll,fetches=page.fetches;
  await page.module.showAdhkar(page.container,period);
  assert.equal(page.container.writes,writes,'A schedule/resume refresh must not rebuild the reading screen');
  assert.equal(page.container.children[0],screen);assert.equal(page.scroll,scroll);assert.equal(page.fetches,fetches);
}

let page=browser();await page.open();assertHub(page);await assertUnchanged(page);
await page.select('[data-group="morning"]').click();assertList(page);assert.equal(page.location.hash,'#adhkar?group=morning');await assertUnchanged(page);
await page.select('[data-index="5"]').click();const item=catalogue.groups.morning.ids[5];assert.equal(cardId(page),item);assert.equal(params(page).get('item'),item);assert.equal(params(page).get('view'),'card');
await page.select('#dhikr-play').click();const playing=page.audio[0];assert.equal(playing.paused,false);page.scroll=143;
const release=page.deferTap(),tap=page.select('#adhkar-count').click();assert.equal(page.select('#adhkar-count').dataset.pending,'true');await assertUnchanged(page);release();await tap;
assert.equal(playing.pauseCalls,0,'Resume must not stop active dhikr audio');assert.match(page.select('#adhkar-count').textContent,/^1/);const progress=JSON.parse(page.storage.getItem('salah:adhkar-progress-v2'));assert.equal(progress.totals[item],1,'The pending tap commits exactly once');await assertUnchanged(page);

// A new JS realm and DOM model an OS page recreation or a service worker reload.
page=browser({hash:page.location.hash,storage:page.storage});await page.open();assert.equal(cardId(page),item);assert.match(page.select('#adhkar-count').textContent,/^1/);await assertUnchanged(page);
page.setDay('2026-10-03');await assertUnchanged(page);assert.match(page.select('#adhkar-count').textContent,/^0/);assert.equal(page.select('#adhkar-total').textContent,'1','Next-day daily progress can refresh in place without losing lifetime total');
await page.select('#adhkar-close').click();assertHub(page);assert.equal(page.location.hash,'#adhkar');await page.select('[data-group="morning"]').click();assertList(page);await page.select('#dhikr-back').click();assertHub(page);assert.equal(page.location.hash,'#adhkar');

// Both the card button and edge-back action exit straight to the collection
// choice. The reading progress and preferred group remain available on reopening.
for(const group of ['morning','evening'])for(const exit of ['button','edge']){
 const exitPage=browser({hash:'#adhkar?group='+group+'&view=card&item=surah112'});
 await exitPage.open();await exitPage.select('#adhkar-count').click();
 await exitPage.select('#dhikr-play').click();const audio=exitPage.audio.at(-1);
 const saved=exitPage.storage.getItem('salah:adhkar-progress-v2');
 if(exit==='button')await exitPage.select('#adhkar-close').click();
 else{
  const action=resolveBackAction(exitPage.container,{canBack:()=>true,back(){assert.fail('Card exit must not navigate out of Azkars')}});
  assert.equal(typeof action,'function');await action();
 }
 assertHub(exitPage);assert.equal(exitPage.location.hash,'#adhkar');
 assert.ok(exitPage.container.querySelector('[data-group="morning"]'));assert.ok(exitPage.container.querySelector('[data-group="evening"]'));
 assert.equal(exitPage.container.querySelector('.adhkar-shell'),null);assert.equal(exitPage.container.querySelector('.dhikr-list-shell'),null);
 assert.equal(audio.paused,true,'Leaving the card stops its recording');
 assert.equal(exitPage.storage.getItem('salah:adhkar-progress-v2'),saved,'Closing never clears progress');
 await assertUnchanged(exitPage);
 await exitPage.select('[data-group="'+group+'"]').click();assertList(exitPage);
 await exitPage.select('#dhikr-continue').click();assert.equal(cardId(exitPage),'surah112');assert.match(exitPage.select('#adhkar-count').textContent,/1 \/ 3/);
}
console.log('PASS: morning/evening card button and edge-back return to the collection choice, stop audio and retain progress.');

// Reproduce the recorded route: Home -> Azkars -> morning/evening list -> OS Back.
// Use the real browser history operation, bypassing the custom edge button.
for(const group of ['morning','evening']){
 const native=browser({hash:'#home'});native.location.hash='#adhkar';await native.open();
 await native.select('[data-group="'+group+'"]').click();assertList(native);
 assert.deepEqual(native.historyEntries,['#home','#adhkar','#adhkar?group='+group]);
 await native.nativeBack();assertHub(native);assert.equal(native.location.hash,'#adhkar');assert.equal(native.historyIndex,1);
 await native.select('[data-group="'+group+'"]').click();await native.select('[data-index="3"]').click();
 await native.select('#adhkar-count').click();await native.select('#adhkar-next').click();
 const saved=native.storage.getItem('salah:adhkar-progress-v2');
 assert.equal(native.historyEntries.length,3,'Paging cards must replace the reading entry');
 await native.nativeBack();assertHub(native);assert.equal(native.location.hash,'#adhkar');
 assert.equal(native.storage.getItem('salah:adhkar-progress-v2'),saved,'Native Back retains repetition counts');
 await native.select('[data-group="'+group+'"]').click();await native.select('#dhikr-back').click();
 assertHub(native);assert.equal(native.historyIndex,1,'The visible Back button consumes the same child entry as OS Back');
 native.window.history.back();assert.equal(native.location.hash,'#home','Another Back from the collection menu returns to Home once');
}
for(const hash of ['#adhkar?group=morning','#adhkar?group=evening&view=card&item=surah112','#adhkar?view=counter']){
 const direct=browser({hash});await direct.open();
 assert.deepEqual(direct.historyEntries,['#adhkar',hash],'A direct nested launch seeds one collection-menu parent');
 const entries=direct.historyEntries.length;await assertUnchanged(direct);assert.equal(direct.historyEntries.length,entries);
 await direct.nativeBack();assertHub(direct);assert.equal(direct.location.hash,'#adhkar');
}
console.log('PASS: native history Back from both lists and cards opens the Azkars menu, preserves counts, avoids duplicate parents and card history, and handles direct launches.');

// A chosen ID is stable even when a later catalogue changes item order.
await page.select('#all-dhikr').click();assertList(page);await page.select('[data-index="3"]').click();const allId=cardId(page),allHash=page.location.hash;
const reordered=structuredClone(catalogue);reordered.items.reverse();page=browser({hash:allHash,storage:page.storage,items:reordered});await page.open();assert.equal(cardId(page),allId);assert.equal(params(page).get('group'),'all');
const favoriteIds=catalogue.items.slice(2,5).map(item=>item.id);page.storage.setItem('salah:adhkar-favorites',JSON.stringify(favoriteIds));page.location.hash='#adhkar';await page.open();await page.select('#favorite-dhikr').click();await page.select('[data-index="1"]').click();const favoriteHash=page.location.hash;
page.storage.setItem('salah:adhkar-favorites',JSON.stringify(favoriteIds.slice(1)));page=browser({hash:favoriteHash,storage:page.storage});await page.open();assert.equal(cardId(page),favoriteIds[1]);
page.storage.setItem('salah:adhkar-favorites',JSON.stringify([favoriteIds[2]]));page=browser({hash:favoriteHash,storage:page.storage});await page.open();assertList(page);assert.equal(page.location.hash,'#adhkar?group=favorites','A removed favorite falls back to its remaining list');
page=browser({hash:favoriteHash});await page.open();assertList(page);assert.equal(page.container.querySelector('#dhikr-continue'),null,'An empty favorite list has no invalid continuation');
for(const hash of ['#adhkar?group=morning&view=card&item=missing','#adhkar?group=evening&view=card&item='+catalogue.groups.morning.ids.find(id=>!catalogue.groups.evening.ids.includes(id))]){page=browser({hash});await page.open();assertList(page);assert.equal(params(page).has('item'),false)}
for(const hash of ['#adhkar?group=constructor&view=card&item='+item,'#adhkar?view=card&item='+item]){page=browser({hash});await page.open();assertHub(page);assert.equal(page.location.hash,'#adhkar')}

page=browser();await page.open();await page.select('#free-counter').click();assert.equal(page.location.hash,'#adhkar?view=counter');await page.select('#free-tap').click();await page.select('#free-tap').click();page.scroll=91;await assertUnchanged(page);
page=browser({hash:page.location.hash,storage:page.storage});await page.open();assert.equal(page.select('#free-tap').textContent,'2Цель: 33');await assertUnchanged(page);await page.select('#counter-close').click();assertHub(page);assert.equal(page.location.hash,'#adhkar');

const last=catalogue.groups.evening.ids.at(-1);page=browser({hash:'#adhkar?group=evening&view=card&item='+last});await page.open();await page.select('#adhkar-next').click();assert.ok(page.container.querySelector('.lesson-complete'));assert.equal(params(page).get('view'),'summary');await assertUnchanged(page);
page=browser({hash:page.location.hash,storage:page.storage});await page.open();assert.ok(page.container.querySelector('.lesson-complete'));await assertUnchanged(page);await page.select('#adhkar-return').click();assert.equal(cardId(page),catalogue.groups.evening.ids[0]);
page.location.hash='#adhkar';await page.open();assertHub(page);await page.select('[data-group="evening"]').click();assertList(page);assert.equal(page.location.hash,'#adhkar?group=evening');
const beforeStop=page.container.writes;page.module.stopAdhkar();await page.open();assertList(page);assert.ok(page.container.writes>beforeStop,'Explicitly leaving the section invalidates the same-route guard');
assert.deepEqual(page.notices,[]);
console.log('PASS: real adhkar screen retains DOM, scroll, audio and a pending tap on refresh; reload restores exact card, all/favorites, free counter and summary; explicit navigation and invalid routes fall back safely.');

// Basmala is omitted only in the displayed short-surah cards and previews.
// The source text, other duas and progress IDs remain intact.
const catalogueBefore=JSON.stringify(catalogue);
for(const group of ['morning','evening']){
 const listPage=browser({hash:'#adhkar?group='+group});await listPage.open();
 assert.doesNotMatch(listPage.container.textContent,/Бисмилляахир-рахмаанир-рахиим/);
 assert.match(listPage.container.textContent,/Бисмилляахи-ллязии/,'The protective dua keeps its own opening');
 for(const id of ['surah112','surah113','surah114']){
  const cardPage=browser({hash:'#adhkar?group='+group+'&view=card&item='+id});await cardPage.open();
  const passage=cardPage.select('.dhikr-passage');
  assert.doesNotMatch(passage.textContent,/Бисмилляахир|بِسْمِ/);
  assert.match(cardPage.select('.dhikr-arabic').textContent,/^قُلْ/);
  assert.match(cardPage.select('.transliteration').textContent,/^Қуль/);
  if(id==='surah112')assert.match(passage.textContent,/якулляху куфууан Ахад/);
  assert.equal(cardId(cardPage),id);assert.match(cardPage.select('#adhkar-count').textContent,/0 \/ 3/);
  await cardPage.select('#adhkar-count').click();assert.match(cardPage.select('#adhkar-count').textContent,/1 \/ 3/);
  await assertUnchanged(cardPage);
 }
}
assert.equal(JSON.stringify(catalogue),catalogueBefore,'Presentation never modifies the source catalogue');
console.log('PASS: six morning/evening short-surah cards and list previews omit basmala, preserve other duas, original Arabic and counter identities.');

// Nightly progress belongs to the saved evening, independently of lifetime totals.
// Seed real repetitions, not guessed values derived from a lifetime total.
function eveningFixture(){
 const storage=new Storage(),store=createAdhkarProgressStore({storage:()=>storage,day:()=> '2026-10-06'});
 assert.ok(store.configure(catalogue.items));
 const ids=catalogue.groups.evening.ids;
 assert.equal(ids[2],'tasbih');
 return {storage,store,ids};
}
let night=eveningFixture();
for(const id of night.ids.slice(0,2))for(let n=0;n<catalogue.items.find(i=>i.id===id).target;n++)await night.store.increment('evening',id);
for(let n=0;n<50;n++)await night.store.increment('evening','tasbih');
let snapshot=night.store.progress('evening');snapshot.cursor=2;night.store.save('evening',snapshot);
const original=night.storage.getItem('salah:adhkar-progress-v2');
let resumed=browser({hash:'#adhkar?group=evening',day:'2026-10-07',storage:night.storage,resumeEvening:true});
await resumed.open();assertList(resumed);
assert.equal(night.storage.getItem('salah:adhkar-progress-v2'),original,'Restoring the saved evening never changes repetitions or totals');
assert.equal(params(resumed).get('day'),'2026-10-06');
await resumed.select('#dhikr-continue').click();
assert.equal(cardId(resumed),'tasbih');assert.match(resumed.select('#adhkar-count').textContent,/50 \/ 100/);
assert.equal(resumed.select('#adhkar-total').textContent,'50');
await assertUnchanged(resumed);assert.match(resumed.select('#adhkar-count').textContent,/50 \/ 100/);
const beforeTap=night.storage.getItem('salah:adhkar-progress-v2');
const gate=resumed.deferTap(),pending=resumed.select('#adhkar-count').click();
resumed.setDay('2026-10-08');gate();await pending;
const afterTap=JSON.parse(night.storage.getItem('salah:adhkar-progress-v2'));
assert.equal(afterTap.days['2026-10-06'].evening.counts.tasbih,51,'A pending tap commits to the displayed saved date');
assert.equal(afterTap.days['2026-10-07'],undefined);
assert.equal(afterTap.days['2026-10-08'],undefined);
assert.equal(afterTap.totals.tasbih,51,'Only one actual repetition is added to the lifetime total');
// Reload on the same following calendar date restores the exact card and record.
resumed=browser({hash:resumed.location.hash,day:'2026-10-07',storage:night.storage,resumeEvening:false});
await resumed.open();assert.equal(cardId(resumed),'tasbih');assert.match(resumed.select('#adhkar-count').textContent,/51 \/ 100/);
await resumed.select('#adhkar-undo').click();assert.equal(night.store.total('tasbih'),50);
assert.equal(night.store.progress('evening').counts.tasbih,50);
const lifetime=night.store.totals();
const fresh=browser({hash:'#adhkar?group=evening',day:'2026-10-07',storage:night.storage,resumeEvening:false});
await fresh.open();assert.equal(params(fresh).get('day'),null);await fresh.select('[data-index="2"]').click();
assert.match(fresh.select('#adhkar-count').textContent,/0 \/ 100/,'The next evening starts its own daily stage');
assert.deepEqual(night.store.totals(),lifetime,'Starting the next evening never rewrites lifetime totals');
// Current-day repetitions always take priority over an automatic previous-day resume.
await fresh.select('#adhkar-count').click();
const current=browser({hash:'#adhkar?group=evening&view=card&item=tasbih',day:'2026-10-07',storage:night.storage,resumeEvening:true});
await current.open();assert.match(current.select('#adhkar-count').textContent,/1 \/ 100/);assert.equal(params(current).get('day'),null);
// A still-open evening survives midnight even before the new schedule is loaded.
const active=browser({hash:'#adhkar?group=evening&view=card&item=tasbih',day:'2026-10-06',storage:night.storage,resumeEvening:false});
await active.open();active.setDay('2026-10-07');active.setEveningContext(null);
assert.match(active.select('#adhkar-count').textContent,/50 \/ 100/);assert.equal(params(active).get('day'),'2026-10-06');
// Late prayer data can recover yesterday in the card and list without fetching texts again.
const lateStorage=new Storage();lateStorage.setItem('salah:adhkar-progress-v2',beforeTap);
for(const view of ['','&view=card&item=tasbih']){
 const late=browser({hash:'#adhkar?group=evening'+view,day:'2026-10-07',storage:lateStorage});
 await late.open();late.setEveningContext(true);assert.equal(params(late).get('day'),'2026-10-06');
 if(!view)await late.select('#dhikr-continue').click();
 assert.match(late.select('#adhkar-count').textContent,/50 \/ 100/);
}
// Expired or forged URLs cannot resume unrelated old or nonexistent records.
for(const date of ['2026-10-05','2026-10-09','garbage']){
 const invalid=browser({hash:'#adhkar?group=evening&view=card&item=tasbih&day='+date,day:'2026-10-07',storage:new Storage(),resumeEvening:false});
 await invalid.open();assert.equal(params(invalid).get('day'),null);assert.match(invalid.select('#adhkar-count').textContent,/0 \/ 100/);
}
console.log('PASS: saved evening 50/100 resumes after midnight/reload, pending taps and undo target its own day, totals are not guessed, current-day work wins and the next evening starts separately.');
