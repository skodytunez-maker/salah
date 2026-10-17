const ordinary=new Set(['#home','#settings','#account','#more','#quran','#knowledge','#adhkar','#calendar','#qibla','#about','#staff','#support','#sources','#history','#learning','#umrah','#prayer','#day','#support-salah']);
export const WARM_LAUNCH_KEY='salah:warm-launch:v1';
const resumable=hash=>typeof hash==='string'&&hash.length<=600&&ordinary.has(hash.split('?')[0])&&!['request','qr','code','token','token_hash'].some(k=>new URLSearchParams(hash.split('?')[1]||'').has(k));
export function rememberStandaloneResume({storageObject,locationObject,documentObject,windowObject,isStandalone}){if(!isStandalone||!storageObject||!documentObject?.addEventListener)return;const remember=()=>{try{if(documentObject.hidden){if(resumable(locationObject.hash))storageObject.setItem(WARM_LAUNCH_KEY,JSON.stringify({hash:locationObject.hash}));}else storageObject.removeItem(WARM_LAUNCH_KEY);}catch{}};documentObject.addEventListener('visibilitychange',remember);windowObject?.addEventListener?.('pagehide',remember);}
export function normalizeStandaloneLaunch({locationObject,historyObject,isStandalone,isNative=false,navigationType='navigate',storageObject=null}) {
 if(!(isStandalone||isNative)||navigationType!=='navigate')return false;
 let warm=null;try{warm=JSON.parse(storageObject?.getItem(WARM_LAUNCH_KEY)||'null');storageObject?.removeItem(WARM_LAUNCH_KEY);}catch{}
 const hash=locationObject.hash||'',route=hash.split('?')[0],query=new URLSearchParams(locationObject.search||''),details=new URLSearchParams(hash.split('?')[1]||'');
 if(route&&!ordinary.has(route))return false;
 // Intentional shortcuts, authentication callbacks and shared item/message links stay at their destination.
 if(details.get('view')==='mushaf'||query.get('entry')==='shortcut'||['code','token_hash','error','notification'].some(k=>query.has(k))||['surah','ayah','item','request','qr','thread','room','conversation'].some(k=>details.has(k)))return false;
 const target=resumable(warm?.hash)?warm.hash:'#home';if(hash===target)return false;
 if(typeof historyObject?.replaceState!=='function')return false;
 try{historyObject.replaceState(historyObject.state,'',locationObject.pathname+locationObject.search+target);return true;}catch{return false;}
}
