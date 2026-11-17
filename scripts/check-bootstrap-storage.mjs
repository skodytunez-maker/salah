import assert from 'node:assert/strict';
import{readFile}from 'node:fs/promises';
import{runInNewContext}from 'node:vm';
import{Window}from '../tests/staff/node_modules/happy-dom/lib/index.js';
import{createReadingContext}from '../dist/js/account-reading-context.js';
const win=new Window({url:'https://fixture.invalid/#home'}),doc=win.document;Object.assign(globalThis,{window:win,document:doc,Event:win.Event});
let getterCalls=0;
Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){getterCalls++;throw new DOMException('Fixture storage access denied','SecurityError')}});
const[{createNotificationInvite,INVITE_KEY},{createOwnerReleaseCard},{createTeamPreviewNews,mountTeamPreviewNewsEntry},release,{settings,storageAvailable}]=await Promise.all([
 import('../dist/js/notification-invite.js'),import('../dist/js/owner-release-card.js'),import('../dist/js/team-preview-news.js'),import('../dist/js/app-release.js'),import('../dist/js/storage.js')
]);
assert.equal(storageAvailable,false,'The normal guarded settings reader reports denied storage');
assert.equal(settings.liveSky,false,'Denied storage cannot opt into advanced sky work');
const app=await readFile(new URL('../dist/js/app.js',import.meta.url),'utf8'),initializers=app.split(/\r?\n/).filter(line=>/^const (notificationInvite|ownerReleaseCard|teamPreviewNews)=/.test(line));assert.equal(initializers.length,3);
doc.body.innerHTML='<main id="app"></main><div id="invite"></div><div id="owner"></div><div id="team"></div>';
let authCalls=0,permissionCalls=0,mutations=0;
const bootstrap=runInNewContext(initializers.join('\n')+';({notificationInvite,ownerReleaseCard,teamPreviewNews});',{
 createNotificationInvite,createOwnerReleaseCard,createTeamPreviewNews,settings,document:doc,currentRoute:'home',...release,
 counterSyncStatus:()=>({signedIn:false,userId:null}),verifiedOwnerId:()=>null,
 verifyOwner:async()=>{authCalls++;return false},foregroundAudioBusy:()=>false,personalDataAllowed:()=>true,
 reminders:{invitationState:()=>({hasDevice:false,supported:false}),enableStandard:()=>{permissionCalls++;throw Error('No permission prompt at boot')}},
 showAppRelease:()=>{throw Error('No release modal for an unverified guest')},hasSeenAnnouncement:()=>true,releaseHighlightActive:()=>false
});
bootstrap.notificationInvite.mount(doc.getElementById('invite'));await bootstrap.ownerReleaseCard.mount(doc.getElementById('owner'));bootstrap.teamPreviewNews.refresh();
doc.getElementById('app').textContent='Bootstrap reached normal rendering';assert.equal(doc.getElementById('app').textContent,'Bootstrap reached normal rendering');
assert.equal(authCalls,0);assert.equal(permissionCalls,0);assert.equal(doc.getElementById('invite').textContent,'');assert.equal(doc.getElementById('owner').hidden,true);
// Denied storage keeps the existing notification invitation fail-closed: simply
// rendering never resets refusal, changes preferences or requests permission.
const denied=createNotificationInvite({getState:()=>({signedIn:true,city:{name:'Fixture'},reminders:{enabled:false},push:{supported:true,permission:'default',hasDevice:false}}),enable:()=>{permissionCalls++;},openSettings:()=>mutations++});
denied.mount(doc.getElementById('invite'));assert.equal(doc.getElementById('invite').textContent,'');assert.equal(permissionCalls,0);assert.equal(mutations,0);
const stopEntry=mountTeamPreviewNewsEntry(doc.getElementById('team'),{verified:()=>false,subscribe:()=>()=>{}});assert.equal(doc.getElementById('team').hidden,true);stopEntry();
// Supplying an explicit store never evaluates the denied global getter.
const saved=new Map([[INVITE_KEY,'dismissed']]),storage={getItem:key=>saved.get(key)??null,setItem:(key,value)=>{mutations++;saved.set(key,value)}},before=getterCalls;
const invite=createNotificationInvite({storage,getState:()=>({signedIn:true,city:{name:'Fixture'},push:{hasDevice:false}}),enable:()=>{permissionCalls++}});
const owner=createOwnerReleaseCard({storage,getState:()=>({signedIn:false,active:true}),verify:async()=>{authCalls++},release:{version:502},showRelease:()=>{}});
const team=createTeamPreviewNews({storage,doc,win,verified:()=>false,userId:()=>null,subscribe:()=>()=>{}});
assert.equal(getterCalls,before);invite.mount(doc.getElementById('invite'));await owner.mount(doc.getElementById('owner'));team.refresh();assert.equal(saved.get(INVITE_KEY),'dismissed');assert.equal(doc.getElementById('invite').textContent,'');assert.equal(mutations,0);assert.equal(permissionCalls,0);assert.equal(authCalls,0);
// A storage object whose methods throw is the older failure mode and remains
// safe too; the new guard must not replace an explicitly supplied store.
const methodDenied={getItem(){throw Error('denied method')},setItem(){throw Error('full')}};
assert.doesNotThrow(()=>createNotificationInvite({storage:methodDenied,getState:()=>({})}));
assert.doesNotThrow(()=>createOwnerReleaseCard({storage:methodDenied,getState:()=>({}),release:{version:502}}));
assert.doesNotThrow(()=>createTeamPreviewNews({storage:methodDenied,doc,win}));
// The later, actual app initialization chain must also survive denied storage:
// account presence used to throw before activity/guest/listening hooks mounted.
const presenceSource=(await readFile(new URL('../dist/js/account-presence.js',import.meta.url),'utf8')).replace(/^import[^;]+;\s*/gm,'').replaceAll('export ','');
const lateStart=app.indexOf('if(personalDataAllowed()){startAnalytics()'),lateEnd=app.indexOf('initSeriesCelebration(',lateStart);assert.ok(lateStart>=0&&lateEnd>lateStart);
const lateCalls=[],playback={},auth={onAuthStateChange(){lateCalls.push('observeExistingAuth')},getSession(){lateCalls.push('readExistingSession');return Promise.resolve({data:{session:null},error:null})}};
let presenceRequests=0,authClients=0;
const lateContext={createReadingContext,settings,window:win,document:doc,crypto:{randomUUID:()=> 'fixture-presence-tab'},sessionStorage:{getItem:()=>null,setItem(){}},
 accountAuthClient:()=>{authClients++;return{auth}},createAuthTransport:()=>()=>{presenceRequests++;throw Error('No presence request without a session')},readNotificationSnapshot:()=>{throw Error('No notification query without a session')},APP_VERSION:release.APP_VERSION,
 personalDataAllowed:()=>true,startAnalytics:()=>lateCalls.push('analytics'),initCounterAccounts:()=>lateCalls.push('counterAccounts'),initActivityPresence:()=>lateCalls.push('activity'),initGuestPresence:()=>lateCalls.push('guest'),initLearningProgress:()=>lateCalls.push('learning'),initStaffPush:()=>lateCalls.push('staff'),initReciterPopularity:()=>lateCalls.push('ranking'),initAppState:()=>lateCalls.push('appState'),initGuestRegistrationNudge:()=>lateCalls.push('guestNudge'),initQuranListeningProgress:()=>lateCalls.push('listening'),counterSyncStatus:()=>({signedIn:false,userId:null}),quranPlayback:playback,ruqyahPlayback:{},listeningCreditPaused:()=>false,isAppUpdateRestore:false};
runInNewContext("Object.defineProperty(globalThis,'localStorage',{get(){throw Error('Fixture denied getter')}});\n"+presenceSource+'\n'+app.slice(lateStart,lateEnd),lateContext);
await Promise.resolve();await Promise.resolve();
assert.deepEqual(lateCalls,['analytics','counterAccounts','observeExistingAuth','readExistingSession','activity','guest','learning','staff','ranking','appState','guestNudge','listening']);assert.equal(authClients,1);assert.equal(presenceRequests,0);assert.equal(permissionCalls,0);assert.equal(mutations,0);
await win.happyDOM.close();
console.log('PASS: actual early and late app bootstrap initializers survive denied localStorage getter; activity/guest/listening setup continues, existing Auth observation, injected stores, refusal receipts and verified team visibility are preserved without permission/RPC/state mutations.');
