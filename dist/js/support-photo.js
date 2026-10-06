const MAX_BYTES=614400,MAX_INPUT=25*1024*1024;
export function supportPhotoUrl(value){
 try{const url=new URL(value);return url.origin==='https://kbltwszfvphgbxdbczsb.supabase.co'&&url.pathname.startsWith('/storage/v1/object/sign/support-photos/')?url.href:null}catch{return null}
}
export async function prepareSupportPhoto(file){
 if(!file||!['image/jpeg','image/png','image/webp','image/heic','image/heif'].includes(file.type))throw Error('Выберите фото JPG, PNG, WebP или HEIC.');
 if(!file.size||file.size>MAX_INPUT)throw Error('Фото слишком большое. Выберите файл до 25 МБ.');
 const url=URL.createObjectURL(file),image=new Image();
 try{
  await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('Не удалось открыть фото. Выберите другой снимок.'));image.src=url});
  if(!image.naturalWidth||!image.naturalHeight||image.naturalWidth*image.naturalHeight>80000000)throw Error('Фото слишком большое.');
  let scale=Math.min(1,1600/Math.max(image.naturalWidth,image.naturalHeight)),blob;
  const canvas=document.createElement('canvas');
  for(let attempt=0;attempt<4;attempt++){
   canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
   const context=canvas.getContext('2d');if(!context)throw Error('Не удалось подготовить фото.');
   context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);
   blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',attempt===0?.82:.65));
   if(blob?.size&&blob.size<=MAX_BYTES)break;scale*=.75;
  }
  if(!blob?.size||blob.size>MAX_BYTES)throw Error('Не удалось уменьшить фото. Выберите другой снимок.');
  const preview=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('Не удалось прочитать фото.'));reader.readAsDataURL(blob)});
  if(typeof preview!=='string'||!preview.startsWith('data:image/jpeg;base64,'))throw Error('Не удалось подготовить фото.');
  return{data:preview.slice(23),preview};
 }finally{URL.revokeObjectURL(url);image.src=''}
}
