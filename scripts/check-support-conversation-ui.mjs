import assert from 'node:assert/strict';
import{Window}from '../tests/staff/node_modules/happy-dom/lib/index.js';
const w=new Window({width:393,height:852,url:'https://fixture.invalid/#support?owner=1'}),doc=w.document;Object.defineProperty(w.navigator,'maxTouchPoints',{configurable:true,value:5});Object.assign(globalThis,{window:w,document:doc,localStorage:w.localStorage,Event:w.Event});w.confirm=()=>true;
const{mountSupportPanel}=await import('../dist/js/support-client.js');const{resolveBackAction}=await import('../dist/js/edge-back.js');const{t,setInterfaceLanguage}=await import('../dist/js/i18n.js');setInterfaceLanguage('ru');
const A='11111111-1111-4111-8111-111111111111',U='22222222-2222-4222-8222-222222222222',T='33333333-3333-4333-8333-333333333333',OLD='44444444-4444-4444-8444-444444444444',M='55555555-5555-4555-8555-555555555555',N='66666666-6666-4666-8666-666666666666';
// Decode fixture only: no browser or production account is used.
w.Image=function(){const img=doc.createElement('img');Object.defineProperties(img,{complete:{get:()=>true},naturalWidth:{get:()=>1024},naturalHeight:{get:()=>1536}});img.decode=async()=>{};return img;};
const{themePreferenceKey}=await import('../dist/js/conversation-themes.js');
w.localStorage.setItem(themePreferenceKey(A,'support:'+U),JSON.stringify({theme:'stars'}));
const app=doc.createElement('main');app.innerHTML='<a class="settings-back" href="#account" data-support-page-back>Мой аккаунт</a><header><h1 data-support-page-title>Обращения</h1></header><section id="support-root" class="panel section"></section>';doc.body.append(app);const root=app.querySelector('section');let actor=A,changed,closed=false,version=0,failRead=false,scroll=240;const calls=[],scrolls=[];Object.defineProperty(w,'scrollY',{get:()=>scroll});w.scrollTo=options=>{scrolls.push(options.top);scroll=options.top;};
let failCreate=true,holdRead=false,resumeRead=null,directoryFixture=false,failInboxClear=false,photoReplyReject=true;
const OTHER='77777777-7777-4777-8777-777777777777',NEW='88888888-8888-4888-8888-888888888888',OLDER='99999999-9999-4999-8999-999999999999';
const samplePhoto="https://kbltwszfvphgbxdbczsb.supabase.co/storage/v1/object/sign/support-photos/salah/example.jpg?token=fixture";
let testSharedTheme={theme:null,version:0},testVideosEnabled=false,videoUploaded=false,videoPublished=null,failFinish=true,testVoiceEnabled=false,lastFixtureMime='video/mp4';
const fixtureVideoBase='https://kbltwszfvphgbxdbczsb.supabase.co/storage/v1/object/';
let messages=[{id:M,thread_id:OLD,thread_subject:'Первая тема',thread_status:'open',author_id:A,owner_reply:true,body:'Первое сообщение',created_at:'2026-11-17T10:00:00Z'},{id:N,thread_id:T,thread_subject:'Вторая тема',thread_status:'open',author_id:U,owner_reply:false,body:'Новое сообщение',created_at:'2026-11-18T10:00:00Z'}];
const data=before=>({sharedTheme:testSharedTheme,videoReplies:testVideosEnabled,voiceReplies:testVoiceEnabled,media:videoPublished?[{message_id:videoPublished,url:fixtureVideoBase+'sign/support-chat-media/fixture.mp4?token=test',mime:lastFixtureMime}]:[],conversationId:U,anchorId:OLD,thread:{id:T,app:'salah',subject:'Вторая тема',nickname:'Один человек',status:closed?'closed':'open',version:'516',awaiting_owner:!closed,can_reopen:closed},messages:structuredClone(before?[messages[0]].filter(Boolean):messages),photos:[{message_id:M,url:samplePhoto}],next:before?null:{at:'2026-11-17T10:00:00Z',id:M},visibilityVersion:String(version),canClearEveryone:true});
const auth={auth:{getSession:async()=>({data:{session:{user:{id:actor}}}}),onAuthStateChange:fn=>{changed=fn;return{data:{subscription:{unsubscribe(){}}}};}},rpc(name,args){calls.push({name,args});return{abortSignal:async()=>{
 if(name==='support_conversation_request'){
  if(args.p_action==='list'&&directoryFixture&&args.p_args.before)return{data:{rows:[{id:OLDER,conversation_id:OTHER}],next:null}};
  if(args.p_action==='list')return{data:{rows:actor===A?[{id:OLD,conversation_id:U,user_id:U,app:'salah',nickname:'Один человек',subject:'Вторая тема',last_message:'Новое сообщение',updated_at:'2026-11-18T10:00:00Z',awaiting_owner:true,status:'open',owner_unread:true}]:[],next:directoryFixture?{at:'2026-11-18T10:00:00Z',id:OLD}:null}};
  if(args.p_action==='read'){if(holdRead)await new Promise(resolve=>{resumeRead=resolve;});if(failRead){failRead=false;return{error:{message:'offline'}};}if(args.p_args.threadId===OLDER){const older=data(null);return{data:{...older,conversationId:OTHER,anchorId:OLDER,thread:{...older.thread,id:OLDER,nickname:'Старый диалог'}}};}return{data:data(args.p_args.before)};}
  if(args.p_action==='clear'){if(failInboxClear){failInboxClear=false;return{error:{message:'offline'}};}messages=[];version++;return{data:{ok:true,threadId:args.p_args.threadId,operationId:args.p_args.operationId,scope:args.p_args.scope,visibilityVersion:String(version)}};}
  if(args.p_action==='close'){closed=true;return{data:{ok:true,threadId:args.p_args.threadId,operationId:args.p_args.operationId,scope:'everyone',visibilityVersion:String(version)}};}
 }
 if(name==='support_conversation_theme'){assert.equal(args.p_thread,OLD);assert.equal(args.p_owner,true);testSharedTheme={theme:args.p_theme,version:testSharedTheme.version+1};return{data:testSharedTheme};}
 if(name==='support_reply_media_start'){lastFixtureMime=args.p_mime;return{data:{uploaded:videoUploaded,uploadUrl:fixtureVideoBase+'upload/sign/support-chat-media/fixture.mp4?token=test'}};}
 if(name==='support_reply_media_finish'){
  assert(videoUploaded);if(!videoPublished)messages.push({id:args.p_id,thread_id:T,thread_subject:'Видео',thread_status:'open',author_id:actor,owner_reply:false,body:'📎',created_at:'2026-11-25T10:00:00Z'});videoPublished=args.p_id;
  if(failFinish){failFinish=false;return{error:{message:'offline'}};}
  return{data:{ok:true,threadId:args.p_thread,messageId:args.p_id}};
 }
 if(name==='support_reply_photos'){if(photoReplyReject){photoReplyReject=false;return{error:{message:'offline'}};}return{data:{ok:true,threadId:args.p_thread,messageId:args.p_id}};}
 if(name==='support_owner_recipient')return{data:{id:args.p_user,nickname:'Новый <адресат>'}};
 if(name==='support_owner_create'){
  if(failCreate)return{error:{message:'offline'}};
  messages.push({id:args.p_id,thread_id:T,thread_subject:args.p_subject,thread_status:'open',author_id:A,owner_reply:true,body:args.p_body,created_at:'2026-11-24T10:00:00Z'});
  version++;return{data:{ok:true}};
 }
 if(name==='support_chat_request'&&args.p_action==='reply')return{error:{message:'offline'}};
 if(name==='support_chat_request'&&args.p_action==='reopen'){assert.equal(args.p_owner,true,'Owner reopening uses the verified operator path');closed=false;return{data:{ok:true,threadId:args.p_args.threadId,operationId:args.p_args.operationId,status:'open'}};}
 if(name==='support_chat_request'&&args.p_action==='delete'){assert.equal(args.p_args.threadId,OLD,'Delete routes to the selected message original case');messages=messages.filter(m=>m.id!==args.p_args.messageId);version++;return{data:{ok:true,...args.p_args,visibilityVersion:String(version)}};}
 throw Error('Unexpected RPC '+name+' '+args.p_action);
}};}};
const flush=async()=>{for(let i=0;i<10;i++)await new Promise(r=>setImmediate(r));};let openedProfile=null,profileThemeAdapter=null;let stop=mountSupportPanel(root,{auth,app:'salah',version:520,owner:true,groupConversations:true,onOpenProfile:(person,_opener,theme)=>{openedProfile=person;profileThemeAdapter=theme;}});await flush();assert.equal(app.querySelectorAll('h1,h2').length,1,'Wrapped route heading is not duplicated');assert.equal(root.querySelectorAll('.support-inbox-row').length,1);
const originalInbox=root.querySelector('[data-support-thread]');holdRead=true;
const readsBeforeOpening=calls.filter(x=>x.args.p_action==='read').length;
originalInbox.click();await flush();
assert.equal(root.querySelector('[data-support-thread]'),originalInbox,'The same inbox remains mounted until the conversation arrives');
assert.equal(originalInbox.getAttribute('aria-busy'),'true');
assert.equal(root.querySelector('.support-heading'),null,'No legacy loading panel flashes between screens');
originalInbox.click();await flush();
assert.equal(calls.filter(x=>x.args.p_action==='read').length,readsBeforeOpening+1,'Repeated taps do not restart the request');
holdRead=false;resumeRead();await flush();
assert.equal(originalInbox.hasAttribute('aria-busy'),false);
const thumbnail=root.querySelector('.support-photo img');
assert.equal(thumbnail.getAttribute('src'),samplePhoto);
assert(root.querySelector('.support-photo[data-support-photo-frame]'),'Photo geometry is present before decoding');
assert.equal(root.querySelector('.support-photo').href,samplePhoto,'Opening the original still uses the authorized file');
assert(root.classList.contains('support-chat-shell'));assert(app.classList.contains('support-route-chat'));assert.equal(root.querySelector('.support-chat-person>strong').textContent,'Один человек');assert.equal(root.querySelectorAll('[data-message]').length,2);assert.equal(root.querySelectorAll('.support-case-divider').length,2);
assert.equal(root.dataset.conversationTheme,'stars','The saved theme covers the fixed viewport, including safe-area and side gutters');assert(!root.querySelector('.support-panel').hasAttribute('data-conversation-theme'),'The wallpaper is not restricted to an inset panel');
const initialLog=root.querySelector('.support-messages'),initialMessage=initialLog.querySelector('[data-message]');initialLog.scrollTop=70;initialLog.dispatchEvent(new w.Event('scroll'));assert(initialLog.hasAttribute('data-support-scrolled'),'Only scrolled history receives the soft edge');assert.equal(initialLog.querySelector('[data-message]'),initialMessage,'Edge updates retain messages');initialLog.scrollTop=0;initialLog.dispatchEvent(new w.Event('scroll'));assert(!initialLog.hasAttribute('data-support-scrolled'),'The first message is fully visible at the start');

