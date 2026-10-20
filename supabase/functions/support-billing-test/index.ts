import{createClient}from 'npm:@supabase/supabase-js@2.117.2';
import postgres from 'npm:postgres@3.4.9';
import{createEngine,UUID}from './engine.mjs';
import{createPostgresStore}from './store.mjs';
import{createTestProvider,testConfiguration}from './provider.mjs';
import{createTestHandler}from './http.mjs';
const env=(name:string)=>Deno.env.get(name);
const config=testConfiguration(env);
// Nothing connects to Postgres/YooKassa unless the sandbox was explicitly configured.
if(!config){Deno.serve(createTestHandler({engine:null}));}
else{
 const project=env('SUPABASE_URL')!;
 const auth=createClient(project,'sb_publishable_D2OGfXHyZCN_DQJpR9LTNg_mOD03jnR',{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:(url,init)=>fetch(url,{...init,signal:AbortSignal.timeout(10000)})}});
 const sql=postgres(env('SUPABASE_DB_URL')!,{max:2,prepare:false,idle_timeout:20,connect_timeout:10});
 const store=createPostgresStore(sql),provider=createTestProvider(config);
 const allowUsers=[...new Set((env('SALAH_BILLING_TEST_USERS')||'').split(',').map(s=>s.trim()).filter(s=>UUID.test(s)))].slice(0,10);
 async function verify(token:string){
  const {data,error}=await auth.auth.getUser(token);const user=data?.user;
  if(error||!user||!UUID.test(user.id)||!user.email_confirmed_at||user.is_anonymous)return null;
  const checked=await auth.auth.getClaims(token);const claims=checked.data?.claims;
  if(checked.error||claims?.sub!==user.id||claims?.iss!==project+'/auth/v1'||!UUID.test(String(claims?.session_id||'')))return null;
  if(user.factors?.some(f=>f.status==='verified')&&claims.aal!=='aal2')return null;
  const rows=await sql`select id from auth.sessions where id=${claims.session_id}::uuid and user_id=${user.id}::uuid and(not_after is null or not_after>now())`;
  return rows.length?{id:user.id}:null;
 }
 Deno.serve(createTestHandler({engine:createEngine({store,provider,shop:config.shop}),verify,allowUsers,runnerSecret:env('SALAH_BILLING_TEST_RUNNER_SECRET'),findOperation:store.findOperation}));
}
