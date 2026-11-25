import postgres from 'npm:postgres@3.4.9';
import {createClient} from 'npm:@supabase/supabase-js@2.117.2';
import {VIDEO_STORY_BUCKET,isStoryId,videoPath,readLimitedBody,readLimitedVideo,storyRecord,storyUrlLifetime,storyUploadOptions,storyInteraction,storyPoll} from './core.mjs';

const project=Deno.env.get('SUPABASE_URL')!;
const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const publicKey=Deno.env.get('SUPABASE_ANON_KEY')!;
const sql=postgres(Deno.env.get('SUPABASE_DB_URL')!,{max:1,prepare:false,idle_timeout:20,connect_timeout:10});
const auth=createClient(project,publicKey,{auth:{persistSession:false,autoRefreshToken:false}});
const store=createClient(project,key,{auth:{persistSession:false,autoRefreshToken:false}}).storage.from(VIDEO_STORY_BUCKET);
const origins=new Set(['https://skodytunez-maker.github.io','capacitor://localhost','http://localhost','https://localhost']);

async function isOwner(request:Request){
 const token=request.headers.get('authorization')||'';
 if(!/^Bearer [A-Za-z0-9._-]{16,8192}$/.test(token))return false;
 const result=await fetch(project+'/functions/v1/owner-access?mode=gate',{
  headers:{Authorization:token,apikey:publicKey},redirect:'error',signal:AbortSignal.timeout(8000),
 });
 return result.ok&&(await result.json()).owner===true;
}


async function engagement(request: Request, id: string, archive: boolean) {
  if (!id || (request.method !== 'GET' && request.method !== 'POST')) return {status:400, result:{error:'invalid_request'}};
  if (archive && (request.method !== 'GET' || !await isOwner(request))) return {status:403, result:{error:'owner_required'}};

  const bearer = request.headers.get('authorization');
  let actor = null;
  if (bearer && !archive) {
    const jwt = /^Bearer ([A-Za-z0-9._-]{16,8192})$/.exec(bearer)?.[1];
    const {data, error} = jwt ? await auth.auth.getUser(jwt) : {data:null, error:true};
    if (error || !data?.user || data.user.is_anonymous || !data.user.email_confirmed_at) {
      return {status:401, result:{error:'sign_in'}};
    }
    actor = data.user.id;
  }

  let change: ReturnType<typeof storyInteraction> | {action:'read'} = {action:'read'};
  if (request.method === 'POST') {
    if (!actor) return {status:401, result:{error:'sign_in'}};
    try {
      change = storyInteraction(JSON.parse(new TextDecoder().decode(await readLimitedBody(request,{max:4096}))));
    } catch { change = null; }
    if (!change) return {status:400, result:{error:'invalid_change'}};
  }
  const [row] = await sql`select salah_video_stories_private.interact(
    ${id}::uuid,${actor}::uuid,${archive},${change.action},${sql.json(change)}
  ) as result`;
  const result = row.result;
  const status = result.error === 'unavailable' ? 404 : result.error === 'comment_limit' ? 429 : result.error ? 400 : 200;
  return {status,result};
}

