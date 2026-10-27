import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import{Window}from '../tests/staff/node_modules/happy-dom/lib/index.js';
import{illustratedReleaseMarkup,bindIllustratedRelease}from '../dist/js/release-gallery.js';
import{ownerUserCard,bindOwnerAvatarPreview}from '../dist/js/owner-user-card.js';
import{APP_VERSION,APP_CHANGES,APP_ANNOUNCEMENT,APP_NEWS_UNTIL}from '../dist/js/app-release.js';
import{releaseFeatureForChange}from '../dist/js/release-illustrations.js';
import{releaseHighlightActive,releaseHighlightMarkup,bindReleaseHighlight}from '../dist/js/release-highlight.js';
import{showAppRelease}from '../dist/js/pwa-updates.js';

const w=new Window({url:'https://example.invalid/'}),doc=w.document;
Object.assign(globalThis,{window:w,document:doc,localStorage:w.localStorage,Event:w.Event});
globalThis.matchMedia=()=>({matches:true});
const root=doc.createElement('div');doc.body.append(root);root.innerHTML=illustratedReleaseMarkup(341);
const cards=[...root.querySelectorAll('.release-feature')];assert.equal(cards.length,6);
assert.equal(cards[0].querySelector('h3').textContent,'Новые награды');
assert.ok(!/ч[её]тк|мутн/i.test(root.textContent));
assert.doesNotMatch(root.textContent,/подписк|поддержк|оплат|списани/iu);
assert.ok(root.textContent.includes('приглашённых тестировщиков')&&root.textContent.includes('Общий выпуск'));
assert.ok(!root.textContent.includes('владельца'));
for(const img of root.querySelectorAll('img')){
 const src=img.getAttribute('src');assert.ok(!src.includes('undefined'));
 await fs.access(new URL('../dist/'+src.replace(/^\.\//,''),import.meta.url));
}
assert.equal(root.querySelectorAll('.release-city-pair img[src^="./assets/updates/"]').length,2,'News uses small public thumbnails, not full optional city pairs');
const strip=root.querySelector('.release-gallery-strip');Object.defineProperty(strip,'clientWidth',{value:320});strip.scrollTo=({left})=>{strip.scrollLeft=left;};
bindIllustratedRelease(root);
assert.equal(cards.filter(x=>!x.inert).length,1);
root.querySelector('[data-release-next]').click();assert.equal(root.querySelector('[data-release-page]').textContent,'2/6');assert.equal(cards[0].inert,true);assert.equal(cards[1].inert,false);
strip.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true}));assert.equal(root.querySelector('[data-release-page]').textContent,'1/6');assert.equal(root.querySelector('[data-release-prev]').disabled,true);
const novemberNews=illustratedReleaseMarkup(342);root.innerHTML=novemberNews;assert.equal(root.querySelectorAll('.release-feature').length,2);assert.ok(root.textContent.includes('Ноябрь в календаре Тюмени'));assert.ok(root.textContent.includes('таблицы 2025 года'));assert.equal(root.querySelectorAll('svg').length,1);
const geoNews=illustratedReleaseMarkup(343);root.innerHTML=geoNews;assert.equal(root.querySelectorAll('.release-feature').length,2);assert.ok(root.textContent.includes('Первое место — выше'));assert.ok(root.textContent.includes('обновления приложения через Google Play'));
root.innerHTML=illustratedReleaseMarkup(346);assert.equal(root.querySelectorAll('.release-feature').length,1);assert.ok(root.textContent.includes('резервный источник'));assert.equal(root.querySelectorAll('svg').length,1);
root.innerHTML=illustratedReleaseMarkup(347);assert.equal(root.querySelectorAll('.release-feature').length,1);assert.equal(root.querySelector('h3').textContent,'Новые чтецы');assert.equal(root.querySelectorAll('.release-new-readers img').length,5);assert.ok(root.textContent.includes('109 сур'));for(const img of root.querySelectorAll('.release-new-readers img'))await fs.access(new URL('../dist/'+img.getAttribute('src').replace(/^\.\//,''),import.meta.url));
root.innerHTML=illustratedReleaseMarkup(348);assert.equal(root.querySelectorAll('.release-feature').length,3);assert.equal(root.querySelectorAll('.release-new-readers img').length,13);assert.equal(root.querySelectorAll('.release-reader-quartet').length,2);assert.ok(root.textContent.includes('46 чтецов'));for(const img of root.querySelectorAll('.release-new-readers img'))await fs.access(new URL('../dist/'+img.getAttribute('src').replace(/^\.\//,''),import.meta.url));
root.innerHTML=illustratedReleaseMarkup(349);assert.equal(root.querySelectorAll('.release-feature').length,4);assert.equal(root.querySelectorAll('.release-new-readers img').length,13);assert.ok(root.textContent.includes('Первые три дня'));assert.ok(root.textContent.includes('30 дней'));assert.equal(root.querySelectorAll('img[src="./assets/reciters/raadalkurdi-v349.png"]').length,1);

// Payment and provider-review work is not a public announcement yet.
for(const version of [335,339,340,341,372,999]){root.innerHTML=illustratedReleaseMarkup(version,['Поддержка SALAH: кнопка отмены подписки. Приём платежей пока выключен.']);assert.doesNotMatch(root.textContent,/подписк|поддержк|оплат|плат[её]ж|списани|yookassa/iu);}
const {publicReleaseChanges,validatedRelease}=await import('../dist/js/pwa-updates.js');
assert.deepEqual(publicReleaseChanges(['Улучшен мусхаф','Подписка SALAH','Кнопка отмены и отвязки способа оплаты','ЮKassa: проверка','owner private']),['Улучшен мусхаф']);
assert.equal(validatedRelease({version:372,date:'2026-10-18',changes:['Поддержка SALAH: кнопка отмены подписки']}),null);

const future=illustratedReleaseMarkup(350,['<img src=x onerror=alert(1)>','Изменение','owner private']);root.innerHTML=future;
assert.equal(root.querySelectorAll('.release-feature').length,2);assert.equal(root.querySelectorAll('img[src="x"]').length,0);assert.ok(!root.textContent.includes('owner private'));

root.innerHTML=illustratedReleaseMarkup(APP_ANNOUNCEMENT.version,APP_ANNOUNCEMENT.changes);
assert.equal(root.querySelectorAll('.release-feature').length,1);
assert.equal(root.querySelectorAll('.release-roundup-readers img').length,0);
for(const title of ['13 новых чтецов','Кибла на карте','Узнать чтение · бета','Мединский мусхаф','Режим путника','Тафсиры ас-Саади и Ибн Касира'])assert.ok(!root.textContent.includes(title),'Current news does not repeat '+title);
assert.ok(root.textContent.includes('Кто слушает Коран'));assert.ok(!root.textContent.includes('Дуа по темам'));for(const title of ['Зикр в своём темпе','Дуа со звуком'])assert.ok(!root.textContent.includes(title));
for(const title of ['Алфавит для скачивания','Онлайн-занятия','Муаллим Сани','Прямой эфир'])assert.ok(!root.textContent.includes(title),'Closed or older features do not repeat in402');
assert.equal(root.querySelectorAll('.release-coming-button:disabled').length,0);
for(const feature of root.querySelectorAll('.release-feature'))assert.ok(feature.querySelector('img'),'Every current major feature card needs a real screenshot, portrait or artwork');
for(const img of root.querySelectorAll('img'))await fs.access(new URL('../dist/'+img.getAttribute('src').replace(/^\.\//,''),import.meta.url));
for(const change of APP_CHANGES)assert.ok(releaseFeatureForChange(change),'Assign feature-specific artwork before publishing: '+change);
root.innerHTML=illustratedReleaseMarkup(APP_VERSION,APP_CHANGES);assert.equal(root.querySelectorAll('.release-feature').length,APP_CHANGES.length);for(const feature of root.querySelectorAll('.release-feature'))assert.ok(feature.querySelector('.release-new-art img'),'Current release notes need pictures, not generic book icons');for(const img of root.querySelectorAll('.release-new-art img'))await fs.access(new URL('../dist/'+img.getAttribute('src').replace(/^\.\//,''),import.meta.url));
const deadline=Date.parse(APP_NEWS_UNTIL);assert.ok(releaseHighlightActive(deadline-1));assert.equal(releaseHighlightActive(deadline),false);assert.equal(releaseHighlightActive(deadline+86400000),false);assert.equal(releaseHighlightMarkup(deadline),'');
root.innerHTML=releaseHighlightMarkup(deadline-1000);assert.ok(root.querySelector('[data-release-highlight]'));let opened=0;const realNow=Date.now;try{Date.now=()=>deadline-1000;bindReleaseHighlight(root,()=>opened++);root.querySelector('[data-release-highlight]')?.click();assert.equal(opened,1,'Seen news remains accessible throughout the three-day window');}finally{Date.now=realNow;root.replaceChildren();bindReleaseHighlight(root);}

const releaseModal=doc.createElement('dialog');releaseModal.id='modal';releaseModal.innerHTML='<div id="modal-content"></div>';doc.body.append(releaseModal);
try{
 Date.now=()=>deadline-1000;root.innerHTML=releaseHighlightMarkup(undefined,{home:true});bindReleaseHighlight(root);
 assert.ok(root.querySelector('[data-release-home]'),'Unread news appears on Home');
 root.querySelector('[data-release-highlight]').click();assert.equal(releaseModal.open,true);assert.ok(root.querySelector('[data-release-home]'),'Home stays stable behind the open modal');
 releaseModal.querySelector('[data-close]').click();assert.equal(releaseModal.open,false);assert.equal(root.querySelector('[data-release-home]'),null,'Понятно removes Home news immediately');
 assert.equal(releaseHighlightMarkup(undefined,{home:true}),'','Seen version keeps Home clear on the next render');
 root.innerHTML=releaseHighlightMarkup();bindReleaseHighlight(root);assert.ok(root.querySelector('[data-release-highlight]'),'Menu still offers read news');
 root.querySelector('[data-release-highlight]').click();assert.equal(releaseModal.open,true,'Menu reopens the roundup');releaseModal.querySelector('[data-close]').click();
}finally{Date.now=realNow;root.replaceChildren();bindReleaseHighlight(root);releaseModal.remove();}

const profile=doc.createElement('div');doc.body.append(profile);let dismissed=0;profile.onclick=()=>dismissed++;
profile.innerHTML=ownerUserCard({nickname:'Пользователь'},{avatarUrl:'blob:private-photo'});bindOwnerAvatarPreview(profile);
const open=profile.querySelector('.owner-avatar-open'),preview=profile.querySelector('.owner-avatar-preview');open.click();assert.equal(preview.open,true);assert.equal(dismissed,0);
preview.querySelector('img').click();assert.equal(preview.open,true);assert.equal(dismissed,0,'Looking at photo cannot dismiss its parent profile');
preview.querySelector('.owner-avatar-close').click();assert.equal(preview.open,false);
open.click();preview.click();assert.equal(preview.open,false,'Backdrop closes the preview');
profile.replaceChildren();assert.equal(doc.querySelector('.owner-avatar-preview'),null,'Switching or closing the profile removes its private photo preview');
assert.ok(!ownerUserCard({nickname:'No photo'}).includes('owner-avatar-open'));
console.log('PASS: illustrated release assets, honest availability, accessible carousel, safe future fallback and private avatar preview navigation.');
await w.happyDOM.abort();
