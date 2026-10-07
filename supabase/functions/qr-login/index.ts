const PROJECT='https://kbltwszfvphgbxdbczsb.supabase.co';
const ORIGINS=new Set(['https://skodytunez-maker.github.io','capacitor://localhost','http://localhost','https://localhost']);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SECRET=/^[a-f0-9]{64}$/;
export const hashSecret=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');
const randomSecret=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
export function createQrHandler({store,identity,mint,now=Date.now}){return async req=>{
 const origin=req.headers.get('Origin'),headers={'Content-Type':'application/json','Cache-Control':'no-store, private','Vary':'Origin','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
 if(ORIGINS.has(origin))Object.assign(headers,{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'});
 const reply=(status,data)=>new Response(JSON.stringify(data),{status,headers});
 if(origin&&!ORIGINS.has(origin))return reply(403,{error:'forbidden'});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return reply(405,{error:'method_not_allowed'});
 if(new URL(req.url).search)return reply(400,{error:'invalid_parameters'});
 if(!(req.headers.get('Content-Type')||'').startsWith('application/json'))return reply(415,{error:'json_required'});
 let input;try{const text=await req.text();if(new TextEncoder().encode(text).length>1024)return reply(413,{error:'too_large'});input=JSON.parse(text);}catch{return reply(400,{error:'invalid_request'});}
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['action','id','secret','device'].includes(k)))return reply(400,{error:'invalid_request'});
 const action=input.action;if(!['create','status','preview','approve','deny','redeem','cancel'].includes(action))return reply(400,{error:'invalid_request'});
 if(action==='create'){
  if(Object.keys(input).some(k=>!['action','device'].includes(k))||!['computer','tablet','phone'].includes(input.device))return reply(400,{error:'invalid_request'});
  const pollSecret=randomSecret(),approvalSecret=randomSecret(),id=crypto.randomUUID(),expires=now()+120000;
  const row={id,poll_hash:await hashSecret(pollSecret),approval_hash:await hashSecret(approvalSecret),pairing_code:String(crypto.getRandomValues(new Uint32Array(1))[0]%1000000).padStart(6,'0'),device:input.device,expires_at:new Date(expires).toISOString(),ip_hash:await hashSecret((req.headers.get('x-forwarded-for')||'unknown').split(',')[0].trim())};
  try{if(!await store.create(row))return reply(429,{error:'try_later'});return reply(200,{id,pollSecret,approvalSecret,code:row.pairing_code,device:row.device,expiresAt:expires});}catch{return reply(503,{error:'unavailable'});}
 }
 if(!UUID.test(input.id||'')||!SECRET.test(input.secret||'')||Object.keys(input).some(k=>!['action','id','secret'].includes(k)))return reply(400,{error:'invalid_request'});
 const approval=['preview','approve','deny'].includes(action);let caller;
 if(approval){
  const bearer=req.headers.get('Authorization')||'';if(!/^Bearer [A-Za-z0-9._-]{16,8192}$/.test(bearer))return reply(401,{error:'sign_in_required'});
  try{caller=await identity(bearer.slice(7));}catch{return reply(503,{error:'unavailable'});}
  if(!caller)return reply(401,{error:'invalid_session'});
  if(caller.requiresMfa&&caller.aal!=='aal2')return reply(403,{error:'mfa_required'});
 }
 try{
  const secretHash=await hashSecret(input.secret),row=await store.get(input.id,secretHash,approval);
  if(!row||Date.parse(row.expires_at)<=now())return reply(410,{error:'expired'});
  if(action==='status')return reply(200,{state:row.state});
  if(action==='preview')return reply(200,{state:row.state,code:row.pairing_code,device:row.device,expiresAt:Date.parse(row.expires_at)});
  if(action==='approve'||action==='deny'){
   if(row.state!=='pending'||!await store.decide(input.id,secretHash,action==='approve',caller))return reply(409,{error:'already_used'});
   return reply(200,{ok:true});
  }
  if(action==='cancel'){await store.cancel(input.id,secretHash);return reply(200,{ok:true});}
  if(action==='redeem'){
   // Claim exactly once, then revalidate the approving session. Neither the QR
   // nor its viewer receives the polling secret or an existing refresh token.
   const claimed=await store.consume(input.id,secretHash);if(!claimed)return reply(409,{error:'not_approved'});
   const tokenHash=await mint(claimed.user_id,claimed.session_id);if(!tokenHash)return reply(401,{error:'invalid_session'});
   return reply(200,{tokenHash});
  }
 }catch{return reply(503,{error:'unavailable'});}
};}
if(typeof Deno!=='undefined'){
 const {default:postgres}=await import('npm:postgres@3.4.9');const {createClient}=await import('npm:@supabase/supabase-js@2.117.2');
 const sql=postgres(Deno.env.get('SUPABASE_DB_URL'),{max:2,prepare:false,idle_timeout:20,connect_timeout:10});
 const auth=createClient(PROJECT,Deno.env.get('SUPABASE_ANON_KEY'),{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 const admin=createClient(PROJECT,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 const store={
  create:row=>sql.begin(async tx=>{
   await tx`select pg_advisory_xact_lock(hashtextextended(${row.ip_hash},0))`;
   await tx`delete from salah_qr_private.requests where created_at<clock_timestamp()-interval '15 minutes'`;
   const [rate]=await tx`select count(*)::int as total from salah_qr_private.requests where ip_hash=${row.ip_hash}`;
   if(rate.total>=10)return false;
   await tx`insert into salah_qr_private.requests(id,poll_hash,approval_hash,pairing_code,device,ip_hash,expires_at) values(${row.id}::uuid,${row.poll_hash},${row.approval_hash},${row.pairing_code},${row.device},${row.ip_hash},${row.expires_at}::timestamptz)`;return true;
  }),
  get:async(id,hash,approval)=>{const [row]=approval?await sql`select state,expires_at,pairing_code,device from salah_qr_private.requests where id=${id}::uuid and approval_hash=${hash}`:await sql`select state,expires_at from salah_qr_private.requests where id=${id}::uuid and poll_hash=${hash}`;return row;},
  decide:async(id,hash,approve,caller)=>{const rows=await sql`update salah_qr_private.requests set state=${approve?'approved':'denied'},user_id=${approve?caller.id:null}::uuid,session_id=${approve?caller.sessionId:null}::uuid where id=${id}::uuid and approval_hash=${hash} and state='pending' and expires_at>clock_timestamp() and exists(select 1 from auth.sessions where id=${caller.sessionId}::uuid and user_id=${caller.id}::uuid) returning id`;return rows.length===1;},
  cancel:async(id,hash)=>{await sql`update salah_qr_private.requests set state='denied',user_id=null,session_id=null where id=${id}::uuid and poll_hash=${hash} and state in ('pending','approved')`;},
  consume:async(id,hash)=>{const [row]=await sql`update salah_qr_private.requests set state='consumed' where id=${id}::uuid and poll_hash=${hash} and state='approved' and expires_at>clock_timestamp() returning user_id,session_id`;return row;}
 };
 Deno.serve(createQrHandler({store,identity:async token=>{
  const [u,c]=await Promise.all([auth.auth.getUser(token),auth.auth.getClaims(token)]);const user=u.data?.user,claims=c.data?.claims;
  if(u.error||c.error||!user?.email_confirmed_at||user.is_anonymous||claims?.sub!==user.id||claims.iss!==PROJECT+'/auth/v1'||!UUID.test(claims.session_id||''))return null;
  const [row]=await sql`select exists(select 1 from auth.sessions where id=${claims.session_id}::uuid and user_id=${user.id}::uuid) as active,exists(select 1 from auth.mfa_factors where user_id=${user.id}::uuid and status='verified') as mfa`;
  return row.active?{id:user.id,sessionId:claims.session_id,requiresMfa:row.mfa,aal:claims.aal}:null;
 },mint:async(uid,sid)=>{
  const [row]=await sql`select u.email from auth.users u join auth.sessions s on s.user_id=u.id where u.id=${uid}::uuid and s.id=${sid}::uuid and u.email_confirmed_at is not null and (u.banned_until is null or u.banned_until<clock_timestamp()) and u.is_anonymous=false`;
  if(!row)return null;
  const {data,error}=await admin.auth.admin.generateLink({type:'magiclink',email:row.email});
  if(error||data?.user?.id!==uid)return null;return data.properties.hashed_token;
 }}));
}
