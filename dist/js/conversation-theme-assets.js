// These exact lossless images already exist in the verified parent commit.
// Native updates retain the small previews and fetch the chosen original only.
export const THEME_ASSET_COMMIT='c041fd9e9440a07ba240075c7998731a8dfddc5a';
const base='https://raw.githubusercontent.com/skodytunez-maker/salah/'+THEME_ASSET_COMMIT+'/dist/';
const valid=blob=>blob?.type==='image/webp'&&blob.size>0&&blob.size<=3*1024*1024;
export async function conversationThemeAsset(theme,{win,baseURI,store,signal,fetchImage=(url,options)=>win.fetch(url,options)}={}){
 let native=false;try{native=win.Capacitor?.isNativePlatform?.()===true;}catch{}
 if(!native||!theme.wallpaper?.startsWith('./themes/'))return{url:new URL(theme.wallpaper,baseURI).href,owned:false};
 const check=()=>{if(signal?.aborted)throw Object.assign(Error('theme_cancelled'),{name:'AbortError'});};
 check();const key='builtin:'+THEME_ASSET_COMMIT+':'+theme.id;
 let blob;try{blob=await store?.get(key);}catch{}
 check();
 if(!valid(blob)){
  const controller=new win.AbortController(),abort=()=>controller.abort();signal?.addEventListener('abort',abort,{once:true});
  const timer=win.setTimeout(abort,15000);
  try{
   const response=await fetchImage(new URL(theme.wallpaper,base).href,{signal:controller.signal,credentials:'omit',redirect:'error',cache:'force-cache'});
   if(response.status!==200||!/^image\/webp(?:;|$)/i.test(response.headers.get('Content-Type')||''))throw Error('theme_image_unavailable');
   blob=await response.blob();check();if(!valid(blob))throw Error('invalid_theme_image');
  }finally{win.clearTimeout(timer);signal?.removeEventListener('abort',abort);}
  // A full or unavailable device store must not discard a valid online image.
  try{await store?.put(key,blob);}catch{}
 }
 check();return{url:win.URL.createObjectURL(blob),owned:true};
}
