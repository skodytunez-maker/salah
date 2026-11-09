import{reciterFilterTabs,recentReciters}from '../dist/js/quran-reciter-discovery.js';
import{listeningSummaryMarkup,updateListeningSummary,createLiveListeningTotal,createSharedListeningMotion}from '../dist/js/listening-summary.js';
import{personalDataAllowed}from '../dist/js/audience.js';
import assert from 'node:assert/strict';
import{competitionMotionPlan,competitionGlowFrames}from '../dist/js/competition-motion.js';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import{Window}from '../tests/staff/node_modules/happy-dom/lib/index.js';
import{competitionSnapshot,competitionDay,competitionSubscription}from '../supabase/functions/reciter-competition/core.mjs';
import{publicListenerRows}from '../supabase/functions/reciter-competition/listener-labels.mjs';
import{competitionPushEvent,dispatchCompetitionPush}from '../supabase/functions/background-reminders/competition-push.mjs';
import{notification}from '../supabase/functions/background-reminders/core.mjs';
import{reciterInfo}from '../dist/js/quran-reciters.js';
import{awardArtwork}from '../dist/js/quran-awards-core.js';
import{rankTime,listenerRing,assignListenerRings,medalForRank}from '../dist/js/reciter-ranking-core.js';
const now=Date.parse('2026-10-11T10:00:00Z'),id='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
const sample={action:'snapshot',device:id,totals:{'ar.alafasy':2400,'ar.badralturki':1500},days:{'2026-10-11':{'ar.alafasy':2400,'ar.badralturki':1500}},timeZone:'Asia/Yekaterinburg'};
assert.equal(competitionSnapshot(sample,now).totals['ar.alafasy'],2400);
assert.throws(()=>competitionSnapshot({...sample,totals:{'ar.alafasy':10}},now));
assert.throws(()=>competitionSnapshot({...sample,days:{'2026-02-30':{'ar.alafasy':1}}},now));
assert.throws(()=>competitionSnapshot({...sample,days:{'2026-10-11':{'ar.alafasy':86401}}},now));
assert.throws(()=>competitionSnapshot({...sample,totals:{'ar.unknown':10}},now));
assert.throws(()=>competitionSnapshot({...sample,timeZone:'Invalid/Place'},now));
assert.throws(()=>competitionSnapshot({...sample,nickname:'No identities in snapshots'},now));
assert.equal(competitionDay('2026-10-11',now),'2026-10-11');assert.throws(()=>competitionDay('2026-09-01',now));
const keys={p256dh:Buffer.from([4,...new Array(64).fill(1)]).toString('base64url'),auth:Buffer.alloc(16,1).toString('base64url')};
assert.equal(competitionSubscription({endpoint:'https://web.push.apple.com/a',keys}).keys.auth,keys.auth);
for(const endpoint of ['http://fcm.googleapis.com/a','https://localhost/a','https://web.push.apple.com.evil.example/a','https://user@web.push.apple.com/a','https://web.push.apple.com:8443/a'])assert.throws(()=>competitionSubscription({endpoint,keys}));
assert.throws(()=>competitionSubscription({endpoint:'https://web.push.apple.com/a',keys:{...keys,auth:'broken'}}));
const event={id,subscription:{},event_id:other,old_place:1,new_place:2,period:'all',at:now-1000};
assert.equal(competitionPushEvent(event,now).kind,'competition');assert.equal(competitionPushEvent({...event,new_place:1},now),null);assert.equal(competitionPushEvent({...event,at:now-3600000},now),null);
const payload=notification(competitionPushEvent(event,now),now);assert.equal(payload.url,'#quran?view=reciters&filter=salah-top&period=all');assert.equal(payload.expiresAt,event.at+3600000);
let sends=0,claimed=false;const db={competitionEvents:async()=>[event,event],competitionActive:async()=>true,competitionClaim:async()=>{if(claimed)return false;claimed=true;return true;},competitionComplete:async()=>{}};
assert.equal(await dispatchCompetitionPush({db,send:async()=>{sends++;return 'sent'},clock:()=>now}),1);assert.equal(sends,1);
claimed=false;db.competitionActive=async()=>false;assert.equal(await dispatchCompetitionPush({db,send:async()=>{throw Error('Must not notify after retaking place')},clock:()=>now}),0);
const source=await fs.readFile(new URL('../dist/js/competition-view.js',import.meta.url),'utf8'),escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ctx=vm.createContext({personalDataAllowed,read:()=>({}),write:()=>true,esc:escape,modal(){},closeModal(){},reciterInfo,rankTime,listenerRing,assignListenerRings,medalForRank,awardArtwork,competitionAvatar:()=>{throw Error('Anonymous photo must never be requested')}});
const api=vm.runInContext(source.replace(/^import.*\n/gm,'').replace(/export /g,'')+';({competitionMarkup,avatar,bindCompetitionView,updateCompetitionTimes})',ctx);
const people=Array.from({length:6},(_,i)=>({id:'00000000-0000-4000-8000-'+String(i+1).padStart(12,'0'),mode:'initial',initial:'SA',reciter:'ar.alafasy',seconds:2400-i*60,rank:i+1,nickname:'Hidden nickname',hasPhoto:false}));
const html=api.competitionMarkup(people);assert.equal((html.match(/class="competition-card /g)||[]).length,3);assert.equal((html.match(/class="competition-list-row"/g)||[]).length,2);assert.ok(!html.includes('Hidden nickname'));assert.match(html,/rank-medal-gold/);assert.match(html,/rank-medal-silver/);assert.match(html,/rank-medal-bronze/);assert.match(html,/40 мин/);assert.match(html,/Весь рейтинг/);
const tied=api.competitionMarkup([{...people[0],rank:1},{...people[1],rank:1},{...people[2],rank:3}]);assert.equal((tied.match(/rank-medal-gold/g)||[]).length,2);assert.match(tied,/rank-medal-bronze/);
for(const [rank,color]of [[1,'#d8be88'],[2,'#c2cbd8'],[3,'#bf926c']])assert.match(api.avatar({...people[0],rank}),new RegExp('--listener-ring:'+color),'User avatar must use its actual medal, including full list and profile popup');
assert.match(api.avatar({...people[0],rank:1}),/--listener-ring:#d8be88/);assert.match(api.avatar({...people[1],rank:1}),/--listener-ring:#d8be88/);
api.competitionMarkup(people);const fourthRing=api.avatar(people[3]).match(/--listener-ring:([^"]+)/)[1],fifthRing=api.avatar(people[4]).match(/--listener-ring:([^"]+)/)[1];assert.notEqual(fourthRing,fifthRing,'Matching anonymous initials below medal places retain distinct identity colors');

// Actual podium markup and live updates keep compact seconds and accessible full durations.
const clockWindow=new Window({url:'https://fixture.invalid/'}),clockHost=clockWindow.document.createElement('div');
ctx.document=clockWindow.document;clockWindow.document.body.append(clockHost);
clockHost.innerHTML=api.competitionMarkup(people.map((p,i)=>({...p,seconds:i?2400-i*60:3599})));
assert.equal(clockHost.querySelector('.competition-card .competition-time').textContent,'0:59:59');
api.updateCompetitionTimes(clockHost,people.map((p,i)=>({...p,seconds:i?2400-i*60:3601})));
assert.equal(clockHost.querySelector('.competition-card .competition-time').textContent,'1:00:01','Live hour rollover cannot restore the wrapping long label');
assert.equal(clockHost.querySelector('.competition-card .competition-time').getAttribute('aria-label'),'1 ч 0 мин 1 с');
assert.equal(clockHost.querySelector('.competition-list-row .competition-time').textContent,'37 мин','Full list keeps written units');
assert.equal(clockHost.querySelectorAll('.competition-card').length,3);
const rankOrigin='#quran?view=reciters&filter=salah-top&period=day',rankLocation={hash:rankOrigin};
let owner=false,mfa=false,gateCalls=0,rankPushes=[],profileDialog='';
const rankDialog=clockWindow.document.createElement('dialog');rankDialog.id='modal';
rankDialog.innerHTML='<div id="modal-content"></div>';clockWindow.document.body.append(rankDialog);
const rankList=rankDialog.querySelector('#modal-content');
Object.assign(ctx,{URLSearchParams,location:rankLocation,window:{dispatchEvent(){}},Event,
 counterSyncStatus:()=>({signedIn:true,userId:'test-owner'}),competitionOwn:()=>({id:people[0].id}),ownerVerified:()=>owner,ownerNeedsMfa:()=>mfa,verifyOwner:async()=>{gateCalls++;return owner;},
 history:{state:null,pushState(state,_unused,url){rankPushes.push({state,url});rankLocation.hash=url;},replaceState(_state,_unused,url){rankLocation.hash=url;}},
 modal:html=>{profileDialog=html;rankList.innerHTML=html;rankDialog.open=true;},closeModal(){rankDialog.open=false;}});
const rankRows=[{...people[0],mode:'profile',nickname:'Same name'},...people.slice(1)];
const publicRank=publicListenerRows(rankRows.map(p=>({...p,city:'private fixture city',country:'private fixture country'})));
assert.ok(publicRank.every(p=>!Object.hasOwn(p,'city')&&!Object.hasOwn(p,'country')),'Location never enters the public ranking payload');
assert.ok(!Object.hasOwn(publicRank[1],'nickname')&&!Object.hasOwn(publicRank[1],'hasPhoto'));
clockHost.innerHTML=api.competitionMarkup(rankRows);
assert.equal(clockHost.querySelectorAll('[data-competition-person]').length,0,'Guests cannot open ranking profiles');
const ownAccess={ownId:people[0].id};
clockHost.innerHTML=api.competitionMarkup(rankRows,ownAccess);
api.bindCompetitionView(clockHost,ownAccess);
let rankButtons=clockHost.querySelectorAll('[data-competition-person]');
assert.equal(rankButtons.length,1,'Ordinary accounts can only open their own row');
await rankButtons[0].onclick();assert.match(profileDialog,/Same name/);assert.equal(gateCalls,0);
clockHost.querySelector('#competition-all').onclick();
assert.equal(rankList.querySelectorAll('[data-competition-person]').length,1,'The full list enforces the same card restrictions');
assert.doesNotMatch(rankList.innerHTML,/Hidden nickname/);
const ownerAccess={owner:true,ownId:people[0].id};
clockHost.innerHTML=api.competitionMarkup(rankRows,ownerAccess);
api.bindCompetitionView(clockHost,ownerAccess);
rankButtons=clockHost.querySelectorAll('[data-competition-person]');
profileDialog='';await rankButtons[1].onclick();
assert.equal(rankPushes.length,0,'Stale owner buttons cannot open somebody else’s card');
assert.equal(profileDialog,'');
owner=true;
await rankButtons[0].onclick();
rankLocation.hash=rankOrigin;await rankButtons[1].onclick();
assert.deepEqual(JSON.parse(JSON.stringify(rankPushes)),[people[0],people[1]].map(person=>({state:{salahRankProfileBack:rankOrigin},url:'#admin?view=profile&listener='+person.id})));
for(const period of ['day','week','month','all']){
 const back=rankOrigin.replace('period=day','period='+period);
 rankLocation.hash=back;await rankButtons[1].onclick();
 assert.equal(rankPushes.at(-1).state.salahRankProfileBack,back);
 assert.equal(rankPushes.at(-1).url,'#admin?view=profile&listener='+people[1].id);
}
rankLocation.hash=rankOrigin;clockHost.querySelector('#competition-all').onclick();
const last=rankList.querySelector('[data-competition-person="'+people[5].id+'"]');
assert.ok(last);await last.onclick();assert.equal(rankPushes.at(-1).url,'#admin?view=profile&listener='+people[5].id);
owner=false;mfa=true;rankLocation.hash=rankOrigin;await rankButtons[1].onclick();assert.equal(rankPushes.length,8,'An owner needing MFA can verify from an anonymous participant’s protected card route');
await clockWindow.happyDOM.abort();

console.log('PASS: bounded snapshots, dates, safe push gateways, single delivery, retaken-rank suppression, top-five UI, medal ties and anonymous rendering.');

const oldPlaces=new Map([['a',{id:'a',rank:1,role:'podium',x:100,y:100,reciter:'one'}],['b',{id:'b',rank:2,role:'podium',x:0,y:120,reciter:'two'}]]);const newPlaces=[{id:'a',rank:2,role:'podium',x:0,y:120,reciter:'one'},{id:'b',rank:1,role:'podium',x:100,y:100,reciter:'two'}];const motion=competitionMotionPlan(oldPlaces,newPlaces);assert.equal(motion.length,2);assert.equal(motion.find(p=>p.id==='b').leader,true);assert.equal(motion.find(p=>p.id==='b').x,-100);assert.deepEqual(competitionMotionPlan(oldPlaces,newPlaces,true),[]);assert.deepEqual(competitionMotionPlan(new Map(),newPlaces),[]);console.log('PASS: leader swap preserves identities, moves in the right direction and respects reduced motion.');

// Polling seconds must update text without remounting photos or the page shell.
const pageSource=await fs.readFile(new URL('../dist/js/competition-page.js',import.meta.url),'utf8');let domWrites=0,timeUpdates=0,clockRows=[people[0]],refreshCallback;const eventHandlers={},host={querySelector:()=>null,querySelectorAll:()=>[],set innerHTML(value){domWrites++},get innerHTML(){return ''}};
const pageContext=vm.createContext({reciterFilterTabs,recentReciters,listeningSummaryMarkup,updateListeningSummary,createLiveListeningTotal,createSharedListeningMotion,competitionListeningTotal:()=>null,personalDataAllowed,URLSearchParams,location:{hash:'#quran?view=reciters&filter=salah-top'},read:(key,fallback)=>fallback,write:()=>true,esc:escape,toast(){},counterSyncStatus:()=>({signedIn:false}),RECITERS:[{id:'ar.alafasy'}],RECITER_FAVORITES_KEY:'fixture-favorites',normalizeReciterFavorites:()=>[],RANK_INTENTION_PHRASES:['Не забывай о намерении'],rankTime,listenerPrivacyMarkup:()=>'',bindPopularConsent(){},cachedCompetition:()=>null,preloadCompetition:async()=>[],clearCompetitionCache(){},personalListening:()=>({totals:{}}),loadCompetition:async()=>clockRows,competitionOwn:()=>null,refreshCompetitionOwn:async()=>null,saveCompetitionSettings:async()=>{},connectCompetitionNotifications:async()=>{},syncCompetitionNow:async()=>{},competitionMarkup:()=>'<p>ranking fixture</p>',bindCompetitionView(){},captureCompetitionLayout:()=>new Map(),animateCompetitionChange(){},updateCompetitionTimes:(target,rows)=>{timeUpdates++;assert.equal(rows[0].seconds,2460)},window:{addEventListener:(name,fn)=>eventHandlers[name]=fn,removeEventListener(){}},document:{hidden:false,addEventListener(){},removeEventListener(){}},setInterval:fn=>{if(!refreshCallback)refreshCallback=fn;return 1},clearInterval(){},Date});
const pageApi=vm.runInContext(pageSource.replace(/^import.*\n/gm,'').replace(/export /g,'')+';({mountCompetition})',pageContext);const cleanup=pageApi.mountCompetition(host,()=>'<h1>Коран</h1>');await new Promise(resolve=>setImmediate(resolve));const beforePoll=domWrites;clockRows=[{...people[0],seconds:2460}];refreshCallback();await new Promise(resolve=>setImmediate(resolve));assert.equal(domWrites,beforePoll,'Seconds polling must preserve the existing page and portraits');assert.equal(timeUpdates,1);cleanup();console.log('PASS: repeated polling updates seconds in place, without remounting portrait cards.');

let rankingActor={signedIn:true,userId:'fixture-owner'},completeOwnerCheck;
const accessStates=[];
Object.assign(pageContext,{counterSyncStatus:()=>rankingActor,ownerVerified:()=>false,ownerNeedsMfa:()=>false,
 verifyOwner:()=>new Promise(resolve=>{completeOwnerCheck=resolve;}),cachedCompetition:()=>clockRows,
 competitionMarkup:(_rows,access)=>{accessStates.push(access.owner);return '<p>ranking role fixture</p>';},
 updateCompetitionTimes(){}});
const closeAccessTest=pageApi.mountCompetition(host,()=>'<h1>Коран</h1>');
assert.equal(accessStates.at(-1),false,'Cards stay closed while checking owner access');
completeOwnerCheck(true);await new Promise(resolve=>setImmediate(resolve));
assert.equal(accessStates.at(-1),true,'The normal Top entry enables owner cards after verification');
rankingActor={signedIn:true,userId:'ordinary'};
eventHandlers['salah:counter-status']();
assert.equal(accessStates.at(-1),false,'Account changes immediately remove owner actions');
completeOwnerCheck(false);await new Promise(resolve=>setImmediate(resolve));
assert.equal(accessStates.at(-1),false);closeAccessTest();
console.log('PASS: owner card actions require verified role on Top entry and reset immediately on account change.');

const medalBefore=new Map([['first',{id:'first',rank:1,role:'podium',x:100,y:0}],['second',{id:'second',rank:2,role:'podium',x:0,y:20}],['third',{id:'third',rank:3,role:'podium',x:200,y:20}],['fourth',{id:'fourth',rank:4,role:'row',x:0,y:200}]]);const medalAfter=[{id:'fourth',rank:1,role:'podium',x:100,y:0},{id:'first',rank:2,role:'podium',x:0,y:20},{id:'second',rank:3,role:'podium',x:200,y:20}];const changes=competitionMotionPlan(medalBefore,medalAfter);assert.equal(changes.find(p=>p.id==='fourth').medal,'gold');assert.equal(changes.find(p=>p.id==='first').medal,'silver');assert.equal(changes.find(p=>p.id==='second').medal,'bronze');const samePlace=competitionMotionPlan(medalBefore,[{id:'first',rank:1,role:'podium',x:110,y:0}]);assert.equal(samePlace[0].medal,'','Layout shifts must not retrigger medal flashes');for(const [medal,color]of [['gold','#d8be88'],['silver','#c2cbd8'],['bronze','#bf926c']]){const frames=competitionGlowFrames(medal,'none');assert.ok(frames[1].boxShadow.includes(color));assert.equal(frames.at(-1).boxShadow,'none','Pulse restores the original styling');}assert.deepEqual(competitionMotionPlan(medalBefore,medalAfter,true),[]);console.log('PASS: changed podium places glow in their destination medal color, stable places do not flash and reduced motion is respected.');
