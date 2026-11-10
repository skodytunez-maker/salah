import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import{Window}from '../tests/staff/node_modules/happy-dom/lib/index.js';
import{QURAN_AWARDS,safeAward,safeAwardState,awardCollectionCounts,awardInfo,awardArtwork,awardPeriod,awardMetric}from '../dist/js/quran-awards-core.js';
import{createAwardPresentations,awardPresentationKey}from '../dist/js/award-celebration-core.js';
const id='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
const row=(kind,n=1)=>({id:String(n).padStart(8,'0')+'-aaaa-4aaa-8aaa-aaaaaaaaaaaa',kind,start:'2026-10-19',end:kind==='week'?'2026-10-26':kind==='month'?'2026-11-01':'2026-10-19',reciter:kind==='week'||kind==='month'?'ar.alafasy':null,seconds:kind==='week'||kind==='month'?42791:awardInfo(kind).hours?awardInfo(kind).hours*3600:0});
const payload=items=>({day:'2026-11-04',items,counts:{week:items.filter(x=>x.kind==='week').length},activeKinds:[],streak:{current:0,best:0,days:[]}});
const old=row('week'),state=safeAwardState({...payload([old]),counts:{week:3}});
assert.equal(state.counts.week,0,'A previous winner is not the current Top title holder');assert.equal(awardCollectionCounts(state).week,3,'The same previous winner retains every earned win in the collection');assert.equal(awardCollectionCounts(state).month,0);
let uid=id,items=[old],permitted=true,shown=[],clock=0,gate=null;const local=new Map(),storage={getItem:k=>local.get(k)??null,setItem:(k,v)=>local.set(k,v)};
const getAccount=()=>({signedIn:!!uid,userId:uid}),getAwards=()=>payload(items);
const engine=createAwardPresentations({storage,getAccount,getAwards,canShow:()=>permitted,now:()=>clock,show:async(value,options)=>{if(gate)await gate;if(!options.isActive())return null;shown.push(value.id);return {};}});
await engine.observe();assert.equal(shown.length,0,'First rollout does not replay old wins automatically');assert.ok(local.has(awardPresentationKey(id)));
items.push(row('month',2));permitted=false;await engine.observe();assert.equal(shown.length,0,'No automatic overlay over forms, audio or a hidden page');permitted=true;await engine.observe();assert.deepEqual(shown,[items[1].id]);await engine.observe();assert.equal(shown.length,1,'A refresh cannot repeat an acknowledged presentation');
const before=JSON.stringify(items);const remount=createAwardPresentations({storage,getAccount,getAwards,canShow:()=>true,show:async()=>{throw Error('must not replay');}});await remount.observe();assert.equal(JSON.stringify(items),before,'Presentation markers never alter earned records');
items.push(row('founder',3));await engine.observe();assert.equal(shown.length,1,'The original founder welcome remains the only automatic founder presentation');
items.push(row('hours25',4));let release;gate=new Promise(r=>release=r);const late=engine.observe();uid=other;await engine.observe();release();await late;gate=null;assert.equal(shown.length,1,'A switched-account image/result cannot show or acknowledge old-user rewards');uid=id;await engine.observe();assert.equal(shown.at(-1),items[3].id,'Unpresented actual rewards can be retried in their own account');
uid=null;items.push(row('streak7',5));await engine.observe();assert.equal(shown.length,2,'Signed-out visitors get no personal award popup');uid=id;
let failed=0;const recovery=createAwardPresentations({storage,getAccount,getAwards,now:()=>clock,canShow:()=>true,show:async()=>{failed++;return null;}});await recovery.observe();await recovery.observe();assert.equal(failed,1,'Image failures are backed off');clock=10001;await recovery.observe();assert.equal(failed,2,'A failed image never marks a reward as seen');
let blockedItems=[];const denied=createAwardPresentations({storage:{getItem(){throw Error('denied');},setItem(){throw Error('denied');}},getAccount,getAwards:()=>payload(blockedItems),canShow:()=>true,show:async()=>{shown.push('blocked-storage');return {};}});await denied.observe();blockedItems=[row('hours50',6)];await denied.observe();await denied.observe();assert.equal(shown.filter(x=>x==='blocked-storage').length,1,'Denied browser storage still deduplicates within the session');

