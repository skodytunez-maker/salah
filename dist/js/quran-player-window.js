// Reuse the connected player controls. Opening this window never touches audio.
export function mountPlayerWindow(panel,dock,{doc=document,onPlace=()=>{}}={}){
 const sheet=doc.createElement('dialog');sheet.className='quran-player-dialog';sheet.id='quran-player-window';sheet.setAttribute('aria-label','Полный плеер Корана');doc.body.append(sheet);
 const opener=panel.querySelector('.quran-now-playing'),expandButton=panel.querySelector('[data-expand]'),closeButton=panel.querySelector('[data-collapse]');
 let disposed=false,expanded=false,returnFocus=null,overflow='',gesture=null,suppressClickUntil=0;
 const focus=node=>{if(node?.isConnected&&!panel.hidden)node.focus({preventScroll:true});};
 const resetGesture=()=>{if(gesture){try{sheet.releasePointerCapture?.(gesture.id);}catch{}}gesture=null;sheet.classList.remove('is-dragging');sheet.style.removeProperty('--player-drag-y');};
 const finish=()=>{if(!expanded)return;expanded=false;resetGesture();panel.classList.remove('is-expanded');dock.append(panel);doc.body.style.overflow=overflow;doc.body.classList.remove('has-player-window');opener.setAttribute('aria-expanded','false');expandButton.setAttribute('aria-expanded','false');onPlace();focus(returnFocus);};
 const close=()=>{if(sheet.open)sheet.close();finish();};
 const open=event=>{event?.preventDefault?.();if(disposed||expanded||panel.hidden||(event&&Date.now()<suppressClickUntil))return;returnFocus=event?.currentTarget||doc.activeElement||expandButton;overflow=doc.body.style.overflow;panel.classList.add('is-expanded');sheet.append(panel);try{sheet.showModal();}catch{panel.classList.remove('is-expanded');dock.append(panel);return;}expanded=true;doc.body.style.overflow='hidden';doc.body.classList.add('has-player-window');opener.setAttribute('aria-expanded','true');expandButton.setAttribute('aria-expanded','true');closeButton.focus({preventScroll:true});};
 for(const node of [opener,expandButton]){node.setAttribute('aria-haspopup','dialog');node.setAttribute('aria-controls',sheet.id);node.setAttribute('aria-expanded','false');node.addEventListener('click',open);}
 closeButton.addEventListener('click',close);
 const onClose=()=>{if(!sheet.open)finish();};
 const onCancel=event=>{event.preventDefault();close();};
 const onBackdrop=event=>{if(event.target===sheet)close();};
 const down=event=>{if(!expanded||event.isPrimary===false||(event.button!=null&&event.button!==0)||sheet.scrollTop>0)return;const target=event.target.closest?.('.quran-player-heading,.quran-now-playing');if(!target||event.target.closest?.('[data-collapse]'))return;gesture={id:event.pointerId,x:event.clientX,y:event.clientY,dy:0};try{sheet.setPointerCapture?.(event.pointerId);}catch{}};
 const move=event=>{if(!gesture||event.pointerId!==gesture.id)return;const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;if(Math.abs(dx)>24&&Math.abs(dx)>Math.abs(dy)){resetGesture();return;}gesture.dy=Math.max(0,dy);if(dy>8&&dy>Math.abs(dx)){event.preventDefault();sheet.classList.add('is-dragging');sheet.style.setProperty('--player-drag-y',Math.min(dy,280)+'px');}};
 const up=event=>{if(!gesture||event.pointerId!==gesture.id)return;const dismiss=gesture.dy>=96&&gesture.dy>Math.abs(event.clientX-gesture.x)*1.4;resetGesture();if(dismiss){suppressClickUntil=Date.now()+400;close();}};
 sheet.addEventListener('close',onClose);sheet.addEventListener('cancel',onCancel);sheet.addEventListener('click',onBackdrop);sheet.addEventListener('pointerdown',down);sheet.addEventListener('pointermove',move,{passive:false});sheet.addEventListener('pointerup',up);sheet.addEventListener('pointercancel',resetGesture);
 return{open,close,get isOpen(){return expanded;},destroy(){disposed=true;close();for(const node of [opener,expandButton])node.removeEventListener('click',open);closeButton.removeEventListener('click',close);sheet.removeEventListener('close',onClose);sheet.removeEventListener('cancel',onCancel);sheet.removeEventListener('click',onBackdrop);sheet.removeEventListener('pointerdown',down);sheet.removeEventListener('pointermove',move);sheet.removeEventListener('pointerup',up);sheet.removeEventListener('pointercancel',resetGesture);sheet.remove();}};
}
