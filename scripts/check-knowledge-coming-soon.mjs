import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import{Window}from '../tests/staff/node_modules/happy-dom/lib/index.js';
const w=new Window({url:'https://example.invalid/salah/#knowledge'}),doc=w.document;
Object.assign(globalThis,{window:w,document:doc,location:w.location,localStorage:w.localStorage,Event:w.Event});
doc.body.innerHTML='<main id="app"></main><div id="toast" hidden></div>';
const{showKnowledge}=await import('../dist/js/knowledge.js'),{UPCOMING_KNOWLEDGE}=await import('../dist/js/knowledge-upcoming.js');
const{illustratedReleaseMarkup}=await import('../dist/js/release-gallery.js'),{APP_VERSION,APP_CHANGES,APP_ANNOUNCEMENT}=await import('../dist/js/app-release.js'),{releaseFeatureForChange}=await import('../dist/js/release-illustrations.js');
const host=doc.getElementById('app');let started=0;
for(const hash of ['#knowledge','#knowledge?view=muallim','#knowledge?view=online-lessons','#knowledge?view=live-stream']){
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
host.innerHTML=illustratedReleaseMarkup(APP_ANNOUNCEMENT.version,APP_ANNOUNCEMENT.changes);
assert.equal(host.querySelectorAll('.release-feature').length,4,'Current edition contains only the PDF and three upcoming features');
assert.equal(host.querySelectorAll('.release-coming-button:disabled').length,3,'News also clearly disables future features');
for(const feature of UPCOMING_KNOWLEDGE){
 const card=[...host.querySelectorAll('.release-feature')].find(c=>c.querySelector('h3').textContent===feature.title+' · скоро');
 assert.ok(card);assert.ok(card.querySelector('button:disabled'));assert.equal(card.querySelector('a,[href]'),null);
 const src=card.querySelector('img').getAttribute('src');await fs.access(new URL('../dist/'+src.replace(/^\.\//,''),import.meta.url));
}
for(const change of APP_CHANGES){assert.ok(releaseFeatureForChange(change),'Each change uses its own feature illustration');if(releaseFeatureForChange(change)!=='alphabet-pdf')assert.match(change,/Скоро|готовим/iu);}
assert.ok(APP_VERSION>=395);
// Verified owner access reveals only navigation to the private checks.
showKnowledge(host,{hash:'#knowledge',ownerAccess:true});
assert.equal(host.querySelectorAll('.knowledge-owner-preview').length,3);
assert.equal(host.querySelectorAll('.knowledge-coming-button').length,0);
for(const link of host.querySelectorAll('.knowledge-owner-preview')){
 assert.equal(new URL(link.href).origin,'https://example.invalid');assert.ok(link.hash.startsWith('#knowledge?preview='));
 assert.equal(link.target,'');
}
assert.equal(host.querySelector('[data-upcoming="live-stream"] a').textContent,'Открыть макет');
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


