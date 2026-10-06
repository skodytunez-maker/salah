import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createAdhkarProgressStore} from '../dist/js/adhkar-progress.js';
import {adhkarPeriod} from '../dist/js/adhkar-period.js';
const data=JSON.parse(await readFile(new URL('../dist/data/adhkar.json',import.meta.url),'utf8'));
const readerSource=await readFile(new URL('../dist/js/adhkar.js',import.meta.url),'utf8');
assert.ok(readerSource.includes("host.querySelector('#dhikr-exit').onclick=()=>{stopAdhkar();hub()}"),'Closing an azkar session returns to the morning/evening hub.');
class Storage {data=new Map();get length(){return this.data.size}key(i){return [...this.data.keys()][i]??null}getItem(k){return this.data.get(k)??null}setItem(k,v){if(this.fail)throw Error('unavailable');this.data.set(k,v)}}
let day='2026-10-01';const storage=new Storage();
const open=()=>{const s=createAdhkarProgressStore({storage:()=>storage,day:()=>day});assert.equal(s.configure(data.items),true);return s};
const shared=data.groups.morning.ids.filter(id=>data.groups.evening.ids.includes(id));assert.equal(shared.length,12);let store=open();
for(const id of shared){await store.increment('morning',id);assert.equal(store.progress('evening').counts[id]??0,0);await store.increment('evening',id);assert.equal(store.total(id),2)}
const before=storage.getItem('salah:adhkar-progress-v2');store=open();assert.equal(storage.getItem('salah:adhkar-progress-v2'),before);
day='2026-10-02';for(const id of shared){assert.equal(store.progress('morning').counts[id]??0,0);assert.equal(store.progress('evening').counts[id]??0,0);assert.equal(store.total(id),2);await store.increment('morning',id);assert.equal(store.total(id),3)}
store.save('morning',{cursor:0,counts:{}});assert.equal(store.total(shared[0]),3);
const saved=storage.getItem('salah:adhkar-progress-v2');storage.fail=true;assert.equal((await store.increment('morning',shared[0])).ok,false);assert.equal(storage.getItem('salah:adhkar-progress-v2'),saved);storage.fail=false;
const future=JSON.parse(saved);future.totals['future-item']=25;storage.setItem('salah:adhkar-progress-v2',JSON.stringify(future));await store.increment('morning',shared[0]);assert.equal(store.total('future-item'),25);
const legacy=new Storage();for(const group of ['morning','evening'])legacy.setItem('salah:adhkar:2026-09-30:'+group,JSON.stringify({cursor:0,counts:{surah112:3}}));const migration=createAdhkarProgressStore({storage:()=>legacy,day:()=>day});assert.equal(migration.configure(data.items),true);assert.equal(migration.total('surah112'),6);assert.equal(migration.configure(data.items),true);assert.equal(migration.total('surah112'),6);
const times={Fajr:100,Sunrise:200,Dhuhr:300,Asr:400,Maghrib:500,Isha:600};
for(const [now,expected]of [[99,'evening'],[100,'morning'],[299,'morning'],[300,'morning'],[399,'morning'],[400,'evening'],[499,'evening'],[500,'evening'],[599,'evening'],[600,'evening']])assert.equal(adhkarPeriod(now,times),expected);
assert.equal(adhkarPeriod(150,null),null);assert.equal(adhkarPeriod(150,{Fajr:100,Dhuhr:NaN}),null);
assert.equal(adhkarPeriod(350,{...times,Asr:340}),'evening');
assert.equal(adhkarPeriod(150,{Fajr:100,Asr:NaN}),null);
assert.equal(adhkarPeriod(150,{Fajr:300,Asr:100}),null);
assert.equal(adhkarPeriod(36000150,Object.fromEntries(Object.entries(times).map(([key,value])=>[key,value+36000000]))),'morning');
console.log('PASS: 12 shared adhkar totals, independent sessions, next day, reopen/update, failed writes, catalogue changes, old-data migration and city schedule boundaries.');