const compactInput=root.querySelector('[data-support-reply] textarea'),compactSend=root.querySelector('.support-chat-send');assert.equal(Number(compactInput.rows),1);assert.equal(compactInput.placeholder,t('supportUi.message'));assert.equal(compactInput.style.height,'44px');assert.equal(compactSend.getAttribute('aria-label'),t('supportUi.send'));assert(compactSend.querySelector('svg[aria-hidden="true"]'));assert.equal(compactSend.type,'submit');
compactInput.focus();assert.equal(compactInput.style.height,'64px','Starting a message expands the field like the supplied Codex reference');
let measuredInputHeight=112,measuredInputReads=0;Object.defineProperty(compactInput,'scrollHeight',{configurable:true,get:()=>{measuredInputReads++;return measuredInputHeight;}});compactInput.value='Первая строка\nВторая строка\nТретья строка';compactInput.dispatchEvent(new w.Event('input',{bubbles:true}));assert.equal(compactInput.style.height,'112px');measuredInputHeight=2000;compactInput.value+='\n'+('Длинное сообщение '.repeat(50));compactInput.scrollTop=200;compactInput.dispatchEvent(new w.Event('input',{bubbles:true}));assert.equal(compactInput.style.height,'144px');assert.equal(compactInput.style.overflowY,'auto');assert.equal(compactInput.scrollTop,200,'Capped typing preserves the textarea scroll');
const measuredBeforeRepeat=measuredInputReads;for(let repeat=0;repeat<5;repeat++)w.dispatchEvent(new w.Event('resize'));assert.equal(measuredInputReads,measuredBeforeRepeat,'Repeated viewport/observer callbacks with unchanged input do not collapse and remeasure the field');
Object.defineProperties(initialLog,{scrollHeight:{configurable:true,get:()=>1000},clientHeight:{configurable:true,get:()=>200}});initialLog.scrollTop=100;initialLog.dispatchEvent(new w.Event('scroll'));const oldInnerHeight=w.innerHeight;Object.defineProperty(w,'innerHeight',{configurable:true,value:320});w.dispatchEvent(new w.Event('resize'));assert.equal(compactInput.style.height,'80px','The growing field stays within one quarter of the keyboard viewport');assert(root.hasAttribute('data-support-keyboard'),'Software-keyboard geometry is reflected only in the mounted Support shell');assert.equal(initialLog.scrollTop,100,'Opening a keyboard while reading history must not force the latest message');Object.defineProperty(w,'innerHeight',{configurable:true,value:oldInnerHeight});w.dispatchEvent(new w.Event('resize'));assert(!root.hasAttribute('data-support-keyboard'),'Closing the keyboard restores normal bottom safe-area spacing');delete initialLog.scrollHeight;delete initialLog.clientHeight;
compactInput.value='';measuredInputHeight=22;compactInput.dispatchEvent(new w.Event('input',{bubbles:true}));assert.equal(compactInput.style.height,'64px','A focused empty field remains expanded');compactInput.blur();assert.equal(compactInput.style.height,'44px','Closing entry returns the empty field to one line');assert.equal(compactInput.style.overflowY,'hidden');delete compactInput.scrollHeight;

