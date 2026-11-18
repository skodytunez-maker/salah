import assert from 'node:assert/strict';
import {Window} from '../tests/staff/node_modules/happy-dom/lib/index.js';
const w=new Window({url:'https://fixture.invalid/#support?owner=1'}),doc=w.document;
Object.assign(globalThis,{window:w,document:doc,localStorage:w.localStorage,Event:w.Event});
const {mountSupportPanel}=await import('../dist/js/support-client.js');
const {supportInboxMarkup,supportInboxDate}=await import('../dist/js/support-chat-view.js');
const {setInterfaceLanguage,t}=await import('../dist/js/i18n.js');
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222',T='33333333-3333-4333-8333-333333333333',U='44444444-4444-4444-8444-444444444444';
const wrapper=doc.createElement('main');wrapper.innerHTML='<h1>Обращения пользователей</h1><section class="panel section" id="support-root"></section>';doc.body.append(wrapper);const root=wrapper.querySelector('section');
const rows=[{id:T,user_id:U,app:'salah',subject:'Сообщение от SALAH',nickname:'Собеседник <script>one()</script>',status:'open',owner_unread:true,awaiting_owner:true,updated_at:'2026-11-18T10:00:00Z',last_message_at:'2026-11-18T10:00:00Z',last_message:'Последний <script>private()</script> текст'},{id:B,app:'salah',subject:'Вопрос',nickname:'Очень длинное имя собеседника для узкого экрана',status:'closed',updated_at:'2025-11-01T10:00:00Z',last_message:'Прежний ответ'}];
let uid=A,authChanged,avatarRelease=null,holdAvatars=true,notifyCalls=0,caseStatus='open';const calls=[],avatarCalls=[],created=[],revoked=[];
const oldCreate=URL.createObjectURL,oldRevoke=URL.revokeObjectURL;URL.createObjectURL=()=>{const url='blob:fixture-'+created.length;created.push(url);return url;};URL.revokeObjectURL=url=>revoked.push(url);
const auth={auth:{getSession:async()=>({data:{session:uid?{user:{id:uid}}:null}}),onAuthStateChange:fn=>{authChanged=fn;return{data:{subscription:{unsubscribe(){}}}};}},rpc(name,args){calls.push({name,args});return{abortSignal:async()=>{
 if(name==='support_list')return{data:uid===A?structuredClone(rows):[]};
 if(name==='support_read')return{data:{thread:{...rows[0],status:caseStatus,version:'515'},messages:[],photos:[],visibilityVersion:'0:0:0',canClearEveryone:true}};
 if(name==='support_chat_request'&&args.p_action==='close'){assert.equal(args.p_owner,true);caseStatus='closed';rows[0].status='closed';rows[0].awaiting_owner=false;return{data:{ok:true,threadId:args.p_args.threadId,operationId:args.p_args.operationId,status:'closed'}};}
 throw Error('Unexpected '+name);
}};}};
const loadAvatar=async id=>{avatarCalls.push(id);if(holdAvatars)await new Promise(resolve=>{avatarRelease=resolve;});return new Blob([Uint8Array.from([255,216,255,217])],{type:'image/jpeg'});};
const flush=async()=>{await new Promise(r=>setTimeout(r,5));for(let i=0;i<8;i++)await new Promise(r=>setImmediate(r));};
setInterfaceLanguage('ru');
const stop=mountSupportPanel(root,{auth,app:'salah',version:515,owner:true,loadSupportAvatar:loadAvatar,enableNotifications:async()=>{notifyCalls++;return{ready:true};}});await flush();
assert(root.classList.contains('support-inbox-shell'));assert.equal(wrapper.querySelectorAll('h1,h2').length,1,'Embedded inbox has one page heading');
const first=root.querySelector('[data-support-thread="'+T+'"]');assert(first.classList.contains('is-unread'));assert.equal(first.querySelector('strong').textContent,rows[0].nickname);assert.equal(first.querySelector('script'),null);assert.equal(first.querySelector('.support-inbox-preview').textContent,rows[0].last_message);
assert(first.querySelector('.support-inbox-subject').textContent.includes('Сообщение от SALAH'));assert(first.querySelector('.support-new-badge'));assert(first.querySelector('time').title.length>10);
assert.equal(root.querySelectorAll('[data-member-avatar]').length,1,'Only owner-authorized recipient IDs enable photo hydration');assert.deepEqual(avatarCalls,[U]);
assert(root.querySelector('.support-inbox-toolbar [data-support-refresh]'));assert(root.querySelector('.support-inbox-toolbar [data-support-enable-notifications]'));assert(root.querySelector('.support-inbox-toolbar [data-owner-support-status]'));
assert.equal(root.querySelector('[data-support-new]'),null,'An owner cannot accidentally compose an untargeted request');
for(const language of ['ru','en','az','tg','uz','kk','de','ar']){
 setInterfaceLanguage(language);assert.equal(first.querySelector('time').textContent,supportInboxDate(rows[0].last_message_at));assert.equal(root.querySelector('[data-support-enable-notifications]').getAttribute('aria-label'),t('supportUi.notifyReplies'));assert.equal(first.querySelector('.support-inbox-status').textContent,t('supportConversationUi.awaiting'));
}
setInterfaceLanguage('ru');root.querySelector('[data-support-enable-notifications]').click();await flush();assert.equal(notifyCalls,1);
rows[0].owner_unread=false;root.querySelector('[data-support-refresh]').click();await flush();const waitingRow=root.querySelector('[data-support-thread="'+T+'"]');assert(waitingRow.classList.contains('is-awaiting'));assert.equal(waitingRow.querySelector('.support-new-badge'),null,'Reading is separate from waiting for a human response');waitingRow.click();await flush();assert(!root.classList.contains('support-inbox-shell'));const input=root.querySelector('textarea');input.value='Сохранённый черновик';input.dispatchEvent(new w.Event('input',{bubbles:true}));root.querySelector('[data-support-back]').click();await flush();root.querySelector('[data-support-thread="'+T+'"]').click();await flush();assert.equal(root.querySelector('textarea').value,'Сохранённый черновик');
assert.equal(root.querySelector('[data-support-close]').textContent,t('supportConversationUi.end'));root.querySelector('[data-support-close]').click();await flush();assert.equal(root.querySelector('textarea'),null);assert.equal(root.querySelector('[data-support-reopen]'),null,'Only the requesting user can reopen the closed case');
// Finish an old photo request after account turnover: it must not create a URL.
uid=B;authChanged('SIGNED_IN',{user:{id:B}});await flush();holdAvatars=false;avatarRelease();await flush();assert.equal(created.length,0);assert.equal(root.querySelector('[data-member-avatar]'),null);assert(!root.textContent.includes('private()'));assert(!root.textContent.includes(rows[0].nickname));
stop();assert.equal(root.innerHTML,'');assert(!root.classList.contains('support-inbox-shell'));assert.deepEqual(revoked,created);
// A successful existing-owner photo path uses/revokes only memory URLs.
uid=A;const stopPhoto=mountSupportPanel(root,{auth,app:'salah',version:515,owner:true,loadSupportAvatar:loadAvatar});await flush();assert.equal(root.querySelector('[data-member-avatar] img')?.src,'blob:fixture-0');stopPhoto();assert.deepEqual(revoked,created);
const userRoot=doc.createElement('section');doc.body.append(userRoot);let userAvatarCalls=0;
const stopUser=mountSupportPanel(userRoot,{auth,app:'salah',version:515,loadSupportAvatar:async()=>{userAvatarCalls++;throw Error('must not load');}});await flush();assert(userRoot.querySelector('[data-support-new]'));assert.equal(userRoot.querySelector('[data-member-avatar]'),null);assert.equal(userAvatarCalls,0);stopUser();
const empty=supportInboxMarkup([],{owner:true,more:true});assert(empty.includes('data-support-more'));assert(empty.includes(t('supportUi.emptyOwner')));assert.equal(supportInboxDate('bad timestamp'),'');
URL.createObjectURL=oldCreate;URL.revokeObjectURL=oldRevoke;await w.happyDOM.close();
console.log('PASS Support inbox: single heading, native conversation rows, escaped name/topic/preview, real unread/status/time, eight languages, owner-only memory avatars, draft navigation and stale-account photo cleanup.');
