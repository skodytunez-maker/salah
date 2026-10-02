// Common identity check for the separate SALAH and SAHABA apps.
const PROJECT='https://kbltwszfvphgbxdbczsb.supabase.co';
const KEY='sb_publishable_D2OGfXHyZCN_DQJpR9LTNg_mOD03jnR';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function createAccountHandler({getUser,getClaims,isSessionActive}){return async req=>{
 const headers={'Content-Type':'application/json','Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff'};
 const reply=(status,data)=>new Response(JSON.stringify(data),{status,headers});
 // Server-to-server only; no browser CORS or access to app data.
 if(req.method!=='GET')return reply(405,{error:'method_not_allowed'});
 if(req.headers.has('Origin'))return reply(403,{error:'forbidden'});
 if(new URL(req.url).search)return reply(400,{error:'invalid_parameters'});
 const bearer=req.headers.get('Authorization')||'';if(!/^Bearer [A-Za-z0-9._-]{16,8192}$/.test(bearer))return reply(401,{error:'sign_in_required'});
 try{
 const [result,verified]=await Promise.all([getUser(bearer.slice(7)),getClaims(bearer.slice(7))]);
 const user=result.data?.user,claims=verified.data?.claims;
 if(result.error||verified.error||!user||!UUID.test(user.id)||user.is_anonymous||!user.email_confirmed_at||claims?.sub!==user.id||claims.iss!==PROJECT+'/auth/v1'||!UUID.test(claims.session_id||''))return reply(401,{error:'invalid_session'});
 if(!await isSessionActive(user.id,claims.session_id))return reply(401,{error:'invalid_session'});
 return reply(200,{id:user.id});
 }catch{return reply(503,{error:'auth_unavailable'});}
};}
if(typeof Deno!=='undefined'){
 const {createClient}=await import('npm:@supabase/supabase-js@2.117.2');
 const {default:postgres}=await import('npm:postgres@3.4.9');
 const sql=postgres(Deno.env.get('SUPABASE_DB_URL'),{max:1,prepare:false,idle_timeout:20,connect_timeout:10});
 const client=createClient(PROJECT,KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 Deno.serve(createAccountHandler({getUser:token=>client.auth.getUser(token),getClaims:token=>client.auth.getClaims(token),isSessionActive:async(uid,sid)=>{const [row]=await sql`select exists(select 1 from auth.sessions where id=${sid}::uuid and user_id=${uid}::uuid) as active`;return row.active===true;}}));
}
