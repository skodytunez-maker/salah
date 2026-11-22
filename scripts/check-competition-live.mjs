import{reciterIsAvailable,visibleReciters}from '../dist/js/quran-reciters.js';
import{createCompetitionFastProgress}from '../dist/js/competition-fast-progress.js';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {Window} from '../tests/staff/node_modules/happy-dom/lib/index.js';
import {rankingUiContext} from './lib/ranking-language-fixture.mjs';
import * as language from '../dist/js/i18n.js';
import * as summary from '../dist/js/listening-summary.js';
import {safeListener} from '../dist/js/reciter-ranking-core.js';
import {esc} from '../dist/js/ui.js';
import {listeningDayKey,listeningPeriodTotals} from '../dist/js/reciter-popularity-core.js';

const w=new Window({url:'https://fixture.invalid/#quran?view=reciters&filter=salah-top'}),doc=w.document;
Object.assign(globalThis,{window:w,document:doc,location:w.location,Event:w.Event,CustomEvent:w.CustomEvent,localStorage:w.localStorage});
doc.body.innerHTML='<main id="top"></main><dialog id="modal"><div id="modal-content"></div></dialog>';
const host=doc.getElementById('top'),a='ar.alafasy',b='ar.yasseraldossaricontinuous',ownId='11111111-1111-4111-8111-111111111111',otherId='22222222-2222-4222-8222-222222222222';
let missingCalendarTotals=false;
let clock=Date.parse('2026-11-16T12:00:00Z'),hidden=false,online=true,auth={signedIn:true,userId:ownId},eligible={[a]:20,[b]:10},serverRevision=100,serverTotal=500,otherSeconds=40,ownSeconds=100,ownTotal=150,otherMode='profile',otherPresent=true,emptyDay=false,extraRow=null;
Object.defineProperty(doc,'hidden',{configurable:true,get:()=>hidden});Object.defineProperty(doc,'visibilityState',{configurable:true,get:()=>hidden?'hidden':'visible'});Object.defineProperty(w.navigator,'onLine',{configurable:true,get:()=>online});
class ClockDate extends Date{constructor(...args){super(...(args.length?args:[clock]));}static now(){return clock;}}
const timers=new Map(),intervals=new Map();let timerId=0,thinCalls=0,fullCalls=0,thinInFlight=0,maxThinInFlight=0,holdThin=false,holdFull=false,thinFailure=false,authCalls=0;
const thinHolds=[],fullHolds=[];
const schedule=(fn,ms)=>{const id=++timerId;timers.set(id,{fn,at:clock+ms,ms});return id;},cancel=id=>timers.delete(id);
const flush=async()=>{for(let i=0;i<12;i++)await new Promise(resolve=>setImmediate(resolve));};
async function advance(ms){clock+=ms;for(const[id,timer]of [...timers])if(timer.at<=clock){timers.delete(id);timer.fn();}await flush();}
const clone=value=>JSON.parse(JSON.stringify(value));
const baseRows=period=>emptyDay&&period==='day'?[]:[{id:ownId,mode:'initial',initial:'Я',guest:false,reciter:a,seconds:ownSeconds,totalSeconds:ownTotal,reciters:[{reciter:a,seconds:ownSeconds},{reciter:b,seconds:ownTotal-ownSeconds}],rank:1,activeForSeconds:45},...(otherPresent?[{id:otherId,mode:otherMode,initial:'Д',nickname:'PUBLIC OTHER',hasPhoto:true,guest:false,reciter:b,seconds:otherSeconds,totalSeconds:otherSeconds,reciters:[{reciter:b,seconds:otherSeconds}],rank:2,activeForSeconds:45}]:[]),...(extraRow?[clone(extraRow)]:[])];
function fullPayload(url){const day=url.searchParams.get('day');return{day,boards:Object.fromEntries(['all','day','week','month'].map(period=>[period,{revision:serverRevision,items:missingCalendarTotals&&['week','month'].includes(period)?baseRows(period).map(({totalSeconds,reciters,...row})=>row):baseRows(period),limited:false}])),listeningTotals:Object.fromEntries(['all','day','week','month'].map(period=>[period,emptyDay&&period==='day'?0:serverTotal]))};}
function thinPayload(url){const period=url.searchParams.get('period');return{day:url.searchParams.get('day'),period,mode:url.searchParams.get('mode'),revision:serverRevision,listeningTotal:emptyDay&&period==='day'?0:serverTotal,items:baseRows(period).map(({id,mode,guest,reciter,seconds,totalSeconds,reciters,rank,activeForSeconds})=>({id,mode,guest,reciter,seconds,totalSeconds,reciters,rank,activeForSeconds}))};}
const response=payload=>({ok:true,status:200,json:async()=>clone(payload)});
const fetcher=async(input,options)=>{
 const url=new URL(input);assert.equal(options.credentials,'omit');assert.equal(options.referrerPolicy,'no-referrer');assert.equal(options.headers.Authorization,undefined,'Public numeric consumption never reads or sends an Auth token');
 if(url.searchParams.get('live')==='1'){
  thinCalls++;thinInFlight++;maxThinInFlight=Math.max(maxThinInFlight,thinInFlight);const payload=clone(thinPayload(url));
  try{if(thinFailure)throw Error('temporary network failure');if(holdThin)return await new Promise(resolve=>thinHolds.push({payload,resolve}));return response(payload);}finally{thinInFlight--;}
 }
 assert.equal(url.searchParams.get('boards'),'1');fullCalls++;const payload=clone(fullPayload(url));return holdFull?new Promise(resolve=>fullHolds.push({payload,resolve})):response(payload);
};
const code=async name=>(await fs.readFile(new URL('../dist/js/'+name,import.meta.url),'utf8')).replace(/^import[^\n]*\n/gm,'').replace(/export /g,'');
const clientContext=vm.createContext(rankingUiContext({reciterIsAvailable,visibleReciters,createCompetitionFastProgress,personalDataAllowed:()=>true,OWNER_PROJECT_URL:'https://fixture.invalid',OWNER_PUBLIC_KEY:'fixture-public',RECITERS:[{id:a},{id:b}],safeListener,listeningDayKey,listeningPeriodTotals,read:(_key,fallback)=>fallback,write:()=>{throw Error('The public consumer cannot write storage');},window:w,document:doc,navigator:w.navigator,Event:w.Event,Date:ClockDate,Intl,AbortController,AbortSignal,fetch:fetcher,setTimeout:schedule,clearTimeout:cancel,setInterval:(fn,ms)=>{const id=++timerId;intervals.set(id,{fn,ms});return id;},clearInterval:id=>intervals.delete(id)}));
const client=vm.runInContext(await code('competition-client.js')+';({loadCompetition,loadCompetitionUpdate,watchCompetitionUpdates,cachedCompetition,competitionListeningTotal,clearCompetitionCache,competitionAvatar,initCompetition})',clientContext);
client.initCompetition({getAccount:()=>auth,getClient:()=>{authCalls++;throw Error('No Auth is needed to consume public updates');},getSnapshot:()=>({totals:eligible,days:{}}),isEnabled:()=>false});
const common={esc,window:w,document:doc,location:w.location,history:w.history,Event:w.Event,Date:ClockDate,URLSearchParams,RECITERS:[{id:a},{id:b}],read:(_key,fallback)=>fallback,write:()=>true,ownerVerified:()=>false,ownerNeedsMfa:()=>false,verifyOwner:async()=>false,counterSyncStatus:()=>auth,competitionOwn:()=>({id:ownId,enabled:true,mode:'initial',notify:false}),competitionAvatar:client.competitionAvatar,reciterInfo:id=>({id,name:id,portrait:'assets/person.svg'}),listenerRing:()=>'',assignListenerRings:()=>({}),medalForRank:()=>'',awardArtwork:()=>'',closeModal(){},setInterval:(fn,ms)=>{const id=++timerId;intervals.set(id,{fn,ms});return id;},clearInterval:id=>intervals.delete(id)};
const viewContext=vm.createContext(rankingUiContext({...common,reciterIsAvailable,visibleReciters})),view=vm.runInContext(await code('competition-view.js')+';({competitionMarkup,bindCompetitionView,updateCompetitionTimes,competitionScoreModeButton})',viewContext);
const pageContext=vm.createContext(rankingUiContext({reciterIsAvailable,visibleReciters,...common,...summary,...client,...view,competitionOwn:common.competitionOwn,personalDataAllowed:()=>true,showRestrictedFeature(){},reciterFilterTabs:()=>'',recentReciters:()=>[],RECITER_FAVORITES_KEY:'fixture',normalizeReciterFavorites:()=>[],RANK_INTENTION_PHRASES:['source'],listenerPrivacyMarkup:()=>'<input id="draft" value="unchanged">',bindPopularConsent(){},localCompetitionTotals:()=>({...eligible}),guestCompetitionOwn:()=>null,preloadCompetition:async()=>[],refreshCompetitionOwn:async()=>null,saveCompetitionSettings:async()=>{},connectCompetitionNotifications:async()=>{},syncCompetitionNow:async()=>{},captureCompetitionLayout:()=>new Map(),animateCompetitionChange(){},showAwardWinners(){}}));
const page=vm.runInContext(await code('competition-page.js')+';({mountCompetition})',pageContext);
language.setInterfaceLanguage('ru');let stop=page.mountCompetition(host,()=>'<h1>Коран</h1>');await flush();await advance(0);
let ownCard=host.querySelector('[data-competition-entry="'+ownId+'"]'),otherCard=host.querySelector('[data-competition-entry="'+otherId+'"]'),header=host.querySelector('[data-listening-total]'),draft=host.querySelector('#draft'),track=ownCard.querySelector('.competition-reciter-track'),portrait=ownCard.querySelector('img');
Object.defineProperty(track,'clientWidth',{value:100});track.scrollLeft=100;track.dispatchEvent(new w.Event('scroll'));draft.value='Unsent';draft.focus();draft.setSelectionRange(1,4);host.scrollTop=75;
const number=node=>Number(node.dataset.listeningSeconds),score=card=>card.querySelector('[data-competition-score]').textContent,stamp=n=>Math.floor(n/3600)+':'+String(Math.floor(n%3600/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');
const intact=()=>{assert.equal(host.querySelector('[data-competition-entry="'+ownId+'"]'),ownCard);assert.equal(host.querySelector('[data-competition-entry="'+otherId+'"]'),otherCard);assert.equal(host.querySelector('[data-listening-total]'),header);assert.equal(ownCard.querySelector('.competition-reciter-track'),track);assert.equal(ownCard.querySelector('img'),portrait);assert.equal(track.scrollLeft,100);assert.equal(host.querySelector('#draft'),draft);assert.equal(doc.activeElement,draft);assert.equal(draft.value,'Unsent');assert.equal(draft.selectionStart,1);assert.equal(host.scrollTop,75);};
assert.equal(number(header),500);assert.equal(score(otherCard),stamp(40));
for(let step=1;step<=15;step++){
 eligible[a]=20+step;w.dispatchEvent(new w.Event('salah:personal-listening-progress'));otherSeconds=40+step;serverTotal=500+step;serverRevision++;
 if(step===15){ownSeconds=115;ownTotal=165;serverTotal+=15;}
 await advance(1000);assert.equal(score(otherCard),stamp(40+step),'Each foreign second is supplied by the real public transport');assert.equal(score(ownCard),stamp(150+step));assert.equal(ownCard.querySelector('[data-competition-reciter-time="'+a+'"]').textContent,stamp(100+step));assert.equal(number(header),500+2*step,'Header and both participants use the same accepted snapshot plus the existing eligible self preview');intact();
}
assert.equal(thinCalls,16);assert.equal(maxThinInFlight,1);assert.equal(authCalls,0);assert.equal(serverTotal,530);
for(const locale of ['en','ar','ru']){language.setInterfaceLanguage(locale);intact();assert.equal(score(otherCard),stamp(55));assert.equal(number(header),530);}
// A newer confirmed second wins over an already in-flight old full response.
holdFull=true;const staleFull=client.loadCompetition('all',{force:true});await flush();const oldFull=fullHolds.shift();otherSeconds++;serverTotal++;serverRevision++;await advance(1000);assert.equal(score(otherCard),stamp(56));oldFull.resolve(response(oldFull.payload));holdFull=false;await staleFull;assert.equal(client.cachedCompetition('all').find(row=>row.id===otherId).seconds,56);assert.equal(client.competitionListeningTotal('all'),531);intact();
// Corrections are accepted directly; an active headphones status adds nothing.
otherSeconds-=3;serverTotal-=3;serverRevision++;await advance(1000);assert.equal(score(otherCard),stamp(53));assert.equal(number(header),528);const confirmed=score(otherCard);serverRevision++;await advance(1000);assert.equal(score(otherCard),confirmed,'No fresh eligible progress means no foreign tick even with activeForSeconds=45');intact();
thinFailure=true;await advance(1000);const failedCalls=thinCalls;await advance(1000);assert.equal(thinCalls,failedCalls,'A temporary gateway failure backs off instead of overlapping or spinning');assert.equal(score(otherCard),confirmed);assert.equal(number(header),528);thinFailure=false;await advance(1000);assert.ok(thinCalls>failedCalls);intact();
// No overlap, even if an aborted fetch implementation resolves late after hide.
holdThin=true;serverRevision++;await advance(1000);assert.equal(thinHolds.length,1);hidden=true;doc.dispatchEvent(new w.Event('visibilitychange'));hidden=false;doc.dispatchEvent(new w.Event('visibilitychange'));await advance(2000);assert.equal(thinHolds.length,1);assert.equal(maxThinInFlight,1);thinHolds.shift().resolve(response(thinPayload(new URL('https://fixture.invalid?day='+listeningDayKey(clock)+'&period=all&mode=total'))));holdThin=false;await flush();await advance(1000);assert.equal(maxThinInFlight,1);
online=false;w.dispatchEvent(new w.Event('offline'));const beforeOffline=thinCalls,shownOffline=number(host.querySelector('[data-listening-total]'));await advance(5000);assert.equal(thinCalls,beforeOffline);assert.equal(number(host.querySelector('[data-listening-total]')),shownOffline);
online=true;w.dispatchEvent(new w.Event('online'));serverRevision++;await advance(1000);assert.ok(thinCalls>beforeOffline);
// A profile-to-initial transition with the SAME public UUID strips the old
// nickname/photo immediately. The old pending full response cannot restore it.
holdFull=true;const privateOld=client.loadCompetition('all',{force:true});await flush();const privatePayload=fullHolds.shift();otherMode='initial';serverRevision++;await advance(1000);assert.equal(host.querySelector('[data-competition-entry="'+otherId+'"]'),null);assert.equal(host.textContent.includes('PUBLIC OTHER'),false);privatePayload.resolve(response(privatePayload.payload));await privateOld;await flush();assert.equal(client.cachedCompetition('all').some(row=>row.id===otherId),false);
holdFull=false;serverRevision++;await advance(1000);await flush();otherCard=host.querySelector('[data-competition-entry="'+otherId+'"]');assert.ok(otherCard);assert.equal(host.textContent.includes('PUBLIC OTHER'),false);assert.equal(otherCard.querySelector('.competition-user-face img'),null);
// Missing IDs are removed without waiting for full metadata. A switch to heart
// uses a fresh authoritative board rather than a stale inactive-mode cache.
otherPresent=false;serverRevision++;serverTotal-=otherSeconds;await advance(1000);await flush();assert.equal(host.querySelector('[data-competition-entry="'+otherId+'"]'),null);
otherPresent=true;otherMode='initial';serverTotal+=otherSeconds;serverRevision++;await client.loadCompetition('all',{force:true});await [...intervals.values()].find(timer=>timer.ms===5000).fn();await flush();host.querySelector('[data-competition-score-mode]').click();await flush();await advance(0);assert.equal(host.querySelector('[data-competition-entry="'+ownId+'"] [data-competition-score]').textContent,stamp(115));otherSeconds++;serverTotal++;serverRevision++;await advance(1000);assert.equal(host.querySelector('[data-competition-entry="'+otherId+'"] [data-competition-score]').textContent,stamp(otherSeconds));assert.equal(number(host.querySelector('[data-listening-total]')),serverTotal);
// Numeric data cannot fabricate a new participant identity or ranking card.
const newId='44444444-4444-4444-8444-444444444444';extraRow={id:newId,mode:'profile',initial:'Н',nickname:'NEW PUBLIC',hasPhoto:false,guest:false,reciter:b,seconds:10,totalSeconds:10,reciters:[{reciter:b,seconds:10}],rank:3,activeForSeconds:45};serverTotal+=10;serverRevision++;holdFull=true;await advance(1000);assert.equal(host.querySelector('[data-competition-entry="'+newId+'"]'),null);assert.equal(host.textContent.includes('NEW PUBLIC'),false);assert.equal(number(host.querySelector('[data-listening-total]')),serverTotal,'The whole aggregate is not limited to currently rendered cards');assert.equal(fullHolds.length,1);const newIdentity=fullHolds.shift();
// Full metadata across four periods can arrive after several newer thin ticks.
// It must hydrate the new identity with current confirmed values, not starve or
// restore its older score. Thin packets alone still cannot create the card.
for(let step=0;step<2;step++){extraRow.seconds++;extraRow.totalSeconds++;extraRow.reciters[0].seconds++;serverTotal++;serverRevision++;await advance(1000);assert.equal(host.querySelector('[data-competition-entry="'+newId+'"]'),null);assert.equal(number(host.querySelector('[data-listening-total]')),serverTotal);}
holdFull=false;newIdentity.resolve(response(newIdentity.payload));await flush();const newCard=host.querySelector('[data-competition-entry="'+newId+'"]');assert.ok(newCard,'Slow full metadata must eventually hydrate a still-public participant despite continuing newer numeric updates');assert.equal(newCard.dataset.competitionRank,'3','The latest confirmed roster supplies its rank');assert.equal(score(newCard),stamp(12),'Hydration uses the newest thin score instead of the stale full score');assert.equal(number(host.querySelector('[data-listening-total]')),serverTotal);extraRow.seconds++;extraRow.totalSeconds++;extraRow.reciters[0].seconds++;serverTotal++;serverRevision++;await advance(1000);assert.equal(host.querySelector('[data-competition-entry="'+newId+'"]'),newCard);assert.equal(score(newCard),stamp(13));
// Explicit scope changes abort old streams; a late numeric packet cannot cross
// an account/claim boundary or repopulate a privacy-cleared cache.
holdThin=true;serverRevision++;await advance(1000);assert.equal(thinHolds.length,1);const oldAccount=thinHolds.shift();auth={signedIn:true,userId:'33333333-3333-4333-8333-333333333333'};w.dispatchEvent(new w.Event('salah:counter-status'));oldAccount.resolve(response(oldAccount.payload));holdThin=false;await flush();await advance(1000);assert.equal(maxThinInFlight,1);
client.clearCompetitionCache();holdThin=true;await advance(1000);const cleared=thinHolds.shift();client.clearCompetitionCache();cleared.resolve(response(cleared.payload));holdThin=false;await flush();assert.equal(client.cachedCompetition('all'),null,'A pre-privacy-clear request cannot repopulate the cache');
await client.loadCompetition('all',{force:true});stop();const remountCalls=thinCalls;stop=page.mountCompetition(host,()=>'<h1>Коран</h1>');await flush();await advance(0);assert.equal(host.querySelector('[data-competition-entry="'+otherId+'"] [data-competition-score]').textContent,stamp(otherSeconds));assert.equal(number(host.querySelector('[data-listening-total]')),serverTotal,'A remount displays current confirmed values without replaying a foreign tail');assert.ok(thinCalls<=remountCalls+1);
for(const period of ['week','month']){
 host.querySelector('[data-competition-period="all"]').click();await flush();await advance(0);
 host.querySelector('[data-competition-score-mode]').click();await flush();await advance(0);
 host.querySelector('[data-competition-period="'+period+'"]').click();await flush();await advance(0);
 assert.equal(host.querySelector('[data-competition-score-mode]'),null,'A calendar period cannot switch to one favorite reciter');
 const card=host.querySelector('[data-competition-entry="'+ownId+'"]');
 assert.equal(score(card),stamp(ownTotal),'A calendar period displays total credit across reciters after switching from favorite mode');
}
missingCalendarTotals=true;client.clearCompetitionCache();
await assert.rejects(client.loadCompetition('week',{force:true}),/unavailable/);
assert.equal(client.cachedCompetition('week'),null);missingCalendarTotals=false;
// Midnight switches the exact day scope, without replaying a previous-day tail.
await client.loadCompetition('day',{force:true});host.querySelector('[data-competition-period="day"]').click();await flush();await advance(0);emptyDay=true;clock+=86400000;serverRevision++;[...intervals.values()].find(timer=>timer.ms===1000).fn();await flush();await advance(0);await advance(1000);await flush();assert.equal(number(host.querySelector('[data-listening-total]')),0);assert.equal(host.querySelector('[data-competition-entry="'+otherId+'"]'),null);
stop();const stoppedCalls=thinCalls;await advance(20000);assert.equal(thinCalls,stoppedCalls,'Unmounted Top consumes no further thin requests');assert.equal(authCalls,0);await w.happyDOM.close();language.setInterfaceLanguage('ru');
console.log('PASS: actual 1Hz public client + stable Top DOM, same-response foreign/header seconds, eligible self ack, stale/full/correction ordering, identity-mode privacy, inactive mode refresh, hidden/offline/abort no-overlap, account/privacy scope, midnight and cleanup without Auth/audio/storage or presence-based credit.');
