import{createAccountDeletionHandler}from'./handler.mjs';
const PROJECT='https://kbltwszfvphgbxdbczsb.supabase.co';
const KEY='sb_publishable_D2OGfXHyZCN_DQJpR9LTNg_mOD03jnR';
if(typeof Deno!=='undefined'){
 const {createClient}=await import('npm:@supabase/supabase-js@2.117.2');
 const {default:postgres}=await import('npm:postgres@3.4.9');
 const sql=postgres(Deno.env.get('SUPABASE_DB_URL'),{max:1,prepare:false,idle_timeout:20,connect_timeout:10});
 const auth=createClient(PROJECT,KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 let adminKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!adminKey){try{adminKey=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}').default;}catch{}}
 if(!adminKey)throw Error('Supabase server-side admin key is not configured');
 const admin=createClient(PROJECT,adminKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 Deno.serve(createAccountDeletionHandler({
  getUser:token=>auth.auth.getUser(token),
  getClaims:token=>auth.auth.getClaims(token),
  isSessionActive:async(uid,sid)=>{const [row]=await sql`select exists(select 1 from auth.sessions where id=${sid}::uuid and user_id=${uid}::uuid) as active`;return row.active===true;},
  deleteUser:async uid=>sql.begin(async tx=>{
   await tx`select pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(${uid}::text,0))`;
   const photos=await tx`select name from storage.objects where bucket_id='support-photos' and (name like ${'salah/'+uid+'/%'} or name like ${'sahaba/'+uid+'/%'})`;
   for(let i=0;i<photos.length;i+=100){const {error}=await admin.storage.from('support-photos').remove(photos.slice(i,i+100).map(photo=>photo.name));if(error)throw error;}
   const avatarRows=await tx`select name from storage.objects where bucket_id='profile-avatars' and name=${uid+'/profile.jpg'}`;
   if(avatarRows.length){const {error:avatarError}=await admin.storage.from('profile-avatars').remove(avatarRows.map(photo=>photo.name));if(avatarError)throw avatarError;}
   const {error}=await admin.auth.admin.deleteUser(uid);if(error)throw error;
  })
 }));
}
