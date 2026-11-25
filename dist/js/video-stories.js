import {esc,modal,uiLeaf} from './ui.js';
import {getLocale,t,translateUi,subscribeLanguage} from './i18n.js';
import {OWNER_PROJECT_URL,OWNER_PUBLIC_KEY,ownerVerified,ownerPreviewAccessToken,verifyOwner,onOwnerChange,accountAuthClient} from './owner-auth.js';
import {claimPlayback,registerPlayback} from './media-playback-focus.js';
import {setForegroundAudio} from './audio-focus.js';
import {createPlayerWindowHistory} from './quran-player-navigation.js';

import {personalDataAllowed} from './audience.js';

const endpoint=OWNER_PROJECT_URL+'/functions/v1/video-stories';
const validId=value=>typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);
const storyItem=item=>validId(item?.id)&&Number.isFinite(Date.parse(item.expiresAt))&&Number.isFinite(Date.parse(item.publishedAt))&&typeof item.highlighted==='boolean';
const accept='video/mp4,video/quicktime,.mp4,.mov';
const storyKey=key=>'videoStories.'+key;
const word=key=>t(storyKey(key));
const leaf=key=>uiLeaf(storyKey(key));
const seenKey='salah:video-stories-seen';
const seenHere=new Set();
function seenStories(){
 try{const stored=JSON.parse(window.localStorage.getItem(seenKey)||'[]');if(Array.isArray(stored))for(const id of stored.slice(-100))if(validId(id))seenHere.add(id);}catch{}
 return seenHere;
}
function rememberStory(id){
 const seen=seenStories();if(seen.has(id))return;
 seen.add(id);
 const recent=[...seen].slice(-100);
 for(const old of seen)if(!recent.includes(old))seen.delete(old);
 try{window.localStorage.setItem(seenKey,JSON.stringify(recent));}catch{}
 window.dispatchEvent(new window.Event('salah:video-story-seen'));
}
const activeStories=items=>items.filter(item=>Date.parse(item.expiresAt)>Date.now());

function clipType(file){
 const type=file.type?.split(';')[0].toLowerCase();
 if(['video/mp4','video/quicktime'].includes(type))return type;
 if(/\.mp4$/i.test(file.name))return 'video/mp4';
 return /\.mov$/i.test(file.name)?'video/quicktime':null;
}

function newDraftId(){
 const bytes=crypto.getRandomValues(new Uint8Array(16));
 bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
 const hex=Array.from(bytes,byte=>byte.toString(16).padStart(2,'0')).join('');
 return [hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),hex.slice(16,20),hex.slice(20)].join('-');
}

function mediaAddress(value){
 const url=new URL(value,OWNER_PROJECT_URL);
 if(url.origin!==new URL(OWNER_PROJECT_URL).origin||!url.pathname.startsWith('/storage/v1/object/sign/salah-video-stories/'))throw Error('unavailable');
 return url.href;
}

async function api(params={},options={}){
 const {method='GET',body,contentType,poll,owner=false,engagement=false,expectedActor=null,signal}=options;
 const timeout=AbortSignal.timeout(method==='POST'?90000:15000);
 const requestSignal=signal&&AbortSignal.any?AbortSignal.any([signal,timeout]):signal||timeout;
 const headers={apikey:OWNER_PUBLIC_KEY};
 if(owner){
  if(!ownerVerified()&&!await verifyOwner())throw Error('owner');
  headers.Authorization='Bearer '+await ownerPreviewAccessToken();
 }
 if(engagement&&!owner){
  let session;
  if(personalDataAllowed()){try{session=(await accountAuthClient().auth.getSession()).data?.session;}catch{}}
  if(method!=='GET'&&session?.user?.id!==expectedActor)throw Error('sign_in');
  if(session?.access_token)headers.Authorization='Bearer '+session.access_token;
  else if(method!=='GET')throw Error('sign_in');
 }
 if(requestSignal.aborted)throw Error('closed');
 if(poll)headers['X-Salah-Story-Poll']=encodeURIComponent(JSON.stringify(poll));
 if(contentType)headers['Content-Type']=contentType;
 const response=await fetch(endpoint+'?'+new URLSearchParams(params),{
  method,headers,body,signal:requestSignal,cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',redirect:'error',
 });
 if(!response.ok)throw Error((await response.json().catch(()=>null))?.error||'unavailable');
 return response.json();
}


