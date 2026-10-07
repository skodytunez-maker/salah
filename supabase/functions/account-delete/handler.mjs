const PROJECT='https://kbltwszfvphgbxdbczsb.supabase.co';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function allowedOrigin(value){
 if(['https://skodytunez-maker.github.io','capacitor://localhost','https://localhost'].includes(value))return true;
 try{const url=new URL(value);return url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname);}catch{return false;}
}
export function createAccountDeletionHandler({getUser,getClaims,isSessionActive,deleteUser}){
 return async req=>{
  const origin=req.headers.get('Origin');
  const headers={'Content-Type':'application/json','Cache-Control':'no-store, private','Pragma':'no-cache','Vary':'Origin','X-Content-Type-Options':'nosniff'};
  if(origin&&allowedOrigin(origin))Object.assign(headers,{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Max-Age':'600'});
  const reply=(status,data)=>new Response(JSON.stringify(data),{status,headers});
  if(!origin||!allowedOrigin(origin))return reply(403,{error:'forbidden'});
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(req.method!=='POST')return reply(405,{error:'method_not_allowed'});
  if(new URL(req.url).search)return reply(400,{error:'invalid_parameters'});
  if(!req.headers.get('Content-Type')?.toLowerCase().startsWith('application/json'))return reply(415,{error:'invalid_content_type'});
  let body;try{const raw=await req.text();if(raw.length>1000)return reply(413,{error:'invalid_request'});body=JSON.parse(raw);}catch{return reply(400,{error:'invalid_request'});}
  if(!body||Array.isArray(body)||typeof body!=='object'||Object.keys(body).length!==1||body.confirmation!=='DELETE')return reply(400,{error:'confirmation_required'});
  const bearer=req.headers.get('Authorization')||'';if(!/^Bearer [A-Za-z0-9._-]{16,8192}$/.test(bearer))return reply(401,{error:'sign_in_required'});
  let user,claims;try{
   const [result,verified]=await Promise.all([getUser(bearer.slice(7)),getClaims(bearer.slice(7))]);
   user=result.data?.user;claims=verified.data?.claims;
   if(result.error||verified.error||!user||!UUID.test(user.id)||user.is_anonymous||!user.email_confirmed_at||claims?.sub!==user.id||claims.iss!==PROJECT+'/auth/v1'||!UUID.test(claims.session_id||''))return reply(401,{error:'invalid_session'});
   if(!await isSessionActive(user.id,claims.session_id))return reply(401,{error:'invalid_session'});
  }catch{return reply(503,{error:'auth_unavailable'});}
  try{await deleteUser(user.id);return reply(200,{deleted:true});}
  catch{return reply(503,{error:'deletion_unavailable'});}
 };
}
