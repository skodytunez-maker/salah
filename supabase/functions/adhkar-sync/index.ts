const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const record=v=>v&&typeof v==='object'&&!Array.isArray(v);
export function cleanCounters(value,signed=false){
 if(!record(value)||Object.keys(value).length>256)throw Error('invalid_counts');
 const result={};for(const [id,n]of Object.entries(value)){if(!/^[\w-]{1,80}$/.test(id)||(Object.hasOwn(Object.prototype,id)||id==='prototype')||!Number.isSafeInteger(n)||Math.abs(n)>1000000000000||!signed&&n<0)throw Error('invalid_counts');result[id]=n;}return result;
}
export function cleanComponent(value){
 if(!record(value)||Object.keys(value).some(k=>!['device','sequence','seed','delta'].includes(k))||!UUID.test(value.device)||!Number.isSafeInteger(value.sequence)||value.sequence<1)throw Error('invalid_component');
 return {device:value.device,sequence:value.sequence,seed:cleanCounters(value.seed),delta:cleanCounters(value.delta,true)};
}
export function aggregateCounters(components){
 const seed={},delta={};for(const row of components){const c=cleanComponent(row);for(const [id,n]of Object.entries(c.seed))seed[id]=(seed[id]||0)+n;for(const [id,n]of Object.entries(c.delta))delta[id]=(delta[id]||0)+n;}
 const totals={};for(const id of new Set([...Object.keys(seed),...Object.keys(delta)]))totals[id]=Math.max(0,Math.min(1000000000000,(seed[id]||0)+(delta[id]||0)));return totals;
}
export function initialSeed(current,seed){const result={};for(const [id,n]of Object.entries(seed))result[id]=Math.max(0,n-(current[id]||0));return result;}
const ORIGINS=new Set(['https://skodytunez-maker.github.io','capacitor://localhost','http://localhost','https://localhost']);
const PROJECT='https://kbltwszfvphgbxdbczsb.supabase.co';
const OWNER='dc1eb1cc-6f8f-472f-a937-735fbfbba4b7';
export function createCounterHandler({getUser,getClaims,db,isSessionActive=null}){return async req=>{
 const origin=req.headers.get('Origin'),headers={'Content-Type':'application/json','Cache-Control':'no-store, private','Vary':'Origin','X-Content-Type-Options':'nosniff'};
 if(ORIGINS.has(origin))Object.assign(headers,{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, apikey, content-type','Access-Control-Allow-Methods':'GET, POST, OPTIONS'});
 const reply=(status,value)=>new Response(JSON.stringify(value),{status,headers});
 if(origin&&!ORIGINS.has(origin))return reply(403,{error:'forbidden'});if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(!['GET','POST'].includes(req.method))return reply(405,{error:'method_not_allowed'});
 if(new URL(req.url).search)return reply(400,{error:'invalid_parameters'});
 const auth=req.headers.get('Authorization')||'';if(!/^Bearer [A-Za-z0-9._-]{16,8192}$/.test(auth))return reply(401,{error:'sign_in_required'});
 let user,claims;try{const result=await getUser(auth.slice(7));if(result.error)return reply(401,{error:'invalid_session'});user=result.data?.user;const checked=await getClaims(auth.slice(7));if(checked.error)return reply(401,{error:'invalid_session'});claims=checked.data?.claims;}catch{return reply(503,{error:'auth_unavailable'});}
 if(!user||!UUID.test(user.id)||user.is_anonymous||!user.email_confirmed_at||claims?.sub!==user.id||claims.iss!==PROJECT+'/auth/v1')return reply(403,{error:'confirmed_account_required'});
 if(!UUID.test(claims.session_id||''))return reply(401,{error:'invalid_session'});
 try{if(!isSessionActive||!await isSessionActive(user.id,claims.session_id))return reply(401,{error:'invalid_session'});}catch{return reply(503,{error:'auth_unavailable'});}
 if(user.id===OWNER&&(claims.aal!=='aal2'||!user.factors?.some(f=>f.status==='verified'&&f.factor_type==='totp')))return reply(403,{error:'mfa_required'});
 try{
 if(!await db.rate(user.id))return reply(429,{error:'try_later'});
 if(req.method==='GET')return reply(200,{totals:await db.read(user.id)});
 if(!(req.headers.get('Content-Type')||'').startsWith('application/json'))return reply(415,{error:'json_required'});
 const raw=await req.text();if(new TextEncoder().encode(raw).length>32768)return reply(413,{error:'too_large'});
 let component;try{component=cleanComponent(JSON.parse(raw));}catch{return reply(400,{error:'invalid_component'});}
 return reply(200,{totals:await db.merge(user.id,component)});
 }catch{return reply(503,{error:'storage_unavailable'});}
};}
if(typeof Deno!=='undefined'){
 const {default:postgres}=await import('npm:postgres@3.4.9');const {createClient}=await import('npm:@supabase/supabase-js@2.117.2');
 const sql=postgres(Deno.env.get('SUPABASE_DB_URL'),{max:1,prepare:false,idle_timeout:20,connect_timeout:10});
 const auth=createClient(PROJECT,'sb_publishable_D2OGfXHyZCN_DQJpR9LTNg_mOD03jnR',{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 const readRows=async(tx,uid)=>(await tx`select device as device,sequence,seed,delta from salah_counter_private.components where user_id=${uid}::uuid`).map(row=>({...row,sequence:Number(row.sequence)}));
 const db={
  async rate(uid){const [row]=await sql`insert into salah_counter_private.rates(user_id,minute,n) values(${uid}::uuid,${Math.floor(Date.now()/60000)},1) on conflict(user_id) do update set minute=excluded.minute,n=case when salah_counter_private.rates.minute=excluded.minute then salah_counter_private.rates.n+1 else 1 end returning n`;return row.n<=60;},
  async read(uid){return aggregateCounters(await readRows(sql,uid));},
  async merge(uid,c){return sql.begin(async tx=>{await tx`select pg_advisory_xact_lock(hashtextextended(${uid},43))`;const [existing]=await tx`select sequence from salah_counter_private.components where user_id=${uid}::uuid and device=${c.device}::uuid`;if(!existing){const [n]=await tx`select count(*)::int as n from salah_counter_private.components where user_id=${uid}::uuid`;if(n.n>=100)throw Error('device_limit');}const seed=existing?c.seed:initialSeed(aggregateCounters(await readRows(tx,uid)),c.seed);await tx`insert into salah_counter_private.components(user_id,device,sequence,seed,delta) values(${uid}::uuid,${c.device}::uuid,${c.sequence},${tx.json(seed)},${tx.json(c.delta)}) on conflict(user_id,device) do update set sequence=excluded.sequence,delta=excluded.delta where salah_counter_private.components.sequence<excluded.sequence`;await tx`update salah_counter_private.components set saved_at=clock_timestamp() where user_id=${uid}::uuid and device=${c.device}::uuid`;return aggregateCounters(await readRows(tx,uid));});}
 };
 Deno.serve(createCounterHandler({getUser:token=>auth.auth.getUser(token),getClaims:token=>auth.auth.getClaims(token),db,isSessionActive:async(uid,sid)=>{const [row]=await sql`select exists(select 1 from auth.sessions where id=${sid}::uuid and user_id=${uid}::uuid) as active`;return row.active===true;}}));
}