const reactions = ['🤲', '❤️', '👍', '✨'];

function pollFields(){
 return '<details data-story-poll-draft><summary>'+leaf('addPoll')+'</summary>'+
  '<input name="pollQuestion" maxlength="120" data-i18n-aria-label="videoStories.pollQuestion" data-i18n-placeholder="videoStories.pollQuestion">'+
  [1,2,3,4].map(number=>'<input name="pollChoice'+number+'" maxlength="60" data-i18n-aria-label="videoStories.pollChoice'+number+'" data-i18n-placeholder="videoStories.pollChoice'+number+'">').join('')+
  '</details>';
}

function engagementMarkup(){
 return '<div class="video-story-engagement" data-story-engagement hidden>'+
  '<section class="video-story-responses" data-story-responses hidden></section>'+
  '<div class="video-story-actions">'+
  '<button type="button" data-story-action="comment" aria-expanded="false">'+leaf('comment')+'</button>'+
  '<button type="button" data-story-action="react" aria-expanded="false" data-i18n-aria-label="videoStories.react">☺</button>'+
  '<button type="button" data-story-action="like" aria-pressed="false" data-i18n-aria-label="videoStories.like"><span aria-hidden="true">♡</span> <span data-story-like-count></span></button>'+
  '<button type="button" data-story-action="poll" aria-expanded="false" hidden>'+leaf('poll')+'</button>'+
  '</div><p data-story-engagement-status role="status"></p></div>';
}

function watchStoryAccount(change){
 if(!personalDataAllowed())return ()=>{};
 const {data}=accountAuthClient().auth.onAuthStateChange((event,session)=>{
  if(event==='INITIAL_SESSION'||event==='SIGNED_IN'||event==='SIGNED_OUT'||event==='USER_UPDATED')change(session?.user?.id||null);
 });
 return ()=>data.subscription.unsubscribe();
}

export function videoStoriesMarkup(){
 return '<div class="video-stories"><div data-story-list><div class="modal-head"><h2 tabindex="-1" autofocus>'+leaf('title')+'</h2><button type="button" class="text-button" data-close>'+uiLeaf('common.close')+'</button></div>'+
  '<p class="muted" role="status" data-story-status></p><div class="video-story-feed" data-story-feed></div>'+
  '<section data-story-owner hidden><h3>'+leaf('newStory')+'</h3><p class="muted">'+leaf('limits')+'</p><div class="video-story-inputs">'+
  '<label class="button secondary video-story-file">'+leaf('record')+'<input type="file" accept="video/*" capture="user" data-story-input></label>'+
  '<label class="button secondary video-story-file">'+leaf('choose')+'<input type="file" accept="'+accept+'" data-story-input></label></div>'+
  '<form class="video-story-form" data-story-form hidden><video controls playsinline preload="metadata"></video><label>'+leaf('duration')+' <select name="hours"><option value="24" data-i18n="videoStories.oneDay">'+esc(word('oneDay'))+'</option><option value="48" data-i18n="videoStories.twoDays">'+esc(word('twoDays'))+'</option></select></label>'+
  '<label><input type="checkbox" name="highlight"> '+leaf('addHighlight')+'</label>'+pollFields()+'<div class="button-row"><button class="button" type="submit" disabled>'+leaf('publish')+'</button>'+
  '<button class="text-button" type="button" data-story-discard>'+uiLeaf('common.cancel')+'</button></div></form>'+
  '<p class="muted" role="status" data-story-editor-status></p><div data-story-archive data-story-collection="archive"></div></section></div>'+
  '<section class="video-story-player" data-story-player data-i18n-aria-label="videoStories.title" hidden>'+
  '<video controls muted playsinline preload="metadata"></video><header class="video-story-player-head">'+
  '<div class="video-story-progress" data-story-progress aria-hidden="true"></div><div class="video-story-player-brand">'+
  '<img src="./icon-192.png" alt="" width="32" height="32"><div class="video-story-byline"><strong>SALAH</strong><time data-story-date></time></div>'+
  '<button type="button" class="video-story-player-button" data-story-sound data-i18n-aria-label="notifyUi.sound" aria-pressed="false"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m11 4-5 4H3v8h3l5 4V4Z"/><path class="video-story-sound-on" d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/><path class="video-story-sound-off" d="m16 9 5 6m0-6-5 6"/></svg></button>'+
  '<select class="video-story-rate" data-story-speed data-i18n-aria-label="videoStories.speed"><option value="0.75">0.75×</option><option value="1" selected>1×</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option><option value="2">2×</option></select>'+
  '<button type="button" class="video-story-player-button" data-story-close data-i18n-aria-label="common.close">×</button></div></header>'+
  '<button type="button" class="video-story-player-button video-story-prev" data-story-step="-1" data-i18n-aria-label="duaUi.previous">‹</button>'+
  '<button type="button" class="video-story-player-button video-story-next" data-story-step="1" data-i18n-aria-label="duaUi.next">›</button>'+
  '<p class="video-story-player-status" role="status" data-story-play-status></p>'+engagementMarkup()+'</section></div>';
}

