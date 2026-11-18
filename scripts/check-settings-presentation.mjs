import assert from 'node:assert/strict';
import{readFile}from 'node:fs/promises';
import vm from 'node:vm';
import{Window}from '../tests/staff/node_modules/happy-dom/lib/index.js';
import{t,setInterfaceLanguage,translateUi}from '../dist/js/i18n.js';
import{esc}from '../dist/js/ui.js';
import{settingsSectionLabel}from '../dist/js/settings-section-label.js';
const source=await readFile(new URL('../dist/js/app.js',import.meta.url),'utf8');
const functionStart=source.indexOf('function settingsPage(){');
const expression=source.slice(functionStart).match(/app\.innerHTML=([\s\S]*?);reminders\.mountSettings/)[1];
const icons=source.slice(source.indexOf('const settingsIconPaths='),source.indexOf('let historyPeriod='));
const settings={city:null,method:3,school:0,backgroundMode:'auto',liveSky:false,weather:true,weatherAnimation:true,transitions:true,motion:false,haptic:true};
for(const owner of [false,true])for(const language of ['ru','en','de','az','kk','tg','uz','ar']){
 setInterfaceLanguage(language);const w=new Window({width:393,height:852,url:'https://fixture.invalid/#settings?section=appearance'}),d=w.document;
 const context={t,esc,settings,settingsSectionLabel,canUseAdvancedSky:()=>owner,title:label=>'<h1>'+esc(label)+'</h1>',methods:{3:'Fixture method'},tyumenSourceSettings:()=>'',usesAlHakk:()=>false,prayers:['Fajr','Dhuhr','Asr','Maghrib','Isha'].map(k=>[k,k]),prayerOffsetValues:()=>({}),formatTime:()=>'',timingsFor:()=>({}),dateKey:()=>'',days:{},weatherLabel:()=>'',languageSettingsMarkup:()=>'',nativeUpdateRuntime:()=>false,APP_VERSION:524,APP_UPDATED_AT:'2026-11-19',APP_UPDATE_DATE:'19 ноября 2026'};
 const markup=vm.runInNewContext(icons+';('+expression+')',context);d.body.innerHTML=markup;translateUi(d.body);
 const sky=d.querySelector('[for="live-sky"]');assert.equal(sky.hidden,!owner);assert.equal(sky.style.display,owner?'':'none');assert(!d.querySelector('#live-sky-hint'));assert(!d.querySelector('[aria-describedby="live-sky-hint"]'));
 for(const key of ['live-sky','transitions','weather','weatherAnimation','motion','haptic']){const input=d.getElementById(key),label=d.querySelector('label[for="'+key+'"]');assert(label.querySelector('.settings-section-icon[aria-hidden="true"]'));assert(label.querySelector('[data-i18n]').textContent);assert.equal(input.type,'checkbox');assert.equal(input.checked,settings[key==='live-sky'?'liveSky':key]);}
 const jumuah=d.querySelector('#jumuah-settings').closest('details');assert(jumuah.classList.contains('settings-subsection'));assert(jumuah.querySelector('summary .settings-section-icon'));assert.equal(jumuah.querySelector('[data-i18n]').textContent,t('settingsExtra.jumuah'));
 await w.happyDOM.close();
}
console.log('PASS actual Settings markup in eight languages: owner-only sky stays hidden publicly, six decorated labels retain native controls, no dangling hint, and Jumuah matches the subsection hierarchy. No browser rendering or settings writes.');
