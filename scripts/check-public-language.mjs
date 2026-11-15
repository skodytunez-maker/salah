import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import{Window}from '../tests/staff/node_modules/happy-dom/lib/index.js';
import{renderQiblaView}from '../dist/js/qibla-view.js';

const win=new Window({url:'https://fixture.invalid/#calendar'}),doc=win.document;
Object.assign(globalThis,{window:win,document:doc,localStorage:win.localStorage,sessionStorage:win.sessionStorage,Event:win.Event,CustomEvent:win.CustomEvent});
doc.body.innerHTML='<main id="app"></main><dialog id="modal"><div id="modal-content"></div></dialog><div id="toast" hidden></div>';
globalThis.fetch=async()=>{throw Error('Network is forbidden in public UI language checks');};
const[{t,setInterfaceLanguage,translateUi,getLocale,subscribeLanguage},{initializeInterfaceLanguage},ui,{hijriForDay},{upcomingIslamicDates,remainingDaysMessage},{monthRows,createMonthCanvas,jpegPdf},sharing,{weatherName}]=await Promise.all([
 import('../dist/js/i18n.js'),import('../dist/js/language-settings.js'),import('../dist/js/ui.js'),import('../dist/js/hijri.js'),import('../dist/js/calendar-occasions.js'),import('../dist/js/calendar-pdf.js'),import('../dist/js/app-sharing.js'),import('../dist/js/weather-data.js')
]);
setInterfaceLanguage('ru');const stopLanguage=initializeInterfaceLanguage({doc,win}),app=doc.getElementById('app');
const source=await fs.readFile(new URL('../dist/js/app.js',import.meta.url),'utf8');
const section=(start,end)=>source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));
const days={},times={Fajr:6,Sunrise:8,Dhuhr:12,Asr:14,Maghrib:16,Isha:18};
for(let day=13;day<=19;day++)days['2026-11-'+day]={hijri:{day:2,month:{number:6},year:1448}};
let fetches=0,marks=0,cityClicks=0;
const settings={city:{name:'Настройки',timezone:'Asia/Yekaterinburg'},school:1,hijriOffset:0,weather:true,mosque:null,juma:'13:17'};
const context=vm.createContext({document:doc,window:win,Intl,Date,JSON,Number,Boolean,Math,Object,Array,settings,app,t,translateUi,getLocale,subscribeLanguage,...ui,days,history:{'2026-11-15':{Fajr:'done'}},currentDay:'2026-11-15',calendarStart:'2026-11-13',calendarMode:'week',calendarRequestId:0,currentRoute:'calendar',historyPeriod:'week',prayers:[['Fajr','Фаджр'],['Dhuhr','Зухр'],['Asr','Аср'],['Maghrib','Магриб'],['Isha','Иша']],addDays:(day,n)=>new Date(Date.parse(day+'T12:00:00Z')+n*86400000).toISOString().slice(0,10),timingsFor:()=>times,formatTime:n=>String(n).padStart(2,'0')+':00',usesAlHakk:()=>false,tyumenSource:()=>({label:'Источник без перевода'}),upcomingIslamicDates,remainingDaysMessage,hijriForDay,loadMonth:async()=>{fetches++;return days;},bindMarks:()=>{},cityDialog:()=>cityClicks++,downloadCalendarMonth:()=>{},weather:{weather_code:61,temperature_2m:5,apparent_temperature:3,wind_speed_10m:2,dataAt:Date.parse('2026-11-15T11:10:00Z')},weatherFrame:()=>({fresh:true}),weatherName,weatherBusy:false,settingsIcon:()=>'',refreshWeather:async()=>false,location:win.location});
vm.runInContext(section('const hijriMonthKeys=','function tahajjudEntry(')+section('function historyPage(){','function qibla(){')+section('function about(){','function exportData(){')+section('function weatherDialog(){','async function importData(')+section('function onboarding(){','function cityDialog('),context);
await vm.runInContext('calendarPage()',context);
const input=doc.getElementById('calendar-date'),table=app.querySelector('tbody'),firstRow=table.firstElementChild,bodyText=table.textContent;
input.value='2026-12-03';const hijri=app.querySelector('[data-public-hijri-day]'),hijriBefore=hijri.textContent;
assert.equal(input.min,'1900-01-01');assert.equal(input.max,'2200-12-31');assert.match(app.querySelector('.page-head').textContent,/Настройки/);
assert.match(app.querySelector('.calendar-friday').textContent,/13:17/);assert.equal(fetches,0);
setInterfaceLanguage('en');assert.equal(doc.getElementById('calendar-date'),input);assert.equal(input.value,'2026-12-03');assert.equal(app.querySelector('tbody'),table);assert.equal(table.firstElementChild,firstRow);assert.equal(table.textContent,bodyText);assert.equal(fetches,0,'Changing language cannot reload prayer times');
assert.equal(app.querySelector('h1').textContent,t('menu.calendar'));assert.equal(app.querySelector('.calendar-export-title').textContent,t('calendarUi.downloadMonth'));assert.match(app.querySelector('.page-head').textContent,/Настройки/);assert.notEqual(hijri.textContent,hijriBefore);assert.equal(hijri,app.querySelector('[data-public-hijri-day]'));
assert.equal(app.querySelector('.calendar-occasion strong').textContent,t(upcomingIslamicDates('2026-11-15')[0].nameKey));
const uncertain=app.querySelector('[data-i18n="calendarUi.uncertaintyDays"]');assert.ok(uncertain);assert.equal(uncertain.textContent,' · ±1 day');
const eventDate=app.querySelector('.calendar-occasion time');assert.match(eventDate.getAttribute('datetime'),/^\d{4}-\d{2}-\d{2}$/);
setInterfaceLanguage('ru');assert.equal(uncertain.textContent,' · ±1 день');assert.equal(hijri.textContent,hijriBefore);assert.equal(table.textContent,bodyText);
for(const language of ['az','tg','uz','kk','de','ar','ru']){setInterfaceLanguage(language);assert.equal(app.querySelector('h1').textContent,t('menu.calendar'));assert.equal(app.querySelector('.calendar-export-title').textContent,t('calendarUi.downloadMonth'));assert.equal(doc.getElementById('calendar-date'),input);assert.equal(input.value,'2026-12-03');assert.equal(app.querySelector('tbody'),table);assert.equal(table.textContent,bodyText);assert.equal(app.querySelector('.calendar-occasion strong').textContent,t(upcomingIslamicDates('2026-11-15')[0].nameKey));assert.equal(uncertain.textContent,t('calendarUi.uncertaintyDays',{count:1}));assert.match(app.querySelector('.page-head').textContent,/Настройки/);assert.equal(fetches,0);}
vm.runInContext('historyPage()',context);const marker=app.querySelector('.day-mark'),historyRow=app.querySelector('.history-row'),recordDate=historyRow.firstElementChild;
assert.equal(marker.getAttribute('aria-label'),'Фаджр: совершён');const oldDate=recordDate.textContent;
setInterfaceLanguage('en');assert.equal(app.querySelector('.day-mark'),marker);assert.equal(marker.getAttribute('aria-label'),'Fajr: prayed');assert.equal(marker.classList.contains('done'),true);assert.equal(app.querySelector('.history-row'),historyRow);assert.notEqual(recordDate.textContent,oldDate);assert.equal(app.querySelector('[data-i18n="journalUi.daysMarked"]').textContent,'1 day with marks');assert.equal(marks,0);
vm.runInContext('about()',context);const founder=app.querySelector('.about-founder strong'),social=app.querySelector('.about-social-link');assert.equal(founder.textContent,'Saadi Kobilov');assert.match(social.getAttribute('aria-label'),/Instagram SALAH — @salahbysaadi/);
setInterfaceLanguage('ru');assert.equal(founder.textContent,'Saadi Kobilov');assert.equal(social.href,'https://www.instagram.com/salahbysaadi/');assert.equal(app.querySelector('a[href="./reciter-portrait-credits.html"]'),null);assert.equal(app.querySelector('a[href="./alphabet-audio-credits.html"]'),null);
for(const language of ['ru','en','az','tg','uz','kk','de','ar']){setInterfaceLanguage(language);assert.equal(app.querySelectorAll('.about-social-link').length,1,'Only the public SALAH Instagram remains');assert.equal(app.querySelector('.about-social-link'),social);assert.equal(social.href,'https://www.instagram.com/salahbysaadi/');assert.equal(app.innerHTML.includes('saadi_kobilov'),false,'The temporarily hidden personal handle is neither linked nor displayed');assert.equal(app.querySelector('.about-brand-heading').textContent,'SALAH','The About brand has no personal byline');assert.equal(founder.textContent,'Saadi Kobilov','The standalone founder row remains unchanged');}
for(const name of ['index.html','owner.html','share.html']){const shell=doc.createElement('template');shell.innerHTML=await fs.readFile(new URL('../dist/'+name,import.meta.url),'utf8');assert.equal(shell.content.querySelector('.author-footer').textContent,'SALAH',name+' retains the SALAH brand without a personal byline');}
const footerStart=source.indexOf("const footer=document.querySelector('.workspace>footer')"),footerEnd=source.indexOf("if(currentRoute==='home')home()",footerStart);assert.ok(footerStart>=0&&footerEnd>footerStart);const footerHost=doc.createElement('div');footerHost.className='workspace';footerHost.innerHTML='<footer></footer>';doc.body.append(footerHost);vm.runInContext(source.slice(footerStart,footerEnd),context);for(const language of ['ru','en','az','tg','uz','kk','de','ar']){setInterfaceLanguage(language);assert.equal(footerHost.querySelector('footer').textContent,'SALAH','The real render() footer writer and language changes cannot restore the personal byline');}footerHost.remove();setInterfaceLanguage('ru');
const qibla=doc.createElement('template');qibla.innerHTML=renderQiblaView({cityName:'Город',bearing:120,hasCity:true});assert.equal(qibla.content.querySelector('.qibla-signature').textContent,'SALAH','Qibla has no personal byline');assert.equal(qibla.content.querySelector('.qibla-bearing').textContent,'120°');
setInterfaceLanguage('ru');
vm.runInContext('weatherDialog()',context);const rawCity=doc.querySelector('#modal h3'),weatherCode=doc.querySelector('[data-public-weather-code]'),refresh=doc.getElementById('weather-refresh');assert.equal(rawCity.textContent,'Настройки');assert.equal(weatherCode.textContent,'Небольшой дождь');
setInterfaceLanguage('en');assert.equal(rawCity.textContent,'Настройки');assert.equal(weatherCode.textContent,'Light rain');assert.equal(doc.getElementById('weather-refresh'),refresh);assert.equal(refresh.textContent,t('weatherUi.refresh'));assert.equal(fetches,0);
ui.closeModal();vm.runInContext('onboarding()',context);assert.equal(doc.querySelector('#modal h2').textContent,'SALAH','Onboarding keeps the product brand without a personal byline');const choose=doc.getElementById('begin');setInterfaceLanguage('ru');assert.equal(doc.getElementById('begin'),choose);assert.equal(choose.textContent,'Указать город');assert.equal(cityClicks,0);choose.click();assert.equal(cityClicks,1);ui.closeModal();

