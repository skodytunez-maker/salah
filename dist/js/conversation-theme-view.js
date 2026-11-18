import{CONVERSATION_THEMES,conversationTheme,themePreferenceKey,createThemePhotoStore,createThemePreferences}from './conversation-themes.js';
import{createOwnerCardHistory}from './owner-card-navigation.js';
import{loadDecodedImage}from './image-presentation.js';
import{staffIcon}from './staff-markup.js';
import{t,subscribeLanguage,translateUi}from './i18n.js';
import{uiLeaf,uiAttribute}from './ui.js';

// This controller changes only presentation. No request, participant or message
// is written, and each actor keeps an independent preference for each room.
export function mountConversationTheme(surface,{actorId,scope,isActive=()=>true,photos=null,loadImage=null}={}){
 const doc=surface.ownerDocument,win=doc.defaultView,key=themePreferenceKey(actorId,scope);
 if(!key)return{open(){},dispose(){}};
 let disposed=false,dialog=null,trigger=null,request=0,controller=null,ownedUrl=null,current={theme:'default'},pending=false;
 const live=()=>!disposed&&surface.isConnected&&isActive();
 let storage;try{storage=win.localStorage;}catch{storage={getItem:()=>null,setItem:()=>{throw Error('theme_storage_unavailable');}};}
 const sourceId=Date.now()+'-'+Math.random();
 const photoStore=photos||createThemePhotoStore(win);
 const prefs=createThemePreferences({storage,photos:photoStore,key,notify:()=>win.dispatchEvent(new win.CustomEvent('salah:conversation-theme',{detail:{key,sourceId}}))});
 const decode=loadImage||((src,signal)=>loadDecodedImage(src,{signal,createImage:()=>new win.Image()}));
 function cancel(){request++;controller?.abort();controller=null;pending=false;}
 function status(name,error=false){if(!dialog)return;const node=dialog.querySelector('[data-theme-status]');node.innerHTML=name?uiLeaf('conversationThemeUi.'+name):'';node.classList.toggle('is-error',error);}
 function selection(){if(!dialog)return;for(const b of dialog.querySelectorAll('[data-theme-choice]'))b.setAttribute('aria-pressed',String(b.dataset.themeChoice===current.theme));dialog.querySelector('[data-theme-photo]')?.setAttribute('aria-pressed',String(current.theme==='custom'));}
 function apply(value,url){
  const theme=conversationTheme(value.theme==='custom'?'ornament':value.theme);
  const previous=ownedUrl;ownedUrl=value.theme==='custom'?url:null;
  current=value;
  if(value.theme==='default'){surface.removeAttribute('data-conversation-theme');for(const name of ['image','base','panel','incoming','outgoing','accent'])surface.style.removeProperty('--conversation-theme-'+name);}
  else{surface.dataset.conversationTheme=value.theme;for(const name of ['base','panel','incoming','outgoing','accent'])surface.style.setProperty('--conversation-theme-'+name,theme[name]);surface.style.setProperty('--conversation-theme-image',url?'url("'+url+'")':'none');}
  if(previous&&previous!==ownedUrl)win.URL.revokeObjectURL(previous);selection();
 }
 async function prepare(value,signal,blob=null){
  if(value.theme==='default')return null;
  let url=conversationTheme(value.theme).wallpaper,owned=false;
  if(value.theme==='custom'){
   const file=blob||await prefs.photo(value);
   if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>25*1024*1024)throw Error('invalid_theme_photo');
   url=win.URL.createObjectURL(file);owned=true;
  }else url=new URL(url,doc.baseURI).href;
  try{const image=await decode(url,signal);if(signal.aborted)throw Error('cancelled');if(image.naturalWidth*image.naturalHeight>50000000||Math.min(image.naturalWidth,image.naturalHeight)<64)throw Error('invalid_theme_dimensions');return url;}
  catch(error){if(owned)win.URL.revokeObjectURL(url);throw error;}
 }
 async function change(value,{save=false,blob=null}={}){
  cancel();const ticket=request,abort=new win.AbortController();controller=abort;pending=true;if(save)status('loading');
  let url=null,applied=false;
  const valid=()=>live()&&request===ticket&&!abort.signal.aborted;
  try{
   url=await prepare(value,abort.signal,blob);if(!valid())return;
   if(save&&!await prefs.save(value,{blob,canCommit:valid}))return;
   if(!valid())return;
   apply(value,url);applied=true;if(save)status('saved');
  }catch(error){if(valid()){status('failed',true);if(!save)apply({theme:'default'},null);}}
  finally{if(value.theme==='custom'&&url&&!applied)win.URL.revokeObjectURL(url);if(request===ticket){pending=false;dialog?.removeAttribute('aria-busy');}}
 }
 function clearPicker({reload=true}={}){
  const resumeSaved=reload&&!!dialog&&pending;
  cancel();if(dialog){if(dialog.open)dialog.close();dialog.remove();dialog=null;}
  doc.body.classList.remove('conversation-theme-picker-open');if(trigger?.isConnected)trigger.focus({preventScroll:true});trigger=null;
  if(resumeSaved&&live())void change(prefs.read());
 }
 const history=createOwnerCardHistory({win,key:'salahConversationTheme',isActive:live,dismiss:clearPicker});
 function open(source){
  if(!live()||dialog)return;
  if(!history.open())return;trigger=source||doc.activeElement;
  dialog=doc.createElement('dialog');dialog.className='conversation-theme-picker';dialog.setAttribute('aria-label',t('conversationThemeUi.title'));
  dialog.innerHTML='<header><h2>'+uiLeaf('conversationThemeUi.title')+'</h2><button type="button" class="staff-icon-button" data-theme-close '+uiAttribute('common.back',{},'aria-label')+'>'+staffIcon('close')+'</button></header><p class="conversation-theme-hint">'+uiLeaf('conversationThemeUi.personal')+'</p><div class="conversation-theme-grid">'+CONVERSATION_THEMES.map(item=>'<button type="button" data-theme-choice="'+item.id+'" aria-pressed="false"><span class="conversation-theme-swatch" data-theme-swatch="'+item.id+'" aria-hidden="true">'+(item.wallpaper?'<img src="'+new URL(item.thumbnail,doc.baseURI).href+'" loading="lazy" decoding="async" alt="">':staffIcon('messages'))+'</span><span>'+uiLeaf(item.key)+'</span></button>').join('')+'</div><div class="conversation-theme-custom"><button type="button" class="button secondary" data-theme-photo>'+staffIcon('wallpaper')+uiLeaf('conversationThemeUi.custom')+'</button><input type="file" data-theme-file hidden accept="image/jpeg,image/png,image/webp"><p>'+uiLeaf('conversationThemeUi.photoHint')+'</p></div><p role="status" aria-live="polite" data-theme-status></p><button type="button" class="button" data-theme-done>'+uiLeaf('conversationThemeUi.done')+'</button>';
  surface.append(dialog);dialog.addEventListener('cancel',e=>{e.preventDefault();e.stopPropagation();history.back();});
  dialog.addEventListener('click',e=>{
   if(e.target===dialog||e.target.closest('[data-theme-close],[data-theme-done]')){history.back();return;}
   const choice=e.target.closest('[data-theme-choice]');if(choice){dialog.setAttribute('aria-busy','true');void change({theme:choice.dataset.themeChoice},{save:true});}
   if(e.target.closest('[data-theme-photo]'))dialog.querySelector('[data-theme-file]').click();
  });
  dialog.querySelector('[data-theme-file]').addEventListener('change',e=>{
   const file=e.target.files?.[0];e.target.value='';if(!file||!live())return;
   if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>25*1024*1024){status('invalidPhoto',true);return;}
   const id=win.crypto?.randomUUID?.()||Date.now()+'-'+Math.random().toString(36).slice(2);
   dialog.setAttribute('aria-busy','true');void change({theme:'custom',photo:id},{save:true,blob:file});
  });
  doc.body.classList.add('conversation-theme-picker-open');selection();dialog.showModal();dialog.querySelector('[data-theme-close]').focus({preventScroll:true});
 }
 const changed=e=>{if(live()&&((e.type==='storage'&&(e.key===key||e.key===null))||(e.type==='salah:conversation-theme'&&e.detail?.key===key&&e.detail?.sourceId!==sourceId)))void change(prefs.read());};
 const offLanguage=subscribeLanguage(()=>{if(dialog&&live()){dialog.setAttribute('aria-label',t('conversationThemeUi.title'));translateUi(dialog);}});
 win.addEventListener('storage',changed);win.addEventListener('salah:conversation-theme',changed);
 void change(prefs.read());
 return{open,dispose(){if(disposed)return;clearPicker({reload:false});history.dispose();disposed=true;offLanguage();win.removeEventListener('storage',changed);win.removeEventListener('salah:conversation-theme',changed);if(!photos)void prefs.settled().catch(()=>{}).finally(()=>photoStore.dispose());if(ownedUrl)win.URL.revokeObjectURL(ownedUrl);ownedUrl=null;surface.removeAttribute('data-conversation-theme');for(const name of ['image','base','panel','incoming','outgoing','accent'])surface.style.removeProperty('--conversation-theme-'+name);}};
}

export function conversationThemeButton(doc){const button=doc.createElement('button');button.type='button';button.className='staff-icon-button conversation-theme-button';button.setAttribute('aria-haspopup','dialog');button.innerHTML=staffIcon('wallpaper');button.setAttribute('aria-label',t('conversationThemeUi.title'));button.dataset.i18nAriaLabel='conversationThemeUi.title';return button;}
