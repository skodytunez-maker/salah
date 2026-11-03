const ORIGINS=new Set(['https://skodytunez-maker.github.io','capacitor://localhost','http://localhost','https://localhost']);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function guestDeviceHash(id){
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('salah-guest-v1:'+id.toLowerCase()));
 return Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');
}
export function createGuestHandler({record}){
 return async req=>{
  const origin=req.headers.get('Origin'),allowed=ORIGINS.has(origin);
  const headers={'Cache-Control':'no-store','Content-Type':'application/json','Vary':'Origin','X-Content-Type-Options':'nosniff',...(allowed?{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Max-Age':'600'}:{})};
  const reply=(status,error)=>new Response(error?JSON.stringify({error}):null,{status,headers});
  if(!allowed)return reply(403,'forbidden');
  if(req.method==='OPTIONS')return reply(204);
  if(req.method!=='POST')return reply(405,'method_not_allowed');
  if(new URL(req.url).search)return reply(400,'invalid_parameters');
  if(!/^application\/json(?:;|$)/i.test(req.headers.get('Content-Type')||''))return reply(415,'json_required');
  if(Number(req.headers.get('Content-Length'))>128)return reply(413,'too_large');
  let data;const reader=req.body?.getReader();if(!reader)return reply(400,'invalid_body');
  try{const chunks=[];let size=0;while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>128){await reader.cancel();return reply(413,'too_large');}chunks.push(value);}const bytes=new Uint8Array(size);let i=0;for(const c of chunks){bytes.set(c,i);i+=c.length;}data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}
  catch{return reply(400,'invalid_body');}finally{reader.releaseLock();}
  if(!data||Array.isArray(data)||Object.keys(data).length!==1||typeof data.device!=='string'||!UUID.test(data.device))return reply(400,'invalid_device');
  try{return await record(await guestDeviceHash(data.device))?reply(204):reply(429,'try_later');}catch{return reply(503,'unavailable');}
 };
}
// Public, write-only endpoint. No guest IDs, counts or account data can be read.
export async function recordGuest(sql,hash){
 return sql.begin(async tx=>{
  const [budget]=await tx`insert into salah_visits_private.budgets(bucket,hits) values(date_trunc('minute',clock_timestamp()),1) on conflict(bucket) do update set hits=budgets.hits+1 where budgets.hits<300 returning hits`;
  if(!budget)return false;
  const [day]=await tx`insert into salah_visits_private.daily_budgets(day,hits) values((clock_timestamp() at time zone 'UTC')::date,1) on conflict(day) do update set hits=daily_budgets.hits+1 where daily_budgets.hits<20000 returning hits`;
  if(!day)return false;
  await tx`insert into salah_visits_private.guest_days(device_hash,day,last_seen) values(${hash},(clock_timestamp() at time zone 'UTC')::date,clock_timestamp()) on conflict(device_hash,day) do update set last_seen=excluded.last_seen`;
  if(budget.hits===1){await tx`delete from salah_visits_private.guest_days where day<(clock_timestamp() at time zone 'UTC')::date-35`;await tx`delete from salah_visits_private.budgets where bucket<clock_timestamp()-interval '1 day'`;await tx`delete from salah_visits_private.daily_budgets where day<(clock_timestamp() at time zone 'UTC')::date-1`;}
  return true;
 });
}
if(typeof Deno!=='undefined'){
 const {default:postgres}=await import('npm:postgres@3.4.9');
 const sql=postgres(Deno.env.get('SUPABASE_DB_URL'),{max:1,prepare:false,idle_timeout:20,connect_timeout:10});
 Deno.serve(createGuestHandler({record:hash=>recordGuest(sql,hash)}));
}
