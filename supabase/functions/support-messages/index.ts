const PROJECT='https://kbltwszfvphgbxdbczsb.supabase.co';
const KEY='sb_publishable_D2OGfXHyZCN_DQJpR9LTNg_mOD03jnR';
const ORIGINS=new Map([['https://skodytunez-maker.github.io','salah'],['https://sahaba-learning.skodytunez.chatgpt.site','sahaba']]);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHAPES={support_list:['p_app','p_owner','p_before'],support_read:['p_id','p_app','p_owner'],support_create:['p_id','p_app','p_subject','p_body','p_version'],support_reply:['p_thread','p_app','p_id','p_body','p_owner'],support_close:['p_id','p_app']};
export function createSupportHandler({getUser,getClaims,invoke}){
 return async req=>{
  const origin=req.headers.get('Origin'),headers={'Content-Type':'application/json','Cache-Control':'no-store, private','Pragma':'no-cache','Vary':'Origin','X-Content-Type-Options':'nosniff'};
  if(ORIGINS.has(origin))Object.assign(headers,{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Max-Age':'600'});
  const reply=(status,value)=>new Response(JSON.stringify(value),{status,headers});
  if(origin&&!ORIGINS.has(origin))return reply(403,{error:'42501'});
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(req.method!=='POST')return reply(405,{error:'invalid_method'});
  if(new URL(req.url).search)return reply(400,{error:'22023'});
  const bearer=req.headers.get('Authorization')||'';if(!/^Bearer [A-Za-z0-9._-]{16,8192}$/.test(bearer))return reply(401,{error:'42501'});
  if(!req.headers.get('Content-Type')?.startsWith('application/json'))return reply(415,{error:'22023'});
  let body;try{if(Number(req.headers.get('Content-Length'))>20000)return reply(413,{error:'22023'});const reader=req.body?.getReader();if(!reader)return reply(400,{error:'22023'});let chunks=[],size=0;while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>20000){await reader.cancel();return reply(413,{error:'22023'})}chunks.push(value)}const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}body=JSON.parse(new TextDecoder().decode(bytes));}catch{return reply(400,{error:'22023'})}
  const {name,args}=body||{};if(!Object.hasOwn(SHAPES,name)||Object.keys(body).some(key=>!['name','args'].includes(key))||!args||typeof args!=='object'||Array.isArray(args)||SHAPES[name].some(key=>!Object.hasOwn(args,key))||Object.keys(args).some(key=>!SHAPES[name].includes(key))||!['salah','sahaba'].includes(args.p_app))return reply(400,{error:'22023'});
  if(origin&&ORIGINS.get(origin)!==args.p_app)return reply(403,{error:'42501'});
  if(Object.hasOwn(args,'p_owner')&&typeof args.p_owner!=='boolean')return reply(400,{error:'22023'});
  for(const key of ['p_id','p_thread'])if(Object.hasOwn(args,key)&&!UUID.test(args[key]))return reply(400,{error:'22023'});
  if(Object.hasOwn(args,'p_before')&&args.p_before!==null&&(typeof args.p_before!=='string'||!Number.isFinite(Date.parse(args.p_before))))return reply(400,{error:'22023'});
  if(Object.hasOwn(args,'p_body')&&(typeof args.p_body!=='string'||args.p_body.trim().length<1||args.p_body.length>3000)||Object.hasOwn(args,'p_subject')&&(typeof args.p_subject!=='string'||args.p_subject.trim().length<1||args.p_subject.length>120)||Object.hasOwn(args,'p_version')&&(typeof args.p_version!=='string'||args.p_version.length>40))return reply(400,{error:'22023'});
  let user,claims;try{const checked=await getUser(bearer.slice(7));if(checked.error)return reply(401,{error:'42501'});user=checked.data?.user;const signed=await getClaims(bearer.slice(7));if(signed.error)return reply(401,{error:'42501'});claims=signed.data?.claims;}catch{return reply(503,{error:'auth_unavailable'})}
  if(!user?.email_confirmed_at||user.is_anonymous||!UUID.test(user.id)||claims?.sub!==user.id||claims.iss!==PROJECT+'/auth/v1'||!UUID.test(claims.session_id||''))return reply(401,{error:'42501'});
  try{return reply(200,{data:await invoke(name,args,claims)});}catch(error){const known=['support_rate_limit','conversation_closed','conversation_full'];if(error?.code==='42501')return reply(403,{error:'42501'});if(error?.code==='22023')return reply(400,{error:'22023'});if(known.includes(error?.message))return reply(429,{error:error.message});return reply(503,{error:'support_unavailable'})}
 };
}
if(typeof Deno!=='undefined'){
 const {createClient}=await import('npm:@supabase/supabase-js@2.117.2');const {default:postgres}=await import('npm:postgres@3.4.9');
 const sql=postgres(Deno.env.get('SUPABASE_DB_URL'),{max:1,prepare:false,idle_timeout:20,connect_timeout:10});
 const auth=createClient(PROJECT,KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 const invoke=(name,a,claims)=>sql.begin(async tx=>{
  await tx`select pg_catalog.set_config('request.jwt.claims',${JSON.stringify(claims)},true)`;let rows;
  if(name==='support_list')rows=await tx`select public.support_list(${a.p_app}::text,${a.p_owner}::boolean,${a.p_before}::timestamptz) as data`;
  else if(name==='support_read')rows=await tx`select public.support_read(${a.p_id}::uuid,${a.p_app}::text,${a.p_owner}::boolean) as data`;
  else if(name==='support_create')rows=await tx`select public.support_create(${a.p_id}::uuid,${a.p_app}::text,${a.p_subject}::text,${a.p_body}::text,${a.p_version}::text) as data`;
  else if(name==='support_reply')rows=await tx`select public.support_reply(${a.p_thread}::uuid,${a.p_app}::text,${a.p_id}::uuid,${a.p_body}::text,${a.p_owner}::boolean) as data`;
  else rows=await tx`select public.support_close(${a.p_id}::uuid,${a.p_app}::text) as data`;
  return rows[0]?.data??null;
 });
 Deno.serve(createSupportHandler({getUser:token=>auth.auth.getUser(token),getClaims:token=>auth.auth.getClaims(token),invoke}));
}
