import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Script,createContext} from 'node:vm';
let session=null,authCallback,allowed=false,requests=0,changed=0,needsMfa=false,notifyRefresh=false;
globalThis.window={supabase:{createClient:(_url,key,options)=>{
 assert.ok(key.startsWith('sb_publishable_'));
 assert.equal(options.auth.detectSessionInUrl,false);
 assert.equal(options.auth.storageKey,'salah-owner-session-v1');
 return {auth:{
  onAuthStateChange:fn=>{authCallback=fn;},
  getSession:async()=>({data:{session}}),
  refreshSession:async()=>{if(notifyRefresh){session={...session,access_token:session.access_token+'-renewed'};authCallback('TOKEN_REFRESHED',session);}return{data:{session}};},
  mfa:{listFactors:async()=>({data:{totp:[{id:'fixture-factor',status:'verified'}]}}),enroll:async()=>({data:{id:'fixture-factor',totp:{qr_code:'<svg/>',secret:'TEST-ONLY'}}}),challengeAndVerify:async({factorId,code})=>{assert.equal(factorId,'fixture-factor');if(code!=='123456')return {error:Error('invalid code')};needsMfa=false;return{error:null};}},
  signInWithPassword:async()=>({error:null}),
  signOut:async()=>{session=null;authCallback('SIGNED_OUT',null);return{error:null};}
 }};
}}};
globalThis.fetch=async(url,options)=>{requests++;assert.equal(options.cache,'no-store');assert.equal(options.credentials,'omit');assert.ok(url.startsWith('https://kbltwszfvphgbxdbczsb.supabase.co/functions/v1/owner-access'));if(needsMfa)return Response.json({owner:false,mfaRequired:true});if(allowed&&url.includes('mode=stats'))return Response.json({error:'statistics_not_connected'},{status:503});return allowed?Response.json({owner:true}):Response.json({error:'owner_only'},{status:403});};
const {verifyOwner,ownerVerified,onOwnerChange,signOutOwner,ownerStatistics,ownerNeedsMfa,ownerMfaFactors,verifyOwnerMfa}=await import('../dist/js/owner-auth.js');
onOwnerChange(()=>changed++);
assert.equal(await verifyOwner(),false);assert.equal(requests,0);assert.equal(ownerVerified(),false);
session={access_token:'forged-token'};
await assert.rejects(verifyOwner(),/не имеет доступа/);assert.equal(ownerVerified(),false);assert.equal(changed,0);
// Only the successful server response authorizes menu visibility.
session={access_token:'verified-user-session'};allowed=true;
assert.equal(await verifyOwner(),true);assert.equal(ownerVerified(),true);assert.equal(changed,1);
await assert.rejects(ownerStatistics(7),/ещё не подключена/);assert.equal(ownerVerified(),true);
// A later server denial removes access immediately, even with a saved session.
allowed=false;await assert.rejects(verifyOwner());assert.equal(ownerVerified(),false);assert.equal(changed,2);
allowed=true;await verifyOwner();await signOutOwner();assert.equal(ownerVerified(),false);
// Refresh arriving while the gate request is running must recheck the new
// session; it cannot authorize the stale response or strand a valid owner.
const originalFetch=globalThis.fetch;let refreshDuringGate=true;
await verifyOwner(); // Finish the sign-out callback's empty-session check.
session={access_token:'verified-user-session'};allowed=true;
globalThis.fetch=async(...args)=>{const response=await originalFetch(...args);if(refreshDuringGate){refreshDuringGate=false;authCallback('TOKEN_REFRESHED',session);}return response;};
const beforeRefresh=requests;assert.equal(await verifyOwner(),true);assert.equal(ownerVerified(),true);assert.equal(requests,beforeRefresh+2);
notifyRefresh=true;assert.equal(await verifyOwner({verifySession:true}),true);notifyRefresh=false;
await signOutOwner();assert.equal(ownerVerified(),false);
console.log('PASS: saved session alone does not authorize; server deny removes owner access; sign-out revokes the menu.');

