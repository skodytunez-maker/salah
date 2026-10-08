import{supportPhotoUrl}from './support-photo.js';
export async function saveSupportPhoto(value,{fetcher=fetch,navigatorRef=globalThis.navigator,documentRef=globalThis.document,urlRef=URL,signal}={}){
 const url=supportPhotoUrl(value);if(!url)throw Error('Фото недоступно. Обновите переписку.');
 const response=await fetcher(url,{credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',redirect:'error',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(15000)]):AbortSignal.timeout(15000)});
 if(!response.ok||response.headers.get('Content-Type')?.split(';')[0]!=='image/jpeg')throw Error('Не удалось загрузить фото. Обновите переписку и попробуйте снова.');
 const length=Number(response.headers.get('Content-Length'));if(length>614400)throw Error('Фото слишком большое.');
 const blob=await response.blob();if(!blob.size||blob.size>614400)throw Error('Фото недоступно.');
 const bytes=new Uint8Array(await blob.arrayBuffer());if(bytes[0]!==255||bytes[1]!==216||bytes.at(-2)!==255||bytes.at(-1)!==217)throw Error('Фото недоступно.');
 signal?.throwIfAborted();
 const cap=globalThis.Capacitor;
 if(cap?.isNativePlatform?.()===true&&cap.getPlatform?.()==='android'){
  const plugin=cap.Plugins?.SalahSupportPhoto;if(!plugin?.savePhoto)throw Error('Для сохранения фото обновите приложение. Пока можно открыть фото отдельно.');
  let binary='';for(let offset=0;offset<bytes.length;offset+=8192)binary+=String.fromCharCode(...bytes.subarray(offset,offset+8192));
  try{const result=await plugin.savePhoto({data:btoa(binary)});if(result?.status==='cancelled')return 'cancelled';if(result?.status==='saved')return 'saved';throw Error();}
  catch{throw Error('Не удалось сохранить фото. Проверьте свободное место и повторите попытку.');}
 }
 const file=new File([blob],'SALAH-photo.jpg',{type:'image/jpeg'});
 if(navigatorRef?.canShare?.({files:[file]})){
  try{await navigatorRef.share({files:[file],title:'Фото из обращения SALAH'});return 'shared';}
  catch(error){if(error?.name==='AbortError')return 'cancelled';throw Error('Не удалось сохранить фото. Попробуйте открыть его отдельно.');}
 }
 const objectUrl=urlRef.createObjectURL(blob),link=documentRef.createElement('a');
 link.href=objectUrl;link.download=file.name;documentRef.body.append(link);link.click();link.remove();
 setTimeout(()=>urlRef.revokeObjectURL(objectUrl),30000);return 'downloaded';
}
