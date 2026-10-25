// Cross-origin lesson inputs cannot bubble focus events into SALAH.
export function createOwnerFrameViewport({win=window,root=document.documentElement,notify=()=>{}}={}){
 const viewport=win.visualViewport;
 let focused=false,raised=false,disposed=false,baseline=Number(win.innerHeight)||0,baselineWidth=Number(win.innerWidth)||0,previousScroll=0,scheduled=null;
 const restore=()=>{
  if(!raised)return;raised=false;root.classList.remove('owner-preview-editing');
  root.style.removeProperty('--owner-preview-visual-height');root.style.removeProperty('--owner-preview-visual-top');
  win.scrollTo?.({top:previousScroll,left:0,behavior:'instant'});
 };
 const update=()=>{
  if(disposed)return;
  const visible=Number(viewport?.height)||Number(win.innerHeight)||baseline;
  if(!focused){baseline=Math.max(baseline,visible,Number(win.innerHeight)||0);restore();return;}
  const keyboard=baseline-visible>120||(Number(win.innerHeight)||0)-visible>120;
  if(!keyboard){restore();return;}
  if(!raised){previousScroll=Number(win.scrollY)||0;raised=true;}
  root.classList.add('owner-preview-editing');
  root.style.setProperty('--owner-preview-visual-height',Math.max(120,visible)+'px');
  root.style.setProperty('--owner-preview-visual-top',Math.max(0,Number(viewport?.offsetTop)||0)+'px');
  if(scheduled!==null)win.cancelAnimationFrame?.(scheduled);
  scheduled=win.requestAnimationFrame?.(()=>{scheduled=null;if(!disposed&&raised)notify();})??null;
 };
 const orient=()=>{baseline=Math.max(Number(viewport?.height)||0,Number(win.innerHeight)||0,baselineWidth);baselineWidth=Number(win.innerWidth)||0;update();};
 root.classList.add('owner-preview-open');
 viewport?.addEventListener('resize',update);viewport?.addEventListener('scroll',update);win.addEventListener('resize',update);win.addEventListener('orientationchange',orient);
 return{
  focus(value){focused=value===true;update();},
  dispose(){disposed=true;viewport?.removeEventListener('resize',update);viewport?.removeEventListener('scroll',update);win.removeEventListener('resize',update);win.removeEventListener('orientationchange',orient);if(scheduled!==null)win.cancelAnimationFrame?.(scheduled);restore();root.classList.remove('owner-preview-open');},
  isRaised:()=>raised
 };
}

