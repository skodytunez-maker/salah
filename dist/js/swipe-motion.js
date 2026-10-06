// Shared horizontal gesture: no work runs between gestures; one paint per animation frame.
const controls='button,a,input,select,textarea,summary,[contenteditable="true"],[data-no-swipe]';
export function swipeDecision({dx,dy,width,velocity=0,minDistance=64,maxDistance=140,distanceRatio=.28,flingDistance=32,flingVelocity=.5}){
 if(Math.abs(dx)<12||Math.abs(dx)<=Math.abs(dy)*1.5)return 0;
 const distance=Math.min(maxDistance,Math.max(minDistance,width*distanceRatio));
 if(Math.abs(dx)>=distance||(Math.abs(dx)>=flingDistance&&Math.abs(velocity)>=flingVelocity&&Math.sign(velocity)===Math.sign(dx)))return Math.sign(dx);
 return 0;
}
export function bindSwipeMotion(target,{surface=()=>target,canStart=()=>true,canMove=()=>true,commit,preview,onSuppress=()=>{},reduced=()=>false,win=window,now=()=>performance.now(),ignoreControls=true,swipeThreshold={}}={}){
 let epoch=0,gesture=null,frame=0,settling=false,timer=0,animation=null,ghost=null,suppressUntil=0,disposed=false,painted=null;
 const listeners=[];
 const listen=(node,type,fn,options)=>{node.addEventListener(type,fn,options);listeners.push(()=>node.removeEventListener(type,fn,options));};
 const reducedMotion=()=>reduced()||win.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 const suppress=()=>{suppressUntil=now()+500;onSuppress();};
 function clear(){
  epoch++;
  if(frame)win.cancelAnimationFrame(frame);frame=0;
  win.clearTimeout(timer);animation?.cancel();animation=null;
  ghost?.remove();ghost=null;
  if(painted){painted.style.removeProperty('transform');painted.classList.remove('swipe-moving');painted=null;}
  target.ownerDocument?.documentElement?.classList.remove('swipe-in-progress');settling=false;
 }
 function draw(){frame=0;if(!gesture||!gesture.locked)return;const g=gesture;
  const direction=Math.sign(g.dx),allowed=canMove(direction);
  const x=allowed?g.dx:g.dx*.16;
  painted=g.node;painted.classList.add('swipe-moving');target.ownerDocument?.documentElement?.classList.add('swipe-in-progress');
  painted.style.transform='translate3d('+x+'px,0,0)';
  if(preview&&allowed&&direction&&ghost?.dataset.direction!==String(direction)){
   ghost?.remove();ghost=preview(direction);
   if(ghost){ghost.dataset.direction=String(direction);ghost.classList.add('swipe-preview');ghost.setAttribute('aria-hidden','true');ghost.inert=true;ghost.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));Object.assign(ghost.style,{left:g.rect.left+'px',top:g.rect.top+'px',width:g.width+'px'});g.node.parentNode.append(ghost);}
  }else if(!allowed){ghost?.remove();ghost=null;}
  if(ghost)ghost.style.transform='translate3d('+(x-direction*g.width)+'px,0,0)';
 }
 function finish(direction=0){
  const g=gesture;gesture=null;if(!g)return;
  if(frame)win.cancelAnimationFrame(frame);frame=0;
  try{target.releasePointerCapture?.(g.id)}catch{}
  if(!g.locked){clear();return;}
  suppress();settling=true;
  const from=g.dx*(canMove(Math.sign(g.dx))?1:.16),to=direction?direction*g.width:0;
  const expectedEpoch=epoch;
  const complete=()=>{if(disposed||epoch!==expectedEpoch)return;clear();if(direction&&g.node.isConnected!==false)commit(direction);};
  if(reducedMotion()||!g.node.animate){complete();return;}
  const duration=direction?Math.max(120,Math.min(240,Math.abs(to-from)/Math.max(.8,Math.abs(g.velocity)))):230;
  const options={duration,easing:'cubic-bezier(.22,.8,.22,1)',fill:'forwards'};
  animation=g.node.animate([{transform:'translate3d('+from+'px,0,0)'},{transform:'translate3d('+to+'px,0,0)'}],options);
  if(ghost){const offset=Number(ghost.dataset.direction)*g.width;ghost.animate([{transform:'translate3d('+(from-offset)+'px,0,0)'},{transform:'translate3d('+(to-offset)+'px,0,0)'}],options);}
  let done=false;const once=()=>{if(done)return;done=true;complete();};animation.onfinish=once;timer=win.setTimeout(once,duration+80);
 }
 function cancel(){if(gesture?.locked){suppress();finish(0);}else{gesture=null;clear();}}
 listen(target,'pointerdown',e=>{
  if(settling)return;
  if(gesture){cancel();return;}
  if(disposed||e.isPrimary===false||e.button>0||e.pointerType==='mouse'||(ignoreControls&&e.target.closest?.(controls))||!canStart(e)||win.getSelection?.()?.toString())return;
  const node=surface();if(!node)return;const rect=node.getBoundingClientRect();
  gesture={id:e.pointerId,node,rect,width:Math.max(1,rect.width),x:e.clientX,y:e.clientY,dx:0,dy:0,locked:false,lastX:e.clientX,lastTime:now(),velocity:0};
 });
 function update(e){
  const g=gesture;if(!g||g.id!==e.pointerId)return false;
  const time=now(),dt=time-g.lastTime;
  if(dt>0)g.velocity=(e.clientX-g.lastX)/dt;
  g.lastX=e.clientX;g.lastTime=time;g.dx=e.clientX-g.x;g.dy=e.clientY-g.y;
  if(!g.locked){
   if(Math.abs(g.dy)>10&&Math.abs(g.dy)>=Math.abs(g.dx)){suppress();gesture=null;clear();return false;}
   if(Math.abs(g.dx)<10||Math.abs(g.dx)<Math.abs(g.dy)*1.5)return false;
   if(win.getSelection?.()?.toString()){cancel();return false;}
   g.locked=true;try{target.setPointerCapture?.(g.id)}catch{}
  }
  return true;
 }
 listen(target,'pointermove',e=>{if(!update(e))return;e.preventDefault();if(!frame)frame=win.requestAnimationFrame(draw);},{passive:false});
 listen(target,'pointerup',e=>{
  const g=gesture;if(!g||g.id!==e.pointerId)return;
  // A pause at the end cannot turn a small movement into a fast fling.
  if(e.clientX!==g.lastX||e.clientY!==g.y+g.dy)update(e);else if(now()-g.lastTime>100)g.velocity=0;
  if(!gesture)return;
  if(!g.locked&&Math.hypot(g.dx,g.dy)>10)suppress();
  if(win.getSelection?.()?.toString()){cancel();return;}
  const direction=swipeDecision({...g,...swipeThreshold});
  finish(g.locked&&canMove(direction)?direction:0);
 });
 listen(target,'pointercancel',()=>{suppress();cancel();});
 listen(target,'lostpointercapture',()=>{if(gesture)cancel();});
 listen(target,'click',e=>{if(e.isTrusted&&(now()<suppressUntil||settling)){e.preventDefault();e.stopImmediatePropagation();}},true);
 const abort=()=>{gesture=null;clear();};
 listen(win,'pagehide',abort);listen(win,'blur',abort);listen(win,'hashchange',abort);listen(win,'popstate',abort);listen(win,'resize',abort);
 const visibility=()=>{if(target.ownerDocument?.hidden)abort();};listen(target.ownerDocument||win,'visibilitychange',visibility);
 return()=>{disposed=true;gesture=null;clear();listeners.forEach(remove=>remove());};
}
