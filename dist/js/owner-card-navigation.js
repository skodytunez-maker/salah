export function bindOwnerCardNavigation(card,{dismiss,isOpen,win=window,now=Date.now}){
 let start=null,suppressUntil=0;
 const interactive=target=>!!target?.closest?.('button,a,input,textarea,select,[contenteditable="true"]');
 card.onpointerdown=event=>{start=null;if(!isOpen()||event.isPrimary===false||interactive(event.target))return;start={id:event.pointerId,x:event.clientX,y:event.clientY,time:now()};};
 card.onpointerup=event=>{const first=start;start=null;if(!first||event.pointerId!==first.id)return;const dx=first.x-event.clientX,dy=Math.abs(first.y-event.clientY),elapsed=now()-first.time;
  if(Math.abs(dx)>10||dy>10||elapsed>700)suppressUntil=now()+500;
  if(event.pointerType!=='mouse'&&elapsed<=900&&dx>=60&&dy<=40&&dx>dy*1.5&&!win.getSelection?.()?.toString()){suppressUntil=now()+500;dismiss();}
 };
 card.onpointercancel=()=>{start=null;suppressUntil=now()+500;};
 card.onclick=event=>{if(isOpen()&&now()>=suppressUntil&&!interactive(event.target)&&!win.getSelection?.()?.toString())dismiss();};
 card.onkeydown=event=>{if(event.key==='Escape'&&isOpen()){event.preventDefault();dismiss();}};
}
