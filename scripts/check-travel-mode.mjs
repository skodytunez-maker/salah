import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import{Window}from '../tests/staff/node_modules/happy-dom/lib/index.js';
const saved=new Map();globalThis.localStorage={getItem:k=>saved.get(k)??null,setItem:(k,v)=>saved.set(k,v)};
const store=await import('../dist/js/storage.js');const {settings,updateSettings,normalizeSettings}=store;
const home={name:'Тюмень',country:'Россия',latitude:57.15,longitude:65.53,timezone:'Asia/Yekaterinburg'},away={name:'Медина',country:'Саудовская Аравия',latitude:24.47,longitude:39.61,timezone:'Asia/Riyadh'};
const w=new Window(),doc=w.document,host=doc.createElement('main');doc.body.append(host);let chosen,changes=[],before=0;
const ctx=vm.createContext({settings,updateSettings,esc:s=>String(s),toast:()=>{},closeModal:()=>{},openCityDialog:(city,onSelect)=>{chosen=onSelect;},window:w});
const source=await fs.readFile(new URL('../dist/js/travel-mode.js',import.meta.url),'utf8');
const api=vm.runInContext(source.replace(/^import.*\n/gm,'').replace(/export /g,'')+';({travelCitySelection,travelActivation,isTravelSwipe,mountTravelSettings,travelHomeMarkup,bindTravelHome});',ctx);
const hooks={onBeforeChange(){before++;},onChange(change){changes.push(change);}};
updateSettings({city:home,onboarded:true});api.mountTravelSettings(host,hooks);const enabled=host.querySelector('#travel-enabled');enabled.checked=true;enabled.dispatchEvent(new w.Event('change'));assert.equal(settings.travelEnabled,true);assert.deepEqual(settings.travelHomeCity,home);assert.equal(settings.city.timezone,home.timezone);
host.querySelector('#travel-away-city').click();chosen(away);assert.equal(settings.travelCity.name,'Медина');assert.equal(settings.city.name,'Тюмень','Editing an inactive slot cannot change the active timetable');assert.equal(before,0);
host.innerHTML=api.travelHomeMarkup()+'<button class="central-prayer timetable">Table</button>';api.bindTravelHome(host,hooks);host.querySelector('[data-travel-side=away]').click();assert.equal(settings.city.name,'Медина');assert.equal(settings.city.timezone,'Asia/Riyadh');assert.equal(before,1);assert.equal(changes.at(-1).cityChanged,true);assert.equal(settings.travelHomeCity.name,'Тюмень');
const reloaded=normalizeSettings(JSON.parse(saved.get('salah:settings')),{strict:true});assert.deepEqual(reloaded,settings);assert.equal(reloaded.travelActive,'away');
updateSettings(api.travelCitySelection({...away,timezone:'Asia/Qatar'}));assert.equal(settings.travelCity.timezone,'Asia/Qatar');assert.equal(settings.travelHomeCity.timezone,'Asia/Yekaterinburg');
api.mountTravelSettings(host,hooks);const disable=host.querySelector('#travel-enabled');disable.checked=false;disable.dispatchEvent(new w.Event('change'));assert.equal(settings.city.name,'Тюмень');assert.equal(settings.travelEnabled,false);assert.equal(settings.travelActive,'home');assert.equal(settings.travelCity.name,'Медина');
assert.equal(normalizeSettings({city:home,travelEnabled:true,travelActive:'away'}).travelActive,'home');assert.throws(()=>normalizeSettings({travelCity:{...away,timezone:'Invalid/City'}},{strict:true}));assert.throws(()=>normalizeSettings({travelActive:'bad'},{strict:true}));
updateSettings({travelEnabled:true,travelHomeCity:home,travelCity:away,travelActive:'home',city:home});host.innerHTML=api.travelHomeMarkup()+'<button class="central-prayer timetable">Table</button>';api.bindTravelHome(host,hooks);const surface=host.querySelector('.central-prayer');let clickCount=0;surface.onclick=()=>clickCount++;
function pointer(type,x,y,extra={}){surface.dispatchEvent(new w.PointerEvent(type,{bubbles:true,pointerId:1,isPrimary:true,button:0,clientX:x,clientY:y,...extra}));}
pointer('pointerdown',200,200);pointer('pointerup',100,205);surface.click();assert.equal(settings.travelActive,'away');assert.equal(clickCount,0,'A swipe cannot also open the central button');
pointer('pointerdown',100,200);pointer('pointerup',200,205);surface.click();assert.equal(settings.travelActive,'home');
pointer('pointerdown',200,200);pointer('pointerup',180,400);surface.click();assert.equal(settings.travelActive,'home');assert.equal(clickCount,1,'Vertical scrolling does not switch cities');
pointer('pointerdown',200,200);pointer('pointerdown',200,200,{pointerId:2,isPrimary:false});pointer('pointerup',100,200);assert.equal(settings.travelActive,'home');
for(const [dx,dy,ms]of [[40,0,200],[100,150,200],[100,0,2000]])assert.equal(api.isTravelSwipe(dx,dy,ms),false);assert.equal(api.isTravelSwipe(-100,5,200),true);
// Backup validation retains both cities and the active slot.
const {createBackup,validateBackup}=await import('../dist/js/backup.js');const personal={length:saved.size,key:i=>[...saved.keys()][i],getItem:k=>saved.get(k)??null};const backup=createBackup({storage:personal,settings,history:{}});assert.deepEqual(validateBackup(backup).backup.settings,settings);
// The real app uses the active settings city for widget, day and all reminder context.
const app=await fs.readFile(new URL('../dist/js/app.js',import.meta.url),'utf8');for(const anchor of ['bindTravelHome(app,travelHooks)','onBeforeChange(){reminders.reset();calendarRequestId++;days={}','if(cityChanged)refresh(false,false)','syncNativePrayerWidget({city:settings.city','getSettings:()=>settings','updateSettings(travelCitySelection({...settings.city,timezone}))'])assert.ok(app.includes(anchor),anchor);
await w.happyDOM.close();console.log('PASS: two validated localities, persistence and backup, active timezone, independent home, disable restores home, edit slots, horizontal swipe vs scroll/pinch, click suppression and real notification/widget integration.');