// Narrow desktop resizes and pinch zoom are not software-keyboard entry.
Object.defineProperty(w.navigator,'maxTouchPoints',{configurable:true,value:0});compactInput.focus();Object.defineProperty(w,'innerHeight',{configurable:true,value:320});w.dispatchEvent(new w.Event('resize'));assert(!root.hasAttribute('data-support-keyboard'),'Resizing a non-touch desktop cannot hide case actions');Object.defineProperty(w,'innerHeight',{configurable:true,value:oldInnerHeight});w.dispatchEvent(new w.Event('resize'));Object.defineProperty(w.navigator,'maxTouchPoints',{configurable:true,value:5});
const oldVisualDescriptor=Object.getOwnPropertyDescriptor(w,'visualViewport');Object.defineProperty(w,'visualViewport',{configurable:true,value:{height:320,width:393,offsetTop:-7,scale:2}});w.dispatchEvent(new w.Event('resize'));assert(!root.hasAttribute('data-support-keyboard'),'Pinch zoom cannot activate software-keyboard styling');assert.equal(root.style.getPropertyValue('--support-chat-top'),'0px','Negative Safari viewport offsets cannot move the header above its safe area');if(oldVisualDescriptor)Object.defineProperty(w,'visualViewport',oldVisualDescriptor);else delete w.visualViewport;w.dispatchEvent(new w.Event('resize'));compactInput.blur();

