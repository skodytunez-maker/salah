const PROJECT='https://kbltwszfvphgbxdbczsb.supabase.co';
const KEY='sb_publishable_D2OGfXHyZCN_DQJpR9LTNg_mOD03jnR';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ORIGINS=new Set(['https://skodytunez-maker.github.io','capacitor://localhost','http://localhost','https://localhost']);
export function createNativeSupportDevicesHandler({getUser,getClaims,isSessionActive,register,remove,senderReady=()=>true}){return async req=>{
 const origin=req.headers.get('Origin'),headers={'Content-Type':'application/json','Cache-Control':'no-store, private','Vary':'Origin','X-Content-Type-Options':'nosniff'};
 if(ORIGINS.has(origin))Object.assign(headers,{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'});
 const reply=(status,value)=>new Response(JSON.stringify(value),{status,headers});
 if(origin&&!ORIGINS.has(origin))return reply(403,{error:'invalid_origin'});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});if(req.method!=='POST')return reply(405,{error:'invalid_method'});
 const authorization=req.headers.get('Authorization')||'';if(!/^Bearer [A-Za-z0-9._-]{16,8192}$/.test(authorization))return reply(401,{error:'sign_in_required'});
 if(!req.headers.get('Content-Type')?.startsWith('application/json'))return reply(415,{error:'invalid_input'});
 let input;try{const reader=req.body?.getReader();if(!reader)throw Error();let size=0,chunks=[];while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>6000){await reader.cancel();return reply(413,{error:'invalid_input'})}chunks.push(part.value)}const raw=new Uint8Array(size);let offset=0;for(const part of chunks){raw.set(part,offset);offset+=part.length}input=JSON.parse(new TextDecoder().decode(raw));}catch{return reply(400,{error:'invalid_input'})}
 const allowed=input?.action==='register'?['action','device','token']:input?.action==='remove'?['action','device']:null;
 if(!allowed||!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>!allowed.includes(key))||allowed.some(key=>!Object.hasOwn(input,key))||!UUID.test(input.device||'')||input.action==='register'&&(typeof input.token!=='string'||input.token.length<100||input.token.length>4096||!/^[-\w:.]+$/.test(input.token)))return reply(400,{error:'invalid_input'});
 let user,claims;
 try{const u=await getUser(authorization.slice(7)),c=await getClaims(authorization.slice(7));if(u.error||c.error)return reply(401,{error:'invalid_session'});user=u.data?.user;claims=c.data?.claims;}catch{return reply(503,{error:'auth_unavailable'})}
 if(!UUID.test(user?.id||'')||!user.email_confirmed_at||user.is_anonymous||claims?.sub!==user.id||claims.iss!==PROJECT+'/auth/v1'||!UUID.test(claims.session_id||''))return reply(401,{error:'invalid_session'});
 try{if(!await isSessionActive(user.id,claims.session_id))return reply(401,{error:'invalid_session'});}catch{return reply(503,{error:'auth_unavailable'})}
 if(input.action==='register'&&!senderReady())return reply(503,{error:'sender_unavailable'});
 try{const ok=input.action==='register'?await register(user.id,claims.session_id,input.device,input.token):await remove(user.id,claims.session_id,input.device);return ok?reply(200,{ok:true}):reply(403,{error:'device_unavailable'});}catch{return reply(503,{error:'storage_unavailable'})}
};}
if(typeof Deno!=='undefined'){
 const {default:postgres}=await import('npm:postgres@3.4.9');const {createClient}=await import('npm:@supabase/supabase-js@2.117.2');
 const sql=postgres(Deno.env.get('SUPABASE_DB_URL'),{max:1,prepare:false,idle_timeout:20,connect_timeout:10});
 const auth=createClient(PROJECT,KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 let configured=false;
 try{const secret=Deno.env.get('FIREBASE_SUPPORT_SERVICE_ACCOUNT');if(secret){const{createFirebaseSupportSender}=await import('./firebase-support-sender.mjs');createFirebaseSupportSender({credential:JSON.parse(secret)});configured=true;}}catch{}
 Deno.serve(createNativeSupportDevicesHandler({getUser:token=>auth.auth.getUser(token),getClaims:token=>auth.auth.getClaims(token),senderReady:()=>configured,
 isSessionActive:async(uid,sid)=>{const[row]=await sql`select exists(select 1 from auth.sessions where id=${sid}::uuid and user_id=${uid}::uuid) as active`;return row.active===true;},
 register:async(uid,sid,id,token)=>{
  const rows=await sql`insert into salah_support_private.native_devices(id,user_id,session_id,token,token_hash,enabled,updated_at) select ${id}::uuid,${uid}::uuid,${sid}::uuid,${token},encode(sha256(convert_to(${token},'UTF8')),'hex'),true,now() where exists(select 1 from auth.sessions where id=${sid}::uuid and user_id=${uid}::uuid) on conflict(id) do update set session_id=excluded.session_id,token=excluded.token,token_hash=excluded.token_hash,enabled=true,updated_at=now() where salah_support_private.native_devices.user_id=excluded.user_id returning id`;return rows.length===1;
 },
 remove:async(uid,sid,id)=>{await sql`update salah_support_private.native_devices set enabled=false,token=null,token_hash=null where id=${id}::uuid and user_id=${uid}::uuid and session_id=${sid}::uuid`;return true;}
 }));
}
