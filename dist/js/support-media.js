const PROJECT='https://kbltwszfvphgbxdbczsb.supabase.co';
export const MAX_SUPPORT_VIDEO_BYTES=20*1024*1024;
export const MAX_SUPPORT_VOICE_BYTES=6*1024*1024;
export function supportVoiceMime(value){
 const type=String(value?.type||value||'').toLowerCase().split(';')[0];
 return ['audio/mp4','audio/webm'].includes(type)?type:null;
}

export function supportVideoMime(file){
 const type=String(file?.type||'').toLowerCase();
 if(type==='video/mp4'||type==='video/quicktime')return type;
 if(type)return null;
 if(/\.mp4$/i.test(file?.name||''))return 'video/mp4';
 if(/\.mov$/i.test(file?.name||''))return 'video/quicktime';
 return null;
}

export function supportMediaUrl(value,{upload=false}={}){
 try {
  const url=new URL(value),path=upload?'/storage/v1/object/upload/sign/support-chat-media/':'/storage/v1/object/sign/support-chat-media/';
  return url.origin===PROJECT&&url.pathname.startsWith(path)&&url.searchParams.has('token')?url.href:null;
 } catch { return null; }
}

export async function uploadSupportMedia(url,file,mime,{signal,fetcher=globalThis.fetch}={}){
 const destination=supportMediaUrl(url,{upload:true});
 const voice=supportVoiceMime(file),max=voice?MAX_SUPPORT_VOICE_BYTES:MAX_SUPPORT_VIDEO_BYTES;
 if(!destination||file.size<16||file.size>max||(voice||supportVideoMime(file))!==mime)throw Error('invalid_media_upload');
 const form=new FormData();
 form.append('cacheControl','0');
 form.append('',new Blob([file],{type:mime}),({'video/quicktime':'video.mov','audio/mp4':'voice.m4a','audio/webm':'voice.webm'})[mime]||'video.mp4');
 const response=await fetcher(destination,{method:'PUT',body:form,headers:{'x-upsert':'false'},credentials:'omit',redirect:'error',referrerPolicy:'no-referrer',signal});
 if(!response.ok&&response.status!==409)throw Error('media_upload_failed');
}
