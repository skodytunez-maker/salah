let historySequence=0;
// A card is a real Back step, even though it stays on the same account URL.
// Keep private user data in memory; history contains only an opaque view marker.
export function createOwnerCardHistory({dismiss,isActive,win=window}){
 const history=win.history,key='salahOwnerCard',token=Date.now()+'-'+(++historySequence),url=win.location?.href;
 let opened=false,pending=false,disposed=false,previousState=null;
 const ownsEntry=()=>history?.state?.[key]===token&&win.location?.href===url;
 const stripMarker=()=>{if(history?.state?.[key]){const state={...history.state};delete state[key];history.replaceState(state,'');}};
 // Reload/forward must not recreate a private card from a saved history entry.
 stripMarker();
 const onPop=()=>{
  pending=false;
  if(!isActive()){dispose();return;}
  if(opened&&!ownsEntry()){opened=false;dismiss();}
  else if(!opened&&ownsEntry())stripMarker();
 };
 const dispose=()=>{if(disposed)return;disposed=true;win.removeEventListener?.('popstate',onPop);if(ownsEntry())history.replaceState(previousState,'');opened=false;};
 if(history)win.addEventListener('popstate',onPop);
 return{
  open(){
   if(disposed||pending||!isActive())return false;
   if(!opened&&history){previousState=history.state;try{history.pushState({...previousState,[key]:token},'');}catch{/* Card still works when history is unavailable. */}}
   opened=true;return true;
  },
  back(){
   if(disposed||!opened||pending)return;
   if(!isActive()){dispose();return;}
   opened=false;dismiss();
   if(ownsEntry()){pending=true;history.back();}
  },dispose
 };
}

export function bindOwnerCardNavigation(card,{dismiss,isOpen,win=window,now=Date.now}){
 let start=null,suppressUntil=0;
 const interactive=target=>!!target?.closest?.('button,a,input,textarea,select,summary,[contenteditable="true"]');
 card.onpointerdown=event=>{start=null;if(!isOpen()||event.isPrimary===false||event.button>0||interactive(event.target))return;start={id:event.pointerId,x:event.clientX,y:event.clientY,time:now()};};
 card.onpointerup=event=>{const first=start;start=null;if(!first||event.pointerId!==first.id)return;const dx=first.x-event.clientX,dy=Math.abs(first.y-event.clientY),elapsed=now()-first.time;
  if(Math.abs(dx)>10||dy>10||elapsed>700)suppressUntil=now()+500;
  if(event.pointerType!=='mouse'&&elapsed<=900&&dx>=60&&dy<=40&&dx>dy*1.5&&!win.getSelection?.()?.toString()){suppressUntil=now()+500;dismiss();}
 };
 card.onpointercancel=()=>{start=null;suppressUntil=now()+500;};
 card.onclick=event=>{if(isOpen()&&now()>=suppressUntil&&!interactive(event.target)&&!win.getSelection?.()?.toString())dismiss();};
 card.onkeydown=event=>{if(event.key==='Escape'&&isOpen()){event.preventDefault();dismiss();}};
}
