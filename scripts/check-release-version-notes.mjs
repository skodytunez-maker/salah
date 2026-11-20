import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash}from 'node:crypto';
import {Window}from '../tests/staff/node_modules/happy-dom/lib/index.js';
import {APP_VERSION,APP_CHANGES,APP_ANNOUNCEMENT}from '../dist/js/app-release.js';
const scope=JSON.parse(await fs.readFile(new URL('../docs/change-scope.json',import.meta.url),'utf8'));
assert.equal(typeof scope.previousReleaseSource,'string','Record the exact previous release source when preparing a version');
const previousBytes=Buffer.from(scope.previousReleaseSource),previousSha=createHash('sha1').update(Buffer.from('blob '+previousBytes.length+'\0')).update(previousBytes).digest('hex');
assert.equal(previousSha,scope.baseline.find(x=>x.path==='dist/js/app-release.js').sha,'Notes must be compared with the actual frozen base');
const previousVersion=Number(scope.previousReleaseSource.match(/APP_VERSION=(\d+)/)[1]);
const previousChanges=JSON.parse(scope.previousReleaseSource.match(/APP_CHANGES=(\[[^\n]*\]);/)[1]);
assert.ok(APP_VERSION>previousVersion);assert.notDeepEqual(APP_CHANGES,previousChanges,'A new version cannot recycle the preceding version’s notes');
if(APP_VERSION>APP_ANNOUNCEMENT.version)assert.notDeepEqual(APP_CHANGES,APP_ANNOUNCEMENT.changes,'A maintenance release cannot relabel the old feature announcement');
const w=new Window({url:'https://fixture.invalid/salah/',width:390,height:844}),doc=w.document;
Object.assign(globalThis,{window:w,document:doc,localStorage:w.localStorage,sessionStorage:w.sessionStorage,location:w.location,Event:w.Event,matchMedia:()=>({matches:false})});
doc.body.innerHTML='<dialog id="modal"><div id="modal-content"></div></dialog>';const dialog=doc.getElementById('modal');
const{showAppRelease,hasSeenAnnouncement}=await import('../dist/js/pwa-updates.js');
const{setInterfaceLanguage,t}=await import('../dist/js/i18n.js');
localStorage.setItem('salah:update-announcement-seen-v2',String(APP_ANNOUNCEMENT.version));localStorage.setItem('salah:update-last-seen-v1','515');localStorage.setItem('salah:settings','{"school":0}');const before=[...Array(localStorage.length)].map((_,i)=>[localStorage.key(i),localStorage.getItem(localStorage.key(i))]).sort();
if(APP_CHANGES.length){
showAppRelease();assert.equal(dialog.querySelectorAll('.release-feature').length,APP_CHANGES.length);assert.equal(dialog.querySelector('[data-theme-news]'),null,'Manual What’s new must show current notes,not the523tour');assert.match(dialog.querySelector('.eyebrow').textContent,new RegExp(String(APP_VERSION)));assert.equal(hasSeenAnnouncement(),true);
const first=dialog.querySelector('.release-feature'),picture=first.querySelector('img');for(const code of ['en','az','tg','uz','kk','de','ar','ru']){setInterfaceLanguage(code);assert.equal(first.querySelector('img'),picture);for(const leaf of dialog.querySelectorAll('[data-i18n]'))assert.equal(leaf.textContent,t(leaf.getAttribute('data-i18n')),'Current release leaves translate without pinning future notes to a past feature');}

}else{showAppRelease();assert.equal(dialog.querySelectorAll('[data-theme-news]').length,1,'Quiet release manual news retains the last substantive announcement');assert.match(dialog.querySelector('.eyebrow').textContent,new RegExp(String(APP_ANNOUNCEMENT.version)));assert.equal(hasSeenAnnouncement(),true);}
dialog.querySelector('[data-close]').click();assert.equal(localStorage.getItem('salah:update-announcement-seen-v2'),String(APP_ANNOUNCEMENT.version),'Closing current notes preserves the old receipt instead of advancing it to a maintenance version');assert.equal(localStorage.getItem('salah:update-last-seen-v1'),'515');assert.equal(localStorage.getItem('salah:settings'),'{"school":0}');
showAppRelease(APP_ANNOUNCEMENT);assert.equal(dialog.querySelectorAll('[data-theme-news]').length,1,'The explicit historical feature announcement still has its own artwork and receipt');assert.match(dialog.querySelector('.eyebrow').textContent,new RegExp(String(APP_ANNOUNCEMENT.version)));dialog.querySelector('[data-close]').click();
localStorage.removeItem('salah:update-announcement-seen-v2');localStorage.removeItem('salah:update-last-seen-v1');showAppRelease(APP_ANNOUNCEMENT,{available:true});dialog.querySelector('[data-close]').click();assert.equal(hasSeenAnnouncement(),false,'An available,not installed,release cannot be acknowledged');showAppRelease(APP_ANNOUNCEMENT);dialog.querySelector('[data-close]').click();assert.equal(hasSeenAnnouncement(),true);
await w.happyDOM.close();
// Actual CSS cascade with explicit media flattening;no browser/layout-engine claim.
const css=await fs.readFile(new URL('../dist/home-selected.css',import.meta.url),'utf8');
function activeCSS(win,rules){return Array.from(rules).map(rule=>rule.type===4?(rule.conditionText.split(',').some(q=>win.matchMedia(q.trim()).matches)?activeCSS(win,rule.cssRules):''):rule.type===12?'':rule.cssText).join('\n');}
for(const[width,height]of [[390,844],[393,852],[375,812],[375,667],[390,780],[844,390],[768,1024]])for(const mode of ['timetable','focus']){
 const hw=new Window({width,height}),hd=hw.document;hd.body.className='home-page';hd.body.innerHTML='<div class="app-home-shell"><span class="home-listening-now" hidden></span><div class="home-prayer-center"><div class="app-home-top">SALAH · city</div><div class="prayer-stage"><button class="central-prayer '+mode+'"></button></div><div id="home-adhkar-suggestion">Adhkar</div></div></div><div id="quran-mini-player"></div>';
 const style=hd.createElement('style');style.textContent=css.replaceAll('@media(','@media (');hd.head.append(style);style.textContent=activeCSS(hw,style.sheet.cssRules);
 const stage=hd.querySelector('.prayer-stage'),adhkar=hd.querySelector('#home-adhkar-suggestion'),header=hd.querySelector('.app-home-top'),badge=hd.querySelector('.home-listening-now');const snapshot=()=>[stage,adhkar,header,hd.querySelector('#quran-mini-player')].map(x=>{const s=hw.getComputedStyle(x);return[s.position,s.top||'auto',s.transform||'none']});
 const lowered=width<600&&height>=800&&height>width&&mode==='timetable',actual=snapshot();assert.equal(actual[0][1],lowered?'20px':'auto');assert.equal(actual[1][1],lowered?'20px':'auto');assert.equal(actual[2][1],'auto','Brand/city remain at their approved height');assert.equal(actual[3][1],'auto','Fixed player is not displaced');badge.hidden=false;assert.deepEqual(snapshot(),actual,'Badge visibility cannot move the table or timer');badge.hidden=true;assert.deepEqual(snapshot(),actual);assert.equal(hw.getComputedStyle(badge).position,'absolute');assert.ok(actual.slice(0,2).every(x=>x[2]==='none'),'No transformed text layer');await hw.happyDOM.close();
}
console.log('PASS: actual base notes cannot be reused;manual current notes versus explicit historical announcement,version labels,eight languages,receipts and available-release semantics;table/Adhkar lower20px only on tall portrait phones,brand/player/short/focus/landscape/tablet and badge-independent geometry retained. No phone rendering claimed.');
