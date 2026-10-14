import {createClient} from 'npm:@supabase/supabase-js@2.117.2';
import postgres from 'npm:postgres@3.4.9';
import {createBillingHandler} from './core.mjs';
const project=Deno.env.get('SUPABASE_URL')!;
const publicKey='sb_publishable_D2OGfXHyZCN_DQJpR9LTNg_mOD03jnR';
const auth=createClient(project,publicKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:(url,init)=>fetch(url,{...init,signal:AbortSignal.timeout(10000)})}});
const sql=postgres(Deno.env.get('SUPABASE_DB_URL')!,{max:1,prepare:false,idle_timeout:20,connect_timeout:10});
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
async function verify(token:string){
 const {data,error}=await auth.auth.getUser(token);const user=data?.user;
 if(error||!user||!uuid.test(user.id)||!user.email_confirmed_at||user.is_anonymous)return null;
 const checked=await auth.auth.getClaims(token);const claims=checked.data?.claims;
 if(checked.error||claims?.sub!==user.id||claims?.iss!==project+'/auth/v1'||!uuid.test(String(claims?.session_id||'')))return null;
 if(user.factors?.some(f=>f.status==='verified')&&claims.aal!=='aal2')return null;
 const rows=await sql`select id from auth.sessions where id=${claims.session_id}::uuid and user_id=${user.id}::uuid and(not_after is null or not_after>now())`;
 return rows.length?{id:user.id}:null;
}
const readOwn=async(id:string)=>(await sql`select status,amount_rub,method_type,card_last4,started_at,next_charge_at,cancelled_at from salah_billing_private.subscriptions where user_id=${id}::uuid`)[0]||null;
const unlinkOwn=async(id:string)=>sql.begin(async tx=>{
 await tx`select pg_advisory_xact_lock(hashtextextended(${id},335))`;
 await tx`select salah_billing_private.unlink(${id}::uuid)`;
 return(await tx`select status,amount_rub,method_type,card_last4,started_at,next_charge_at,cancelled_at from salah_billing_private.subscriptions where user_id=${id}::uuid`)[0]||null;
});
// No YooKassa credentials, payment creation, webhooks or renewals are used by this endpoint.
// JWT verification is performed above to support the project's modern signing keys.
Deno.serve(createBillingHandler({verify,readOwn,unlinkOwn}));
