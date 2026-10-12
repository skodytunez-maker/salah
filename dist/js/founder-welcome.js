import{modal,closeModal}from './ui.js';
import{competitionOwn,refreshCompetitionOwn}from './competition-client.js';
import{awardArtwork}from './quran-awards-core.js';
import{FOUNDER_WELCOME_FIELD,founderWelcomeKey,founderWelcomeEligible,confirmedFounderUser,founderWelcomePreference,hasFounderWelcomeSeen}from './founder-welcome-core.js';
let started=false;
const assets=['./assets/awards/founder-gift-closed-v1.png','./assets/awards/founder-gift-open-v1.png',awardArtwork('founder')];
let imageTask=null;
const loadImages=()=>imageTask??=Promise.all(assets.map(src=>{const im=new Image();im.src=src;return im.decode();})).catch(error=>{imageTask=null;throw error;});
export function showFounderWelcome({preview=false,onRewards=()=>{closeModal();location.hash='account';},reduced=matchMedia('(prefers-reduced-motion: reduce)').matches}={}){
 modal('<div class="founder-welcome'+(reduced?' founder-welcome-reduced':'')+'"><div class="modal-head"><span>SALAH</span><button type="button" class="text-button" data-close>Закрыть</button></div><div class="founder-gift-stage" aria-hidden="true"><img class="founder-gift-closed" src="'+assets[0]+'" alt=""><img class="founder-gift-open" src="'+assets[1]+'" alt=""><img class="founder-gift-medal" src="'+assets[2]+'" alt=""></div><h2>Первопроходец SALAH</h2><p>Спасибо, что вы с нами<br>с самого начала.</p>'+(preview?'<small>Предпросмотр · награды и счётчик не меняются</small>':'')+'<button type="button" class="button" data-founder-continue>Продолжить</button><button type="button" class="text-button" data-founder-rewards>Мои награды</button></div>');
 const root=document.querySelector('.founder-welcome');root.querySelector('[data-founder-continue]').onclick=closeModal;root.querySelector('[data-founder-rewards]').onclick=onRewards;
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
   const guard=()=>{if(getAccount().userId!==id&&root.isConnected)closeModal();};
   window.addEventListener('salah:counter-status',guard);document.getElementById('modal').addEventListener('close',()=>window.removeEventListener('salah:counter-status',guard),{once:true});
   if(!remoteSeen)await acknowledge(id);
  }catch{}finally{busy=false;}
 }
 // Leave the Auth SDK callback/session lock before looking up or updating the user's presentation preference.
 const schedule=()=>{clearTimeout(timer);timer=setTimeout(()=>void attempt(),350);};
 for(const event of ['hashchange','online','salah:counter-status','salah:competition-updated'])window.addEventListener(event,schedule);
 document.addEventListener('visibilitychange',schedule);document.getElementById('modal')?.addEventListener('close',schedule);playback?.subscribe?.(schedule);schedule();
}
