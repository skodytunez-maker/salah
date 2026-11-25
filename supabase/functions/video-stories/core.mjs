export const VIDEO_STORY_BUCKET='salah-video-stories';
export const VIDEO_STORY_MAX_BYTES=24*1024*1024;
export const isStoryId=value=>typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);
export const videoMime=value=>['video/mp4','video/quicktime'].includes(value)?value:null;
export const videoPath=(id,mime)=>id+(mime==='video/quicktime'?'.mov':'.mp4');

export function storyRecord(row){
 return {id:row.id,publishedAt:new Date(row.published_at).toISOString(),expiresAt:new Date(row.expires_at).toISOString(),highlighted:row.highlighted};
}

export function storyUrlLifetime(row,archive=false,now=Date.now()){
 if(!row?.published_at||row.removed_at)return 0;
 if(row.highlighted||archive)return 300;
 return Math.max(0,Math.min(300,Math.floor((new Date(row.expires_at).getTime()-now)/1000)));
}

export async function readLimitedBody(request,{min=1,max}){
 const declared=request.headers.get('content-length');
 if(declared!==null&&(!/^\d+$/.test(declared)||Number(declared)<min||Number(declared)>max))throw Error('size');
 if(!request.body)throw Error('size');
 const reader=request.body.getReader();
 let size=0;const chunks=[];
 try{
  for(;;){
   const {value,done}=await reader.read();if(done)break;
   size+=value.byteLength;
   if(size>max){void reader.cancel().catch(()=>{});throw Error('size');}
   chunks.push(value);
  }
 }finally{reader.releaseLock();}
 if(size<min||declared!==null&&Number(declared)!==size)throw Error('size');
 const bytes=new Uint8Array(size);
 let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
 return bytes;
}

export async function readLimitedVideo(request,mime){
 if(!videoMime(mime))throw Error('format');
 const bytes=await readLimitedBody(request,{min:16,max:VIDEO_STORY_MAX_BYTES});
 const firstBox=String.fromCharCode(...bytes.subarray(4,8));
 if(firstBox!=='ftyp'&&!(mime==='video/quicktime'&&firstBox==='wide'))throw Error('format');
 return bytes;
}

export function storyUploadOptions(params,contentType){
 const id=params.get('id'),hours=params.get('hours'),highlight=params.get('highlight'),mime=videoMime(contentType?.split(';')[0]?.trim().toLowerCase());
 if(!isStoryId(id)||!['24','48'].includes(hours)||!['0','1'].includes(highlight)||!mime)return null;
 return {id:id.toLowerCase(),hours:Number(hours),highlighted:highlight==='1',mime};
}

export const STORY_REACTIONS = ['🤲', '❤️', '👍', '✨'];

export function storyPoll(encoded) {
  if (encoded === null) return null;
  if (typeof encoded !== 'string' || encoded.length > 8000) throw Error('invalid_poll');
  const value = JSON.parse(decodeURIComponent(encoded));
  if (!value || typeof value.question !== 'string' || !Array.isArray(value.choices) ||
      value.choices.length < 2 || value.choices.length > 4 ||
      value.choices.some(choice => typeof choice !== 'string')) throw Error('invalid_poll');
  const question = value.question.trim();
  const choices = value.choices.map(choice => choice.trim());
  if (!question || question.includes('\u0000') || [...question].length > 120 || new Set(choices).size !== choices.length ||
      choices.some(choice => !choice || choice.includes('\u0000') || [...choice].length > 60)) throw Error('invalid_poll');
  return {question, choices};
}

export function storyInteraction(value) {
  if (!value || typeof value !== 'object') return null;
  const {action} = value;
  if (action === 'like' && typeof value.value === 'boolean') return {action, value: value.value};
  if (action === 'react' && (value.value === null || STORY_REACTIONS.includes(value.value))) return {action, value: value.value};
  if (action === 'vote' && Number.isInteger(value.value) && value.value >= 0 && value.value <= 3) return {action, value: value.value};
  if (action === 'comment' && isStoryId(value.id) && typeof value.text === 'string') {
    const text = value.text.trim();
    if (text && [...text].length <= 500 && !text.includes('\u0000')) return {action, text, id: value.id};
  }
  return null;
}
