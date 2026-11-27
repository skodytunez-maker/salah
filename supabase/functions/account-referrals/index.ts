import {createClient} from 'npm:@supabase/supabase-js@2.117.2';
import postgres from 'npm:postgres@3.4.9';
import {createReferralHandler} from './core.mjs';
import {readReferralInvitees} from './invitees.mjs';
import {readAccountAdjr} from './ajr-summary.mjs';

const project=Deno.env.get('SUPABASE_URL')?.replace(/\/$/,'');
const keys=JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS')??'{}');
const publicKey=keys.default??Deno.env.get('SUPABASE_ANON_KEY');
const dbUrl=Deno.env.get('SUPABASE_DB_URL');
if(!project||typeof publicKey!=='string'||!publicKey||!dbUrl)throw Error('Missing referrals environment');
const auth=createClient(project, publicKey, {auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}}).auth;
const sql=postgres(dbUrl,{max:1,prepare:false,idle_timeout:20,connect_timeout:10});

Deno.serve(createReferralHandler({
  issuer:project+'/auth/v1',
  getUser:token=>auth.getUser(token),
  getClaims:token=>auth.getClaims(token),
  isSessionActive:async(uid,sid)=>{
    const [row]=await sql`select exists (
      select 1 from auth.sessions s join auth.users u on u.id=s.user_id
      where s.id=${sid}::uuid and s.user_id=${uid}::uuid
        and (s.not_after is null or s.not_after>now())
        and (u.banned_until is null or u.banned_until<=now())
    ) as active`;
    return row.active===true;
  },
  ensureCode:uid=>sql`select salah_referrals_private.own_code(${uid}::uuid)`,
  readInvitees:uid=>readReferralInvitees(sql,uid),
  readSummary:uid=>readAccountAdjr(sql,uid)
}));
