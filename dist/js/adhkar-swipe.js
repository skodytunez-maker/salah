// Touch owns horizontal movement; browser keeps vertical reading scroll.
export function bindNativeCardSwipe(passage,{preview,commit,onSuppress=()=>{},gestureSurface=null,onBoundaryBack=null,win=window}={}){
 const doc=passage.ownerDocument,parent=passage.parentNode,row=doc.createElement('div');
 row.className='adhkar-card-carousel';row.setAttribute('role','region');row.setAttribute('aria-label','Карточки азкаров');
 const previous=preview(1),next=preview(-1),activeIndex=previous?1:0;
 const pages=[previous,passage,next].filter(Boolean),previewIds=new Map();
 row.style.marginTop=win.getComputedStyle?.(passage).marginTop||'28px';
 row.style.scrollSnapType='none';row.style.scrollBehavior='auto';row.style.overflowX='hidden';row.style.touchAction='pan-y pinch-zoom';
 parent.insertBefore(row,passage);
 for(const page of pages){
  page.classList.add('adhkar-carousel-page');
  if(page!==passage){page.classList.add('adhkar-carousel-preview');page.setAttribute('aria-hidden','true');page.inert=true;previewIds.set(page,Array.from(page.querySelectorAll('[id]'),n=>[n,n.getAttribute('id')]));previewIds.get(page).forEach(([n])=>n.removeAttribute('id'));}
  else page.classList.add('adhkar-carousel-current');
  row.append(page);
 }
 let disposed=false,committed=false,touching=false,initializing=true,timer=0,width=0,suppressUntil=0,gesture=null,animation=0;
 const removers=[];
 const listen=(type,fn,options)=>{const target=gestureSurface&&(type.startsWith('touch')||type==='click')?gestureSurface:row;target.addEventListener(type,fn,options);removers.push(()=>target.removeEventListener(type,fn,options));};
 const suppress=()=>{suppressUntil=Date.now()+500;onSuppress();};
 function size(){
  if(disposed)return;
  const nextWidth=row.clientWidth;
  if(nextWidth&&nextWidth!==width){width=nextWidth;row.scrollLeft=activeIndex*width;}
  const offset=width?Math.max(0,Math.min(pages.length-1,row.scrollLeft/width)):activeIndex;
  const left=Math.floor(offset),right=Math.ceil(offset),fraction=offset-left;
  row.style.height=(pages[left].getBoundingClientRect().height*(1-fraction)+pages[right].getBoundingClientRect().height*fraction)+'px';
 }
 function settle(){
  win.clearTimeout(timer);timer=0;
  if(disposed||committed||initializing||touching||animation||!width)return;
  if(win.getSelection?.()?.toString()){row.scrollTo({left:activeIndex*width,behavior:'smooth'});return;}
  const index=Math.max(0,Math.min(pages.length-1,Math.round(row.scrollLeft/width)));
  if(Math.abs(row.scrollLeft-index*width)>2){row.scrollTo({left:index*width,behavior:'smooth'});return;}
  if(index===activeIndex)return;
  const incoming=pages[index];previewIds.get(incoming)?.forEach(([n,id])=>n.setAttribute('id',id));
  incoming.inert=false;incoming.removeAttribute('aria-hidden');incoming.classList.remove('adhkar-carousel-preview');incoming.classList.add('dhikr-passage');
  committed=true;suppress();commit(index>activeIndex?-1:1,incoming);
 }
 const schedule=()=>{win.clearTimeout(timer);timer=win.setTimeout(settle,160);};
 listen('scroll',()=>{if(!initializing){size();suppress();schedule();}},{passive:true});
 listen('scrollend',settle,{passive:true});
 function finishAt(index){
  const from=row.scrollLeft,to=index*width;let started=null;
  const tick=time=>{
   if(disposed)return;if(started===null)started=time;
   const t=Math.min(1,(time-started)/160);row.scrollLeft=from+(to-from)*(1-Math.pow(1-t,3));size();
   if(t<1)animation=win.requestAnimationFrame(tick);
   else{animation=0;row.scrollLeft=to;settle();}
  };
  animation=win.requestAnimationFrame(tick);
 }
 listen('touchstart',e=>{
  if(animation||e.touches.length!==1||e.target?.closest?.('button,a,input,select,textarea,summary,[contenteditable="true"],.dhikr-counter-dock')){gesture=null;return;}
  touching=true;win.clearTimeout(timer);const p=e.touches[0];
  gesture={id:p.identifier,x:p.clientX,y:p.clientY,left:row.scrollLeft,axis:null};
 },{passive:true});
 listen('touchmove',e=>{
  if(!gesture)return;if(e.touches.length!==1){gesture=null;return;}
  const p=e.touches[0];if(p.identifier!==gesture.id)return;
  const dx=p.clientX-gesture.x,dy=p.clientY-gesture.y;
  if(!gesture.axis&&Math.max(Math.abs(dx),Math.abs(dy))>8)gesture.axis=Math.abs(dx)>Math.abs(dy)*1.2?'x':'y';
  if(gesture.axis!=='x')return;gesture.dx=dx;e.preventDefault();suppress();
  row.scrollLeft=Math.max(0,Math.min((pages.length-1)*width,gesture.left-dx));size();
 },{passive:false});
 listen('touchend',e=>{
  touching=e.touches.length>0;if(touching)return;win.clearTimeout(timer);
  const horizontal=gesture?.axis==='x',boundaryBack=horizontal&&!previous&&gesture.dx>=Math.min(90,width*.22)&&onBoundaryBack;gesture=null;
  if(boundaryBack){committed=true;suppress();onBoundaryBack();return;}
  if(!horizontal){schedule();return;}
  const offset=row.scrollLeft-activeIndex*width,threshold=Math.min(90,width*.22);
  const index=Math.abs(offset)>=threshold?Math.max(0,Math.min(pages.length-1,activeIndex+Math.sign(offset))):activeIndex;
  finishAt(index);
 },{passive:true});
 listen('touchcancel',()=>{touching=false;gesture=null;finishAt(activeIndex);},{passive:true});
 listen('click',e=>{if(e.isTrusted&&Date.now()<suppressUntil){e.preventDefault();e.stopImmediatePropagation();}},true);
 size();
 const frame=win.requestAnimationFrame(()=>{size();row.scrollLeft=activeIndex*width;initializing=false;});
 const observer=win.ResizeObserver?new win.ResizeObserver(size):null;
 observer?.observe(row);observer?.observe(passage);
 return()=>{
  disposed=true;win.clearTimeout(timer);win.cancelAnimationFrame(frame);win.cancelAnimationFrame(animation);observer?.disconnect();removers.forEach(remove=>remove());
  if(row.parentNode){row.parentNode.insertBefore(passage,row);row.remove();}
  passage.classList.remove('adhkar-carousel-page','adhkar-carousel-current');
 };
}