const source=await fs.readFile(new URL('../dist/js/award-celebration.js',import.meta.url),'utf8');
async function fixture({imageGate=null,showGate=()=>true}={}){
 const w=new Window({url:'https://fixture.invalid/#account'});Object.defineProperty(w.document,'hidden',{value:false,writable:true});w.document.body.innerHTML='<main><button id="previous">Награда</button></main><aside inert></aside><dialog id="modal"></dialog>';w.document.getElementById('previous').focus();
 let active=true;const tasks=new Map();let serial=0;const images=[];
 class Picture{constructor(){const img=w.document.createElement('img');img.decode=async()=>{if(imageGate)await imageGate;};images.push(img);return img;}}
 const ctx=vm.createContext({safeAward,awardInfo,awardArtwork,awardPeriod,awardMetric,createAwardPresentations,competitionOwn:()=>({awards:getAwards()}),settings:{motion:false,transitions:true},Image:Picture,matchMedia:()=>({matches:false}),document:w.document,window:w,location:w.location,localStorage:storage,Date,setTimeout:(fn,ms)=>{tasks.set(++serial,{fn,ms});return serial;},clearTimeout:k=>tasks.delete(k)});
 const api=vm.runInContext(source.replace(/^import.*\n/gm,'').replace(/export /g,'')+';({showAwardCelebration,hideAwardCelebration,initAwardCelebrations})',ctx);
 const flush=async max=>{for(const[k,t]of [...tasks])if(t.ms<=max){tasks.delete(k);await t.fn();}await new Promise(r=>setImmediate(r));};
 return{w,api,flush,images,isActive:()=>active&&showGate(),revoke(){active=false;w.dispatchEvent(new w.Event('salah:counter-status'));},dispose:async()=>{api.hideAwardCelebration('inactive');await w.happyDOM.abort();}};
}
for(const [i,a]of QURAN_AWARDS.entries()){
 const f=await fixture();let restored=0;const real=row(a.kind,i+10),snapshot=JSON.stringify(real);await f.api.showAwardCelebration(real,{isActive:f.isActive,reduced:true,onClose:()=>restored++});
 const root=f.w.document.querySelector('.award-presentation');assert.ok(root,a.kind+' has a presentation');assert.equal(root.getAttribute('role'),'dialog');assert.equal(root.querySelector('h2').textContent,a.title);assert.ok(root.classList.contains('founder-welcome-reduced'));assert.equal(root.querySelector('img').getAttribute('src'),awardArtwork(a.kind));assert.equal(root.querySelector('.award-presentation-period').textContent,awardPeriod(real));assert.equal(f.w.document.querySelector('main').inert,true);assert.equal(f.w.document.activeElement,root.querySelector('button'));
 f.w.document.dispatchEvent(new f.w.KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true}));assert.equal(f.w.document.activeElement,root.querySelector('button'),'Keyboard stays within the presentation');
 root.querySelector('button').click();assert.equal(restored,1);assert.equal(f.w.document.querySelector('main').inert,false);assert.equal(f.w.document.querySelector('aside').inert,true,'Pre-existing inert state is restored');assert.equal(f.w.document.activeElement.id,'previous');assert.equal(JSON.stringify(real),snapshot,'Replay is presentation-only');await f.dispose();
}
const revoked=await fixture();await revoked.api.showAwardCelebration(row('week'),{isActive:revoked.isActive});revoked.revoke();assert.equal(revoked.w.document.querySelector('.award-presentation'),null);assert.equal(revoked.w.document.querySelector('main').inert,false);await revoked.dispose();
const fading=await fixture();let reopened=0;await fading.api.showAwardCelebration(row('month'),{isActive:fading.isActive,onClose:()=>reopened++});fading.w.document.querySelector('.award-presentation button').click();assert.ok(fading.w.document.querySelector('.founder-welcome-ending'));fading.revoke();assert.equal(fading.w.document.querySelector('.award-presentation'),null,'Account change also interrupts the dismissal fade immediately');await fading.flush(15000);assert.equal(reopened,0,'A cancelled fade never reopens an old private reward');await fading.dispose();
let loaded;const lazy=await fixture({imageGate:new Promise(r=>loaded=r)});const pending=lazy.api.showAwardCelebration(row('month'),{isActive:lazy.isActive});lazy.revoke();loaded();assert.equal(await pending,null,'A late image cannot show a previous account');await lazy.dispose();
const timed=await fixture();await timed.api.showAwardCelebration(row('hours25'),{isActive:timed.isActive});await timed.flush(6000);assert.ok(timed.w.document.querySelector('.award-presentation'),'A real presentation does not vanish immediately');await timed.flush(15000);assert.ok(timed.w.document.querySelector('.founder-welcome-ending'));await timed.flush(420);assert.equal(timed.w.document.querySelector('.award-presentation'),null);await timed.dispose();
const reduced=await fixture();await reduced.api.showAwardCelebration(row('streak30'),{isActive:reduced.isActive,reduced:true});reduced.w.document.dispatchEvent(new reduced.w.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));assert.equal(reduced.w.document.querySelector('.award-presentation'),null);await reduced.dispose();
const replaySource=await fs.readFile(new URL('../dist/js/quran-awards.js',import.meta.url),'utf8');
const replayCode=replaySource.slice(replaySource.indexOf('function bindAwardReplay('),replaySource.indexOf('export async function loadAwardWinners'));
let releaseReplayImage;
const replay=await fixture({imageGate:new Promise(resolve=>{releaseReplayImage=resolve;})});
const replayDialog=replay.w.document.getElementById('modal');
let onPlayback;
replay.api.initAwardCelebrations({getAccount:()=>({signedIn:true,userId:id}),canShow:()=>false,playback:{subscribe:fn=>{onPlayback=fn;}}});
replayDialog.innerHTML='<button data-award-celebrate>Посмотреть вручение</button>';
const replayButton=replayDialog.querySelector('button');let restored=0,requests=0;
const bindReplay=vm.runInNewContext(replayCode+';bindAwardReplay',{
 document:replay.w.document,showAwardCelebration:replay.api.showAwardCelebration,
 closeModal:()=>replayDialog.close(),toast:message=>assert.fail(message),
 refreshCompetitionOwn:async()=>{requests++;throw Error('offline');}
});
bindReplay(replayDialog,row('week'),{isActive:replay.isActive,onClose:()=>restored++});
replayDialog.showModal();
const cancelledReplay=replayButton.onclick();replayDialog.close();releaseReplayImage();await cancelledReplay;
assert.equal(replay.w.document.querySelector('.award-presentation'),null,'Closing the award during image load cancels the replay');
replayDialog.showModal();await replayButton.onclick();
assert.equal(requests,0,'An already displayed award can be replayed offline');
assert.equal(replayDialog.open,false,'The collection closes before the presentation starts');
replayDialog.dispatchEvent(new replay.w.Event('close'));
replay.w.dispatchEvent(new replay.w.Event('salah:competition-updated'));
onPlayback();
assert.ok(replay.w.document.querySelector('.award-presentation'),'Automatic scheduling outside Home must not cancel a manual replay');
assert.match(replay.w.document.querySelector('.award-presentation h2').textContent,/Лидер недели/);
replay.w.document.querySelector('.award-presentation button').click();await replay.flush(420);
assert.equal(restored,1);
await replay.api.showAwardCelebration(row('week'),{isActive:replay.isActive});
replay.w.location.hash='#more';replay.w.dispatchEvent(new replay.w.Event('hashchange'));
assert.equal(replay.w.document.querySelector('.award-presentation'),null,'Changing route still removes the presentation');
await replay.dispose();
console.log('PASS: permanent collection versus transferable Top title; all 15 real medals, dated replay, baseline/new-award queue, per-account deduplication, retry and late-account safety, reduced motion, keyboard/focus/inert restoration and dismissal.');
