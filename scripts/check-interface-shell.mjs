import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import{Window}from '../tests/staff/node_modules/happy-dom/lib/index.js';
import{ADVANCED_SKY_AVAILABLE}from '../dist/js/sky-feature-policy.js';

const win=new Window({url:'https://fixture.invalid/#settings?section=appearance'}),doc=win.document;Object.defineProperty(doc,'hidden',{value:false,writable:true,configurable:true});
Object.assign(globalThis,{window:win,document:doc,localStorage:win.localStorage,Event:win.Event,CustomEvent:win.CustomEvent});
globalThis.fetch=async()=>{throw Error('No network in interface-shell checks');};
doc.body.innerHTML='<nav id="desktop-nav"></nav><nav id="mobile-nav"></nav><button id="location-button"></button><main id="app"></main><div id="toast" hidden></div><p id="private-text" lang="ar" dir="rtl">الحمد لله · Меню</p>';
const[{t,setInterfaceLanguage,translateUi,getLocale,getLanguage,subscribeLanguage},{initializeInterfaceLanguage,languageSettingsMarkup,mountLanguageSettings},{settings,updateSettings},{mountSettingsScreens},{PrayerDisplay},{esc,title},{prayers},{initGlassInterface,mountGlassSettings}]=await Promise.all([
 import('../dist/js/i18n.js'),import('../dist/js/language-settings.js'),import('../dist/js/storage.js'),import('../dist/js/settings-screens.js'),import('../dist/js/prayer-display.js'),import('../dist/js/ui.js'),import('../dist/js/prayers.js'),import('../dist/js/glass-settings.js')
]);
updateSettings({uiLanguage:'ru',city:{name:'Настройки',latitude:57.1522,longitude:65.5272,timezone:'Asia/Yekaterinburg'},school:1,liveSky:true});
const stopGlassInterface=initGlassInterface({doc,win});
const stopLanguage=initializeInterfaceLanguage({doc,win}),app=doc.getElementById('app'),privateText=doc.getElementById('private-text').textContent;
const source=await fs.readFile(new URL('../dist/js/app.js',import.meta.url),'utf8');
assert.ok(source.indexOf('initializeInterfaceLanguage();')<source.indexOf('mountQuranPlayer();'),'Interface language is initialized before the first app/player render');
assert.ok(source.indexOf('initGlassInterface();')<source.indexOf('mountQuranPlayer();'),'Saved glass styles initialize before the first player/render');
assert.ok(source.includes("new Intl.DateTimeFormat('en-US'"),'The machine Friday predicate remains in its fixed locale');
const names={morning:'Утренние азкары',evening:'Вечерние азкары'},adhkarSource=await fs.readFile(new URL('../dist/js/adhkar.js',import.meta.url),'utf8');
const adhkarCard=vm.runInNewContext(adhkarSource.split(/\r?\n/).find(line=>line.startsWith('export function adhkarHomeCard')).replace('export ','' )+';adhkarHomeCard;',{names,icon:()=>'<svg aria-hidden="true"></svg>',esc,t});
let owner=false,ownerChecks=0,resolveOwnerCheck,account={signedIn:true,nickname:null},renders=0,previewCalls=0,clock=Date.parse('2026-11-15T08:00:00+05:00');
const day='2026-11-15',times={Fajr:clock+100000,Sunrise:clock+200000,Dhuhr:clock+300000,Asr:clock+400000,Maghrib:clock+500000,Isha:clock+600000};
let next={key:'Fajr',name:'Фаджр',time:times.Fajr,day};
const ctx=vm.createContext({ADVANCED_SKY_AVAILABLE,app,document:doc,window:win,location:win.location,settings,t,translateUi,getLocale,esc,title,languageSettingsMarkup,mountLanguageSettings,
 stopSettingsScreens:null,stopLanguageSettings:null,stopGlassSettings:null,mountGlassSettings:node=>mountGlassSettings(node,{doc,win}),mountSettingsScreens:node=>mountSettingsScreens(node,{win}),currentRoute:'settings',counterSyncStatus:()=>account,ownerVerified:()=>owner,verifyOwner:()=>{ownerChecks++;return new Promise(resolve=>{resolveOwnerCheck=resolve;});},
 teamPreviewVerified:()=>false,bindAppSharing(){},appSharingMarkup:()=>'<div class="app-share-row">Пригласить друзей</div>',mountMenuAvatar(){},
 reminders:{mountSettings(){},mountTahajjud(){},mountJumuah(){},reset(){},tick(){}},usesAlHakk:()=>false,tyumenSourceSettings:()=>'',prayers,methods:{3:'Muslim World League',5:'Egyptian General Authority'},
 prayerOffsetValues:()=>settings.offsets,timingsFor:()=>times,dateKey:()=>day,formatTime:time=>Number.isFinite(time)?'08:00':'—',nativeUpdateRuntime:()=>false,APP_VERSION:500,APP_UPDATED_AT:'2026-11-15',APP_UPDATE_DATE:'15 ноября 2026',
 cityDialog(){},ensureTahajjudDays:async()=>{},mountAmbientSettings(){},mountLandmarkSettings(){},mountPrayerOffline(){},mountCacheSettings(){},mountTravelSettings(){},travelHooks:{},mountSoftDepthSetting(){},mountDiagnosticSetting(){},personalDataAllowed:()=>true,errorReporter:{},
 weatherLabel:()=>'',weatherDialog(){},startScenePreview(){previewCalls++;},startWeatherPreview(){previewCalls++;},installApp(){},showAppRelease(){},exportData(){},importData(){},updateSettings,toast(){},refresh(){renders++;},render(){renders++;},tick:null,
 calendarRequestId:0,currentDay:day,lastTick:clock,loading:false,days:{[day]:{timings:Object.fromEntries(Object.entries(times).map(([key,value])=>[key,new Date(value).toISOString()]))}},
 adhkarPeriod:()=> 'morning',adhkarHomeCard:adhkarCard,updateAdhkarPeriod(){},canResumePreviousEvening:()=>false,nextPrayer:()=>next,homeEvent:(_now,value)=>value,
 countdown:()=> '00:01:40',asrInfo:()=>null,tahajjudEntry:()=>({text:'01:30',label:'Личный текст расчёта'}),atmosphere(){},weather:null,lastWeatherCheck:0,WEATHER_REFRESH_INTERVAL:60000,weatherBusy:false,refreshWeather(){},
 Date:class extends Date{static now(){return clock;}}
});
ctx.uiLeaf=(await import('../dist/js/ui.js')).uiLeaf;
vm.runInContext(source.slice(source.indexOf('const settingsIconPaths='),source.indexOf("let historyPeriod='month'")),ctx);
vm.runInContext(source.split(/\r?\n/).find(line=>line.startsWith('const routes=')),ctx);
for(const name of ['nav','settingsPage','tick','updateSettingsTranslations'])vm.runInContext(source.split(/\r?\n/).find(line=>line.startsWith('function '+name+'(')),ctx);
const stopSettingsCopy=subscribeLanguage(ctx.updateSettingsTranslations);
vm.runInContext(source.slice(source.indexOf('function more(){'),source.indexOf("window.addEventListener('salah:counter-status'")),ctx);

