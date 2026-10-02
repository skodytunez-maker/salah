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
}
function dashboard({allowed=true,mfaRequired=false,result={total:125,users:[{nickname:'Fixture',lastSignInAt:null}]},request}={}){
 const app=new Element(),location={hash:'#admin',pathname:'/owner.html'},calls=[],intervals=new Map(),events=new Map(),document={hidden:false};let timerId=0;
 const context=createContext({location,Date,document,setInterval:fn=>{const id=++timerId;intervals.set(id,fn);return id},clearInterval:id=>intervals.delete(id),window:{addEventListener:(event,fn)=>events.set(event,fn),removeEventListener:event=>events.delete(event)},analyticsSite:()=>'',esc:value=>String(value).replaceAll('<','&lt;').replaceAll('>','&gt;'),title:()=>'',ownerVerified:()=>allowed,verifyOwner:async()=>allowed,URLSearchParams,onOwnerChange:fn=>{events.set('owner-change',fn);return()=>events.delete('owner-change')},ownerNeedsMfa:()=>mfaRequired,ownerMfaFactors:async()=>[],ownerUsers:async page=>{calls.push(page);return request?request(page):result;},ownerStatistics:async()=>({total:0,stats:[]}),signOutOwner:async()=>{allowed=false;}});
 return{app,location,calls,result,intervals,events,document,setAllowed:value=>{allowed=value;events.get('owner-change')?.()},...new Script(adminExecutable).runInContext(context)};
}
const settle=async()=>{for(let i=0;i<4;i++)await Promise.resolve();};
const cabinet=dashboard();await cabinet.showAdmin(cabinet.app);await settle();
assert.equal(cabinet.app.querySelector('.owner-users').open,false);
assert.equal(cabinet.app.querySelector('#owner-users-count').textContent,' — 125');
assert.equal(cabinet.app.querySelectorAll('.owner-user-row').length,1);
assert.deepEqual(cabinet.calls,[1],'The protected users endpoint loads without opening the section');
cabinet.app.querySelector('#users-next').onclick();await settle();assert.deepEqual(cabinet.calls,[1,2]);assert.equal(cabinet.app.querySelector('#owner-users-count').textContent,' — 125');
cabinet.result.total=126;cabinet.app.querySelector('#users-refresh').onclick();await settle();assert.equal(cabinet.app.querySelector('#owner-users-count').textContent,' — 126');
const empty=dashboard({result:{total:0,users:[]}});await empty.showAdmin(empty.app);await settle();assert.equal(empty.app.querySelector('#owner-users-count').textContent,' — 0');
const denied=dashboard({allowed:false});await denied.showAdmin(denied.app);await settle();assert.deepEqual(denied.calls,[]);assert.equal(denied.app.querySelector('#owner-users-count'),null);
const unavailable=dashboard({request:async()=>{throw Error('Fixture service failure');}});await unavailable.showAdmin(unavailable.app);await settle();assert.equal(unavailable.app.querySelector('#owner-users-count').textContent,' — недоступно');
const invalid=dashboard({result:{total:'125',users:[]}});await invalid.showAdmin(invalid.app);await settle();assert.equal(invalid.app.querySelector('#owner-users-count').textContent,' — недоступно');
let finish;const departed=dashboard({request:()=>new Promise(resolve=>finish=resolve)});await departed.showAdmin(departed.app);departed.location.hash='#more';finish({total:125,users:[]});await settle();assert.equal(departed.app.querySelector('#owner-users-count').textContent,' — …');
const statusList=cabinet.app.querySelector('.owner-users');statusList.open=true;statusList.ontoggle({currentTarget:statusList});await settle();const beforePoll=cabinet.calls.length;for(const callback of cabinet.intervals.values())callback();await settle();assert.equal(cabinet.calls.length,beforePoll+1);cabinet.document.hidden=true;for(const callback of cabinet.intervals.values())callback();await settle();assert.equal(cabinet.calls.length,beforePoll+1);cabinet.location.hash='#home';cabinet.events.get('hashchange')();assert.equal(cabinet.intervals.size,0);assert.equal(cabinet.events.size,0);
console.log('PASS: presence refresh runs only for the open foreground list and stops on navigation.');
console.log('PASS: collapsed users section shows protected total across pages, including zero; refresh updates count; denied, unavailable and stale screens never show a guessed count.');

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
assert.equal(nested.app.querySelector('#owner-users-count').textContent,' — 125');assert.equal(nested.app.querySelector('#owner-sign-out'),null,'Account keeps its own sign-out control');
const nestedCount=nested.app.querySelector('#owner-users-count');nestedPanel.open=false;nestedPanel.ontoggle();for(const fn of [...nested.intervals.values()])fn();assert.equal(nested.intervals.size,0);
nestedPanel.open=true;nestedPanel.ontoggle();await settle();nested.setAllowed(false);assert.equal(nested.app.hidden,true);assert.equal(nested.app.querySelector('.owner-account'),null);
const otherAccount=dashboard({allowed:false});otherAccount.location.hash='#account';await otherAccount.mountOwnerAccount(otherAccount.app);assert.equal(otherAccount.app.hidden,true);assert.equal(otherAccount.app.querySelector('#owner-login'),null);assert.deepEqual(otherAccount.calls,[]);
const secondFactor=dashboard({allowed:false,mfaRequired:true});secondFactor.location.hash='#account?owner=1';await secondFactor.mountOwnerAccount(secondFactor.app);const challenge=secondFactor.app.querySelector('.owner-account');assert.equal(challenge.open,true);await challenge.ontoggle();await settle();assert.ok(secondFactor.app.querySelector('#owner-mfa-step'));assert.deepEqual(secondFactor.calls,[],'MFA cannot load the private user list');
const legacyLink=dashboard();legacyLink.location.hash='#account?owner=1';await legacyLink.mountOwnerAccount(legacyLink.app);assert.equal(legacyLink.app.querySelector('.owner-account').open,true);
const leftAccount=dashboard();leftAccount.location.hash='#account';await leftAccount.mountOwnerAccount(leftAccount.app);leftAccount.location.hash='#more';leftAccount.events.get('hashchange')();assert.equal(leftAccount.events.has('owner-change'),false);
console.log('PASS: account cabinet stays hidden for other users; MFA gates data; collapse cancels polling; revocation removes the panel; legacy links open the account cabinet.');

const seenAt=dashboard({result:{total:1,online:0,users:[{nickname:'Offline Fixture',online:false,lastSeenAt:'2026-10-02T09:30:00Z'}]}});await seenAt.showAdmin(seenAt.app);await settle();assert.match(seenAt.app.querySelector('.owner-user-state').textContent,/Не в сетиБыл\(а\)/);assert.match(seenAt.app.querySelector('.owner-last-seen').textContent,/2026/);const liveUser=dashboard({result:{total:1,online:1,users:[{nickname:'Online Fixture',online:true,lastSeenAt:'2026-10-02T09:30:00Z'}]}});await liveUser.showAdmin(liveUser.app);await settle();assert.equal(liveUser.app.querySelector('.owner-last-seen'),null);console.log('PASS: last visit is displayed below offline status, while online users have no misleading previous-visit label.');
