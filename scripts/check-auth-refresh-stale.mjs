import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {createAuthLock} from '../dist/js/auth-transport.js';
import {applySupabaseRefreshPatch,removeSupabaseRefreshPatch,PATCH_ID} from './lib/supabase-refresh-patch.mjs';
const bundle=await fs.readFile(new URL('../dist/js/vendor/supabase.js',import.meta.url),'utf8'),receipt=JSON.parse(await fs.readFile(new URL('../dist/js/vendor/supabase-source.json',import.meta.url),'utf8'));
const hash=value=>createHash('sha256').update(value).digest('hex');
assert.equal(receipt.version,'2.117.2');assert.equal(hash(bundle),receipt.browserBundleSHA256);
assert.equal(hash(removeSupabaseRefreshPatch(bundle)),'59d39487c3589843b410322d8a3d562ce022aba1e5ccb16898ef3fb2a0da2ecd','The only vendor edits must be the documented reversible patch');
assert.equal(applySupabaseRefreshPatch(removeSupabaseRefreshPatch(bundle)),bundle);assert.equal(receipt.localPatches[0].id,PATCH_ID);
const ownerSource=(await fs.readFile(new URL('../dist/js/owner-auth.js',import.meta.url),'utf8')).replace(/^import[^\n]*\n/gm,'').replace(/\bexport /g,'')+'\n({accountAuthClient});';
const flush=async()=>{for(let i=0;i<8;i++)await new Promise(resolve=>setImmediate(resolve));};
const user={id:'11111111-1111-4111-8111-111111111111',email_confirmed_at:'2026-10-02'},other={id:'22222222-2222-4222-8222-222222222222',email_confirmed_at:'2026-10-02'};
function setup(){
 let clock=Date.now(),rotation=0,current='refresh0',parent=null,familyRevoked=false,hold=false,readEntered,readRelease;const store=new Map(),sent=[],clients=[];let gate;
 const makeSession=(number=0,who=user)=>({access_token:'access'+number,refresh_token:'refresh'+number,expires_at:Math.floor(clock/1000)+3600,user:who,token_type:'bearer'});
 let key,serverCurrent;const storage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};
 const request=async(url,options)=>{
  if(String(url).includes('/logout'))return new Response(null,{status:204});
  if(!String(url).includes('/token?'))throw Error('Unexpected isolated request');
  const token=JSON.parse(options.body).refresh_token;sent.push(token);
  if(token==='explicit-other'){current='explicit-result';return Response.json({...makeSession(99,other),refresh_token:current,expires_in:3600});}
  if(familyRevoked||token!==current&&token!==parent){familyRevoked=true;return Response.json({code:'refresh_token_already_used',msg:'Already used'},{status:400,headers:{'x-supabase-api-version':'2024-01-01'}});}
  if(token===parent)return Response.json(serverCurrent);
  parent=current;current='refresh'+(++rotation);serverCurrent={...makeSession(rotation),refresh_token:current,expires_in:3600};return Response.json(serverCurrent);
 };
 function create(slow=false,autoRefresh=false){
  class Clock extends Date{static now(){return clock;}}
  const context=vm.createContext({console:{...console,warn(){},error(){}},Date:Clock,URL,Headers,Request,Response,AbortController,AbortSignal,DOMException,setTimeout,clearTimeout,setInterval:()=>({unref(){}}),clearInterval(){},WebSocket:class{}});vm.runInContext(process.argv.includes('--baseline')?removeSupabaseRefreshPatch(bundle):bundle,context);const sdk=context.supabase;
  let configuration;const capture=vm.createContext({personalDataAllowed:()=>true,createSessionGuard:()=>()=>{},createAuthTransport:()=>request,createAuthLock:opts=>createAuthLock({...opts,locks:null}),syncLessonNotificationAccount(){},window:{supabase:{...sdk,createClient:(url,publishable,options)=>{configuration=options;return{auth:{onAuthStateChange(){}}};}}}});
  vm.runInContext(ownerSource,capture).accountAuthClient();key=configuration.auth.storageKey;
  if(!store.has(key)&&!clients.length){serverCurrent={...makeSession(),expires_in:3600};store.set(key,JSON.stringify(serverCurrent));}
  const adapter=slow?{...storage,getItem:async k=>{const value=storage.getItem(k);if(hold&&k===key){hold=false;readEntered();await new Promise(resolve=>readRelease=resolve);}return value;}}:storage;
  const auth=sdk.createClient('https://fixture.invalid','fixture-key',{...configuration,global:{fetch:request},auth:{...configuration.auth,storage:adapter,autoRefreshToken:autoRefresh}}).auth;clients.push(auth);return auth;
 }
 return{create,store,sent,makeSession,get key(){return key;},get current(){return current;},get revoked(){return familyRevoked;},expire(){clock+=3700000;},hold(){hold=true;gate=new Promise(resolve=>readEntered=resolve);return gate;},release(){readRelease();},revoke(){familyRevoked=true;},async close(){for(const auth of clients)await auth.dispose();}};
}
for(const mode of ['read','manual-refresh','startup','auto-tick']){
 const f=setup(),b=f.create();await b.initialize();let a;if(mode!=='startup'){a=f.create(true);await a.initialize();}
 await flush();f.expire();const entered=f.hold();let task;
 if(mode==='startup'){a=f.create(true,true);task=a.initialize();}
 else if(mode==='auto-tick'){await a.startAutoRefresh();task=null;}
 else task=mode==='read'?a.getSession():a.refreshSession();
 let waitTimer;try{await Promise.race([entered,new Promise((resolve,reject)=>{waitTimer=setTimeout(()=>reject(Error('No suspended read: '+mode)),3000);})]);}finally{clearTimeout(waitTimer);}assert.equal((await b.getSession()).error,null);assert.equal((await b.refreshSession()).error,null);const winning=JSON.parse(f.store.get(f.key)),before=f.sent.length;
 f.release();if(task)await task;await flush();
 assert.equal(f.revoked,false,mode+':old read cannot revoke the active server refresh family');const extra=f.sent.slice(before);if(mode==='manual-refresh')assert.deepEqual(extra,[winning.refresh_token],'Explicit no-argument renewal may rotate only the current winning token');else assert.deepEqual(extra,[],mode+':do not send the obsolete token at all');
 const expected=mode==='manual-refresh'?f.current:winning.refresh_token,read=await a.getSession();assert.equal(read.error,null);assert.equal(read.data.session.refresh_token,expected);assert.equal(JSON.parse(f.store.get(f.key)).refresh_token,expected);await f.close();
}
for(const ending of ['sign-out','new-account']){
 const f=setup(),b=f.create(),a=f.create(true);await Promise.all([a.initialize(),b.initialize()]);await flush();f.expire();const entered=f.hold(),task=a.getSession();await entered;
 if(ending==='sign-out'){assert.equal((await b.signOut({scope:'local'})).error,null);assert.equal(f.store.has(f.key),false);}else f.store.set(f.key,JSON.stringify({...f.makeSession(20,other),refresh_token:'other-current'}));
 const before=f.sent.length;f.release();await task;assert.equal(f.sent.length,before,'An obsolete request cannot contact Auth after '+ending);const read=await a.getSession();assert.equal(read.error,null);assert.equal(read.data.session?.user?.id??null,ending==='sign-out'?null:other.id);await f.close();
}
// Explicit credentials remain an intentional operation, independent of stored keys.
for(const method of ['setSession','refreshSession']){
 const f=setup(),a=f.create();await a.initialize();const expired=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({exp:1,sub:other.id})).toString('base64url')+'.fixture';
 const result=await a[method]({access_token:expired,refresh_token:'explicit-other'});assert.equal(result.error,null);assert.ok(f.sent.includes('explicit-other'));assert.equal(JSON.parse(f.store.get(f.key)).user.id,other.id);await f.close();
}
// A genuine refusal of the CURRENT token still ends the local session.
{
 const f=setup(),a=f.create();await a.initialize();let signedOut=0;a.onAuthStateChange(event=>{if(event==='SIGNED_OUT')signedOut++;});await flush();f.expire();f.revoke();const result=await a.getSession();assert.equal(result.error?.code,'refresh_token_already_used');assert.equal(f.store.has(f.key),false);assert.equal(signedOut,1);await f.close();
}
console.log('PASS: pinned SDK/public API + production lock options;stale read/manual refresh/startup/tick send no obsolete refresh;logout/new actor win;explicit credentials and real revocation preserved;vendor patch reverses to exact upstream SHA256.');
