import{reciterIsAvailable,visibleReciters}from '../dist/js/quran-reciters.js';
import{rankingUiContext}from './lib/ranking-language-fixture.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import{Window}from '../tests/staff/node_modules/happy-dom/lib/index.js';
import{createLiveListeningTotal,createLiveCompetitionRows,createSharedListeningMotion,listeningSummaryMarkup,updateListeningSummary}from '../dist/js/listening-summary.js';
import*as language from '../dist/js/i18n.js';
import{esc}from '../dist/js/ui.js';
import{reciterInfo}from '../dist/js/quran-reciters.js';
import{listenerRing,assignListenerRings,medalForRank}from '../dist/js/reciter-ranking-core.js';
import{awardArtwork}from '../dist/js/quran-awards-core.js';
import{createListeningMeter,formatListeningTime}from '../dist/js/reciter-popularity-core.js';
const preview=createLiveListeningTotal(),scope={key:'owner:all:2026-10-21',eligible:true};
const sample=(server,local,extra={})=>preview.sample(server,{'ar.alafasy':local},{...scope,...extra});
assert.equal(sample(null,50),null,'Unknown server totals must never become invented totals');
assert.equal(sample(1000,50),1000);assert.equal(sample(1000,51),1001,'Real local progress paints before the upload');
assert.equal(sample(1000,51),1001,'Repeated render is not another second');
assert.equal(sample(1001,51),1001,'Server acknowledgement cannot add the same second again');
assert.equal(sample(1020,51),1020,'Other listeners’ server progress remains visible');
assert.equal(sample(1020,53),1022);
assert.equal(sample(900,53),900,'Respect privacy removals and server corrections');
assert.equal(sample(900,54),901);
assert.equal(sample(900,20),900,'A local reset establishes a fresh baseline');
assert.equal(sample(900,21),901);
assert.equal(sample(900,100,{key:'other:all:2026-10-21'}),900,'Account changes do not carry preview time');
assert.equal(sample(900,100,{key:'owner:day:2026-10-22'}),900,'Date/period changes reset the baseline');
assert.equal(sample(900,110,{eligible:false}),900,'Hidden/disabled/signed-out listeners cannot inflate the total');
preview.reset();assert.equal(sample(900,0.2),900);assert.equal(sample(900,0.9),900);assert.equal(sample(900,1.2),901,'Fractional audio samples accumulate once');
// The preview follows the actual meter, never a wall-clock-only animation.
const meterPreview=createLiveListeningTotal();let local=0,shown=meterPreview.sample(600,{},scope);
const meter=createListeningMeter({onProgress:(_id,seconds)=>{local+=seconds;shown=meterPreview.sample(600,{reciter:local},scope);}});
const audio=(status,positionSeconds,seekRevision=0)=>({status,positionSeconds,seekRevision,reciter:'ar.alafasy',surah:{number:2},index:0});
meter.sample(audio('playing',0),10000,true);meter.sample(audio('playing',1),11000,true);assert.equal(shown,601);
meter.sample(audio('paused',1),12000,true);meter.sample(audio('paused',1),18000,true);assert.equal(shown,601,'Pause does not count');
meter.sample(audio('playing',3600,1),19000,true);assert.equal(shown,601,'Seeking does not count');
meter.sample(audio('playing',3601,1),20000,true);assert.equal(shown,602);
// Exercise the actual Top SALAH render and its progress event with a real DOM.
const w=new Window({url:'https://fixture.invalid/#quran?view=reciters&filter=salah-top'}),host=w.document.createElement('main');w.document.body.append(host);
let motionClock=0,motionTick=null;let localSeconds=0,server=600,own={id:'owner',enabled:true,mode:'initial',notify:false};
const rows=[{id:'owner',reciter:'ar.alafasy',seconds:100,rank:1}],source=await fs.readFile(new URL('../dist/js/competition-page.js',import.meta.url),'utf8');
const context=vm.createContext(rankingUiContext({reciterIsAvailable,visibleReciters,createLiveListeningTotal,createSharedListeningMotion:()=>createSharedListeningMotion({now:()=>motionClock}),listeningSummaryMarkup,updateListeningSummary,personalDataAllowed:()=>true,showRestrictedFeature(){},reciterFilterTabs:()=>'',recentReciters:()=>[],read:(_k,d)=>d,write:()=>true,esc:String,toast(){},counterSyncStatus:()=>({signedIn:true}),RECITERS:[{id:'ar.alafasy'}],RECITER_FAVORITES_KEY:'fixture',normalizeReciterFavorites:()=>[],RANK_INTENTION_PHRASES:['Намерение'],rankTime:String,listenerPrivacyMarkup:()=>'',bindPopularConsent(){},personalListening:()=>({totals:{'ar.alafasy':localSeconds}}),competitionOwn:()=>own,cachedCompetition:()=>rows,competitionListeningTotal:()=>server,preloadCompetition:async()=>rows,clearCompetitionCache:()=>server=null,loadCompetition:async()=>rows,refreshCompetitionOwn:async()=>null,saveCompetitionSettings:async()=>{},connectCompetitionNotifications:async()=>{},syncCompetitionNow:async()=>{},competitionMarkup:()=>'<div data-rank="1">Лидер</div>',bindCompetitionView(){},captureCompetitionLayout:()=>new Map(),animateCompetitionChange(){},updateCompetitionTimes(){},showAwardWinners(){},window:w,document:w.document,location:w.location,URLSearchParams,Date,setInterval:(fn,ms)=>{if(ms===250)motionTick=fn;return 1;},clearInterval(){}}));
const page=vm.runInContext(source.replace(/^import.*$/gm,'').replaceAll('export ','')+';({mountCompetition})',context);
const stop=page.mountCompetition(host,()=>'<h1>Коран</h1>');for(let i=0;i<5;i++)await new Promise(r=>setImmediate(r));
const label=host.querySelector('[data-listening-total]'),rank=host.querySelector('[data-rank]');assert.equal(label.textContent,formatListeningTime(600));
localSeconds=1;w.dispatchEvent(new w.Event('salah:personal-listening-progress'));assert.equal(label.textContent,formatListeningTime(601));assert.equal(host.querySelector('[data-listening-total]'),label,'Progress updates text without rebuilding the page');assert.equal(host.querySelector('[data-rank]'),rank,'Playback cannot invent a new place');
w.dispatchEvent(new w.Event('salah:personal-listening-progress'));assert.equal(label.textContent,formatListeningTime(601));
server=601;w.dispatchEvent(new w.Event('salah:personal-listening-progress'));assert.equal(label.textContent,formatListeningTime(601));
motionClock=10000;server=621;w.dispatchEvent(new w.Event('salah:personal-listening-progress'));assert.equal(label.textContent,formatListeningTime(621),'Confirmed contributions display once without a catch-up queue');motionClock=11000;motionTick();assert.equal(label.textContent,formatListeningTime(621),'The display does not manufacture timer-driven intermediate seconds');assert.equal(host.querySelector('[data-rank]'),rank,'Animation does not remount the podium');motionClock=50000;motionTick();assert.equal(label.textContent,formatListeningTime(621),'Animation caps at the confirmed total');server=601;w.dispatchEvent(new w.Event('salah:personal-listening-progress'));assert.equal(label.textContent,formatListeningTime(601),'A server correction cancels the backlog immediately');
own={...own,mode:'hidden'};localSeconds=30;w.dispatchEvent(new w.Event('salah:personal-listening-progress'));assert.equal(host.querySelector('[data-listening-total]').textContent,formatListeningTime(601));
// Returning after a hidden interval rebases from the new snapshot once,
// rather than racing through missed minutes or clearing the label to an ellipsis.
Object.defineProperty(w.document,'hidden',{value:true,configurable:true});
w.document.dispatchEvent(new w.Event('visibilitychange'));motionClock=180000;
server=1801;motionTick();assert.equal(host.querySelector('[data-listening-total]').textContent,formatListeningTime(601),'Hidden timer does not repaint');
Object.defineProperty(w.document,'hidden',{value:false,configurable:true});
w.document.dispatchEvent(new w.Event('visibilitychange'));
motionTick();assert.equal(host.querySelector('[data-listening-total]').textContent,formatListeningTime(601),'Awaiting foreground refresh preserves the last value');
for(let i=0;i<5;i++)await new Promise(r=>setImmediate(r));
assert.equal(host.querySelector('[data-listening-total]').textContent,formatListeningTime(1801),'Foreground refresh shows its current snapshot directly');
motionClock=181000;motionTick();assert.equal(host.querySelector('[data-listening-total]').textContent,formatListeningTime(1801),'No replay of hidden-time backlog');
stop();const final=host.innerHTML;localSeconds=50;w.dispatchEvent(new w.Event('salah:personal-listening-progress'));assert.equal(host.innerHTML,final,'Leaving the page removes live updates');
server=2000;context.loadCompetition=async()=>{server=2500;return rows;};
const stopFresh=page.mountCompetition(host,()=>'<h1>Коран</h1>');
for(let i=0;i<5;i++)await new Promise(r=>setImmediate(r));
assert.equal(host.querySelector('[data-listening-total]').textContent,formatListeningTime(2500),'Fresh initial response replaces an old cached total without a catch-up burst');
stopFresh();await w.happyDOM.close();
console.log('PASS: live shared total from real audio only; pause/seek, duplicate renders, server acknowledgement/corrections, privacy, account/date/period changes, fractional progress, stable DOM and cleanup.');

