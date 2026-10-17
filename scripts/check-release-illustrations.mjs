import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import{Window}from '../tests/staff/node_modules/happy-dom/lib/index.js';
import{illustratedReleaseMarkup,bindIllustratedRelease}from '../dist/js/release-gallery.js';
import{ownerUserCard,bindOwnerAvatarPreview}from '../dist/js/owner-user-card.js';

const w=new Window({url:'https://example.invalid/'}),doc=w.document;
globalThis.matchMedia=()=>({matches:true});
const root=doc.createElement('div');doc.body.append(root);root.innerHTML=illustratedReleaseMarkup(341);
const cards=[...root.querySelectorAll('.release-feature')];assert.equal(cards.length,7);
assert.equal(cards[0].querySelector('h3').textContent,'Новые награды');
assert.ok(!/ч[её]тк|мутн/i.test(root.textContent));
assert.ok(root.textContent.includes('Оплата пока отключена')&&root.textContent.includes('Все функции приложения остаются бесплатными'));
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
root.querySelector('[data-release-next]').click();assert.equal(root.querySelector('[data-release-page]').textContent,'2/7');assert.equal(cards[0].inert,true);assert.equal(cards[1].inert,false);
strip.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true}));assert.equal(root.querySelector('[data-release-page]').textContent,'1/7');assert.equal(root.querySelector('[data-release-prev]').disabled,true);
const novemberNews=illustratedReleaseMarkup(342);root.innerHTML=novemberNews;assert.equal(root.querySelectorAll('.release-feature').length,2);assert.ok(root.textContent.includes('Ноябрь в календаре Тюмени'));assert.ok(root.textContent.includes('таблицы 2025 года'));assert.equal(root.querySelectorAll('svg').length,1);
const geoNews=illustratedReleaseMarkup(343);root.innerHTML=geoNews;assert.equal(root.querySelectorAll('.release-feature').length,2);assert.ok(root.textContent.includes('Первое место — выше'));assert.ok(root.textContent.includes('обновления приложения через Google Play'));
root.innerHTML=illustratedReleaseMarkup(346);assert.equal(root.querySelectorAll('.release-feature').length,1);assert.ok(root.textContent.includes('резервный источник'));assert.equal(root.querySelectorAll('svg').length,1);
root.innerHTML=illustratedReleaseMarkup(347);assert.equal(root.querySelectorAll('.release-feature').length,1);assert.equal(root.querySelector('h3').textContent,'Новые чтецы');assert.equal(root.querySelectorAll('.release-new-readers img').length,5);assert.ok(root.textContent.includes('109 сур'));for(const img of root.querySelectorAll('.release-new-readers img'))await fs.access(new URL('../dist/'+img.getAttribute('src').replace(/^\.\//,''),import.meta.url));
const future=illustratedReleaseMarkup(348,['<img src=x onerror=alert(1)>','Изменение','owner private']);root.innerHTML=future;
assert.equal(root.querySelectorAll('.release-feature').length,2);assert.equal(root.querySelectorAll('img[src="x"]').length,0);assert.ok(!root.textContent.includes('owner private'));

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
