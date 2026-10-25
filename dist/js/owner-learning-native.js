import{ownerVerified,ownerPreviewAccessToken,verifyOwner,onOwnerChange}from './owner-auth.js';
import{showNativeMuallim}from './muallim-native.js';
const endpoint='https://desktop-jecm5lt.taila4556d.ts.net/api/muallim-course';
let active=null,cached=null,pending=null,generation=0;
export const ownerNativeActive=()=>Boolean(active?.verified&&active.root.isConnected);
const auth=async()=>{if(!ownerVerified())await verifyOwner({verifySession:true});if(!ownerVerified())throw Error('Owner confirmation required');};
export function stopOwnerNativePreview({clearCache=false}={}){
 if(clearCache){generation++;cached=null;pending=null;}
 if(!active)return;const prior=active;active=null;prior.disposed=true;prior.cleanup?.();prior.off?.();prior.root.remove();
}
async function curriculum(){
 if(cached)return cached;
 if(pending)return pending;
 const current=generation;
 pending=(async()=>{await auth();const token=await ownerPreviewAccessToken();const response=await fetch(endpoint,{method:'GET',credentials:'omit',cache:'no-store',redirect:'error',headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('Course access unavailable');const value=await response.json();if(current!==generation||!ownerVerified())throw Error('Owner access changed');cached=value;return value;})();
 try{return await pending;}finally{if(current===generation)pending=null;}
}
export function mountOwnerNativePreview(host,feature,{hash=location.hash}={}){
 if(!['muallim','live-stream'].includes(feature)||(!ownerVerified()&&!ownerNativeActive()))return false;
 if(active?.host===host&&active.feature===feature&&active.hash===hash&&active.root.isConnected)return true;
 const priorVerified=ownerVerified()||ownerNativeActive();stopOwnerNativePreview();
 const root=document.createElement('section');root.className='owner-learning-shell owner-native-preview';host.replaceChildren(root);
 const state={root,host,feature,hash,verified:priorVerified,disposed:false,cleanup:null,off:null};active=state;
 state.off=null;
 function draw(data){
  if(active!==state||state.disposed||!root.isConnected||!ownerVerified())return;
  state.cleanup?.();
  if(feature==='muallim')state.cleanup=showNativeMuallim(root,{hash,hasBook:true,curriculum:data});
  else root.innerHTML='<section class="alphabet-page native-course"><a class="alphabet-back" href="#knowledge">← Знания</a><span class="native-course-kicker">ЗАКРЫТАЯ ПОДГОТОВКА · SALAH</span><h1 tabindex="-1">Прямой эфир</h1><section class="native-resume"><h2>Лекции и общие разборы</h2><p>Видео преподавателя, демонстрация материала и вопросы участников в чате.</p></section><p>Это макет будущего режима. Прямой эфир ещё не запущен.</p><a class="button secondary" href="#knowledge?preview=online-lessons">Открыть онлайн-занятия</a></section>';
 }
 if(ownerVerified()&&(feature==='live-stream'||cached)){draw(cached);return true;}
 root.innerHTML='<section class="alphabet-page native-course"><a class="alphabet-back" href="#knowledge">← Знания</a><h1>'+(feature==='muallim'?'Муаллим Сани':'Прямой эфир')+'</h1><p role="status">Открываем раздел…</p></section>';
 void(async()=>{try{await auth();const data=feature==='muallim'?await curriculum():null;draw(data);}catch{if(active!==state||state.disposed)return;root.innerHTML='<section class="alphabet-page native-course"><a class="alphabet-back" href="#knowledge">← Знания</a><h1>Раздел пока недоступен</h1><p role="alert">Проверьте подключение и вход владельца.</p><button class="button secondary" type="button">Повторить</button></section>';root.querySelector('button').onclick=()=>{if(active===state){stopOwnerNativePreview();mountOwnerNativePreview(host,feature,{hash});}};}})();
 return true;
}

// Clear cached protected data on revocation, including while another screen is open.
onOwnerChange(()=>{if(!ownerVerified())stopOwnerNativePreview({clearCache:true});});
