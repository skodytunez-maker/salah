import{competitionOwn,refreshCompetitionOwn}from './competition-client.js';
import{awardArtwork}from './quran-awards-core.js';
import{FOUNDER_WELCOME_FIELD,founderWelcomeKey,founderWelcomeEligible,confirmedFounderUser,founderWelcomePreference,hasFounderWelcomeSeen}from './founder-welcome-core.js';
let started=false,layer=null,exitTimer=null,removeTimer=null;
const assets=[awardArtwork('founder')];
let imageTask=null;
const loadImages=()=>imageTask??=Promise.all(assets.map(src=>{const im=new Image();im.src=src;return im.decode();})).catch(error=>{imageTask=null;throw error;});
export function hideFounderWelcome(root=layer,{immediate=false}={}){
 if(!root||root!==layer)return;
 clearTimeout(exitTimer);clearTimeout(removeTimer);
 const remove=()=>{if(layer===root)layer=null;root.remove();root.dispatchEvent(new window.Event('founder-welcome-ended'));};
 if(immediate||root.classList.contains('founder-welcome-reduced')){remove();return;}
 root.classList.add('founder-welcome-ending');removeTimer=setTimeout(remove,420);
}
export function showFounderWelcome({preview=false,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches}={}){
 hideFounderWelcome(layer,{immediate:true});
 const root=document.createElement('div');root.className='founder-welcome'+(reduced?' founder-welcome-reduced':'');
 root.innerHTML='<button type="button" class="founder-welcome-close" aria-label="Закрыть благодарность"><img src="./assets/x-lg.svg" alt=""></button><div class="founder-welcome-content" role="status" aria-live="polite"><div class="founder-medal-light" aria-hidden="true"><img src="'+assets[0]+'" alt=""></div><h2>Спасибо, что вы с нами.</h2><p>Первопроходец SALAH</p>'+(preview?'<small>Предпросмотр · награды и счётчик не меняются</small>':'')+'</div>';
 layer=root;document.body.append(root);root.querySelector('.founder-welcome-close').onclick=()=>hideFounderWelcome(root);
 exitTimer=setTimeout(()=>hideFounderWelcome(root),15000);
 return root;
}
export function initFounderWelcome({getAccount,getClient,canShow=()=>true,isReduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches,playback}){
 if(started)return;started=true;let busy=false,timer=null;const sessionSeen=new Set(),ackAttempted=new Set(),ackAt=new Map();
 const seen=id=>{if(sessionSeen.has(id))return true;try{return localStorage.getItem(founderWelcomeKey(id))==='1';}catch{return false;}};
 const mark=id=>{sessionSeen.add(id);try{localStorage.setItem(founderWelcomeKey(id),'1');}catch{}};
 const requested=()=>new URLSearchParams(location.hash.split('?')[1]||'').get('gift')==='founder';
 const active=id=>getAccount().signedIn&&getAccount().userId===id&&!document.hidden&&location.hash.split('?')[0]==='#home'&&!document.getElementById('modal')?.open&&(requested()||canShow());
 async function acknowledge(id){if(ackAttempted.has(id)||getAccount().userId!==id||Date.now()-(ackAt.get(id)||0)<60000)return;ackAt.set(id,Date.now());ackAttempted.add(id);try{const result=await getClient().auth.updateUser({data:{[FOUNDER_WELCOME_FIELD]:founderWelcomePreference(id)}});if(result.error||result.data?.user?.id!==id)throw Error('presentation_ack_failed');}catch{ackAttempted.delete(id);}}
 async function attempt(){
  const state=getAccount(),id=state.userId;if(busy||!state.signedIn||!active(id))return;
  if(state.founderWelcomeSeen&&!requested()){mark(id);return;}
  busy=true;try{
   const own=competitionOwn()||await refreshCompetitionOwn();if(!founderWelcomeEligible(getAccount(),own?.awards)||getAccount().userId!==id)return;
   const{data,error}=await getClient().auth.getUser();if(error||!confirmedFounderUser(data?.user,id)||getAccount().userId!==id)return;
   const remoteSeen=hasFounderWelcomeSeen(data.user);if(remoteSeen&&!requested()){mark(id);return;}
   if(seen(id)&&!requested()){await acknowledge(id);return;}
   await loadImages();if(!active(id)||!founderWelcomeEligible(getAccount(),competitionOwn()?.awards))return;
   const root=showFounderWelcome({reduced:isReduced()});mark(id);if(requested()){try{history.replaceState(history.state,'',location.pathname+location.search+'#home');}catch{}}
   const guard=()=>{if(root.isConnected&&(getAccount().userId!==id||document.hidden||location.hash.split('?')[0]!=='#home'))hideFounderWelcome(root,{immediate:true});};
   window.addEventListener('salah:counter-status',guard);window.addEventListener('hashchange',guard);document.addEventListener('visibilitychange',guard);
   root.addEventListener('founder-welcome-ended',()=>{window.removeEventListener('salah:counter-status',guard);window.removeEventListener('hashchange',guard);document.removeEventListener('visibilitychange',guard);},{once:true});
   if(!remoteSeen)await acknowledge(id);
  }catch{}finally{busy=false;}
 }
 // Leave the Auth SDK callback/session lock before looking up or updating the user's presentation preference.
 const schedule=()=>{clearTimeout(timer);timer=setTimeout(()=>void attempt(),350);};
 for(const event of ['hashchange','online','salah:counter-status','salah:competition-updated'])window.addEventListener(event,schedule);
 document.addEventListener('visibilitychange',schedule);document.getElementById('modal')?.addEventListener('close',schedule);playback?.subscribe?.(schedule);schedule();
}
