import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import{Window}from '../tests/staff/node_modules/happy-dom/lib/index.js';
import{APP_ANNOUNCEMENT,APP_NEWS_UNTIL}from '../dist/js/app-release.js';
import{illustratedReleaseMarkup,bindIllustratedRelease}from '../dist/js/release-gallery.js';
import{releaseFeatureForChange}from '../dist/js/release-illustrations.js';
import{showAppRelease,hasSeenAnnouncement}from '../dist/js/pwa-updates.js';
import{setInterfaceLanguage,t}from '../dist/js/i18n.js';
import sourceCatalogues from '../dist/js/i18n/skyRelease/index.js';

const change='Небо в вашем городе: плавный рассвет и закат, движение Солнца и Луны, сегодняшняя лунная фаза. Туман и плотные облака скрывают светила.';
const installed505=APP_ANNOUNCEMENT.version===505;
if(installed505){assert.deepEqual(APP_ANNOUNCEMENT.changes,[change]);assert.equal(APP_NEWS_UNTIL,'2026-11-24T23:59:59Z');}
assert.equal(releaseFeatureForChange(change),'home-sky-505');assert.equal(releaseFeatureForChange('Небо без согласованного названия'),null);
const svg=await fs.readFile(new URL('../dist/assets/updates/home-sky-505.svg',import.meta.url),'utf8'),styles=await fs.readFile(new URL('../dist/css/quran-awards.css',import.meta.url),'utf8');
assert.match(svg,/<title\b/);assert.match(svg,/<desc\b/);assert.match(svg,/sunrise arc/i);assert.match(svg,/Moon discs/i);assert.match(svg,/mosque silhouette/i);assert.ok(Buffer.byteLength(svg)<10000);
assert.doesNotMatch(svg,/<(?:script|animate|animateTransform|animateMotion|set|foreignObject|image)\b|(?:href|xlink:href)=["']https?:/iu,'Original vectors have no external media or separate animation loop');
const keys=['skyReleaseUi.text','skyReleaseUi.title','skyReleaseUi.where'];for(const[locale,values]of Object.entries(sourceCatalogues)){assert.deepEqual(Object.keys(values).sort(),keys);for(const value of Object.values(values))assert.ok(typeof value==='string'&&value.length>8&&value.length<300&&!/[<>]/.test(value),locale);}
const escapeRegex=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
function checkOneWaySky(parts){
 const selector='.release-sky-preview [data-sky-part="sun"],.release-sky-preview [data-sky-part="moon"]',rule=styles.match(new RegExp(escapeRegex(selector)+'\\{([^}]+)\\}'))?.[1];
 assert.ok(rule,'Only the sky Sun/Moon override the common alternating news loop');assert.match(rule,/animation-duration:12s/);assert.match(rule,/animation-direction:normal/);assert.match(rule,/animation-timing-function:linear/);assert.doesNotMatch(rule,/animation:|animation-name:|animation-play-state:/,'Shared active/hidden/reduced lifecycle stays authoritative');
 assert.ok(styles.indexOf(selector)>styles.indexOf('.release-motion-preview [data-release-motion-part="element"]'));assert.ok(styles.indexOf(selector)<styles.indexOf('body.reduce-motion .release-motion-preview'),'Existing reduced-motion animation:none remains later in the cascade');
 assert.match(styles,/\.release-sky-preview \[data-sky-part="moon"\]\{animation-delay:-6s\}/,'The Moon has its own phase offset instead of following the Sun in lockstep');
 for(const part of parts.filter(p=>p.dataset.skyPart!=='clouds')){
  const name=part.style.getPropertyValue('--release-motion-keyframes'),body=styles.match(new RegExp('@keyframes '+escapeRegex(name)+'\\{((?:[^{}]|\\{[^{}]*\\})*)\\}'))?.[1];assert.ok(body,'Actual sky keyframes exist');
  const frames=[...body.matchAll(/([\d.,%\s]+)\{([^}]+)\}/g)].flatMap(([,points,decl])=>points.split(',').map(point=>({at:parseFloat(point)/100,angle:Number(decl.match(/transform:rotate\(([-\d.]+)deg\)/)?.[1]),opacity:Number(decl.match(/(?:^|;)opacity:([\d.]+)/)?.[1])}))).sort((a,b)=>a.at-b.at);
  assert.equal(frames[0].at,0);assert.equal(frames.at(-1).at,1);assert.ok(frames.every(f=>Number.isFinite(f.angle)&&Number.isFinite(f.opacity)));
  const origin=part.style.transformOrigin.match(/([-\d.]+)px\s+([-\d.]+)px/),circle=part.querySelector('circle'),ox=Number(origin?.[1]),oy=Number(origin?.[2]),cx=Number(circle.getAttribute('cx')),cy=Number(circle.getAttribute('cy')),outerRadius=Math.max(...[...part.querySelectorAll('circle')].map(c=>Number(c.getAttribute('r'))));
  const point=angle=>{const a=angle*Math.PI/180;return{x:ox+(cx-ox)*Math.cos(a)-(cy-oy)*Math.sin(a),y:oy+(cx-ox)*Math.sin(a)+(cy-oy)*Math.cos(a)};},near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,a+' != '+b);
  const expected=part.dataset.skyPart==='sun'?[82,262,442,135]:[85,320,555,80];near(point(-90).x,expected[0]);near(point(0).x,expected[1]);near(point(90).x,expected[2]);near(point(0).y,expected[3]);near(point(-90).y,315);near(point(90).y,315);
  assert.equal(part.closest('svg').style.clipPath,'inset(0 0 25% 0)','Both bodies are clipped at the same315px horizon');
  for(const frame of [frames[0],frames.at(-1)]){assert.equal(frame.opacity,0,'Cycle reset is invisible');assert.ok(point(frame.angle).y-outerRadius>315,'Even the outer glow is fully below the horizon at reset');}
  let lastX=-Infinity,visibleSamples=0;for(let i=0;i<=2000;i++){const at=i/2000,next=frames.findIndex(f=>f.at>=at),right=frames[Math.max(0,next)],left=frames[Math.max(0,next-1)],ratio=right.at===left.at?0:(at-left.at)/(right.at-left.at),angle=left.angle+(right.angle-left.angle)*ratio,opacity=left.opacity+(right.opacity-left.opacity)*ratio;if(opacity<=1e-9)continue;const p=point(angle);assert.ok(angle>=-90-1e-6&&angle<=90+1e-6,'All return travel outside the visible arc is transparent');assert.ok(p.x>=lastX-1e-6,'Every visible sample moves east-to-west, never backwards');assert.ok(p.y<=315+1e-6);lastX=p.x;visibleSamples++;}assert.ok(visibleSamples>1000);
  const fallback=Number(part.style.transform.match(/rotate\(([-\d.]+)deg\)/)?.[1]);assert.equal(part.style.opacity,'1');assert.ok(point(fallback).y+outerRadius<315,'Reduced motion retains a visible static body above the horizon');
 }
 assert.equal(parts.find(p=>p.dataset.skyPart==='clouds').style.getPropertyValue('--release-motion-keyframes'),'release-nature-scene','Clouds retain their existing alternating lifecycle');
}

