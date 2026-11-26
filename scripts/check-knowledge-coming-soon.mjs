import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import{Window}from '../tests/staff/node_modules/happy-dom/lib/index.js';
const w=new Window({url:'https://example.invalid/salah/#knowledge'}),doc=w.document;
Object.assign(globalThis,{window:w,document:doc,location:w.location,localStorage:w.localStorage,Event:w.Event});
doc.body.innerHTML='<main id="app"></main><div id="toast" hidden></div>';
const{showKnowledge}=await import('../dist/js/knowledge.js'),{UPCOMING_KNOWLEDGE}=await import('../dist/js/knowledge-upcoming.js');
const{illustratedReleaseMarkup}=await import('../dist/js/release-gallery.js'),{APP_VERSION}=await import('../dist/js/app-release.js'),{releaseFeatureForChange}=await import('../dist/js/release-illustrations.js');
const host=doc.getElementById('app');let started=0;
for(const hash of ['#knowledge','#knowledge?view=muallim','#knowledge?view=online-lessons','#knowledge?view=live-stream','#knowledge?preview=online-lessons','#knowledge?preview=muallim','#knowledge?preview=live-stream']){
 w.location.hash=hash;showKnowledge(host,{hash,onStart:()=>started++});
 const cards=[...host.querySelectorAll('[data-upcoming]')];assert.equal(cards.length,3);
 for(const feature of UPCOMING_KNOWLEDGE){
  const card=host.querySelector('[data-upcoming="'+feature.id+'"]'),button=card.querySelector('button');
  assert.equal(card.querySelector('h2').textContent,feature.title);
  assert.equal(button.textContent,'Скоро');assert.equal(button.disabled,true);
  assert.equal(card.querySelector('a,[href],[data-learning-entry]'),null,'Announcement cannot act as a lesson/course launch link');
  const old=w.location.href;button.click();button.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));assert.equal(w.location.href,old);
 }
 assert.equal(started,0,'No future feature starts through click or direct hash');
 assert.ok(host.querySelector('a[href="#knowledge?view=alphabet"]'),'Existing alphabet remains available');
 assert.ok(host.querySelector('a[href="#knowledge?view=names"]'),'Existing names remain available');
 const links=host.querySelectorAll('[data-learning-entry]');assert.equal(links.length,3);links[0].click();assert.equal(started,1);started=0;
}
const{setInterfaceLanguage,t}=await import('../dist/js/i18n.js');
const{UI_LANGUAGE_CODES}=await import('../dist/js/interface-languages.js');
const faithHash='#knowledge?view=faith';
w.location.hash='#knowledge';
showKnowledge(host,{hash:w.location.hash});
assert.equal(host.querySelector('a[href="'+faithHash+'"] h2').textContent,'Основы веры');
w.location.hash=faithHash;
showKnowledge(host,{hash:faithHash});
const faithPage=host.querySelector('.faith-page');
assert.ok(faithPage,'The public card opens without a signed-in account');
assert.deepEqual([...faithPage.querySelectorAll('.faith-group ol')].map(list=>list.children.length),[5,6]);
assert.equal(faithPage.querySelector('.faith-source').getAttribute('href'),'https://sunnah.com/muslim:8a');
assert.equal(faithPage.querySelector('.faith-back').getAttribute('href'),'#knowledge');
for(const language of UI_LANGUAGE_CODES){
 setInterfaceLanguage(language);
 assert.equal(host.querySelector('.faith-page'),faithPage,'Changing language preserves the current study screen');
 assert.equal(faithPage.querySelector('h1').textContent,t('knowledgeUi.cards.faith.title'));
 for(const node of faithPage.querySelectorAll('[data-i18n]')){
  const key=node.dataset.i18n;
  assert.ok(node.textContent.trim()&&node.textContent!==key,'Missing localised text '+language+': '+key);
  assert.equal(node.textContent,t(key));
 }
}
setInterfaceLanguage('ru');
showKnowledge(host,{hash:faithHash,ownerAccess:true});
assert.equal(host.querySelector('.faith-page'),faithPage,'Owner verification refresh preserves the page');
w.location.hash='#knowledge';
showKnowledge(host,{hash:w.location.hash});
assert.ok(host.querySelector('.knowledge-page'),'Back returns directly to the Knowledge catalogue');
assert.equal(host.querySelector('.faith-page'),null);

