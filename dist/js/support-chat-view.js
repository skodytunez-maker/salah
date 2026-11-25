import{mountConversationTheme}from './conversation-theme-view.js';
import{bindSwipeMotion}from './swipe-motion.js';
import{followMessageTail}from './message-scroll.js';
import{t,getLocale,subscribeLanguage}from './i18n.js';
import{uiLeaf,uiAttribute}from './ui.js';
import{supportPhotoUrl}from './support-photo.js';
import{supportMediaUrl}from './support-media.js';
import{mountChatTranslation}from './chat-translation.js';
import{messageTextMarkup}from './message-emojis.js';
import{mountStaffMessageActions}from './staff-message-actions.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const supportStatuses={open:'supportUi.statusOpen',answered:'supportUi.statusAnswered',closed:'supportUi.statusClosed'};
export function supportInboxDate(value){
 const at=new Date(value);if(!Number.isFinite(at.getTime()))return '';
 const now=new Date(),today=at.getFullYear()===now.getFullYear()&&at.getMonth()===now.getMonth()&&at.getDate()===now.getDate();
 return new Intl.DateTimeFormat(getLocale(),{...(today?{}:{day:'numeric',month:'short',...(at.getFullYear()===now.getFullYear()?{}:{year:'numeric'})}),hour:'2-digit',minute:'2-digit'}).format(at);
}
export function supportInboxMarkup(rows,{owner=false,more=false,users=false}={}){
 const initials=name=>String(name).trim().split(/\s+/u).slice(0,2).map(word=>Array.from(word)[0]||'').join('').toLocaleUpperCase(getLocale());
 return '<div class="support-actions support-inbox-toolbar">'+(!owner?'<button type="button" class="button" data-support-new>'+uiLeaf('supportUi.new')+'</button>':'')+'<button type="button" class="button secondary" data-support-refresh>'+uiLeaf('settingsExtra.update')+'</button>'+'</div>'+(rows.length?'<div class="support-list support-inbox-list">'+rows.map(row=>{
  const name=owner?(row.nickname||t('supportUi.noNickname')):row.conversation_id?t('supportUi.support'):row.subject,unread=owner?row.owner_unread:row.user_unread,awaiting=owner&&row.awaiting_owner===true,at=row.last_message_at||row.updated_at,preview=row.last_message??(!owner?row.last_reply:null),photo=owner&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(row.user_id||'')?' data-member-avatar="'+esc(row.user_id)+'"':'';
  return '<button type="button" class="support-thread support-inbox-row'+(unread?' is-unread':'')+(awaiting?' is-awaiting':'')+'" data-support-thread="'+esc(row.id)+'"><span class="support-inbox-avatar"'+photo+' aria-hidden="true">'+esc(owner?initials(name):'S')+'</span><span class="support-inbox-copy"><span class="support-inbox-top"><strong dir="auto" title="'+esc(name)+'">'+(owner||!row.conversation_id?esc(name):uiLeaf('supportUi.support'))+'</strong><time data-support-date data-support-date-format="inbox" datetime="'+esc(at)+'" title="'+esc(Number.isFinite(Date.parse(at))?new Date(at).toLocaleString(getLocale()):'')+'">'+esc(supportInboxDate(at))+'</time></span>'+(preview||owner?'<span class="support-inbox-preview" dir="auto">'+esc(preview||row.subject)+'</span>':'')+'<span class="support-inbox-bottom">'+(owner&&preview?'<span class="support-inbox-subject" dir="auto" title="'+esc(row.subject)+'">'+esc(row.subject)+'</span>':'')+(supportStatuses[row.status]?'<span class="support-inbox-status" data-state="'+esc(awaiting?'waiting':row.status)+'">'+uiLeaf(awaiting?'supportConversationUi.awaiting':supportStatuses[row.status])+'</span>':'')+(unread?'<span class="support-new-badge'+(!owner?' is-user-reply':'')+'">'+uiLeaf(owner?'supportUi.newBadge':'supportUi.replyBadge')+'</span>':'')+'</span></span></button>';
 }).join('')+'</div>':'<p class="muted support-empty">'+uiLeaf(owner?'supportUi.emptyOwner':'supportUi.emptyUser')+'</p>')+(more?'<button type="button" class="text-button support-inbox-more" data-support-more>'+uiLeaf('supportUi.earlier')+'</button>':'')+(owner&&users?'<div class="support-user-directory-heading"><button type="button" class="text-button" data-support-users aria-expanded="false">'+uiLeaf('ownerUi.users')+'</button></div>':'');
}
export function arrangeSupportInbox(root){
 root.classList.add('support-inbox-shell');const toolbar=root.querySelector('.support-inbox-toolbar'),notify=root.querySelector('[data-support-enable-notifications]');
 if(notify){notify.innerHTML=uiLeaf('notifyUi.enableNotifications');notify.setAttribute('aria-label',t('supportUi.notifyReplies'));toolbar.append(notify);}
 if(root.parentElement?.querySelector('h1')&&!root.contains(root.parentElement.querySelector('h1'))){const dot=root.querySelector('.support-state-dot');if(dot)toolbar.append(dot);root.querySelector('.support-heading')?.remove();}
}
export function mountSupportInboxActions(root,{getRow,onClear,isActive}){
 const doc=root.ownerDocument,win=doc.defaultView,dialog=doc.createElement('dialog');
 dialog.className='support-inbox-context';
 dialog.setAttribute('aria-label',t('messageDeletionUi.chatActions'));
 dialog.setAttribute('data-i18n-aria-label','messageDeletionUi.chatActions');
 root.append(dialog);
 let timer=null,press=null,trigger=null,ignoreClick=null;
 const rowFor=event=>event.target.closest?.('button[data-support-thread]');
 function stopPress(){win.clearTimeout(timer);timer=null;press=null;}
 function close(restore=true){
  stopPress();if(dialog.open)dialog.close();dialog.replaceChildren();
  if(restore&&trigger?.isConnected)trigger.focus({preventScroll:true});
  trigger=null;
 }
 function place(){
  if(!dialog.open||!trigger?.isConnected)return;
  const frame=dialog.querySelector('.support-inbox-context-frame'),preview=frame.firstElementChild,menu=frame.lastElementChild;
  const bounds=frame.getBoundingClientRect(),row=trigger.getBoundingClientRect(),gap=8;
  const width=Math.min(row.width,bounds.width),height=Math.min(row.height,bounds.height);
  const left=Math.max(0,Math.min(row.left-bounds.left,bounds.width-width));
  const top=Math.max(0,Math.min(row.top-bounds.top,bounds.height-height));
  Object.assign(preview.style,{left:left+'px',top:top+'px',width:width+'px',height:height+'px'});
  const menuWidth=Math.min(282,bounds.width);
  const start=win.getComputedStyle(trigger).direction==='rtl'?left+width-menuWidth:left;
  Object.assign(menu.style,{left:Math.max(0,Math.min(start,bounds.width-menuWidth))+'px',width:menuWidth+'px',maxHeight:'none'});
  const below=Math.max(0,bounds.height-top-height-gap),above=Math.max(0,top-gap),menuHeight=menu.getBoundingClientRect().height;
  const fitsBelow=menuHeight<=below||below>=above;
  const available=fitsBelow?below:above;
  menu.style.maxHeight=available+'px';
  menu.style.top=(fitsBelow?top+height+gap:top-gap-Math.min(menuHeight,available))+'px';
 }
 function open(button){
  if(!isActive()||dialog.open||button.disabled||!root.contains(button))return;
  if(!getRow(button.dataset.supportThread))return;
  stopPress();trigger=button;ignoreClick=button;
  dialog.innerHTML='<div class="support-inbox-context-frame"><div class="support-inbox-context-preview support-inbox-row" aria-hidden="true"></div><div class="support-inbox-context-actions"><button type="button" data-support-context-delete>'+uiLeaf('messageDeletionUi.clearSelf')+'</button><button type="button" data-support-context-cancel>'+uiLeaf('common.cancel')+'</button></div></div>';
  const preview=dialog.querySelector('.support-inbox-context-preview');
  preview.append(...[...button.children].map(element=>element.cloneNode(true)));
  preview.querySelectorAll('[data-member-avatar]').forEach(element=>element.removeAttribute('data-member-avatar'));
  for(const state of ['is-unread','is-awaiting'])preview.classList.toggle(state,button.classList.contains(state));
  dialog.showModal();
  place();
  dialog.querySelector('[data-support-context-cancel]').focus({preventScroll:true});
 }
 function down(event){
  ignoreClick=null;stopPress();
  if(event.pointerType!=='touch'||event.button!==0||event.isPrimary===false||!isActive())return;
  const button=rowFor(event);if(!button)return;
  press={id:event.pointerId,x:event.clientX,y:event.clientY};
  timer=win.setTimeout(()=>open(button),500);
 }
 function move(event){
  if(press&&(event.pointerId!==press.id||Math.hypot(event.clientX-press.x,event.clientY-press.y)>8))stopPress();
 }
 function context(event){
  const button=rowFor(event);if(!button)return;
  event.preventDefault();
  // Touch uses the cancellable hold timer, including when iOS sends a native callout.
  if(event.button===2&&event.pointerType!=='touch'&&!event.sourceCapabilities?.firesTouchEvents)open(button);
 }
 function keyboard(event){
  const button=rowFor(event);
  if(!button||!(event.key==='ContextMenu'||event.key==='F10'&&event.shiftKey))return;
  event.preventDefault();open(button);
 }
 function blockOpeningClick(event){
  if(rowFor(event)!==ignoreClick||!ignoreClick||event.detail===0)return;
  ignoreClick=null;event.preventDefault();event.stopImmediatePropagation();
 }
 dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
 dialog.addEventListener('click',event=>{
  if(event.target===dialog&&ignoreClick&&event.detail!==0){ignoreClick=null;return;}
  if(event.target===dialog||event.target.closest('[data-support-context-cancel]'))return close();
  if(!isActive()||!trigger)return close();
  if(event.target.closest('[data-support-context-delete]')){
   const menu=dialog.querySelector('.support-inbox-context-actions');
   menu.insertAdjacentHTML('afterbegin','<p role="alert">'+uiLeaf('messageDeletionUi.confirmClearSelf')+'</p>');
   const button=dialog.querySelector('[data-support-context-delete]');button.removeAttribute('data-support-context-delete');button.setAttribute('data-support-context-confirm','');
   place();
   dialog.querySelector('[data-support-context-cancel]').focus({preventScroll:true});return;
  }
  if(event.target.closest('[data-support-context-confirm]')){
   const id=trigger.dataset.supportThread;close();void onClear(id);
  }
 });
 const scroll=event=>{stopPress();if(!dialog.contains(event.target))place();},hidden=()=>{if(doc.hidden)close(false);},listeners=[
  [root,'pointerdown',down],[root,'pointermove',move],[root,'pointerup',stopPress],[root,'pointercancel',stopPress],
  [root,'contextmenu',context],[root,'keydown',keyboard],[root,'click',blockOpeningClick,true],
  [doc,'scroll',scroll,true],[doc,'visibilitychange',hidden],[win,'resize',place]
 ];
 for(const [target,type,handler,capture] of listeners)target.addEventListener(type,handler,capture);
 return{isOpen:()=>dialog.open,dispose(){close(false);for(const [target,type,handler,capture] of listeners)target.removeEventListener(type,handler,capture);dialog.remove();}};
}
function mountSupportComposer(root,footer,{form,owner=false,isActive,onViewport=()=>{}}){
 const panel=root.querySelector('.support-panel');
 const doc=root.ownerDocument,win=doc.defaultView,input=form?.querySelector('textarea'),send=form?.querySelector('button[type="submit"]');
 let disposed=false;const viewportCleanups=[];
 if(input){input.rows=1;input.setAttribute('placeholder',t('supportUi.message'));input.setAttribute('data-i18n-placeholder','supportUi.message');}
 if(send){send.classList.add('support-chat-send');send.setAttribute('aria-label',t('supportUi.send'));send.setAttribute('data-i18n-aria-label','supportUi.send');send.innerHTML='<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4 20-7ZM22 2 11 13"/></svg><span class="support-send-label">'+uiLeaf(owner?'supportUi.reply':'supportUi.send')+'</span>';}
 let restingHeight=win.innerHeight||800,viewportWidth=win.visualViewport?.width||win.innerWidth||0,keyboard=false,inputSignature=null;
 const fitInput=(height,focused)=>{if(!input||disposed)return;const minimum=focused?64:44,limit=Math.max(minimum,Math.min(144,Math.floor(height/4))),key=JSON.stringify([input.value,minimum,limit,viewportWidth]);if(key===inputSignature)return;inputSignature=key;const scroll=input.scrollTop;input.style.minHeight=minimum+'px';input.style.height='auto';const full=Math.max(minimum,input.scrollHeight);input.style.height=Math.min(limit,full)+'px';input.style.overflowY=full>limit?'auto':'hidden';if(full>limit)input.scrollTop=scroll;};
 viewportCleanups.push(bindSwipeMotion(panel,{win,canStart:()=>!disposed&&isActive()&&!doc.querySelector('dialog[open]')&&!doc.activeElement?.matches?.('input,textarea,select,[contenteditable="true"]'),swipeThreshold:{minDistance:48,maxDistance:100,distanceRatio:.18},canMove:direction=>direction===1,commit:()=>root.querySelector('[data-support-back]')?.click()}));doc.body.classList.add('support-conversation-open');const viewport=()=>{if(disposed)return;const visual=win.visualViewport,height=visual?.height||win.innerHeight||800,width=visual?.width||win.innerWidth||0,focused=doc.activeElement===input;if(Math.abs(width-viewportWidth)>2){viewportWidth=width;restingHeight=win.innerHeight||height;}if(!focused&&!keyboard)restingHeight=win.innerHeight||height;keyboard=!!input&&((win.navigator?.maxTouchPoints||0)>0||win.matchMedia?.('(pointer:coarse)')?.matches===true)&&(focused||keyboard)&&(visual?.scale||1)<=1.05&&Math.max(restingHeight,win.innerHeight||height)-height>100;root.toggleAttribute('data-support-keyboard',keyboard);fitInput(height,focused);root.style.setProperty('--support-chat-height',Math.round(height)+'px');root.style.setProperty('--support-chat-top',Math.max(0,Math.round(visual?.offsetTop||0))+'px');const footerHeight=footer.getBoundingClientRect?.().height;if(Number.isFinite(footerHeight)&&footerHeight>0)root.style.setProperty('--support-footer-height',Math.ceil(footerHeight)+'px');onViewport();};if(input){for(const event of ['input','focus','blur']){input.addEventListener(event,viewport);viewportCleanups.push(()=>input.removeEventListener(event,viewport));}}
 if(typeof win.ResizeObserver==='function'){const observer=new win.ResizeObserver(viewport);observer.observe(footer);viewportCleanups.push(()=>observer.disconnect());}
 for(const [target,event]of [[win,'resize'],[win.visualViewport,'resize'],[win.visualViewport,'scroll']]){target?.addEventListener?.(event,viewport);viewportCleanups.push(()=>target?.removeEventListener?.(event,viewport));}viewport();
 return{sync:viewport,dispose(){
  if(disposed)return;disposed=true;viewportCleanups.forEach(cleanup=>cleanup());
  doc.body.classList.remove('support-conversation-open');root.removeAttribute('data-support-keyboard');
  for(const prop of ['--support-chat-height','--support-chat-top','--support-footer-height'])root.style.removeProperty(prop);
 }};
}

