import assert from 'node:assert/strict';
import{mountSupportPanel,supportError}from '../dist/js/support-client.js';
const flush=async()=>{await new Promise(r=>setTimeout(r,5));for(let i=0;i<5;i++)await new Promise(r=>setImmediate(r))};
class Root{constructor(){this.isConnected=true;this.innerHTML='';this.note={textContent:'',setAttribute(){}}}querySelector(key){return key==='[data-support-status]'?this.note:null}querySelectorAll(){return[]}contains(){return true}replaceChildren(){this.innerHTML=''}}
const calls=[],thread={id:'3c1dedec-76b3-4f81-8f47-39d86e5787b4',app:'salah',subject:'<img src=x onerror=alert(1)>',version:'154',status:'open',updated_at:'2026-10-04T02:00:00Z'};
let user='user-one',callback,createFails=true,pendingResolve=null,hold=false;
const client={auth:{getSession:async()=>({data:{session:user?{user:{id:user}}:null},error:null}),onAuthStateChange(fn){callback=fn;return{data:{subscription:{unsubscribe(){callback=null}}}}}},rpc(name,args){const call={name,args,signal:null};calls.push(call);return{abortSignal(signal){call.signal=signal;if(hold)return new Promise(resolve=>pendingResolve=resolve);if(name==='support_create'&&createFails)return Promise.resolve({error:{message:'sensitive upstream detail'},data:null});const data=name==='support_list'?[thread]:name==='support_read'?{thread,messages:[{id:'message',owner_reply:true,body:'<script>secret()</script>',created_at:thread.updated_at}]}:null;return Promise.resolve({data,error:null})}}}};
const click=(root,name,value)=>{const button={dataset:{},hasAttribute:key=>key===name};if(value)button.dataset.supportThread=value;root.onclick({target:{closest:()=>button}})};
const form=(type,values)=>({hasAttribute:key=>key===type,checkValidity:()=>true,elements:Object.fromEntries(Object.entries(values).map(([key,value])=>[key,{value}]))});
const root=new Root(),dispose=mountSupportPanel(root,{auth:client,app:'salah',version:154});await flush();assert.equal(calls[0].args.p_app,'salah');assert.equal(calls[0].args.p_owner,false);assert.ok(root.innerHTML.includes('&lt;img'));assert.ok(!root.innerHTML.includes('<img'));
click(root,'data-support-new');const create=form('data-support-create',{subject:' Ошибка ',body:' Описание '}),submit=()=>root.onsubmit({target:create,preventDefault(){}});submit();await flush();assert.ok(root.note.textContent.includes('Не удалось'));const firstId=calls.find(c=>c.name==='support_create').args.p_id;createFails=false;submit();await flush();assert.equal(calls.filter(c=>c.name==='support_create')[1].args.p_id,firstId,'Retry reuses the idempotency key');assert.equal(calls.filter(c=>c.name==='support_create')[1].args.p_body,'Описание');assert.equal(calls.at(-1).args.p_app,'salah');assert.ok(root.innerHTML.includes('&lt;script&gt;'));assert.ok(!root.innerHTML.includes('<script>'));assert.ok(!root.innerHTML.includes('data-support-close'));
const count=calls.length;callback('TOKEN_REFRESHED',{user:{id:user}});await flush();assert.equal(calls.length,count,'Token refresh must not wipe drafts or reload conversations');
hold=true;click(root,'data-support-refresh');const pending=calls.at(-1);user=null;callback('SIGNED_OUT',null);await flush();assert.equal(pending.signal.aborted,true);assert.ok(root.innerHTML.includes('Войти или зарегистрироваться'));assert.ok(!root.innerHTML.includes('secret'));pendingResolve({data:[thread],error:null});await flush();assert.ok(!root.innerHTML.includes(thread.id),'Old private results cannot repaint after sign-out');dispose();assert.equal(root.innerHTML,'');assert.equal(callback,null);
hold=false;user='owner';const ownerRoot=new Root(),stop=mountSupportPanel(ownerRoot,{auth:client,app:'sahaba',version:29,owner:true,signInHref:'#profile'});await flush();assert.equal(calls.at(-1).args.p_app,'sahaba');assert.equal(calls.at(-1).args.p_owner,true);assert.ok(!ownerRoot.innerHTML.includes('Все приложения'));stop();
assert.ok(!supportError({message:'password=private-key'}).includes('private-key'));

