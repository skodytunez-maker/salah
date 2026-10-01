// Deploy only to the separate SALAH project. No service-role key is required.
// A valid session is checked against Auth on EVERY request before owner access.
const OWNER_ID='dc1eb1cc-6f8f-472f-a937-735fbfbba4b7';
const APP_ORIGIN='https://skodytunez-maker.github.io';
const PROJECT_URL='https://kbltwszfvphgbxdbczsb.supabase.co';
const PUBLISHABLE_KEY='sb_publishable_D2OGfXHyZCN_DQJpR9LTNg_mOD03jnR';
const STATS_URL='https://salah-saadi.goatcounter.com/api/v0/stats/total';

export function createOwnerHandler({getUser,statsToken='',fetcher=fetch,now=Date.now}){
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
  if([...url.searchParams.keys()].some(key=>key!=='mode'&&key!=='days'))return reply(400,{error:'invalid_parameters'});
  if(mode==='gate')return reply(200,{owner:true,statisticsConnected:Boolean(statsToken)});
  if(mode!=='stats')return reply(400,{error:'invalid_mode'});
  if(!statsToken)return reply(503,{error:'statistics_not_connected'});
  const days=Number(url.searchParams.get('days')||7);
  if(![1,7,30].includes(days))return reply(400,{error:'invalid_period'});
  // Fixed read-only upstream and bounded periods: never proxy a caller's URL.
  const end=new Date(Math.floor(now()/3600000)*3600000+3600000);
  const start=new Date(end.getTime()-days*86400000);
  const upstream=new URL(STATS_URL);upstream.searchParams.set('start',start.toISOString());upstream.searchParams.set('end',end.toISOString());
  try{
   const response=await fetcher(upstream,{method:'GET',headers:{Authorization:'Bearer '+statsToken,Accept:'application/json'},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000)});
   if(!response.ok)return reply(502,{error:'statistics_unavailable'});
   const data=await response.json();
   if(!Number.isSafeInteger(data.total)||data.total<0||!Array.isArray(data.stats))return reply(502,{error:'invalid_statistics'});
   const stats=data.stats.filter(row=>/^\d{4}-\d{2}-\d{2}$/.test(row?.day)&&Number.isSafeInteger(row.daily)&&row.daily>=0).slice(0,32).map(row=>({day:row.day,visitors:row.daily}));
   // Only aggregates reach the browser. No tokens, upstream errors or user list.
   return reply(200,{period:days,total:data.total,stats,updatedAt:new Date(now()).toISOString()});
  }catch{return reply(502,{error:'statistics_unavailable'});}
 };
}

if(typeof Deno!=='undefined'){
 const {createClient}=await import('npm:@supabase/supabase-js@2.117.2');
 const client=createClient(PROJECT_URL,PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 Deno.serve(createOwnerHandler({getUser:token=>client.auth.getUser(token),statsToken:Deno.env.get('GOATCOUNTER_READ_TOKEN')||''}));
}
