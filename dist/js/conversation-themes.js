// Stable IDs are persisted. Add themes here without changing existing IDs.
const theme=(id,wallpaper,base,panel,incoming,outgoing,accent)=>Object.freeze({id,key:'conversationThemeUi.'+id,wallpaper,thumbnail:wallpaper?'./themes/'+id+'-thumb.webp':null,base,panel,incoming,outgoing,accent});
export const CONVERSATION_THEMES=Object.freeze([
 theme('default',null,'#070b16','#101827','#172b3b','#302e25','#d9c99a'),
 theme('ornament','./themes/ornament.webp','#0a1321','#101c2bef','#182c40f5','#373529f5','#ddc89c'),
 theme('medina','./wallpapers/madinah/night-phone-v1.webp','#071322','#0b1828ed','#152b40f5','#35372bf5','#d9cba2'),
 theme('emerald','./themes/emerald.webp','#081b19','#102923ef','#193a32f5','#344535f5','#c6d6ae'),
 theme('graphite','./themes/graphite.webp','#13171d','#20262eef','#2a333ef5','#414036f5','#dad0b7'),
 theme('bronze','./themes/bronze.webp','#201714','#2b211cef','#3a2b25f5','#4b392af5','#e4c39a'),
 theme('lake','./themes/lake.webp','#071a20','#102a33ef','#193742f5','#30443df5','#bfd3c3'),
 theme('amethyst','./themes/amethyst.webp','#1b1325','#291e33ef','#382b45f5','#47364af5','#d8bfdc'),
 theme('stars','./themes/stars.webp','#070f20','#101c30ef','#1b2b43f5','#36394af5','#c5cdea'),
]);
export const conversationTheme=id=>CONVERSATION_THEMES.find(item=>item.id===id)||CONVERSATION_THEMES[0];
export function themePreferenceKey(actor,scope){
 return typeof actor==='string'&&/^[\w-]{1,80}$/.test(actor)&&typeof scope==='string'&&/^(support|staff):[\w-]{1,80}$/.test(scope)?'salah-conversation-theme-v1:'+actor+':'+scope:null;
}
const validPhoto=id=>typeof id==='string'&&/^[\w-]{1,100}$/.test(id);
export function readThemePreference(storage,key){
 if(!key)return{theme:'default'};
 try{const raw=storage.getItem(key);if(typeof raw!=='string'||raw.length>256)return{theme:'default'};const value=JSON.parse(raw);if(value?.theme==='custom'&&validPhoto(value.photo))return{theme:'custom',photo:value.photo,...(Number.isSafeInteger(value.sharedVersion)&&value.sharedVersion>=0?{sharedVersion:value.sharedVersion}:{})};if(CONVERSATION_THEMES.some(t=>t.id===value?.theme))return{theme:value.theme};}catch{}
 return{theme:'default'};
}
// Personal photographs stay on this device, outside localStorage and never in messages.
export function createThemePhotoStore(win){
 let connection=null,handle=null,closed=false;
 const database=()=>connection||(connection=new Promise((resolve,reject)=>{
  if(closed||!win.indexedDB){reject(Error('theme_storage_unavailable'));return;}
  let failed=false;
  const request=win.indexedDB.open('salah-conversation-themes-v1',1);
  request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('photos'))request.result.createObjectStore('photos');};
  request.onerror=()=>{failed=true;connection=null;reject(request.error||Error('theme_storage_failed'));};
  request.onblocked=()=>{failed=true;connection=null;reject(Error('theme_storage_blocked'));};
  request.onsuccess=()=>{const db=request.result;if(closed||failed){db.close();reject(Error('theme_storage_unavailable'));return;}handle=db;db.onversionchange=()=>{db.close();connection=null;handle=null;};resolve(db);};
 }));
 async function operation(mode,action){const db=await database();return new Promise((resolve,reject)=>{const tx=db.transaction('photos',mode);let value;const request=action(tx.objectStore('photos'));request.onsuccess=()=>{value=request.result;};tx.oncomplete=()=>resolve(value);tx.onerror=tx.onabort=()=>reject(tx.error||Error('theme_storage_failed'));});}
 return{get:key=>operation('readonly',s=>s.get(key)),put:(key,blob)=>operation('readwrite',s=>s.put(blob,key)),remove:key=>operation('readwrite',s=>s.delete(key)),dispose(){closed=true;handle?.close();handle=null;connection=null;}};
}
const writes=new Map();
export function createThemePreferences({storage,photos,key,notify=()=>{}}){
 const read=()=>readThemePreference(storage,key);
 function save(value,{blob=null,canCommit=()=>true}={}){
  const previous=writes.get(key)||Promise.resolve();
  const pending=previous.catch(()=>{}).then(async()=>{
   if(!key||!canCommit())return false;
   if(value.theme==='custom'?!validPhoto(value.photo)||!blob:!CONVERSATION_THEMES.some(t=>t.id===value.theme))throw Error('invalid_theme');
   const old=read();let photoStored=false;
   try{
    if(blob){await photos.put(key+':'+value.photo,blob);photoStored=true;}
    if(!canCommit()){if(photoStored)await photos.remove(key+':'+value.photo);return false;}
    storage.setItem(key,JSON.stringify(value));
   }catch(error){if(photoStored)await photos.remove(key+':'+value.photo).catch(()=>{});throw error;}
   notify();if(old.photo&&old.photo!==value.photo)void photos.remove(key+':'+old.photo).catch(()=>{});return true;
  });
  writes.set(key,pending);void pending.finally(()=>{if(writes.get(key)===pending)writes.delete(key);}).catch(()=>{});return pending;
 }
 return{read,save,settled:()=>writes.get(key)||Promise.resolve(),photo:value=>value?.theme==='custom'?photos.get(key+':'+value.photo):Promise.resolve(null)};
}
