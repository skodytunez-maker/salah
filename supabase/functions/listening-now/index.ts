import postgres from 'npm:postgres@3.4.9';
import{createListeningNowHandler}from './core.mjs';
const sql=postgres(Deno.env.get('SUPABASE_DB_URL')!,{max:1,prepare:false,idle_timeout:20,connect_timeout:10});
const url=Deno.env.get('SUPABASE_URL')!,key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
async function verified(req:Request){
 const bearer=req.headers.get('authorization')||'';if(!/^Bearer [A-Za-z0-9_.-]+$/.test(bearer))return null;
 const response=await fetch(url+'/auth/v1/user',{headers:{apikey:key,Authorization:bearer},signal:AbortSignal.timeout(8000)});
 if(!response.ok)return null;const user=await response.json();if(!uuid.test(user.id)||!user.email_confirmed_at||user.is_anonymous)return null;
 let claims;try{claims=JSON.parse(atob(bearer.slice(7).split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));}catch{return null;}
 return claims.sub===user.id&&uuid.test(claims.session_id||'')?{id:user.id,session:claims.session_id}:null;
}
Deno.serve(createListeningNowHandler(sql,{verified}));
