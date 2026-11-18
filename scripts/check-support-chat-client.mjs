import assert from 'node:assert/strict';
import {Window} from '../tests/staff/node_modules/happy-dom/lib/index.js';
const w=new Window({url:'https://example.invalid/#support'}),doc=w.document;
Object.assign(globalThis,{window:w,document:doc,localStorage:w.localStorage,Event:w.Event});
w.confirm=()=>true;let copied='';Object.defineProperty(w.navigator,'clipboard',{value:{writeText:async text=>{copied=text;}}});
const {mountSupportPanel}=await import('../dist/js/support-client.js');
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222',T='33333333-3333-4333-8333-333333333333',M='44444444-4444-4444-8444-444444444444',N='55555555-5555-4555-8555-555555555555';
const root=doc.createElement('div');doc.body.append(root);let uid=A,authChanged,version=0,readFailure=false,hold=null,wrongAck=false;
let messages=[{id:M,author_id:A,owner_reply:false,body:'My <script>message</script>',created_at:'2026-11-18T10:00:00Z'},{id:N,author_id:B,owner_reply:true,body:'Support answer',created_at:'2026-11-18T10:00:01Z'}];
const calls=[],drafts=new Map();let status='open',photoToken='first';
const data=()=>({thread:{id:T,app:'salah',subject:'Case',status,version:'516'},messages:structuredClone(messages),photos:messages.some(m=>m.id===M)?[{message_id:M,url:'https://kbltwszfvphgbxdbczsb.supabase.co/storage/v1/object/sign/support-photos/salah/test/photo.jpg?token='+photoToken}]:[],canClearEveryone:true,visibilityVersion:version+':0:0'});
const auth={auth:{getSession:async()=>({data:{session:{user:{id:uid}}}}),onAuthStateChange:fn=>{authChanged=fn;return{data:{subscription:{unsubscribe(){}}}};}},rpc(name,args){calls.push({name,args});return{abortSignal:async()=>{
 if(hold&&name==='support_chat_request'){const task=hold;hold=null;await task;}
 if(name==='support_list')return{data:[data().thread]};
 if(name==='support_read'){if(readFailure){readFailure=false;return{error:{message:'offline'}};}return{data:data()};}
 if(name==='support_chat_request'){
  const a=args.p_args;if(wrongAck){wrongAck=false;return{data:{ok:false}};}
  if(args.p_action==='reply'){messages.push({id:a.messageId,author_id:uid,owner_reply:false,body:a.body,reply:a.replyTo?{available:true,id:a.replyTo,owner_reply:true,body:'Support answer'}:null,created_at:'2026-11-18T10:00:02Z'});return{data:{ok:true,messageId:a.messageId,threadId:T}};}
  if(args.p_action==='clear')messages=[];
  else messages=messages.filter(m=>m.id!==a.messageId).map(m=>m.reply?.id===a.messageId?{...m,reply:{available:false}}:m);
  version++;return{data:{ok:true,threadId:T,messageId:a.messageId||null,scope:a.scope,operationId:a.operationId,visibilityVersion:version+':0:0'}};
 }
 throw Error('Unexpected '+name);
}};}};
const flush=async()=>{await new Promise(r=>setTimeout(r,5));for(let i=0;i<8;i++)await new Promise(r=>setImmediate(r));};
const stop=mountSupportPanel(root,{auth,app:'salah',version:516,initialThreadId:T});await flush();
assert(root.querySelector('.support-chat-message.is-mine'));assert.equal(root.querySelector('script'),null);assert(root.textContent.includes('<script>message</script>'));
const textarea=root.querySelector('textarea');textarea.value='Draft';textarea.dispatchEvent(new w.Event('input',{bubbles:true}));
const open=id=>root.querySelector('[data-message="'+id+'"] [data-message-actions]').click();
const image=root.querySelector('.support-photo img'),originalSrc=image.src;
open(M);const menu=root.querySelector('[data-message-menu="copy"]');photoToken='refreshed';status='answered';root.querySelector('[data-support-reload]').click();await flush();
assert.equal(root.querySelector('[data-message-menu="copy"]'),menu,'An unchanged refresh keeps the open action menu');
assert.equal(root.querySelector('.support-photo img'),image);assert.equal(image.src,originalSrc,'Fresh signed links do not reload the decoded photograph');
assert(root.querySelector('a.support-photo').href.endsWith('token=refreshed'));assert(root.querySelector('[data-support-thread-status]').textContent.length>0);
assert.equal(root.querySelector('textarea'),textarea);assert.equal(textarea.value,'Draft');root.querySelector('[data-message-menu="copy"]').click();await flush();
open(N);assert.equal(root.querySelector('[data-message-menu="everyone"]'),null,'Incoming messages do not gain author-only actions');
root.querySelector('[data-message-menu="reply"]').click();assert(root.querySelector('[data-support-reply-quote]').textContent.includes('Support answer'));assert.equal(textarea.value,'Draft');
root.querySelector('[data-support-cancel-reply]').click();assert.equal(textarea.value,'Draft');assert(root.querySelector('[data-support-reply-quote]').hidden);
open(N);root.querySelector('[data-message-menu="copy"]').click();await flush();assert.equal(copied,'Support answer');
open(N);root.querySelector('[data-message-menu="reply"]').click();wrongAck=true;root.querySelector('[data-support-reply]').requestSubmit();await flush();assert.equal(textarea.value,'Draft','An invalid send acknowledgement preserves the text and quote');assert(!root.querySelector('[data-support-reply-quote]').hidden);
open(N);root.querySelector('[data-message-menu="reply"]').click();root.querySelector('[data-support-reply]').requestSubmit();await flush();
assert.equal(root.querySelector('textarea'),textarea,'Refreshing an open conversation preserves the composer node');assert.equal(textarea.value,'','Successful send clears the submitted draft');
assert.equal(calls.find(c=>c.name==='support_chat_request'&&c.args.p_action==='reply').args.p_args.replyTo,N);
const quote=root.querySelector('button[data-reply-source]');let scrolled=false;root.querySelector('[data-message="'+N+'"]').scrollIntoView=()=>{scrolled=true;};quote.click();assert(scrolled);assert.equal(w.location.hash,'#support');
textarea.value='Keep this draft';textarea.dispatchEvent(new w.Event('input',{bubbles:true}));
open(M);w.confirm=()=>false;const before=calls.length;root.querySelector('[data-message-menu="everyone"]').click();await flush();assert.equal(calls.length,before,'Cancelled deletion does not call the backend');
w.confirm=()=>true;open(M);readFailure=true;root.querySelector('[data-message-menu="everyone"]').click();await flush();assert.equal(root.querySelector('[data-message="'+M+'"]'),null,'Known-deleted content remains removed even if refresh fails');assert.equal(textarea.value,'Keep this draft');assert(root.textContent.includes('Support answer'));
root.querySelector('.support-chat-actions').click();wrongAck=true;root.querySelector('[data-message-menu="clear-self"]').click();await flush();assert(root.querySelector('[data-message="'+N+'"]'),'An invalid acknowledgement never clears the local conversation');
root.querySelector('.support-chat-actions').click();root.querySelector('[data-message-menu="clear-self"]').click();await flush();assert.equal(root.querySelectorAll('[data-message]').length,0);assert.equal(root.querySelector('textarea'),textarea);assert.equal(textarea.value,'Keep this draft');
const failed=calls.filter(c=>c.name==='support_chat_request'&&c.args.p_action==='clear');assert.equal(failed[0].args.p_args.operationId,failed[1].args.p_args.operationId,'A retry reuses its operation identity');
messages=[{id:N,author_id:B,owner_reply:true,body:'Closed case answer',created_at:'2026-11-18T10:00:01Z'}];status='closed';root.querySelector('[data-support-reload]').click();await flush();
assert.equal(root.querySelector('textarea'),null);open(N);assert.equal(root.querySelector('[data-message-menu="reply"]'),null,'Closed cases cannot offer an invalid reply');assert(root.querySelector('[data-message-menu="copy"]'));root.querySelector('[data-message-menu="copy"]').click();await flush();
status='open';root.querySelector('[data-support-reload]').click();await flush();assert.equal(root.querySelector('textarea').value,'Keep this draft','Closing/reopening a case retains its unsent draft');
let release;hold=new Promise(resolve=>{release=resolve;});root.querySelector('.support-chat-actions').click();root.querySelector('[data-message-menu="clear-everyone"]').click();await flush();uid=B;authChanged('SIGNED_IN',{user:{id:B}});await flush();const next=root.querySelector('textarea');next.value='Other account draft';next.dispatchEvent(new w.Event('input',{bubbles:true}));release();await flush();assert.equal(root.querySelector('textarea'),next);assert.equal(next.value,'Other account draft');
stop();assert.equal(root.innerHTML,'');assert(!root.classList.contains('support-chat-shell'));await w.happyDOM.close();
console.log('PASS: actual support chat UI, author-only deletion, reply/cancel/copy/source jump, connected composer, cancelled/wrong/offline acknowledgements, idempotent retry and stale-account isolation.');
