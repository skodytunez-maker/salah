import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Script,createContext} from 'node:vm';
const source=await readFile(new URL('../dist/js/app.js',import.meta.url),'utf8');
const lines=source.split('\n');
const pick=prefix=>{const line=lines.find(line=>line.startsWith(prefix));assert.ok(line,prefix);return line};
const render=source.slice(source.indexOf('function render('),source.indexOf('function tick(')),refresh=pick('async function refresh('),tick=pick('function tick(');
const schedule=source.slice(source.indexOf('function updateSettingsSchedule(){'),source.indexOf('function prayerOffsetValues(){'));
const events=pick("window.addEventListener('hashchange'").split(";document.getElementById('location-button')")[0]+';';
let rebuilt=0,form=null,focus=null,weatherChecks=0,loads=0,now=Date.now(),day='2026-10-02';const handlers=new Map(),offset={dataset:{offsetTime:'Asr'},textContent:''},connection={hidden:false},city={textContent:''};
const body={classList:{toggle(){}}},footer={classList:{add(){}},innerHTML:''};
const app={querySelector:selector=>selector==='#settings-form'?form:selector==='.umrah-page'&&app.innerHTML?.includes('umrah-page')?{}:null,querySelectorAll:selector=>selector==='[data-offset-time]'?[offset]:[],insertAdjacentHTML(){throw Error('Unexpected storage warning')}};
const document={body,hidden:false,querySelector:()=>footer,getElementById:id=>id==='connection'?connection:id==='change-city'?city:null,addEventListener:(name,fn)=>{handlers.set('doc:'+name,fn)}};
const location={hash:'#settings'},window={addEventListener:(name,fn)=>handlers.set(name,fn),scrollTo(){}};
const fakeDate=class extends Date {static now(){return now}};
const noop=()=>{};
const settings={city:{name:'Медина',timezone:'Asia/Riyadh'},weather:false};
const model=createContext({document,app,location,window,Date:fakeDate,navigator:{onLine:true},settings,
 days:{},currentDay:day,currentRoute:'',refreshId:0,error:'',loading:false,lastTick:now,lastWeatherCheck:now,weatherBusy:false,weather:null,quranRenderedHash:null,learningEntry:null,umrahModule:null,umrahImport:null,umrahRenderedHash:null,
 topHeader:{append(){}},locationControl:{},settingsControl:{},storageAvailable:true,storageWarnings:[],
 setInterval:()=>1,clearInterval:noop,nav:noop,stopCompass:noop,stopLearning:noop,stopQuran:noop,stopAdhkar:noop,home:noop,prayerPage:noop,showKnowledge:noop,more:noop,showQuran:noop,showAdhkar:noop,showLearning:noop,qibla:noop,historyPage:noop,calendarPage:noop,sourcesPage:noop,about:noop,showCounterAccount:noop,showAdmin:noop,
 settingsPage:()=>{rebuilt++;form={draft:'',opened:false,school:0};focus=null},
 dateKey:()=>day,addDays:()=>day,cachedDays:()=>({[day]:{timezone:'Asia/Riyadh',timings:{Fajr:'2026-10-02T05:00:00+03:00',Sunrise:'2026-10-02T06:00:00+03:00',Maghrib:'2026-10-02T18:00:00+03:00'}}}),loadMonth:async()=>{loads++;return{[day]:{timezone:'Asia/Riyadh',timings:{Fajr:'2026-10-02T05:00:00+03:00',Sunrise:'2026-10-02T06:00:00+03:00',Maghrib:'2026-10-02T18:00:00+03:00'}}}},ensureTahajjudDays:async()=>{},updateSettings:noop,refreshWeather:()=>weatherChecks++,
 timingsFor:()=>({Asr:'15:45'}),formatTime:value=>value||'—',adhkarPeriod:()=>null,updateAdhkarPeriod:noop,adhkarHomeCard:()=>'',nextPrayer:()=>null,homeEvent:()=>null,atmosphere:noop,reminders:{tick:noop}
});
new Script(render+'\n'+refresh+'\n'+tick+'\n'+schedule+'\n'+events+'\n;({refresh,render,tick});').runInContext(model);
const refreshScreen=()=>model.refresh();
await refreshScreen();assert.equal(rebuilt,1,'Initial settings page must render once');const original=form;
form.draft='-';form.opened=true;focus=form;
for(const event of ['doc:visibilitychange','online','offline']){
 model.navigator.onLine=event!=='offline';await handlers.get(event)();for(let i=0;i<8;i++)await new Promise(resolve=>setImmediate(resolve));
 assert.equal(form,original,event+' retains the form');assert.equal(form.draft,'-');assert.equal(form.opened,true);assert.equal(focus,original);
 assert.equal(connection.hidden,model.navigator.onLine,'Connection indicator still updates');
}
assert.equal(offset.textContent,'15:45','Fresh timetable values update without replacing controls');
assert.equal(city.textContent,'Медина');
now+=70000;model.tick();for(let i=0;i<8;i++)await new Promise(resolve=>setImmediate(resolve));assert.equal(form,original,'Long pause tick also preserves the form');
day='2026-10-03';model.tick();for(let i=0;i<8;i++)await new Promise(resolve=>setImmediate(resolve));assert.equal(form,original,'Midnight refresh preserves controls');assert.ok(loads>=4);
await model.refresh(false,false);assert.notEqual(form,original,'Explicit city/backup changes rebuild the controls');
const afterExplicit=form;location.hash='#home';await handlers.get('hashchange')();location.hash='#settings';await handlers.get('hashchange')();assert.notEqual(form,afterExplicit,'Navigating back creates a clean form from saved preferences');
assert.equal(settings.city.name,'Медина');assert.equal(weatherChecks,0);
let umrahRenders=0,umrahStops=0;
model.umrahModule={showUmrah(host){umrahRenders++;host.innerHTML='<section class="umrah-page">Таваф</section>'},stopUmrah(){umrahStops++}};
model.umrahImport=Promise.resolve(model.umrahModule);location.hash='#umrah?step=tawaf';model.render();await new Promise(resolve=>setImmediate(resolve));
assert.equal(umrahRenders,1);const umrahScreen=app.innerHTML;
await model.refresh();assert.equal(umrahRenders,1);assert.equal(app.innerHTML,umrahScreen,'Weather/schedule refresh leaves lesson intact');
now+=70000;model.tick();for(let i=0;i<8;i++)await new Promise(resolve=>setImmediate(resolve));assert.equal(umrahRenders,1,'Returning to the lesson does not rebuild it');assert.equal(umrahStops,0);
location.hash='#home';model.render();assert.equal(umrahStops,1);assert.equal(model.umrahRenderedHash,null);
console.log('PASS: actual app refresh/render and network/resume handlers preserve settings drafts, expanded sections and focus; timetable/connection still update; midnight and long pauses are safe; explicit city/backup changes and navigation rebuild intentionally.');
