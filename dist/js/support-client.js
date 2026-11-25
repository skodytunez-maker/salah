import{mountSupportUserDirectory}from './support-user-directory.js';
import{t,getLocale,subscribeLanguage,translateUi}from './i18n.js';
import{createOwnerCardHistory}from './owner-card-navigation.js';
import{uiLeaf,uiAttribute,uiMessage,setUiMessage}from './ui.js';
import{mountMessageEmojis,messageTextMarkup}from './message-emojis.js';
import{staffIcon}from './staff-markup.js';
import{claimPlayback,registerPlayback}from './media-playback-focus.js';
import{createSupportVoiceRecorder}from './support-voice-recorder.js';
import{mountOwnerSupportComposer,mountSupportChatView,mountSupportInboxActions,supportInboxMarkup,arrangeSupportInbox,supportInboxDate}from './support-chat-view.js';
import{createStaffAvatarManager}from './owner-team-avatars.js';
import{supportPhotoUrl}from './support-photo.js';
import{MAX_SUPPORT_VIDEO_BYTES,supportVideoMime,supportVoiceMime,supportMediaUrl,uploadSupportMedia}from './support-media.js';
import{saveSupportPhoto}from './support-photo-save.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const statuses={open:'supportUi.statusOpen',answered:'supportUi.statusAnswered',closed:'supportUi.statusClosed'};
const date=value=>Number.isFinite(Date.parse(value))?new Intl.DateTimeFormat(getLocale(),{dateStyle:'short',timeStyle:'short'}).format(new Date(value)):'';
function supportErrorMessage(error){
 const text=error?.message||'';
 if(text.includes('reply_unavailable'))return uiMessage('messageDeletionUi.replyUnavailable');
 if(text.includes('support_rate_limit'))return uiMessage('supportUi.rateLimit');
 if(text.includes('conversation_closed'))return uiMessage('supportUi.alreadyClosed');
 if(text.includes('conversation_full'))return uiMessage('supportUi.full');
 if(error?.code==='42501')return uiMessage('supportUi.unavailable');
 if(error?.code==='22023')return uiMessage('supportUi.invalid');
 return uiMessage('supportUi.failed');
}
export function supportError(error){const message=supportErrorMessage(error);return t(message.key,message.params);}
export function mountSupportPanel(root,{auth,app,version,owner=false,signInHref='#account',createDiagnostics,preparePhoto,recipientId=null,initialThreadId=null,enableNotifications,setTeamVisibility,loadSupportAvatar,loadOwnerUsers,onOpenProfile,resumeThread=null,groupConversations=false}={}){
 const grouped=app==='salah'&&groupConversations&&!!root.ownerDocument;let historyBefore=null,historyAround=null,listScroll=0;
 let emojiCleanup=null,chatView=null,inboxAvatars=null,inboxActions=null,userDirectory=null,openingConversation=null,threadPollBusy=false;const mutationAttempts=new Map();
 let view=null,disposed=false,revision=0,accountId=null,rows=[],filter=app,before=null,more=false,thread=null,threadData=null,draft={subject:'',body:'',id:null,diagnostics:'',photo:null},reply={body:'',id:null},locked=false,diagnostics=null,photoBusy=false,photoRevision=0,recipient=null;
 const draftPhotos=()=>draft.photos||(draft.photo?[draft.photo]:[]);
 const videoPlaybackOwner={};let activeSupportMedia=null,stopVideoFocus=null;
 const stopVideo=()=>{activeSupportMedia?.pause();activeSupportMedia=null;stopVideoFocus?.();stopVideoFocus=null;};
 const replyPhotos=()=>reply.photos||[];
 const hasVideoReplies=()=>grouped&&threadData?.videoReplies===true;
 const browser=root.ownerDocument?.defaultView;
 let voicePreview=null;
 const voiceBusy=()=>['requesting','recording','finishing'].includes(voiceRecorder.state);
 const hasVoiceReplies=()=>grouped&&threadData?.voiceReplies===true&&voiceRecorder.available;
 const voiceRecorder=createSupportVoiceRecorder({
  mediaDevices:browser?.navigator?.mediaDevices,Recorder:browser?.MediaRecorder,
  isActive:()=>!disposed&&root.isConnected&&view==='thread'&&root.querySelector('[data-support-reply]')&&!browser?.document?.hidden&&!locked,
  onState(state,details){
   paintVoiceControls();
   if(state==='recording'){
    if(details.seconds===0){activeSupportMedia?.pause();registerSupportMedia();claimPlayback(videoPlaybackOwner);}
    const time=Math.floor(details.seconds/60)+':'+String(details.seconds%60).padStart(2,'0');
    notice(uiMessage('lessonUi.workRecording',{time}));
   }else if(state==='requesting')notice(uiMessage('lessonUi.workAllowMicrophone'));
   else if(state==='error')notice(uiMessage(details==='denied'?'supportUi.voiceDenied':'lessonUi.workRecordInterrupted'),true);
   else if(state==='idle')notice('');
  },
  onRecorded(file){reply.voice=file;reply.id=null;paintReplyPhotos();notice(uiMessage('lessonUi.workRecordStopped'));}
 });
 function registerSupportMedia(){
  stopVideoFocus??=registerPlayback(videoPlaybackOwner,()=>{activeSupportMedia?.pause();voiceRecorder.cancel();});
 }
 function clearVoicePreview(){
  if(!voicePreview)return;
  if(activeSupportMedia===voicePreview.element){activeSupportMedia.pause();activeSupportMedia=null;}
  browser.URL.revokeObjectURL(voicePreview.url);voicePreview=null;
 }
 function releaseMedia(){voiceRecorder.cancel();clearVoicePreview();stopVideo();}
 const replyPhotoControls='<input type="file" accept="image/*" multiple data-support-reply-photo-input hidden><button type="button" class="text-button support-reply-photo-pick" data-support-reply-photo-pick '+uiAttribute('supportUi.attachPhotos',{},'aria-label')+'>'+staffIcon('wallpaper')+'</button><button type="button" class="text-button support-reply-photo-pick" data-support-voice-toggle hidden>'+staffIcon('mic')+'</button><button type="button" class="text-button support-reply-photo-pick" data-support-voice-cancel '+uiAttribute('common.cancel',{},'aria-label')+' hidden>'+staffIcon('close')+'</button><div class="support-reply-photo-list" data-support-reply-photos hidden></div>';
 const requests=new Set(),replyDrafts=new Map(),fieldPrefix='support-'+app+'-'+(owner?'owner':'user');
 // Native iPhone edge Back must consume the open conversation before the route.
 // Only an opaque marker is persisted; account IDs, messages and drafts stay in memory.
 const chatHistory=grouped?createOwnerCardHistory({win:root.ownerDocument.defaultView,key:'salahSupportConversation',isActive:()=>!disposed&&root.isConnected,dismiss:returnToInbox}):null;
 let returningToInbox=false;
 function returnToInbox(){if(disposed)return;const startingConversation=owner&&view==='new';revision++;historyBefore=historyAround=null;returningToInbox=true;try{listView();}finally{returningToInbox=false;}globalThis.window?.scrollTo?.({top:listScroll,behavior:'instant'});if(startingConversation)void loadList();}
 const live=id=>!disposed&&root.isConnected&&id===revision;
 function clearPrivateState(){releaseMedia();inboxActions?.dispose();inboxActions=null;userDirectory?.dispose();userDirectory=null;chatHistory?.reset();historyBefore=historyAround=null;listScroll=0;root.parentElement?.classList.remove('support-route-chat');root.removeAttribute?.('data-support-view');inboxAvatars?.dispose();inboxAvatars=null;root.classList?.remove('support-inbox-shell');chatView?.dispose();chatView=null;mutationAttempts.clear();emojiCleanup?.();emojiCleanup=null;view=null;recipient=null;revision++;photoRevision++;photoBusy=false;for(const request of requests)request.abort();rows=[];before=null;more=false;thread=threadData=null;draft={subject:'',body:'',id:null,diagnostics:'',photo:null};diagnostics?.dispose?.();diagnostics=null;reply={body:'',id:null};replyDrafts.clear();locked=false}
 async function rpc(name,args,{signal}={}){
  const controller=new AbortController();requests.add(controller);const timeout=setTimeout(()=>controller.abort(),['support_create_photo','support_create_photos','support_reply_photos'].includes(name)?75000:15000);
  const abort=()=>controller.abort();
  if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});
  try{if(controller.signal.aborted)throw new Error('support_cancelled');const result=await auth.rpc(name,args).abortSignal(controller.signal,{expectedActor:accountId});if(controller.signal.aborted)throw new Error('support_cancelled');if(result.error)throw result.error;return result.data}
  finally{signal?.removeEventListener('abort',abort);clearTimeout(timeout);requests.delete(controller)}
 }
 function notice(message,alert=false){const element=root.querySelector('[data-support-status]');if(element){setUiMessage(element,message);element.setAttribute('role',alert?'alert':'status')}}
 function shell(content){releaseMedia();inboxActions?.dispose();inboxActions=null;userDirectory?.dispose();userDirectory=null;openingConversation?.row?.removeAttribute('aria-busy');openingConversation=null;root.classList?.remove('support-inbox-shell');chatView?.dispose();chatView=null;emojiCleanup?.();emojiCleanup=null;root.innerHTML='<div class="support-panel"><div class="support-heading"><h2>'+ uiLeaf(owner?'supportUi.requests':'supportUi.support')+(owner?'<span class="support-state-dot" data-owner-support-status hidden></span>':'<span class="support-state-dot" data-user-support-status hidden></span>')+'</h2>'+'</div>'+(accountId&&enableNotifications?'<button type="button" class="text-button" data-support-enable-notifications>'+uiLeaf('supportUi.notifyReplies')+'</button>':'')+'<p data-support-status role="status" aria-live="polite"></p>'+content+'</div>';emojiCleanup=mountMessageEmojis(root);const select=root.querySelector('#support-app');if(select){select.value=filter;select.onchange=()=>{filter=select.value;void loadList()}}globalThis.window?.dispatchEvent?.(new Event('salah:support-status-refresh'));}
 function hydrateSupportAvatars(){if(!owner||!loadSupportAvatar||!root.ownerDocument)return;if(!inboxAvatars){const avatarActor=accountId;inboxAvatars=createStaffAvatarManager({load:loadSupportAvatar,doc:root.ownerDocument,isActive:()=>!disposed&&accountId===avatarActor&&(['list','thread'].includes(view)||view==='new'&&grouped&&!!chatView)});}void inboxAvatars.hydrate(root);}
 function listView(){
  if(!returningToInbox)chatHistory?.reset();view='list';root.setAttribute?.('data-support-view','list');root.parentElement?.classList.remove('support-route-chat');recipient=null;thread=threadData=null;reply={body:'',id:null};if(app==='salah'&&root.ownerDocument){const users=grouped&&owner&&!!accountId&&typeof loadOwnerUsers==='function';shell(supportInboxMarkup(rows,{owner,more,users}));arrangeSupportInbox(root);
   if(grouped&&owner&&accountId){const actor=accountId;
    inboxActions=mountSupportInboxActions(root,{getRow:id=>rows.find(row=>row.id===id),onClear:clearInboxChat,
     isActive:()=>!disposed&&!locked&&!openingConversation&&root.isConnected&&view==='list'&&accountId===actor});
   }
   if(users){const actor=accountId;userDirectory=mountSupportUserDirectory(root,{
    loadPage:(page,{signal})=>loadOwnerUsers(page,{expectedActor:actor,signal}),loadChatContacts,onChoose:openDirectoryUser,onRender:hydrateSupportAvatars,
    isActive:()=>!disposed&&root.isConnected&&view==='list'&&accountId===actor
   });}
   hydrateSupportAvatars();return;}shell('<div class="support-actions">'+(!owner?'<button type="button" class="button" data-support-new>'+uiLeaf('supportUi.new')+'</button>':'')+'<button type="button" class="button secondary" data-support-refresh>'+uiLeaf('settingsExtra.update')+'</button></div>'+(rows.length?'<div class="support-list">'+rows.map(row=>'<button type="button" class="support-thread" data-support-thread="'+esc(row.id)+'"><strong>'+esc(row.subject)+'</strong><span>'+(statuses[row.status]?uiLeaf(statuses[row.status]):'')+'</span>'+(owner&&row.owner_unread?'<span class="support-new-badge">'+uiLeaf('supportUi.newBadge')+'</span>':!owner&&row.user_unread?'<span class="support-new-badge is-user-reply">'+uiLeaf('supportUi.replyBadge')+'</span>':'')+(!owner&&row.last_reply?'<span class="support-reply-preview">'+esc(row.last_reply)+'</span>':'')+'<small>'+(owner?esc(row.app.toUpperCase())+' · '+(row.nickname?esc(row.nickname):uiLeaf('supportUi.noNickname'))+' · ':'')+'<time data-support-date datetime="'+esc(row.updated_at)+'">'+esc(date(row.updated_at))+'</time>'+'</small></button>').join('')+'</div>':'<p class="muted support-empty">'+uiLeaf(owner?'supportUi.emptyOwner':'supportUi.emptyUser')+'</p>')+(more?'<button type="button" class="text-button" data-support-more>'+uiLeaf('supportUi.earlier')+'</button>':''));
 }
 async function loadList(append=false,{silent=false}={}){
  const id=++revision,previousRows=JSON.stringify(rows),previousUnread=new Set(rows.filter(row=>owner?row.owner_unread:row.user_unread).map(row=>row.id));
  if(!silent){view='loading';shell('<p class="muted">'+uiLeaf('supportUi.loading')+'</p>');}
  try{const response=await rpc(grouped?'support_conversation_request':'support_list',grouped?{p_app:app,p_owner:owner,p_action:'list',p_args:{before:append?before:null}}:{p_app:filter,p_owner:owner,p_before:append?before:null});if(!live(id)||silent&&(inboxActions?.isOpen()||userDirectory?.isOpen()))return;const data=grouped?response?.rows:response;if(!Array.isArray(data))throw Error();more=grouped?!!response.next:data.length===50;rows=append?[...new Map([...rows,...data].map(r=>[grouped?r.conversation_id:r.id,r])).values()]:data;before=grouped?response.next:data.at(-1)?.updated_at||null;const fresh=!append?rows.filter(row=>(owner?row.owner_unread:row.user_unread)&&!previousUnread.has(row.id)):[];if(!silent||JSON.stringify(rows)!==previousRows)listView();if(fresh.length)notice(uiMessage(owner?'supportUi.newRequestNotice':'supportUi.newReplyNotice',{subject:fresh[0].subject}))}
  catch(error){if(live(id)){if(!silent)listView();notice(supportErrorMessage(error),true)}}
 }
 async function findChatContacts({signal,stopAt}={}){
  const contacts=new Map(rows.map(row=>[row.conversation_id,row.id]));
  let cursor=before;
  const seen=new Set();
  while(cursor&&(!stopAt||!contacts.has(stopAt))){
   const key=JSON.stringify(cursor);
   if(seen.has(key))throw Error('Invalid conversations cursor');
   seen.add(key);
   const result=await rpc('support_conversation_request',{p_app:app,p_owner:true,p_action:'list',p_args:{before:cursor}},{signal});
   if(!Array.isArray(result?.rows))throw Error('Invalid conversations page');
   for(const row of result.rows)contacts.set(row.conversation_id,row.id);
   cursor=result.next;
  }
  return contacts;
 }
 const loadChatContacts=async options=>new Set((await findChatContacts(options)).keys());
 async function openDirectoryUser(userId,{signal}={}){
  if(!owner||!grouped||!userDirectory?.isOpen()||!accountId)return false;
  const id=++revision;
  const contacts=await findChatContacts({signal,stopAt:userId}),threadId=contacts.get(userId);
  if(!live(id)||signal?.aborted||!userDirectory?.isOpen())return false;
  return threadId?readThread(threadId):loadRecipient(userId,{keepDirectory:true});
 }
 async function loadRecipient(target=recipientId,{keepDirectory=false}={}){
  const id=++revision;
  if(!keepDirectory){view='loading';shell('<p class="muted">'+uiLeaf('supportUi.openingMessage')+'</p>');}
  try{
   const data=await rpc('support_owner_recipient',{p_user:target,p_app:app});
   if(!live(id)||keepDirectory&&!userDirectory?.isOpen())return false;
   if(!data||data.id!==target||typeof data.nickname!=='string')throw Error();
   recipient=data;draft.subject=t('supportUi.defaultSubject',{app:app.toUpperCase()});newView();return true;
  }catch(error){
   if(live(id)&&!keepDirectory){shell('<button type="button" class="button secondary" data-support-recipient-retry>'+uiLeaf('common.retry')+'</button><button type="button" class="text-button" data-support-back>'+uiLeaf('supportUi.allRequests')+'</button>');notice(supportErrorMessage(error),true);}
   return false;
  }
 }
 function newView(){
  if(owner){
   if(!recipient)return;
   if(grouped){
    revision++;view='new';root.setAttribute('data-support-view','new');root.parentElement?.classList.add('support-route-chat');thread=threadData=null;chatHistory.open();
    const nickname=esc(recipient.nickname),initials=esc(Array.from(recipient.nickname.trim()||'?').slice(0,2).join('').toLocaleUpperCase(getLocale()));
    const header='<div class="support-actions support-chat-header"><button type="button" class="text-button support-chat-back" data-support-back '+uiAttribute('supportUi.allRequests',{},'aria-label')+'>‹</button><span class="support-inbox-avatar support-person-avatar" data-member-avatar="'+esc(recipient.id)+'" aria-hidden="true">'+initials+'</span><div class="support-chat-person"><strong dir="auto">'+nickname+'</strong></div></div>';
    const form='<form data-support-create data-support-owner-compose><label class="support-owner-topic"><span>'+uiLeaf('supportUi.subject')+'</span><input name="subject" maxlength="120" required dir="auto" value="'+esc(draft.subject)+'"></label><label for="'+fieldPrefix+'-body">'+uiLeaf('supportUi.message')+'</label><textarea id="'+fieldPrefix+'-body" name="body" maxlength="3000" rows="1" dir="auto" required>'+esc(draft.body)+'</textarea><button type="submit" class="button">'+uiLeaf('supportUi.send')+'</button></form>';
    shell(header+'<div class="support-owner-compose-space" aria-hidden="true"></div><div class="support-chat-footer">'+form+'</div>');
    const composeRecipient=recipient,composeActor=accountId;
    chatView=mountOwnerSupportComposer(root,{recipient:composeRecipient,actorId:composeActor,isActive:()=>!disposed&&root.isConnected&&view==='new'&&recipient===composeRecipient&&accountId===composeActor});
    hydrateSupportAvatars();
    return;
   }
   revision++;view='new';root.setAttribute?.('data-support-view','new');root.parentElement?.classList.remove('support-route-chat');thread=threadData=null;shell('<button type="button" class="text-button" data-support-back>'+uiLeaf('supportUi.allRequests')+'</button><h3 class="support-recipient">'+esc(recipient.nickname)+'</h3><form data-support-create><label for="'+fieldPrefix+'-subject">'+uiLeaf('supportUi.subject')+'</label><input id="'+fieldPrefix+'-subject" name="subject" maxlength="120" required value="'+esc(draft.subject)+'"><label for="'+fieldPrefix+'-body">'+uiLeaf('supportUi.message')+'</label><textarea id="'+fieldPrefix+'-body" name="body" maxlength="3000" rows="6" required>'+esc(draft.body)+'</textarea><button type="submit" class="button">'+uiLeaf('supportUi.send')+'</button></form>');
   return;
  }
  revision++;view='new';root.setAttribute?.('data-support-view','new');root.parentElement?.classList.remove('support-route-chat');thread=threadData=null;shell('<button type="button" class="text-button" data-support-back>'+uiLeaf('supportUi.myRequests')+'</button><form data-support-create><label for="'+fieldPrefix+'-subject">'+uiLeaf('supportUi.subject')+'</label><input id="'+fieldPrefix+'-subject" name="subject" maxlength="120" required value="'+esc(draft.subject)+'"><label for="'+fieldPrefix+'-body">'+uiLeaf('supportUi.message')+'</label><textarea id="'+fieldPrefix+'-body" name="body" maxlength="3000" rows="6" required>'+esc(draft.body)+'</textarea><p class="muted support-note">'+uiLeaf('supportUi.passwordWarning')+'</p><button type="button" class="support-diagnostics" data-support-diagnostics aria-pressed="'+Boolean(draft.diagnostics)+'">'+uiLeaf('supportUi.attachDiagnostics')+'</button><p class="muted support-note">'+uiLeaf('supportUi.diagnosticsNote')+'</p><pre class="support-diagnostic-preview" data-support-diagnostic-preview'+(draft.diagnostics?'':' hidden')+'>'+esc(draft.diagnostics)+'</pre><input type="file" accept="image/*" multiple id="'+fieldPrefix+'-photo" data-support-photo-input hidden><button type="button" class="button secondary" data-support-photo-pick>'+uiLeaf('supportUi.attachPhotos')+'</button>'+draftPhotos().map((photo,i)=>'<div class="support-photo-preview"><img src="'+esc(photo.preview)+'" '+uiAttribute('supportUi.attachedPhoto',{number:i+1},'alt')+'><button type="button" class="text-button" data-support-photo-remove="'+i+'">'+uiLeaf('supportUi.removePhoto')+'</button></div>').join('')+'<button type="submit" class="button">'+uiLeaf('supportUi.send')+'</button></form>');
 }
 function photoMarkup(data,messageId){
  const photos=Array.isArray(data.photos)?data.photos.filter(item=>item.message_id===messageId):[];
  return photos.map(photo=>{if(photo?.unavailable)return '<p class="muted support-note">'+uiLeaf('supportUi.photoUnavailable')+'</p>';
   const url=supportPhotoUrl(photo?.url);return url?'<div class="support-photo-item"><a class="support-photo"'+(grouped?' data-support-photo-frame':'')+' href="'+esc(url)+'" target="_blank" rel="noreferrer"><img src="'+esc(url)+'" referrerpolicy="no-referrer" '+uiAttribute('supportUi.photoLabel',{},'alt')+'></a><button type="button" class="button secondary" data-support-photo-save="'+esc(url)+'">'+uiLeaf('supportUi.savePhoto')+'</button></div>':'';}).join('')+(data.media||[]).filter(video=>video.message_id===messageId).map(video=>{
   const voice=!!supportVoiceMime(video.mime),url=supportMediaUrl(video.url);
   if(!url)return '<p class="muted support-note">'+uiLeaf(voice?'supportUi.voiceUnavailable':'supportUi.videoUnavailable')+'</p>';
   const player=voice?'<audio controls preload="none" hidden></audio>':'<video controls playsinline preload="none" hidden></video>';
   return '<div class="support-chat-media"><button type="button" class="button secondary" data-support-media-play="'+esc(url)+'">'+uiLeaf(voice?'lessonUi.workVoice':'quranUi.broadcastVideo')+'</button>'+player+'</div>';
  }).join('');
 }
 function threadStatusKey(value){return owner&&value.awaiting_owner===true?'supportConversationUi.awaiting':statuses[value.status];}
 function closedThreadMarkup(data){if(app!=='salah'||typeof data.visibilityVersion!=='string')return '<p class="muted">'+uiLeaf('supportUi.closedNote')+'</p>';return '<div class="support-case-closed"><p class="muted">'+uiLeaf(owner?'supportUi.closedNote':'supportConversationUi.closed')+'</p><div class="support-actions">'+(data.thread.can_reopen===true?'<button type="button" class="button" data-support-reopen>'+uiLeaf('supportConversationUi.reopen')+'</button>':'')+(!owner?'<button type="button" class="button secondary" data-support-new>'+uiLeaf('supportUi.new')+'</button>':'')+'</div></div>';}
 function threadView(data){
  if(grouped){root.setAttribute?.('data-support-view','thread');root.parentElement?.classList.add('support-route-chat');rows=rows.map(r=>r.conversation_id===data.conversationId?{...r,owner_unread:owner?data.unread===true:r.owner_unread,user_unread:!owner?data.unread===true:r.user_unread,awaiting_owner:data.thread.awaiting_owner,status:data.thread.status,...(!data.historyBefore?{last_message:data.messages.at(-1)?.body??null,last_message_at:data.messages.at(-1)?.created_at??null}:{})}:r);}
  if(chatView&&(grouped?threadData?.conversationId===data.conversationId:thread?.id===data.thread.id)&&(thread.status==='closed')===(data.thread.status==='closed')&&typeof data.visibilityVersion==='string'){thread=data.thread;threadData=data;const status=root.querySelector('[data-support-thread-status]');if(status){status.innerHTML=threadStatusKey(thread)?uiLeaf(threadStatusKey(thread)):'';status.dataset.awaiting=String(owner&&thread.awaiting_owner===true);}chatView.render(data);if(reply.replyTo&&!data.messages.some(m=>m.id===reply.replyTo)){reply.replyTo=null;reply.id=null;}paintReplyQuote();globalThis.window?.dispatchEvent?.(new Event('salah:support-status-refresh'));return;}

  if(view!=='thread')chatHistory?.open();view='thread';thread=data.thread;threadData=data;reply=replyDrafts.get(thread.id)||{body:'',id:null};replyDrafts.set(thread.id,reply);shell('<div class="support-actions"><button type="button" class="text-button" data-support-back>'+uiLeaf('supportUi.allRequests')+'</button><button type="button" class="text-button" data-support-reload>'+uiLeaf('settingsExtra.update')+'</button>'+((owner&&app==='salah'&&setTeamVisibility)?'<button type="button" class="text-button" data-support-team>'+uiLeaf(thread.team_visible?'supportUi.privateAgain':'supportUi.shareTeam')+'</button>':'')+'</div><h3>'+esc(thread.subject)+'</h3><p class="muted support-note"><span data-support-thread-status data-awaiting="'+Boolean(owner&&thread.awaiting_owner)+'">'+(threadStatusKey(thread)?uiLeaf(threadStatusKey(thread)):'')+'</span>'+' · '+esc(thread.app.toUpperCase())+' '+esc(thread.version)+(owner?' · '+(thread.nickname?esc(thread.nickname):uiLeaf('supportUi.noNickname')):'')+'</p><div class="support-messages">'+data.messages.map(message=>'<article class="support-message'+(message.owner_reply?' is-answer':'')+'"><div><strong>'+(message.owner_reply?uiLeaf('supportUi.supportReply'):owner?(thread.nickname?esc(thread.nickname):uiLeaf('supportUi.user')):uiLeaf('supportUi.you'))+'</strong><time data-support-date datetime="'+esc(message.created_at)+'">'+esc(date(message.created_at))+'</time></div><p>'+messageTextMarkup(message.body)+'</p>'+photoMarkup(data,message.id)+'</article>').join('')+'</div>'+(thread.status==='closed'?closedThreadMarkup(data):'<form data-support-reply>'+(grouped&&preparePhoto?replyPhotoControls:'')+'<label for="'+fieldPrefix+'-reply">'+uiLeaf(owner?'supportUi.replyLabel':'supportUi.addDetails')+'</label><textarea id="'+fieldPrefix+'-reply" name="body" maxlength="3000" rows="4" required>'+esc(reply.body)+'</textarea><button type="submit" class="button">'+uiLeaf(owner?'supportUi.reply':'supportUi.send')+'</button></form>'+(owner?'<button type="button" class="text-button support-close" data-support-close>'+uiLeaf(app==='salah'&&typeof data.visibilityVersion==='string'?'supportConversationUi.end':'supportUi.close')+'</button>':'')));
  if(app==='salah'&&typeof data.visibilityVersion==='string'&&root.ownerDocument){chatView=mountSupportChatView(root,{data,actorId:accountId,owner,photoMarkup,setSharedTheme:grouped?(theme,signal)=>rpc('support_conversation_theme',{p_app:app,p_thread:data.anchorId||data.thread.id,p_owner:owner,p_theme:theme},{signal}):null,onOpenProfile:owner?onOpenProfile:null,isActive:()=>!disposed&&view==='thread'&&(grouped?threadData?.conversationId===data.conversationId:thread?.id===data.thread.id),onReply:message=>{if(locked||(message.thread_status||thread.status)==='closed')return;reply.replyTo=message.id;reply.id=null;paintReplyQuote();root.querySelector('[data-support-reply] textarea')?.focus({preventScroll:true});},onSource:grouped?(messageId=>{historyBefore=null;historyAround=messageId;void readThread(threadData.anchorId||thread.id).then(ok=>{if(ok)chatView?.jumpToSource(messageId);});}):null,onDelete:(message,scope)=>void mutateChat('delete',scope,message),onClear:(_room,scope)=>void mutateChat('clear',scope),onNotice:(key,alert=false)=>notice(uiMessage(key),alert)});hydrateSupportAvatars();paintReplyQuote();paintReplyPhotos();}
 }
 async function readThread(threadId){
  const keepInbox=grouped&&view==='list';
  if(keepInbox&&openingConversation?.threadId===threadId)return false;
  const previous=(threadData?.thread.id===threadId||grouped&&threadData?.anchorId===threadId)?threadData:null,id=++revision;
  let opening=null;
  if(keepInbox){
   openingConversation?.row?.removeAttribute('aria-busy');
   const row=[...root.querySelectorAll('[data-support-thread]')].find(item=>item.dataset.supportThread===threadId);
   row?.setAttribute('aria-busy','true');
   opening={threadId,row};openingConversation=opening;
  }else if(!previous||!chatView)shell('<p class="muted">'+uiLeaf('supportUi.loadingThread')+'</p>');
  try{
   const data=await rpc(grouped?'support_conversation_request':'support_read',grouped?{p_app:app,p_owner:owner,p_action:'read',p_args:{threadId,before:historyBefore,...(historyAround?{around:historyAround}:{})}}:{p_id:threadId,p_app:app,p_owner:owner});
   if(!live(id))return false;
   if(grouped&&historyAround&&!data.messages?.some(m=>m.id===historyAround))throw Error('source_not_loaded');
   if(grouped)data.historyBefore=historyBefore||(historyAround?{around:historyAround}:null);
   threadView(data);return true;
  }catch(error){
   if(live(id)){
    if(app==='salah'&&error.code==='42501'){clearPrivateState();rows=[];listView();}
    else if(previous)threadView(previous);
    else if(!keepInbox)listView();
    notice(supportErrorMessage(error),true);
   }
   return false;
  }finally{
   if(opening&&openingConversation===opening){opening.row?.removeAttribute('aria-busy');openingConversation=null;}
  }
 }

 async function sendReplyMedia(outgoing,threadId,valid){
  const file=outgoing.voice||outgoing.video,mime=outgoing.voice?supportVoiceMime(file):supportVideoMime(file);
  const base={p_app:app,p_owner:owner,p_thread:threadId,p_id:outgoing.id};
  notice(uiMessage(outgoing.voice?'supportUi.sending':'supportUi.videoSending'));
  const start=await rpc('support_reply_media_start',{...base,p_mime:mime,p_bytes:file.size});
  if(!valid())return null;
  if(start?.uploaded!==true){
   const upload=new AbortController();requests.add(upload);
   const timeout=setTimeout(()=>upload.abort(),120000);
   try{await uploadSupportMedia(start?.uploadUrl,file,mime,{signal:upload.signal});}
   finally{clearTimeout(timeout);requests.delete(upload);}
  }
  if(!valid())return null;
  return rpc('support_reply_media_finish',{...base,p_body:outgoing.body,p_reply_to:outgoing.replyTo||null});
 }
 function paintVoiceControls(){
  const form=root.querySelector('[data-support-reply]'),toggle=form?.querySelector('[data-support-voice-toggle]');
  if(!toggle)return;
  const cancel=form.querySelector('[data-support-voice-cancel]'),status=voiceRecorder.state;
  const recording=status==='recording',busy=voiceBusy();
  toggle.hidden=!hasVoiceReplies()||status==='requesting'||status==='finishing'||!!reply.voice;
  const label=recording?'lessonUi.workStopRecording':'lessonUi.workRecordVoice';
  toggle.setAttribute('aria-label',t(label));toggle.setAttribute('data-i18n-aria-label',label);
  toggle.setAttribute('aria-pressed',String(recording));cancel.hidden=!busy;
  const submit=form.querySelector('[type=submit]'),picker=form.querySelector('[data-support-reply-photo-pick]');
  if(submit)submit.disabled=busy||photoBusy||!!locked;
  if(picker)picker.disabled=busy||!!locked;
 }
 function paintReplyPhotos(){
  const form=root.querySelector('[data-support-reply]'),list=form?.querySelector('[data-support-reply-photos]');
  if(!list)return;
  const picker=form.querySelector('[data-support-reply-photo-pick]'),inputRow=form.querySelector('.salah-message-input-row');
  if(inputRow)for(const control of [picker,form.querySelector('[data-support-voice-toggle]'),form.querySelector('[data-support-voice-cancel]')])if(control&&control.parentElement!==inputRow)inputRow.append(control);
  clearVoicePreview();
  const photos=replyPhotos(),video=reply.video;
  form.querySelector('[data-support-reply-photo-input]').accept=hasVideoReplies()?'image/*,video/mp4,video/quicktime,.mp4,.mov':'image/*';
  if(hasVideoReplies()&&picker){picker.setAttribute('aria-label',t('staffUi.chatAttach'));picker.setAttribute('data-i18n-aria-label','staffUi.chatAttach');}
  list.hidden=!photos.length&&!video&&!reply.voice;form.elements.body.required=list.hidden;
  list.innerHTML=photos.map((photo,index)=>'<div class="support-photo-preview"><img src="'+esc(photo.preview)+'" '+uiAttribute('supportUi.attachedPhoto',{number:index+1},'alt')+'><button type="button" class="text-button" data-support-reply-photo-remove="'+index+'">'+uiLeaf('supportUi.removePhoto')+'</button></div>').join('')+(video?'<div class="support-reply-video-draft"><span>'+uiLeaf('player.video')+'</span><button type="button" class="text-button" data-support-reply-video-remove>'+uiLeaf('common.cancel')+'</button></div>':'')+(reply.voice?'<div class="support-reply-video-draft"><audio controls preload="metadata"></audio><button type="button" class="text-button" data-support-reply-voice-remove>'+uiLeaf('common.cancel')+'</button></div>':'');
  const audio=list.querySelector('audio');if(audio){
   const url=browser.URL.createObjectURL(reply.voice);voicePreview={url,element:audio};audio.src=url;
   audio.onplay=()=>{if(voiceBusy()){audio.pause();return;}if(activeSupportMedia!==audio)activeSupportMedia?.pause();activeSupportMedia=audio;registerSupportMedia();claimPlayback(videoPlaybackOwner);};
  }
  paintVoiceControls();
 }
 async function pickReplyPhotos(input){
  if(!grouped||!preparePhoto||locked||photoBusy||disposed||view!=='thread')return;
  const files=Array.from(input.files||[]);input.value='';if(!files.length||voiceBusy())return;
  if(reply.voice){notice(uiMessage('supportUi.voiceSeparate'),true);return;}
  const selectedVideo=files.find(file=>supportVideoMime(file)||file.type?.startsWith('video/'));
  if(selectedVideo){
   if(!hasVideoReplies()||!supportVideoMime(selectedVideo)||selectedVideo.size<16||selectedVideo.size>MAX_SUPPORT_VIDEO_BYTES){notice(uiMessage('supportUi.videoLimit'),true);return;}
   if(files.length!==1||reply.video||replyPhotos().length){notice(uiMessage('supportUi.videoSeparate'),true);return;}
   reply.video=selectedVideo;reply.id=null;paintReplyPhotos();notice('');return;
  }
  if(reply.video){notice(uiMessage('supportUi.videoSeparate'),true);return;}
  if(replyPhotos().length+files.length>5){notice(uiMessage('supportUi.photoLimit'),true);return;}
  const edited=reply,task=++photoRevision;photoBusy=true;
  const submit=input.closest('form')?.querySelector('button[type="submit"]');
  if(submit)submit.disabled=true;
  const sameDraft=()=>!disposed&&reply===edited&&view==='thread'&&photoRevision===task;
  notice(uiMessage('supportUi.preparingPhoto'));
  try{
   const prepared=[];
   for(const file of files){prepared.push(await preparePhoto(file));if(!sameDraft())return;}
   reply.photos=[...replyPhotos(),...prepared];reply.id=null;paintReplyPhotos();notice(uiMessage('supportUi.photosAttached',{count:reply.photos.length}));
  }catch(error){if(sameDraft())notice(error.uiMessage||uiMessage('supportUi.photoFailed'),true);}
  finally{if(photoRevision===task){photoBusy=false;if(submit?.isConnected&&!locked)submit.disabled=false;}}
 }
 function paintReplyQuote(){const form=root.querySelector('[data-support-reply]');if(!form)return;let bar=form.querySelector('[data-support-reply-quote]');if(!bar){bar=root.ownerDocument.createElement('div');bar.dataset.supportReplyQuote='';bar.className='support-composer-reply';form.prepend(bar);}const selected=threadData?.messages.find(m=>m.id===reply.replyTo);if(reply.replyTo&&!selected){reply.replyTo=null;reply.id=null;}bar.hidden=!selected;bar.innerHTML=selected?'<div><strong>'+uiLeaf('messageDeletionUi.replyingTo',{name:selected.owner_reply?t('supportUi.supportReply'):owner?(thread.nickname||t('supportUi.user')):t('supportUi.you')})+'</strong><span>'+esc(selected.body.slice(0,180))+'</span></div><button type="button" data-support-cancel-reply '+uiAttribute('messageDeletionUi.cancelReply',{},'aria-label')+'>×</button>':'';}
 async function mutateChat(action,scope,message){
  if(locked||disposed||!thread||!chatView||!['self','everyone'].includes(scope))return;
  if(action==='delete'&&scope==='everyone'&&message.author_id!==accountId)return;
  if((action==='clear'||scope==='everyone')&&!globalThis.window?.confirm?.(t(action==='clear'?(scope==='self'?'messageDeletionUi.confirmClearSelf':'messageDeletionUi.confirmClearEveryone'):'messageDeletionUi.confirmEveryone')))return;
  const initiatingActor=accountId,anchor=threadData?.anchorId||thread.id,conversation=threadData?.conversationId,id=grouped?(action==='clear'?anchor:message.thread_id||thread.id):thread.id,key=id+':'+action+':'+scope+':'+(message?.id||'');
  const current=()=>grouped?threadData?.conversationId===conversation:thread?.id===id;
  let operationId=mutationAttempts.get(key);if(!operationId){operationId=crypto.randomUUID();mutationAttempts.set(key,operationId);}revision++;
  await run(async valid=>{notice(uiMessage(action==='clear'?'messageDeletionUi.clearPending':'messageDeletionUi.pending'));
   const ack=await rpc(grouped&&action==='clear'?'support_conversation_request':'support_chat_request',{p_app:app,p_owner:owner,p_action:action,p_args:{threadId:id,scope,operationId,...(message?{messageId:message.id}:{})}});
   if(!valid()||!current())return;if(ack?.ok!==true||ack.threadId!==id||ack.scope!==scope||ack.operationId!==operationId||typeof ack.visibilityVersion!=='string'||message&&ack.messageId!==message.id)throw Error('invalid_ack');mutationAttempts.delete(key);
   threadData={...threadData,thread:action==='clear'?{...threadData.thread,receipt_visible:false}:threadData.thread,messages:action==='clear'?[]:threadData.messages.filter(m=>m.id!==message.id).map(m=>m.reply?.id===message.id?{...m,reply:{available:false}}:m),photos:action==='clear'?[]:(threadData.photos||[]).filter(p=>p.message_id!==message.id),visibilityVersion:ack.visibilityVersion};
   if(action==='clear'||reply.replyTo===message?.id){reply.replyTo=null;reply.id=null;}
   rows=action==='clear'?rows.filter(r=>grouped?r.conversation_id!==conversation:r.id!==id):rows.map(r=>(grouped?r.conversation_id===conversation:r.id===id)?{...r,last_reply:null,last_message:null,last_message_at:null}:r);chatView.render(threadData);paintReplyQuote();await readThread(anchor);
   if(!disposed&&accountId===initiatingActor&&current())notice(uiMessage(action==='clear'?(scope==='self'?'messageDeletionUi.clearedSelf':'messageDeletionUi.clearedEveryone'):(scope==='self'?'messageDeletionUi.removedSelf':'messageDeletionUi.removedEveryone')));
  });
 }

 async function clearInboxChat(threadId){
  const row=rows.find(item=>item.id===threadId);
  if(!owner||!grouped||!accountId||view!=='list'||openingConversation||!row)return;
  const key=threadId+':clear:self:',operationId=mutationAttempts.get(key)||crypto.randomUUID();
  mutationAttempts.set(key,operationId);revision++;
  await run(async valid=>{
   notice(uiMessage('messageDeletionUi.clearPending'));
   const ack=await rpc('support_conversation_request',{p_app:app,p_owner:true,p_action:'clear',p_args:{threadId,scope:'self',operationId}});
   if(!valid())return;
   if(ack?.ok!==true||ack.threadId!==threadId||ack.scope!=='self'||ack.operationId!==operationId||typeof ack.visibilityVersion!=='string')throw Error('invalid_ack');
   mutationAttempts.delete(key);rows=rows.filter(item=>item.conversation_id!==row.conversation_id);listView();
   notice(uiMessage('messageDeletionUi.clearedSelf'));
  });
 }
 async function changeCase(action){
  if(locked||disposed||app!=='salah'||!thread||!['reopen','close'].includes(action))return;
  if(action==='reopen'&&(thread.status!=='closed'||thread.can_reopen!==true)||action==='close'&&(!owner||!chatView||thread.status==='closed'))return;
  const anchor=threadData?.anchorId||thread.id,id=grouped&&action==='close'?anchor:thread.id,actor=accountId,key=id+':'+action;let operationId=mutationAttempts.get(key);if(!operationId){operationId=crypto.randomUUID();mutationAttempts.set(key,operationId);}revision++;
  await run(async valid=>{notice(uiMessage(action==='reopen'?'supportConversationUi.reopening':'supportConversationUi.closing'));const ack=await rpc(grouped&&action==='close'?'support_conversation_request':'support_chat_request',{p_app:app,p_owner:owner,p_action:action,p_args:{threadId:id,operationId}});if(!valid())return;
   if(ack?.ok!==true||ack.threadId!==id||ack.operationId!==operationId||!(grouped&&action==='close')&&!['open','answered','closed'].includes(ack.status))throw Error('invalid_ack');mutationAttempts.delete(key);
   if(await readThread(anchor)&&!disposed&&accountId===actor)notice(uiMessage(thread.status==='closed'?(owner?'supportUi.statusClosed':'supportConversationUi.closed'):'supportConversationUi.reopened'));
  });
 }

 async function run(task){if(locked)return;const lock={};locked=lock;const id=revision;root.querySelectorAll('button,input,textarea,select').forEach(c=>c.disabled=true);notice(uiMessage('supportUi.sending'));try{await task(()=>live(id))}catch(error){if(live(id))notice(supportErrorMessage(error),true)}finally{if(locked===lock){locked=false;if(!disposed)root.querySelectorAll('button,input,textarea,select').forEach(c=>c.disabled=false)}}}
 async function account(){
  clearPrivateState();accountId=null;const id=revision;shell('<p class="muted">'+uiLeaf('accountUi.checkingSignIn')+'</p>');
  try{const {data,error}=await auth.auth.getSession();if(!live(id))return;if(error)throw error;accountId=data.session?.user?.id||null;
   if(!accountId){shell('<p class="muted">'+uiLeaf('supportUi.signInNote')+'</p><a class="button" href="'+esc(signInHref)+'">'+uiLeaf('supportUi.signIn')+'</a>');return}const saved=resumeThread;resumeThread=null;if(saved&&saved.actorId===accountId&&saved.owner===owner&&grouped&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(saved.threadId||'')){historyBefore=saved.historyBefore;historyAround=saved.historyAround;listScroll=saved.listScroll||0;rows=saved.rows||[];before=saved.before||null;more=!!saved.more;for(const [key,value]of saved.replyDrafts)replyDrafts.set(key,{...value});await readThread(saved.threadId);}else if(owner&&recipientId)await loadRecipient();else if(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(initialThreadId||''))await readThread(initialThreadId);else await loadList();
  }catch(error){if(live(id))notice(supportErrorMessage(error),true)}
 }
 root.onclick=event=>{
  if(locked||disposed)return;const button=event.target.closest('button');if(!button||!root.contains(button))return;
  if(button.hasAttribute('data-support-enable-notifications')){const id=revision;button.disabled=true;void Promise.resolve(enableNotifications?.()).then(result=>{if(live(id))notice(result?.ready?uiMessage('supportUi.notificationsEnabled'):result?.uiMessage||result?.message||uiMessage('supportUi.notificationsFailed'),!result?.ready)}).catch(()=>{if(live(id))notice(uiMessage('supportUi.notificationsFailed'),true)}).finally(()=>{if(live(id))button.disabled=false})}
  else if(button.hasAttribute('data-support-diagnostics')){
   if(draft.diagnostics){draft.diagnostics='';diagnostics?.dispose?.();diagnostics=null;button.setAttribute('aria-pressed','false');const preview=root.querySelector('[data-support-diagnostic-preview]');if(preview){preview.textContent='';preview.hidden=true}}
   else{diagnostics=createDiagnostics?.()||null;draft.diagnostics=diagnostics?.snapshot?.()||'Версия SALAH: '+String(version||'неизвестна').slice(0,12);button.setAttribute('aria-pressed','true');const preview=root.querySelector('[data-support-diagnostic-preview]');if(preview){preview.textContent=draft.diagnostics;preview.hidden=false}}
  }
  else if(button.hasAttribute('data-support-reply-photo-pick'))button.closest('form')?.querySelector('[data-support-reply-photo-input]')?.click();
  else if(button.hasAttribute('data-support-voice-toggle')){
   if(!hasVoiceReplies())return;
   if(voiceRecorder.state==='recording'){voiceRecorder.stop();return;}
   if(replyPhotos().length||reply.video||reply.voice||photoBusy){notice(uiMessage('supportUi.voiceSeparate'),true);return;}
   void voiceRecorder.start();
  }
  else if(button.hasAttribute('data-support-voice-cancel'))voiceRecorder.cancel();
  else if(button.hasAttribute('data-support-reply-voice-remove')){reply.voice=null;reply.id=null;paintReplyPhotos();notice('');}
  else if(button.hasAttribute('data-support-reply-video-remove')){reply.video=null;reply.id=null;paintReplyPhotos();}
  else if(button.hasAttribute('data-support-media-play')&&!voiceBusy()){
   const url=supportMediaUrl(button.dataset.supportMediaPlay),video=button.parentElement.querySelector('video,audio');if(!url||!video)return;
   if(activeSupportMedia!==video)activeSupportMedia?.pause();activeSupportMedia=video;
   registerSupportMedia();
   video.onplay=()=>claimPlayback(videoPlaybackOwner);
   video.hidden=false;button.hidden=true;video.src=url;
   video.onerror=()=>{video.hidden=true;button.hidden=false;notice(uiMessage(video.tagName==='AUDIO'?'supportUi.voiceUnavailable':'supportUi.videoUnavailable'),true);};
   void video.play().catch(()=>{});
  }
  else if(button.hasAttribute('data-support-reply-photo-remove')){
   const index=Number(button.dataset.supportReplyPhotoRemove);
   if(!photoBusy&&Number.isInteger(index)&&index>=0&&index<replyPhotos().length){reply.photos=replyPhotos().filter((_,i)=>i!==index);reply.id=null;paintReplyPhotos();}
  }
  else if(button.hasAttribute('data-support-photo-pick'))root.querySelector('[data-support-photo-input]')?.click();
  else if(button.hasAttribute('data-support-photo-save')){const url=button.getAttribute('data-support-photo-save'),id=revision;button.disabled=true;const controller=new AbortController();requests.add(controller);void saveSupportPhoto(url,{signal:controller.signal}).then(result=>{if(live(id)&&result==='downloaded')notice(uiMessage('supportUi.photoDownloaded'));else if(live(id)&&result==='saved')notice(uiMessage('supportUi.photoSaved'));}).catch(error=>{if(live(id))notice(error.uiMessage||error.message,true)}).finally(()=>{requests.delete(controller);if(live(id))button.disabled=false})}
  else if(button.hasAttribute('data-support-photo-remove')){photoRevision++;photoBusy=false;const photos=draftPhotos().slice(),index=Number(button.dataset?.supportPhotoRemove||0);if(Number.isInteger(index)&&index>=0&&index<photos.length)photos.splice(index,1);draft.photos=photos;draft.photo=photos[0]||null;draft.id=null;newView()}
  else if(button.hasAttribute('data-support-new')&&!owner)newView();
  else if(button.hasAttribute('data-support-recipient-retry')&&owner&&recipientId)void loadRecipient();
  else if(button.hasAttribute('data-support-back')){if(grouped){chatHistory.back();}else void loadList();}
  else if(button.hasAttribute('data-support-refresh'))void loadList();
  else if(button.hasAttribute('data-support-more'))void loadList(true);
  else if(button.dataset.supportThread){if(view==='list')listScroll=globalThis.window?.scrollY||0;historyBefore=historyAround=null;void readThread(button.dataset.supportThread);}
  else if(button.hasAttribute('data-support-history-earlier')&&threadData?.next){historyBefore=threadData.next;historyAround=null;void readThread(threadData.anchorId||thread.id);}
  else if(button.hasAttribute('data-support-history-latest')&&thread){if(historyBefore||historyAround){historyBefore=historyAround=null;void readThread(threadData.anchorId||thread.id).then(ok=>{if(ok)chatView?.openLatest();});}else chatView?.openLatest();}
  else if(button.hasAttribute('data-support-reload')&&thread)void readThread(thread.id);
  else if(button.hasAttribute('data-support-team')&&owner&&app==='salah'&&thread&&setTeamVisibility){const visible=!thread.team_visible;if(visible&&!globalThis.window?.confirm?.(t('supportUi.teamConfirm')))return;void run(async valid=>{const id=thread.id;await setTeamVisibility(id,visible);if(valid())await readThread(id);});}
  else if(button.hasAttribute('data-support-reopen'))void changeCase('reopen');
  else if(button.hasAttribute('data-support-cancel-reply')){reply.replyTo=null;reply.id=null;paintReplyQuote();root.querySelector('[data-support-reply] textarea')?.focus({preventScroll:true});}
  else if(button.hasAttribute('data-support-close')&&owner&&thread){if(chatView)void changeCase('close');else void run(async valid=>{const current=thread.id;await rpc('support_close',{p_id:current,p_app:app});if(valid())await readThread(current)});}
 };
 root.onchange=async event=>{
  const input=event.target;if(input.hasAttribute?.('data-support-reply-photo-input'))return pickReplyPhotos(input);
  if(!input.hasAttribute?.('data-support-photo-input')||locked||disposed||!preparePhoto)return;
  if(photoBusy)return;const files=Array.from(input.files||[]);if(!files.length)return;if(files.length+draftPhotos().length>5){input.value='';notice(uiMessage('supportUi.photoLimit'),true);return}
  const id=revision,task=++photoRevision;photoBusy=true;const submit=root.querySelector('button[type="submit"]');if(submit)submit.disabled=true;notice(uiMessage('supportUi.preparingPhoto'));
  try{const prepared=[];for(const file of files){prepared.push(await preparePhoto(file));if(!live(id)||task!==photoRevision)return;}if(live(id)&&task===photoRevision){draft.photos=[...draftPhotos(),...prepared];draft.photo=draft.photos[0];draft.id=null;newView();notice(uiMessage('supportUi.photosAttached',{count:draft.photos.length}))}}
  catch(error){if(live(id)&&task===photoRevision)notice(error.uiMessage||error.message||uiMessage('supportUi.photoFailed'),true)}
  finally{input.value='';if(task===photoRevision){photoBusy=false;const button=root.querySelector('button[type="submit"]');if(button&&!locked)button.disabled=false}}
 };
 root.oninput=event=>{if(locked||disposed)return;const form=event.target.closest('form');if(form?.hasAttribute('data-support-create')){draft.subject=form.elements.subject.value;draft.body=form.elements.body.value;draft.id=null}else if(form?.hasAttribute('data-support-reply')){reply.body=form.elements.body.value;reply.id=null}};
 root.onsubmit=event=>{
  event.preventDefault();const form=event.target;if(locked||disposed||!form.checkValidity())return;if(voiceBusy())return;if(photoBusy){notice(uiMessage('supportUi.waitPhoto'));return}
  if(form.hasAttribute('data-support-create')){draft.subject=form.elements.subject.value.trim();draft.body=form.elements.body.value.trim();if(!draft.subject||!draft.body){notice(uiMessage('supportUi.enterSubjectBody'),true);return}if(owner&&!recipient){notice(uiMessage('supportUi.chooseUser'),true);return}if(diagnostics)draft.diagnostics=diagnostics.snapshot();const body=draft.diagnostics?draft.body+'\n\nТехнические данные SALAH\n'+draft.diagnostics:draft.body;if(body.length>3000){notice(uiMessage('supportUi.shorten'),true);return}draft.id??=crypto.randomUUID();void run(async valid=>{const current=draft.id;await rpc(owner?'support_owner_create':draftPhotos().length>1?'support_create_photos':draft.photo?'support_create_photo':'support_create',{p_id:current,p_app:app,p_subject:draft.subject,p_body:body,p_version:String(version),...(owner?{p_user:recipient.id}:draftPhotos().length>1?{p_photos:draftPhotos().map(photo=>photo.data)}:draft.photo?{p_photo:draft.photo.data}:{})});if(!valid())return;diagnostics?.dispose?.();diagnostics=null;draft={subject:'',body:'',id:null,diagnostics:'',photo:null};if(await readThread(current))notice(owner?uiMessage('supportUi.messageSent'):uiMessage('supportUi.requestSent'));})}
  else if(form.hasAttribute('data-support-reply')&&thread){
   reply.body=form.elements.body.value.trim();const photos=replyPhotos();
   if(!reply.body&&!photos.length&&!reply.video&&!reply.voice){notice(uiMessage('supportUi.enterMessage'),true);return;}
   reply.id??=crypto.randomUUID();
   const outgoing=reply,draftThread=thread.id,anchor=threadData?.anchorId||draftThread;
   const current=outgoing.replyTo?(threadData.messages.find(m=>m.id===outgoing.replyTo)?.thread_id||draftThread):draftThread;
   void run(async valid=>{
    try{
     const sent=outgoing.video||outgoing.voice?await sendReplyMedia(outgoing,current,valid):photos.length?await rpc('support_reply_photos',{p_app:app,p_thread:current,p_owner:owner,p_id:outgoing.id,p_body:outgoing.body,p_reply_to:outgoing.replyTo||null,p_photos:photos.map(photo=>photo.data)}):
      await rpc(chatView?'support_chat_request':'support_reply',chatView?{p_app:app,p_owner:owner,p_action:'reply',p_args:{threadId:current,messageId:outgoing.id,body:outgoing.body,replyTo:outgoing.replyTo||null}}:{p_thread:current,p_app:app,p_id:outgoing.id,p_body:outgoing.body,p_owner:owner});
     if(!valid())return;
     if((chatView||photos.length||outgoing.video||outgoing.voice)&&(sent?.ok!==true||sent.threadId!==current||sent.messageId!==outgoing.id))throw Error('invalid_ack');
    }catch(error){
     if(valid()&&(error.code==='reply_unavailable'||error.message==='reply_unavailable')){outgoing.replyTo=null;outgoing.id=null;paintReplyQuote();}
     throw error;
    }
    if(!valid())return;
    reply={body:'',id:null};replyDrafts.set(draftThread,reply);
    const input=root.querySelector('[data-support-reply] textarea');if(input)input.value='';
    paintReplyQuote();paintReplyPhotos();historyBefore=historyAround=null;
    if(await readThread(anchor))notice(owner?uiMessage('supportUi.replySent'):uiMessage('supportUi.messageSent'));
   });
  }
 };
 const openNotice=event=>{if(!disposed&&!locked&&view==='thread'&&thread?.id===event.detail?.thread)void readThread(thread.id);};
 globalThis.window?.addEventListener?.('salah:support-open',openNotice);
 const chatPoll=app==='salah'&&root.ownerDocument?setInterval(()=>{if(!disposed&&accountId&&view==='thread'&&chatView&&!locked&&!photoBusy&&!voiceBusy()&&!threadPollBusy&&(!activeSupportMedia||activeSupportMedia.paused)&&root.isConnected&&globalThis.document?.visibilityState!=='hidden'){threadPollBusy=true;void readThread(thread.id).finally(()=>{threadPollBusy=false;});}},8000):null;
 const ownerPoll=setInterval(()=>{if(!disposed&&accountId&&view==='list'&&root.isConnected&&!thread&&!locked&&!openingConversation&&!inboxActions?.isOpen()&&!userDirectory?.isOpen()&&globalThis.document?.visibilityState!=='hidden')void loadList(false,{silent:true})},30000);
 const {data:{subscription}}=auth.auth.onAuthStateChange((_event,session)=>{const nextId=session?.user?.id||null;if(disposed||nextId===accountId)return;clearPrivateState();accountId=nextId;const id=revision;shell('<p class="muted">'+uiLeaf('accountUi.checkingSignIn')+'</p>');setTimeout(()=>{if(live(id))void account()},0)});void account();
 const cancelHiddenVoice=()=>{if(browser?.document?.hidden&&voiceRecorder.state==='recording')voiceRecorder.cancel();};
 browser?.document.addEventListener('visibilitychange',cancelHiddenVoice);
 const offLanguage=subscribeLanguage(()=>{if(disposed||!root.isConnected)return;translateUi(root);for(const node of root.querySelectorAll('[data-support-date]')){const value=node.getAttribute('datetime');node.textContent=node.dataset.supportDateFormat==='time'?new Intl.DateTimeFormat(getLocale(),{hour:'2-digit',minute:'2-digit'}).format(new Date(value)):node.dataset.supportDateFormat==='inbox'?supportInboxDate(value):date(value);if(node.dataset.supportDateFormat==='inbox')node.title=date(value);}const notify=root.querySelector('[data-support-enable-notifications]');if(notify&&root.classList?.contains('support-inbox-shell'))notify.setAttribute('aria-label',t('supportUi.notifyReplies'));});
 const stop=()=>{browser?.document.removeEventListener('visibilitychange',cancelHiddenVoice);chatHistory?.dispose();offLanguage();disposed=true;globalThis.window?.removeEventListener?.('salah:support-open',openNotice);if(ownerPoll)clearInterval(ownerPoll);if(chatPoll)clearInterval(chatPoll);clearPrivateState();subscription.unsubscribe();root.onclick=root.oninput=root.onchange=root.onsubmit=null;root.replaceChildren();accountId=null};
 stop.checkpoint=()=>!disposed&&view==='thread'&&thread?{actorId:accountId,owner,threadId:threadData?.anchorId||thread.id,historyBefore,historyAround,listScroll,rows:rows.map(row=>({...row})),before,more,replyDrafts:[...replyDrafts].map(([key,value])=>[key,{...value}])}:null;return stop;
}