// Modern detailed rows used to be excluded from the page's local preview:
// its header ticked, but the portrait's reciters[] waited for a 15s upload.
const modernWindow=new Window({url:'https://fixture.invalid/#quran?view=reciters&filter=salah-top'}),modernDoc=modernWindow.document,modernHost=modernDoc.createElement('main');modernDoc.body.append(modernHost);
modernDoc.body.insertAdjacentHTML('beforeend','<dialog id="modal"><div id="modal-content"></div></dialog>');
const ownId='11111111-1111-4111-8111-111111111111',otherId='22222222-2222-4222-8222-222222222222',a='ar.alafasy',b='ar.yasseraldossaricontinuous',timers=new Map();let timerId=0,rawPersonal=2000,eligibleTotals={[a]:20,[b]:10},cloudTotal=500,guest=null,auth={signedIn:true,userId:ownId},registered={id:ownId,enabled:true,mode:'initial',notify:false},resolvePoll=null;
const modernRow=(seconds=100,totalSeconds=150)=>({id:ownId,mode:'initial',initial:'SA',nickname:'PRIVATE',reciter:a,seconds,totalSeconds,reciters:[{reciter:a,seconds},{reciter:b,seconds:50}],rank:1});
let cloudRows=[modernRow(),{id:otherId,mode:'initial',initial:'U',reciter:b,seconds:40,totalSeconds:40,reciters:[{reciter:b,seconds:40}],rank:2}];
const shared=rankingUiContext({esc,reciterInfo,listenerRing,assignListenerRings,medalForRank,awardArtwork,read:(_key,fallback)=>fallback,write:()=>true,competitionAvatar:()=>{throw Error('No private photos');},ownerVerified:()=>false,ownerNeedsMfa:()=>false,verifyOwner:async()=>false,counterSyncStatus:()=>auth,competitionOwn:()=>registered,document:modernDoc,window:modernWindow,location:modernWindow.location,Date,URLSearchParams});
const viewContext=vm.createContext({...shared,reciterIsAvailable,visibleReciters}),viewSource=await fs.readFile(new URL('../dist/js/competition-view.js',import.meta.url),'utf8');
const view=vm.runInContext(viewSource.replace(/^import.*$/gm,'').replaceAll('export ','')+';({competitionMarkup,bindCompetitionView,updateCompetitionTimes,competitionScoreModeButton})',viewContext);
const modernContext=vm.createContext(rankingUiContext({reciterIsAvailable,visibleReciters,...shared,...view,createLiveListeningTotal,createLiveCompetitionRows,createSharedListeningMotion,listeningSummaryMarkup,updateListeningSummary,personalDataAllowed:()=>true,showRestrictedFeature(){},reciterFilterTabs:()=>'',recentReciters:()=>[],RECITERS:[{id:a},{id:b}],RECITER_FAVORITES_KEY:'fixture',normalizeReciterFavorites:()=>[],RANK_INTENTION_PHRASES:['Намерение'],listenerPrivacyMarkup:()=>'<input id="draft" value="unchanged">',bindPopularConsent(){},personalListening:()=>({totals:{[a]:rawPersonal}}),localCompetitionTotals:()=>({...eligibleTotals}),guestCompetitionOwn:()=>guest,cachedCompetition:()=>cloudRows,competitionListeningTotal:()=>cloudTotal,preloadCompetition:async()=>cloudRows,clearCompetitionCache(){},loadCompetition:async()=>resolvePoll?new Promise(resolve=>{resolvePoll.resolve=resolve;}):cloudRows,refreshCompetitionOwn:async()=>null,saveCompetitionSettings:async()=>{},connectCompetitionNotifications:async()=>{},syncCompetitionNow:async()=>{},captureCompetitionLayout:()=>new Map(),animateCompetitionChange(){},showAwardWinners(){},setInterval:(fn,ms)=>{const id=++timerId;timers.set(id,{fn,ms});return id;},clearInterval:id=>timers.delete(id)}));
const modernPage=vm.runInContext(source.replace(/^import.*$/gm,'').replaceAll('export ','')+';({mountCompetition})',modernContext),turns=async()=>{for(let i=0;i<6;i++)await new Promise(resolve=>setImmediate(resolve));};
language.setInterfaceLanguage('ru');let stopModern=modernPage.mountCompetition(modernHost,()=>'<h1>Коран</h1>');await turns();
let card=modernHost.querySelector('[data-competition-entry="'+ownId+'"]'),track=card.querySelector('.competition-reciter-track'),portrait=card.querySelector('img'),header=modernHost.querySelector('[data-listening-total]'),score=card.querySelector('[data-competition-score]'),portraitTime=card.querySelector('[data-competition-reciter-time="'+a+'"]'),otherCard=modernHost.querySelector('[data-competition-entry="'+otherId+'"]'),draft=modernHost.querySelector('#draft');
const progress=()=>modernWindow.dispatchEvent(new modernWindow.Event('salah:personal-listening-progress'));
const seconds=node=>Number(node.dataset.listeningSeconds),podium=value=>Math.floor(value/3600)+':'+String(Math.floor(value%3600/60)).padStart(2,'0')+':'+String(value%60).padStart(2,'0');
const stable=()=>{assert.equal(modernHost.querySelector('[data-competition-entry="'+ownId+'"]'),card);assert.equal(card.querySelector('.competition-reciter-track'),track);assert.equal(card.querySelector('img'),portrait);assert.equal(modernHost.querySelector('[data-listening-total]'),header);assert.equal(card.dataset.competitionRank,'1');assert.equal(otherCard.querySelector('[data-competition-score]').textContent,'0:00:40','Presence must not invent another participant’s progress');};
Object.defineProperty(track,'clientWidth',{value:100});track.scrollLeft=100;track.dispatchEvent(new modernWindow.Event('scroll'));draft.value='Unsent';draft.focus();draft.setSelectionRange(1,4);modernHost.scrollTop=75;
rawPersonal+=30;progress();assert.equal(seconds(header),500,'Full personal history during a paused Top cannot advance the header');assert.equal(portraitTime.textContent,'0:01:40');
for(let step=1;step<=15;step++){eligibleTotals[a]=20+step;progress();assert.equal(seconds(header),500+step);assert.equal(score.textContent,podium(150+step));assert.equal(portraitTime.textContent,podium(100+step));stable();assert.equal(track.scrollLeft,100);assert.equal(draft.value,'Unsent');assert.equal(modernDoc.activeElement,draft);assert.equal(draft.selectionStart,1);assert.equal(modernHost.scrollTop,75);}
progress();assert.equal(seconds(header),515,'Duplicate media notifications are not extra seconds');
// A real acknowledgement of these same fifteen seconds must not add them twice.
cloudTotal=515;cloudRows=[modernRow(115,165),cloudRows[1]];[...timers.values()].find(timer=>timer.ms===5000).fn();await turns();assert.equal(seconds(header),515);assert.equal(portraitTime.textContent,podium(115));assert.equal(score.textContent,podium(165));stable();
// While an old response is pending, local progress keeps painting; arrival of
// that old snapshot must not roll the self-only preview back.
resolvePoll={};[...timers.values()].find(timer=>timer.ms===5000).fn();eligibleTotals[a]++;progress();assert.equal(seconds(header),516);resolvePoll.resolve(cloudRows);resolvePoll=null;await turns();assert.equal(seconds(header),516);assert.equal(portraitTime.textContent,podium(116));stable();
eligibleTotals[b]++;progress();assert.equal(seconds(header),517);assert.equal(portraitTime.textContent,podium(116),'Switching reciters must leave the previous reciter unchanged');assert.equal(card.querySelector('[data-competition-reciter-time="'+b+'"]').textContent,podium(51));assert.equal(score.textContent,podium(167));
for(const code of ['en','ar','ru']){language.setInterfaceLanguage(code);stable();assert.equal(portraitTime.textContent,podium(116));assert.equal(track.scrollLeft,100);assert.equal(draft.value,'Unsent');assert.equal(modernDoc.activeElement,draft);assert.equal(draft.selectionStart,1);}
const storedRows=JSON.stringify(cloudRows);[...timers.values()].find(timer=>timer.ms===1000).fn();assert.equal(JSON.stringify(cloudRows),storedRows,'The preview never mutates the board or saved credit');
modernHost.querySelector('[data-competition-score-mode]').click();await turns();
assert.equal(modernHost.querySelector('[data-competition-entry="'+ownId+'"] [data-competition-score]').textContent,podium(116),'Heart mode shows the same eligible favorite-reciter preview');
assert.equal(seconds(modernHost.querySelector('[data-listening-total]')),517,'Mode switching never counts time a second time');
eligibleTotals[a]++;progress();assert.equal(modernHost.querySelector('[data-competition-entry="'+ownId+'"] [data-competition-score]').textContent,podium(117));assert.equal(seconds(modernHost.querySelector('[data-listening-total]')),518);
modernHost.querySelector('[data-competition-score-mode]').click();await turns();
assert.equal(modernHost.querySelector('[data-competition-entry="'+ownId+'"] [data-competition-score]').textContent,podium(168));assert.equal(modernHost.querySelector('[data-competition-reciter-time="'+a+'"]').textContent,podium(117));assert.equal(seconds(modernHost.querySelector('[data-listening-total]')),518);
stopModern();assert.equal(timers.size,0);
// Guest totals come from the existing offset-aware credited view, never raw
// guest/personal ledgers. A held guest remains still while audio progresses.
auth={signedIn:false,userId:null};registered=null;guest={id:ownId,guest:true,enabled:true,mode:'profile',totals:{[a]:7,[b]:3}};cloudTotal=515;stopModern=modernPage.mountCompetition(modernHost,()=>'<h1>Коран</h1>');await turns();
card=modernHost.querySelector('[data-competition-entry="'+ownId+'"]');header=modernHost.querySelector('[data-listening-total]');portraitTime=card.querySelector('[data-competition-reciter-time="'+a+'"]');rawPersonal+=90;progress();assert.equal(seconds(header),515);assert.equal(portraitTime.textContent,podium(115),'A paused/offset guest cannot catch up from personal history');
guest={...guest,totals:{[a]:8,[b]:3}};progress();assert.equal(seconds(header),516);assert.equal(portraitTime.textContent,podium(116));
auth={signedIn:true,userId:otherId};guest=null;registered={id:otherId,enabled:true,mode:'initial'};eligibleTotals={};progress();assert.equal(seconds(modernHost.querySelector('[data-listening-total]')),515,'Guest registration/account transfer resets preview scope, never imports the old delta');assert.equal(modernHost.querySelector('[data-competition-entry="'+ownId+'"] [data-competition-reciter-time="'+a+'"]').textContent,podium(115));
stopModern();await modernWindow.happyDOM.close();language.setInterfaceLanguage('ru');
const scoped=createLiveCompetitionRows(),scopeRows=[modernRow()],scopeOwn={id:ownId};
assert.equal(scoped.sample(scopeRows,scopeOwn,{[a]:20},{key:'all:day-1',eligible:true})[0].seconds,100);
assert.equal(scoped.sample(scopeRows,scopeOwn,{[a]:21},{key:'all:day-1',eligible:true})[0].seconds,101);
assert.equal(scoped.sample(scopeRows,scopeOwn,{[a]:21},{key:'day:day-1',eligible:true})[0].seconds,100,'A period switch establishes its own confirmed baseline');
assert.equal(scoped.sample(scopeRows,scopeOwn,{[a]:22},{key:'day:day-1',eligible:true})[0].seconds,101);
assert.equal(scoped.sample(scopeRows,scopeOwn,{[a]:22},{key:'day:day-2',eligible:true})[0].seconds,100,'Midnight cannot carry the previous day’s preview delta');
assert.equal(scoped.sample(scopeRows,scopeOwn,{[a]:9999},{key:'day:day-2',eligible:false})[0].seconds,100,'Hidden/disabled Top participation cannot borrow any local history');
console.log('PASS: modern self portrait/header update every eligible second, 15s acknowledgement and pending poll stay idempotent, multiple reciters/carousel/locale/drafts stay connected, paused/offset guests and transfers never borrow raw personal credit.');
