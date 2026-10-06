// Safari/Android own the drag, momentum and snap. App state follows the settled page.
export function bindNativeCardSwipe(passage,{preview,commit,onSuppress=()=>{},win=window}={}){
 const doc=passage.ownerDocument,parent=passage.parentNode,row=doc.createElement('div');
 row.className='adhkar-card-carousel';row.setAttribute('role','region');row.setAttribute('aria-label','Карточки азкаров');
 const previous=preview(1),next=preview(-1),activeIndex=previous?1:0;
 const pages=[previous,passage,next].filter(Boolean),previewIds=new Map();
 row.style.marginTop=win.getComputedStyle?.(passage).marginTop||'28px';
 row.style.scrollSnapType='none';row.style.scrollBehavior='auto';
 parent.insertBefore(row,passage);
 for(const page of pages){
  page.classList.add('adhkar-carousel-page');
  if(page!==passage){page.classList.add('adhkar-carousel-preview');page.setAttribute('aria-hidden','true');page.inert=true;previewIds.set(page,Array.from(page.querySelectorAll('[id]'),n=>[n,n.getAttribute('id')]));previewIds.get(page).forEach(([n])=>n.removeAttribute('id'));}
  else page.classList.add('adhkar-carousel-current');
  row.append(page);
 }
 let disposed=false,committed=false,touching=false,initializing=true,timer=0,width=0,suppressUntil=0;
 const removers=[];
 const listen=(type,fn,options)=>{row.addEventListener(type,fn,options);removers.push(()=>row.removeEventListener(type,fn,options));};
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
  if(disposed||committed||initializing||touching||!width)return;
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
 listen('touchstart',()=>{touching=true;win.clearTimeout(timer);},{passive:true});
 listen('touchend',e=>{touching=e.touches.length>0;if(!touching)schedule();},{passive:true});
 listen('touchcancel',()=>{touching=false;row.scrollTo({left:activeIndex*width,behavior:'smooth'});schedule();},{passive:true});
 listen('click',e=>{if(e.isTrusted&&Date.now()<suppressUntil){e.preventDefault();e.stopImmediatePropagation();}},true);
 size();
 const frame=win.requestAnimationFrame(()=>{size();row.scrollLeft=activeIndex*width;row.style.scrollSnapType='';initializing=false;});
 const observer=win.ResizeObserver?new win.ResizeObserver(size):null;
 observer?.observe(row);observer?.observe(passage);
 return()=>{
  disposed=true;win.clearTimeout(timer);win.cancelAnimationFrame(frame);observer?.disconnect();removers.forEach(remove=>remove());
  if(row.parentNode){row.parentNode.insertBefore(passage,row);row.remove();}
  passage.classList.remove('adhkar-carousel-page','adhkar-carousel-current');
 };
}
