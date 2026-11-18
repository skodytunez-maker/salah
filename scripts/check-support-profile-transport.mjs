import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Window} from '../tests/staff/node_modules/happy-dom/lib/index.js';

const w=new Window({url:'https://fixture.invalid/#support?owner=1'}),doc=w.document;
Object.assign(globalThis,{window:w,document:doc,localStorage:w.localStorage,Event:w.Event});
const source=await readFile(new URL('../supabase/functions/owner-access/index.ts',import.meta.url),'utf8');
const {createOwnerHandler,readOwnerUserSummaries}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const A='dc1eb1cc-6f8f-472f-a937-735fbfbba4b7',U='22222222-2222-4222-8222-222222222222',R='33333333-3333-4333-8333-333333333333',SID='44444444-4444-4444-8444-444444444444';
const owner={id:A,email_confirmed_at:'2026-10-02',is_anonymous:false,factors:[{status:'verified',factor_type:'totp'}]};
let actor=A,aal='aal2',active=true,summaryReads=0,rankReads=0,wrongRow=false;
const claims=()=>({sub:actor,iss:'https://kbltwszfvphgbxdbczsb.supabase.co/auth/v1',aal,session_id:SID});
const handler=createOwnerHandler({getUser:async()=>({data:{user:{...owner,id:actor}}}),getClaims:async()=>({data:{claims:claims()}}),isSessionActive:async()=>active,
 readAccountUser:async id=>{summaryReads++;return id===U?{id:wrongRow?R:U,nickname:'Sarvinoz',joinedAt:'2026-10-01T10:00:00Z',appVersion:520,email:'never-expose'}:null;},
 readRankUser:async id=>{rankReads++;return id===R?{id:U,nickname:'Sarvinoz'}:null;},
 readUser:async id=>id===U?{connected:true,hasAvatar:false,periods:{all:920,day:20,week:120,month:920},awards:[],reciters:[],context:{city:'Private city'}}:null});
const request=query=>new Request('https://fixture.invalid/functions/v1/owner-access'+query,{headers:{Authorization:'Bearer valid-owner-token'}});
const requests=[];
globalThis.fetch=async(url,init)=>{requests.push(new URL(url).search);return handler(new Request(url,init));};
w.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:{access_token:'valid-owner-token',user:{id:actor}}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}})};
const {createSupportUserProfile}=await import('../dist/js/support-user-profile.js');
const {setInterfaceLanguage}=await import('../dist/js/i18n.js');setInterfaceLanguage('ru');
const host=doc.createElement('main');host.innerHTML='<button data-avatar>SA</button><div class="support-messages">Original chat</div><textarea>Unsent reply</textarea>';doc.body.append(host);
const log=host.querySelector('.support-messages'),draft=host.querySelector('textarea');log.scrollTop=123;
// No loadUser/loadDetails mocks: execute production owner-auth and the real server handler.
const profile=createSupportUserProfile({host,actorId:A,getActor:()=>actor});
assert(profile.open({id:U},host.querySelector('button')));
for(let i=0;i<20;i++)await new Promise(r=>setImmediate(r));
assert.equal(host.querySelector('#owner-user-name')?.textContent,'Sarvinoz','Support account IDs must not be interpreted as public ranking IDs');
assert(host.textContent.includes('Private city'));assert(!host.textContent.includes('never-expose'));
assert.equal(summaryReads,1);assert.equal(rankReads,0);assert(requests.some(q=>q.startsWith('?mode=account-user&ids='+U)));
assert.equal(host.querySelector('.support-messages'),log);assert.equal(log.scrollTop,123);assert.equal(draft.value,'Unsent reply');
profile.dispose();
assert.equal((await handler(request('?mode=rank-user&ids='+U))).status,404,'The old mistaken route really fails for this account identity');
assert.equal((await handler(request('?mode=rank-user&ids='+R))).status,200,'Rankings retain their separate public-ID lookup');
let query;
readOwnerUserSummaries((parts,...values)=>{query={parts:[...parts],values};return[];},1,null,U);
assert(query.parts.join('?').includes('u.id=?::uuid'));assert.equal(query.values.filter(v=>v===U).length,2);assert(query.values.includes(null));
const before=summaryReads;
for(const q of ['?mode=account-user','?mode=account-user&ids=bad','?mode=account-user&ids='+U+'&page=1','?mode=account-user&ids='+U+'&ids='+R])assert.equal((await handler(request(q))).status,400);
assert.equal(summaryReads,before);
assert.equal((await handler(new Request('https://fixture.invalid/?mode=account-user&ids='+U))).status,401);
aal='aal1';assert.equal((await handler(request('?mode=account-user&ids='+U))).status,403);aal='aal2';
actor=R;assert.equal((await handler(request('?mode=account-user&ids='+U))).status,403);actor=A;
active=false;assert.equal((await handler(request('?mode=account-user&ids='+U))).status,401);active=true;
assert.equal(summaryReads,before,'No private reads happen before owner/MFA/live-session authorization');
wrongRow=true;assert.equal((await handler(request('?mode=account-user&ids='+U))).status,503);
await w.happyDOM.close();
console.log('PASS Support profile through production auth transport and server: private account ID, separate public-ranking identity, complete card, retained chat/draft, strict parameters, no secrets, owner/MFA/live-session gates and wrong-account rejection.');
