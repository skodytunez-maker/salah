import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {Window} from '../tests/staff/node_modules/happy-dom/lib/index.js';
import * as language from '../dist/js/i18n.js';
import * as ui from '../dist/js/ui.js';
import * as teamUi from '../dist/js/team-ui.js';
import * as staffUi from '../dist/js/staff-ui.js';
import * as markup from '../dist/js/staff-markup.js';
import * as messenger from '../dist/js/staff-messenger.js';
import {staffMessageRoom} from '../dist/js/staff-message-status.js';
import {mountMessageEmojis} from '../dist/js/message-emojis.js';
import {bindIllustratedRelease} from '../dist/js/release-gallery.js';
import {RECITERS} from '../dist/js/quran-reciters.js';
import {createTeamPreviewAccess} from '../dist/js/team-preview-access.js';

const w=new Window({url:'https://salah.invalid/#more'}),doc=w.document;
Object.assign(globalThis,{window:w,document:doc,location:w.location,Event:w.Event,CustomEvent:w.CustomEvent,matchMedia:()=>({matches:true})});
w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
doc.body.innerHTML='<main id="app"></main><dialog id="modal"><div id="modal-content"></div></dialog>';
const app=doc.getElementById('app'),dialog=doc.getElementById('modal'),appSource=await fs.readFile(new URL('../dist/js/app.js',import.meta.url),'utf8');
const moduleSource=async name=>(await fs.readFile(new URL('../dist/js/'+name,import.meta.url),'utf8')).replace(/^import[^\n]*\n/gm,'').replace(/export /g,'').replaceAll('import.meta.url',JSON.stringify('https://salah.invalid/js/'+name));
const turns=async()=>{for(let i=0;i<8;i++)await new Promise(resolve=>setImmediate(resolve));};
let sharedVerified=false,sharedId=null,sharedListeners=new Set(),automaticRefresh=0,menuRefresh=0;
const changed=()=>{for(const listener of [...sharedListeners])listener();};
const sharedSubscribe=fn=>{sharedListeners.add(fn);return()=>sharedListeners.delete(fn);};
const moreContext=vm.createContext({...language,...ui,app,document:doc,window:w,location:w.location,
 counterSyncStatus:()=>({signedIn:true,userId:sharedId,nickname:'Пользователь'}),ownerVerified:()=>sharedId==='owner',teamPreviewVerified:()=>sharedVerified,
 settingsIcon:()=>'<svg aria-hidden="true"></svg>',bindAppSharing(){},appSharingMarkup:()=>'',mountMenuAvatar(){},
 personalDataAllowed:()=>true,currentRoute:'more',settings:{onboarded:true},initTeamPreviewAccess:options=>{moreContext.accessChanged=options.onChange;},
 teamPreviewNews:{refresh:()=>automaticRefresh++,open:()=>{throw Error('Menu must not reopen the private news');}},stopRadioPreview(){},
 render:()=>{menuRefresh++;vm.runInContext('more()',moreContext);}
});
vm.runInContext(appSource.slice(appSource.indexOf('function more(){'),appSource.indexOf("window.addEventListener('salah:counter-status'")),moreContext);
const accessCall=appSource.split(/\r?\n/).find(line=>line.startsWith('if(personalDataAllowed())initTeamPreviewAccess('));assert.ok(accessCall);vm.runInContext(accessCall,moreContext);
for(const [verified,id]of [[false,null],[true,'owner'],[true,'admin'],[false,'admin'],[true,'admin'],[false,null]]){
 sharedVerified=verified;sharedId=id;await Promise.resolve();moreContext.accessChanged();assert.equal(app.querySelector('[data-team-preview-news]'),null,'The real Menu cannot append the team entry after async access changes');assert.equal(app.textContent.includes(language.t('teamUi.newsSections')),false);assert.ok(app.querySelector('a[href="#settings"]'));
}
assert.equal(menuRefresh,6);assert.equal(automaticRefresh,6,'The existing private intro refresh stays separate from permanent entry placement');

