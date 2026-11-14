// Reuse the connected player controls. Opening this window never touches audio.
export function mountPlayerWindow(panel,dock,{doc=document,onPlace=()=>{}}={}){
 const sheet=doc.createElement('dialog');sheet.className='quran-player-dialog';sheet.id='quran-player-window';sheet.setAttribute('aria-label','Полный плеер Корана');doc.body.append(sheet);
 const opener=panel.querySelector('.quran-now-playing'),expandButton=panel.querySelector('[data-expand]'),closeButton=panel.querySelector('[data-collapse]');
 let disposed=false,expanded=false,returnFocus=null,overflow='',rootWasLocked=false,bodyHadWindow=false,gesture=null,scrollTouch=null,suppressClickUntil=0;
 const focus=node=>{if(node?.isConnected&&!panel.hidden)node.focus({preventScroll:true});};
 const resetGesture=()=>{if(gesture?.transport==='pointer'){try{sheet.releasePointerCapture?.(gesture.id);}catch{}}gesture=null;sheet.classList.remove('is-dragging');};
 const finish=()=>{if(!expanded)return;expanded=false;resetGesture();scrollTouch=null;panel.classList.remove('is-expanded');dock.append(panel);doc.body.style.overflow=overflow;doc.body.classList.toggle('has-player-window',bodyHadWindow);doc.documentElement.classList.toggle('quran-player-scroll-locked',rootWasLocked);opener.setAttribute('aria-expanded','false');expandButton.setAttribute('aria-expanded','false');onPlace();focus(returnFocus);};
 const close=()=>{if(sheet.open)sheet.close();finish();};
 const open=event=>{event?.preventDefault?.();if(disposed||expanded||panel.hidden||(event&&Date.now()<suppressClickUntil))return;returnFocus=event?.currentTarget||doc.activeElement||expandButton;overflow=doc.body.style.overflow;rootWasLocked=doc.documentElement.classList.contains('quran-player-scroll-locked');bodyHadWindow=doc.body.classList.contains('has-player-window');panel.classList.add('is-expanded');sheet.append(panel);try{sheet.showModal();}catch{panel.classList.remove('is-expanded');dock.append(panel);return;}expanded=true;sheet.scrollTop=0;doc.body.style.overflow='hidden';doc.body.classList.add('has-player-window');doc.documentElement.classList.add('quran-player-scroll-locked');opener.setAttribute('aria-expanded','true');expandButton.setAttribute('aria-expanded','true');closeButton.focus({preventScroll:true});};
 for(const node of [opener,expandButton]){node.setAttribute('aria-haspopup','dialog');node.setAttribute('aria-controls',sheet.id);node.setAttribute('aria-expanded','false');node.addEventListener('click',open);}
 closeButton.addEventListener('click',close);
 const onClose=()=>{if(!sheet.open)finish();};
 const onCancel=event=>{event.preventDefault();close();};
 const onBackdrop=event=>{if(event.target!==sheet)return;const r=sheet.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close();};
 const eligible=target=>expanded&&sheet.scrollTop<=1&&!target.closest?.('[data-collapse]')&&(target===sheet||target===panel||!!target.closest?.('.quran-player-heading,.quran-now-playing'));
 const begin=(id,x,y,transport)=>{resetGesture();gesture={id,x,y,dy:0,transport};};
 // A deliberate downward swipe still closes on release; the full-screen frame stays fixed.
 const drag=(x,y,event)=>{if(!gesture)return;const dx=x-gesture.x,dy=y-gesture.y;if(Math.abs(dx)>24&&Math.abs(dx)>Math.abs(dy)){resetGesture();return;}gesture.dy=Math.max(0,dy);if(dy>8&&dy>Math.abs(dx)){if(event.cancelable)event.preventDefault();sheet.classList.add('is-dragging');}};
 const end=(x,y,event)=>{if(!gesture)return;const dx=x-gesture.x,dy=y-gesture.y,dismiss=dy>=64&&dy>Math.abs(dx)*1.4,moved=Math.abs(dy)>8;if(moved){suppressClickUntil=Date.now()+400;if(event.cancelable)event.preventDefault();}resetGesture();if(dismiss)close();};
 const down=event=>{if(gesture?.transport==='touch'||event.isPrimary===false||(event.button!=null&&event.button!==0)||!eligible(event.target))return;begin(event.pointerId,event.clientX,event.clientY,'pointer');if(event.pointerType!=='touch')try{sheet.setPointerCapture?.(event.pointerId);}catch{}};
 const move=event=>{if(gesture?.transport==='pointer'&&event.pointerId===gesture.id)drag(event.clientX,event.clientY,event);};
 const up=event=>{if(gesture?.transport==='pointer'&&event.pointerId===gesture.id)end(event.clientX,event.clientY,event);};
 const pointerCancel=()=>{if(gesture?.transport==='pointer')resetGesture();};
 // Keep native settings/queue scrolling, but stop a touch only when no child-to-sheet
 // scroll container can consume its vertical direction. This also covers older iOS.
 const canScroll=(target,dy)=>{for(let node=target?.nodeType===1?target:target?.parentElement;node;node=node.parentElement){
  const max=node.scrollHeight-node.clientHeight;
  if(max>1){let scrollable=node===sheet;try{const style=doc.defaultView?.getComputedStyle(node);scrollable||=/^(auto|scroll|overlay)$/.test(style?.overflowY||style?.overflow||'');}catch{}
   if(scrollable&&(dy>0?node.scrollTop>1:node.scrollTop<max-1))return true;}
  if(node===sheet)break;
 }return false;};
 const containTouch=(t,event)=>{if(!scrollTouch||!expanded)return;const dx=t.clientX-scrollTouch.x,dy=t.clientY-scrollTouch.y,step=t.clientY-scrollTouch.lastY;scrollTouch.lastY=t.clientY;
  if(Math.abs(dy)<=8||Math.abs(dy)<=Math.abs(dx)||!step||scrollTouch.target.closest?.('input[type="range"],select,option'))return;
  if(!canScroll(scrollTouch.target,step)&&event.cancelable)event.preventDefault();};
 // Safari may cancel Pointer Events when it recognises page scrolling.
 const touchStart=event=>{if(!expanded||event.touches.length!==1){resetGesture();scrollTouch=null;return;}const t=event.touches[0];scrollTouch={id:t.identifier,x:t.clientX,y:t.clientY,lastY:t.clientY,target:event.target};if(eligible(event.target))begin(t.identifier,t.clientX,t.clientY,'touch');else resetGesture();};
 const tracked=list=>Array.from(list).find(t=>t.identifier===gesture?.id);
 const touchMove=event=>{if(event.touches.length!==1){resetGesture();scrollTouch=null;return;}const t=Array.from(event.touches).find(t=>t.identifier===scrollTouch?.id);if(t)containTouch(t,event);if(gesture?.transport==='touch'){const dragged=tracked(event.touches);if(dragged)drag(dragged.clientX,dragged.clientY,event);}};
 const touchEnd=event=>{scrollTouch=null;if(gesture?.transport!=='touch')return;const t=tracked(event.changedTouches);if(t)end(t.clientX,t.clientY,event);else resetGesture();};
 const touchCancel=()=>{scrollTouch=null;if(gesture?.transport==='touch')resetGesture();};
 sheet.addEventListener('close',onClose);sheet.addEventListener('cancel',onCancel);sheet.addEventListener('click',onBackdrop);sheet.addEventListener('pointerdown',down);sheet.addEventListener('pointermove',move,{passive:false});sheet.addEventListener('pointerup',up);sheet.addEventListener('pointercancel',pointerCancel);sheet.addEventListener('touchstart',touchStart,{passive:true});sheet.addEventListener('touchmove',touchMove,{passive:false});sheet.addEventListener('touchend',touchEnd,{passive:false});sheet.addEventListener('touchcancel',touchCancel);
 return{open,close,get isOpen(){return expanded;},destroy(){disposed=true;close();for(const node of [opener,expandButton])node.removeEventListener('click',open);closeButton.removeEventListener('click',close);sheet.removeEventListener('close',onClose);sheet.removeEventListener('cancel',onCancel);sheet.removeEventListener('click',onBackdrop);sheet.removeEventListener('pointerdown',down);sheet.removeEventListener('pointermove',move);sheet.removeEventListener('pointerup',up);sheet.removeEventListener('pointercancel',pointerCancel);sheet.removeEventListener('touchstart',touchStart);sheet.removeEventListener('touchmove',touchMove);sheet.removeEventListener('touchend',touchEnd);sheet.removeEventListener('touchcancel',touchCancel);sheet.remove();}};
}
