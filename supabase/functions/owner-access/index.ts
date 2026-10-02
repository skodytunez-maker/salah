// Deploy only to the separate SALAH project. No service-role key is required.
// A valid session is checked against Auth on EVERY request before owner access.
const OWNER_ID='dc1eb1cc-6f8f-472f-a937-735fbfbba4b7';
const APP_ORIGIN='https://skodytunez-maker.github.io';
const PROJECT_URL='https://kbltwszfvphgbxdbczsb.supabase.co';
const PUBLISHABLE_KEY='sb_publishable_D2OGfXHyZCN_DQJpR9LTNg_mOD03jnR';
const STATS_URL='https://salah-saadi.goatcounter.com/api/v0/stats/total';

export function createOwnerHandler({getUser,getClaims,statsToken='',fetcher=fetch,now=Date.now,readUsers=null,isSessionActive=null}){
 return async function handle(req){
  const origin=req.headers.get('Origin');
  const headers={'Cache-Control':'no-store, private','Pragma':'no-cache','Vary':'Origin','X-Content-Type-Options':'nosniff','Content-Type':'application/json'};
  if(origin===APP_ORIGIN)Object.assign(headers,{'Access-Control-Allow-Origin':APP_ORIGIN,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'GET, OPTIONS','Access-Control-Max-Age':'600'});
  const reply=(status,data)=>new Response(JSON.stringify(data),{status,headers});
  // CORS is supplementary. Requests without Origin still require a verified user.
  if(origin&&origin!==APP_ORIGIN)return reply(403,{error:'forbidden'});
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(req.method!=='GET')return reply(405,{error:'method_not_allowed'});
  const auth=req.headers.get('Authorization')||'';
  if(!/^Bearer [A-Za-z0-9._-]{16,8192}$/.test(auth))return reply(401,{error:'sign_in_required'});
  let user;
  try{const result=await getUser(auth.slice(7));if(result.error)return reply(401,{error:'invalid_session'});user=result.data?.user;}
  catch{return reply(503,{error:'auth_unavailable'});}
  // Never trust form email, user_metadata, query parameters or decoded JWTs.
  if(!user||user.id!==OWNER_ID||!user.email_confirmed_at||user.is_anonymous)return reply(403,{error:'owner_only'});
  const url=new URL(req.url);
  const mode=url.searchParams.get('mode')||'gate';
  if([...url.searchParams.keys()].some(key=>key!=='mode'&&key!=='days'&&key!=='page'))return reply(400,{error:'invalid_parameters'});
  let claims;
  try{const checked=await getClaims(auth.slice(7));if(checked.error)return reply(401,{error:'invalid_session'});claims=checked.data?.claims;}
  catch{return reply(503,{error:'auth_unavailable'});}
  if(!claims||claims.sub!==OWNER_ID||claims.iss!==PROJECT_URL+'/auth/v1')return reply(401,{error:'invalid_session'});
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(claims.session_id||''))return reply(401,{error:'invalid_session'});
  try{if(!isSessionActive||!await isSessionActive(user.id,claims.session_id))return reply(401,{error:'invalid_session'});}catch{return reply(503,{error:'auth_unavailable'});}
  const secondFactor=claims.aal==='aal2'&&user.factors?.some(factor=>factor.status==='verified'&&factor.factor_type==='totp');
  if(!secondFactor)return mode==='gate'?reply(200,{owner:false,mfaRequired:true}):reply(403,{error:'mfa_required'});
  if(mode==='gate')return reply(200,{owner:true,statisticsConnected:Boolean(statsToken)});
  if(mode==='users'){
   if(url.searchParams.has('days'))return reply(400,{error:'invalid_parameters'});
   const page=Number(url.searchParams.get('page')||1);if(!Number.isSafeInteger(page)||page<1||page>10000)return reply(400,{error:'invalid_page'});
   if(!readUsers)return reply(503,{error:'users_not_connected'});
   try{const result=await readUsers(page);if(!Number.isSafeInteger(result.total)||result.total<0||!Array.isArray(result.users))throw Error('invalid');const date=v=>Number.isFinite(Date.parse(v))?new Date(v).toISOString():null;return reply(200,{total:result.total,page,users:result.users.slice(0,50).map(row=>({nickname:typeof row.nickname==='string'&&row.nickname.trim()?row.nickname.replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,40):'Без ника',joinedAt:date(row.joinedAt),lastSignInAt:date(row.lastSignInAt)}))});}catch{return reply(503,{error:'users_unavailable'});}
  }
  if(url.searchParams.has('page'))return reply(400,{error:'invalid_parameters'});
  if(mode!=='stats')return reply(400,{error:'invalid_mode'});
  if(!statsToken)return reply(503,{error:'statistics_not_connected'});
  const days=Number(url.searchParams.get('days')||7);
  if(![1,7,30].includes(days))return reply(400,{error:'invalid_period'});
  // Fixed read-only upstream and bounded periods: never proxy a caller's URL.
  const end=new Date(Math.floor(now()/3600000)*3600000+3600000);
  const start=new Date(end.getTime()-days*86400000);
  const upstream=new URL(STATS_URL);upstream.searchParams.set('start',start.toISOString());upstream.searchParams.set('end',end.toISOString());
  try{
   const response=await fetcher(upstream,{method:'GET',headers:{Authorization:'Bearer '+statsToken,Accept:'application/json','Content-Type':'application/json'},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000)});
   if(!response.ok)return reply(502,{error:'statistics_unavailable'});
   const data=await response.json();
   if(!Number.isSafeInteger(data.total)||data.total<0||!Array.isArray(data.stats))return reply(502,{error:'invalid_statistics'});
   const stats=data.stats.filter(row=>/^\d{4}-\d{2}-\d{2}$/.test(row?.day)&&Number.isSafeInteger(row.daily)&&row.daily>=0).slice(0,32).map(row=>({day:row.day,visitors:row.daily}));
   // Statistics contains aggregates only. Never return tokens or upstream errors.
   return reply(200,{period:days,total:data.total,stats,updatedAt:new Date(now()).toISOString()});
  }catch{return reply(502,{error:'statistics_unavailable'});}
 };
}

if(typeof Deno!=='undefined'){
 const {createClient}=await import('npm:@supabase/supabase-js@2.117.2');
 const {default:postgres}=await import('npm:postgres@3.4.9');
 const sql=postgres(Deno.env.get('SUPABASE_DB_URL'),{max:1,prepare:false,idle_timeout:20,connect_timeout:10});
 const readUsers=async page=>sql.begin(async tx=>{const [count]=await tx`select count(*)::int as total from auth.users where email_confirmed_at is not null and coalesce(is_anonymous,false)=false`;const users=await tx`select raw_user_meta_data->>'nickname' as nickname,created_at as "joinedAt",last_sign_in_at as "lastSignInAt" from auth.users where email_confirmed_at is not null and coalesce(is_anonymous,false)=false order by last_sign_in_at desc nulls last,id limit 50 offset ${(page-1)*50}`;return{total:count.total,users};});
 const client=createClient(PROJECT_URL,PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 // Accept the already saved legacy name while preferring the canonical name.
 Deno.serve(createOwnerHandler({getUser:token=>client.auth.getUser(token),getClaims:token=>client.auth.getClaims(token),readUsers,isSessionActive:async(uid,sid)=>{const [row]=await sql`select exists(select 1 from auth.sessions where id=${sid}::uuid and user_id=${uid}::uuid) as active`;return row.active===true;},statsToken:Deno.env.get('GOATCOUNTER_READ_TOKEN')||Deno.env.get('GOATCOUNTER_READ_TOKEN.')||''}));
}