for(const locale of ['ru','en','az','tg','uz','kk','de','ar']){setInterfaceLanguage(locale);assert.equal(compactInput.placeholder,t('supportUi.message'));assert.equal(compactSend.getAttribute('aria-label'),t('supportUi.send'));assert(compactSend.querySelector('svg'));}setInterfaceLanguage('ru');

compactInput.value='Черновик при потере сети';compactInput.dispatchEvent(new w.Event('input',{bubbles:true}));compactInput.closest('form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await flush();assert.equal(root.querySelector('textarea').value,'Черновик при потере сети','A failed real submit retains the draft');assert.equal(root.querySelector('.support-chat-send').disabled,false);assert(calls.some(c=>c.name==='support_chat_request'&&c.args.p_action==='reply'&&c.args.p_args.body==='Черновик при потере сети'));
root.querySelector('[data-support-profile]').click();assert.equal(openedProfile.id,U);assert.equal(root.dataset.supportView,'thread','Opening a profile leaves its conversation selected');
assert.deepEqual(profileThemeAdapter.initialSharedTheme,{theme:null,version:0});
await profileThemeAdapter.setSharedTheme('emerald',new AbortController().signal);await flush();
assert.equal(root.dataset.conversationTheme,'emerald','The profile picker updates the same chat through the authenticated RPC');
const textarea=root.querySelector('textarea');textarea.value='Неотправленный черновик';textarea.dispatchEvent(new w.Event('input',{bubbles:true}));const checkpoint=stop.checkpoint();initialLog.scrollTop=70;initialLog.dispatchEvent(new w.Event('scroll'));stop();assert(!initialLog.hasAttribute('data-support-scrolled'),'Disposal clears the old scroll-edge presentation');initialLog.dispatchEvent(new w.Event('scroll'));assert(!initialLog.hasAttribute('data-support-scrolled'),'Detached history cannot restore a disposed effect');stop=mountSupportPanel(root,{auth,app:'salah',version:520,owner:true,groupConversations:true,resumeThread:checkpoint});await flush();assert.equal(root.dataset.supportView,'thread');assert.equal(root.querySelector('textarea').value,'Неотправленный черновик','Reauthorization restores the same actor’s actual draft');changed('TOKEN_REFRESHED',{user:{id:A}});await flush();assert.equal(root.dataset.supportView,'thread');
const back=root.querySelector('[data-support-back]');back.getClientRects=()=>[{width:44,height:44}];let routeBack=0;resolveBackAction(app,{canBack:()=>true,back:()=>routeBack++})();await flush();assert.equal(routeBack,0,'Gesture returns to inbox before browser route history');assert.equal(root.dataset.supportView,'list');assert(!root.hasAttribute('data-conversation-theme'),'Leaving the chat clears its wallpaper before rendering the inbox');assert.equal(scrolls.at(-1),240);root.querySelector('[data-support-thread]').click();await flush();assert.equal(root.querySelector('textarea').value,'Неотправленный черновик');
// Native Safari's edge gesture traverses browser history without our pointer handler.
assert(w.history.state?.salahSupportConversation,'An open chat owns a same-URL Back entry');const nativeHash=w.location.hash;w.history.back();await new Promise(r=>setTimeout(r,40));await flush();assert.equal(root.dataset.supportView,'list','Native browser Back returns to inbox, never Menu');assert.equal(w.location.hash,nativeHash);assert.equal(scrolls.at(-1),240);root.querySelector('[data-support-thread]').click();await flush();assert.equal(root.querySelector('textarea').value,'Неотправленный черновик');
// A short deliberate horizontal swipe commits once; vertical reading stays in chat.
const panel=root.querySelector('.support-panel'),swipeLog=root.querySelector('.support-messages');panel.getBoundingClientRect=()=>({width:393,left:0,top:0});
function pointer(type,x,y){swipeLog.dispatchEvent(new w.PointerEvent(type,{bubbles:true,cancelable:true,pointerId:7,pointerType:'touch',isPrimary:true,button:0,clientX:x,clientY:y}));}
pointer('pointerdown',100,300);pointer('pointermove',106,380);pointer('pointerup',106,380);await flush();assert.equal(root.dataset.supportView,'thread');
pointer('pointerdown',100,300);pointer('pointermove',182,303);pointer('pointerup',182,303);await new Promise(r=>setTimeout(r,400));await flush();assert.equal(root.dataset.supportView,'list','82px Support swipe commits on first attempt');assert.equal(w.location.hash,nativeHash);root.querySelector('[data-support-thread]').click();await flush();
root.querySelector('[data-support-history-earlier]').click();await flush();assert.equal(root.querySelectorAll('[data-message]').length,1);assert.equal(root.querySelector('[data-support-history-latest]').hidden,false);assert.equal(root.querySelector('textarea').value,'Неотправленный черновик');root.querySelector('[data-support-history-latest]').click();await flush();assert.equal(root.querySelectorAll('[data-message]').length,2);
root.querySelector('[data-message="'+M+'"] [data-message-actions]').click();assert(root.querySelector('dialog[open]'));root.querySelector('[data-message-menu="self"]').click();await flush();assert(!root.querySelector('[data-message="'+M+'"]'));assert(root.querySelector('[data-message="'+N+'"]'));assert.equal(root.querySelector('textarea').value,'Неотправленный черновик');
messages[0].body='Свежая строка переписки';root.querySelector('[data-support-reload]').click();await flush();root.querySelector('[data-support-back]').click();await flush();assert.equal(root.querySelector('.support-inbox-preview').textContent,'Свежая строка переписки','Fast Back immediately retains the real latest preview');root.querySelector('[data-support-thread]').click();await flush();
root.querySelector('[data-support-close]').click();await flush();assert(calls.some(c=>c.name==='support_conversation_request'&&c.args.p_action==='close'&&c.args.p_args.threadId===OLD));assert.equal(root.querySelector('textarea'),null);assert(root.querySelector('.support-chat-footer [data-support-reopen]'),'Closed owner view offers continuation in the bottom bar');assert(root.querySelector('.support-chat-footer [data-support-status]'),'Transient status belongs below the history, not above the person header');root.querySelector('[data-support-reopen]').click();await flush();assert(root.querySelector('.support-chat-footer textarea'));assert.equal(root.querySelector('textarea').value,'Неотправленный черновик','Closing and reopening retains the actual draft');assert.equal(root.querySelector('.support-chat-footer').previousElementSibling.className,'support-messages');
const oldCheckpoint=stop.checkpoint();actor=U;changed('SIGNED_IN',{user:{id:U}});await flush();assert(!root.textContent.includes('Один человек'));assert(!app.classList.contains('support-route-chat'));stop();assert.equal(root.innerHTML,'');assert(!root.hasAttribute('data-conversation-theme'),'Account cleanup removes the previous actor’s theme');stop=mountSupportPanel(root,{auth,app:'salah',version:520,owner:false,groupConversations:true,resumeThread:oldCheckpoint});await flush();assert.equal(root.dataset.supportView,'list','Another actor cannot restore the old private thread');assert(!root.querySelector('[data-support-profile]'));stop();
actor=A;
stop=mountSupportPanel(root,{auth,app:'salah',version:558,owner:true,groupConversations:true,recipientId:U});await flush();
assert.equal(root.querySelector('.support-chat-person strong').textContent,'Новый <адресат>');
assert(root.querySelector('.support-person-avatar[data-member-avatar="'+U+'"]'));
assert(app.classList.contains('support-route-chat'));assert(doc.body.classList.contains('support-conversation-open'));
assert.equal(root.querySelectorAll('[data-message]').length,0,'A first-message draft has no fabricated history');
const ownerForm=root.querySelector('.support-chat-footer [data-support-owner-compose]'),ownerInput=ownerForm.elements.body;
const ownerSubmit=ownerForm.querySelector('button[type="submit"]');
assert.equal(ownerInput.getAttribute('rows'),'1');assert(ownerSubmit.querySelector('svg'));assert(ownerForm.querySelector('.salah-emoji-toggle'));
assert.equal(ownerSubmit.getAttribute('aria-label'),t('supportUi.send'));
assert.equal(ownerForm.elements.subject.value,t('supportUi.defaultSubject',{app:'SALAH'}));
ownerForm.elements.subject.value='Тестовая тема';
ownerInput.value='Первое личное сообщение';ownerInput.dispatchEvent(new w.Event('input',{bubbles:true}));
ownerInput.focus();Object.defineProperty(w,'visualViewport',{configurable:true,value:new w.EventTarget()});
Object.assign(w.visualViewport,{width:393,height:460,scale:1,offsetTop:10});w.dispatchEvent(new w.Event('resize'));
assert(root.hasAttribute('data-support-keyboard'));assert.equal(root.style.getPropertyValue('--support-chat-top'),'10px');
const submitOwner=()=>ownerForm.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
submitOwner();await flush();
const firstSend=calls.find(x=>x.name==='support_owner_create');
assert.equal(firstSend.args.p_user,U);assert.equal(firstSend.args.p_subject,'Тестовая тема');assert.equal(firstSend.args.p_body,'Первое личное сообщение');
assert.equal(ownerInput.value,'Первое личное сообщение','A failed first send keeps the draft');
failCreate=false;submitOwner();await flush();
assert.equal(calls.filter(x=>x.name==='support_owner_create').at(-1).args.p_id,firstSend.args.p_id,'A retry reuses the first message ID');
assert.equal(root.dataset.supportView,'thread');
assert(root.textContent.includes('Первое личное сообщение'),'After confirmation open the real transcript');
stop();assert(!doc.body.classList.contains('support-conversation-open'));
stop=mountSupportPanel(root,{auth,app:'salah',version:558,owner:true,groupConversations:true,recipientId:U});await flush();
const startBack=root.querySelector('[data-support-back]');startBack.click();await flush();
assert.equal(root.dataset.supportView,'list','Back before sending loads the actual request list');
assert(root.querySelector('[data-support-thread]'));assert(!app.classList.contains('support-route-chat'));
assert(!doc.body.classList.contains('support-conversation-open'));
stop();
directoryFixture=true;
const pages=[];
const directoryOptions={auth,app:'salah',version:560,owner:true,groupConversations:true,loadOwnerUsers:async(page,{expectedActor,signal})=>{
 pages.push(page);assert.equal(expectedActor,A);assert.equal(signal.aborted,false);
 const users=page===1?[{id:U,nickname:'Уже есть чат'},{id:NEW,nickname:'Новый адресат'}]:[{id:OTHER,nickname:'Старый диалог'}];
 return {users,total:51};
}};
stop=mountSupportPanel(root,directoryOptions);await flush();
assert.deepEqual(pages,[],'Opening the inbox does not load a private user list');
const openUsers=()=>root.querySelector('[data-support-users]').click();
openUsers();await flush();
assert.equal(w.location.hash,nativeHash);
const inbox=root.querySelector('.support-list:not([data-support-users-results])'),newContacts=root.querySelector('.support-user-directory');
assert(!inbox.hidden,'Existing conversations stay visible above contacts');
assert(inbox.compareDocumentPosition(newContacts)&w.Node.DOCUMENT_POSITION_FOLLOWING);
assert.equal(root.querySelector('[data-support-user-choice="'+U+'"]'),null,'Do not duplicate a current conversation in the contact list');
const search=newContacts.querySelector('input');search.value='Старый';search.dispatchEvent(new w.Event('input',{bubbles:true}));
await new Promise(r=>setTimeout(r,275));await flush();
assert.deepEqual(pages,[1,2],'Search loads subsequent authorized pages');
assert.equal(root.querySelectorAll('[data-support-user-choice]').length,0);
assert(calls.some(c=>c.args.p_action==='list'&&c.args.p_args.before),'Older conversations are excluded from contacts even before their inbox page is shown');
root.querySelector('[data-support-more]').click();await flush();
assert(root.querySelector('[data-support-thread="'+OLDER+'"]'),'Older conversation belongs in the inbox');
root.querySelector('[data-support-thread="'+OLDER+'"]').click();await flush();
assert.equal(root.querySelector('.support-chat-person strong').textContent,'Старый диалог');
assert.equal(calls.at(-1).args.p_args.threadId,OLDER);
root.querySelector('[data-support-back]').click();await flush();
openUsers();await flush();
const sendsBefore=calls.filter(c=>c.name==='support_owner_create').length;
root.querySelector('[data-support-user-choice="'+NEW+'"]').click();await flush();
assert.equal(root.dataset.supportView,'new');
assert.equal(calls.at(-1).name,'support_owner_recipient');assert.equal(calls.at(-1).args.p_user,NEW);
assert.equal(calls.filter(c=>c.name==='support_owner_create').length,sendsBefore,'Choosing a new user only opens the compose view');
root.querySelector('[data-support-back]').click();await flush();
root.querySelector('[data-support-more]').click();await flush();
const activeRow=root.querySelector('[data-support-thread="'+OLD+'"]');
const context=()=>root.querySelector('.support-inbox-context');
let rowTop=330;const activeRect=()=>({left:20,top:rowTop,width:353,height:88});activeRow.getBoundingClientRect=activeRect;
const originalRect=w.HTMLElement.prototype.getBoundingClientRect;
w.HTMLElement.prototype.getBoundingClientRect=function(){
 if(this.classList.contains('support-inbox-context-frame'))return {left:12,top:54,width:369,height:764};
 if(this.classList.contains('support-inbox-context-actions'))return {height:this.querySelector('[role=alert]')?158:98};
 return originalRect.call(this);
};
const readCount=()=>calls.filter(c=>c.args.p_action==='read').length;
const clearCount=()=>calls.filter(c=>c.args.p_action==='clear').length;
const readsBeforeHold=readCount(),clearsBeforeHold=clearCount();
const rowPointer=(type,clientY)=>activeRow.dispatchEvent(new w.PointerEvent(type,{bubbles:true,pointerId:7,pointerType:'touch',isPrimary:true,button:0,clientX:120,clientY}));
rowPointer('pointerdown',200);rowPointer('pointermove',230);await new Promise(r=>setTimeout(r,530));
assert.equal(context().open,false,'A scrolling gesture does not open the menu');
rowPointer('pointerdown',200);await new Promise(r=>setTimeout(r,530));assert(context().open,'Holding a conversation opens its actions');
const highlighted=()=>context().querySelector('.support-inbox-context-preview');
const actions=()=>context().querySelector('.support-inbox-context-actions');
assert(highlighted().textContent.includes('Один человек')&&highlighted().textContent.includes('Новое сообщение'));
assert(highlighted().querySelector('.support-inbox-avatar'),'Highlighted row includes its existing avatar');
assert.equal(highlighted().style.top,'276px','The highlighted row stays at the selected position');
assert.equal(highlighted().style.left,'8px');
assert.equal(actions().style.top,'372px','Open under the highlighted row when there is room');
assert.equal(actions().style.left,highlighted().style.left);
assert.equal(root.querySelector('[data-support-thread="'+OLD+'"]'),activeRow,'Opening the menu does not replace the actual inbox row');
assert.equal(readCount(),readsBeforeHold,'A preview must not open the thread or mark it as read');
rowPointer('pointerup',200);activeRow.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true,detail:1}));await flush();
assert.equal(root.dataset.supportView,'list','Release of a long press does not navigate');
context().querySelector('[data-support-context-delete]').click();
assert(context().querySelector('[data-support-context-confirm]'));assert.equal(clearCount(),clearsBeforeHold);
context().querySelector('[data-support-context-cancel]').click();
assert(!context().open);assert.equal(clearCount(),clearsBeforeHold,'Cancelling never clears a conversation');
rowTop=670;
activeRow.dispatchEvent(new w.KeyboardEvent('keydown',{bubbles:true,key:'F10',shiftKey:true,cancelable:true}));assert(context().open,'Menu is also available with the keyboard');
assert.equal(highlighted().style.top,'616px');
assert.equal(actions().style.top,'510px','Use the space above a row near the bottom edge');
context().querySelector('[data-support-context-delete]').click();
failInboxClear=true;
context().querySelector('[data-support-context-confirm]').click();await flush();
assert.equal(clearCount(),clearsBeforeHold+1);
assert.equal(root.querySelector('[data-support-thread="'+OLD+'"]'),activeRow,'The conversation stays in the inbox if the server rejects the operation');
const failedOperation=calls.at(-1).args.p_args.operationId;
activeRow.dispatchEvent(new w.MouseEvent('contextmenu',{bubbles:true,cancelable:true,button:2}));
assert(context().open,'The context menu is available from a mouse');
context().querySelector('[data-support-context-delete]').click();
context().querySelector('[data-support-context-confirm]').click();await flush();
assert.equal(calls.at(-1).args.p_args.operationId,failedOperation,'A retry uses the original operation ID');
assert.equal(clearCount(),clearsBeforeHold+2);
assert.deepEqual(calls.at(-1).args.p_args,{threadId:OLD,scope:'self',operationId:calls.at(-1).args.p_args.operationId});
assert(!root.querySelector('[data-support-thread="'+OLD+'"]'),'Remove the row only after the authenticated acknowledgement');
assert(root.querySelector('[data-support-thread="'+OLDER+'"]'),'Keep the other conversations');
w.HTMLElement.prototype.getBoundingClientRect=originalRect;
stop();
stop=mountSupportPanel(root,{...directoryOptions,owner:false});await flush();
assert.equal(root.querySelector('[data-support-users]'),null,'Ordinary accounts cannot mount the directory');assert.equal(root.querySelector('.support-inbox-context'),null,'Ordinary accounts cannot mount owner inbox actions');
stop();
const prepareFixturePhoto=async()=>({data:'fixture-photo',preview:'data:image/jpeg;base64,AAAA'});
for(const asOwner of [true,false]){
 actor=asOwner?A:U;photoReplyReject=true;
 stop=mountSupportPanel(root,{auth,app:'salah',version:561,owner:asOwner,groupConversations:true,initialThreadId:OLD,preparePhoto:prepareFixturePhoto});
 await flush();
 const form=root.querySelector('[data-support-reply]'),picker=form?.querySelector('[data-support-reply-photo-input]');
 assert(picker&&form.querySelector('.salah-message-input-row [data-support-reply-photo-pick]'),'Both participants can attach photos without adding a separate composer row');
 Object.defineProperty(picker,'files',{configurable:true,value:[new w.File(['photo'],'fixture.jpg',{type:'image/jpeg'})]});
 picker.dispatchEvent(new w.Event('change',{bubbles:true}));await flush();
 assert.equal(form.querySelector('textarea').required,false,'Attachments can be sent without a caption');
 assert.equal(form.querySelectorAll('[data-support-reply-photos] img').length,1);
 const submit=()=>form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 submit();await flush();
 const getLast=()=>calls.findLast(c=>c.name==='support_reply_photos').args;
 const firstAttempt=getLast();
 assert.equal(firstAttempt.p_body,'');assert.equal(firstAttempt.p_owner,asOwner);
 assert.deepEqual(firstAttempt.p_photos,['fixture-photo']);
 assert.equal(form.querySelectorAll('[data-support-reply-photos] img').length,1,'A failure keeps the selected photo');
 submit();await flush();
 assert.equal(getLast().p_id,firstAttempt.p_id,'A normal retry uses exactly the same message id');
 assert.equal(form.querySelectorAll('[data-support-reply-photos] img').length,0);
 stop();
}
testVideosEnabled=true;
const originalFetch=globalThis.fetch;let videoPuts=0;
globalThis.fetch=async(url,request)=>{
 assert(url.includes('/upload/sign/support-chat-media/'));assert.equal(request.method,'PUT');videoPuts++;
 if(videoPuts===1)return new Response(null,{status:503});
 videoUploaded=true;return new Response(null,{status:200});
};
stop=mountSupportPanel(root,{auth,app:'salah',version:561,owner:false,groupConversations:true,initialThreadId:OLD,preparePhoto:prepareFixturePhoto});await flush();
const videoForm=root.querySelector('[data-support-reply]'),videoInput=videoForm.querySelector('[data-support-reply-photo-input]');
assert(videoInput.accept.includes('video/quicktime'));
Object.defineProperty(videoInput,'files',{configurable:true,value:[new File(['01234567890123456789'],'fixture.mov',{type:'video/quicktime'})]});
videoInput.dispatchEvent(new w.Event('change',{bubbles:true}));await flush();
assert(videoForm.querySelector('[data-support-reply-video-remove]'));assert.equal(videoForm.querySelector('textarea').required,false);
const sendVideo=()=>videoForm.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
sendVideo();await flush();
assert(!calls.some(c=>c.name==='support_reply_media_finish'),'A failed upload never attempts to post a message');
assert(videoForm.querySelector('[data-support-reply-video-remove]'));
sendVideo();await flush();
assert(videoForm.querySelector('[data-support-reply-video-remove]'),'Lost final acknowledgement keeps the composer draft');
sendVideo();await flush();
assert.equal(videoPuts,2,'Retry after successful upload skips uploading the bytes again');
assert.equal(new Set(calls.filter(c=>c.name.startsWith('support_reply_media_')).map(c=>c.args.p_id)).size,1);
assert(!videoForm.querySelector('[data-support-reply-video-remove]'));
const playButton=root.querySelector('[data-support-media-play]');assert(playButton,'Delivered video is rendered in the chat');
const inlineVideo=playButton.parentElement.querySelector('video');assert(inlineVideo.hidden&&inlineVideo.getAttribute('src')===null);
inlineVideo.play=async()=>{};playButton.click();assert(!inlineVideo.hidden);assert(inlineVideo.src.includes('/sign/support-chat-media/'));
stop();
testVoiceEnabled=true;videoUploaded=false;videoPublished=null;failFinish=true;
const microphoneTracks=[];let createdVoiceUrls=0;const revokedVoiceUrls=[];
Object.defineProperty(w.navigator,'mediaDevices',{configurable:true,value:{async getUserMedia(){
 const track={stops:0,stop(){this.stops++;}};microphoneTracks.push(track);return {getTracks:()=>[track]};
}}});
w.MediaRecorder=class{
 static isTypeSupported(mime){return mime==='audio/mp4';}
 constructor(_stream,options){this.mimeType=options.mimeType;this.state='inactive';}
 start(){this.state='recording';}
 stop(){this.state='inactive';this.ondataavailable?.({data:new Blob(['0123456789abcdef'],{type:'audio/mp4'})});this.onstop?.();}
};
w.URL.createObjectURL=()=> 'blob:voice-'+(++createdVoiceUrls);
w.URL.revokeObjectURL=url=>revokedVoiceUrls.push(url);
globalThis.fetch=async(_url,init)=>{
 assert.equal(init.body.get('').type,'audio/mp4');videoUploaded=true;return new Response(null,{status:200});
};
stop=mountSupportPanel(root,{auth,app:'salah',version:561,owner:false,groupConversations:true,initialThreadId:OLD,preparePhoto:prepareFixturePhoto});await flush();
const voiceForm=root.querySelector('[data-support-reply]'),mic=voiceForm.querySelector('[data-support-voice-toggle]');
assert(!mic.hidden,'The microphone is available on a supported browser');
mic.click();await flush();
assert.equal(mic.getAttribute('aria-pressed'),'true');
assert(voiceForm.querySelector('[type=submit]').disabled,'A recording cannot post until the user stops it');
voiceForm.querySelector('[data-support-voice-cancel]').click();
assert.equal(microphoneTracks.at(-1).stops,1);assert(!voiceForm.querySelector('audio'));
mic.click();await flush();mic.click();await flush();
const preview=voiceForm.querySelector('audio');assert(preview.src.startsWith('blob:voice-'));
assert.equal(voiceForm.querySelector('textarea').required,false);assert.equal(microphoneTracks.at(-1).stops,1);
voiceForm.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await flush();
assert.equal(voiceForm.querySelector('audio'),preview,'A lost acknowledgement retains the playable recording');
voiceForm.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await flush();
assert(!voiceForm.querySelector('audio'));assert(revokedVoiceUrls.includes(preview.src));
assert(root.querySelector('.support-chat-media audio'),'Received voice messages render an audio player');
mic.click();await flush();stop();
assert.equal(microphoneTracks.at(-1).stops,1,'Leaving the route releases the mic immediately');
globalThis.fetch=originalFetch;
await w.happyDOM.close();console.log('PASS grouped Support UI: one wrapped heading, combined topics, compact person header, history pages, original-case deletion, preserved composer and list scroll, edge back before Menu, scoped close and account cleanup.');
