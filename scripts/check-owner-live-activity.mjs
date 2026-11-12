import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const source=await fs.readFile(new URL('../supabase/functions/owner-access/index.ts',import.meta.url),'utf8');
const{createOwnerHandler}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const owner='dc1eb1cc-6f8f-472f-a937-735fbfbba4b7',id='11111111-1111-4111-8111-111111111111';
let calls=0,aal='aal2',active=true;
const user={id:owner,email_confirmed_at:'2026-10-02',is_anonymous:false,factors:[{status:'verified',factor_type:'totp'}]};
const handler=createOwnerHandler({getUser:async token=>token==='owner-private-token'?{data:{user}}:token==='ordinary-user-token'?{data:{user:{...user,id,user_metadata:{owner:true}}}}:{error:Error('invalid')},
 getClaims:async()=>({data:{claims:{sub:owner,iss:'https://kbltwszfvphgbxdbczsb.supabase.co/auth/v1',aal,session_id:id}}}),isSessionActive:async()=>active,
 readLiveActivity:async(kind,page)=>{calls++;assert.equal(kind,'reading');assert.equal(page,1);return{total:2,users:[{id,nickname:'Private reader',country:'PRIVATE-GEOGRAPHY',token:'PRIVATE-TOKEN'},{guest:true,code:'abcdef',device:'PRIVATE-DEVICE'}]};}});
const request=(token,query='?mode=live&kind=reading',origin)=>new Request('https://fixture.invalid'+query,{headers:{...(token?{Authorization:'Bearer '+token}:{}),...(origin?{Origin:origin}:{})}});
assert.equal((await handler(request(null))).status,401);
assert.equal((await handler(request('ordinary-user-token'))).status,403);assert.equal(calls,0);
aal='aal1';assert.equal((await handler(request('owner-private-token'))).status,403);assert.equal(calls,0);
aal='aal2';active=false;assert.equal((await handler(request('owner-private-token'))).status,401);assert.equal(calls,0);
active=true;assert.equal((await handler(request('owner-private-token',undefined,'https://evil.example'))).status,403);assert.equal(calls,0);
assert.equal((await handler(request('owner-private-token','?mode=live&kind=reading&city=Private'))).status,400);
assert.equal((await handler(request('owner-private-token','?mode=live&kind=unknown'))).status,400);assert.equal(calls,0);
const response=await handler(request('owner-private-token'));assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store, private');
assert.deepEqual(await response.json(),{kind:'reading',page:1,total:2,users:[{id,nickname:'Private reader'},{id:null,guest:true,nickname:'Гость ABCDEF'}]});assert.equal(calls,1);
assert.match(source,/not_after is null or not_after>now\(\)/);
console.log('PASS: live people are returned only to the verified owner with MFA and an active session; forged roles, other accounts, bad origin and parameters are denied, private extra fields are excluded.');

const{Window}=await import('../tests/staff/node_modules/happy-dom/lib/index.js');const vm=await import('node:vm');
const w=new Window({url:'https://fixture.invalid/#home'}),doc=w.document;doc.body.innerHTML='<dialog id="modal"><div id="modal-content"></div></dialog>';const dlg=doc.getElementById('modal'),content=doc.getElementById('modal-content');
w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
let uid=owner,verified=true,mfa=false,peopleReads=0,timer=null,stopCount=0,pending=[],listeners=new Set();
const context=vm.createContext({ownerVerified:()=>verified,ownerNeedsMfa:()=>mfa,verifyOwner:async()=>verified,onOwnerChange:fn=>{listeners.add(fn);return()=>listeners.delete(fn);},counterSyncStatus:()=>({userId:uid}),ownerLiveActivity:async()=>{peopleReads++;return new Promise(resolve=>pending.push(resolve));},esc:v=>String(v).replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'),toast(){},document:doc,window:w,location:w.location,setInterval:fn=>{timer=fn;return 1;},clearInterval:()=>stopCount++,modal:html=>{content.innerHTML=html;dlg.showModal();content.querySelector('[data-close]').onclick=()=>dlg.close();},closeModal:()=>dlg.close(),encodeURIComponent});
const frontend=await fs.readFile(new URL('../dist/js/home-activity-members.js',import.meta.url),'utf8');
const open=vm.runInContext(frontend.replace(/^import.*$/gm,'').replaceAll('export ','')+';showHomeActivity;',context);
const flush=async()=>{for(let i=0;i<5;i++)await new Promise(r=>setImmediate(r));};
await open('readers');assert.equal(peopleReads,1);pending.shift()({total:2,users:[{id,nickname:'<img src=x onerror=alert(1)>'},{id:null,guest:true,nickname:'Гость ABCDEF'}]});await flush();
assert.equal(content.querySelectorAll('img').length,0);assert.equal(content.querySelectorAll('.owner-live-member').length,2);assert.equal(content.querySelectorAll('a').length,0,'The activity list shows names without changing account navigation');
verified=false;for(const fn of [...listeners])fn();assert.equal(dlg.open,false);assert.equal(content.textContent,'','Losing the owner grant purges private names');
const beforeReads=peopleReads;await open('readers');assert.equal(peopleReads,beforeReads,'Other accounts never read identities');
mfa=true;await open('readers');assert.equal(w.location.hash,'#admin','The owner must complete MFA before seeing names');
mfa=false;verified=true;await open('dhikr');dlg.close();pending.shift()({total:1,users:[{id,nickname:'Late private name'}]});await flush();assert.equal(content.textContent,'','A late response cannot restore closed private content');assert.ok(stopCount>0);
await w.happyDOM.close();console.log('PASS: owner-only controls show safe names and anonymous guest labels; revocation/close purge private data, stale responses stay discarded, and MFA remains required.');