await verifyOwner();
session={access_token:'verified-user-session'};allowed=true;needsMfa=true;
assert.equal(await verifyOwner(),false);assert.equal(ownerVerified(),false);assert.equal(ownerNeedsMfa(),true);
assert.equal((await ownerMfaFactors())[0].id,'fixture-factor');
await assert.rejects(verifyOwnerMfa('fixture-factor','123'),/шесть цифр/);
await assert.rejects(verifyOwnerMfa('fixture-factor','000000'),/не подошёл/);assert.equal(ownerVerified(),false);
await verifyOwnerMfa('fixture-factor','123456');assert.equal(ownerVerified(),true);
await signOutOwner();assert.equal(ownerNeedsMfa(),false);
console.log('PASS: MFA setup/challenge keeps cabinet hidden until a valid second factor and server confirmation.');

// Exercise the dashboard itself with fixture responses, including a total that
// exceeds the displayed page. No owner session or live account data is used.
const {notificationLabels}=await import('../dist/js/notification-status.js');
const {bindOwnerCardNavigation,createOwnerCardHistory}=await import('../dist/js/owner-card-navigation.js');
const {ownerUserCard,validOwnerUserId,ownerUserDate,bindOwnerNotificationInfo}=await import('../dist/js/owner-user-card.js');
const adminSource=await readFile(new URL('../dist/js/admin.js',import.meta.url),'utf8');
const adminExecutable=adminSource.replace(/^import[^\n]*\n/gm,'').replace(/\bexport (?=(?:async )?function)/g,'')+'\n;({showAdmin,mountOwnerAccount});';
class Element {
 constructor(tag='div',attributes={},parent=null){this.tag=tag;this.attributes=attributes;this.parent=parent;this.children=[];this.dataset={};this.open=false;this.hidden=false;this.isConnected=true;this.text='';for(const [key,value]of Object.entries(attributes))if(key.startsWith('data-'))this.dataset[key.slice(5)]=value;}
 set innerHTML(html){this.html=String(html);this.children=[];this.text='';const stack=[this];for(const token of this.html.match(/<[^>]*>|[^<]+/g)||[]){if(token.startsWith('</')){if(stack.length>1)stack.pop();continue;}if(token.startsWith('<')){const tag=/^<([\w-]+)/.exec(token)?.[1];if(!tag)continue;const attributes={};for(const match of token.matchAll(/([\w-]+)="([^"]*)"/g))attributes[match[1]]=match[2];const parent=stack.at(-1),child=new Element(tag,attributes,parent);parent.children.push(child);if(!['input','img','br'].includes(tag))stack.push(child);}else stack.at(-1).text+=token;}}
 get innerHTML(){return this.html||'';}
 set textContent(value){this.text=String(value);this.children=[];}
 get textContent(){return this.text+this.children.map(child=>child.textContent).join('');}
 insertAdjacentHTML(position,html){assert.equal(position,'beforeend');const fragment=new Element();fragment.innerHTML=html;for(const child of fragment.children){child.parent=this;this.children.push(child);}}
 matches(selector){return selector.startsWith('#')?this.attributes.id===selector.slice(1):selector.startsWith('.')?(this.attributes.class||'').split(' ').includes(selector.slice(1)):selector.startsWith('[')?Object.hasOwn(this.attributes,selector.slice(1,-1)):this.tag===selector;}
 querySelectorAll(selector){const found=[];const visit=node=>{for(const child of node.children){if(child.matches(selector))found.push(child);visit(child);}};visit(this);return found;}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
 setAttribute(key,value){this.attributes[key]=String(value);}
 getAttribute(key){return this.attributes[key]??null;}
 focus(){this.focused=true;}
}
function dashboard({allowed=true,mfaRequired=false,result={total:125,users:[{nickname:'Fixture',lastSignInAt:null}]},stats={total:0,stats:[]},site='',request,browser=null}={}){
 const app=new Element(),location={hash:'#admin',pathname:'/owner.html'},calls=[],intervals=new Map(),events=new Map(),document={hidden:false};let timerId=0;
 const context=createContext({bindOwnerNotificationInfo,bindOwnerCardNavigation,createOwnerCardHistory,ownerUserCard,validOwnerUserId,notificationLabels,location,Date,document,setInterval:fn=>{const id=++timerId;intervals.set(id,fn);return id},clearInterval:id=>intervals.delete(id),window:browser||{addEventListener:(event,fn)=>events.set(event,fn),removeEventListener:event=>events.delete(event)},analyticsSite:()=>site,esc:value=>String(value).replaceAll('<','&lt;').replaceAll('>','&gt;'),title:()=>'',ownerVerified:()=>allowed,verifyOwner:async()=>allowed,URLSearchParams,onOwnerChange:fn=>{events.set('owner-change',fn);return()=>events.delete('owner-change')},ownerNeedsMfa:()=>mfaRequired,ownerMfaFactors:async()=>[],ownerUsers:async page=>{calls.push(page);return request?request(page):result;},ownerStatistics:async()=>stats,signOutOwner:async()=>{allowed=false;}});
 return{app,location,calls,result,intervals,events,document,setAllowed:value=>{allowed=value;events.get('owner-change')?.()},...new Script(adminExecutable).runInContext(context)};
}
const settle=async()=>{for(let i=0;i<4;i++)await Promise.resolve();};
const cabinet=dashboard();await cabinet.showAdmin(cabinet.app);await settle();
assert.equal(cabinet.app.querySelector('.owner-users').hidden,true);
assert.equal(cabinet.app.querySelector('#owner-users-count').textContent,'125');
assert.equal(cabinet.app.querySelectorAll('.owner-user-row').length,1);
assert.deepEqual(cabinet.calls,[1],'The protected users endpoint loads without opening the section');
cabinet.app.querySelector('#users-next').onclick();await settle();assert.deepEqual(cabinet.calls,[1,2]);assert.equal(cabinet.app.querySelector('#owner-users-count').textContent,'125');
cabinet.result.total=126;cabinet.app.querySelector('#users-refresh').onclick();await settle();assert.equal(cabinet.app.querySelector('#owner-users-count').textContent,'126');
const empty=dashboard({result:{total:0,users:[]}});await empty.showAdmin(empty.app);await settle();assert.equal(empty.app.querySelector('#owner-users-count').textContent,'0');
const denied=dashboard({allowed:false});await denied.showAdmin(denied.app);await settle();assert.deepEqual(denied.calls,[]);assert.equal(denied.app.querySelector('#owner-users-count'),null);
const unavailable=dashboard({request:async()=>{throw Error('Fixture service failure');}});await unavailable.showAdmin(unavailable.app);await settle();assert.equal(unavailable.app.querySelector('#owner-users-count').textContent,'—');
const invalid=dashboard({result:{total:'125',users:[]}});await invalid.showAdmin(invalid.app);await settle();assert.equal(invalid.app.querySelector('#owner-users-count').textContent,'—');
let finish;const departed=dashboard({request:()=>new Promise(resolve=>finish=resolve)});await departed.showAdmin(departed.app);departed.location.hash='#more';finish({total:125,users:[]});await settle();assert.equal(departed.app.querySelector('#owner-users-count').textContent,'…');
cabinet.app.querySelector('#owner-tab-users').onclick();await settle();const beforePoll=cabinet.calls.length;for(const callback of cabinet.intervals.values())callback();await settle();assert.equal(cabinet.calls.length,beforePoll+1);cabinet.document.hidden=true;for(const callback of cabinet.intervals.values())callback();await settle();assert.equal(cabinet.calls.length,beforePoll+1);cabinet.location.hash='#home';cabinet.events.get('hashchange')();assert.equal(cabinet.intervals.size,0);assert.equal(cabinet.events.size,0);
console.log('PASS: presence refresh runs only for the open foreground list and stops on navigation.');
console.log('PASS: users tab shows protected total across pages, including zero; refresh updates count; denied, unavailable and stale screens never show a guessed count.');

// A stalled Auth request is cancelled, while caller cancellation and private headers remain intact.
const {createAuthTransport}=await import('../dist/js/auth-transport.js');
let timedSignal;const boundedAuth=createAuthTransport({timeout:15,request:(_input,options)=>new Promise((_resolve,reject)=>{timedSignal=options.signal;options.signal.addEventListener('abort',()=>reject(options.signal.reason),{once:true});})});await assert.rejects(boundedAuth('https://fixture.invalid/auth/v1/token'),error=>error.name==='TimeoutError');assert.equal(timedSignal.aborted,true);
const caller=new AbortController();let forwarded;const cancelledAuth=createAuthTransport({timeout:1000,request:(_input,options)=>new Promise((_resolve,reject)=>{forwarded=options;options.signal.addEventListener('abort',()=>reject(options.signal.reason),{once:true});})});const cancelledRequest=cancelledAuth('https://fixture.invalid/auth/v1/token',{signal:caller.signal,headers:{'X-Fixture':'unchanged'},method:'POST',body:'fixture-body'});caller.abort();await assert.rejects(cancelledRequest,error=>error.name==='AbortError');assert.equal(forwarded.headers['X-Fixture'],'unchanged');assert.equal(forwarded.method,'POST');assert.equal(forwarded.body,'fixture-body');
let successSignal;const completedAuth=createAuthTransport({timeout:15,request:async(_input,options)=>{successSignal=options.signal;return Response.json({ok:true});}});assert.equal((await (await completedAuth('https://fixture.invalid')).json()).ok,true);await new Promise(resolve=>setTimeout(resolve,25));assert.equal(successSignal.aborted,false);
console.log('PASS: Auth timeout cancels a stalled request; caller abort is preserved; successful requests clear their deadline and do not alter headers or body.');

// Moving the cabinet into the account must preserve the server gate and avoid
// showing an owner login form to other signed-in users.
const nested=dashboard();nested.location.hash='#account';await nested.mountOwnerAccount(nested.app);await settle();
assert.equal(nested.app.hidden,false);assert.equal(nested.app.querySelector('.owner-account').open,false);assert.deepEqual(nested.calls,[],'A closed account cabinet does not load private users');
const nestedPanel=nested.app.querySelector('.owner-account');nestedPanel.open=true;await nestedPanel.ontoggle();await settle();
assert.equal(nested.app.querySelector('#owner-users-count').textContent,'125');assert.equal(nested.app.querySelector('#owner-sign-out'),null,'Account keeps its own sign-out control');
const nestedCount=nested.app.querySelector('#owner-users-count');nestedPanel.open=false;nestedPanel.ontoggle();for(const fn of [...nested.intervals.values()])fn();assert.equal(nested.intervals.size,0);
nestedPanel.open=true;nestedPanel.ontoggle();await settle();nested.setAllowed(false);assert.equal(nested.app.hidden,true);assert.equal(nested.app.querySelector('.owner-account'),null);
const otherAccount=dashboard({allowed:false});otherAccount.location.hash='#account';await otherAccount.mountOwnerAccount(otherAccount.app);assert.equal(otherAccount.app.hidden,true);assert.equal(otherAccount.app.querySelector('#owner-login'),null);assert.deepEqual(otherAccount.calls,[]);
const secondFactor=dashboard({allowed:false,mfaRequired:true});secondFactor.location.hash='#account?owner=1';await secondFactor.mountOwnerAccount(secondFactor.app);const challenge=secondFactor.app.querySelector('.owner-account');assert.equal(challenge.open,true);await challenge.ontoggle();await settle();assert.ok(secondFactor.app.querySelector('#owner-mfa-step'));assert.deepEqual(secondFactor.calls,[],'MFA cannot load the private user list');
const legacyLink=dashboard();legacyLink.location.hash='#account?owner=1';await legacyLink.mountOwnerAccount(legacyLink.app);assert.equal(legacyLink.app.querySelector('.owner-account').open,true);
const leftAccount=dashboard();leftAccount.location.hash='#account';await leftAccount.mountOwnerAccount(leftAccount.app);leftAccount.location.hash='#more';leftAccount.events.get('hashchange')();assert.equal(leftAccount.events.has('owner-change'),false);
console.log('PASS: account cabinet stays hidden for other users; MFA gates data; collapse cancels polling; revocation removes the panel; legacy links open the account cabinet.');

const seenAt=dashboard({result:{total:1,online:0,users:[{nickname:'Offline Fixture',online:false,lastSeenAt:'2026-10-02T09:30:00Z'}]}});await seenAt.showAdmin(seenAt.app);await settle();assert.match(seenAt.app.querySelector('.owner-user-state').textContent,/Не в сетиБыл\(а\)/);assert.match(seenAt.app.querySelector('.owner-last-seen').textContent,/2026/);const liveUser=dashboard({result:{total:1,online:1,users:[{nickname:'Online Fixture',online:true,lastSeenAt:'2026-10-02T09:30:00Z'}]}});await liveUser.showAdmin(liveUser.app);await settle();assert.equal(liveUser.app.querySelector('.owner-last-seen'),null);console.log('PASS: last visit is displayed below offline status, while online users have no misleading previous-visit label.');

const flat=dashboard({stats:{total:9,updatedAt:'2026-10-02T10:00:00Z',stats:[{day:'2026-10-01',visitors:7},{day:'2026-10-02',visitors:14}]},site:'https://fixture.goatcounter.com'});await flat.showAdmin(flat.app);await settle();assert.equal(flat.app.querySelectorAll('[data-view]').length,3);assert.equal(flat.app.querySelectorAll('details').length,0,'Dashboard has no nested disclosures');assert.equal(flat.app.querySelector('#owner-visits').textContent,'9','Unique visitors stay distinct from daily sum');assert.match(flat.app.querySelector('#owner-metrics').textContent,/В среднем за день3/);assert.match(flat.app.querySelector('#owner-metrics').textContent,/Самый активный день02\.1014 посетителей/);assert.equal(flat.app.querySelectorAll('.owner-chart-row').length,2);assert.equal(flat.app.querySelector('.owner-reports-link').attributes.href,'https://fixture.goatcounter.com');flat.app.querySelector('#owner-tab-activity').onclick();assert.equal(flat.app.querySelector('#owner-panel-activity').hidden,false);assert.equal(flat.app.querySelector('#owner-panel-overview').hidden,true);assert.equal(flat.app.querySelector('#owner-periods').hidden,false);flat.app.querySelector('#owner-open-users').onclick();assert.equal(flat.app.querySelector('#owner-panel-users').hidden,false);assert.equal(flat.app.querySelector('#owner-periods').hidden,true);assert.equal(flat.app.querySelector('#owner-tab-users').attributes['aria-selected'],'true');flat.app.querySelector('#owner-tab-users').onkeydown({key:'ArrowRight',preventDefault(){}});assert.equal(flat.app.querySelector('#owner-tab-activity').attributes.tabindex,'0');assert.equal(flat.app.querySelector('#owner-tab-activity').focused,true);console.log('PASS: three accessible sections preserve distinct visitor totals, averages, peak, all daily rows and reports; no nested disclosures; user tab supports keyboard navigation.');

const notificationCabinet=dashboard({result:{total:3,users:[{nickname:'Active',notifications:{checkedAt:'2026-10-04T01:00:00Z',enabled:true,background:true}},{nickname:'Off',notifications:{checkedAt:'2026-10-04T01:00:00Z',enabled:false}},{nickname:'Old version'}]}});await notificationCabinet.showAdmin(notificationCabinet.app);await settle();assert.equal(notificationCabinet.app.querySelectorAll('.owner-notifications').length,3);assert.match(notificationCabinet.app.querySelector('.owner-user-rows').textContent,/Фоновая доставка подключена/);assert.match(notificationCabinet.app.querySelector('.owner-user-rows').textContent,/напоминания выключены/);assert.match(notificationCabinet.app.querySelector('.owner-user-rows').textContent,/нет данных/);console.log('PASS: compact owner rows distinguish connected, disabled and unknown notification states.');

const firstId='11111111-1111-4111-8111-111111111111',secondId='22222222-2222-4222-8222-222222222222';
assert.equal(validOwnerUserId('bad-id'),false);assert.equal(validOwnerUserId(firstId),true);assert.equal(ownerUserDate('not a date'),'Нет данных');assert.equal(ownerUserDate(null),'Нет данных');
const cards=dashboard({result:{total:2,users:[{id:firstId,nickname:'Same name',joinedAt:'2026-10-01T09:00:00Z',lastSeenAt:null},{id:secondId,nickname:'Same name',joinedAt:'2026-10-02T09:00:00Z',lastSeenAt:'2026-10-05T10:00:00Z',online:true,notifications:{enabled:true,background:true,checkedAt:'2026-10-05T10:00:00Z'}}]}});
await cards.showAdmin(cards.app);await settle();cards.app.querySelectorAll('[data-user]')[1].onclick();
assert.equal(cards.app.querySelector('#owner-user-detail').hidden,false);assert.equal(cards.app.querySelector('#owner-users-list').hidden,true);assert.match(cards.app.querySelector('#owner-user-card').textContent,/Same nameВ сети/);assert.equal(cards.app.querySelector('#owner-user-card').querySelectorAll('.is-connected').length,2);assert.equal(cards.app.querySelector('#owner-user-name').focused,true);
cards.result.users.reverse();cards.result.users[0].online=false;await cards.app.querySelector('#owner-user-refresh').onclick();await settle();assert.match(cards.app.querySelector('#owner-user-card').textContent,/Same nameНе в сети/);assert.equal(cards.app.querySelector('#owner-user-card').querySelectorAll('.is-connected').length,2,'Refresh follows the UID despite duplicate names and reordered rows');
cards.result.users=cards.result.users.filter(row=>row.id!==secondId);await cards.app.querySelector('#owner-user-refresh').onclick();await settle();assert.match(cards.app.querySelector('#owner-user-card-status').textContent,/не обновлены/);assert.equal(cards.app.querySelector('#owner-user-card').querySelectorAll('.is-connected').length,2,'Never replace a missing user with a different row');
cards.app.querySelector('#owner-user-back').onclick();assert.equal(cards.app.querySelector('#owner-user-card').innerHTML,'');assert.equal(cards.app.querySelector('#owner-user-detail').hidden,true);assert.equal(cards.app.querySelector('#owner-users-list').hidden,false);
cards.app.querySelector('[data-user]').onclick();assert.equal(cards.app.querySelector('#owner-user-card').querySelectorAll('.is-connected').length,0);let unknownInfo=cards.app.querySelector('#owner-notification-info');assert.equal(unknownInfo.hidden,true);let statusButton=cards.app.querySelector('[data-notification-info]');statusButton.onclick();assert.match(unknownInfo.textContent,/нет данных/);assert.equal(unknownInfo.hidden,false);statusButton.onclick();assert.equal(unknownInfo.hidden,true);assert.match(cards.app.querySelector('#owner-user-card').textContent,/Последнее посещениеНет данных/);
assert.ok(!ownerUserCard({nickname:'<img src=x onerror=alert(1)>',online:false}).includes('<img'),'User-controlled names are escaped');
const cardFailure=dashboard({request:async()=>{if(cardFailure.calls.length>1)throw Error('Fixture refresh unavailable');return{total:1,users:[{id:firstId,nickname:'Saved card'}]};}});await cardFailure.showAdmin(cardFailure.app);await settle();cardFailure.app.querySelector('[data-user]').onclick();await cardFailure.app.querySelector('#owner-user-refresh').onclick();await settle();assert.match(cardFailure.app.querySelector('#owner-user-card').textContent,/Saved card/);assert.match(cardFailure.app.querySelector('#owner-user-card-status').textContent,/unavailable/);
const cardRevoked=dashboard({result:{total:1,users:[{id:firstId,nickname:'Private fixture'}]}});cardRevoked.location.hash='#account';await cardRevoked.mountOwnerAccount(cardRevoked.app);const cardPanel=cardRevoked.app.querySelector('.owner-account');cardPanel.open=true;cardPanel.ontoggle();await settle();cardRevoked.app.querySelector('[data-user]').onclick();cardRevoked.setAllowed(false);assert.equal(cardRevoked.app.querySelector('#owner-user-card'),null);
console.log('PASS: private cards use stable IDs, distinguish unknown settings, survive polling failures and reordering, escape names and disappear on access revocation.');

// The actual card binding returns to the same stable row, while vertical/right gestures stay open.
cards.app.querySelector('#owner-user-detail').onclick({target:{closest:()=>null}});assert.equal(cards.app.querySelector('#owner-user-detail').hidden,true);assert.equal(cards.app.querySelector('[data-user]').focused,true);
let open=true,closed=0,clock=1000,selection='',surface={};
bindOwnerCardNavigation(surface,{dismiss:()=>{open=false;closed++},isOpen:()=>open,now:()=>clock,win:{getSelection:()=>({toString:()=>selection})}});
const pointer=(x,y,type='touch')=>({pointerId:1,clientX:x,clientY:y,pointerType:type,isPrimary:true,target:{closest:()=>null}});
surface.onpointerdown(pointer(200,100));surface.onpointerup(pointer(100,112));assert.equal(closed,1,'A clear left swipe closes');
open=true;surface.onclick(pointer(100,112));assert.equal(closed,1,'Synthetic click after swipe cannot close another card');clock+=600;
for(const [endX,endY,type]of [[250,100,'touch'],[198,220,'touch'],[100,100,'mouse']]){surface.onpointerdown(pointer(200,100,type));surface.onpointerup(pointer(endX,endY,type));assert.equal(open,true);clock+=600;}
surface.onpointerdown(pointer(200,100));surface.onpointercancel();surface.onclick(pointer(200,100));assert.equal(open,true,'Scrolling cancels the gesture without turning it into a tap');clock+=600;
selection='selected text';surface.onclick(pointer(200,100));assert.equal(open,true);selection='';surface.onclick({target:{closest:()=>({})}});assert.equal(open,true,'Controls retain their own actions');surface.onclick(pointer(200,100));assert.equal(open,false,'A second tap closes');
open=true;surface.onkeydown({key:'Escape',preventDefault(){}});assert.equal(open,false);
assert.match(ownerUserCard({nickname:'Health',appVersion:180,versionCheckedAt:'2026-10-06T10:00:00Z',lastSavedAt:'2026-10-06T09:00:00Z'}),/Версия SALAH<\/dt><dd>180/);
assert.match(ownerUserCard({nickname:'Legacy',appVersion:180}),/Версия SALAH<\/dt><dd>Нет данных/);
console.log('PASS: card tap, left swipe, vertical scrolling, text selection, controls, stable focus return and diagnostic unknown states.');

for(const notifications of [null,{enabled:true,background:true,checkedAt:'bad'},{enabled:false,background:true,checkedAt:'2026-10-06T12:00:00Z'}]){let cardMarkup=ownerUserCard({nickname:'State',notifications});assert.equal((cardMarkup.match(/is-connected/g)||[]).length,0,'Unknown/disabled states cannot look connected');assert.ok(!/Версия проверена|Последнее сохранение|Проверено/.test(cardMarkup));}
assert.equal((ownerUserCard({notifications:{enabled:true,background:false,permissionDenied:true,checkedAt:'2026-10-06T12:00:00Z'}}).match(/is-connected/g)||[]).length,1,'Namaz preference and delivery are separate');
console.log('PASS: compact green/dark checks keep enabled, disabled and unknown meanings accessible; technical times removed.');

// Model asynchronous browser Back (including an iOS edge swipe), rather than
// just calling the card's close button. Fixtures contain no live account data.
function browserHistory(){
 const listeners=new Map(),entries=[{url:'https://fixture.invalid/#settings',state:null},{url:'https://fixture.invalid/#account',state:{existing:'preserved'}}];
 let index=1,queued=0;
 const win={location:{href:entries[index].url},scrollX:0,scrollY:620,
  addEventListener(type,fn){if(!listeners.has(type))listeners.set(type,new Set());listeners.get(type).add(fn)},
  removeEventListener(type,fn){listeners.get(type)?.delete(fn)},
  scrollTo({left,top}){this.scrollX=left;this.scrollY=top},
  history:{get state(){return entries[index].state},pushState(state){entries.splice(++index);entries.push({url:win.location.href,state})},replaceState(state){entries[index].state=state},back(){queued++}}
 };
 const pop=()=>{win.location.href=entries[index].url;for(const fn of [...listeners.get('popstate')||[]])fn({state:entries[index].state})};
 return{win,entries,listeners,get index(){return index},get queued(){return queued},flush(){if(queued){queued--;index=Math.max(0,index-1);pop()}},forward(){index=Math.min(entries.length-1,index+1);pop()}};
}
const browser=browserHistory(),backCards=dashboard({browser:browser.win,result:{total:125,users:[{id:firstId,nickname:'Private test user'}]}});
backCards.location.hash='#account';await backCards.showAdmin(backCards.app,{isActive:()=>browser.win.location.href.endsWith('#account')});await settle();
backCards.app.querySelector('#owner-tab-users').onclick();await settle();
backCards.app.querySelector('#users-next').onclick();await settle();
const openBackCard=()=>backCards.app.querySelector('[data-user]').onclick();
openBackCard();assert.equal(browser.index,2);assert.equal(browser.entries[2].state.existing,'preserved');assert.ok(!JSON.stringify(browser.entries).includes(firstId));assert.ok(!JSON.stringify(browser.entries).includes('Private test user'));
browser.win.scrollY=100;browser.win.history.back();browser.flush();
assert.equal(browser.win.location.href,'https://fixture.invalid/#account','First native Back stays in the account');
assert.equal(backCards.app.querySelector('#owner-user-detail').hidden,true);assert.equal(backCards.app.querySelector('#owner-users-list').hidden,false);
assert.equal(browser.win.scrollY,620,'Return restores the list position');assert.match(backCards.app.querySelector('#owner-users-list').textContent,/2 \/ 3/,'Return keeps pagination');
assert.equal(backCards.app.querySelector('[data-user]').focused,true);
browser.win.history.back();browser.flush();assert.equal(browser.win.location.href,'https://fixture.invalid/#settings','Only the next Back leaves the account');
backCards.app.ownerDispose();assert.equal(browser.listeners.get('popstate').size,0,'Leaving removes the card history listener');

const clickHistory=browserHistory();let closedCards=0,activeCard=true;
const navigation=createOwnerCardHistory({win:clickHistory.win,isActive:()=>activeCard,dismiss:()=>closedCards++});
assert.equal(navigation.open(),true);navigation.open();assert.equal(clickHistory.entries.length,3,'Repeated open cannot push duplicate entries');
navigation.back();navigation.back();assert.equal(closedCards,1);assert.equal(clickHistory.queued,1,'Repeated close cannot go back twice');assert.equal(navigation.open(),false,'Wait for the pending browser traversal before reopening');
clickHistory.flush();assert.equal(clickHistory.index,1);assert.equal(navigation.open(),true);assert.equal(clickHistory.entries.length,3,'Reopen replaces the old forward entry');
navigation.back();clickHistory.flush();clickHistory.forward();assert.equal(closedCards,2);assert.ok(!clickHistory.win.history.state.salahOwnerCard,'Forward does not restore a private card from browser state');
navigation.open();activeCard=false;navigation.dispose();assert.equal(clickHistory.listeners.get('popstate').size,0);assert.ok(!clickHistory.win.history.state.salahOwnerCard);assert.equal(navigation.open(),false);
console.log('PASS: native Back returns card → same list/page/scroll → previous route; button/swipe consume one entry, rapid actions cannot skip pages, disposal removes private navigation state.');
