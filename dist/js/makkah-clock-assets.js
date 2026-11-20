// Versioned lossless clock illustrations. Only these two immutable portrait paths may
// use the public Pages source when absent from a native shell.
export const MAKKAH_CLOCK_IMAGES=Object.freeze({"wallpapers/makkah/day-phone-clock-v2.webp":{"sha256":"c02d65fce22096d4e63df336eb74919cfe40b1615d9d4c96d518517fad056360","bytes":1938628},"wallpapers/makkah/night-phone-clock-v2.webp":{"sha256":"1fd9e427ba258d63e7841974709f406a9035f302166e4d271f22a9086978360c","bytes":1567480}});
for(const value of Object.values(MAKKAH_CLOCK_IMAGES))Object.freeze(value);
const root=new URL('../',import.meta.url),publicRoot='https://skodytunez-maker.github.io/salah/';
const aborted=()=>Object.assign(Error('clock-cancelled'),{name:'AbortError'});
export function clockWallpaperInfo(source){
 try{const u=new URL(source,root);if(u.search||u.hash||u.protocol!==root.protocol||u.host!==root.host||!u.pathname.startsWith(root.pathname))return null;const key=u.pathname.slice(root.pathname.length);return Object.hasOwn(MAKKAH_CLOCK_IMAGES,key)?{key,...MAKKAH_CLOCK_IMAGES[key]}:null;}catch{return null;}
}
export function clockWallpaperFetchURL(source,{native}={}){
 if(native===undefined)try{native=globalThis.Capacitor?.isNativePlatform?.()===true;}catch{native=false;}
 const info=clockWallpaperInfo(source);return native&&info?new URL(info.key,publicRoot).href:source;
}
export async function verifyClockWallpaper(source,bytes,{digest=globalThis.crypto?.subtle?.digest?.bind(globalThis.crypto.subtle)}={}){
 const info=clockWallpaperInfo(source);if(!info)return true;
 if(!bytes||bytes.byteLength!==info.bytes||typeof digest!=='function')return false;
 const hash=Array.from(new Uint8Array(await digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');return hash===info.sha256;
}
export async function fetchClockWallpaper(source,{fetcher=globalThis.fetch,signal,native,timeout=20000,setTimer=setTimeout,clearTimer=clearTimeout}={}){
 if(!clockWallpaperInfo(source))throw Error('unknown-clock-source');if(signal?.aborted)throw aborted();
 const controller=new AbortController();let timer,rejectStop;
 const stop=new Promise((_,reject)=>{rejectStop=reject;});
 const cancel=()=>{controller.abort();rejectStop(aborted());};signal?.addEventListener('abort',cancel,{once:true});
 timer=setTimer(()=>{controller.abort();rejectStop(Error('clock-download-timeout'));},timeout);
 try{return await Promise.race([(async()=>{const response=await fetcher(clockWallpaperFetchURL(source,{native}),{signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer',redirect:'error',cache:'force-cache'});if(response.status!==200||response.type==='opaque'||response.headers.has('Content-Range')||!/^image\/webp(?:;|$)/i.test(response.headers.get('Content-Type')||''))throw Error('invalid-clock-response');const bytes=await response.arrayBuffer();if(signal?.aborted)throw aborted();if(!await verifyClockWallpaper(source,bytes))throw Error('invalid-clock-integrity');if(signal?.aborted)throw aborted();return new Response(bytes,{status:200,headers:{'Content-Type':'image/webp','Content-Length':String(bytes.byteLength)}});})(),stop]);}
 finally{clearTimer(timer);signal?.removeEventListener('abort',cancel);controller.abort();}
}
// This is non-secret artwork. The live server/MFA owner grant is supplied by
// Home, never a saved role or catalogue flag. Public/default/landscape stay v1.
export function clockPreviewAssets(entry,tablet,previewAccess){
 let allowed=false;try{allowed=typeof previewAccess==='function'&&previewAccess()===true;}catch{}
 if(!allowed||tablet||entry?.id!=='makkah'||entry.day!=='wallpapers/makkah/day-phone-v1.webp'||entry.night!=='wallpapers/makkah/night-phone-v1.webp'||entry.mask!=='wallpapers/makkah/sky-phone-v1.svg')return entry;
 return {...entry,day:'wallpapers/makkah/day-phone-clock-v2.webp',night:'wallpapers/makkah/night-phone-clock-v2.webp',mask:'wallpapers/makkah/sky-phone-clock-v2.svg',clockPreview:true};
}
export function legacyClockAssets(entry){
 if(entry?.id!=='makkah'||entry.day!=='wallpapers/makkah/day-phone-clock-v2.webp'||entry.night!=='wallpapers/makkah/night-phone-clock-v2.webp'||entry.mask!=='wallpapers/makkah/sky-phone-clock-v2.svg')return null;
 return {...entry,day:'wallpapers/makkah/day-phone-v1.webp',night:'wallpapers/makkah/night-phone-v1.webp',mask:'wallpapers/makkah/sky-phone-v1.svg',clockPreview:false};
}
