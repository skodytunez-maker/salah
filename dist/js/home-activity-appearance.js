// Read existing scene light; never sample/repaint photographs or change Home flow.
export function activityTone(day,clouds=0,previous='light'){
 if(!Number.isFinite(day))return previous;
 const brightness=Math.max(0,Math.min(1,day))*(.65-.18*Math.max(0,Math.min(1,Number.isFinite(clouds)?clouds:0)))+.04;
 return brightness>.38?'ink':brightness<.26?'light':previous;
}
export function activityPlacement(header,card,parent,{scrollLeft=0,scrollTop=0,clientLeft=0,clientTop=0}={}){
 if(!header||!card||!parent||card.width<=0||card.top<header.bottom)return null;
 // Centre the 19px glyphs in the existing gap,not a new in-flow row.
 return {left:card.left-parent.left+scrollLeft-clientLeft,top:(header.bottom+card.top-32)/2-parent.top+scrollTop-clientTop,width:card.width};
}
export function mountHomeActivityAppearance(host,{doc=host?.ownerDocument}={}){
 const win=doc?.defaultView;if(!host||!win)return{refresh(){},dispose(){}};
 let disposed=false,scene=null,tone='light';
 const Observer=win.MutationObserver,Resize=win.ResizeObserver;
 const toneObserver=Observer?new Observer(()=>paintTone()):null;
 const paintTone=()=>{if(disposed||doc.hidden)return;
  const next=doc.getElementById('home-scene');if(next!==scene){toneObserver?.disconnect();scene=next;if(scene)toneObserver?.observe(scene,{attributes:true,attributeFilter:['data-phase']});}
  if(scene){const day=scene.style.getPropertyValue('--scene-day').trim(),clouds=scene.style.getPropertyValue('--scene-clouds').trim();tone=activityTone(day===''?NaN:Number(day),clouds===''?0:Number(clouds),tone);}
  if(host.dataset.activityTone!==tone)host.dataset.activityTone=tone;
 };
 const place=()=>{if(disposed||doc.hidden||host.hidden||!host.isConnected)return;
  const shell=host.closest('.app-home-shell'),header=shell?.querySelector('.app-home-top'),card=shell?.querySelector('.central-prayer');
  const parent=host.offsetParent,initial=!parent||(parent===doc.body&&win.getComputedStyle(parent).position==='static');
  const origin=initial?{left:0,top:0}:parent.getBoundingClientRect();
  const scroll=initial?{scrollLeft:win.scrollX,scrollTop:win.scrollY}:{scrollLeft:parent.scrollLeft,scrollTop:parent.scrollTop,clientLeft:parent.clientLeft,clientTop:parent.clientTop};
  const bounds=activityPlacement(header?.getBoundingClientRect(),card?.getBoundingClientRect(),origin,scroll);
  if(!bounds)return;
  for(const key of ['left','top','width']){const value=Math.round(bounds[key]*100)/100+'px';if(host.style[key]!==value)host.style[key]=value;}
  host.style.right='auto';host.style.maxWidth='none';
 };
 const refresh=()=>{paintTone();place();};
 const resize=Resize?new Resize(place):null;
 const shell=host.closest('.app-home-shell');
 for(const node of new Set([shell,...(shell?.querySelectorAll('.home-prayer-center,.app-home-top,.central-prayer,.home-prayer-center > *')||[])]))if(node)resize?.observe(node);
 const children=Observer?new Observer(()=>{for(const node of shell?.querySelectorAll('.home-prayer-center > *')||[])resize?.observe(node);place();}):null;
 const center=shell?.querySelector('.home-prayer-center');if(center)children?.observe(center,{childList:true});
 const body=Observer?new Observer(()=>paintTone()):null;if(doc.body)body?.observe(doc.body,{childList:true});
 win.addEventListener('resize',refresh);doc.addEventListener('visibilitychange',refresh);doc.fonts?.addEventListener?.('loadingdone',place);
 refresh();
 return {refresh,dispose(){if(disposed)return;disposed=true;toneObserver?.disconnect();body?.disconnect();children?.disconnect();resize?.disconnect();win.removeEventListener('resize',refresh);doc.removeEventListener('visibilitychange',refresh);doc.fonts?.removeEventListener?.('loadingdone',place);for(const key of ['left','top','width','right','maxWidth'])host.style[key]='';delete host.dataset.activityTone;}};
}