// Use delayed transports that intentionally ignore abort, as a response can already
// have arrived when the account changes. No real accounts or messages are used.
function harness(owner=false){
 const root=new Root(),calls=[],failures=new Set(),delays=new Map();let uid='first-account',onAuth;
 const auth={auth:{getSession:async()=>({data:{session:uid?{user:{id:uid}}:null}}),onAuthStateChange(fn){onAuth=fn;return{data:{subscription:{unsubscribe(){onAuth=null}}}}}},rpc(name,args){return{abortSignal(signal){
  calls.push({name,args,signal});
  if(delays.has(name)){const resolve=delays.get(name);delays.delete(name);return new Promise(done=>resolve(done))}
  if(failures.delete(name))return Promise.resolve({error:{message:'temporary network error'}});
  return Promise.resolve({data:name==='support_list'?[thread,{...thread,id:'second-thread',subject:'Другое обращение'}]:name==='support_read'?{thread:{...thread,id:args.p_id},messages:[]}:null,error:null});
 }}}};
 const stop=mountSupportPanel(root,{auth,app:'salah',version:182,owner});
 return{root,calls,failures,stop,hold(name){return new Promise(resolve=>delays.set(name,resolve))},switchTo(next){uid=next;onAuth(next?'SIGNED_IN':'SIGNED_OUT',next?{user:{id:next}}:null)}};
}
function inputReply(root,body){const replyForm=form('data-support-reply',{body});root.oninput({target:{closest:()=>replyForm}});return replyForm}
function submitForm(root,value){root.onsubmit({target:value,preventDefault(){}})}
const draftUi=harness(true);await flush();click(draftUi.root,'data-support-thread',thread.id);await flush();
inputReply(draftUi.root,'Черновик <ответа>');click(draftUi.root,'data-support-reload');await flush();
assert.ok(draftUi.root.innerHTML.includes('required>Черновик &lt;ответа&gt;</textarea>'),'Refresh keeps an escaped reply draft');
draftUi.failures.add('support_read');click(draftUi.root,'data-support-reload');await flush();
assert.ok(draftUi.root.innerHTML.includes('Черновик &lt;ответа&gt;'),'Failed refresh restores the conversation and draft');assert.ok(draftUi.root.note.textContent.includes('Не удалось'));
click(draftUi.root,'data-support-back');await flush();draftUi.failures.add('support_list');click(draftUi.root,'data-support-refresh');await flush();
assert.ok(draftUi.root.innerHTML.includes('Другое обращение'),'Failed list refresh keeps previously loaded rows');
click(draftUi.root,'data-support-thread','second-thread');await flush();assert.ok(!draftUi.root.innerHTML.includes('Черновик'),'Drafts belong to their own conversation');
click(draftUi.root,'data-support-back');await flush();click(draftUi.root,'data-support-thread',thread.id);await flush();assert.ok(draftUi.root.innerHTML.includes('Черновик &lt;ответа&gt;'),'Back and reopen restore the original draft');
draftUi.failures.add('support_reply');submitForm(draftUi.root,form('data-support-reply',{body:'Черновик <ответа>'}));await flush();const replyId=draftUi.calls.at(-1).args.p_id;
click(draftUi.root,'data-support-reload');await flush();submitForm(draftUi.root,form('data-support-reply',{body:'Черновик <ответа>'}));await flush();
assert.equal(draftUi.calls.filter(x=>x.name==='support_reply').at(-1).args.p_id,replyId,'Retry after refresh keeps the message id to avoid duplicates');assert.ok(!draftUi.root.innerHTML.includes('Черновик'),'Confirmed delivery clears its draft');
inputReply(draftUi.root,'Частный ответ');const pendingReply=draftUi.hold('support_reply');submitForm(draftUi.root,form('data-support-reply',{body:'Частный ответ'}));const finishReply=await pendingReply;
const replyRequest=draftUi.calls.at(-1);draftUi.switchTo(null);assert.ok(!draftUi.root.innerHTML.includes('data-support-reply'),'Account change clears the private screen immediately');assert.equal(replyRequest.signal.aborted,true);await flush();const signedOutRequests=draftUi.calls.length;
finishReply({data:null,error:null});await flush();assert.equal(draftUi.calls.length,signedOutRequests,'A late mutation result cannot start a private read after sign-out');assert.ok(draftUi.root.innerHTML.includes('Войти или зарегистрироваться'));
draftUi.switchTo('second-account');await flush();click(draftUi.root,'data-support-thread',thread.id);await flush();assert.ok(!draftUi.root.innerHTML.includes('Частный ответ'),'Drafts never cross accounts');draftUi.stop();

for(const mutation of ['support_create','support_close']){
 const ui=harness(mutation==='support_close');await flush();
 if(mutation==='support_create')click(ui.root,'data-support-new');else{click(ui.root,'data-support-thread',thread.id);await flush()}
 const delayed=ui.hold(mutation);
 if(mutation==='support_create')submitForm(ui.root,form('data-support-create',{subject:'Тема',body:'Текст'}));else click(ui.root,'data-support-close');
 const finish=await delayed;ui.switchTo('another-account');await flush();const callCount=ui.calls.length;
 finish({data:null,error:null});await flush();assert.equal(ui.calls.length,callCount,mutation+' completion must not read the old thread in a new account');ui.stop();
}
console.log('PASS: support drafts and retry IDs survive refresh/back/network errors; separate threads/accounts, immediate logout clearing, cancelled mutations, escaped messages and app isolation.');
