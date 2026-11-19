import assert from 'node:assert/strict';
import{readFile,access}from 'node:fs/promises';
import{Window}from '../tests/staff/node_modules/happy-dom/lib/index.js';
const w=new Window({url:'https://fixture.invalid/salah/'}),doc=w.document;
Object.assign(globalThis,{window:w,document:doc,localStorage:w.localStorage,Event:w.Event,matchMedia:()=>({matches:false})});
const{illustratedReleaseMarkup,bindIllustratedRelease}=await import('../dist/js/release-gallery.js');
const{APP_VERSION,APP_CHANGES,APP_ANNOUNCEMENT}=await import('../dist/js/app-release.js');
const{setInterfaceLanguage,t}=await import('../dist/js/i18n.js');
const{CONVERSATION_THEMES}=await import('../dist/js/conversation-themes.js');
assert.equal(APP_ANNOUNCEMENT.version,523);assert.equal(APP_ANNOUNCEMENT.changes.length,1);
const dialog=doc.createElement('dialog');dialog.id='modal';dialog.innerHTML=illustratedReleaseMarkup(APP_ANNOUNCEMENT.version,APP_ANNOUNCEMENT.changes);doc.body.append(dialog);dialog.showModal();
const before=w.localStorage.length;bindIllustratedRelease(dialog);
const card=dialog.querySelector('[data-theme-news]'),track=card.querySelector('[data-release-motion-part]'),scenes=[...track.children];
assert.equal(scenes.length,8);assert.deepEqual(scenes.map(s=>s.querySelector('img').getAttribute('src')),CONVERSATION_THEMES.filter(t=>t.wallpaper).map(t=>t.thumbnail));
assert.equal(card.getAttribute('aria-hidden'),'false');assert.equal(card.inert,false);
for(const scene of scenes){await access(new URL('../dist/'+scene.querySelector('img').getAttribute('src').replace('./',''),import.meta.url));assert(scene.style.getPropertyValue('--theme-preview-in'));assert(scene.style.getPropertyValue('--theme-preview-out'));}
const original=card.querySelector('img');for(const language of ['en','az','tg','uz','kk','de','ar','ru']){setInterfaceLanguage(language);assert.equal(card.querySelector('img'),original);assert.equal(card.querySelector('h3').textContent,t('conversationThemeUi.newsTitle'));assert.equal(card.querySelector('p').textContent,t('conversationThemeUi.newsText'));assert.equal(scenes[0].querySelector('.release-theme-bubble').textContent,t('conversationThemeUi.newsMessageA'));}
Object.defineProperty(doc,'hidden',{value:true,configurable:true});doc.dispatchEvent(new w.Event('visibilitychange'));assert.equal(card.querySelector('.release-motion-preview').style.getPropertyValue('--release-motion-state'),'paused');
Object.defineProperty(doc,'hidden',{value:false,configurable:true});doc.dispatchEvent(new w.Event('visibilitychange'));assert.equal(card.querySelector('.release-motion-preview').style.getPropertyValue('--release-motion-state'),'');
assert.equal(w.localStorage.length,before,'A decorative tour must not save a theme or acknowledge news');
const css=await readFile(new URL('../dist/css/conversation-themes.css',import.meta.url),'utf8'),shared=await readFile(new URL('../dist/css/quran-awards.css',import.meta.url),'utf8');
assert.match(css,/@keyframes release-theme-tour/);assert.match(css,/animation-duration:24s/);assert.match(css,/transform:translateX\(-87\.5%\)/);
assert.match(shared,/infinite alternate both var\(--release-motion-state\)/);assert.match(shared,/#modal:not\(\[open\]\) \.release-motion-preview\{--release-motion-state:paused\}/);assert.match(shared,/prefers-reduced-motion:reduce/);assert.match(shared,/body\.reduce-motion/);
assert.match(css,/\.release-feature\[dir="rtl"\] \.release-theme-demo\{direction:rtl\}/);
assert.doesNotMatch(card.textContent,/Sarvinoz|Habib|администратор|Владелец|Тафсир|Радио|Стеклянные панели/iu);
dialog.close();dialog.remove();await w.happyDOM.abort();
console.log('PASS theme news: one new feature, eight real thumbnails/palettes, stable eight-language leaves, shared alternating tour, hidden/closed/reduced-motion lifecycle, RTL text, no personal content, theme writes or premature acknowledgement. No physical-phone rendering claimed.');