Deno.serve(async(request:Request)=>{
 const origin=request.headers.get('origin');
 const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Type':'application/json','Vary':'Origin'};
 const reply=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers});
 if(origin&&!origins.has(origin))return reply({error:'forbidden'},403);
 if(origin)Object.assign(headers,{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-salah-story-poll','Access-Control-Allow-Methods':'GET, POST, PATCH, OPTIONS'});
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(!['GET','POST','PATCH'].includes(request.method))return reply({error:'method'},405);
 const params=new URL(request.url).searchParams,archive=params.get('archive')==='1',id=params.get('id');
 if(id!==null&&!isStoryId(id))return reply({error:'invalid_id'},400);
 try{
  if(params.get('engagement')==='1'){
   const {status,result}=await engagement(request,id||'',archive);
   return reply(result,status);
  }
  if((archive||request.method!=='GET')&&!await isOwner(request))return reply({error:'owner_required'},403);

  if(request.method==='GET'){
   if(id===null){
    const rows=await sql`select id,published_at,expires_at,highlighted from salah_video_stories_private.stories
     where published_at is not null and removed_at is null and (${archive} or highlighted or expires_at>now())
     order by published_at desc,id limit 100`;
    return reply({items:rows.map(storyRecord)});
   }
   const [row]=await sql`select *,now() server_now from salah_video_stories_private.stories where id=${id}::uuid`;
   const lifetime=storyUrlLifetime(row,archive,row?new Date(row.server_now).getTime():Date.now());
   if(!lifetime)return reply({error:'unavailable'},404);
   const {data,error}=await store.createSignedUrl(videoPath(row.id,row.mime_type),lifetime);
   if(error||!data?.signedUrl)return reply({error:'unavailable'},404);
   return reply({url:data.signedUrl});
  }

  if(request.method==='PATCH'){
   let change;
   try{change=JSON.parse(new TextDecoder().decode(await readLimitedBody(request,{max:128})));}
   catch{return reply({error:'invalid_change'},400);}
   if(!id||!change||Object.keys(change).length!==1)return reply({error:'invalid_change'},400);
   if(typeof change.highlighted==='boolean'){
    const [row]=await sql`update salah_video_stories_private.stories set highlighted=${change.highlighted}
     where id=${id}::uuid and published_at is not null and removed_at is null returning id,published_at,expires_at,highlighted`;
    return row?reply({item:storyRecord(row)}):reply({error:'unavailable'},404);
   }
   if(change.remove!==true)return reply({error:'invalid_change'},400);
   const [row]=await sql`update salah_video_stories_private.stories set removed_at=coalesce(removed_at,now()),highlighted=false
     where id=${id}::uuid and published_at is not null returning id,mime_type`;
   if(!row)return reply({error:'unavailable'},404);
   await store.remove([videoPath(row.id,row.mime_type)]).catch(()=>{});
   return reply({removed:true});
  }

  const options=storyUploadOptions(params,request.headers.get('content-type'));
  if(!options)return reply({error:'invalid_video'},400);
  let poll;
  try{poll=storyPoll(request.headers.get('x-salah-story-poll'));}
  catch{return reply({error:'invalid_poll'},400);}
  let bytes;try{bytes=await readLimitedVideo(request,options.mime);}catch(error){return reply({error:error instanceof Error&&error.message==='size'?'size':'format'},400);}
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  const hash=Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
  await sql`insert into salah_video_stories_private.stories(id,hours,bytes,mime_type,sha256,highlighted,poll)
   values(${options.id}::uuid,${options.hours},${bytes.byteLength},${options.mime},${hash},${options.highlighted},${poll===null?null:sql.json(poll)}) on conflict do nothing`;
  const [saved]=await sql`select *,poll is not distinct from ${poll===null?null:sql.json(poll)}::jsonb as same_poll
   from salah_video_stories_private.stories where id=${options.id}::uuid`;
  if(!saved||!saved.same_poll||saved.removed_at||saved.sha256!==hash||saved.mime_type!==options.mime||saved.hours!==options.hours)return reply({error:'conflict'},409);
  if(saved.published_at)return reply({item:storyRecord(saved)});
  if(saved.highlighted!==options.highlighted)return reply({error:'conflict'},409);
  const object=videoPath(options.id,options.mime);
  const {error}=await store.upload(object,bytes,{contentType:options.mime,upsert:true,cacheControl:'0'});
  if(error)return reply({error:'upload_failed'},503);
  const [published]=await sql`update salah_video_stories_private.stories
   set published_at=coalesce(published_at,now()),expires_at=coalesce(expires_at,now()+hours*interval '1 hour')
   where id=${options.id}::uuid and removed_at is null returning id,published_at,expires_at,highlighted`;
  if(!published){await store.remove([object]).catch(()=>{});return reply({error:'unavailable'},404);}
  return reply({item:storyRecord(published)});
 }catch{return reply({error:'unavailable'},503);}
});