const intervals=new Map(),jobs=new Map();let clock=0,timerId=0,authChanged=null,shown=0;
const schedule=(fn,ms)=>{const id=++timerId;jobs.set(id,{fn,ms});return id;},cancel=id=>jobs.delete(id);
const newsContext=vm.createContext({...language,...teamUi,document:doc,window:w,location:w.location,localStorage:w.localStorage,Event:w.Event,esc:ui.esc,bindIllustratedRelease,
 teamPreviewVerified:()=>sharedVerified,verifiedTeamPreviewId:()=>sharedId,onTeamPreviewChange:sharedSubscribe,
 setTimeout:schedule,clearTimeout:cancel,
 modal:html=>{shown++;doc.getElementById('modal-content').innerHTML=html;dialog.showModal();doc.querySelector('[data-close]').onclick=()=>dialog.close();}
});
const news=vm.runInContext(await moduleSource('team-preview-news.js')+';({mountTeamPreviewNewsEntry,createTeamPreviewNews})',newsContext);
const context=vm.createContext({...language,...ui,...staffUi,...markup,...messenger,RECITERS,staffMessageRoom,mountMessageEmojis,
 esc:markup.escapeStaff,icon:markup.staffIcon,mountTeamPreviewNewsEntry:news.mountTeamPreviewNewsEntry,
 staffRequest(){throw Error('Only the isolated cabinet transport is permitted');},staffImage(){throw Error('No photos');},fileBase64(){throw Error('No files');},mountStaffPushControl:()=>()=>{},
 accountAuthClient:()=>({auth:{mfa:{listFactors:async()=>({data:{totp:[{id:'factor',status:'verified'}]}})},onAuthStateChange:fn=>{authChanged=fn;return{data:{subscription:{unsubscribe(){authChanged=null;}}}};}}}),
 document:doc,window:w,location:w.location,Event:w.Event,AbortController,URLSearchParams,crypto,
 setInterval:(fn,ms)=>{const id=++timerId;intervals.set(id,{fn,ms});return id;},clearInterval:id=>intervals.delete(id),setTimeout:schedule,clearTimeout:cancel
});
const cabinet=vm.runInContext(await moduleSource('staff-cabinet.js')+';({showStaffCabinet,stopStaffCabinet})',context);
const owner={id:'11111111-1111-4111-8111-111111111111',owner:true,role:'owner',permissions:[],mfaRequired:false};
const admin={id:'22222222-2222-4222-8222-222222222222',owner:false,role:'admin',permissions:[],mfaRequired:false};
const assertEntry=()=>{const entry=app.querySelector('.staff-team-news');assert.ok(entry&&!entry.hidden,'A server-verified Cabinet has its stable permanent entry even without a separate Home access cache');assert.equal(entry.querySelectorAll('[data-team-preview-news]').length,1);assert.equal(entry.parentNode,app.querySelector('.staff-cabinet'));assert.equal(entry.nextElementSibling,app.querySelector('.staff-tabs'),'Entry belongs to Cabinet navigation, outside chat and content');assert.equal(app.querySelector('.staff-content [data-team-preview-news]'),null);return entry;};
const gateTimer=()=>[...intervals.values()].find(timer=>timer.ms===25000);
let currentActor=owner,holdGate=null,rejectGate=null,active=true;
const request=async action=>{if(action==='gate'){if(holdGate)return holdGate;if(rejectGate)throw rejectGate;return currentActor;}if(['audit.list','chat.rooms','chat.contacts'].includes(action))return[];throw Error('Unexpected cabinet request '+action);};

// The owner route is #admin; the separate preview cache can be cold or expire
// there. The Cabinet's already verified actor and MFA gate remain authoritative.
w.location.hash='#admin?view=team';sharedVerified=false;sharedId=null;
let finishGate;holdGate=new Promise(resolve=>finishGate=resolve);
const pending=cabinet.showStaffCabinet(app,{request,embedded:true,initialTab:'audit',isActive:()=>active});assert.equal(app.querySelector('[data-team-preview-news]'),null,'No entry is shown before the actual asynchronous Cabinet gate');
finishGate(owner);holdGate=null;await pending;let entry=assertEntry(),button=entry.querySelector('button');
button.click();assert.equal(shown,1);assert.ok(dialog.open);doc.querySelector('[data-close]').click();assert.equal(w.localStorage.getItem('salah:team-features-understood-v1:'+owner.id),'484');
// Independent role refreshes and expiration must never move or replace it.
const homeAccess=createTeamPreviewAccess({now:()=>clock,checkSession:async()=>({state:'valid',session:{access_token:'fixture-only',user:{id:owner.id,email_confirmed_at:'2026-11-13'}}}),requestActor:async()=>owner});
await homeAccess.verify();sharedVerified=homeAccess.verified();sharedId=homeAccess.actor().id;changed();clock+=61000;sharedVerified=homeAccess.verified();sharedId=homeAccess.actor()?.id||null;assert.equal(sharedVerified,false,'The real independent Home grant has expired at its actual 60s TTL');changed();
for(const allowed of [true,false,true,false]){sharedVerified=allowed;sharedId=allowed?owner.id:null;changed();await turns();assert.equal(app.querySelector('.staff-team-news'),entry);assert.equal(entry.querySelector('button'),button);assert.equal(entry.hidden,false);}
button.click();assert.equal(shown,2,'The permanent entry can reopen the acknowledged news');dialog.close();await gateTimer().fn();assert.equal(app.querySelector('.staff-team-news'),entry);

