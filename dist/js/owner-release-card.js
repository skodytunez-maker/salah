import{esc}from './ui.js';
// This is a display preference, never an authorization grant or a public announcement receipt.
const SEEN_PREFIX='salah:owner-home-release-seen-v1:';
export function createOwnerReleaseCard({getState,verify,release,showRelease,storage=globalThis.localStorage,schedule=setTimeout,cancel=clearTimeout}){
 let host=null,userId=null,attempted=false,pending=null,epoch=0,timer=null,signature='',dismissed=new Set(),knownOwner=false;
 const stop=()=>{if(timer!==null)cancel(timer);timer=null;};
 const seen=id=>{if(dismissed.has(id))return true;try{return Number(storage.getItem(SEEN_PREFIX+id))>=release.version;}catch{return false;}};
 const active=()=>host?.isConnected&&getState().active;
 function draw(){
  if(!host?.isConnected)return;
  const state=getState(),visible=state.active&&state.signedIn&&state.userId===userId&&state.ownerId===userId&&!!userId&&!seen(userId);
  host.hidden=!visible;
  const next=visible?userId+':'+release.version:'';if(next===signature)return;signature=next;
  host.innerHTML=visible?'<aside class="owner-home-update" aria-label="Обновление SALAH"><div><strong>SALAH обновлён</strong><span>'+esc(release.label)+' · '+esc(release.version)+'</span><button type="button" data-release-open>Что нового</button></div><button type="button" class="owner-home-update-close" data-release-close aria-label="Закрыть уведомление об обновлении">×</button></aside>':'';
  if(!visible)return;
  const dismiss=()=>{if(getState().userId!==userId)return;dismissed.add(userId);try{storage.setItem(SEEN_PREFIX+userId,String(release.version));}catch{}stop();draw();};
  host.querySelector('[data-release-close]').onclick=dismiss;
  host.querySelector('[data-release-open]').onclick=()=>{if(getState().ownerId!==userId)return;showRelease(release,{acknowledgeAnnouncement:false});dismiss();};
 }
 async function refresh({retry=false}={}){
  const state=getState(),id=state.signedIn?state.userId:null;
  if(id!==userId){epoch++;userId=id;attempted=false;knownOwner=false;pending=null;stop();}
  draw();if(!active()||!id||seen(id)){stop();return;}
  if(pending)return pending;
  if(!retry&&attempted)return;
  attempted=true;const started=epoch;
  const task=(async()=>{try{await verify();}catch{}finally{
   if(epoch!==started)return;
   pending=null;knownOwner=getState().ownerId===id;draw();stop();
   // Renew only an unread, server-verified owner's card. Ordinary users have no polling.
   if(active()&&getState().ownerId===id&&!seen(id))timer=schedule(()=>{timer=null;refresh({retry:true});},55000);
  }})();pending=task;return task;
 }
 return{mount(container){if(host!==container){host=container;signature='';}if(!host){stop();return;}return refresh({retry:knownOwner});},refresh};
}
