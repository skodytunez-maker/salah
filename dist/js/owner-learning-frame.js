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
export function stopOwnerLearningPreview(){stopOwnerNativePreview();stopOwnerFramePreview();}
function stopOwnerFramePreview(){
 if(!active)return;
 const previous=active;active=null;clearInterval(previous.timer);clearTimeout(previous.timeout);previous.stopAuth?.();previous.viewport?.dispose();window.removeEventListener('message',previous.listen);
 try{previous.frame.contentWindow?.postMessage({type:'salah:owner-preview-leave',nonce:previous.nonce},origin);}catch{}
 previous.frame.remove();
}
export function mountOwnerLearningPreview(host,feature){
 const params=new URLSearchParams(location.hash.split('?')[1]||'');
 const sourceMode=feature==='muallim'&&(params.has('bookPage')||params.get('source')==='1'||params.get('practice')==='1');
 if(['muallim','live-stream'].includes(feature)&&!sourceMode){stopOwnerFramePreview();return mountOwnerNativePreview(host,feature);}
 stopOwnerNativePreview();
 const entry=Object.hasOwn(entries,feature)?entries[feature]:null;
 if(!entry||!ownerVerified()){stopOwnerLearningPreview();return false;}
 if(active?.feature===feature&&active.frame.isConnected)return true;
 stopOwnerLearningPreview();
 const nonce=crypto.randomUUID(),shell=document.createElement('section');shell.className='owner-learning-shell';
 const back=document.createElement('a');back.href='#knowledge';back.className='alphabet-back';back.textContent='← Знания';
 const eyebrow=document.createElement('span');eyebrow.className='knowledge-eyebrow';eyebrow.textContent='ЗАКРЫТАЯ ПРОВЕРКА';
 const title=document.createElement('h1');title.textContent=entry.title;
 const status=document.createElement('p');status.className='owner-learning-status';status.setAttribute('role','status');status.textContent='Открываем раздел…';
 const frame=document.createElement('iframe');frame.className='owner-learning-frame';frame.title=entry.title+' · закрытая проверка';
 frame.setAttribute('allow','camera; microphone; display-capture; fullscreen; clipboard-write; autoplay');
 frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-forms allow-presentation allow-popups allow-popups-to-escape-sandbox');
 frame.referrerPolicy='no-referrer';
 const sourceParams=new URLSearchParams();if(sourceMode){for(const key of ['bookPage','source','practice'])if(params.has(key))sourceParams.set(key,params.get(key));}
 frame.src=origin+'/embed#nonce='+nonce+'&view='+entry.view+(sourceParams.size?'&'+sourceParams:'');
 const retry=document.createElement('button');retry.type='button';retry.className='button secondary';retry.textContent='Повторить подключение';retry.hidden=true;retry.onclick=()=>{stopOwnerLearningPreview();mountOwnerLearningPreview(host,feature);};
 const context={frame,nonce,feature,busy:false,ready:false,tokenSending:false,timer:null,listen:null};active=context;
 context.stopAuth=onOwnerChange(()=>{if(active===context&&!ownerVerified())stopOwnerLearningPreview();});
 context.viewport=createOwnerFrameViewport({notify:()=>{if(active===context)frame.contentWindow?.postMessage({type:'salah:owner-preview-viewport-ready',nonce},origin);}});

 context.timeout=setTimeout(()=>{if(active===context){status.hidden=false;status.textContent='Не удалось подключить закрытый раздел. Проверьте соединение и попробуйте ещё раз.';retry.hidden=false;}},12000);
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
   if(active===context){status.textContent='Подтвердите вход в аккаунт владельца и откройте раздел ещё раз.';stopOwnerLearningPreview();}
  }finally{context.tokenSending=false;}
 };
 context.listen=event=>{
  if(active!==context||event.origin!==origin||event.source!==frame.contentWindow||event.data?.nonce!==nonce)return;
  const value=event.data;
  if(value.type==='salah:owner-preview-ready'){context.ready=true;status.textContent='Подтверждаем доступ владельца…';void token();}
  else if(value.type==='salah:owner-preview-loaded'){status.hidden=true;retry.hidden=true;clearTimeout(context.timeout);}
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
  else if(value.type==='salah:owner-preview-error'){status.hidden=false;status.textContent='Не удалось открыть закрытый раздел. Проверьте вход владельца и подключение.';}
  else if(value.type==='salah:owner-preview-navigate'&&['#knowledge','#knowledge?view=alphabet','#knowledge?preview=muallim'].includes(value.hash)){location.hash=value.hash;}
 };
 window.addEventListener('message',context.listen);
 context.timer=setInterval(()=>{if(!document.hidden&&context.ready)void token();},20000);
 frame.addEventListener('error',()=>{if(active===context)status.textContent='Закрытый раздел сейчас недоступен. Попробуйте позже.';});
 shell.append(back,eyebrow,title,status,retry,frame);host.replaceChildren(shell);return true;
}

