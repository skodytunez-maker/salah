import{ownerVerified,ownerPreviewAccessToken}from './owner-auth.js';
import{claimPlayback}from './media-playback-focus.js';
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
let active=null;
export const ownerLearningBusy=()=>Boolean(active?.busy&&active.frame.isConnected);
export function stopOwnerLearningPreview(){
 if(!active)return;
 const previous=active;active=null;clearInterval(previous.timer);clearTimeout(previous.timeout);window.removeEventListener('message',previous.listen);
 try{previous.frame.contentWindow?.postMessage({type:'salah:owner-preview-leave',nonce:previous.nonce},origin);}catch{}
 previous.frame.remove();
}
export function mountOwnerLearningPreview(host,feature){
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
 frame.src=origin+'/embed#nonce='+nonce+'&view='+entry.view;
 const retry=document.createElement('button');retry.type='button';retry.className='button secondary';retry.textContent='Повторить подключение';retry.hidden=true;retry.onclick=()=>{stopOwnerLearningPreview();mountOwnerLearningPreview(host,feature);};
 const context={frame,nonce,feature,busy:false,ready:false,tokenSending:false,timer:null,listen:null};active=context;
 context.timeout=setTimeout(()=>{if(active===context){status.hidden=false;status.textContent='Не удалось подключить закрытый раздел. Проверьте соединение и попробуйте ещё раз.';retry.hidden=false;}},12000);
 const token=async()=>{
  if(active!==context||!ownerVerified()){if(active===context)stopOwnerLearningPreview();return;}
  if(context.tokenSending)return;context.tokenSending=true;
  try{
   const access=await ownerPreviewAccessToken();
   if(active!==context||!frame.isConnected||!ownerVerified())return;
   frame.contentWindow.postMessage({type:'salah:owner-preview-token',nonce,token:access,progress:readProgress()},origin);
  }catch{
   if(active===context){status.textContent='Подтвердите вход в аккаунт владельца и откройте раздел ещё раз.';stopOwnerLearningPreview();}
  }finally{context.tokenSending=false;}
 };
 context.listen=event=>{
  if(active!==context||event.origin!==origin||event.source!==frame.contentWindow||event.data?.nonce!==nonce)return;
  if(!ownerVerified()){stopOwnerLearningPreview();return;}
  const value=event.data;
  if(value.type==='salah:owner-preview-ready'){context.ready=true;status.textContent='Подтверждаем доступ владельца…';void token();}
  else if(value.type==='salah:owner-preview-loaded'){status.hidden=true;retry.hidden=true;clearTimeout(context.timeout);}
  else if(value.type==='salah:owner-preview-busy'&&typeof value.busy==='boolean'){context.busy=value.busy;if(value.busy)claimPlayback('owner-lesson');}
  else if(value.type==='salah:owner-preview-progress'&&validOwnerCourseProgress(value.value)){
   try{localStorage.setItem(progressKey,JSON.stringify(value.value));}catch{frame.contentWindow.postMessage({type:'salah:owner-preview-storage-error',nonce},origin);}
  }
  else if(value.type==='salah:owner-preview-error'){status.hidden=false;status.textContent='Не удалось открыть закрытый раздел. Проверьте вход владельца и подключение.';}
  else if(value.type==='salah:owner-preview-navigate'&&['#knowledge','#knowledge?view=alphabet'].includes(value.hash)){location.hash=value.hash;}
 };
 window.addEventListener('message',context.listen);
 context.timer=setInterval(()=>{if(!ownerVerified()){stopOwnerLearningPreview();return;}if(context.ready)void token();},20000);
 frame.addEventListener('error',()=>{if(active===context)status.textContent='Закрытый раздел сейчас недоступен. Попробуйте позже.';});
 shell.append(back,eyebrow,title,status,retry,frame);host.replaceChildren(shell);return true;
}