ctx.nav();ctx.settingsPage();
assert.deepEqual([...doc.querySelectorAll('#mobile-nav [data-i18n]')].map(node=>node.textContent),['Главная','Знания','Коран','Азкары','Меню']);
assert.equal(doc.getElementById('location-button').textContent,'Настройки');assert.equal(doc.getElementById('location-button').hasAttribute('data-i18n'),false,'A selected city is user data, never a placeholder to translate');
assert.equal(app.querySelector('.page-head h1').textContent,'Оформление и атмосфера');
const form=doc.getElementById('settings-form'),offset=doc.getElementById('offset-Fajr'),method=doc.getElementById('method'),weather=doc.getElementById('weather'),picker=app.querySelector('[data-interface-language]');
assert.equal(ADVANCED_SKY_AVAILABLE,false,'The actual public availability policy, not a fixture override, governs Settings');
const assertPublicAppearance=()=>{
 for(const id of ['live-sky']){const row=doc.getElementById(id).closest('label');assert.equal(row.hidden,true);assert.equal(win.getComputedStyle(row).display,'none','An explicit display rule also defeats the existing switch-row layout');}
 for(const id of ['live-sky-hint']){const node=doc.getElementById(id);assert.equal(node.hidden,true);assert.equal(win.getComputedStyle(node).display,'none');}
 for(const button of doc.querySelectorAll('[data-background-mode]')){assert.equal(button.hidden,false);assert.notEqual(win.getComputedStyle(button).display,'none','Basic Day/Night/Auto photo choices remain accessible');}
 const visibleControls=[...app.querySelectorAll('input,select,button,a[href]')].filter(node=>!node.closest('[hidden]')&&win.getComputedStyle(node).display!=='none');
 assert.ok(visibleControls.every(node=>!['live-sky'].includes(node.id)),'Closed advanced controls are absent from the visible keyboard control set');
};
assertPublicAppearance();for(const id of ['weather','weatherAnimation','scene-preview','weather-preview']){const node=doc.getElementById(id),row=node.closest('label')||node;assert.equal(row.hidden,false);assert.notEqual(win.getComputedStyle(row).display,'none','Existing weather and demo controls remain available to ordinary users');}assert.equal(doc.getElementById('live-sky').disabled,true,'A stored preference cannot bypass the verified-owner gate');
const savedBeforeHiddenHandler=localStorage.getItem('salah:settings'),liveSwitch=doc.getElementById('live-sky'),routeBeforeHiddenHandler=win.location.hash;
liveSwitch.checked=true;liveSwitch.dispatchEvent(new win.Event('change',{bubbles:true}));assert.equal(liveSwitch.checked,settings.liveSky);assert.equal(localStorage.getItem('salah:settings'),savedBeforeHiddenHandler,'A direct hidden toggle event cannot save an opt-in');
doc.getElementById('scene-preview').click();doc.getElementById('weather-preview').click();assert.equal(previewCalls,2,'Both existing demos remain available without enabling advanced sky');assert.equal(win.location.hash,'#home');win.location.hash=routeBeforeHiddenHandler;
offset.value='17';method.value='5';weather.checked=true;
const groups=[...form.querySelectorAll('.settings-grid>.settings-group')],keys=['city','appearance','language','reminders','data','application'],groupFor=key=>groups.find(group=>group.dataset.settingsSection===key),route=hash=>{win.location.hash=hash;assert.equal(app.settingsHandleRoute(hash),true);};
assert.deepEqual(groups.map(group=>group.dataset.settingsSection),keys,'The visible language row follows Appearance, and every group owns a stable route key');assert.equal(app.querySelectorAll('[data-interface-language]').length,1);assert.equal(groupFor('language').querySelector('[data-interface-language]'),picker);assert.equal(groupFor('application').querySelector('[data-interface-language]'),null);assert.equal(groupFor('appearance').querySelector('[data-interface-language]'),null);
route('#settings');assert.ok(groups.every(group=>!group.hidden&&!group.open));assert.equal(groupFor('language').querySelector('summary [data-i18n]').textContent,t('language.interface'));
// Moving a group cannot redirect another section to its old array index.
const grid=form.querySelector('.settings-grid');grid.append(groupFor('appearance'));for(const key of keys){route('#settings?section='+key);assert.equal(groupFor(key).open,true);assert.ok(groups.filter(group=>group!==groupFor(key)).every(group=>group.hidden));assert.equal(form,doc.getElementById('settings-form'));}grid.replaceChildren(...groups);route('#settings?section=appearance');
const audio=doc.createElement('audio'),seek=doc.createElement('input');audio.id='fixture-quran-audio';seek.type='range';seek.value='37';doc.body.append(audio,seek);let audioActions=0;audio.currentTime=37;audio.play=audio.pause=()=>{audioActions++;};
await new Promise(resolve=>setImmediate(resolve));assert.equal(ownerChecks,1);for(let attempt=0;attempt<4;attempt++)app.updateSkyAccess();assert.equal(ownerChecks,1,'Repeated UI ticks do not start another pending owner check');assertPublicAppearance();owner=true;resolveOwnerCheck(true);await new Promise(resolve=>setImmediate(resolve));assert.equal(liveSwitch.closest('label').hidden,false,'A completed asynchronous owner check reveals the control in the existing form');assert.equal(liveSwitch.disabled,false);assert.equal(form,doc.getElementById('settings-form'));assert.equal(offset.value,'17');assert.equal(method.value,'5');assert.equal(audioActions,0);clock+=45000;app.updateSkyAccess();app.updateSkyAccess();await new Promise(resolve=>setImmediate(resolve));assert.equal(ownerChecks,2,'A verified owner renews once before the 60-second grant expires');for(let attempt=0;attempt<4;attempt++)app.updateSkyAccess();assert.equal(ownerChecks,2,'Pending renewal is shared across UI ticks');resolveOwnerCheck(true);await new Promise(resolve=>setImmediate(resolve));assert.equal(form,doc.getElementById('settings-form'));assert.equal(offset.value,'17');owner=false;app.updateSkyAccess();assertPublicAppearance();assert.equal(ownerChecks,2,'Ordinary users are not polled for owner authority');
owner=true;app.updateSkyAccess();const checksBeforeResume=ownerChecks;doc.hidden=true;doc.dispatchEvent(new win.Event('visibilitychange'));clock+=65000;owner=false;app.updateSkyAccess();assertPublicAppearance();assert.equal(ownerChecks,checksBeforeResume,'An expired hidden grant does not trigger background polling');doc.hidden=false;doc.dispatchEvent(new win.Event('visibilitychange'));win.dispatchEvent(new win.Event('pageshow'));await new Promise(resolve=>setImmediate(resolve));assert.equal(ownerChecks,checksBeforeResume+1,'Returning after grant expiry starts one verification for the previously server-verified owner');assert.equal(form,doc.getElementById('settings-form'));assert.equal(offset.value,'17');assert.equal(audioActions,0);owner=true;resolveOwnerCheck(true);await new Promise(resolve=>setImmediate(resolve));assert.equal(liveSwitch.closest('label').hidden,false);assert.equal(liveSwitch.disabled,false);owner=false;app.updateSkyAccess({ownerChanged:true});clock+=65000;doc.dispatchEvent(new win.Event('visibilitychange'));win.dispatchEvent(new win.Event('pageshow'));await new Promise(resolve=>setImmediate(resolve));assert.equal(ownerChecks,checksBeforeResume+1,'An explicit role revocation clears retry eligibility; ordinary users are not repeatedly queried');assertPublicAppearance();ctx.lastTick=clock;
const glassHost=doc.getElementById('glass-settings'),glassMode=glassHost.querySelector('#glass-enabled'),glassRange=glassHost.querySelector('#glass-table-transparency'),glassSection=glassHost.firstElementChild;assert.equal(glassHost.closest('[data-settings-section]').dataset.settingsSection,'appearance');assert.equal(doc.documentElement.hasAttribute('data-glass-mode'),false);glassMode.checked=true;glassMode.dispatchEvent(new win.Event('change',{bubbles:true}));glassRange.value='100';glassRange.dispatchEvent(new win.Event('input',{bubbles:true}));assert.equal(Number(doc.documentElement.style.getPropertyValue('--glass-table-alpha')),.74);assert.equal(settings.glassTableTransparency,80);
const summaryIcons=app.querySelectorAll('.settings-group>summary svg').length;
for(const language of ['en','de','az','tg','uz','kk','ar','ru']){
 groupFor('language').querySelector('summary').click();assert.equal(win.location.hash,'#settings?section=language');assert.equal(groupFor('language').open,true);assert.equal(groupFor('language').hidden,false);picker.focus();
 picker.value=language;picker.dispatchEvent(new win.Event('change',{bubbles:true}));
 assert.equal(getLanguage(),language);assert.equal(doc.documentElement.lang,language);
 assert.equal(doc.documentElement.dir,language==='ar'?'rtl':'ltr');assert.equal(doc.activeElement,picker);assert.equal(app.querySelector('.page-head h1').textContent,t('language.interface'));assert.equal(settings.uiLanguage,language);assert.equal(audio.currentTime,37);assert.equal(seek.value,'37');assert.equal(audioActions,0);
 app.querySelector('.settings-screen-back').click();await new Promise(resolve=>setImmediate(resolve));assert.equal(win.location.hash,'#settings');assert.equal(app.settingsHandleRoute(win.location.hash),true);assert.ok(groups.every(group=>!group.hidden&&!group.open));groupFor('appearance').querySelector('summary').click();
 assert.equal(doc.getElementById('settings-form'),form);assert.equal(doc.getElementById('offset-Fajr'),offset);assert.equal(offset.value,'17');assert.equal(method.value,'5');assert.equal(weather.checked,true);
 assert.equal(app.querySelector('.page-head h1').textContent,t('settings.appearance'),'The settings heading reads the translated summary live');
 assert.equal(app.querySelector('.settings-screen-back').textContent,t('common.backSettings'));assert.equal(app.querySelector('[data-i18n="common.saveSettings"]').textContent,t('common.saveSettings'));
 assert.equal(app.querySelectorAll('.settings-group>summary svg').length,summaryIcons,'Translating a leaf preserves its icon');
 assert.equal(doc.getElementById('location-button').textContent,'Настройки');assert.equal(doc.getElementById('private-text').textContent,privateText);
 assert.equal(doc.querySelector('label[for="method"]').textContent,t('settingsExtra.method'));
 assert.equal(doc.querySelector('label[for="offset-Fajr"]').textContent,t('home.fajr'));
 assert.equal(offset.getAttribute('aria-label'),t('settingsExtra.offsetLabel',{name:t('home.fajr')}));
 assert.equal(doc.querySelector('[data-offset-label="less"]').getAttribute('aria-label'),t('settingsExtra.offsetLess',{name:t('home.fajr')}));
 assert.equal(doc.querySelector('#change-city span').textContent,'Настройки');assert.equal(doc.querySelector('#change-city span').hasAttribute('data-i18n'),false);
 assert.equal(doc.querySelector('#school').value,'1');assert.equal(doc.querySelector('#school [value="1"]').textContent,t('settingsExtra.schoolHanafi'));
 assert.equal(doc.querySelector('#wallpaper-select').getAttribute('aria-label'),t('settingsExtra.chooseWallpaper'));
 assert.equal(doc.querySelector('#check-update span').textContent,t('settingsExtra.update'));
 assertPublicAppearance();
 assert.equal(renders,0,'Changing language cannot reload, refresh forms or reset playback');
 assert.equal(glassHost.firstElementChild,glassSection);assert.equal(doc.getElementById('glass-table-transparency'),glassRange);assert.equal(glassRange.value,'100');assert.equal(Number(doc.documentElement.style.getPropertyValue('--glass-table-alpha')),.74,'An unsaved glass preview survives in-place language and owner updates');assert.equal(settings.glassTableTransparency,80);assert.equal(glassHost.querySelector('summary').textContent,t('glassUi.title'));assert.equal(glassRange.dir,'ltr');
}
groupFor('language').querySelector('summary').click();assert.deepEqual([...picker.options].map(option=>option.value),['ru','en','az','tg','uz','kk','de','ar']);assert.equal(picker.querySelector('[value="auto"]'),null);assert.equal(picker.textContent.includes('Как на телефоне'),false);updateSettings({uiLanguage:'auto'});assert.equal(settings.uiLanguage,'auto');assert.equal(picker.value,getLanguage(),'Automatic mode displays the current phone language among the eight manual choices');const autoPreference=localStorage.getItem('salah:settings');app.querySelector('.settings-screen-back').click();await new Promise(resolve=>setImmediate(resolve));app.settingsHandleRoute(win.location.hash);groupFor('language').querySelector('summary').click();assert.equal(localStorage.getItem('salah:settings'),autoPreference,'Opening Language cannot convert the automatic preference to manual');assert.equal(doc.getElementById('settings-form'),form);assert.equal(offset.value,'17');assert.equal(audio.currentTime,37);assert.equal(audioActions,0);picker.value='ru';picker.dispatchEvent(new win.Event('change',{bubbles:true}));
owner=true;app.updateSkyAccess();assert.equal(liveSwitch.closest('label').hidden,false);assert.equal(liveSwitch.disabled,false);assert.equal(form,doc.getElementById('settings-form'));assert.equal(offset.value,'17');assert.equal(method.value,'5');assert.equal(audioActions,0);owner=false;app.updateSkyAccess();assertPublicAppearance();assert.equal(liveSwitch.disabled,true);assert.equal(offset.value,'17');assert.equal(audio.currentTime,37);
liveSwitch.checked=true;form.dispatchEvent(new win.Event('submit',{bubbles:true,cancelable:true}));assert.equal(settings.liveSky,true);assert.equal(JSON.parse(localStorage.getItem('salah:settings')).liveSky,true,'Submitting an unavailable field preserves the stored choice while the runtime capability remains closed');assert.equal(doc.getElementById('settings-form'),form);assert.equal(audio.currentTime,37);assert.equal(audioActions,0);
assert.equal(Number(doc.documentElement.style.getPropertyValue('--glass-table-alpha')),.74,'Saving other Settings does not erase the live glass preview');ctx.stopGlassSettings();assert.equal(Number(doc.documentElement.style.getPropertyValue('--glass-table-alpha')),.792,'Disposing the old Settings mount restores the acknowledged level');ctx.stopLanguageSettings();ctx.stopSettingsScreens();stopSettingsCopy();

