const PROJECT='https://kbltwszfvphgbxdbczsb.supabase.co';
const KEY='sb_publishable_D2OGfXHyZCN_DQJpR9LTNg_mOD03jnR';
const ORIGINS=new Map([['https://skodytunez-maker.github.io','salah'],['https://sahaba-learning.skodytunez.chatgpt.site','sahaba'],['capacitor://localhost','salah'],['http://localhost','salah'],['https://localhost','salah']]);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function supportPhotoBytes(data){
 if(typeof data!=='string'||data.length>819200||!data.length||data.length%4||!/^[A-Za-z0-9+/]+={0,2}$/.test(data))throw Error('invalid_photo');
 const raw=atob(data),bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));
 if(bytes.length>614400||bytes.length<20||bytes[0]!==255||bytes[1]!==216||bytes.at(-2)!==255||bytes.at(-1)!==217)throw Error('invalid_photo');
 const parts=[bytes.slice(0,2)];let pos=2,dimensions=false,scan=false;
 while(pos<bytes.length-2){
  const start=pos;if(bytes[pos++]!==255)throw Error('invalid_photo');while(bytes[pos]===255)pos++;
  const marker=bytes[pos++],length=(bytes[pos]<<8)|bytes[pos+1];
  if(length<2||pos+length>bytes.length)throw Error('invalid_photo');
  if([192,193,194].includes(marker)){
   if(length<8)throw Error('invalid_photo');
   const height=(bytes[pos+3]<<8)|bytes[pos+4],width=(bytes[pos+5]<<8)|bytes[pos+6];
   if(!width||!height||width>1600||height>1600)throw Error('invalid_photo');dimensions=true;
  }else if(marker>=192&&marker<=207&&![196,200,204].includes(marker))throw Error('invalid_photo');
  if(marker===218){if(!dimensions)throw Error('invalid_photo');parts.push(bytes.slice(start));scan=true;break}
  if(!((marker>=224&&marker<=239)||marker===254))parts.push(bytes.slice(start,pos+length));
  pos+=length;
 }
 if(!scan)throw Error('invalid_photo');
 const clean=new Uint8Array(parts.reduce((size,p)=>size+p.length,0));let offset=0;for(const part of parts){clean.set(part,offset);offset+=part.length}return clean;
}
export async function uploadSupportPhoto(storage,args,claims,register){
 const bytes=supportPhotoBytes(args.p_photo),path=args.p_app+'/'+claims.sub+'/'+args.p_id+'.jpg';let created=false;
 try{
  const {error}=await storage.upload(path,bytes,{contentType:'image/jpeg',cacheControl:'0',upsert:false});
  if(error&&String(error.statusCode)!=='409'&&error.error!=='Duplicate')throw Error('photo_upload_failed');
  created=!error;await register(path,bytes.length);
 }catch(error){if(created){try{await storage.remove([path])}catch{}}throw error;}
}
async function writeSupportPhotos(storage,photos,pathFor,register){
 const created=[];
 try{for(let slot=0;slot<photos.length;slot++){
  const path=pathFor(slot);
  const {error}=await storage.upload(path,photos[slot],{contentType:'image/jpeg',cacheControl:'0',upsert:false});
  if(error&&String(error.statusCode)!=='409'&&error.error!=='Duplicate')throw Error('photo_upload_failed');
  if(!error)created.push(path);await register(path,photos[slot].length,slot);
 }}catch(error){if(created.length){try{await storage.remove(created)}catch{}}throw error;}
}
function supportPhotos(data){
 if(!Array.isArray(data)||data.length<1||data.length>5)throw Error('invalid_photo');
 return data.map(supportPhotoBytes);
}
export async function uploadSupportPhotos(storage,args,claims,register){
 return writeSupportPhotos(storage,supportPhotos(args.p_photos),slot=>args.p_app+'/'+claims.sub+'/'+args.p_id+(slot?'.'+slot:'')+'.jpg',register);
}
async function digestHex(bytes){
 return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),byte=>byte.toString(16).padStart(2,'0')).join('');
}
export async function submitSupportReplyPhotos(storage,args,claims,{begin,register}){
 const photos=supportPhotos(args.p_photos),body=args.p_body.trim()||'📎';
 const digests=await Promise.all(photos.map(digestHex));
 const fingerprint=await digestHex(new TextEncoder().encode(JSON.stringify([args.p_thread,body,args.p_reply_to,digests])));
 const ack=await begin(body,fingerprint,photos.length);
 if(ack.replay!==true)await writeSupportPhotos(storage,photos,slot=>'salah/'+claims.sub+'/'+args.p_id+'.'+fingerprint+'.'+slot+'.jpg',register);
 return ack;
}
export function supportMediaHeader(bytes,mime){
 if(bytes.length<16)return false;
 if(mime==='audio/webm')return bytes[0]===26&&bytes[1]===69&&bytes[2]===223&&bytes[3]===163&&bytes.some((byte,i)=>byte===66&&bytes[i+1]===130&&bytes[i+2]===132&&String.fromCharCode(...bytes.subarray(i+3,i+7))==='webm');
 if(!['video/mp4','video/quicktime','audio/mp4'].includes(mime))return false;
 for(let at=0;at<=8&&at+12<=bytes.length;){
  const size=new DataView(bytes.buffer,bytes.byteOffset+at,4).getUint32(0);
  const tag=String.fromCharCode(...bytes.subarray(at+4,at+8));
  if(tag==='ftyp'&&size>=16){
   const brand=String.fromCharCode(...bytes.subarray(at+8,at+12));
   if(mime==='audio/mp4'&&brand==='M4A ')return true;
   return mime==='video/quicktime'?brand==='qt  ':/^(?:isom|iso[2-9]|mp4[12]|avc1|M4V |MSNV|dash)$/.test(brand);
  }
  if(at!==0||size!==8||tag!=='wide')break;
  at+=size;
 }
 return false;
}
async function verifyUploadedMedia(bucket,path,mime){
 const {data,error}=await bucket.createSignedUrl(path,60);
 if(error||!data?.signedUrl)throw Error('video_unavailable');
 const response=await fetch(data.signedUrl,{headers:{Range:'bytes=0-255'},redirect:'error',signal:AbortSignal.timeout(8000)});
 if(!response.ok||!response.body)throw Error('video_unavailable');
 const stream=response.body.getReader(),header=new Uint8Array(256);let offset=0;
 try{while(offset<header.length){
  const chunk=await stream.read();if(chunk.done)break;
  const slice=chunk.value.subarray(0,header.length-offset);header.set(slice,offset);offset+=slice.length;
 }}finally{await stream.cancel().catch(()=>{});}
 return supportMediaHeader(header.subarray(0,offset),mime);
}
const SHARED_THEMES=new Set(['default','ornament','medina','emerald','graphite','bronze','lake','amethyst','stars']);
const SHAPES={support_reply_media_start:['p_app','p_owner','p_thread','p_id','p_mime','p_bytes'],support_reply_media_finish:['p_app','p_owner','p_thread','p_id','p_body','p_reply_to'],support_reply_photos:['p_app','p_owner','p_thread','p_id','p_body','p_reply_to','p_photos'],support_conversation_theme:['p_app','p_thread','p_owner','p_theme'],support_conversation_request:['p_app','p_owner','p_action','p_args'],support_chat_request:['p_app','p_owner','p_action','p_args'],support_owner_recipient:['p_user','p_app'],support_owner_create:['p_id','p_user','p_app','p_subject','p_body','p_version'],support_user_status:['p_app'],support_owner_status:['p_app'],support_list:['p_app','p_owner','p_before'],support_read:['p_id','p_app','p_owner'],support_create:['p_id','p_app','p_subject','p_body','p_version'],support_create_photo:['p_id','p_app','p_subject','p_body','p_version','p_photo'],support_create_photos:['p_id','p_app','p_subject','p_body','p_version','p_photos'],support_reply:['p_thread','p_app','p_id','p_body','p_owner'],support_close:['p_id','p_app']};
export function createSupportHandler({getUser,getClaims,invoke}){
 return async req=>{
  const origin=req.headers.get('Origin'),headers={'Content-Type':'application/json','Cache-Control':'no-store, private','Pragma':'no-cache','Vary':'Origin','X-Content-Type-Options':'nosniff'};
  if(ORIGINS.has(origin))Object.assign(headers,{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Max-Age':'600'});
  const reply=(status,value)=>new Response(JSON.stringify(value),{status,headers});
  if(origin&&!ORIGINS.has(origin))return reply(403,{error:'42501'});
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(req.method!=='POST')return reply(405,{error:'invalid_method'});
  if(new URL(req.url).search)return reply(400,{error:'22023'});
  const bearer=req.headers.get('Authorization')||'';if(!/^Bearer [A-Za-z0-9._-]{16,8192}$/.test(bearer))return reply(401,{error:'42501'});
  if(!req.headers.get('Content-Type')?.startsWith('application/json'))return reply(415,{error:'22023'});
  let body,size=0;try{if(Number(req.headers.get('Content-Length'))>4150000)return reply(413,{error:'22023'});const reader=req.body?.getReader();if(!reader)return reply(400,{error:'22023'});let chunks=[];while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>4150000){await reader.cancel();return reply(413,{error:'22023'})}chunks.push(value)}const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}body=JSON.parse(new TextDecoder().decode(bytes));}catch{return reply(size>20000?413:400,{error:'22023'})}
  if(!['support_create_photo','support_create_photos','support_reply_photos'].includes(body?.name)&&size>20000)return reply(413,{error:'22023'});
  const {name,args}=body||{};if(!Object.hasOwn(SHAPES,name)||Object.keys(body).some(key=>!['name','args'].includes(key))||!args||typeof args!=='object'||Array.isArray(args)||SHAPES[name].some(key=>!Object.hasOwn(args,key))||Object.keys(args).some(key=>!SHAPES[name].includes(key))||!['salah','sahaba'].includes(args.p_app))return reply(400,{error:'22023'});
  if(origin&&ORIGINS.get(origin)!==args.p_app)return reply(403,{error:'42501'});
  if(Object.hasOwn(args,'p_owner')&&typeof args.p_owner!=='boolean')return reply(400,{error:'22023'});
  if(name==='support_reply_media_start'&&(args.p_app!=='salah'||!['video/mp4','video/quicktime','audio/mp4','audio/webm'].includes(args.p_mime)||!Number.isSafeInteger(args.p_bytes)||args.p_bytes<16||args.p_bytes>(args.p_mime.startsWith('audio/')?6291456:20971520)))return reply(400,{error:'22023'});
  if(['support_reply_photos','support_reply_media_finish'].includes(name)&&(args.p_app!=='salah'||args.p_reply_to!==null&&!UUID.test(args.p_reply_to)))return reply(400,{error:'22023'});
  if(name==='support_conversation_theme'&&(args.p_app!=='salah'||typeof args.p_theme!=='string'||!SHARED_THEMES.has(args.p_theme)))return reply(400,{error:'22023'});
  if(name==='support_conversation_request'){
   const shapes={list:['before'],read:['threadId','before','around'],clear:['threadId','scope','operationId'],close:['threadId','operationId']},keys=typeof args.p_action==='string'&&Object.hasOwn(shapes,args.p_action)?shapes[args.p_action]:null,a=args.p_args;
   if(args.p_app!=='salah'||!keys||!a||typeof a!=='object'||Array.isArray(a)||Object.keys(a).some(k=>!keys.includes(k))||args.p_action!=='list'&&!UUID.test(a.threadId))return reply(400,{error:'22023'});
   if(a.around!=null&&(!UUID.test(a.around)||a.before!=null))return reply(400,{error:'22023'});
   if(a.before!=null&&(typeof a.before!=='object'||Array.isArray(a.before)||Object.keys(a.before).some(k=>!['at','id'].includes(k))||typeof a.before.at!=='string'||!Number.isFinite(Date.parse(a.before.at))||!UUID.test(a.before.id)))return reply(400,{error:'22023'});
   if(['clear','close'].includes(args.p_action)&&(!UUID.test(a.operationId)||args.p_action==='clear'&&!['self','everyone'].includes(a.scope)))return reply(400,{error:'22023'});
  }
  if(name==='support_chat_request'){const shapes={read:['threadId'],reply:['threadId','messageId','body','replyTo'],delete:['threadId','messageId','scope','operationId'],clear:['threadId','scope','operationId'],reopen:['threadId','operationId'],close:['threadId','operationId']},keys=typeof args.p_action==='string'&&Object.hasOwn(shapes,args.p_action)?shapes[args.p_action]:null,a=args.p_args;if(args.p_app!=='salah'||!keys||!a||typeof a!=='object'||Array.isArray(a)||Object.keys(a).some(k=>!keys.includes(k))||!UUID.test(a.threadId))return reply(400,{error:'22023'});if(args.p_action==='reply'&&(!UUID.test(a.messageId)||typeof a.body!=='string'||!a.body.trim()||a.body.length>3000||a.replyTo!=null&&!UUID.test(a.replyTo)))return reply(400,{error:'22023'});if(['delete','clear','reopen','close'].includes(args.p_action)&&(!UUID.test(a.operationId)||!['reopen','close'].includes(args.p_action)&&!['self','everyone'].includes(a.scope)||args.p_action==='delete'&&!UUID.test(a.messageId)))return reply(400,{error:'22023'});}

  for(const key of ['p_id','p_thread','p_user'])if(Object.hasOwn(args,key)&&!UUID.test(args[key]))return reply(400,{error:'22023'});
  if(Object.hasOwn(args,'p_before')&&args.p_before!==null&&(typeof args.p_before!=='string'||!Number.isFinite(Date.parse(args.p_before))))return reply(400,{error:'22023'});
  if(Object.hasOwn(args,'p_body')&&(typeof args.p_body!=='string'||!['support_reply_photos','support_reply_media_finish'].includes(name)&&args.p_body.trim().length<1||args.p_body.length>3000)||Object.hasOwn(args,'p_subject')&&(typeof args.p_subject!=='string'||args.p_subject.trim().length<1||args.p_subject.length>120)||Object.hasOwn(args,'p_version')&&(typeof args.p_version!=='string'||args.p_version.length>40))return reply(400,{error:'22023'});
  if(name==='support_create_photo'){try{supportPhotoBytes(args.p_photo)}catch{return reply(400,{error:'22023'})}}
  if(['support_create_photos','support_reply_photos'].includes(name)){try{supportPhotos(args.p_photos)}catch{return reply(400,{error:'22023'})}}
  let user,claims;try{const checked=await getUser(bearer.slice(7));if(checked.error)return reply(401,{error:'42501'});user=checked.data?.user;const signed=await getClaims(bearer.slice(7));if(signed.error)return reply(401,{error:'42501'});claims=signed.data?.claims;}catch{return reply(503,{error:'auth_unavailable'})}
  if(!user?.email_confirmed_at||user.is_anonymous||!UUID.test(user.id)||claims?.sub!==user.id||claims.iss!==PROJECT+'/auth/v1'||!UUID.test(claims.session_id||''))return reply(401,{error:'42501'});
  try{return reply(200,{data:await invoke(name,args,claims)});}catch(error){const known=['support_rate_limit','conversation_closed','conversation_full','reply_unavailable'];if(error?.code==='42501')return reply(403,{error:'42501'});if(error?.code==='22023')return reply(400,{error:'22023'});if(known.includes(error?.message))return reply(429,{error:error.message});return reply(503,{error:'support_unavailable'})}
 };
}
if(typeof Deno!=='undefined'){
 const {createClient}=await import('npm:@supabase/supabase-js@2.117.2');const {default:postgres}=await import('npm:postgres@3.4.9');
 const sql=postgres(Deno.env.get('SUPABASE_DB_URL'),{max:1,prepare:false,idle_timeout:20,connect_timeout:10});
 const auth=createClient(PROJECT,KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 let adminKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!adminKey){try{adminKey=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}').default;}catch{}}
 if(!adminKey)throw Error('Supabase server-side admin key is not configured');
 const storageClient=createClient(PROJECT,adminKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:(url,init)=>fetch(url,{...init,signal:AbortSignal.timeout(12000)})}}).storage;
 const storage=storageClient.from('support-photos'),videos=storageClient.from('support-chat-media');
 const invoke=async(name,a,claims)=>{
  return await sql.begin(async tx=>{
   await tx`select pg_catalog.set_config('request.jwt.claims',${JSON.stringify(claims)},true)`;let rows;
   if(name==='support_owner_recipient')rows=await tx`select public.support_owner_recipient(${a.p_user}::uuid,${a.p_app}::text) as data`;
   else if(name==='support_owner_create')rows=await tx`select public.support_owner_create(${a.p_id}::uuid,${a.p_user}::uuid,${a.p_app}::text,${a.p_subject}::text,${a.p_body}::text,${a.p_version}::text) as data`;
   else if(name==='support_user_status')rows=await tx`select public.support_user_status(${a.p_app}::text) as data`;
   else if(name==='support_owner_status')rows=await tx`select public.support_owner_status(${a.p_app}::text) as data`;
   else if(name==='support_list')rows=await tx`select public.support_list(${a.p_app}::text,${a.p_owner}::boolean,${a.p_before}::timestamptz) as data`;
   else if(name==='support_conversation_theme')rows=await tx`select salah_support_private.conversation_theme(${a.p_thread}::uuid,${a.p_owner}::boolean,${a.p_theme}::text) as data`;
   else if(name==='support_conversation_request'){
    rows=await tx`select public.support_conversation_request(${a.p_app}::text,${a.p_owner}::boolean,${a.p_action}::text,${tx.json(a.p_args)}::jsonb) as data`;
    if(a.p_action==='read'){
     const [shared]=await tx`select salah_support_private.conversation_theme(${a.p_args.threadId}::uuid,${a.p_owner}::boolean) as data`;
     rows[0].data.sharedTheme=shared.data;
     const [videoManifest]=await tx`select salah_support_private.reply_media_manifest(${a.p_args.threadId}::uuid,${a.p_owner}::boolean,${tx.array(rows[0].data.messages.map(message=>message.id))}::uuid[]) as data`;
     rows[0].data.videoReplies=true;
     rows[0].data.voiceReplies=true;
     rows[0].data.media=await Promise.all(videoManifest.data.map(async video=>{const {data,error}=await videos.createSignedUrl(video.path,300);return error?{message_id:video.message_id,mime:video.mime,unavailable:true}:{message_id:video.message_id,url:data.signedUrl,mime:video.mime};}));
     const manifest=rows[0].data.photoManifest||[];delete rows[0].data.photoManifest;
     rows[0].data.photos=await Promise.all(manifest.map(async photo=>{const {data,error}=await storage.createSignedUrl(photo.path,300);return error?{message_id:photo.message_id,unavailable:true}:{message_id:photo.message_id,url:data.signedUrl};}));
    }
   }
   else if(name==='support_read'||name==='support_chat_request'&&a.p_action==='read'){
    const threadId=name==='support_read'?a.p_id:a.p_args.threadId;
    rows=name==='support_read'?await tx`select public.support_read(${threadId}::uuid,${a.p_app}::text,${a.p_owner}::boolean) as data`:await tx`select public.support_chat_request(${a.p_app}::text,${a.p_owner}::boolean,${a.p_action}::text,${tx.json(a.p_args)}::jsonb) as data`;
    if(a.p_owner&&a.p_app==='salah'){const [visibility]=await tx`select team_visible from public.support_threads where id=${threadId}::uuid and app='salah'`;rows[0].data.thread.team_visible=visibility?.team_visible===true;}
    const [manifest]=await tx`select public.support_photo_manifest(${threadId}::uuid,${a.p_app}::text,${a.p_owner}::boolean) as data`;
    rows[0].data.photos=await Promise.all((manifest.data||[]).map(async photo=>{const {data,error}=await storage.createSignedUrl(photo.path,300);return error?{message_id:photo.message_id,unavailable:true}:{message_id:photo.message_id,url:data.signedUrl}}));
   }
   else if(['support_create','support_create_photo','support_create_photos'].includes(name)){
    // support_create holds the user lock until the photo and message commit together.
    rows=await tx`select public.support_create(${a.p_id}::uuid,${a.p_app}::text,${a.p_subject}::text,${a.p_body}::text,${a.p_version}::text) as data`;
    if(name==='support_create_photo'){
     await uploadSupportPhoto(storage,a,claims,(path,size)=>tx`select public.support_photo_register(${a.p_id}::uuid,${a.p_app}::text,${path}::text,${size}::integer)`);
    }else if(name==='support_create_photos'){
     await uploadSupportPhotos(storage,a,claims,(path,size,slot)=>tx`select public.support_photo_register_slot(${a.p_id}::uuid,${a.p_app}::text,${path}::text,${size}::integer,${slot}::integer)`);
    }
   }
   else if(name==='support_reply_media_start'||name==='support_reply_media_finish'){
    const perform=async(phase,args)=>(await tx`select salah_support_private.reply_media_request(${a.p_owner}::boolean,${a.p_thread}::uuid,${a.p_id}::uuid,${phase}::text,${tx.json(args)}::jsonb) as data`)[0].data;
    if(name==='support_reply_media_start'){
     const draft=await perform('reserve',{mime:a.p_mime,bytes:a.p_bytes});
     const expired=await tx`select draft_id,object_path from salah_support_private.reply_media where published_id is null and created_at<now()-interval '27 hours' order by created_at limit 5 for update skip locked`;
     if(expired.length){
      const removed=await videos.remove(expired.map(item=>item.object_path)).catch(()=>null);
      if(removed&&!removed.error)await tx`delete from salah_support_private.reply_media where published_id is null and draft_id=any(${tx.array(expired.map(item=>item.draft_id))}::uuid[])`;
     }
     let uploadUrl=null;if(!draft.uploaded&&!draft.published){const signed=await videos.createSignedUploadUrl(draft.path,{upsert:false});if(signed.error||!signed.data?.signedUrl)throw Error('video_unavailable');uploadUrl=signed.data.signedUrl;}
     rows=[{data:{uploadUrl,uploaded:draft.uploaded||draft.published}}];
    }else{
     const draft=await perform('inspect',{});
     const verified=draft.published||draft.uploaded&&await verifyUploadedMedia(videos,draft.path,draft.mime);
     if(!verified)throw Object.assign(Error('invalid_video'),{code:'22023'});
     rows=[{data:await perform('publish',{body:a.p_body,replyTo:a.p_reply_to,verified})}];
    }
   }
   else if(name==='support_reply_photos'){
    const data=await submitSupportReplyPhotos(storage,a,claims,{
     begin:async(body,fingerprint,count)=>(await tx`select salah_support_private.begin_reply_photos(${a.p_owner}::boolean,${a.p_thread}::uuid,${a.p_id}::uuid,${body}::text,${a.p_reply_to}::uuid,${fingerprint}::text,${count}::integer) as data`)[0].data,
     register:(path,size,slot)=>tx`select salah_support_private.register_reply_photo(${a.p_owner}::boolean,${a.p_id}::uuid,${path}::text,${size}::integer,${slot}::integer)`
    });
    rows=[{data}];
   }
   else if(name==='support_chat_request')rows=await tx`select public.support_chat_request(${a.p_app}::text,${a.p_owner}::boolean,${a.p_action}::text,${tx.json(a.p_args)}::jsonb) as data`;
   else if(name==='support_reply')rows=await tx`select public.support_reply(${a.p_thread}::uuid,${a.p_app}::text,${a.p_id}::uuid,${a.p_body}::text,${a.p_owner}::boolean) as data`;
   else rows=await tx`select public.support_close(${a.p_id}::uuid,${a.p_app}::text) as data`;
   return rows[0]?.data??null;
  });
 };
 Deno.serve(createSupportHandler({getUser:token=>auth.auth.getUser(token),getClaims:token=>auth.auth.getClaims(token),invoke}));
}
