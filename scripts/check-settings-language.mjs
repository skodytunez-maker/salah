import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import{settingsSectionLabel}from '../dist/js/settings-section-label.js';
import{Window}from '../tests/staff/node_modules/happy-dom/lib/index.js';

const win=new Window({url:'https://fixture.invalid/#settings?section=appearance'}),doc=win.document;
Object.assign(globalThis,{window:win,document:doc,localStorage:win.localStorage,sessionStorage:win.sessionStorage,Event:win.Event,CustomEvent:win.CustomEvent});
globalThis.fetch=async()=>{throw Error('Network is forbidden in Settings language checks');};
doc.body.innerHTML='<main id="app"></main><dialog id="modal"><div id="modal-content"></div></dialog><div id="toast" hidden></div>';
const[{t,setInterfaceLanguage,translateUi,getLocale,subscribeLanguage},{initializeInterfaceLanguage},{esc,modal,closeModal},{latestRequest},{mountCacheSettings},{validateBackup,createBackup,restoreBackup},{settings,updateSettings},{releaseDate,updateStatusMessage}]=await Promise.all([
 import('../dist/js/i18n.js'),import('../dist/js/language-settings.js'),import('../dist/js/ui.js'),import('../dist/js/city-data.js'),import('../dist/js/storage-cache.js'),import('../dist/js/backup.js'),import('../dist/js/storage.js'),import('../dist/js/pwa-updates.js')
]);
updateSettings({uiLanguage:'ru',city:{name:'Настройки',latitude:57.15,longitude:65.53,timezone:'Asia/Yekaterinburg'},method:3,school:1});
const stopLanguage=initializeInterfaceLanguage({doc,win}),app=doc.getElementById('app');
async function fixture(file,names,deps={}){
 const source=await fs.readFile(new URL('../dist/js/'+file+'.js',import.meta.url),'utf8');
 return vm.runInNewContext(source.replace(/^import.*\r?\n/gm,'').replace(/export /g,'')+';({'+names.join(',')+'});',{document:doc,window:win,navigator:win.navigator,localStorage:win.localStorage,t,translateUi,getLocale,subscribeLanguage,settingsSectionLabel,esc,modal,closeModal,toast(){},setTimeout,clearTimeout,Intl,...deps});
}
// A city lookup remains the same request/form. Typed city names and server results
// are not translation keys, including a city whose name is a Russian UI label.
const city={name:'Настройки',country:'Россия',latitude:57.15,longitude:65.53,timezone:'Asia/Yekaterinburg'};
let finishSearch,chosen=null,searchCalls=0;
const cityApi=await fixture('city-dialog',['openCityDialog'],{personalDataAllowed:()=>true,localCities:()=>[city],latestRequest,searchCities:()=>{searchCalls++;return new Promise(resolve=>finishSearch=resolve);},locateCity:async()=>city,getDevicePosition:async()=>({coords:{latitude:57.15,longitude:65.53}})});
cityApi.openCityDialog(city,value=>{chosen=value;});
const form=doc.getElementById('city-search'),input=doc.getElementById('city-name'),results=doc.getElementById('city-results');
input.value='Ме';input.dispatchEvent(new win.Event('input',{bubbles:true}));
assert.equal(doc.getElementById('city-status').textContent,t('cityUi.fullSearchLetter'));
setInterfaceLanguage('en');assert.equal(input.value,'Ме');assert.equal(doc.getElementById('city-search'),form);assert.equal(input.placeholder,t('cityUi.example'));
assert.equal(doc.getElementById('city-status').textContent,t('cityUi.fullSearchLetter'));
setInterfaceLanguage('de');assert.equal(input.value,'Ме');assert.equal(doc.getElementById('city-search'),form);assert.equal(input.placeholder,t('cityUi.example'));assert.equal(doc.getElementById('city-status').textContent,t('cityUi.fullSearchLetter'));
assert.equal(results.querySelector('button span').textContent,city.name);assert.equal(results.querySelector('button span').hasAttribute('data-i18n'),false);
input.value='Медина';form.dispatchEvent(new win.Event('submit',{bubbles:true,cancelable:true}));assert.equal(searchCalls,1);
assert.equal(doc.getElementById('city-status').textContent,t('cityUi.searching'));
setInterfaceLanguage('ru');assert.equal(doc.getElementById('city-status').textContent,t('cityUi.searching'));assert.equal(searchCalls,1);
finishSearch([city]);await new Promise(resolve=>setTimeout(resolve,0));assert.equal(doc.getElementById('modal').open,true);assert.ok(results.querySelector('button'));results.querySelector('button').click();assert.equal(chosen,city);closeModal();

