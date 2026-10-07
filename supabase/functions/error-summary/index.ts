const PROJECT='https://kbltwszfvphgbxdbczsb.supabase.co';
const ORIGIN='https://skodytunez-maker.github.io';
const ORIGINS=new Set([ORIGIN,'capacitor://localhost','http://localhost','https://localhost']);
const ROUTES=['home','knowledge','quran','adhkar','more','account','settings','calendar','qibla','umrah','support','learning','other'];
const KINDS=['script','promise','resource','slow'];
const MODULES=['app','quran','adhkar','qibla','support','settings','qr-login','account-devices','weather','other'];
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function validBatch(input){return !!input&&typeof input==='object'&&!Array.isArray(input)&&Object.keys(input).length===3&&UUID.test(input.id||'')&&Number.isSafeInteger(input.version)&&input.version>=1&&input.version<=1000000&&Array.isArray(input.events)&&input.events.length>=1&&input.events.length<=10&&input.events.every(e=>e&&typeof e==='object'&&!Array.isArray(e)&&Object.keys(e).length===5&&ROUTES.includes(e.route)&&KINDS.includes(e.kind)&&MODULES.includes(e.module)&&['phone','tablet','desktop'].includes(e.screen)&&Number.isSafeInteger(e.count)&&e.count>=1&&e.count<=20)&&input.events.reduce((n,e)=>n+e.count,0)<=20;}
export async function diagnosticRateHash(ip,secret,day=new Date().toISOString().slice(0,10)){if(!secret)throw Error('unavailable');const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode('salah-diagnostic-rate:'+day+':'+ip))),b=>b.toString(16).padStart(2,'0')).join('');}
export function createErrorHandler({record,read,ownerGate,rateHash}){return async req=>{
 const origin=req.headers.get('Origin'),headers={'Content-Type':'application/json','Cache-Control':'no-store, private','Vary':'Origin','X-Content-Type-Options':'nosniff'};
 if(ORIGINS.has(origin))Object.assign(headers,{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, apikey, content-type','Access-Control-Allow-Methods':'GET, POST, OPTIONS'});
 const reply=(status,value)=>new Response(JSON.stringify(value),{status,headers});
 if(origin&&!ORIGINS.has(origin))return reply(403,{error:'forbidden'});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method==='GET'){
  const url=new URL(req.url),days=Number(url.searchParams.get('days')||7);if(![1,7,30].includes(days)||[...url.searchParams.keys()].some(k=>k!=='days'))return reply(400,{error:'invalid_parameters'});
  const bearer=req.headers.get('Authorization')||'';if(!/^Bearer [A-Za-z0-9._-]{16,8192}$/.test(bearer))return reply(401,{error:'sign_in_required'});
  try{if(!await ownerGate(bearer.slice(7)))return reply(403,{error:'owner_only'});return reply(200,await read(days));}catch{return reply(503,{error:'unavailable'});}
 }
 if(req.method!=='POST')return reply(405,{error:'method_not_allowed'});
 if(new URL(req.url).search)return reply(400,{error:'invalid_parameters'});
 if(!(req.headers.get('Content-Type')||'').startsWith('application/json'))return reply(415,{error:'json_required'});
 let input;try{const text=await req.text();if(new TextEncoder().encode(text).length>4096)return reply(413,{error:'too_large'});input=JSON.parse(text);}catch{return reply(400,{error:'invalid_request'});}
 if(!validBatch(input))return reply(400,{error:'invalid_request'});
 try{const ip=(req.headers.get('x-forwarded-for')||'unknown').split(',')[0].trim();const hash=await rateHash(ip);if(!await record(input,hash))return reply(429,{error:'try_later'});return reply(200,{ok:true});}catch{return reply(503,{error:'unavailable'});}
};}
if(typeof Deno!=='undefined'){
 const {default:postgres}=await import('npm:postgres@3.4.9');const sql=postgres(Deno.env.get('SUPABASE_DB_URL'),{max:2,prepare:false,idle_timeout:20,connect_timeout:10});
 Deno.serve(createErrorHandler({rateHash:ip=>diagnosticRateHash(ip,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')),ownerGate:async token=>{
  // Reuse the existing server authority, active-session and MFA checks.
  const r=await fetch(PROJECT+'/functions/v1/owner-access',{headers:{apikey:'sb_publishable_D2OGfXHyZCN_DQJpR9LTNg_mOD03jnR',Authorization:'Bearer '+token},cache:'no-store',signal:AbortSignal.timeout(10000)});if(!r.ok)return false;return (await r.json()).owner===true;
 },record:(input,hash)=>sql.begin(async tx=>{
  await tx`select pg_advisory_xact_lock(hashtextextended(${hash},0))`;
  await tx`delete from salah_errors_private.batches where created_at<clock_timestamp()-interval '2 days'`;
  await tx`delete from salah_errors_private.counts where day<current_date-29`;
  const [existing]=await tx`select id from salah_errors_private.batches where id=${input.id}::uuid`;if(existing)return true;
  const [rate]=await tx`select coalesce(sum(units),0)::int as total from salah_errors_private.batches where ip_hash=${hash} and created_at>=date_trunc('day',clock_timestamp())`;
  const units=input.events.reduce((n,e)=>n+e.count,0);if(rate.total+units>100)return false;
  const accepted=await tx`insert into salah_errors_private.batches(id,ip_hash,units) values(${input.id}::uuid,${hash},${units}) on conflict do nothing returning id`;if(!accepted.length)return true;
  for(const e of input.events)await tx`insert into salah_errors_private.counts(day,version,route,kind,module,screen,count) values(current_date,${input.version},${e.route},${e.kind},${e.module},${e.screen},${e.count}) on conflict(day,version,route,kind,module,screen) do update set count=counts.count+excluded.count`;
  return true;
 }),read:async days=>{
  const rows=await sql`select version,route,kind,module,screen,sum(count)::bigint::text as count from salah_errors_private.counts where day>=current_date-${days-1} group by version,route,kind,module,screen order by sum(count) desc,version desc,route,kind,module,screen limit 101`;
  const [total]=await sql`select coalesce(sum(count),0)::bigint::text as count from salah_errors_private.counts where day>=current_date-${days-1}`;
  return{days,total:Number(total.count),rows:rows.slice(0,100).map(r=>({...r,count:Number(r.count)})),more:rows.length>100};
 }}));
}
