let historySequence=0;
// A profile owns a separate route and Back step. Private identity stays in memory.
// Keep private user data in memory; history contains only an opaque view marker.
export function createOwnerCardHistory({dismiss,isActive,win=window,profileUrl=null,onRoute=()=>{}}){
 const history=win.history,key='salahOwnerCard',token=Date.now()+'-'+(++historySequence);
 let opened=false,pending=false,disposed=false,previousState=null,url=null,returnUrl=null;
 const ownsEntry=()=>history?.state?.[key]===token&&win.location?.href===url;
 const stripMarker=()=>{if(history?.state?.[key]){const state={...history.state};delete state[key];history.replaceState(state,'');}};
 // Reload/forward must not recreate a private card from a saved history entry.
 stripMarker();
 const onPop=()=>{
  pending=false;
  if(!isActive()){dispose();return;}
  if(opened&&!ownsEntry()){opened=false;dismiss();}
  else if(!opened&&ownsEntry()){stripMarker();if(profileUrl&&returnUrl)history.replaceState(previousState,'',returnUrl);}onRoute();
 };
 const dispose=()=>{if(disposed)return;disposed=true;win.removeEventListener?.('popstate',onPop);if(ownsEntry())history.replaceState(previousState,'');opened=false;};
 if(history)win.addEventListener('popstate',onPop);
 return{
  open(){
   if(disposed||pending||!isActive())return false;
   if(!opened&&history){returnUrl=win.location?.href;url=profileUrl?profileUrl(returnUrl):returnUrl;previousState=history.state;try{history.pushState({...previousState,[key]:token},'',url);}catch{/* Card still works when history is unavailable. */}}
   opened=true;onRoute();return true;
  },
  back(){
   if(disposed||!opened||pending)return;
   if(!isActive()){dispose();return;}
   opened=false;dismiss();
   if(ownsEntry()){pending=true;history.back();}
  },dispose
 };
}

export function bindOwnerCardNavigation(card,{dismiss,isOpen}){
 // A profile is a screen. Reading, selecting text and scrolling cannot dismiss it.
 card.onclick=null;card.onpointerdown=null;card.onpointerup=null;card.onpointercancel=null;
 card.onkeydown=event=>{if(event.key==='Escape'&&isOpen()){event.preventDefault();dismiss();}};
}
