import{bindSwipeMotion}from './swipe-motion.js';
// Only entries created in this app session are eligible; never navigate to an external site.
export function createRouteBackStack(win=window){
 const key='salahRouteStep',prefix=Date.now().toString(36)+'-'+Math.random().toString(36).slice(2),steps=[];let index=-1,sequence=0;
 function remember(){const id=win.history.state?.[key],found=steps.indexOf(id);if(found>=0){index=found;return;}const next=prefix+'-'+sequence++;steps.splice(index+1);steps.push(next);index=steps.length-1;try{win.history.replaceState({...win.history.state,[key]:next},'');}catch{steps.length=0;index=-1;}}
 // Opening a private owner card creates an unrepeatable, same-URL entry and
 // discards the browser's old forward branch. Never offer that old branch.
 function syncPrivateView(){if(win.history.state?.salahOwnerCard)steps.splice(index+1);}
 remember();win.addEventListener('hashchange',remember);win.addEventListener('popstate',remember);
 return{canBack:()=>{syncPrivateView();return index>0;},canForward:()=>{syncPrivateView();return index>=0&&index<steps.length-1;},back(){if(index>0)win.history.back();},forward(){syncPrivateView();if(index>=0&&index<steps.length-1)win.history.forward();},dispose(){win.removeEventListener('hashchange',remember);win.removeEventListener('popstate',remember);}};
}
const visible=el=>el&&!el.disabled&&!el.closest('[hidden]')&&el.getClientRects().length>0;
export function resolveBackAction(app,stack){
 // Nested screens return one level before the router is allowed to consume a route.
 for(const id of ['owner-user-back','dua-list','dua-back','adhkar-close','counter-close','dhikr-back','adhkar-return']){const button=app.querySelector('#'+id);if(visible(button))return()=>button.click();}
 if(stack.canBack())return()=>stack.back();
 const back=app.querySelector('.menu-home-access,.menu-back,.settings-back,.lesson-top a,.quran-reader-top a,[data-back]');
 return visible(back)?()=>back.click():null;
}
export function initEdgeBack(app,{reduced=()=>false,win=window,doc=document}={}){
 const stack=createRouteBackStack(win),edges=[];
 const blocked=()=>!!doc.querySelector('dialog[open]')||!!doc.activeElement?.matches?.('input,textarea,select,[contenteditable="true"]');
 const surface=()=>app.querySelector('#owner-user-detail:not([hidden]),.adhkar-shell .dhikr-passage:not(.adhkar-carousel-preview),.lesson-content')||app;
 for(const [name,direction,resolve]of [['back',1,()=>resolveBackAction(app,stack)],['forward',-1,()=>stack.canForward()?()=>stack.forward():null]]){
  const edge=doc.createElement('div');edge.className='app-navigation-edge app-'+name+'-edge';edge.setAttribute('aria-hidden','true');doc.body.append(edge);
  let action=null;
  const disposeMotion=bindSwipeMotion(edge,{ignoreControls:false,reduced,win,surface,canStart:()=>{action=blocked()?null:resolve();return !!action;},canMove:d=>d===direction,
   commit:()=>{const navigate=action;action=null;navigate?.();update();}});
  edges.push({edge,resolve,disposeMotion});
 }
 const update=()=>{for(const{edge,resolve}of edges)edge.hidden=blocked()||!resolve();};
 const observer=new MutationObserver(update);observer.observe(app,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
 doc.addEventListener('focusin',update);doc.addEventListener('focusout',update);win.addEventListener('hashchange',update);win.addEventListener('popstate',update);update();
 return()=>{edges.forEach(({edge,disposeMotion})=>{disposeMotion();edge.remove();});stack.dispose();observer.disconnect();doc.removeEventListener('focusin',update);doc.removeEventListener('focusout',update);win.removeEventListener('hashchange',update);win.removeEventListener('popstate',update);};
}