const w=new Window({url:'https://fixture.invalid/salah/'}),doc=w.document;Object.assign(globalThis,{window:w,document:doc,localStorage:w.localStorage,Event:w.Event});globalThis.matchMedia=()=>({matches:false});
let hidden=false;Object.defineProperty(doc,'hidden',{configurable:true,get:()=>hidden});const modal=doc.createElement('dialog');modal.id='modal';modal.innerHTML='<div id="modal-content"></div>';doc.body.append(modal);
const show505=()=>{if(installed505){showAppRelease();return;}modal.querySelector('#modal-content').innerHTML=illustratedReleaseMarkup(505,[change])+'<button type="button" data-close>Close historical preview</button>';bindIllustratedRelease(modal);modal.querySelector('[data-close]').onclick=()=>modal.close();modal.showModal();};
try{
 setInterfaceLanguage('ru');show505();assert.equal(modal.open,true);assert.equal(hasSeenAnnouncement(),false);const card=modal.querySelector('.release-feature'),image=card.querySelector('img'),parts=[...card.querySelectorAll('[data-release-motion-part]')],confirm=modal.querySelector('[data-close]');
 assert.equal(modal.querySelectorAll('.release-feature').length,1);assert.equal(image.getAttribute('src'),'./assets/updates/home-sky-505.svg');assert.equal(card.getAttribute('aria-hidden'),'false');assert.equal(card.inert,false);assert.equal(parts.length,3);assert.deepEqual(parts.map(p=>p.dataset.skyPart),['sun','moon','clouds']);
 for(const part of parts)assert.ok(styles.includes('@keyframes '+part.style.getPropertyValue('--release-motion-keyframes')),'Every moving sky layer uses a real existing shared keyframe');
 checkOneWaySky(parts);
 assert.equal(card.querySelector('.release-new-art').getAttribute('aria-hidden'),'true');confirm.focus();
 for(const locale of ['ru','en','az','tg','uz','kk','de','ar']){setInterfaceLanguage(locale);assert.equal(modal.querySelector('.release-feature'),card);assert.equal(card.querySelector('img'),image);assert.deepEqual([...card.querySelectorAll('[data-release-motion-part]')],parts);assert.equal(card.querySelector('h3').textContent,sourceCatalogues[locale]['skyReleaseUi.title']);assert.equal(card.querySelector('p').textContent,t('skyReleaseUi.text'));assert.equal(card.querySelector('.release-feature-note').textContent,t('skyReleaseUi.where'));assert.equal(doc.activeElement,confirm);assert.equal(card.dir,locale==='ar'?'rtl':'ltr');assert.equal(hasSeenAnnouncement(),false);}
 const motion=card.querySelector('.release-motion-preview');hidden=true;doc.dispatchEvent(new w.Event('visibilitychange'));assert.equal(motion.style.getPropertyValue('--release-motion-state'),'paused');hidden=false;doc.dispatchEvent(new w.Event('visibilitychange'));assert.equal(motion.style.getPropertyValue('--release-motion-state'),'');
 assert.match(styles,/\.release-feature\[aria-hidden="false"\] \.release-motion-preview\{--release-motion-state:running\}/);assert.match(styles,/#modal:not\(\[open\]\) \.release-motion-preview\{--release-motion-state:paused\}/);assert.match(styles,/prefers-reduced-motion:reduce\)\{\.release-motion-preview [^}]+animation:none/);assert.match(styles,/body\.reduce-motion \.release-motion-preview/);assert.match(styles,/infinite alternate both var\(--release-motion-state\)/);
 setInterfaceLanguage('ru');assert.doesNotMatch(modal.textContent,/Коран всегда рядом|Расписание без сети|Скачанное|владел|админ|географ|подписк|оплат|Радио/iu,'505 advertises only its new public sky feature');modal.close();assert.equal(hasSeenAnnouncement(),false,'Closing is not acknowledgement');show505();modal.querySelector('[data-close]').click();assert.equal(modal.open,false);assert.equal(hasSeenAnnouncement(),installed505,installed505?'Only the existing confirmation records 505 acknowledgement':'A historical505 preview cannot acknowledge a different current edition');

 // Keep 502 as a historical feature gallery independent of the current announcement.
 const historical=doc.createElement('div');doc.body.append(historical);historical.innerHTML=illustratedReleaseMarkup(502,['Коран без интернета: все страницы.','Намаз без интернета: сохранённое расписание.','Скачанное аудио: своя библиотека.']);bindIllustratedRelease(historical);
 assert.equal(historical.querySelectorAll('.release-feature').length,3);assert.equal(historical.querySelectorAll('.release-offline-preview').length,3);assert.deepEqual([...historical.querySelectorAll('.release-new-art img')].map(p=>p.getAttribute('src')),['./assets/updates/quran-offline-502.svg','./assets/updates/prayer-offline-502.svg','./assets/updates/audio-offline-502.svg']);assert.equal(historical.querySelector('.release-sky-preview'),null);historical.remove();
}finally{setInterfaceLanguage('ru');modal.remove();await w.happyDOM.close();}
console.log('PASS: historical sky505, original bounded vectors, all8 captions, stable locale/focus/RTL, shared Sun/Moon/cloud visibility/reduced motion and historical502 cards; '+(installed505?'current505 installed dialog and confirmation-only acknowledgement.':'historical preview leaves the current edition unacknowledged.')+' No production writes.');