// A pending stale role refresh must not recreate the old Cabinet after leaving.
let finishRefresh;holdGate=new Promise(resolve=>finishRefresh=resolve);const lateRefresh=gateTimer().fn();active=false;cabinet.stopStaffCabinet();app.innerHTML='<p id="settings-sentinel">Настройки</p>';finishRefresh({...owner,role:'admin'});holdGate=null;await lateRefresh;await turns();assert.ok(app.querySelector('#settings-sentinel'),'An old async gate cannot repaint a new section');assert.equal(app.querySelector('[data-team-preview-news]'),null);assert.equal(dialog.open,false);
active=true;await cabinet.showStaffCabinet(app,{request,embedded:true,initialTab:'audit',isActive:()=>active});let failRefresh;holdGate=new Promise((resolve,reject)=>failRefresh=reject);const lateFailure=gateTimer().fn();active=false;cabinet.stopStaffCabinet();app.innerHTML='<p id="settings-sentinel">Настройки</p>';failRefresh(Object.assign(Error('revoked'),{code:'staff_only'}));holdGate=null;await lateFailure;assert.ok(app.querySelector('#settings-sentinel'),'A late rejected gate cannot replace a new section with an access screen');
active=true;let finishInitial;holdGate=new Promise(resolve=>finishInitial=resolve);const oldInitial=cabinet.showStaffCabinet(app,{request,embedded:true,initialTab:'audit',isActive:()=>active});active=false;app.innerHTML='<p id="settings-sentinel">Настройки</p>';finishInitial(owner);holdGate=null;await oldInitial;assert.ok(app.querySelector('#settings-sentinel'),'A stale initial gate cannot recreate the Cabinet or its entry');assert.equal(app.querySelector('[data-team-preview-news]'),null);

// A verified admin has the same Cabinet entry. Other roles, locked MFA and
// demonstration Cabinets cannot acquire it from a stale shared preview grant.
active=true;currentActor=admin;w.location.hash='#staff';await cabinet.showStaffCabinet(app,{request,isActive:()=>active});entry=assertEntry();button=entry.querySelector('button');button.click();assert.equal(shown,3);assert.ok(dialog.open);
rejectGate=Object.assign(Error('revoked'),{code:'staff_only'});await gateTimer().fn();await turns();assert.equal(app.querySelector('[data-team-preview-news]'),null);assert.equal(dialog.open,false,'Revocation closes the already open private intro');rejectGate=null;
for(const role of ['moderator','teacher']){currentActor={...admin,role};sharedVerified=true;sharedId=owner.id;changed();await cabinet.showStaffCabinet(app,{request,isActive:()=>active});assert.equal(app.querySelector('.staff-team-news:not([hidden])'),null,role+' cannot inherit another preview grant');cabinet.stopStaffCabinet();}
currentActor={...admin,mfaRequired:true};await cabinet.showStaffCabinet(app,{request,isActive:()=>active});assert.ok(app.querySelector('#staff-mfa-form'),'Exercise the real locked MFA branch');assert.equal(app.querySelector('[data-team-preview-news]'),null,'An old shared grant never bypasses current Cabinet MFA');cabinet.stopStaffCabinet();
currentActor=admin;await cabinet.showStaffCabinet(app,{request,demo:true});assert.equal(app.querySelector('[data-team-preview-news]'),null);cabinet.stopStaffCabinet();
await cabinet.showStaffCabinet(app,{request,isActive:()=>active});assertEntry();authChanged('SIGNED_OUT',null);for(const[id,job]of [...jobs])if(job.ms===0){jobs.delete(id);job.fn();}await turns();assert.equal(app.querySelector('[data-team-preview-news]'),null,'Signing out removes the Cabinet entry');
cabinet.stopStaffCabinet();assert.equal(intervals.size,0);assert.equal(jobs.size,0);await w.happyDOM.close();
console.log('PASS: real Menu stays free of team-news rows through async access changes; permanent Cabinet entry is stable, independent of Home TTL, outside chat, and removed on revoke/signout/late route results without changing automatic private notices.');
