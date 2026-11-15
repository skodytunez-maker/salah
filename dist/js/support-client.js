import{t,getLocale,subscribeLanguage}from './i18n.js';
import{uiLeaf,uiAttribute,uiMessage,setUiMessage}from './ui.js';
import{mountMessageEmojis,messageTextMarkup}from './message-emojis.js';
import{supportPhotoUrl}from './support-photo.js';
import{saveSupportPhoto}from './support-photo-save.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const statuses={open:'supportUi.statusOpen',answered:'supportUi.statusAnswered',closed:'supportUi.statusClosed'};
const date=value=>Number.isFinite(Date.parse(value))?new Intl.DateTimeFormat(getLocale(),{dateStyle:'short',timeStyle:'short'}).format(new Date(value)):'';
function supportErrorMessage(error){
 const text=error?.message||'';
 if(text.includes('support_rate_limit'))return uiMessage('supportUi.rateLimit');
 if(text.includes('conversation_closed'))return uiMessage('supportUi.alreadyClosed');
 if(text.includes('conversation_full'))return uiMessage('supportUi.full');
 if(error?.code==='42501')return uiMessage('supportUi.unavailable');
 if(error?.code==='22023')return uiMessage('supportUi.invalid');
 return uiMessage('supportUi.failed');
}
export function supportError(error){const message=supportErrorMessage(error);return t(message.key,message.params);}
export function mountSupportPanel(root,{auth,app,version,owner=false,signInHref='#account',createDiagnostics,preparePhoto,recipientId=null,initialThreadId=null,enableNotifications,setTeamVisibility}={}){
 let emojiCleanup=null;
 let view=null,disposed=false,revision=0,accountId=null,rows=[],filter=app,before=null,more=false,thread=null,threadData=null,draft={subject:'',body:'',id:null,diagnostics:'',photo:null},reply={body:'',id:null},locked=false,diagnostics=null,photoBusy=false,photoRevision=0,recipient=null;
 const draftPhotos=()=>draft.photos||(draft.photo?[draft.photo]:[]);
 const requests=new Set(),replyDrafts=new Map(),fieldPrefix='support-'+app+'-'+(owner?'owner':'user');
 const live=id=>!disposed&&root.isConnected&&id===revision;
 function clearPrivateState(){emojiCleanup?.();emojiCleanup=null;view=null;recipient=null;revision++;photoRevision++;photoBusy=false;for(const request of requests)request.abort();rows=[];before=null;more=false;thread=threadData=null;draft={subject:'',body:'',id:null,diagnostics:'',photo:null};diagnostics?.dispose?.();diagnostics=null;reply={body:'',id:null};replyDrafts.clear();locked=false}
 async function rpc(name,args){
  const controller=new AbortController();requests.add(controller);const timeout=setTimeout(()=>controller.abort(),['support_create_photo','support_create_photos'].includes(name)?75000:15000);
  try{const result=await auth.rpc(name,args).abortSignal(controller.signal);if(controller.signal.aborted)throw new Error('support_cancelled');if(result.error)throw result.error;return result.data}
  finally{clearTimeout(timeout);requests.delete(controller)}
 }
 function notice(message,alert=false){const element=root.querySelector('[data-support-status]');if(element){setUiMessage(element,message);element.setAttribute('role',alert?'alert':'status')}}
 function shell(content){emojiCleanup?.();emojiCleanup=null;root.innerHTML='<div class="support-panel"><div class="support-heading"><h2>'+ uiLeaf(owner?'supportUi.requests':'supportUi.support')+(owner?'<span class="support-state-dot" data-owner-support-status hidden></span>':'<span class="support-state-dot" data-user-support-status hidden></span>')+'</h2>'+'</div>'+(accountId&&enableNotifications?'<button type="button" class="text-button" data-support-enable-notifications>'+uiLeaf('supportUi.notifyReplies')+'</button>':'')+'<p data-support-status role="status" aria-live="polite"></p>'+content+'</div>';emojiCleanup=mountMessageEmojis(root);const select=root.querySelector('#support-app');if(select){select.value=filter;select.onchange=()=>{filter=select.value;void loadList()}}globalThis.window?.dispatchEvent?.(new Event('salah:support-status-refresh'));}
 function listView(){
  view='list';recipient=null;thread=threadData=null;reply={body:'',id:null};shell('<div class="support-actions">'+(!owner?'<button type="button" class="button" data-support-new>'+uiLeaf('supportUi.new')+'</button>':'')+'<button type="button" class="button secondary" data-support-refresh>'+uiLeaf('settingsExtra.update')+'</button></div>'+(rows.length?'<div class="support-list">'+rows.map(row=>'<button type="button" class="support-thread" data-support-thread="'+esc(row.id)+'"><strong>'+esc(row.subject)+'</strong><span>'+(statuses[row.status]?uiLeaf(statuses[row.status]):'')+'</span>'+(owner&&row.owner_unread?'<span class="support-new-badge">'+uiLeaf('supportUi.newBadge')+'</span>':!owner&&row.user_unread?'<span class="support-new-badge is-user-reply">'+uiLeaf('supportUi.replyBadge')+'</span>':'')+(!owner&&row.last_reply?'<span class="support-reply-preview">'+esc(row.last_reply)+'</span>':'')+'<small>'+(owner?esc(row.app.toUpperCase())+' · '+(row.nickname?esc(row.nickname):uiLeaf('supportUi.noNickname'))+' · ':'')+'<time data-support-date datetime="'+esc(row.updated_at)+'">'+esc(date(row.updated_at))+'</time>'+'</small></button>').join('')+'</div>':'<p class="muted support-empty">'+uiLeaf(owner?'supportUi.emptyOwner':'supportUi.emptyUser')+'</p>')+(more?'<button type="button" class="text-button" data-support-more>'+uiLeaf('supportUi.earlier')+'</button>':''));
 }
 async function loadList(append=false,{silent=false}={}){
  const id=++revision,previousRows=JSON.stringify(rows),previousUnread=new Set(rows.filter(row=>owner?row.owner_unread:row.user_unread).map(row=>row.id));
  if(!silent){view='loading';shell('<p class="muted">'+uiLeaf('supportUi.loading')+'</p>');}
  try{const data=await rpc('support_list',{p_app:filter,p_owner:owner,p_before:append?before:null});if(!live(id))return;if(!Array.isArray(data))throw Error();more=data.length===50;rows=append?[...rows,...data]:data;before=data.at(-1)?.updated_at||null;const fresh=!append?rows.filter(row=>(owner?row.owner_unread:row.user_unread)&&!previousUnread.has(row.id)):[];if(!silent||JSON.stringify(rows)!==previousRows)listView();if(fresh.length)notice(uiMessage(owner?'supportUi.newRequestNotice':'supportUi.newReplyNotice',{subject:fresh[0].subject}))}
  catch(error){if(live(id)){if(!silent)listView();notice(supportErrorMessage(error),true)}}
 }
 async function loadRecipient(){
  const id=++revision;view='loading';shell('<p class="muted">'+uiLeaf('supportUi.openingMessage')+'</p>');
  try{const data=await rpc('support_owner_recipient',{p_user:recipientId,p_app:app});if(!live(id))return;if(!data||data.id!==recipientId||typeof data.nickname!=='string')throw Error();recipient=data;draft.subject=t('supportUi.defaultSubject',{app:app.toUpperCase()});newView()}
  catch(error){if(live(id)){shell('<button type="button" class="button secondary" data-support-recipient-retry>'+uiLeaf('common.retry')+'</button><button type="button" class="text-button" data-support-back>'+uiLeaf('supportUi.allRequests')+'</button>');notice(supportErrorMessage(error),true)}}
 }
 function newView(){
  if(owner){
   if(!recipient)return;
   revision++;view='new';thread=threadData=null;shell('<button type="button" class="text-button" data-support-back>'+uiLeaf('supportUi.allRequests')+'</button><h3 class="support-recipient">'+esc(recipient.nickname)+'</h3><form data-support-create><label for="'+fieldPrefix+'-subject">'+uiLeaf('supportUi.subject')+'</label><input id="'+fieldPrefix+'-subject" name="subject" maxlength="120" required value="'+esc(draft.subject)+'"><label for="'+fieldPrefix+'-body">'+uiLeaf('supportUi.message')+'</label><textarea id="'+fieldPrefix+'-body" name="body" maxlength="3000" rows="6" required>'+esc(draft.body)+'</textarea><button type="submit" class="button">'+uiLeaf('supportUi.send')+'</button></form>');
   return;
  }
  revision++;view='new';thread=threadData=null;shell('<button type="button" class="text-button" data-support-back>'+uiLeaf('supportUi.myRequests')+'</button><form data-support-create><label for="'+fieldPrefix+'-subject">'+uiLeaf('supportUi.subject')+'</label><input id="'+fieldPrefix+'-subject" name="subject" maxlength="120" required value="'+esc(draft.subject)+'"><label for="'+fieldPrefix+'-body">'+uiLeaf('supportUi.message')+'</label><textarea id="'+fieldPrefix+'-body" name="body" maxlength="3000" rows="6" required>'+esc(draft.body)+'</textarea><p class="muted support-note">'+uiLeaf('supportUi.passwordWarning')+'</p><button type="button" class="support-diagnostics" data-support-diagnostics aria-pressed="'+Boolean(draft.diagnostics)+'">'+uiLeaf('supportUi.attachDiagnostics')+'</button><p class="muted support-note">'+uiLeaf('supportUi.diagnosticsNote')+'</p><pre class="support-diagnostic-preview" data-support-diagnostic-preview'+(draft.diagnostics?'':' hidden')+'>'+esc(draft.diagnostics)+'</pre><input type="file" accept="image/*" multiple id="'+fieldPrefix+'-photo" data-support-photo-input hidden><button type="button" class="button secondary" data-support-photo-pick>'+uiLeaf('supportUi.attachPhotos')+'</button>'+draftPhotos().map((photo,i)=>'<div class="support-photo-preview"><img src="'+esc(photo.preview)+'" '+uiAttribute('supportUi.attachedPhoto',{number:i+1},'alt')+'><button type="button" class="text-button" data-support-photo-remove="'+i+'">'+uiLeaf('supportUi.removePhoto')+'</button></div>').join('')+'<button type="submit" class="button">'+uiLeaf('supportUi.send')+'</button></form>');
 }
 function photoMarkup(data,messageId){
  const photos=Array.isArray(data.photos)?data.photos.filter(item=>item.message_id===messageId):[];
  return photos.map(photo=>{if(photo?.unavailable)return '<p class="muted support-note">'+uiLeaf('supportUi.photoUnavailable')+'</p>';
   const url=supportPhotoUrl(photo?.url);return url?'<div class="support-photo-item"><a class="support-photo" href="'+esc(url)+'" target="_blank" rel="noreferrer"><img src="'+esc(url)+'" referrerpolicy="no-referrer" '+uiAttribute('supportUi.photoLabel',{},'alt')+'></a><button type="button" class="button secondary" data-support-photo-save="'+esc(url)+'">'+uiLeaf('supportUi.savePhoto')+'</button></div>':'';}).join('');
 }
 function threadView(data){
  view='thread';thread=data.thread;threadData=data;reply=replyDrafts.get(thread.id)||{body:'',id:null};replyDrafts.set(thread.id,reply);shell('<div class="support-actions"><button type="button" class="text-button" data-support-back>'+uiLeaf('supportUi.allRequests')+'</button><button type="button" class="text-button" data-support-reload>'+uiLeaf('settingsExtra.update')+'</button>'+((owner&&app==='salah'&&setTeamVisibility)?'<button type="button" class="text-button" data-support-team>'+uiLeaf(thread.team_visible?'supportUi.privateAgain':'supportUi.shareTeam')+'</button>':'')+'</div><h3>'+esc(thread.subject)+'</h3><p class="muted support-note">'+(statuses[thread.status]?uiLeaf(statuses[thread.status]):'')+' · '+esc(thread.app.toUpperCase())+' '+esc(thread.version)+(owner?' · '+(thread.nickname?esc(thread.nickname):uiLeaf('supportUi.noNickname')):'')+'</p><div class="support-messages">'+data.messages.map(message=>'<article class="support-message'+(message.owner_reply?' is-answer':'')+'"><div><strong>'+(message.owner_reply?uiLeaf('supportUi.supportReply'):owner?(thread.nickname?esc(thread.nickname):uiLeaf('supportUi.user')):uiLeaf('supportUi.you'))+'</strong><time data-support-date datetime="'+esc(message.created_at)+'">'+esc(date(message.created_at))+'</time></div><p>'+messageTextMarkup(message.body)+'</p>'+photoMarkup(data,message.id)+'</article>').join('')+'</div>'+(thread.status==='closed'?'<p class="muted">'+uiLeaf('supportUi.closedNote')+'</p>':'<form data-support-reply><label for="'+fieldPrefix+'-reply">'+uiLeaf(owner?'supportUi.replyLabel':'supportUi.addDetails')+'</label><textarea id="'+fieldPrefix+'-reply" name="body" maxlength="3000" rows="4" required>'+esc(reply.body)+'</textarea><button type="submit" class="button">'+uiLeaf(owner?'supportUi.reply':'supportUi.send')+'</button></form>'+(owner?'<button type="button" class="text-button support-close" data-support-close>'+uiLeaf('supportUi.close')+'</button>':'')));
 }
 async function readThread(threadId){const previous=threadData?.thread.id===threadId?threadData:null,id=++revision;shell('<p class="muted">'+uiLeaf('supportUi.loadingThread')+'</p>');try{const data=await rpc('support_read',{p_id:threadId,p_app:app,p_owner:owner});if(live(id)){threadView(data);return true}}catch(error){if(live(id)){if(previous)threadView(previous);else listView();notice(supportErrorMessage(error),true)}}return false}
 async function run(task){if(locked)return;const lock={};locked=lock;const id=revision;root.querySelectorAll('button,input,textarea,select').forEach(c=>c.disabled=true);notice(uiMessage('supportUi.sending'));try{await task(()=>live(id))}catch(error){if(live(id))notice(supportErrorMessage(error),true)}finally{if(locked===lock){locked=false;if(!disposed)root.querySelectorAll('button,input,textarea,select').forEach(c=>c.disabled=false)}}}
 async function account(){
  clearPrivateState();accountId=null;const id=revision;shell('<p class="muted">'+uiLeaf('accountUi.checkingSignIn')+'</p>');
  try{const {data,error}=await auth.auth.getSession();if(!live(id))return;if(error)throw error;accountId=data.session?.user?.id||null;
   if(!accountId){shell('<p class="muted">'+uiLeaf('supportUi.signInNote')+'</p><a class="button" href="'+esc(signInHref)+'">'+uiLeaf('supportUi.signIn')+'</a>');return}if(owner&&recipientId)await loadRecipient();else if(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(initialThreadId||''))await readThread(initialThreadId);else await loadList();
  }catch(error){if(live(id))notice(supportErrorMessage(error),true)}
 }
 root.onclick=event=>{
  if(locked||disposed)return;const button=event.target.closest('button');if(!button||!root.contains(button))return;
  if(button.hasAttribute('data-support-enable-notifications')){const id=revision;button.disabled=true;void Promise.resolve(enableNotifications?.()).then(result=>{if(live(id))notice(result?.ready?uiMessage('supportUi.notificationsEnabled'):result?.uiMessage||result?.message||uiMessage('supportUi.notificationsFailed'),!result?.ready)}).catch(()=>{if(live(id))notice(uiMessage('supportUi.notificationsFailed'),true)}).finally(()=>{if(live(id))button.disabled=false})}
  else if(button.hasAttribute('data-support-diagnostics')){
   if(draft.diagnostics){draft.diagnostics='';diagnostics?.dispose?.();diagnostics=null;button.setAttribute('aria-pressed','false');const preview=root.querySelector('[data-support-diagnostic-preview]');if(preview){preview.textContent='';preview.hidden=true}}
   else{diagnostics=createDiagnostics?.()||null;draft.diagnostics=diagnostics?.snapshot?.()||'Версия SALAH: '+String(version||'неизвестна').slice(0,12);button.setAttribute('aria-pressed','true');const preview=root.querySelector('[data-support-diagnostic-preview]');if(preview){preview.textContent=draft.diagnostics;preview.hidden=false}}
  }
  else if(button.hasAttribute('data-support-photo-pick'))root.querySelector('[data-support-photo-input]')?.click();
  else if(button.hasAttribute('data-support-photo-save')){const url=button.getAttribute('data-support-photo-save'),id=revision;button.disabled=true;const controller=new AbortController();requests.add(controller);void saveSupportPhoto(url,{signal:controller.signal}).then(result=>{if(live(id)&&result==='downloaded')notice(uiMessage('supportUi.photoDownloaded'));else if(live(id)&&result==='saved')notice(uiMessage('supportUi.photoSaved'));}).catch(error=>{if(live(id))notice(error.uiMessage||error.message,true)}).finally(()=>{requests.delete(controller);if(live(id))button.disabled=false})}
  else if(button.hasAttribute('data-support-photo-remove')){photoRevision++;photoBusy=false;const photos=draftPhotos().slice(),index=Number(button.dataset?.supportPhotoRemove||0);if(Number.isInteger(index)&&index>=0&&index<photos.length)photos.splice(index,1);draft.photos=photos;draft.photo=photos[0]||null;draft.id=null;newView()}
  else if(button.hasAttribute('data-support-new')&&!owner)newView();
  else if(button.hasAttribute('data-support-recipient-retry')&&owner&&recipientId)void loadRecipient();
  else if(button.hasAttribute('data-support-back')||button.hasAttribute('data-support-refresh'))void loadList();
  else if(button.hasAttribute('data-support-more'))void loadList(true);
  else if(button.dataset.supportThread)void readThread(button.dataset.supportThread);
  else if(button.hasAttribute('data-support-reload')&&thread)void readThread(thread.id);
  else if(button.hasAttribute('data-support-team')&&owner&&app==='salah'&&thread&&setTeamVisibility){const visible=!thread.team_visible;if(visible&&!globalThis.window?.confirm?.(t('supportUi.teamConfirm')))return;void run(async valid=>{const id=thread.id;await setTeamVisibility(id,visible);if(valid())await readThread(id);});}
  else if(button.hasAttribute('data-support-close')&&owner&&thread)void run(async valid=>{const current=thread.id;await rpc('support_close',{p_id:current,p_app:app});if(valid())await readThread(current)});
 };
 root.onchange=async event=>{
  const input=event.target;if(!input.hasAttribute?.('data-support-photo-input')||locked||disposed||!preparePhoto)return;
  if(photoBusy)return;const files=Array.from(input.files||[]);if(!files.length)return;if(files.length+draftPhotos().length>5){input.value='';notice(uiMessage('supportUi.photoLimit'),true);return}
  const id=revision,task=++photoRevision;photoBusy=true;const submit=root.querySelector('button[type="submit"]');if(submit)submit.disabled=true;notice(uiMessage('supportUi.preparingPhoto'));
  try{const prepared=[];for(const file of files){prepared.push(await preparePhoto(file));if(!live(id)||task!==photoRevision)return;}if(live(id)&&task===photoRevision){draft.photos=[...draftPhotos(),...prepared];draft.photo=draft.photos[0];draft.id=null;newView();notice(uiMessage('supportUi.photosAttached',{count:draft.photos.length}))}}
  catch(error){if(live(id)&&task===photoRevision)notice(error.uiMessage||error.message||uiMessage('supportUi.photoFailed'),true)}
  finally{input.value='';if(task===photoRevision){photoBusy=false;const button=root.querySelector('button[type="submit"]');if(button&&!locked)button.disabled=false}}
 };
 root.oninput=event=>{if(locked||disposed)return;const form=event.target.closest('form');if(form?.hasAttribute('data-support-create')){draft.subject=form.elements.subject.value;draft.body=form.elements.body.value;draft.id=null}else if(form?.hasAttribute('data-support-reply')){reply.body=form.elements.body.value;reply.id=null}};
 root.onsubmit=event=>{
  event.preventDefault();const form=event.target;if(locked||disposed||!form.checkValidity())return;if(photoBusy){notice(uiMessage('supportUi.waitPhoto'));return}
  if(form.hasAttribute('data-support-create')){draft.subject=form.elements.subject.value.trim();draft.body=form.elements.body.value.trim();if(!draft.subject||!draft.body){notice(uiMessage('supportUi.enterSubjectBody'),true);return}if(owner&&!recipient){notice(uiMessage('supportUi.chooseUser'),true);return}if(diagnostics)draft.diagnostics=diagnostics.snapshot();const body=draft.diagnostics?draft.body+'\n\nТехнические данные SALAH\n'+draft.diagnostics:draft.body;if(body.length>3000){notice(uiMessage('supportUi.shorten'),true);return}draft.id??=crypto.randomUUID();void run(async valid=>{const current=draft.id;await rpc(owner?'support_owner_create':draftPhotos().length>1?'support_create_photos':draft.photo?'support_create_photo':'support_create',{p_id:current,p_app:app,p_subject:draft.subject,p_body:body,p_version:String(version),...(owner?{p_user:recipient.id}:draftPhotos().length>1?{p_photos:draftPhotos().map(photo=>photo.data)}:draft.photo?{p_photo:draft.photo.data}:{})});if(!valid())return;diagnostics?.dispose?.();diagnostics=null;draft={subject:'',body:'',id:null,diagnostics:'',photo:null};if(await readThread(current))notice(owner?uiMessage('supportUi.messageSent'):uiMessage('supportUi.requestSent'));})}
  else if(form.hasAttribute('data-support-reply')&&thread){reply.body=form.elements.body.value.trim();if(!reply.body){notice(uiMessage('supportUi.enterMessage'),true);return}reply.id??=crypto.randomUUID();void run(async valid=>{const current=thread.id;await rpc('support_reply',{p_thread:current,p_app:app,p_id:reply.id,p_body:reply.body,p_owner:owner});if(valid()){replyDrafts.delete(current);if(await readThread(current))notice(owner?uiMessage('supportUi.replySent'):uiMessage('supportUi.messageSent'))}})}
 };
 const openNotice=event=>{if(!disposed&&!locked&&view==='thread'&&thread?.id===event.detail?.thread)void readThread(thread.id);};
 globalThis.window?.addEventListener?.('salah:support-open',openNotice);
 const ownerPoll=setInterval(()=>{if(!disposed&&accountId&&view==='list'&&root.isConnected&&!thread&&globalThis.document?.visibilityState!=='hidden')void loadList(false,{silent:true})},30000);
 const {data:{subscription}}=auth.auth.onAuthStateChange((_event,session)=>{const nextId=session?.user?.id||null;if(disposed||nextId===accountId)return;clearPrivateState();accountId=nextId;const id=revision;shell('<p class="muted">'+uiLeaf('accountUi.checkingSignIn')+'</p>');setTimeout(()=>{if(live(id))void account()},0)});void account();
 const offLanguage=subscribeLanguage(()=>{if(disposed||!root.isConnected)return;for(const node of root.querySelectorAll('[data-support-date]'))node.textContent=date(node.getAttribute('datetime'));});
 return()=>{offLanguage();disposed=true;globalThis.window?.removeEventListener?.('salah:support-open',openNotice);if(ownerPoll)clearInterval(ownerPoll);clearPrivateState();subscription.unsubscribe();root.onclick=root.oninput=root.onchange=root.onsubmit=null;root.replaceChildren();accountId=null};
}