export function mountVideoStories(root,{request=api,ownerAccess=ownerVerified,confirmAccess=verifyOwner,observeAccess=onOwnerChange,resolveMedia=mediaAddress,watchActor=watchStoryAccount,openStories=null}={}){
 const life=new AbortController(),signal=life.signal,dialog=root.closest('dialog');
 const get=selector=>root.querySelector(selector),list=get('[data-story-list]'),feed=get('[data-story-feed]'),archive=get('[data-story-archive]'),
  editor=get('[data-story-owner]'),form=get('[data-story-form]'),preview=form.querySelector('video'),playback=get('[data-story-player]'),player=playback.querySelector('video'),
  status=get('[data-story-status]'),editorStatus=get('[data-story-editor-status]'),publish=form.querySelector('[type="submit"]'),discard=form.querySelector('[data-story-discard]'),
  playStatus=get('[data-story-play-status]'),progress=get('[data-story-progress]'),storyDate=get('[data-story-date]'),closeViewer=get('[data-story-close]'),
  previous=get('[data-story-step="-1"]'),next=get('[data-story-step="1"]'),sound=get('[data-story-sound]'),speed=get('[data-story-speed]');
 const inputs=[...root.querySelectorAll('[data-story-input]')];
 let items=[],owned=[],draft=null,draftUrl=null,validDraft=false,publishing=false,loaded=false,owner=false,requestId=0,playId=0,nextExpiry=Infinity;
 let viewer=null;
 const viewerHistory=createPlayerWindowHistory({win:window,historyKey:'salahStoryViewer',dismiss:()=>stopViewer()});
 const alive=()=>!signal.aborted&&root.isConnected;

 const engagement=get('[data-story-engagement]'), responses=get('[data-story-responses]'), engagementStatus=get('[data-story-engagement-status]');
 const responseButtons=Object.fromEntries([...engagement.querySelectorAll('[data-story-action]')].map(button=>[button.dataset.storyAction,button]));
 const pollDraft=form.querySelector('[data-story-poll-draft]'), pollInputs=[...pollDraft.querySelectorAll('input')];
 let social=null,responsePanel=null,responseText='',commentAttempt=null,socialPending=false,actor=null,actorEpoch=0;
 let resumeAfterPanel=false;
 const engagementParams=()=>({
  engagement:'1',id:viewer.queue[viewer.index].id,...(viewer.collection==='archive'?{archive:'1'}:{})
 });
 function clearEngagement(){
  social=null;responsePanel=null;responseText='';commentAttempt=null;socialPending=false;resumeAfterPanel=false;
  responses.replaceChildren();responses.hidden=true;engagement.hidden=true;engagementStatus.textContent='';
 }
 function renderEngagement(){
  if(!social||!viewer)return;
  const isArchive=viewer.collection==='archive';
  engagement.hidden=false;
  responseButtons.like.hidden=isArchive;
  responseButtons.poll.hidden=!social.poll;
  responseButtons.comment.setAttribute('aria-expanded',String(responsePanel==='comment'));
  responseButtons.react.setAttribute('aria-expanded',String(responsePanel==='react'));
  responseButtons.poll.setAttribute('aria-expanded',String(responsePanel==='poll'));
  responseButtons.like.setAttribute('aria-pressed',String(social.liked));
  responseButtons.like.firstElementChild.textContent=social.liked?'♥':'♡';
  get('[data-story-like-count]').textContent=social.likes||'';
  responseButtons.react.textContent=social.reaction||'☺';
  responses.hidden=!responsePanel;
  if(!responsePanel){responses.replaceChildren();return;}
  const close='<button type="button" class="video-story-responses-close" data-story-response-close data-i18n-aria-label="common.close">×</button>';
  if(responsePanel==='react'){
   responses.innerHTML=close+'<div class="video-story-reactions">'+reactions.map(reaction=>
    '<button type="button" data-story-reaction="'+reaction+'" aria-pressed="'+String(social.reaction===reaction)+'"'+(isArchive?' disabled':'')+'>'+
     reaction+(social.reactionCounts?.[reaction]?'<small>'+esc(String(social.reactionCounts[reaction]))+'</small>':'')+'</button>'
   ).join('')+'</div>';
  }else if(responsePanel==='poll'&&social.poll){
   responses.innerHTML=close+'<h3 dir="auto">'+esc(social.poll.question)+'</h3><div class="video-story-poll-options">'+
    social.poll.choices.map((choice,index)=>{
     const count=social.counts?.[index]||0;
     return '<button type="button" data-story-vote="'+index+'" aria-pressed="'+String(social.vote===index)+'"'+
      (social.vote!==null||isArchive?' disabled':'')+'><span>'+esc(choice)+'</span><span>'+esc(String(count))+'</span></button>';
    }).join('')+'</div>';
  }else if(responsePanel==='comment'){
   responses.innerHTML=close+'<h3>'+leaf(isArchive?'comment':'privateComment')+'</h3>'+
    (social.comments.length?'<ul class="video-story-comments">'+social.comments.map(comment=>'<li dir="auto">'+esc(comment.body)+'</li>').join('')+'</ul>':'')+
    (isArchive?'':'<form data-story-comment-form><textarea dir="auto" data-story-comment-text maxlength="500" rows="2" required data-i18n-aria-label="videoStories.comment" data-i18n-placeholder="videoStories.comment">'+esc(responseText)+'</textarea><button type="submit">'+leaf('sendComment')+'</button></form>');
  }
  translateUi(responses);
 }
 async function loadEngagement(){
  if(!viewer)return;
  const step=playId,account=actorEpoch,params=engagementParams();
  try{
   const nextState=await request(params,{owner:params.archive==='1',engagement:true,signal});
   if(!alive()||step!==playId||account!==actorEpoch)return;
   if(!nextState||!Number.isInteger(nextState.likes)||!Array.isArray(nextState.comments))throw Error('unavailable');
   social=nextState;renderEngagement();
  }catch{if(alive()&&step===playId&&account===actorEpoch)engagement.hidden=true;}
 }
 function showResponsePanel(panel){
  const focusBack=responsePanel&&responseButtons[responsePanel];
  if(panel&&responsePanel===null){resumeAfterPanel=!player.paused;player.pause();}
  responsePanel=panel;engagementStatus.textContent='';renderEngagement();
  if(panel)responses.querySelector('[data-story-response-close]')?.focus();
  else{
   focusBack?.focus();
   if(resumeAfterPanel)void player.play().catch(()=>{});
   resumeAfterPanel=false;
  }
 }
 async function saveResponse(change){
  if(!viewer||!social||socialPending)return;
  const step=playId,account=actorEpoch,params=engagementParams();
  const current=()=>alive()&&step===playId&&account===actorEpoch;
  socialPending=true;engagementStatus.textContent='';
  try{
   const nextState=await request(params,{method:'POST',body:JSON.stringify(change),contentType:'application/json',engagement:true,expectedActor:actor,signal});
   if(!current())return;
   if(!nextState||!Array.isArray(nextState.comments))throw Error('unavailable');
   social=nextState;
   if(change.action==='comment'){
    if(responseText.trim()===change.text)responseText='';
    commentAttempt=null;
   }
   const focused=document.activeElement;
   const control=focused?.dataset?.storyReaction!==undefined?'react':focused?.dataset?.storyVote!==undefined?'poll':null;
   renderEngagement();
   if(control)responses.querySelector('[data-story-response-close]')?.focus();
   if(change.action==='comment'){
    engagementStatus.textContent=word('commentSent');
    responses.querySelector('[data-story-comment-text]')?.focus();
   }
  }catch(error){
   if(!current())return;
   engagementStatus.textContent=word(error.message==='sign_in'?'signIn':error.message==='comment_limit'?'commentLimit':'sendFailed');
  }finally{if(current())socialPending=false;}
 }
 engagement.addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button||button.disabled||!social)return;
  const {storyAction,storyReaction,storyVote,storyResponseClose}=button.dataset;
  if(storyResponseClose!==undefined){showResponsePanel(null);return;}
  if(storyAction==='like'){void saveResponse({action:'like',value:!social.liked});return;}
  if(storyAction){showResponsePanel(responsePanel===storyAction?null:storyAction);return;}
  if(storyReaction){void saveResponse({action:'react',value:social.reaction===storyReaction?null:storyReaction});return;}
  if(storyVote!==undefined)void saveResponse({action:'vote',value:Number(storyVote)});
 },{signal});
 engagement.addEventListener('input',event=>{
  if(event.target.matches('[data-story-comment-text]'))responseText=event.target.value;
 },{signal});
 engagement.addEventListener('submit',event=>{
  event.preventDefault();
  const text=responseText.trim();if(!text||socialPending)return;
  if(commentAttempt?.text!==text)commentAttempt={action:'comment',text,id:newDraftId()};
  void saveResponse(commentAttempt);
 },{signal});
 const stopActor=watchActor(nextActor=>{
  if(nextActor===actor)return;
  actor=nextActor;if(!viewer)return;
  actorEpoch++;clearEngagement();void loadEngagement();
 });

 const mediaOwner={},videos=[player,preview],pauseVideos=()=>videos.forEach(video=>video.pause());
 const unregisterPlayback=registerPlayback(mediaOwner,pauseVideos);
 const audible=video=>!video.paused&&!video.ended&&!video.muted&&video.volume>0;
 const updateAudio=()=>setForegroundAudio(mediaOwner,videos.some(audible));
 for(const video of videos){
  const updatePlaying=()=>{if(audible(video))claimPlayback(mediaOwner);updateAudio();};
  video.addEventListener('play',()=>{for(const other of videos)if(other!==video)other.pause();updatePlaying();},{signal});
  video.addEventListener('volumechange',updatePlaying,{signal});
  for(const name of ['pause','ended','error'])video.addEventListener(name,updateAudio,{signal});
 }
 const date=item=>new Intl.DateTimeFormat(getLocale(),{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(item.publishedAt));
 const storyButton=item=>'<button type="button" class="video-story-circle" data-story-play="'+esc(item.id)+'"><span aria-hidden="true">▷</span><small>'+esc(date(item))+'</small></button>';

 function render(){
  if(!alive())return;
  const active=activeStories(items),highlights=items.filter(item=>item.highlighted);
  nextExpiry=Math.min(Infinity,...active.map(item=>Date.parse(item.expiresAt)));
  feed.innerHTML=(active.length?'<div class="video-story-row" data-story-collection="active">'+active.map(storyButton).join('')+'</div>':'')+
   (highlights.length?'<h3>'+leaf('highlights')+'</h3><div class="video-story-row" data-story-collection="highlights">'+highlights.map(storyButton).join('')+'</div>':'');
  if(loaded&&!active.length&&!highlights.length&&status.dataset.loadError!=='1')status.textContent=word('empty');
  else if(loaded&&status.dataset.loadError!=='1')status.textContent='';
  archive.innerHTML=owner&&owned.length?'<h3>'+leaf('archive')+'</h3>'+owned.map(item=>'<div class="video-story-archive-row">'+
   '<button type="button" class="text-button" data-story-play="'+esc(item.id)+'" data-archive="1">'+esc(date(item))+'</button><button type="button" class="text-button" data-story-highlight="'+esc(item.id)+'" aria-pressed="'+item.highlighted+'">'+leaf(item.highlighted?'unpin':'addHighlight')+'</button><button type="button" class="text-button" data-story-remove="'+esc(item.id)+'">'+leaf('remove')+'</button></div>').join(''):'';
  translateUi(root);
 }

 async function refresh(){
  const token=++requestId;
  try{
   const result=await request({},{signal});
   if(!alive()||token!==requestId)return;
   if(!Array.isArray(result.items))throw Error('unavailable');
   items=result.items.filter(storyItem);loaded=true;delete status.dataset.loadError;render();
  }catch{if(alive()&&token===requestId){status.dataset.loadError='1';status.textContent=word('loadFailed');}}
  if(!alive()||token!==requestId||!owner)return;
  try{
   const result=await request({archive:'1'},{owner:true,signal});
   if(alive()&&token===requestId&&owner&&Array.isArray(result.items)){owned=result.items.filter(storyItem);render();}
  }catch{if(alive()&&owner&&token===requestId)editorStatus.textContent=word('loadFailed');}
 }

 function syncOwner(){
  const allowed=ownerAccess();if(!alive()||allowed===owner)return;
  owner=allowed;editor.hidden=!owner;
  if(!owner){if(viewer?.collection==='archive')closePlayback();owned=[];resetDraft();render();}
  void refresh();
 }

 function resetDraft(){
  validDraft=false;draft=null;preview.pause();preview.removeAttribute('src');preview.load();
  if(draftUrl)URL.revokeObjectURL(draftUrl);
  draftUrl=null;form.hidden=true;publish.disabled=true;
  form.elements.hours.disabled=false;form.elements.highlight.disabled=false;
  for(const input of pollInputs){input.disabled=false;input.value='';}
  pollDraft.open=false;
 }

 for(const input of inputs)input.onchange=()=>{
  const file=input.files?.[0];input.value='';
  if(!owner||publishing||!file)return;
  const type=clipType(file);
  if(!type){editorStatus.textContent=word('format');return;}
  if(file.size<16||file.size>24*1024*1024){editorStatus.textContent=word('size');return;}
  resetDraft();draft={file,type,id:null,options:null};
  draftUrl=URL.createObjectURL(file);preview.src=draftUrl;form.hidden=false;editorStatus.textContent='';
 };
 preview.onloadedmetadata=()=>{
  validDraft=!!draft&&Number.isFinite(preview.duration)&&preview.duration>0&&preview.duration<=60.5;
  publish.disabled=publishing||!validDraft;
  if(!validDraft)editorStatus.textContent=word('length');
 };
 preview.onerror=()=>{if(draft){validDraft=false;publish.disabled=true;editorStatus.textContent=word('format');}};
 discard.onclick=()=>{if(!publishing){resetDraft();editorStatus.textContent='';}};

 form.onsubmit=async event=>{
  event.preventDefault();if(!owner||!draft||!validDraft||publishing)return;
  const current=draft,hours=form.elements.hours.value,highlight=form.elements.highlight.checked?'1':'0';
  const [question,...choices]=pollInputs.map(input=>input.value.trim());
  const answers=choices.filter(Boolean);
  const poll=question||answers.length?{question,choices:answers}:null;
  if(poll&&(!question||answers.length<2||new Set(answers).size!==answers.length)){editorStatus.textContent=word('invalidPoll');return;}
  const options=JSON.stringify({hours,highlight,poll});
  if(current.options!==options){current.options=options;current.id=newDraftId();}
  publishing=true;publish.disabled=true;discard.disabled=true;
  // A response can be lost after the server publishes. All retries of this
  // draft use the same ID and options until the owner discards the draft.
  form.elements.hours.disabled=true;form.elements.highlight.disabled=true;for(const input of pollInputs)input.disabled=true;editorStatus.textContent=word('sending');
  try{
   const result=await request({id:current.id,hours,highlight},{method:'POST',body:current.file,contentType:current.type,poll,owner:true,signal});
   if(!alive()||draft!==current)return;
   if(!storyItem(result.item)||result.item.id!==current.id)throw Error('unavailable');
   resetDraft();editorStatus.textContent=word('published');void refresh();
  }catch{if(alive()&&draft===current)editorStatus.textContent=word('sendFailed');}
  finally{publishing=false;if(alive()){publish.disabled=!validDraft;discard.disabled=false;}}
 };

 function resetPlayer(){playId++;clearEngagement();player.pause();player.removeAttribute('src');player.load();}

 function stopViewer(){
  if(!viewer)return;
  const {collection,origin,scrollTop}=viewer;
  viewer=null;resetPlayer();playback.hidden=true;list.hidden=false;
  if(!alive())return;
  if(openStories&&dialog?.open){dialog.close();return;}
  const originButton=root.querySelector('[data-story-collection="'+collection+'"] [data-story-play="'+origin+'"]');
  (originButton||list.querySelector('h2')).focus({preventScroll:true});
  if(dialog)dialog.scrollTop=scrollTop;
 }

 function closePlayback(){viewerHistory.close();stopViewer();}

 async function playStory(index){
  if(!viewer)return;
  const item=viewer.queue[index];if(!item)return;
  const fromArchive=viewer.collection==='archive';
  viewer.index=index;resetPlayer();const token=playId;
  void loadEngagement();
  progress.replaceChildren(...viewer.queue.map((_,position)=>{
   const bar=document.createElement('progress');bar.max=1;bar.value=Number(position<index);return bar;
  }));
  const focused=document.activeElement;
  previous.disabled=index===0;next.disabled=index===viewer.queue.length-1;
  if((focused===previous&&previous.disabled)||(focused===next&&next.disabled))closeViewer.focus();
  storyDate.dateTime=item.publishedAt;storyDate.textContent=date(item);playStatus.textContent=word('loading');
  try{
   const {url}=await request({id:item.id,...(fromArchive?{archive:'1'}:{})},{owner:fromArchive,signal});
   if(!alive()||token!==playId)return;
   player.src=resolveMedia(url);playStatus.textContent='';
   if(responsePanel)resumeAfterPanel=true;
   else void player.play().catch(()=>{});
  }catch{if(alive()&&token===playId)playStatus.textContent=word('playFailed');}
 }

 function openViewer(collection,origin){
  const queue=collection==='archive'?owned:collection==='highlights'?items.filter(item=>item.highlighted):activeStories(items);
  const index=queue.findIndex(item=>item.id===origin);
  if(index<0)return;
  viewer={queue,index,collection,origin,scrollTop:dialog?.scrollTop||0};
  player.muted=true;syncSound();
  playback.hidden=false;list.hidden=true;closeViewer.focus();viewerHistory.open();
  void playStory(index);
 }

 root.addEventListener('click',async event=>{
  const button=event.target.closest('button');if(!button||button.disabled)return;
  const {storyPlay,storyHighlight,storyRemove,storyStep,storyClose}=button.dataset;
  if(storyClose!==undefined){closePlayback();return;}
  if(viewer&&storyStep){void playStory(viewer.index+Number(storyStep));return;}
  if(storyPlay){
   openViewer(button.closest('[data-story-collection]')?.dataset.storyCollection,storyPlay);
   return;
  }
  const id=storyHighlight||storyRemove;if(!owner||!id)return;
  const item=owned.find(story=>story.id===id);if(!item)return;
  if(storyRemove&&!window.confirm(word('removeConfirm')))return;
  button.disabled=true;
  try{
   const change=storyRemove?{remove:true}:{highlighted:!item.highlighted};
   const result=await request({id},{method:'PATCH',owner:true,signal,body:JSON.stringify(change),contentType:'application/json'});
   if(!alive())return;
   if(storyRemove?result.removed!==true:!storyItem(result.item))throw Error('unavailable');
   editorStatus.textContent='';void refresh();
  }catch{if(alive())editorStatus.textContent=word('sendFailed');}
  finally{if(button.isConnected)button.disabled=false;}
 },{signal});
 player.addEventListener('timeupdate',()=>{
  if(viewer&&Number.isFinite(player.duration)&&player.duration>0)progress.children[viewer.index].value=Math.min(1,player.currentTime/player.duration);
 },{signal});
 player.addEventListener('playing',()=>{if(viewer&&player.hasAttribute('src'))rememberStory(viewer.queue[viewer.index].id);},{signal});
 player.addEventListener('ended',()=>{
  if(!viewer||!player.hasAttribute('src'))return;
  if(viewer.index+1<viewer.queue.length)void playStory(viewer.index+1);
  else closePlayback();
 },{signal});
 function syncSound(){sound.setAttribute('aria-pressed',String(!player.muted&&player.volume>0));}
 sound.onclick=()=>{player.muted=!player.muted&&player.volume>0;if(!player.muted&&player.volume===0)player.volume=1;syncSound();};
 speed.onchange=()=>{player.defaultPlaybackRate=player.playbackRate=Number(speed.value);};
 player.addEventListener('volumechange',syncSound,{signal});
 player.onerror=()=>{if(viewer&&player.hasAttribute('src')&&alive())playStatus.textContent=word('playFailed');};
 playback.addEventListener('keydown',event=>{
  if(!viewer||engagement.contains(event.target)||event.target===player||event.target===speed)return;
  const step=event.key==='ArrowLeft'?-1:event.key==='ArrowRight'?1:0;
  if(step){event.preventDefault();void playStory(viewer.index+step);}
 },{signal});
 dialog?.addEventListener('cancel',event=>{
  if(!viewer)return;
  event.preventDefault();
  if(responsePanel)showResponsePanel(null);else closePlayback();
 },{signal});

 const stopLanguage=subscribeLanguage(render),stopOwner=observeAccess(syncOwner);
 const observer=new MutationObserver(()=>{if(!root.isConnected)dispose();});
 observer.observe(dialog?.querySelector('#modal-content')||root.parentNode,{childList:true,subtree:true});
 const refreshVisibility=()=>{if(!document.hidden&&alive())void refresh();};
 const timer=setInterval(()=>{if(alive()&&!document.hidden&&Date.now()>=nextExpiry)render();},15000);
 window.addEventListener('hashchange',dispose,{once:true});document.addEventListener('visibilitychange',refreshVisibility,{signal});
 dialog?.addEventListener('close',dispose,{once:true});
 function dispose(){
  if(signal.aborted)return;
  life.abort();observer.disconnect();clearInterval(timer);stopLanguage();stopOwner();stopActor();unregisterPlayback();setForegroundAudio(mediaOwner,false);
  viewerHistory.destroy();
  window.removeEventListener('hashchange',dispose);dialog?.removeEventListener('close',dispose);
  resetDraft();if(viewer)stopViewer();else resetPlayer();
 }
 if(ownerAccess())syncOwner();else{void refresh();void Promise.resolve().then(confirmAccess).then(syncOwner).catch(()=>{});}
 if(Array.isArray(openStories)){
  items=activeStories(openStories.filter(storyItem));
  const seen=seenStories(),story=items.find(item=>!seen.has(item.id))||items[0];
  if(story)openViewer('active',story.id);
 }
 return dispose;
}

