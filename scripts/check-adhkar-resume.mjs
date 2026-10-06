
import {markDhikrActivity} from '../dist/js/dhikr-reminder.js';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Script,createContext} from 'node:vm';
import {createFreeCounterStore} from '../dist/js/free-counter.js';
import {createAdhkarProgressStore} from '../dist/js/adhkar-progress.js';

// Exercise the actual screen module with its real progress store. The small DOM
// below supplies browser primitives only; routes and navigation come from the
// production handlers, not a second implementation of resume behavior.
const source=await readFile(new URL('../dist/js/adhkar.js',import.meta.url),'utf8');
const catalogue=JSON.parse(await readFile(new URL('../dist/data/adhkar.json',import.meta.url),'utf8'));
const executable=source.replace(/^import[^\n]*\n/gm,'').replace(/\bexport (?=(?:async )?function)/g,'')+'\n;({showAdhkar,stopAdhkar});';
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
function browser({hash='#adhkar',storage=new Storage(),items=catalogue,day='2026-10-02'}={}){
  const location={hash},body=new Element('body'),container=new Element(),events=new Map(),audio=[],notices=[];let scroll=0,fetches=0,currentDay=day,deferredLock=null;
  const window={history:{state:null,replaceState(_state,_title,url){location.hash=url}},addEventListener(type,fn){if(!events.has(type))events.set(type,[]);events.get(type).push(fn)},dispatchEvent(event){for(const fn of events.get(event.type)||[])fn(event)},removeEventListener(type,fn){events.set(type,(events.get(type)||[]).filter(f=>f!==fn))},clearTimeout,scrollTo(_x,y){scroll=y}};
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
  return {module,container,location,storage,audio,notices,open:()=>module.showAdhkar(container,'morning'),select:selector=>{const node=container.querySelector(selector);assert.ok(node,'Expected control '+selector);return node},get fetches(){return fetches},get scroll(){return scroll},set scroll(value){scroll=value},setDay:value=>currentDay=value,deferTap:()=>{let release;deferredLock=new Promise(resolve=>release=resolve);return release}};
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
await page.select('#adhkar-close').click();assertList(page);assert.equal(page.location.hash,'#adhkar?group=morning');await page.select('#dhikr-back').click();assertHub(page);assert.equal(page.location.hash,'#adhkar');

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
