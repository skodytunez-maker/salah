// Read existing scene light; never sample/repaint photographs or change Home flow.
export function activityTone(day,clouds=0,previous='light'){
 if(!Number.isFinite(day))return previous;
 const light=Math.max(0,Math.min(1,day)),cover=Math.max(0,Math.min(1,Number.isFinite(clouds)?clouds:0));
 if(light>=.28&&cover>=(previous==='overcast'?.52:.64))return 'overcast';
 const brightness=light*(.65-.18*cover)+.04;
 return brightness>.38?'ink':brightness<.26||previous==='overcast'?'light':previous;
}
// Keep a bounded right-hand rail outside the centred brand,independent of table mode.
export function activityRailWidth(shellWidth,brandWidth){
 if(!Number.isFinite(shellWidth)||!Number.isFinite(brandWidth)||shellWidth<=0||brandWidth<=0)return null;
 return Math.max(24,Math.min(shellWidth,(shellWidth-brandWidth)/2-8));
}
export function mountHomeActivityAppearance(host,{doc=host?.ownerDocument}={}){
 const win=doc?.defaultView;if(!host||!win)return{refresh(){},dispose(){}};
 let disposed=false,scene=null,tone='light';
 const Observer=win.MutationObserver,Resize=win.ResizeObserver;
 const toneObserver=Observer?new Observer(()=>paintTone()):null;
 const paintTone=()=>{if(disposed||doc.hidden)return;
  const next=doc.getElementById('home-scene');if(next!==scene){toneObserver?.disconnect();scene=next;if(scene)toneObserver?.observe(scene,{attributes:true,attributeFilter:['data-phase','style']});}
  if(scene){const day=scene.style.getPropertyValue('--scene-day').trim(),clouds=scene.style.getPropertyValue('--scene-clouds').trim();tone=activityTone(day===''?NaN:Number(day),clouds===''?0:Number(clouds),tone);}
  if(host.dataset.activityTone!==tone)host.dataset.activityTone=tone;
 };
 const place=()=>{if(disposed||doc.hidden||!host.isConnected)return;
  const shell=host.closest('.app-home-shell'),brand=shell?.querySelector('.app-home-brand');
  const width=activityRailWidth(shell?.getBoundingClientRect().width,brand?.getBoundingClientRect().width);
  if(width===null)return;const value=Math.round(width*100)/100+'px';if(host.style.maxWidth!==value)host.style.maxWidth=value;
 };
 const refresh=()=>{paintTone();place();};
 const resize=Resize?new Resize(place):null;
 const shell=host.closest('.app-home-shell');
 for(const node of new Set([shell,...(shell?.querySelectorAll('.app-home-brand')||[])]))if(node)resize?.observe(node);
 const children=Observer?new Observer(()=>{for(const node of shell?.querySelectorAll('.home-prayer-center > *')||[])resize?.observe(node);place();}):null;
 const center=shell?.querySelector('.home-prayer-center');if(center)children?.observe(center,{childList:true});
 const body=Observer?new Observer(()=>paintTone()):null;if(doc.body)body?.observe(doc.body,{childList:true});
 win.addEventListener('resize',refresh);doc.addEventListener('visibilitychange',refresh);doc.fonts?.addEventListener?.('loadingdone',place);
 refresh();
 return {refresh,dispose(){if(disposed)return;disposed=true;toneObserver?.disconnect();body?.disconnect();children?.disconnect();resize?.disconnect();win.removeEventListener('resize',refresh);doc.removeEventListener('visibilitychange',refresh);doc.fonts?.removeEventListener?.('loadingdone',place);for(const key of ['left','top','width','right','maxWidth'])host.style[key]='';delete host.dataset.activityTone;}};
}
