// iOS can retain the keyboard's old fixed-bottom containing block after dismissal.
// Use an explicit viewport top instead; do not move the bar with document scrolling.
export function mobileNavDockState({cssHeight,layoutHeight,visualHeight,visualTop=0,scale=1,editing=false,navHeight,gap=12}){
 const valid=n=>Number.isFinite(n)&&n>0;
 if(!valid(navHeight)||Math.abs(scale-1)>.02)return null;
 const height=valid(cssHeight)?cssHeight:layoutHeight;
 if(!valid(height))return null;
 const visible=valid(visualHeight)?visualHeight:height;
 const keyboard=editing&&height-visible>100;
 // Viewport units exclude the keyboard. A stale, shorter visual viewport must
 // not leave the bar halfway up the screen after the input loses focus.
 const offset=!editing&&Math.abs(height-visible)>100?0:Math.max(0,visualTop||0);
 return{top:Math.max(0,(editing?visible:height)+offset-navHeight-Math.max(0,gap)),keyboard};
}
export function initMobileNavDock({win=window,doc=document}={}){
 const nav=doc.getElementById('mobile-nav');if(!nav)return()=>{};
 const probe=doc.createElement('span');probe.setAttribute('aria-hidden','true');
 probe.style.cssText='position:fixed;left:0;top:0;width:0;height:100vh;padding-bottom:max(12px,env(safe-area-inset-bottom,0px));visibility:hidden;pointer-events:none;';
 if(win.CSS?.supports?.('height','100dvh'))probe.style.height='100dvh';
 doc.body.append(probe);
 let frame=null,disposed=false;const timers=new Set();
 const update=()=>{
  frame=null;if(disposed)return;
  if(win.innerWidth>850){nav.removeAttribute('data-viewport-dock');nav.removeAttribute('data-nav-keyboard');nav.style.removeProperty('--nav-viewport-top');return;}
  const active=doc.activeElement;
  const editing=!!active&&(active.matches?.('textarea,[contenteditable="true"]')||(active.tagName==='INPUT'&&!['button','checkbox','radio','range','color','submit','reset'].includes(active.type)&&!active.readOnly));
  const viewport=win.visualViewport;
  if(viewport&&Math.abs(viewport.scale-1)>.02){nav.toggleAttribute('data-nav-keyboard',editing);return;}
  const state=mobileNavDockState({cssHeight:probe.getBoundingClientRect().height,layoutHeight:win.innerHeight,visualHeight:viewport?.height,visualTop:viewport?.offsetTop,scale:viewport?.scale??1,editing,navHeight:nav.getBoundingClientRect().height,gap:parseFloat(win.getComputedStyle(probe).paddingBottom)||12});
  if(!state)return;
  const top=Math.round(state.top*100)/100+'px';
  if(nav.style.getPropertyValue('--nav-viewport-top')!==top)nav.style.setProperty('--nav-viewport-top',top);
  nav.setAttribute('data-viewport-dock','');nav.toggleAttribute('data-nav-keyboard',state.keyboard);
 };
 const schedule=()=>{if(!disposed&&frame===null)frame=win.requestAnimationFrame(update)};
 const settle=()=>{schedule();for(const delay of [250,750]){const id=win.setTimeout(()=>{timers.delete(id);schedule()},delay);timers.add(id)}};
 win.addEventListener('resize',schedule);win.addEventListener('hashchange',settle);
 win.visualViewport?.addEventListener('resize',schedule);win.visualViewport?.addEventListener('scroll',schedule);
 doc.addEventListener('focusin',schedule);doc.addEventListener('focusout',settle);
 const resize=win.ResizeObserver?new win.ResizeObserver(schedule):null;resize?.observe(nav);
 const classes=win.MutationObserver?new win.MutationObserver(schedule):null;classes?.observe(doc.body,{attributes:true,attributeFilter:['class']});
 schedule();
 return()=>{disposed=true;if(frame!==null)win.cancelAnimationFrame(frame);for(const id of timers)win.clearTimeout(id);resize?.disconnect();classes?.disconnect();win.removeEventListener('resize',schedule);win.removeEventListener('hashchange',settle);win.visualViewport?.removeEventListener('resize',schedule);win.visualViewport?.removeEventListener('scroll',schedule);doc.removeEventListener('focusin',schedule);doc.removeEventListener('focusout',settle);probe.remove();nav.removeAttribute('data-viewport-dock');nav.removeAttribute('data-nav-keyboard');nav.style.removeProperty('--nav-viewport-top');};
}
