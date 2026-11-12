import{teamPreviewVerified,teamPreviewActor}from './team-preview-access.js';
import{mountTeamLearningDemo,stopTeamLearningDemo}from './team-learning-demo.js';
import{mountOwnerNativePreview,stopOwnerNativePreview,ownerNativeActive,preloadOwnerCourse}from './owner-learning-native.js';
import{validNativeProgress}from './owner-native-progress.js';
import{createOwnerFrameViewport}from './owner-frame-viewport.js';
import{ownerVerified,ownerPreviewAccessToken,verifyOwner,onOwnerChange}from './owner-auth.js';
import{claimPlayback}from './media-playback-focus.js';
export const preloadOwnerLearning=()=>preloadOwnerCourse();
const origin='https://desktop-jecm5lt.taila4556d.ts.net';
const entries=Object.freeze({
 'online-lessons':{title:'Онлайн-занятия',view:'lessons'},
 muallim:{title:'Муаллим Сани',view:'muallim'},
 'live-stream':{title:'Прямой эфир',view:'live-preview'}
});
const progressKey='salah:muallim-sani-progress';
const lessonIds=new Set(['letters','joining','fatha','kasra','damma','vowels','sukun','tanwin','madd','leen','shadda','hamza','article','pause','review']);
export function validOwnerCourseProgress(v){return Boolean(v&&typeof v==='object'&&!Array.isArray(v)&&v.version===1&&Object.keys(v).every(k=>['version','last','completed'].includes(k))&&(v.last===null||lessonIds.has(v.last))&&Array.isArray(v.completed)&&v.completed.length<=15&&new Set(v.completed).size===v.completed.length&&v.completed.every(id=>lessonIds.has(id)));}
const readProgress=()=>{try{const v=JSON.parse(localStorage.getItem(progressKey));return validOwnerCourseProgress(v)?v:null;}catch{return null;}};
const bookProgressKey='salah:muallim-book-progress';
export function validOwnerBookProgress(v){return Boolean(v&&typeof v==='object'&&!Array.isArray(v)&&v.version===1&&Object.keys(v).length===3&&Object.keys(v).every(k=>['version','bookId','page'].includes(k))&&typeof v.bookId==='string'&&/^[a-z0-9-]{8,64}$/.test(v.bookId)&&Number.isInteger(v.page)&&v.page>=1&&v.page<=88);}
const readBookProgress=()=>{try{const v=JSON.parse(localStorage.getItem(bookProgressKey));return validOwnerBookProgress(v)?v:null;}catch{return null;}};
const nativeProgressKey='salah:muallim-native-progress';
const readNativeProgress=()=>{try{const v=JSON.parse(localStorage.getItem(nativeProgressKey));return validNativeProgress(v)?v:null;}catch{return null;}};
let active=null;
export const ownerLearningBusy=()=>Boolean(active?.busy&&active.frame.isConnected);
export const canContinueOwnerPreview=()=>ownerNativeActive()||Boolean(active?.frame.isConnected);
export function stopOwnerLearningPreview(){stopOwnerNativePreview();stopOwnerFramePreview();stopTeamLearningDemo();}
function stopOwnerFramePreview(){
 if(!active)return;
 const previous=active;active=null;clearInterval(previous.timer);clearTimeout(previous.timeout);previous.stopAuth?.();previous.viewport?.dispose();window.removeEventListener('message',previous.listen);window.removeEventListener('visibilitychange',previous.foreground);
 try{previous.frame.contentWindow?.postMessage({type:'salah:owner-preview-leave',nonce:previous.nonce},origin);}catch{}
 previous.frame.remove();
}
export function mountOwnerLearningPreview(host,feature){
 const params=new URLSearchParams(location.hash.split('?')[1]||'');
 if(feature==='teacher-preview'||feature==='online-lessons'&&teamPreviewActor()?.owner===false){stopOwnerFramePreview();stopOwnerNativePreview();return mountTeamLearningDemo(host,feature);}
 stopTeamLearningDemo();
 // Administrator course reads do not create owner iframe sessions.
 if(feature==='muallim'&&teamPreviewVerified()&&teamPreviewActor()?.owner===false){stopOwnerFramePreview();return mountOwnerNativePreview(host,feature);}
 const sourceMode=feature==='muallim'&&(params.has('bookPage')||params.get('source')==='1'||params.get('practice')==='1');
 if(['muallim','live-stream'].includes(feature)&&!sourceMode){stopOwnerFramePreview();return mountOwnerNativePreview(host,feature);}
 stopOwnerNativePreview();
 const entry=Object.hasOwn(entries,feature)?entries[feature]:null;
 if(!entry||!ownerVerified()){stopOwnerLearningPreview();return false;}
 if(active?.feature===feature&&active.frame.isConnected)return true;
 stopOwnerLearningPreview();
 const nonce=crypto.randomUUID(),shell=document.createElement('section');shell.className='owner-learning-shell';shell.setAttribute('aria-busy','true');
 const back=document.createElement('a');back.href='#knowledge';back.className='alphabet-back';back.textContent='← Знания';
 const eyebrow=document.createElement('span');eyebrow.className='knowledge-eyebrow';eyebrow.textContent='ЗАКРЫТАЯ ПРОВЕРКА';
 const title=document.createElement('h1');title.textContent=entry.title;
 const status=document.createElement('p');status.className='owner-learning-status';status.setAttribute('role','status');status.textContent='Открываем раздел…';
 const frame=document.createElement('iframe');frame.className='owner-learning-frame';frame.title=entry.title+' · закрытая проверка';frame.hidden=true;
 frame.setAttribute('allow','camera; microphone; display-capture; fullscreen; clipboard-write; autoplay');
 frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-forms allow-presentation allow-popups allow-popups-to-escape-sandbox');
 frame.referrerPolicy='no-referrer';
 const sourceParams=new URLSearchParams();if(sourceMode){for(const key of ['bookPage','source','practice'])if(params.has(key))sourceParams.set(key,params.get(key));}
 frame.src=origin+'/embed#nonce='+nonce+'&view='+entry.view+(sourceParams.size?'&'+sourceParams:'');
 const retry=document.createElement('button');retry.type='button';retry.className='button secondary';retry.textContent='Повторить подключение';retry.hidden=true;
 const context={frame,nonce,feature,busy:false,ready:false,loaded:false,failed:false,tokenSending:false,timer:null,listen:null};active=context;
 const fail=message=>{if(active!==context)return;clearTimeout(context.timeout);context.failed=true;frame.hidden=true;shell.setAttribute('aria-busy','false');status.hidden=false;status.textContent=message;retry.hidden=false;};
 const expire=()=>{if(active!==context||context.loaded)return;if(document.hidden)return;fail(context.ready?'Не удалось подтвердить доступ. Повторите подключение.':'Сервис занятий сейчас не отвечает. Повторите подключение через несколько секунд.');};
 const wait=()=>{clearTimeout(context.timeout);if(active===context&&!context.loaded&&!context.failed)context.timeout=setTimeout(expire,20000);};
 context.foreground=()=>{if(!document.hidden)wait();};window.addEventListener('visibilitychange',context.foreground);
 retry.onclick=async()=>{
  if(!shell.isConnected||active&&active!==context||retry.disabled)return;retry.disabled=true;
  try{if(!ownerVerified())await verifyOwner({verifySession:true});if(!shell.isConnected||active&&active!==context)return;
   if(!ownerVerified()){status.textContent='Подтвердите вход в аккаунт владельца и откройте раздел ещё раз.';return;}
   stopOwnerLearningPreview();mountOwnerLearningPreview(host,feature);
  }catch{if(shell.isConnected)status.textContent='Не удалось подтвердить вход владельца. Попробуйте ещё раз.';}
  finally{retry.disabled=false;}
 };
 context.stopAuth=onOwnerChange(()=>{if(active===context&&!ownerVerified())stopOwnerLearningPreview();});
 context.viewport=createOwnerFrameViewport({notify:()=>{if(active===context)frame.contentWindow?.postMessage({type:'salah:owner-preview-viewport-ready',nonce},origin);}});

 wait();
 const token=async()=>{
  if(active!==context||document.hidden)return;
  if(context.tokenSending)return;context.tokenSending=true;
  try{
   // A foreground grant may age while iOS suspends the app. Revalidate it on
   // return; expiration of the UI cache alone must never terminate a lesson.
   if(!ownerVerified())await verifyOwner({verifySession:true});
   if(active!==context||!ownerVerified())return;
   const access=await ownerPreviewAccessToken();
   if(active!==context||!frame.isConnected||!ownerVerified())return;
   frame.contentWindow.postMessage({type:'salah:owner-preview-token',nonce,token:access,progress:readProgress(),bookProgress:readBookProgress(),nativeProgress:readNativeProgress()},origin);
  }catch{
   if(active===context){fail('Подтвердите вход в аккаунт владельца и повторите подключение.');stopOwnerFramePreview();}
  }finally{context.tokenSending=false;}
 };
 context.listen=event=>{
  if(active!==context||event.origin!==origin||event.source!==frame.contentWindow||event.data?.nonce!==nonce)return;
  const value=event.data;
  if(value.type==='salah:owner-preview-ready'){if(!context.ready){context.ready=true;context.failed=false;status.hidden=false;status.textContent='Подтверждаем доступ владельца…';shell.setAttribute('aria-busy','true');retry.hidden=true;wait();}void token();}
  else if(value.type==='salah:owner-preview-loaded'&&context.ready){context.loaded=true;context.failed=false;frame.hidden=false;shell.setAttribute('aria-busy','false');status.hidden=true;retry.hidden=true;clearTimeout(context.timeout);}
  else if(value.type==='salah:owner-preview-busy'&&typeof value.busy==='boolean'){context.busy=value.busy;if(value.busy)claimPlayback('owner-lesson');}
  else if(value.type==='salah:owner-preview-progress'&&validOwnerCourseProgress(value.value)){
   try{localStorage.setItem(progressKey,JSON.stringify(value.value));}catch{frame.contentWindow.postMessage({type:'salah:owner-preview-storage-error',nonce},origin);}
  }
  else if(value.type==='salah:owner-preview-focus'&&typeof value.focused==='boolean'){context.viewport.focus(value.focused);}
  else if(value.type==='salah:owner-preview-book-progress'&&validOwnerBookProgress(value.value)){
   try{localStorage.setItem(bookProgressKey,JSON.stringify(value.value));}catch{frame.contentWindow.postMessage({type:'salah:owner-preview-storage-error',nonce},origin);}
  }
  else if(value.type==='salah:owner-preview-native-progress'&&validNativeProgress(value.value)){
   try{localStorage.setItem(nativeProgressKey,JSON.stringify(value.value));}catch{frame.contentWindow.postMessage({type:'salah:owner-preview-storage-error',nonce},origin);}
  }
  else if(value.type==='salah:owner-preview-error'){context.loaded=false;fail('Не удалось открыть закрытый раздел. Проверьте вход владельца и повторите подключение.');}
  else if(value.type==='salah:owner-preview-navigate'&&['#knowledge','#knowledge?view=alphabet','#knowledge?preview=muallim'].includes(value.hash)){location.hash=value.hash;}
 };
 window.addEventListener('message',context.listen);
 context.timer=setInterval(()=>{if(!document.hidden&&context.loaded)void token();},20000);
 frame.addEventListener('error',()=>{context.loaded=false;fail('Сервис занятий сейчас недоступен. Повторите подключение через несколько секунд.');});
 shell.append(back,eyebrow,title,status,retry,frame);host.replaceChildren(shell);return true;
}