ctx.currentRoute='more';ctx.more();
assert.equal(app.querySelector('.menu-account-name').textContent,'Мой аккаунт');assert.equal(app.querySelector('.menu-account-name').getAttribute('data-i18n'),'menu.account');
setInterfaceLanguage('en');assert.equal(app.querySelector('.menu-account-name').textContent,'My account');assert.equal(app.querySelector('[data-i18n="menu.supportUser"]').textContent,t('menu.supportUser'));
account.nickname='Настройки';ctx.more();setInterfaceLanguage('de');assert.equal(app.querySelector('.menu-account-name').textContent,'Настройки');assert.equal(app.querySelector('.menu-account-name').hasAttribute('data-i18n'),false);
owner=true;ctx.more();assert.equal(app.querySelector('[data-i18n="menu.supportOwner"]').textContent,t('menu.supportOwner'));assert.equal(app.querySelector('a[href="#support?owner=1"]')!==null,true);

ctx.currentRoute='home';
app.innerHTML=PrayerDisplay({mode:'focus',next,times,hasCity:true,asr:{kind:'calculated',label:'PRIVATE ASR SOURCE'},nextAsr:{kind:'calculated'},tahajjud:{shown:true,text:'01:30',label:'Личный текст расчёта'}})+'<div id="home-adhkar-suggestion"></div>';
const prayerCodes=[...app.querySelectorAll('[data-prayer]')].map(node=>node.dataset.prayer),timeNodes=[...app.querySelectorAll('time')],timeValues=timeNodes.map(node=>node.textContent),toggle=app.querySelector('[data-time-toggle]');
for(const language of ['en','de','ar','ru']){
 setInterfaceLanguage(language);ctx.tick();
 assert.deepEqual([...app.querySelectorAll('[data-prayer]')].map(node=>node.dataset.prayer),prayerCodes);assert.deepEqual(timeNodes.map(node=>node.textContent),timeValues);
 assert.equal(app.querySelector('[data-prayer="Fajr"] [data-i18n]').textContent,t('home.fajr'));assert.equal(app.querySelector('#next-name').textContent,t('home.fajr'),'A regular timer tick cannot restore a Russian prayer label');
 assert.equal(toggle.getAttribute('aria-label'),t('home.showDaySchedule'));assert.equal(app.querySelector('[data-prayer="Asr"]').title,'PRIVATE ASR SOURCE');assert.equal(app.querySelector('[data-prayer="Tahajjud"]').title,'Личный текст расчёта');
 assert.equal(app.querySelector('.home-adhkar-prompt span').textContent,t('home.morningAdhkar'));
}
next={key:'Sunrise',name:'Восход',time:times.Sunrise,day};ctx.tick();assert.equal(app.querySelector('#next-prefix').textContent,'');assert.equal(app.querySelector('#next-prefix').hasAttribute('data-i18n'),false);setInterfaceLanguage('en');assert.equal(app.querySelector('#next-prefix').textContent,'','A language change cannot resurrect the prayer-only prefix for sunrise');assert.equal(app.querySelector('#next-name').textContent,t('home.sunrise'));
app.innerHTML=PrayerDisplay({mode:'timetable',next:null,times:null,loading:false,hasCity:false});assert.equal(app.querySelector('#next-name').textContent,t('home.selectCity'));assert.equal(app.querySelector('#next-note').textContent,t('home.selectCity'));

stopGlassInterface();stopLanguage();setInterfaceLanguage('ru');clearTimeout(win.toastTimer);await win.happyDOM.close();
console.log('PASS: actual shell/Home/Menu/settings language integration, live settings headings, preserved form drafts/icons/city/nickname/Arabic data, unchanged prayer codes/times and no render/audio reset; explicit dynamic placeholders remain correct after timer ticks. No browser or network.');