export function mountOwnerSupportComposer(root,{recipient,actorId,isActive}){
 const panel=root.querySelector('.support-panel'),footer=root.querySelector('.support-chat-footer');
 root.classList.add('support-chat-shell','staff-cabinet');root.dataset.supportGrouped='true';
 panel.classList.add('staff-messenger');
 const status=panel.querySelector('[data-support-status]');
 if(status)footer.prepend(status);
 const composer=mountSupportComposer(root,footer,{form:footer.querySelector('form'),isActive});
 const theme=mountConversationTheme(root,{actorId,scope:'support:'+recipient.id,isActive});
 return{dispose(){
  composer.dispose();theme.dispose();panel.classList.remove('staff-messenger');
  delete root.dataset.supportGrouped;root.classList.remove('support-chat-shell','staff-cabinet');
 }};
}

export function mountSupportChatView(root,{data,actorId,owner,photoMarkup,onReply,onDelete,onClear,onNotice,onSource=null,onOpenProfile=null,setSharedTheme,isActive=()=>true}={}){
 const panel=root.querySelector('.support-panel'),log=root.querySelector('.support-messages'),doc=root.ownerDocument;
 if(!panel||!log)return null;
 root.classList.add('support-chat-shell','staff-cabinet');panel.classList.add('staff-messenger');log.setAttribute('role','log');log.setAttribute('aria-live','polite');log.setAttribute('aria-relevant','additions text');
 let current=data,disposed=false,signature=null,jump=null,translation=null,syncComposer=()=>{};const viewportCleanups=[];const tail=followMessageTail(log,{onFollowingChange:following=>{if(jump)jump.hidden=following&&!current.historyBefore;}});
 // Fade only a scrolled history edge, never the first message or fixed controls.
 const paintScrollEdge=()=>{if(!disposed&&data.conversationId)log.toggleAttribute('data-support-scrolled',log.scrollTop>1);};
 if(data.conversationId){log.addEventListener('scroll',paintScrollEdge,{passive:true});viewportCleanups.push(()=>{log.removeEventListener('scroll',paintScrollEdge);log.removeAttribute('data-support-scrolled');});}
 const author=message=>message.owner_reply?t('supportUi.supportReply'):owner?(current.thread.nickname||t('supportUi.user')):t('supportUi.you');
 const message=id=>{const m=current.messages.find(item=>item.id===id);return m?{...m,author_name:author(m)}:null;};
 const roomTheme=mountConversationTheme(root,{actorId,scope:'support:'+(data.conversationId||data.thread.user_id||data.thread.id),initialSharedTheme:data.sharedTheme,setSharedTheme,isActive:()=>!disposed&&isActive()});
 const profileThemeListeners=new Set();
 const synchronizeTheme=value=>{roomTheme.synchronize(value);for(const listen of profileThemeListeners)listen(value);};
 const profileTheme=setSharedTheme?{
  get initialSharedTheme(){return roomTheme.sharedTheme;},
  async setSharedTheme(theme,signal){const result=await setSharedTheme(theme,signal);if(!disposed&&isActive()&&!signal.aborted)synchronizeTheme(result);return result;},
  subscribe(listener){if(disposed)return()=>{};profileThemeListeners.add(listener);return()=>profileThemeListeners.delete(listener);},
 }:null;
 const actions=mountStaffMessageActions(panel,{onTheme:source=>roomTheme.open(source),actorId,getMessage:message,isActive:()=>!disposed&&isActive(),canReply:m=>(m?.thread_status||current.thread.status)!=='closed',getRoom:()=>({id:current.anchorId||current.thread.id,title:current.conversationId?(owner?current.thread.nickname:t('supportUi.support')):current.thread.subject,kind:'direct',canClearEveryone:current.canClearEveryone===true}),onReply,onDelete,onClear,onNotice,onMissingSource:onSource});
 const toolbar=root.querySelector('.support-actions'),button=doc.createElement('button');button.type='button';button.className='text-button support-chat-actions';button.innerHTML='<span aria-hidden="true">⋯</span>';button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-label',t('messageDeletionUi.chatActions'));toolbar?.append(button);button.onclick=()=>actions.openConversation(button);

 let history=null;
 if(data.conversationId){
  root.dataset.supportGrouped='true';root.querySelector('.support-heading')?.remove();
  const back=toolbar?.querySelector('[data-support-back]'),reload=toolbar?.querySelector('[data-support-reload]'),team=toolbar?.querySelector('[data-support-team]');
  toolbar?.classList.add('support-chat-header');translation=mountChatTranslation(log,toolbar,{actorId,isActive:()=>!disposed&&isActive()});if(back){back.classList.add('support-chat-back');back.setAttribute('aria-label',t('supportUi.allRequests'));back.textContent='‹';}
  const info=doc.createElement('div');info.className='support-chat-person';info.innerHTML='<strong dir="auto">'+(owner?esc(data.thread.nickname||t('supportUi.user')):uiLeaf('supportUi.support'))+'</strong>';const avatar=doc.createElement(owner&&onOpenProfile?'button':'span');avatar.className='support-inbox-avatar support-person-avatar';if(owner&&onOpenProfile){avatar.type='button';avatar.dataset.supportProfile='';avatar.setAttribute('aria-haspopup','dialog');avatar.setAttribute('aria-label',t('ownerUi.openProfile',{name:data.thread.nickname||t('supportUi.user')}));avatar.onclick=()=>{if(!disposed&&isActive())onOpenProfile({id:data.conversationId,nickname:current.thread.nickname},avatar,profileTheme);};}else avatar.setAttribute('aria-hidden','true');if(owner)avatar.dataset.memberAvatar=data.conversationId;avatar.textContent=owner?Array.from(data.thread.nickname||'?').slice(0,2).join('').toLocaleUpperCase(getLocale()):'S';toolbar?.insertBefore(avatar,info.isConnected?info:reload||button);const status=root.querySelector('[data-support-thread-status]');if(status)info.append(status);toolbar?.insertBefore(info,reload||button);
  if(reload){reload.setAttribute('aria-label',t('settingsExtra.update'));reload.textContent='↻';}
  if(team){const options=doc.createElement('div');options.className='support-chat-options';options.append(team);toolbar?.after(options);}
  // Keep status and case actions inside the bottom bar; transient notices must
  // not push the person header down or consume the safe area above it.
  const footer=doc.createElement('div');footer.className='support-chat-footer';
  for(const node of [...panel.children])if(node.matches('[data-support-status],[data-support-reply],.support-close,.support-case-closed'))footer.append(node);
  log.after(footer);
  const composer=mountSupportComposer(root,footer,{form:footer.querySelector('[data-support-reply]'),owner,isActive,onViewport:()=>{if(tail.isFollowing())tail.openLatest();}});
  syncComposer=composer.sync;viewportCleanups.push(composer.dispose);
  jump=doc.createElement('button');jump.type='button';jump.className='support-jump-latest';jump.dataset.supportHistoryLatest='';jump.textContent='↓';jump.setAttribute('aria-label',t('supportConversationUi.latestMessages'));jump.hidden=true;panel.append(jump);
  history=doc.createElement('div');history.className='support-history-toolbar';history.innerHTML='<button type="button" class="text-button" data-support-history-earlier>'+uiLeaf('supportConversationUi.earlierMessages')+'</button><button type="button" class="text-button" data-support-history-latest>'+uiLeaf('supportConversationUi.latestMessages')+'</button>';log.before(history);
 }
 function render(next){if(disposed)return;synchronizeTheme(next.sharedTheme);syncComposer();if(jump)jump.hidden=tail.isFollowing()&&!next.historyBefore;if(history){history.hidden=!next.next&&!next.historyBefore;history.querySelector('[data-support-history-earlier]').hidden=!next.next;history.querySelector('[data-support-history-latest]').hidden=!next.historyBefore;}const nextSignature=JSON.stringify({messages:next.messages,photos:(next.photos||[]).map(p=>({message_id:p.message_id,unavailable:!!p.unavailable})),videos:(next.media||[]).map(v=>({message_id:v.message_id,unavailable:!!v.unavailable})),awaiting:next.thread.awaiting_owner===true,waitingSince:next.thread.waiting_since,receiptVisible:next.thread.receipt_visible===true});const opening=signature===null||JSON.stringify(next.historyBefore)!==JSON.stringify(current.historyBefore);current=next;if(signature===nextSignature){for(const node of log.querySelectorAll('[data-message]')){const photos=(current.photos||[]).filter(p=>p.message_id===node.dataset.message&&!p.unavailable);[...node.querySelectorAll('.support-photo-item')].forEach((item,index)=>{const url=supportPhotoUrl(photos[index]?.url);if(url){item.querySelector('a').href=url;item.querySelector('[data-support-photo-save]')?.setAttribute('data-support-photo-save',url);}});const videoButton=node.querySelector('[data-support-media-play]'),videoUrl=supportMediaUrl((current.media||[]).find(v=>v.message_id===node.dataset.message)?.url);if(videoButton&&videoUrl)videoButton.dataset.supportMediaPlay=videoUrl;}return;}signature=nextSignature;actions.close({restore:false});const top=log.scrollTop,bottom=opening||tail.isFollowing()&&log.scrollHeight-log.clientHeight-top<70;
  log.innerHTML=current.messages.map((m,index)=>{const mine=m.author_id===actorId,q=m.reply,role=m.owner_reply?'supportUi.supportReply':owner?null:'supportUi.you';return (current.conversationId&&m.thread_id&&current.messages[index-1]?.thread_id!==m.thread_id?'<div class="support-case-divider"><span dir="auto">'+esc(m.thread_subject)+'</span></div>':'')+'<article class="staff-message support-chat-message'+(mine?' is-mine':'')+'" data-message="'+esc(m.id)+'"><div class="staff-bubble"><div class="staff-message-heading"><strong>'+(role?uiLeaf(role):esc(author(m)))+'</strong><button type="button" class="staff-message-actions" data-message-actions '+uiAttribute('messageDeletionUi.actions',{},'aria-label')+' aria-haspopup="dialog"><span aria-hidden="true">⋯</span></button></div>'+(q?(q.available?'<button type="button" class="staff-message-reply" data-reply-source="'+esc(q.id)+'" '+uiAttribute('messageDeletionUi.openSource',{},'aria-label')+'><strong>'+uiLeaf(q.owner_reply?'supportUi.supportReply':owner?'supportUi.user':'supportUi.you')+'</strong><span>'+esc(q.body)+'</span></button>':'<div class="staff-message-reply">'+uiLeaf('messageDeletionUi.unavailable')+'</div>'):'')+'<p dir="auto">'+messageTextMarkup(m.body)+'</p>'+photoMarkup(current,m.id)+'<time datetime="'+esc(m.created_at)+'" data-support-date data-support-date-format="time">'+esc(new Intl.DateTimeFormat(getLocale(),{hour:'2-digit',minute:'2-digit'}).format(new Date(m.created_at)))+'</time></div></article>';}).join('')+(!owner&&current.thread.awaiting_owner===true&&current.thread.status!=='closed'&&current.thread.receipt_visible===true?'<aside class="support-auto-reply"><strong>'+uiLeaf('supportConversationUi.autoTitle')+'</strong><p>'+uiLeaf('supportConversationUi.autoBody')+'</p></aside>':'');if(bottom)tail.openLatest();else log.scrollTop=top;paintScrollEdge();
  translation?.sync(current.messages,current.conversationId||current.thread.id);
 }
 const off=subscribeLanguage(()=>{if(!disposed){button.setAttribute('aria-label',t('messageDeletionUi.chatActions'));root.querySelector('.support-chat-send')?.setAttribute('aria-label',t('supportUi.send'));root.querySelector('[data-support-reply] textarea')?.setAttribute('placeholder',t('supportUi.message'));jump?.setAttribute('aria-label',t('supportConversationUi.latestMessages'));root.querySelector('.support-chat-back')?.setAttribute('aria-label',t('supportUi.allRequests'));root.querySelector('[data-support-reload]')?.setAttribute('aria-label',t('settingsExtra.update'));root.querySelector('[data-support-profile]')?.setAttribute('aria-label',t('ownerUi.openProfile',{name:current.thread.nickname||t('supportUi.user')}));}});render(data);paintScrollEdge();
 return{render,jumpToSource:id=>actions.jumpToSource(id),openLatest:()=>tail.openLatest(),close:()=>actions.close(),dispose(){if(disposed)return;disposed=true;translation?.dispose();viewportCleanups.forEach(fn=>fn());tail.dispose();off();actions.dispose();profileThemeListeners.clear();roomTheme.dispose();button.remove();panel.classList.remove('staff-messenger');delete root.dataset.supportGrouped;root.classList.remove('support-chat-shell','staff-cabinet');}};
}
