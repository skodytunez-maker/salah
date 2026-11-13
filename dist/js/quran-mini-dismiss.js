// Deliberate horizontal dismissal belongs to the compact player, not navigation.
export function bindMiniPlayerDismiss(panel,{canStart=()=>true,dismiss,now=Date.now}){
 let gesture=null,blockUntil=0;
 const reset=()=>{gesture=null;panel.style.removeProperty('--mini-drag-x');};
 const eligible=target=>!panel.hidden&&canStart()&&(!target.closest?.('button,input,select,a')||!!target.closest?.('.quran-now-playing'));
 const begin=(id,x,y,kind)=>{reset();gesture={id,x,y,kind};};
 const move=(x,y,event)=>{if(!gesture)return;const dx=x-gesture.x,dy=y-gesture.y;if(Math.abs(dy)>24&&Math.abs(dy)>Math.abs(dx)){reset();return;}if(dx>8&&dx>Math.abs(dy)*1.5){if(event.cancelable)event.preventDefault();panel.style.setProperty('--mini-drag-x',Math.min(180,dx)+'px');}};
 const end=(x,y,event)=>{if(!gesture)return;const dx=x-gesture.x,dy=y-gesture.y;reset();if(Math.hypot(dx,dy)>8)blockUntil=now()+450;if(dx>=72&&dx>Math.abs(dy)*1.5){if(event.cancelable)event.preventDefault();dismiss();}};
 const down=e=>{if(gesture?.kind==='touch'||e.isPrimary===false||(e.button!=null&&e.button!==0)||!eligible(e.target))return;begin(e.pointerId,e.clientX,e.clientY,'pointer');};
 const pointerMove=e=>{if(gesture?.kind==='pointer'&&gesture.id===e.pointerId)move(e.clientX,e.clientY,e);};
 const up=e=>{if(gesture?.kind==='pointer'&&gesture.id===e.pointerId)end(e.clientX,e.clientY,e);};
 const cancel=()=>{if(gesture?.kind==='pointer')reset();};
 const touchStart=e=>{if(e.touches.length!==1){reset();return;}if(eligible(e.target)){const t=e.touches[0];begin(t.identifier,t.clientX,t.clientY,'touch');}};
 const tracked=list=>Array.from(list).find(t=>t.identifier===gesture?.id);
 const touchMove=e=>{if(gesture?.kind!=='touch')return;if(e.touches.length!==1){reset();return;}const t=tracked(e.touches);if(t)move(t.clientX,t.clientY,e);};
 const touchEnd=e=>{if(gesture?.kind!=='touch')return;const t=tracked(e.changedTouches);if(t)end(t.clientX,t.clientY,e);else reset();};
 const click=e=>{if(now()<blockUntil){e.preventDefault();e.stopImmediatePropagation();}};
 const handlers={pointerdown:down,pointermove:pointerMove,pointerup:up,pointercancel:cancel,touchstart:touchStart,touchmove:touchMove,touchend:touchEnd,touchcancel:reset};
 for(const[type,fn]of Object.entries(handlers))panel.addEventListener(type,fn,{passive:!['touchmove','touchend','pointermove','pointerup'].includes(type)});
 panel.addEventListener('click',click,true);
 return()=>{reset();for(const[type,fn]of Object.entries(handlers))panel.removeEventListener(type,fn);panel.removeEventListener('click',click,true);};
}
