import{uiLeaf}from './ui.js';
import{waitDecodedImage}from './image-presentation.js';
// The public card shows the available original day/night photographs only.
// Its crossfade uses the same active-card, hidden and reduced-motion controls.
export function skyReleaseCard(){
 const photoStyle='position:absolute;inset:0;display:block;width:100%;height:100%;max-height:none;object-fit:cover;object-position:center;visibility:hidden';
 return '<article class="release-feature"><div class="release-new-art release-screen-art" aria-hidden="true"><div class="release-interface-preview release-basic-background-preview release-motion-preview" data-photo-state="pending" style="position:relative;width:100%;height:100%;overflow:hidden"><img data-background-part="day" data-image-pending decoding="async" src="./wallpapers/makkah/day-v1.webp" alt="" style="'+photoStyle+'"><img data-background-part="night" data-image-pending decoding="async" data-release-motion-part="element" src="./wallpapers/makkah/night-v1.webp" alt="" style="'+photoStyle+';opacity:0;animation:none;--release-motion-keyframes:release-nature-scene"></div></div><h3>'+uiLeaf('skyReleaseUi.title')+'</h3><p>'+uiLeaf('skyReleaseUi.text')+'</p><p class="release-feature-note">'+uiLeaf('skyReleaseUi.where')+'</p></article>';
}

const photoBindings=new WeakMap();
export function bindSkyReleasePhotos(root){
 for(const preview of root.querySelectorAll('.release-basic-background-preview')){
  if(photoBindings.has(preview))continue;
  const day=preview.querySelector('[data-background-part="day"]'),night=preview.querySelector('[data-background-part="night"]');if(!day||!night)continue;
  const controller=new AbortController(),dialog=preview.closest('dialog'),doc=preview.ownerDocument;
  const ready={day:false,night:false},failed={day:false,night:false};let disposed=false,observer=null;
  const live=()=>!disposed&&preview.isConnected;
  const dispose=()=>{if(disposed)return;disposed=true;controller.abort();observer?.disconnect();dialog?.removeEventListener('close',dispose);photoBindings.delete(preview);};
  const reflect=()=>{
   if(!live())return;
   if(ready.day){day.style.visibility='visible';day.removeAttribute('data-image-pending');}
   if(ready.day&&ready.night){night.style.visibility='visible';night.style.opacity='0';night.removeAttribute('data-image-pending');night.style.removeProperty('animation');preview.dataset.photoState='ready';}
   else if(failed.day&&ready.night){night.style.visibility='visible';night.style.opacity='1';night.removeAttribute('data-image-pending');preview.dataset.photoState='night';}
   else preview.dataset.photoState=ready.day?'day':failed.day&&failed.night?'unavailable':'pending';
  };
  photoBindings.set(preview,dispose);dialog?.addEventListener('close',dispose,{once:true});
  const Observer=doc.defaultView?.MutationObserver;if(Observer&&doc.body){observer=new Observer(()=>{if(!preview.isConnected)dispose();});observer.observe(doc.body,{childList:true,subtree:true});}
  for(const[name,image]of [['day',day],['night',night]]){
   const source=image.getAttribute('src');
   void waitDecodedImage(image,{signal:controller.signal,timeoutMs:0}).then(()=>{if(!live()||image.getAttribute('src')!==source)return;ready[name]=true;reflect();},()=>{if(!live()||controller.signal.aborted||image.getAttribute('src')!==source)return;failed[name]=true;reflect();});
  }
 }
}