// Language changes update atmosphere copy without overwriting an unsaved slider.
app.innerHTML='<div id="ambient-sound-settings"></div>';
let stateListener,unsubscribed=0;
const audio={unlock:async()=>{},previewVolume:async()=>{},subscribe(fn){stateListener=fn;fn({enabled:true,sound:'wind',volume:22,supported:true,reason:'tap'});return()=>unsubscribed++;}};
const ambient=await fixture('ambient-settings',['mountAmbientSettings'],{initAmbientAudio:()=>audio,updateSettings:()=>true});
ambient.mountAmbientSettings(app);const headingIcon=app.querySelector('.ambient-settings summary .settings-section-icon');assert(headingIcon,'Atmosphere heading has a decorative icon');assert.equal(headingIcon.getAttribute('aria-hidden'),'true');const range=app.querySelector('#ambient-volume'),toggle=app.querySelector('#ambient-enabled');range.value='47';
setInterfaceLanguage('en');assert.equal(app.querySelector('.ambient-settings summary .settings-section-icon'),headingIcon,'Translation retains the icon instead of replacing the entire summary');assert.equal(app.querySelector('.ambient-settings summary [data-i18n]').textContent,t('ambientUi.title'));assert.equal(app.querySelector('#ambient-volume'),range);assert.equal(range.value,'47');assert.equal(toggle.checked,true);assert.equal(app.querySelector('.ambient-status').textContent,t('ambientUi.tap'));assert.equal(app.querySelector('#ambient-sound').value,'wind');
stateListener({enabled:true,sound:'wind',volume:22,supported:true,reason:'foreground'});setInterfaceLanguage('ru');assert.equal(app.querySelector('.ambient-status').textContent,t('ambientUi.foreground'));
ambient.mountAmbientSettings(app);assert.equal(unsubscribed,1,'Replacing atmosphere settings disposes its old audio subscription');

// Section placement uses an explicit key rather than searching Russian text.
app.innerHTML='<div class="settings-grid"><details class="settings-group"><summary><span data-i18n="settings.appearance"></span></summary><div class="settings-group-body"></div></details></div>';translateUi(app);setInterfaceLanguage('en');
const depth=await fixture('soft-depth',['mountSoftDepthSetting']);depth.mountSoftDepthSetting(app);
const depthToggle=app.querySelector('#soft-depth');assert.equal(app.querySelectorAll('.settings-grid>.settings-group').length,1);assert.ok(app.querySelector('.settings-group-body #soft-depth'));depthToggle.checked=false;
setInterfaceLanguage('ru');assert.equal(app.querySelector('#soft-depth'),depthToggle);assert.equal(depthToggle.checked,false);assert.equal(app.querySelector('[data-i18n="softDepthUi.enabled"]').textContent,t('softDepthUi.enabled'));

