const PROJECT='https://kbltwszfvphgbxdbczsb.supabase.co';
const ORIGINS=new Set(['https://skodytunez-maker.github.io','capacitor://localhost','http://localhost','https://localhost']);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function deviceLabel(agent){
 const ua=String(agent||'').slice(0,500);
 const os=/iPad/.test(ua)?'iPad':/iPhone/.test(ua)?'iPhone':/Android/.test(ua)?(/Mobile/.test(ua)?'Android':'Планшет Android'):/Windows/.test(ua)?'Windows':/Macintosh|Mac OS/.test(ua)?'Mac':/Linux/.test(ua)?'Linux':'Устройство';
 const browser=/Edg\//.test(ua)?'Edge':/Firefox|FxiOS/.test(ua)?'Firefox':/Chrome|CriOS/.test(ua)?'Chrome':/Safari/.test(ua)?'Safari':'';
 return os+(browser?' · '+browser:'');
}
export function createDevicesHandler({identity,list,revoke}){return async req=>{
 const origin=req.headers.get('Origin'),headers={'Content-Type':'application/json','Cache-Control':'no-store, private','Vary':'Origin','X-Content-Type-Options':'nosniff'};
 if(ORIGINS.has(origin))Object.assign(headers,{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'});
 const reply=(status,value)=>new Response(JSON.stringify(value),{status,headers});
 if(origin&&!ORIGINS.has(origin))return reply(403,{error:'forbidden'});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return reply(405,{error:'method_not_allowed'});
 if(new URL(req.url).search)return reply(400,{error:'invalid_parameters'});
 if(!(req.headers.get('Content-Type')||'').startsWith('application/json'))return reply(415,{error:'json_required'});
 const bearer=req.headers.get('Authorization')||'';if(!/^Bearer [A-Za-z0-9._-]{16,8192}$/.test(bearer))return reply(401,{error:'sign_in_required'});
 let input;try{const text=await req.text();if(new TextEncoder().encode(text).length>1024)return reply(413,{error:'too_large'});input=JSON.parse(text);}catch{return reply(400,{error:'invalid_request'});}
 if(!input||Array.isArray(input)||typeof input!=='object'||!['list','revoke'].includes(input.action)||Object.keys(input).some(k=>!['action','id','cursor'].includes(k)))return reply(400,{error:'invalid_request'});
 if(input.action==='list'&&(Object.hasOwn(input,'id')||input.cursor!=null&&!UUID.test(input.cursor)))return reply(400,{error:'invalid_request'});
 if(input.action==='revoke'&&(Object.hasOwn(input,'cursor')||!UUID.test(input.id||'')))return reply(400,{error:'invalid_request'});
 let caller;try{caller=await identity(bearer.slice(7));}catch{return reply(503,{error:'unavailable'});}
 if(!caller)return reply(401,{error:'invalid_session'});
 if(caller.requiresMfa&&caller.aal!=='aal2')return reply(403,{error:'mfa_required'});
 try{
  if(input.action==='revoke'){
   if(input.id===caller.sessionId)return reply(400,{error:'current_device'});
   if(!await revoke(caller,input.id))return reply(404,{error:'device_not_found'});
   return reply(200,{ok:true});
  }
  const rows=await list(caller,input.cursor||null);if(!rows)return reply(401,{error:'invalid_session'});
  const more=rows.length>50,devices=rows.slice(0,50).map(r=>({id:r.id,label:deviceLabel(r.user_agent),current:r.id===caller.sessionId,signedInAt:new Date(r.created_at).toISOString()}));
  return reply(200,{devices,nextCursor:more?devices.at(-1)?.id:null});
 }catch(e){return reply(e?.code==='list_changed'?409:503,{error:e?.code==='list_changed'?'list_changed':'unavailable'});}
};}
if(typeof Deno!=='undefined'){
 const {default:postgres}=await import('npm:postgres@3.4.9');const {createClient}=await import('npm:@supabase/supabase-js@2.117.2');
 const sql=postgres(Deno.env.get('SUPABASE_DB_URL'),{max:2,prepare:false,idle_timeout:20,connect_timeout:10});
 const auth=createClient(PROJECT,'sb_publishable_D2OGfXHyZCN_DQJpR9LTNg_mOD03jnR',{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 const active=async(uid,sid)=>{const [row]=await sql`select exists(select 1 from auth.sessions where id=${sid}::uuid and user_id=${uid}::uuid and (not_after is null or not_after>clock_timestamp())) as active`;return row.active;};
 Deno.serve(createDevicesHandler({identity:async token=>{
  const [u,c]=await Promise.all([auth.auth.getUser(token),auth.auth.getClaims(token)]);const user=u.data?.user,claims=c.data?.claims;
  if(u.error||c.error||!user?.email_confirmed_at||user.is_anonymous||claims?.sub!==user.id||claims.iss!==PROJECT+'/auth/v1'||!UUID.test(claims.session_id||'')||!await active(user.id,claims.session_id))return null;
  const [row]=await sql`select exists(select 1 from auth.mfa_factors where user_id=${user.id}::uuid and status='verified') as mfa`;
  return {id:user.id,sessionId:claims.session_id,requiresMfa:row.mfa,aal:claims.aal};
 },list:async(caller,cursor)=>{
  if(!await active(caller.id,caller.sessionId))return null;
  if(cursor){const [owned]=await sql`select id from auth.sessions where id=${cursor}::uuid and user_id=${caller.id}::uuid`;if(!owned)throw Object.assign(Error(),{code:'list_changed'});}
  return sql`select id::text,user_agent,created_at from auth.sessions where user_id=${caller.id}::uuid and (not_after is null or not_after>clock_timestamp()) and (id=${caller.sessionId}::uuid or ${cursor}::uuid is null or (created_at,id)<(select created_at,id from auth.sessions where id=${cursor}::uuid and user_id=${caller.id}::uuid)) order by (id=${caller.sessionId}::uuid) desc,created_at desc,id desc limit 51`;
 },revoke:async(caller,target)=>{
  // This project's refresh_tokens FK cascades; no tokens or other accounts are read.
  const rows=await sql`delete from auth.sessions where id=${target}::uuid and user_id=${caller.id}::uuid and id<>${caller.sessionId}::uuid and exists(select 1 from auth.sessions current_session where current_session.id=${caller.sessionId}::uuid and current_session.user_id=${caller.id}::uuid and (current_session.not_after is null or current_session.not_after>clock_timestamp())) returning id`;
  return rows.length===1;
 }}));
}
