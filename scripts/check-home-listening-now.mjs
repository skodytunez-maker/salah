import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {Window} from '../tests/staff/node_modules/happy-dom/lib/index.js';
import {PGlite} from '../tests/staff/node_modules/@electric-sql/pglite/dist/index.js';
import {readListeningNow,createListeningNowHandler} from '../supabase/functions/listening-now/core.mjs';
import {homeActivityIcon} from '../dist/js/home-activity-icons.js';
import {listeningCountMarkup,updateListeningSummary} from '../dist/js/listening-summary.js';
import {releaseIllustrations} from '../dist/js/release-illustrations.js';
import {APP_ANNOUNCEMENT} from '../dist/js/app-release.js';
import {PrayerDisplay} from '../dist/js/prayer-display.js';
const pg=new PGlite();
await pg.exec(`create schema auth;create schema salah_competition_private;create schema salah_visits_private;
create table auth.users(id int,email_confirmed_at timestamptz,is_anonymous bool,banned_until timestamptz);
create table auth.sessions(id int,user_id int,not_after timestamptz);
create table salah_competition_private.preferences(user_id int,enabled bool);
create table reciter_listener_visibility(user_id int,mode text);
create table salah_competition_private.listener_presence(user_id int,session_id int,playing bool,reported_at timestamptz);
create table salah_competition_private.activity_presence(user_id int,session_id int,kind text,active bool,reported_at timestamptz);
create table salah_visits_private.guest_activity_presence(device_hash text,kind text,active bool,reported_at timestamptz);
insert into auth.users select i,case when i=6 then null else now() end,i=5,case when i=7 then now()+interval '1 hour' end from generate_series(1,10)i;
insert into auth.sessions select i,i,case when i=8 then now()-interval '1 second' end from generate_series(1,10)i;
insert into salah_competition_private.preferences select i,i<>4 from generate_series(1,10)i;
insert into reciter_listener_visibility select i,case when i=3 then 'hidden' when i=2 then 'profile' else 'initial' end from generate_series(1,10)i;
insert into salah_competition_private.listener_presence select i,i,i<>10,case when i=9 then now()-interval '46 seconds' else now() end from generate_series(1,10)i;
insert into salah_competition_private.listener_presence values(1,1,true,now());
insert into salah_competition_private.activity_presence values(1,1,'reading',true,now()),(1,1,'reading',true,now()),(2,2,'dhikr',true,now()),(3,3,'reading',true,now()),(4,4,'dhikr',true,now());`);
const sql=async(strings,...values)=>{assert.equal(values.length,0);assert.match(strings[0],/^with live/);return (await pg.query(strings[0])).rows;};
assert.deepEqual(await readListeningNow(sql),{count:2,readers:1,dhikr:1},'Count each eligible account once, including anonymous display profiles');
const handler=createListeningNowHandler(sql);
let response=await handler(new Request('https://fixture.invalid?user=ignored'));
assert.deepEqual(await response.json(),{count:2,readers:1,dhikr:1});assert.equal(response.headers.get('cache-control'),'no-store');
assert.equal((await handler(new Request('https://fixture.invalid',{method:'PUT'}))).status,405);
assert.equal((await handler(new Request('https://fixture.invalid',{method:'OPTIONS'}))).status,204);
await pg.exec('update salah_competition_private.listener_presence set playing=false where user_id=2');
assert.deepEqual(await readListeningNow(sql),{count:1,readers:1,dhikr:1});
await pg.exec('delete from auth.sessions where user_id=1');
assert.deepEqual(await readListeningNow(sql),{count:0,readers:0,dhikr:1},'Revoked sessions cannot count');
response=await createListeningNowHandler(async()=>{throw Error('private SQL details');})(new Request('https://fixture.invalid'));
assert.equal(response.status,503);assert.deepEqual(await response.json(),{error:'unavailable'});
await pg.close();
const w=new Window({width:393,height:852}),doc=w.document,host=doc.createElement('span');
doc.body.className='home-page';doc.head.innerHTML='<style>'+(await fs.readFile(new URL('../dist/style.css',import.meta.url),'utf8'))+(await fs.readFile(new URL('../dist/home-selected.css',import.meta.url),'utf8'))+'</style>';
doc.body.innerHTML='<main id="app"><div class="app-home-shell"><div class="home-prayer-center"><div class="app-home-top">SALAH</div>'+PrayerDisplay({mode:'focus',next:{key:'Sunrise',time:Date.now()+300000},times:null,hasCity:true})+'</div></div></main>';
host.className='home-listening-now';doc.querySelector('.app-home-shell').prepend(host);
const layoutSnapshot=()=>{const style=node=>w.getComputedStyle(doc.querySelector(node)),shell=style('.app-home-shell'),center=style('.home-prayer-center'),heading=style('.app-home-top');return{height:shell.height,minHeight:shell.minHeight,centerPosition:center.position,centerTop:center.top,headingMargin:heading.marginTop};};
let restingLayout=null;
Object.defineProperty(doc,'hidden',{value:false,writable:true,configurable:true});
let pending=[],eligible=true,scheduled=null,cancelled=0,clock=0,isOwner=false,ownerHook=()=>{},opened=[];
const source=await fs.readFile(new URL('../dist/js/home-listening-now.js',import.meta.url),'utf8');
const ctx=vm.createContext({OWNER_PROJECT_URL:'https://fixture.invalid',OWNER_PUBLIC_KEY:'fixture-key',personalDataAllowed:()=>true,ownerVerified:()=>isOwner,ownerNeedsMfa:()=>false,onOwnerChange:fn=>{ownerHook=fn;return()=>{};},showHomeActivity:key=>opened.push(key),homeActivityIcon,listeningCountMarkup,updateListeningSummary,AbortController,setTimeout,clearTimeout});
const factory=vm.runInContext(source.replace(/^import.*$/gm,'').replaceAll('export ','')+';createHomeListeningNow;',ctx);
const controller=factory({doc,now:()=>clock,allowed:()=>eligible,interval:fn=>{scheduled=fn;return 1;},cancelInterval:()=>cancelled++,fetcher:(url,options)=>{assert.equal(url,'https://fixture.invalid/functions/v1/listening-now');assert.equal(options.credentials,'omit');assert.ok(!options.headers.Authorization);return new Promise(resolve=>pending.push({resolve,signal:options.signal}));}});
const finish=async data=>{pending.shift().resolve({ok:true,json:async()=>data});await new Promise(r=>setImmediate(r));if(restingLayout)assert.deepEqual(layoutSnapshot(),restingLayout,'Async activity counters must never move or recenter the countdown');};
controller.mount(host);assert.equal(host.hidden,true);restingLayout=layoutSnapshot();await finish({count:2});
assert.equal(host.hidden,false);assert.equal(host.textContent,'2');const value=host.querySelector('[data-listening-total]');assert.match(host.getAttribute('aria-label'),/Коран: 2/);
void controller.refresh();await finish({count:3});assert.equal(host.textContent,'3');assert.equal(host.querySelector('[data-listening-total]'),value);assert.ok(host.querySelector('.listening-step-a'));
void controller.refresh();await finish({count:2});assert.equal(host.textContent,'2');assert.ok(host.querySelector('.listening-step-b'),'Decreasing counts use the same digit transition');
void controller.refresh();await finish({count:0});assert.equal(host.hidden,true);assert.equal(host.textContent,'');
void controller.refresh();await finish({count:-1});assert.equal(host.hidden,true,'Invalid counts are never displayed');
void controller.refresh();await finish({count:19});assert.equal(host.textContent,'19','Counts never turn into minutes or seconds');
void controller.refresh();await finish({count:1,readers:2,dhikr:3});assert.equal(host.textContent,'123');assert.deepEqual([...host.children].map(n=>n.dataset.homeActivity),['count','readers','dhikr']);
void controller.refresh();await finish({count:1,readers:0,dhikr:3});assert.equal(host.textContent,'13');assert.equal(host.querySelector('[data-home-activity="readers"]'),null,'A zero book leaves no empty slot');
void controller.refresh();await finish({count:0,readers:0,dhikr:3});assert.equal(host.children.length,1);assert.equal(host.firstElementChild.dataset.homeActivity,'dhikr');
void controller.refresh();const late=pending.shift();controller.mount(null);assert.equal(late.signal.aborted,true);late.resolve({ok:true,json:async()=>({count:99})});await new Promise(r=>setImmediate(r));assert.equal(host.hidden,true);
eligible=false;controller.mount(host);assert.equal(pending.length,0);assert.equal(host.hidden,true);
eligible=true;void controller.refresh();await finish({count:3});
doc.hidden=true;doc.dispatchEvent(new w.Event('visibilitychange'));assert.equal(host.hidden,true);scheduled();assert.equal(pending.length,0);
doc.hidden=false;doc.dispatchEvent(new w.Event('visibilitychange'));await finish({count:4});assert.equal(host.textContent,'4');
isOwner=true;ownerHook();assert.equal(host.firstElementChild.tagName,'BUTTON');host.firstElementChild.click();assert.deepEqual(opened,['count']);isOwner=false;ownerHook();assert.equal(host.firstElementChild.tagName,'SPAN','Other accounts have no interactive people list');
controller.dispose();assert.ok(cancelled>0);assert.equal(host.hidden,true);
const news=releaseIllustrations(APP_ANNOUNCEMENT.version,['Главная: сейчас слушают Коран, читают и делают зикр.']);
assert.match(news,/home-listening-478.svg/);assert.match(news,/data-release-motion-part="element"/);assert.match(news,/release-home-listening-track/);
const app=await fs.readFile(new URL('../dist/js/app.js',import.meta.url),'utf8');assert.match(app,/homeListeningNow.mount\(null\)/);assert.match(app,/homeListeningNow.mount\(document.getElementById\('home-listening-now'\)\)/);
const css=await fs.readFile(new URL('../dist/home-selected.css',import.meta.url),'utf8');assert.match(css,/home-listening-now\[hidden\]\{display:none!important/);
for(const mode of ['focus','timetable']){doc.querySelector('.central-prayer').className='central-prayer '+mode;host.hidden=true;const before=layoutSnapshot();host.hidden=false;assert.deepEqual(layoutSnapshot(),before,'The activity badge cannot shift '+mode+' geometry');assert.equal(w.getComputedStyle(host).position,'absolute','The async status is outside the prayer layout');}
await w.happyDOM.close();
console.log('PASS: read-only private aggregate, distinct/anonymous/hidden/paused/stale/revoked sessions; zero and failure hiding; Top digit animation both ways; route cleanup, stale requests, hidden documents, restricted mode and looping feature news.');

// The same safe-edge bounds as the Radio control; no activity-driven ancestors.
assert.doesNotMatch(css,/:has\(\.home-listening-now:not\(\[hidden\]\)\)/,'Activity visibility must not change ancestor geometry');
assert.match(css,/position:absolute;right:0;top:calc\(24px \+ var\(--salah-safe-top,0px\)/);
for(const safeTop of [0,20,44,59,62])assert.ok(safeTop+16+Math.min(24,safeTop)>=safeTop+Math.min(40,safeTop));

// Reported iPhone13Pro: six-row title enters the status fade when its
// decorative lift survives the real sensor inset. Inspect the actual cascade;
// this is a CSS contract,not a physical Safari/GPU rendering claim.
function headingPixels(value,safeTop){
 const expression=value.replace(/var\(--salah-safe-top\s*(?:,\s*0px)?\)/g,String(safeTop)).replaceAll('px','').replaceAll('calc(','(').replace(/\b(min|max)\(/g,'Math.$1(');
 assert.match(expression.replace(/Math\.(?:min|max)/g,''),/^[\d\s+\-*/().,]+$/);
 return Function('"use strict";return ('+expression+')')();
}
function headingCSS(w,rules){return Array.from(rules).map(rule=>rule.type===4?(rule.conditionText.split(',').some(q=>w.matchMedia(q.trim()).matches)?headingCSS(w,rule.cssRules):''):rule.type===12?'':rule.cssText).join('\n');}
for(const [width,height,safeTop]of [[390,844,47],[393,852,59],[375,667,20],[390,844,0],[844,390,0],[768,1024,20]]){
 for(const mode of ['six','seven','owner','focus']){
  const hw=new Window({width,height}),hd=hw.document;
  hd.body.className='home-page';hd.documentElement.style.setProperty('--salah-safe-top',safeTop+'px');
  hd.body.innerHTML='<div class="app-home-shell"><div class="home-prayer-center"><div class="app-home-top"><div class="app-home-brand">SALAH</div></div><section class="central-prayer '+(mode==='focus'?'focus':'timetable')+'">'+(mode==='seven'?'<div class="tahajjud-row"></div>':'')+'</section>'+(mode==='owner'?'<div id="home-owner-update"></div>':'')+'</div></div>';
  // HappyDOM misreads descendant :has as its first compound; preserve the
  // seven-row condition and original three-class specificity in this fixture.
  const hs=hd.createElement('style');hs.textContent=css.replaceAll('@media(', '@media (').replaceAll(':has(.central-prayer.timetable .tahajjud-row)',':has(.tahajjud-row):not(.fixture-never-a):not(.fixture-never-b)');hd.head.append(hs);hs.textContent=headingCSS(hw,hs.sheet.cssRules);
  const hc=hw.getComputedStyle(hd.querySelector('.app-home-top')),top=headingPixels(hc.marginTop,safeTop),bottom=headingPixels(hc.marginBottom,safeTop);
  assert.equal(top+bottom,0,'Heading-only correction must retain total flow height and timetable position');
  const protectedInset=width<600&&height>600&&height>width&&safeTop>=20;
  if(mode==='six'&&protectedInset)assert.ok(top>=0,'Notched portrait heading must not be pulled into the status fade: '+JSON.stringify({width,height,safeTop,top}));
  else if(mode==='six')assert.equal(top,height<=600?0:height<=700?-12:-20,'Keep zero-inset,tablet and landscape heading placement');
  else assert.equal(top,0,'Seven rows,owner card and countdown keep approved placement');
  assert.equal(hc.transform,'none','Live title text stays off a transformed layer');
  await hw.happyDOM.close();
 }
}
console.log('PASS: six-row notched portrait heading clears decorative lift;total flow,seven-row/owner/focus,zero-inset,tablet,landscape and531activity layout retained. No phone-rendering claim.');
