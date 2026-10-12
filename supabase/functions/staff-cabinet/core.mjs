export const PROJECT='https://kbltwszfvphgbxdbczsb.supabase.co';
export const OWNER_ID='dc1eb1cc-6f8f-472f-a937-735fbfbba4b7';
export const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ORIGINS=new Set(['https://skodytunez-maker.github.io','capacitor://localhost','http://localhost','https://localhost']);
const fail=(code='invalid_parameters',status=400)=>{throw Object.assign(new Error(code),{status});};
const object=x=>x&&typeof x==='object'&&!Array.isArray(x);
export function exactObject(x,keys){if(!object(x)||Object.keys(x).some(k=>!keys.includes(k)))fail();return x;}
const id=x=>{if(!UUID.test(x||''))fail();return x.toLowerCase();};
const revision=x=>{if(!Number.isSafeInteger(x)||x<1||x>100000000)fail();return x;};
export function cleanText(x,max,{empty=false}={}){if(typeof x!=='string')fail();const value=x.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'').trim();if(value.length>max||!empty&&!value.length)fail();return value;}
const kind=x=>{if(!['reciter','wallpaper'].includes(x))fail('invalid_kind');return x;};
const number=(x,min,max)=>{if(typeof x!=='number'||!Number.isFinite(x)||x<min||x>max)fail();return x;};
const optionalAsset=x=>x===null||x===undefined||x===''?null:id(x);
export function audioRoot(value){
 if(typeof value!=='string'||value.length>500)fail('invalid_audio_source');let url;try{url=new URL(value);}catch{fail('invalid_audio_source');}
 const h=url.hostname.toLowerCase();const allowed=/^server\d{1,2}\.mp3quran\.net$/.test(h)||['cdn.mp3quran.net','archive.org','ummah.su'].includes(h)||/^(?:ia\d+\.(?:us\.)?)?archive\.org$/.test(h);
 if(!allowed||url.protocol!=='https:'||url.port||url.username||url.password||url.search||url.hash||/%(?:2e|2f|5c)|[\\\s]/i.test(url.pathname)||url.pathname.split('/').some(x=>x==='.'||x==='..'))fail('invalid_audio_source');
 return url.href.endsWith('/')?url.href:url.href+'/';
}
export function validateDraftPayload(type,value,entityId){
 if(type==='reciter'){
  exactObject(value,['name','format','server','folder','availableSurahs','group','portraitAsset','comment']);
  if(!/^ar\.[a-z][a-z0-9-]{1,70}$/.test(entityId||''))fail('invalid_reciter_id');
  const output={name:cleanText(value.name,100),portraitAsset:optionalAsset(value.portraitAsset),comment:cleanText(value.comment||'',1000,{empty:true})};
  if(value.format!==undefined){if(!['verse','surah'].includes(value.format))fail();output.format=value.format;}
  if(value.server){output.server=audioRoot(value.server);}
  if(value.folder){if(!/^[A-Za-z0-9_-]{1,100}$/.test(value.folder))fail('invalid_audio_source');output.folder=value.folder;}
  if(value.availableSurahs!==undefined){if(!Array.isArray(value.availableSurahs)||!value.availableSurahs.length||value.availableSurahs.length>114||value.availableSurahs.some(x=>!Number.isInteger(x)||x<1||x>114)||new Set(value.availableSurahs).size!==value.availableSurahs.length)fail();output.availableSurahs=[...value.availableSurahs].sort((a,b)=>a-b);}
  if(value.group!==undefined){if(!['','makkah','madinah'].includes(value.group))fail();output.group=value.group;}
  return output;
 }
 if(type!=='wallpaper')fail('invalid_kind');
 exactObject(value,['name','landmark','latitude','longitude','radius','phoneDayAsset','phoneNightAsset','tabletDayAsset','tabletNightAsset','skyPhone','skyTablet','comment']);
 if(!/^[a-z0-9][a-z0-9-]{1,59}$/.test(entityId||''))fail('invalid_wallpaper_id');
 const out={name:cleanText(value.name,120),landmark:cleanText(value.landmark,120),latitude:number(value.latitude,-90,90),longitude:number(value.longitude,-180,180),radius:number(value.radius,1,80),skyPhone:number(value.skyPhone??.55,.2,.85),skyTablet:number(value.skyTablet??.55,.2,.85),comment:cleanText(value.comment||'',1000,{empty:true})};
 for(const field of ['phoneDayAsset','phoneNightAsset','tabletDayAsset','tabletNightAsset'])out[field]=optionalAsset(value[field]);
 if(Boolean(out.phoneDayAsset)!==Boolean(out.phoneNightAsset)||Boolean(out.tabletDayAsset)!==Boolean(out.tabletNightAsset))fail('paired_images_required');return out;
}
function timestamp(x){if(x===null||x===undefined)return null;if(typeof x!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(x)||!Number.isFinite(Date.parse(x)))fail();return x;}
export function validateAction(action,args){
 if(typeof action!=='string'||action.length>60)fail();
 const simple=['gate','member.list','review.list','audit.list','chat.rooms','chat.contacts','chat.status'];
 if(simple.includes(action)){exactObject(args,action==='review.list'?['kind']:[]);if(args.kind!==undefined)kind(args.kind);return {...args};}
 if(action==='member.search'){exactObject(args,['query']);return{query:cleanText(args.query,40)};}
 if(action==='member.set'){exactObject(args,['userId','role','active']);if(!['admin','moderator'].includes(args.role)||typeof args.active!=='boolean')fail('invalid_member');return{userId:id(args.userId),role:args.role,active:args.active};}
 if(action==='draft.list'){exactObject(args,['kind']);return{kind:kind(args.kind)};}
 if(action==='draft.get'||action==='asset.list'){exactObject(args,['id','kind']);return{id:id(args.id),kind:kind(args.kind)};}
 if(action==='draft.save'){exactObject(args,['id','kind','entityId','payload','revision']);const k=kind(args.kind);return{id:id(args.id),kind:k,entityId:args.entityId,payload:validateDraftPayload(k,args.payload,args.entityId),...(args.revision===undefined?{}:{revision:revision(args.revision)})};}
 if(action==='draft.submit'||action==='catalog.publish'){exactObject(args,['id','kind','revision']);return{id:id(args.id),kind:kind(args.kind),revision:revision(args.revision)};}
 if(action==='review.return'||action==='review.reject'){exactObject(args,['id','revision','note']);return{id:id(args.id),revision:revision(args.revision),note:cleanText(args.note,1000)};}
 if(action==='support.share'){exactObject(args,['id','visible']);if(typeof args.visible!=='boolean')fail();return{id:id(args.id),visible:args.visible};}
 if(action==='support.list'){exactObject(args,['before']);return{before:timestamp(args.before)};}
 if(action==='support.read'||action==='support.close'){exactObject(args,['id']);return{id:id(args.id)};}
 if(action==='support.reply'){exactObject(args,['id','messageId','body']);return{id:id(args.id),messageId:id(args.messageId),body:cleanText(args.body,3000)};}
 if(action==='chat.open'){exactObject(args,['userId']);return{userId:id(args.userId)};}
 if(action==='chat.read'){exactObject(args,['roomId','before','beforeId']);if(args.beforeId&&!args.before)fail();return{roomId:id(args.roomId),before:timestamp(args.before),...(args.beforeId?{beforeId:id(args.beforeId)}:{})};}
 if(action==='chat.send'){exactObject(args,['roomId','messageId','body','files']);if(!Array.isArray(args.files)||args.files.length>5||new Set(args.files).size!==args.files.length)fail('invalid_files');const body=cleanText(args.body||'',5000,{empty:true});if(!body&&!args.files.length)fail('invalid_message');return{roomId:id(args.roomId),messageId:id(args.messageId),body,files:args.files.map(id)};}
 if(action==='asset.upload'){exactObject(args,['id','kind','data']);if(typeof args.data!=='string'||args.data.length>2800000)fail('invalid_image');return{id:id(args.id),kind:kind(args.kind),data:args.data};}
 if(action==='chat.file.upload'){exactObject(args,['roomId','filename','data']);if(typeof args.data!=='string'||args.data.length>14000000)fail('invalid_file');return{roomId:id(args.roomId),filename:cleanFilename(args.filename),data:args.data};}
 fail('invalid_action');
}
function decode64(s,max){if(typeof s!=='string'||!s.length||s.length%4||!/^[A-Za-z0-9+/]+={0,2}$/.test(s))fail('invalid_file');let bytes;try{bytes=Uint8Array.from(atob(s),c=>c.charCodeAt(0));}catch{fail('invalid_file');}if(bytes.length>max||!bytes.length)fail('file_too_large');return bytes;}
export function jpegUpload(data,max=2097152){
 const bytes=typeof data==='string'?decode64(data,max):data;if(bytes.length<20||bytes.length>max||bytes[0]!==255||bytes[1]!==216||bytes.at(-2)!==255||bytes.at(-1)!==217)fail('invalid_image');
 const parts=[bytes.slice(0,2)];let p=2,width=0,height=0,scan=false;
 while(p<bytes.length-2){const start=p;if(bytes[p++]!==255)fail('invalid_image');while(bytes[p]===255)p++;const marker=bytes[p++],len=(bytes[p]<<8)|bytes[p+1];if(len<2||p+len>bytes.length)fail('invalid_image');
  if([192,193,194].includes(marker)){if(len<8)fail('invalid_image');height=(bytes[p+3]<<8)|bytes[p+4];width=(bytes[p+5]<<8)|bytes[p+6];if(width<64||height<64||width>4096||height>4096||width*height>16777216)fail('invalid_image');}
  else if(marker>=192&&marker<=207&&![196,200,204].includes(marker))fail('invalid_image');
  if(marker===218){if(!width||!height)fail('invalid_image');parts.push(bytes.slice(start));scan=true;break;}
  if(!((marker>=224&&marker<=239)||marker===254))parts.push(bytes.slice(start,p+len));p+=len;
 }
 if(!scan)fail('invalid_image');const cleaned=new Uint8Array(parts.reduce((n,b)=>n+b.length,0));let offset=0;for(const part of parts){cleaned.set(part,offset);offset+=part.length;}return{bytes:cleaned,width,height,mimeType:'image/jpeg'};
}
export function cleanFilename(value){let name=cleanText(value,120).replace(/[\\/:*?"<>|\u202a-\u202e\u2066-\u2069]/g,'_').replace(/^\.+/,'').replace(/[. ]+$/,'');if(!name||/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name))name='file-'+name;return name;}
export function chatUpload(filename,data){
 const bytes=decode64(data,10485760),ext=filename.split('.').at(-1)?.toLowerCase();const text=new TextDecoder().decode(bytes.slice(0,16));
 const allowed={pdf:'application/pdf',txt:'text/plain',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',zip:'application/zip',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation'};
 if(!Object.hasOwn(allowed,ext))fail('unsupported_file');
 if(ext==='pdf'&&!text.startsWith('%PDF-'))fail('invalid_file');
 if(['docx','xlsx','pptx','zip'].includes(ext)&&!(bytes[0]===80&&bytes[1]===75&&[3,5,7].includes(bytes[2])))fail('invalid_file');
 if(ext==='png'&&![137,80,78,71,13,10,26,10].every((x,i)=>bytes[i]===x))fail('invalid_file');
 if(ext==='jpg'||ext==='jpeg'){const cleaned=jpegUpload(bytes,10485760);return{bytes:cleaned.bytes,mimeType:cleaned.mimeType};}
 if(ext==='txt'){if(bytes.includes(0))fail('invalid_file');try{new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{fail('invalid_file');}}
 return{bytes,mimeType:allowed[ext]};
}
const OWNER_ACTIONS=new Set(['member.list','member.search','member.set','support.share','review.list','review.return','review.reject','catalog.publish','audit.list']);
async function boundedJson(req,max){const reader=req.body?.getReader();if(!reader)fail();const chunks=[];let length=0;while(true){const r=await reader.read();if(r.done)break;length+=r.value.length;if(length>max){await reader.cancel();fail('request_too_large',413);}chunks.push(r.value);}const b=new Uint8Array(length);let offset=0;for(const c of chunks){b.set(c,offset);offset+=c.length;}try{return JSON.parse(new TextDecoder().decode(b));}catch{fail();}}
export function createStaffHandler({getUser,getClaims,rpc,storage,sha256,uuid=()=>crypto.randomUUID(),publishDraft}){
 return async req=>{
  const origin=req.headers.get('Origin');const headers={'Content-Type':'application/json','Cache-Control':'no-store, private','Pragma':'no-cache','Vary':'Origin','X-Content-Type-Options':'nosniff'};
  if(ORIGINS.has(origin))Object.assign(headers,{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS'});
  const reply=(status,data)=>new Response(JSON.stringify(data),{status,headers});
  if(origin&&!ORIGINS.has(origin))return reply(403,{error:'forbidden_origin'});if(req.method==='OPTIONS')return new Response(null,{status:204,headers});if(req.method!=='POST')return reply(405,{error:'method_not_allowed'});
  if(new URL(req.url).search)return reply(400,{error:'invalid_parameters'});
  if(!req.headers.get('Content-Type')?.startsWith('application/json'))return reply(415,{error:'invalid_parameters'});
  const bearer=req.headers.get('Authorization')||'';if(!/^Bearer [A-Za-z0-9._-]{16,8192}$/.test(bearer))return reply(401,{error:'sign_in_required'});
  let claims,actor,authStage='user';
  try{
   const userResult=await getUser(bearer.slice(7));authStage='claims';const claimResult=await getClaims(bearer.slice(7));const user=userResult.data?.user;claims=claimResult.data?.claims;
   if(userResult.error||claimResult.error||!user?.email_confirmed_at||user.is_anonymous||!UUID.test(user.id||'')||claims?.sub!==user.id||claims.iss!==PROJECT+'/auth/v1'||!UUID.test(claims.session_id||''))return reply(401,{error:'invalid_session'});
   authStage='role';actor=await rpc('gate',{},claims);
  }catch(error){if(error.code!=='42501')console.warn('staff_auth_check',authStage,/^[A-Za-z0-9_]{1,40}$/.test(error.code||'')?error.code:'unknown');return reply(error.code==='42501'?403:503,{error:error.code==='42501'?'staff_only':'auth_unavailable'});}
  try{
   const envelope=exactObject(await boundedJson(req,15000000),['action','args']);const action=envelope.action,args=validateAction(action,envelope.args);
   if(action==='gate')return reply(200,{data:actor});
   if(actor.mfaRequired)return reply(403,{error:'mfa_required'});
   if(OWNER_ACTIONS.has(action)&&!actor.owner)return reply(403,{error:'owner_only'});
   let data;
   if(action==='asset.upload'){
    const draft=await rpc('draft.get',{id:args.id,kind:args.kind},claims);if(!['draft','changes_requested'].includes(draft.status))fail('draft_locked',409);const picture=jpegUpload(args.data),assetId=uuid(),path=actor.id+'/'+args.id+'/'+assetId+'.jpg';
    await storage.upload('salah-staff-drafts',path,picture.bytes,{contentType:'image/jpeg'});
    try{await rpc('asset.register',{id:args.id,kind:args.kind,assetId,path,bytes:picture.bytes.length,width:picture.width,height:picture.height,sha256:await sha256(picture.bytes)},claims);}catch(e){await storage.remove('salah-staff-drafts',[path]).catch(()=>{});throw e;}
    data={id:assetId,width:picture.width,height:picture.height,bytes:picture.bytes.length,url:await storage.sign('salah-staff-drafts',path,300)};
   }else if(action==='asset.list'){
    const rows=await rpc(action,args,claims);data=await Promise.all(rows.map(async r=>({id:r.id,width:r.width,height:r.height,bytes:r.bytes,url:await storage.sign('salah-staff-drafts',r.path,300)})));
   }else if(action==='chat.file.upload'){
    await rpc('chat.read',{roomId:args.roomId},claims);const file=chatUpload(args.filename,args.data),fileId=uuid(),path=actor.id+'/'+args.roomId+'/'+fileId+'/'+args.filename;
    await storage.upload('salah-staff-chat',path,file.bytes,{contentType:file.mimeType});
    try{await rpc('chat.file.register',{roomId:args.roomId,fileId,path,filename:args.filename,mimeType:file.mimeType,bytes:file.bytes.length,sha256:await sha256(file.bytes)},claims);}catch(e){await storage.remove('salah-staff-chat',[path]).catch(()=>{});throw e;}
    data={id:fileId,filename:args.filename,bytes:file.bytes.length};
   }else if(action==='catalog.publish'){
    data=await publishDraft(args,claims,actor);
   }else{
    data=await rpc(action,args,claims);
    if(action==='support.read'){data.photos=await Promise.all((data.photos||[]).map(async r=>({message_id:r.message_id,index:r.index,url:await storage.sign('support-photos',r.path,300)})));}
    if(action==='chat.read'){data.files=await Promise.all((data.files||[]).map(async r=>({id:r.id,message_id:r.message_id,filename:r.filename,mime_type:r.mime_type,bytes:r.bytes,url:await storage.sign('salah-staff-chat',r.path,300,{download:r.filename})})));}
   }
   return reply(200,{data});
  }catch(error){
   if(error.status)return reply(error.status,{error:error.message});
   if(error.code==='42501')return reply(403,{error:'forbidden'});
   if(['22023','22P02','23514','23502'].includes(error.code))return reply(400,{error:'invalid_parameters'});
   if(['revision_conflict','catalog_conflict','draft_locked'].includes(error.message))return reply(409,{error:error.message});
   if(['support_rate_limit','chat_rate_limit','chat_upload_limit','draft_limit','asset_limit','catalog_limit'].includes(error.message))return reply(429,{error:error.message});
   return reply(503,{error:'workspace_unavailable'});
  }
 };
}