const historical502Changes=['Коран без интернета: все страницы.','Намаз без интернета: сохранённое расписание.','Скачанное аудио: своя библиотека.'];
host.innerHTML=illustratedReleaseMarkup(502,historical502Changes);
assert.equal(host.querySelectorAll('.release-feature').length,3,'News502 contains exactly offline Quran, prayer schedules and downloaded audio');
assert.equal(host.querySelectorAll('.release-coming-button').length,0,'Closed features are not re-announced as new');
for(const feature of UPCOMING_KNOWLEDGE)assert.ok(![...host.querySelectorAll('.release-feature h3')].some(h=>h.textContent===feature.title+' · скоро'));
const historicalFeatures=['quran-offline-502','prayer-offline-502','audio-offline-502'];
assert.deepEqual(historical502Changes.map(releaseFeatureForChange),historicalFeatures,'Historical announcement502 covers only the three new offline features');
assert.deepEqual([...host.querySelectorAll('.release-new-art img')].map(img=>img.getAttribute('src')),historicalFeatures.map(name=>'./assets/updates/'+name+'.svg'),'Historical502 keeps its three exact feature-specific illustrations independently of the current edition');
assert.equal(host.querySelectorAll('.release-offline-preview.release-motion-preview [data-release-motion-part]').length,3);
assert.doesNotMatch(host.textContent,/тафсир|подписк|оплат|плат[её]ж|yookassa|Короткое напоминание каждый день|Своя атмосфера для чтения|Ночью чтение продолжается|Сохраните прослушанное|SALAH на вашем языке|Переводы смыслов с источниками/iu,'Closed, billing and previously announced features stay out of news502');
for(const img of host.querySelectorAll('.release-feature img'))await fs.access(new URL('../dist/'+img.getAttribute('src').replace(/^\.\//,''),import.meta.url));
assert.ok(APP_VERSION>=395);
// Verified owner access reveals only navigation to the private checks.
showKnowledge(host,{hash:'#knowledge',ownerAccess:true});
assert.equal(host.querySelectorAll('.knowledge-owner-preview').length,4);
assert.ok(host.querySelector('a[href="#knowledge?view=teacher-preview"]'));
assert.equal(host.querySelectorAll('.knowledge-coming-button').length,0);
for(const link of host.querySelectorAll('.knowledge-owner-preview')){
 assert.equal(new URL(link.href).origin,'https://example.invalid');assert.ok(link.hash.startsWith('#knowledge?view='));
 assert.ok(link.classList.contains('knowledge-card'));assert.ok(!link.classList.contains('knowledge-card-coming'));assert.equal(link.querySelector('button'),null);assert.ok(link.querySelector('.knowledge-action'));
 assert.doesNotMatch(link.textContent,/Открыть проверку|Открыть макет|Закрытая проверка/);
 assert.equal(new URL(link.href).pathname,'/salah/');
 assert.equal(link.target,'');
}
assert.equal(host.querySelector('[data-upcoming="live-stream"] .knowledge-action').textContent.trim(),'Перейти к эфиру');
assert.equal(host.querySelector('.knowledge-coming-title'),null,'Owner features are regular Knowledge cards, not Soon announcements');
assert.deepEqual([...host.querySelectorAll('.knowledge-owner-preview')].map(link=>link.hash),['#knowledge?view=teacher-preview','#knowledge?view=online-lessons','#knowledge?view=muallim','#knowledge?view=live-stream']);
showKnowledge(host,{hash:'#knowledge',ownerAccess:false});
assert.equal(host.querySelectorAll('.knowledge-owner-preview').length,0);
assert.equal(host.querySelectorAll('.knowledge-coming-button:disabled').length,3);
const source=await fs.readFile(new URL('../dist/js/knowledge-upcoming.js',import.meta.url),'utf8');
assert.doesNotMatch(source,/(?:https?|wss?):\/\/|livekit|ts\.net|\/api\/|import\(/iu,'Public announcements contain no private endpoint or dynamic launcher');
const sw=await fs.readFile(new URL('../dist/sw.js',import.meta.url),'utf8');
assert.ok(sw.includes('./js/knowledge-upcoming.js'));assert.ok(sw.includes('salah-shell-v'+APP_VERSION));
for(const feature of UPCOMING_KNOWLEDGE)assert.ok(sw.includes('./assets/updates/'+feature.art));
for(const file of ['js/muallim-sani.js','private/lessons.js','lessons-service.mjs'])await assert.rejects(fs.access(new URL('../dist/'+file,import.meta.url)),'Private launch code is not distributed');
await w.happyDOM.close();console.log('PASS: three disabled announcements, direct-hash/click/keyboard guards, preserved study links, illustrated news and private-code exclusion.');