// Built-in labels translate, selected catalogue cities remain untouched, and the
// locale-aware ordering still gives Russian alphabetical order in Russian.
app.innerHTML='<button id="wallpaper-toggle"></button><details id="wallpaper-picker"><span id="wallpaper-name"></span><select id="wallpaper-select"></select><p id="landmark-status"></p></details>';
const scene={wallpaper:'landmark',landmarkCity:'fixture'},catalogue=[{id:'fixture',name:'Настройки'},{id:'b',name:'Бухара'},{id:'a',name:'Астана'}];
const landmarks=await fixture('landmark-settings',['mountLandmarkSettings'],{settings:scene,updateSettings:patch=>{Object.assign(scene,patch);return true;},loadLandmark:{catalogue:async()=>catalogue},wallpapers:[{id:'mosque',name:'Мечеть'},{id:'new-york',name:'Нью-Йорк'}]});
landmarks.mountLandmarkSettings(app);await new Promise(resolve=>setTimeout(resolve,0));
const select=app.querySelector('#wallpaper-select'),labels=[...select.options].slice(1).map(option=>option.textContent);
assert.deepEqual(labels,[...labels].sort(new Intl.Collator('ru-RU',{sensitivity:'base',numeric:true}).compare));
setInterfaceLanguage('en');assert.equal(select.value,'landmark:fixture');assert.equal(app.querySelector('#wallpaper-name').textContent,'Настройки');assert.equal(app.querySelector('#wallpaper-name').hasAttribute('data-i18n'),false);
assert.equal(select.querySelector('[value="wallpaper:mosque"]').textContent,t('landmarkUi.mosque'));

// Pending cache confirmation and its progress/status remain the same nodes. No
// operation is triggered by translation, and byte values are formatted locally.
app.innerHTML='<div id="cache"></div>';const cache=app.firstElementChild;let clearCalls=0,finishClear;
const disposeCache=mountCacheSettings(cache,{list:async()=>[{bytes:1572864}],clear:()=>{clearCalls++;return new Promise(resolve=>finishClear=resolve);}});await Promise.resolve();await Promise.resolve();
assert.equal(cache.querySelector('[data-cache-size]').textContent,t('cacheUi.size',{count:1,size:'1.5'}));
cache.querySelector('[data-clear-cache]').click();const confirm=doc.querySelector('[data-confirm-cache]');setInterfaceLanguage('ru');assert.equal(doc.querySelector('[data-confirm-cache]'),confirm);assert.equal(clearCalls,0);
assert.equal(cache.querySelector('[data-cache-size]').textContent,t('cacheUi.size',{count:1,size:'1,5'}));
confirm.click();assert.equal(clearCalls,1);assert.equal(confirm.disabled,true);setInterfaceLanguage('en');assert.equal(confirm.textContent,t('cacheUi.clearing'));assert.equal(cache.querySelector('[data-cache-result]').textContent,t('cacheUi.clearingCache'));assert.equal(clearCalls,1);
finishClear();await Promise.resolve();await Promise.resolve();disposeCache();

// Language is presentation only: prepared-backup fingerprints and confirmation
// remain required, and a language switch cannot alter personal data in a backup.
setInterfaceLanguage('ru');assert.throws(()=>validateBackup('{'),error=>error.message===t('backupUi.json'));
const backup=createBackup({storage:win.localStorage,settings,history:{}}),prepared=validateBackup(backup),fingerprint=JSON.stringify(prepared);
setInterfaceLanguage('en');assert.throws(()=>validateBackup('{'),error=>error.message===t('backupUi.json'));
assert.equal(JSON.stringify(prepared),fingerprint);assert.throws(()=>restoreBackup(prepared),error=>error.message===t('backupUi.confirmFirst'));
assert.equal(updateStatusMessage('offline'),t('pwaUi.offline'));assert.equal(updateStatusMessage('unknown'),'');assert.equal(releaseDate('2026-11-15'),'15 November 2026');assert.equal(releaseDate('2026-02-31'),'');
stopLanguage();win.happyDOM.abort();
console.log('PASS: RU/EN Settings modules translate requests, error/busy states, cache sizes, backup validation and update status in place; city names, pending forms/operations, audio drafts, method identifiers and prepared fingerprints remain unchanged. No browser or network.');