// A previously mounted invitation shares the language selected at the explicit
// tap, while custom invitation text is never interpreted as a translation key.
const shareHost=doc.createElement('div');shareHost.innerHTML=sharing.appSharingMarkup();doc.body.append(shareHost);const sent=[];
sharing.bindAppSharing(shareHost,sharing.createAppSharing({navigator:{share:async payload=>sent.push(payload)},text:()=>t('shareExtra.invite')}));
setInterfaceLanguage('en');shareHost.querySelector('#share-app').click();await Promise.resolve();assert.equal(sent[0].text,t('shareExtra.invite'));assert.equal(sent[0].url,sharing.PUBLIC_SHARE_URL);
await sharing.createAppSharing({navigator:{share:async payload=>sent.push(payload)},text:'Настройки'}).share();assert.equal(sent[1].text,'Настройки');

// Numeric dates, Friday flags and both Asr columns stay identical. The canvas
// snapshots every label and locale before awaiting its local logo fetch.
setInterfaceLanguage('ru');const getTimes=()=>({...times,AsrFirst:14,AsrHanafi:15}),ruRows=monthRows('2026-11',getTimes,String);
const supplied={'2026-11-15':{hijri:{day:30,month:{number:5},year:1448}},'2026-11-16':{hijri:{day:1,month:{number:6},year:1448}}};
assert.equal(hijriForDay('2026-11-15',supplied,1).text,'1 Джумада аль-ахира 1448');
assert.equal(hijriForDay('2026-11-15',{'2026-11-15':supplied['2026-11-15']},1).adjustmentUnavailable,true,'Missing adjacent month data remains unavailable rather than inventing a month transition');
assert.equal(hijriForDay('2026-02-30'),null);const rawSupplied=JSON.stringify(supplied);
setInterfaceLanguage('en');const enRows=monthRows('2026-11',getTimes,String);
const translatedHijri=hijriForDay('2026-11-15',supplied,1);assert.equal(translatedHijri.text,'1 Jumada al-Akhirah 1448');assert.equal(translatedHijri.displayMonth,6);assert.equal(translatedHijri.source,'Aladhan');assert.equal(JSON.stringify(supplied),rawSupplied);
assert.deepEqual(enRows.map(({day,date,friday,values})=>({day,date,friday,values})),ruRows.map(({day,date,friday,values})=>({day,date,friday,values})));assert.notEqual(enRows[0].weekday,ruRows[0].weekday);assert.deepEqual(enRows[0].values,['6','8','12','14','15','16','18']);
let resolveLogo;globalThis.fetch=()=>new Promise(resolve=>resolveLogo=resolve);const drawn=[];
const ctx={scale(){},fillRect(){},fillText(value,x,y){drawn.push({value,x,y,direction:this.direction});},measureText:value=>({width:String(value).length*3}),drawImage(){},beginPath(){},moveTo(){},lineTo(){},stroke(){}};
const originalCreate=doc.createElement.bind(doc);doc.createElement=name=>name==='canvas'?{width:0,height:0,getContext:()=>ctx}:originalCreate(name);
globalThis.Image=class{async decode(){}};const previousURL=globalThis.URL;globalThis.URL=class extends previousURL{static createObjectURL(){return'blob:fixture';}static revokeObjectURL(){}};
const rendering=createMonthCanvas({month:'2026-11',city:'Настройки',source:'Источник без перевода',rows:enRows,localAsr:true});
setInterfaceLanguage('ru');resolveLogo({ok:true,blob:async()=>new Blob(['logo'])});const canvas=await rendering;
assert.ok(drawn.some(row=>row.value==='PRAYER TIMETABLE'));assert.ok(drawn.some(row=>row.value==='NOVEMBER'));assert.ok(drawn.some(row=>row.value==='Source: Источник без перевода'));assert.ok(drawn.some(row=>row.value==='at mosques'));assert.ok(drawn.some(row=>row.value==='Настройки'));assert.equal(drawn.some(row=>row.value==='РАСПИСАНИЕ НАМАЗА'),false);
assert.equal(drawn.find(row=>row.x===559&&row.y===819)?.value,'SALAH','The actual A4 canvas footer retains its position and product brand without a personal byline');
assert.equal(canvas.width,Math.round(595.2756*3));assert.equal(canvas.height,Math.round(841.8898*3));
const pdf=await jpegPdf(new Uint8Array([1,2,3]),canvas.width,canvas.height).text();assert.match(pdf,/\/MediaBox \[0 0 595\.2756 841\.8898\]/);assert.match(pdf,/\/Count 1/);
setInterfaceLanguage('ar');const arabicStart=drawn.length,arabicRows=monthRows('2026-11',getTimes,String),arabicHeading=t('calendarPdfUi.heading'),renderingArabic=createMonthCanvas({month:'2026-11',city:'Настройки',source:'Источник без перевода',rows:arabicRows});
setInterfaceLanguage('en');resolveLogo({ok:true,blob:async()=>new Blob(['logo'])});await renderingArabic;
assert.ok(drawn.slice(arabicStart).some(row=>row.value===arabicHeading&&row.direction==='rtl'));assert.ok(drawn.slice(arabicStart).some(row=>row.value==='14'&&row.direction==='ltr'));assert.deepEqual(arabicRows[0].values,enRows[0].values);
assert.equal(drawn.slice(arabicStart).find(row=>row.x===559&&row.y===819)?.value,'SALAH','The export language snapshot cannot restore the personal byline');
doc.createElement=originalCreate;globalThis.URL=previousURL;stopLanguage();win.happyDOM.abort();
console.log('PASS: public labels across eight languages, dates and Hijri metadata update in place without requests, lost drafts or changed timetable values; names/attributions remain raw; sharing uses the explicit tap locale and A4 export snapshots labels/RTL direction before async work.');
