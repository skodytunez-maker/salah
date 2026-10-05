const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function validNotification(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['enabled','permission','browser','device'].includes(k))||typeof value.enabled!=='boolean'||typeof value.browser!=='boolean'||!['granted','denied','default','unsupported'].includes(value.permission))return false;
 const device=value.device;
 return device===null||!!device&&typeof device==='object'&&!Array.isArray(device)&&Object.keys(device).length===2&&UUID.test(device.id||'')&&/^[a-f0-9]{64}$/.test(device.token||'');
}
const ORIGIN='https://skodytunez-maker.github.io';
const PROJECT='https://kbltwszfvphgbxdbczsb.supabase.co';
// This endpoint only records the verified caller's foreground presence.
// It never reads a user list, changes an account, or accepts a user ID.
export function createPresenceHandler({getUser,getClaims,isSessionActive,record}){return async req=>{
 const origin=req.headers.get('Origin'),headers={'Content-Type':'application/json','Cache-Control':'no-store, private','Vary':'Origin','X-Content-Type-Options':'nosniff'};
 if(origin===ORIGIN)Object.assign(headers,{'Access-Control-Allow-Origin':ORIGIN,'Access-Control-Allow-Headers':'authorization, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'});
 const reply=(status,value)=>new Response(JSON.stringify(value),{status,headers});
 if(origin&&origin!==ORIGIN)return reply(403,{error:'forbidden'});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return reply(405,{error:'method_not_allowed'});
 if(new URL(req.url).search)return reply(400,{error:'invalid_parameters'});
 if(!(req.headers.get('Content-Type')||'').startsWith('application/json'))return reply(415,{error:'json_required'});
 const authorization=req.headers.get('Authorization')||'';
 if(!/^Bearer [A-Za-z0-9._-]{16,8192}$/.test(authorization))return reply(401,{error:'sign_in_required'});
 let input;
 try{const raw=await req.text();if(new TextEncoder().encode(raw).length>1024)return reply(413,{error:'too_large'});input=JSON.parse(raw);}catch{return reply(400,{error:'invalid_presence'});}
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['p_app','p_tab','p_active','p_sequence','p_notifications','p_version'].includes(k))||input.p_app!=='salah'||!UUID.test(input.p_tab||'')||typeof input.p_active!=='boolean'||!Number.isSafeInteger(input.p_sequence)||input.p_sequence<1||Object.hasOwn(input,'p_notifications')&&(!input.p_active||!validNotification(input.p_notifications))||Object.hasOwn(input,'p_version')&&(!input.p_active||!Number.isSafeInteger(input.p_version)||input.p_version<1||input.p_version>1000000))return reply(400,{error:'invalid_presence'});
 let user,claims;
 try{
  const result=await getUser(authorization.slice(7));if(result.error)return reply(401,{error:'invalid_session'});user=result.data?.user;
  const checked=await getClaims(authorization.slice(7));if(checked.error)return reply(401,{error:'invalid_session'});claims=checked.data?.claims;
 }catch{return reply(503,{error:'auth_unavailable'});}
 if(!user||!UUID.test(user.id)||user.is_anonymous||!user.email_confirmed_at||claims?.sub!==user.id||claims.iss!==PROJECT+'/auth/v1'||!UUID.test(claims.session_id||''))return reply(401,{error:'invalid_session'});
 try{if(!await isSessionActive(user.id,claims.session_id))return reply(401,{error:'invalid_session'});}catch{return reply(503,{error:'auth_unavailable'});}
 try{await record(user.id,input,claims.session_id);return reply(200,{ok:true});}catch{return reply(503,{error:'storage_unavailable'});}
};}
if(typeof Deno!=='undefined'){
 const {default:postgres}=await import('npm:postgres@3.4.9');const {createClient}=await import('npm:@supabase/supabase-js@2.117.2');
 const sql=postgres(Deno.env.get('SUPABASE_DB_URL'),{max:1,prepare:false,idle_timeout:20,connect_timeout:10});
 const auth=createClient(PROJECT,'sb_publishable_D2OGfXHyZCN_DQJpR9LTNg_mOD03jnR',{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 Deno.serve(createPresenceHandler({
  getUser:token=>auth.auth.getUser(token),getClaims:token=>auth.auth.getClaims(token),
  isSessionActive:async(uid,sid)=>{const [row]=await sql`select exists(select 1 from auth.sessions where id=${sid}::uuid and user_id=${uid}::uuid) as active`;return row.active===true;},
  record:async(uid,input,sid)=>{
   if(!input.p_active){await sql`update public.app_presence set active=false,sequence=${input.p_sequence} where user_id=${uid}::uuid and app='salah' and tab_id=${input.p_tab}::uuid and sequence<${input.p_sequence}`;return;}
   await sql.begin(async tx=>{
    const changed=await tx`insert into public.app_presence(user_id,app,tab_id,active,sequence,last_seen,app_version,version_checked_at) values(${uid}::uuid,'salah',${input.p_tab}::uuid,true,${input.p_sequence},clock_timestamp(),${input.p_version??null},case when ${input.p_version??null}::integer is not null then clock_timestamp() else null end) on conflict(user_id,app,tab_id) do update set active=excluded.active,sequence=excluded.sequence,last_seen=excluded.last_seen,app_version=coalesce(excluded.app_version,app_presence.app_version),version_checked_at=coalesce(excluded.version_checked_at,app_presence.version_checked_at) where excluded.sequence>app_presence.sequence returning user_id`;
    if(!changed.length||!input.p_notifications)return;
    const n=input.p_notifications;let pushId=null;
    if(n.device&&n.permission==='granted'){
     const tokenHash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(n.device.token))),b=>b.toString(16).padStart(2,'0')).join('');
     const [device]=await tx`select id from salah_push_private.devices where id=${n.device.id}::uuid and token_hash=${tokenHash}`;pushId=device?.id||null;
    }
    await tx`insert into public.app_notification_status(user_id,tab_id,session_id,enabled,permission,browser_notifications,push_device_id,checked_at) values(${uid}::uuid,${input.p_tab}::uuid,${sid}::uuid,${n.enabled},${n.permission},${n.browser},${pushId}::uuid,clock_timestamp()) on conflict(user_id,tab_id) do update set session_id=excluded.session_id,enabled=excluded.enabled,permission=excluded.permission,browser_notifications=excluded.browser_notifications,push_device_id=excluded.push_device_id,checked_at=excluded.checked_at`;
   });
  }
 }));
}
