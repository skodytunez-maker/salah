import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import{Window}from '../tests/staff/node_modules/happy-dom/lib/index.js';
import{APP_VERSION,APP_ANNOUNCEMENT,APP_NEWS_UNTIL}from '../dist/js/app-release.js';
import{illustratedReleaseMarkup,bindIllustratedRelease}from '../dist/js/release-gallery.js';
import{releaseFeatureForChange}from '../dist/js/release-illustrations.js';
import{showAppRelease,hasSeenAnnouncement}from '../dist/js/pwa-updates.js';
import{setInterfaceLanguage,t}from '../dist/js/i18n.js';
import sourceCatalogues from '../dist/js/i18n/skyRelease/index.js';

const change='Небо в вашем городе: плавный рассвет и закат, движение Солнца и Луны, сегодняшняя лунная фаза. Туман и плотные облака скрывают светила.';
assert.equal(APP_VERSION,505);assert.equal(APP_ANNOUNCEMENT.version,505);assert.deepEqual(APP_ANNOUNCEMENT.changes,[change]);assert.equal(APP_NEWS_UNTIL,'2026-11-24T23:59:59Z');assert.equal(releaseFeatureForChange(change),'home-sky-505');assert.equal(releaseFeatureForChange('Небо без согласованного названия'),null);
const svg=await fs.readFile(new URL('../dist/assets/updates/home-sky-505.svg',import.meta.url),'utf8'),styles=await fs.readFile(new URL('../dist/css/quran-awards.css',import.meta.url),'utf8');
assert.match(svg,/<title\b/);assert.match(svg,/<desc\b/);assert.match(svg,/sunrise arc/i);assert.match(svg,/Moon discs/i);assert.match(svg,/mosque silhouette/i);assert.ok(Buffer.byteLength(svg)<10000);
assert.doesNotMatch(svg,/<(?:script|animate|animateTransform|animateMotion|set|foreignObject|image)\b|(?:href|xlink:href)=["']https?:/iu,'Original vectors have no external media or separate animation loop');
const keys=['skyReleaseUi.text','skyReleaseUi.title','skyReleaseUi.where'];for(const[locale,values]of Object.entries(sourceCatalogues)){assert.deepEqual(Object.keys(values).sort(),keys);for(const value of Object.values(values))assert.ok(typeof value==='string'&&value.length>8&&value.length<300&&!/[<>]/.test(value),locale);}

const w=new Window({url:'https://fixture.invalid/salah/'}),doc=w.document;Object.assign(globalThis,{window:w,document:doc,localStorage:w.localStorage,Event:w.Event});globalThis.matchMedia=()=>({matches:false});
let hidden=false;Object.defineProperty(doc,'hidden',{configurable:true,get:()=>hidden});const modal=doc.createElement('dialog');modal.id='modal';modal.innerHTML='<div id="modal-content"></div>';doc.body.append(modal);
try{
 setInterfaceLanguage('ru');showAppRelease();assert.equal(modal.open,true);assert.equal(hasSeenAnnouncement(),false);const card=modal.querySelector('.release-feature'),image=card.querySelector('img'),parts=[...card.querySelectorAll('[data-release-motion-part]')],confirm=modal.querySelector('[data-close]');
 assert.equal(modal.querySelectorAll('.release-feature').length,1);assert.equal(image.getAttribute('src'),'./assets/updates/home-sky-505.svg');assert.equal(card.getAttribute('aria-hidden'),'false');assert.equal(card.inert,false);assert.equal(parts.length,3);assert.deepEqual(parts.map(p=>p.dataset.skyPart),['sun','moon','clouds']);
 for(const part of parts)assert.ok(styles.includes('@keyframes '+part.style.getPropertyValue('--release-motion-keyframes')),'Every moving sky layer uses a real existing shared keyframe');
 assert.equal(card.querySelector('.release-new-art').getAttribute('aria-hidden'),'true');confirm.focus();
 for(const locale of ['ru','en','az','tg','uz','kk','de','ar']){setInterfaceLanguage(locale);assert.equal(modal.querySelector('.release-feature'),card);assert.equal(card.querySelector('img'),image);assert.deepEqual([...card.querySelectorAll('[data-release-motion-part]')],parts);assert.equal(card.querySelector('h3').textContent,sourceCatalogues[locale]['skyReleaseUi.title']);assert.equal(card.querySelector('p').textContent,t('skyReleaseUi.text'));assert.equal(card.querySelector('.release-feature-note').textContent,t('skyReleaseUi.where'));assert.equal(doc.activeElement,confirm);assert.equal(card.dir,locale==='ar'?'rtl':'ltr');assert.equal(hasSeenAnnouncement(),false);}
 const motion=card.querySelector('.release-motion-preview');hidden=true;doc.dispatchEvent(new w.Event('visibilitychange'));assert.equal(motion.style.getPropertyValue('--release-motion-state'),'paused');hidden=false;doc.dispatchEvent(new w.Event('visibilitychange'));assert.equal(motion.style.getPropertyValue('--release-motion-state'),'');
 assert.match(styles,/\.release-feature\[aria-hidden="false"\] \.release-motion-preview\{--release-motion-state:running\}/);assert.match(styles,/#modal:not\(\[open\]\) \.release-motion-preview\{--release-motion-state:paused\}/);assert.match(styles,/prefers-reduced-motion:reduce\)\{\.release-motion-preview [^}]+animation:none/);assert.match(styles,/body\.reduce-motion \.release-motion-preview/);assert.match(styles,/infinite alternate both var\(--release-motion-state\)/);
 setInterfaceLanguage('ru');assert.doesNotMatch(modal.textContent,/Коран всегда рядом|Расписание без сети|Скачанное|владел|админ|географ|подписк|оплат|Радио/iu,'505 advertises only its new public sky feature');modal.close();assert.equal(hasSeenAnnouncement(),false,'Closing is not acknowledgement');showAppRelease();modal.querySelector('[data-close]').click();assert.equal(modal.open,false);assert.equal(hasSeenAnnouncement(),true,'Only the existing confirmation records 505 acknowledgement');

 // Keep 502 as a historical feature gallery independent of the current announcement.
 const historical=doc.createElement('div');doc.body.append(historical);historical.innerHTML=illustratedReleaseMarkup(502,['Коран без интернета: все страницы.','Намаз без интернета: сохранённое расписание.','Скачанное аудио: своя библиотека.']);bindIllustratedRelease(historical);
 assert.equal(historical.querySelectorAll('.release-feature').length,3);assert.equal(historical.querySelectorAll('.release-offline-preview').length,3);assert.deepEqual([...historical.querySelectorAll('.release-new-art img')].map(p=>p.getAttribute('src')),['./assets/updates/quran-offline-502.svg','./assets/updates/prayer-offline-502.svg','./assets/updates/audio-offline-502.svg']);assert.equal(historical.querySelector('.release-sky-preview'),null);historical.remove();
}finally{setInterfaceLanguage('ru');modal.remove();await w.happyDOM.close();}
console.log('PASS: sky505 alone, original bounded vector artwork, all8 source/runtime captions, stable locale/focus/RTL, shared Sun/Moon/cloud motion visibility/reduced controls, confirmation-only acknowledgement and historical502 offline gallery. No production writes.');
