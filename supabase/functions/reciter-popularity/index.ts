import{publicListenerRows}from './listener-labels.mjs';
import postgres from 'npm:postgres@3.4.9';
// Public aggregate reads; writes require a verified, confirmed Auth user and explicit consent.
const url=Deno.env.get('SUPABASE_URL')!,key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const sql=postgres(Deno.env.get('SUPABASE_DB_URL')!,{max:1,prepare:false,idle_timeout:20,connect_timeout:10});
const reciters=new Set(["ar.alafasy","ar.husary","ar.minshawi","ar.mahermuaiqly","ar.badralturki","ar.muhammadalluhaidan","ar.tariqmuhammad","ar.abdurrahmanalsudais","ar.saudalshuraim","ar.abdullahaljuhany","ar.bandarbalilah","ar.salahalbudair","ar.abdulmuhsinalqasim","ar.alialhuthaifi","ar.abdulbarialthubaity","ar.abdullahalbuayjan","ar.khalidalmuhanna","ar.ahmadalhuthaifi","ar.raadalkurdi","ar.hazzaalbalushi","ar.haithamaljadani","ar.haithamaldukhain","ar.abdelazizsheim","ar.ahmedkaseb","ar.obaidamuafaq","ar.abdulrahmanmossad","ar.siratulloraupov","ar.idrisabkar","ar.abubakrshatri","ar.nasseralqatami","ar.yasseraldossaricontinuous","ar.abdulbasitabdussamad","ar.mansouralsalimi"]);
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Content-Type':'application/json','X-Content-Type-Options':'nosniff'};
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...headers,'Cache-Control':'no-store'}});
async function rpc(name:string,body:any){if(name==='reciter_popularity_rank')return await sql`select * from public.reciter_popularity_rank()`;if(name==='reciter_popularity_add'){const rows=await sql`select public.reciter_popularity_add(${body.p_listener},${body.p_reciter},${body.p_event}::uuid) as counted`;return rows[0].counted;}throw Error('invalid_operation');}
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
async function verifiedUser(req:Request){
 const bearer=req.headers.get('authorization')||'';
 if(!/^Bearer [A-Za-z0-9_.-]+$/.test(bearer))return null;
 const response=await fetch(url+'/auth/v1/user',{headers:{apikey:key,Authorization:bearer}});
 if(!response.ok)return null;const user=await response.json();
 return user.id&&user.email_confirmed_at&&!user.is_anonymous?user:null;
}
async function listenerCode(id:string){
 const cryptoKey=await crypto.subtle.importKey('raw',new TextEncoder().encode(key),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const signature=await crypto.subtle.sign('HMAC',cryptoKey,new TextEncoder().encode('reciter-ranking-v1:'+id));
 return Array.from(new Uint8Array(signature),v=>v.toString(16).padStart(2,'0')).join('');
}
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 try{
 const params=new URL(req.url).searchParams;
 if(req.method==='GET'&&params.has('avatar')){
  const id=params.get('avatar');if(!id||!uuid.test(id))return reply({error:'not_found'},404);
  const rows=await sql`select v.user_id from public.reciter_listener_visibility v join auth.users u on u.id=v.user_id where v.public_id=${id}::uuid and v.mode='profile' and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false) and exists(select 1 from public.reciter_popularity_minutes m where m.listener_hash=v.listener_hash and m.day>=current_date-29)`;
  if(!rows.length)return reply({error:'not_found'},404);
  const response=await fetch(url+'/storage/v1/object/authenticated/profile-avatars/'+rows[0].user_id+'/profile.jpg',{headers:{apikey:key,Authorization:'Bearer '+key}});
  if(!response.ok||!/^image\/jpeg(?:;|$)/i.test(response.headers.get('content-type')||''))return reply({error:'not_found'},404);
  const bytes=await response.arrayBuffer();if(bytes.byteLength>200000)return reply({error:'not_found'},404);
  return new Response(bytes,{headers:{...headers,'Content-Type':'image/jpeg','Cache-Control':'no-store'}});
 }
 if(req.method==='GET'&&params.get('profile')==='me'){
  const user=await verifiedUser(req);if(!user)return reply({error:'sign_in_required'},401);
  const rows=await sql`select mode from public.reciter_listener_visibility where user_id=${user.id}::uuid`;
  return reply({mode:rows[0]?.mode||'hidden'});
 }
 if(req.method==='GET'){
  const windowDays=params.get('period')==='day'?1:params.get('period')==='week'?7:30;
  const rows=await sql`select reciter,sum(minutes)::bigint as minutes from public.reciter_popularity_minutes where day>=current_date-${windowDays-1}::integer group by reciter order by sum(minutes) desc,reciter limit 33`;
  const listeners=await sql`with heard as (
   select m.reciter,v.public_id as id,v.mode,
    upper(left(coalesce(nullif(btrim(u.raw_user_meta_data->>'nickname'),''),'Слушатель'),1)) as initial,
    upper(left(coalesce(nullif(btrim(u.raw_user_meta_data->>'nickname'),''),'Слушатель'),2)) as prefix,
    case when v.mode='profile' then left(coalesce(nullif(btrim(u.raw_user_meta_data->>'nickname'),''),'Слушатель'),40) else null end as nickname,
    case when v.mode='profile' then exists(select 1 from storage.objects o where o.bucket_id='profile-avatars' and o.name=v.user_id::text||'/profile.jpg') else false end as has_photo,
    sum(m.minutes) as minutes
   from public.reciter_popularity_minutes m
   join public.reciter_listener_visibility v on v.listener_hash=m.listener_hash
   join auth.users u on u.id=v.user_id
   where m.day>=current_date-${windowDays-1}::integer and v.mode<>'hidden' and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false)
   group by m.reciter,v.public_id,v.mode,v.user_id,u.raw_user_meta_data
  ), numbered as (select *,row_number() over(partition by reciter order by minutes desc,id) as position from heard)
  select reciter,id,mode,initial,prefix,nickname,has_photo from numbered where position<=4 order by reciter,position`;
  const visiblePeople=publicListenerRows(listeners);
  const ranking=rows.filter(r=>reciters.has(r.reciter)).map(r=>({reciter:r.reciter,minutes:Number(r.minutes),listeners:visiblePeople.filter(p=>p.reciter===r.reciter).map(({reciter,...person})=>person)}));
  return reply({items:ranking.map(r=>r.reciter),ranking,windowDays});
 }
 if(req.method!=='POST')return reply({error:'method'},405);
 if(Number(req.headers.get('content-length')||0)>1024)return reply({error:'body'},413);
 const text=await req.text();if(text.length>1024)return reply({error:'body'},413);
 let body;try{body=JSON.parse(text);}catch{return reply({error:'body'},400);}
 const user=await verifiedUser(req);if(!user)return reply({error:'sign_in_required'},401);
 if(body&&['hidden','initial','profile'].includes(body.profileMode)&&Object.keys(body).length===1){
  const hash=await listenerCode(user.id);
  await sql`insert into public.reciter_listener_visibility(user_id,listener_hash,mode) values(${user.id}::uuid,${hash},${body.profileMode}) on conflict(user_id) do update set listener_hash=excluded.listener_hash,public_id=case when reciter_listener_visibility.mode<>excluded.mode then gen_random_uuid() else reciter_listener_visibility.public_id end,mode=excluded.mode,updated_at=now()`;
  return reply({mode:body.profileMode});
 }
 if(!body||body.consent!==true||!reciters.has(body.reciter)||typeof body.eventId!=='string'||!uuid.test(body.eventId)||Object.keys(body).some(k=>!['consent','reciter','eventId'].includes(k)))return reply({error:'invalid_input'},400);
 const counted=await rpc('reciter_popularity_add',{p_listener:await listenerCode(user.id),p_reciter:body.reciter,p_event:body.eventId});
 return reply({ok:true,counted});
 }catch{return reply({error:'temporarily_unavailable'},503);}
});