export function showVideoStories(openStories=null){
 modal(videoStoriesMarkup());
 const root=document.querySelector('#modal-content .video-stories');
 if(root)mountVideoStories(root,{openStories});
}

let homeStories=[],homeFetched=0,pendingHomeStories=null;
function readHomeStories(){
 if(Date.now()-homeFetched<60000)return Promise.resolve(homeStories);
 if(!pendingHomeStories)pendingHomeStories=api().then(result=>{
  if(!Array.isArray(result.items))throw Error('unavailable');
  homeStories=result.items.filter(storyItem);homeFetched=Date.now();return homeStories;
 }).finally(()=>{pendingHomeStories=null;});
 return pendingHomeStories;
}

export function mountHomeVideoStories(slot){
 const life=new AbortController(),signal=life.signal;
 slot.innerHTML='<button type="button" data-i18n-aria-label="videoStories.title"><img width="28" height="28" src="./icon-192.png" alt=""></button>';
 const button=slot.firstElementChild;
 function paint(){
  if(signal.aborted||!slot.isConnected)return;
  const active=activeStories(homeStories),seen=seenStories(),unseen=active.some(item=>!seen.has(item.id));
  slot.hidden=!active.length;
  button.classList.toggle('is-unseen',unseen);
  button.dataset.i18nAriaLabel=storyKey(unseen?'unseen':'title');translateUi(slot);
 }
 function sync(){if(!document.hidden&&slot.isConnected){paint();void readHomeStories().then(paint).catch(()=>{});}}
 button.onclick=()=>{const active=activeStories(homeStories);if(active.length)showVideoStories(active);else paint();};
 document.addEventListener('visibilitychange',sync,{signal});
 window.addEventListener('salah:video-story-seen',paint,{signal});
 const timer=setInterval(sync,15000);
 sync();
 return ()=>{life.abort();clearInterval(timer);};
}
