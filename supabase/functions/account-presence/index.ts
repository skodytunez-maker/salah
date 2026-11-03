// BEGIN SHARED ACCOUNT LOCATION
// Country fallback for established SALAH city names only. No network geolocation.
export const LOCATION_COUNTRIES={
 'россия':'Россия',ru:'Россия',russia:'Россия','российская федерация':'Россия',
 'азербайджан':'Азербайджан',az:'Азербайджан',azerbaijan:'Азербайджан',
 'таджикистан':'Таджикистан',tj:'Таджикистан',tajikistan:'Таджикистан',
 'узбекистан':'Узбекистан',uz:'Узбекистан',uzbekistan:'Узбекистан',
 'казахстан':'Казахстан',kz:'Казахстан',kazakhstan:'Казахстан',
 'кыргызстан':'Кыргызстан','киргизия':'Кыргызстан',kg:'Кыргызстан',kyrgyzstan:'Кыргызстан',
 'саудовская аравия':'Саудовская Аравия',sa:'Саудовская Аравия','saudi arabia':'Саудовская Аравия',
 'оаэ':'ОАЭ',ae:'ОАЭ','united arab emirates':'ОАЭ'
};
export const LOCATION_CITIES={
 'тюмень':['Тюмень','Россия'],tyumen:['Тюмень','Россия'],
 'омск':['Омск','Россия'],omsk:['Омск','Россия'],
 'буйнакск':['Буйнакск','Россия'],buynaksk:['Буйнакск','Россия'],
 'гянджа':['Гянджа','Азербайджан'],ganja:['Гянджа','Азербайджан'],
 'москва':['Москва','Россия'],'санкт-петербург':['Санкт-Петербург','Россия'],
 'казань':['Казань','Россия'],'екатеринбург':['Екатеринбург','Россия'],'уфа':['Уфа','Россия'],
 'тюкалинск':['Тюкалинск','Россия'],'тюльган':['Тюльган','Россия'],
 'медина':['Медина','Саудовская Аравия'],'мекка':['Мекка','Саудовская Аравия'],
 'душанбе':['Душанбе','Таджикистан'],'худжанд':['Худжанд','Таджикистан'],
 'ташкент':['Ташкент','Узбекистан'],'алматы':['Алматы','Казахстан'],
 'дубай':['Дубай','ОАЭ'],'тюп':['Тюп','Кыргызстан']
};
const locationClean=value=>typeof value==='string'?value.trim().replace(/\s+/g,' ').slice(0,160):'';
const locationKey=value=>value.toLowerCase().replaceAll('ё','е');
export function canonicalAccountLocation(city,country=null){
 let name=locationClean(city),nation=locationClean(country);if(!name)return{city:null,country:null};
 nation=LOCATION_COUNTRIES[locationKey(nation)]||nation;
 const suffix=/^(.*),\s*([^,]+)$/.exec(name),end=suffix&&LOCATION_COUNTRIES[locationKey(suffix[2].trim())];
 if(end&&(!nation||nation===end)){name=suffix[1].trim();nation=nation||end;}
 const known=LOCATION_CITIES[locationKey(name)];if(known){name=known[0];nation=nation||known[1];}
 return{city:name||null,country:nation||null};
}
// END SHARED ACCOUNT LOCATION
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function validNotification(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['enabled','permission','browser','device','nativeUntil'].includes(k))||typeof value.enabled!=='boolean'||typeof value.browser!=='boolean'||!['granted','denied','default','unsupported'].includes(value.permission))return false;
 if(Object.hasOwn(value,'nativeUntil')&&value.nativeUntil!==null&&(!Number.isSafeInteger(value.nativeUntil)||value.nativeUntil<=Date.now()||value.nativeUntil-Date.now()>14*86400000||value.permission!=='granted'||!value.enabled||value.device!==null))return false;
 const device=value.device;
 return device===null||!!device&&typeof device==='object'&&!Array.isArray(device)&&Object.keys(device).length===2&&UUID.test(device.id||'')&&/^[a-f0-9]{64}$/.test(device.token||'');
}
export function validAccountContext(value,now=Date.now()){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['city','reading','country'].includes(k))||!Object.hasOwn(value,'city')||!Object.hasOwn(value,'reading'))return false;
 if(value.city!==null&&(typeof value.city!=='string'||!value.city.trim()||value.city.length>160||/[\u0000-\u001f\u007f]/.test(value.city)))return false;
 if(Object.hasOwn(value,'country')&&(value.city===null||typeof value.country!=='string'||!value.country.trim()||value.country.length>160||/[\u0000-\u001f\u007f]/.test(value.country)))return false;
 const v=value.reading;if(v===null)return true;
 if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).length!==3||!Number.isInteger(v.page)||v.page<1||v.page>604||!['madani','tajweed'].includes(v.edition)||typeof v.observedAt!=='string')return false;
 const time=Date.parse(v.observedAt);return Number.isFinite(time)&&time>=0&&time<=now+300000;
}
export async function recordAccountContext(tx,uid,value){
 value={...value,...canonicalAccountLocation(value.city,value.country)};
 await tx`insert into salah_counter_private.account_context(user_id,city,country,city_updated_at) values(${uid}::uuid,${value.city?.trim()||null},${value.country?.trim()||null},clock_timestamp()) on conflict(user_id) do update set city=excluded.city,country=case when account_context.city is not distinct from excluded.city then coalesce(excluded.country,account_context.country) else excluded.country end,city_updated_at=excluded.city_updated_at where account_context.city is distinct from excluded.city or (excluded.country is not null and account_context.country is distinct from excluded.country)`;
 const v=value.reading;if(v)await tx`update salah_counter_private.account_context set reading_page=${v.page},reading_edition=${v.edition},reading_observed_at=${new Date(v.observedAt).toISOString()}::timestamptz,reading_saved_at=clock_timestamp() where user_id=${uid}::uuid and (reading_observed_at is null or reading_observed_at<${new Date(v.observedAt).toISOString()}::timestamptz)`;
}
const ORIGINS=new Set(['https://skodytunez-maker.github.io','capacitor://localhost','http://localhost','https://localhost']);
const PROJECT='https://kbltwszfvphgbxdbczsb.supabase.co';
// This endpoint only records the verified caller's foreground presence.
// It never reads a user list, changes an account, or accepts a user ID.
export function createPresenceHandler({getUser,getClaims,isSessionActive,record}){return async req=>{
 const origin=req.headers.get('Origin'),headers={'Content-Type':'application/json','Cache-Control':'no-store, private','Vary':'Origin','X-Content-Type-Options':'nosniff'};
 if(ORIGINS.has(origin))Object.assign(headers,{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'});
 const reply=(status,value)=>new Response(JSON.stringify(value),{status,headers});
 if(origin&&!ORIGINS.has(origin))return reply(403,{error:'forbidden'});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return reply(405,{error:'method_not_allowed'});
 if(new URL(req.url).search)return reply(400,{error:'invalid_parameters'});
 if(!(req.headers.get('Content-Type')||'').startsWith('application/json'))return reply(415,{error:'json_required'});
 const authorization=req.headers.get('Authorization')||'';
 if(!/^Bearer [A-Za-z0-9._-]{16,8192}$/.test(authorization))return reply(401,{error:'sign_in_required'});
 let input;
 try{const raw=await req.text();if(new TextEncoder().encode(raw).length>2048)return reply(413,{error:'too_large'});input=JSON.parse(raw);}catch{return reply(400,{error:'invalid_presence'});}
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['p_app','p_tab','p_active','p_sequence','p_notifications','p_version','p_context'].includes(k))||Object.hasOwn(input,'p_context')&&!validAccountContext(input.p_context)||input.p_app!=='salah'||!UUID.test(input.p_tab||'')||typeof input.p_active!=='boolean'||!Number.isSafeInteger(input.p_sequence)||input.p_sequence<1||Object.hasOwn(input,'p_notifications')&&(!input.p_active||!validNotification(input.p_notifications))||Object.hasOwn(input,'p_version')&&(!input.p_active||!Number.isSafeInteger(input.p_version)||input.p_version<1||input.p_version>1000000))return reply(400,{error:'invalid_presence'});
 let user,claims;
 try{
  const result=await getUser(authorization.slice(7));if(result.error)return reply(401,{error:'invalid_session'});user=result.data?.user;
  const checked=await getClaims(authorization.slice(7));if(checked.error)return reply(401,{error:'invalid_session'});claims=checked.data?.claims;
 }catch{return reply(503,{error:'auth_unavailable'});}
 if(!user||!UUID.test(user.id)||user.is_anonymous||!user.email_confirmed_at||claims?.sub!==user.id||claims.iss!==PROJECT+'/auth/v1'||!UUID.test(claims.session_id||''))return reply(401,{error:'invalid_session'});
 try{if(!await isSessionActive(user.id,claims.session_id))return reply(401,{error:'invalid_session'});}catch{return reply(503,{error:'auth_unavailable'});}
 try{await record(user.id,input,claims.session_id);return reply(200,{ok:true});}catch{return reply(503,{error:'storage_unavailable'});}
};}
if(typeof Deno!=='undefined'){
 const {default:postgres}=await import('npm:postgres@3.4.9');const {createClient}=await import('npm:@supabase/supabase-js@2.117.2');
 const sql=postgres(Deno.env.get('SUPABASE_DB_URL'),{max:1,prepare:false,idle_timeout:20,connect_timeout:10});
 const auth=createClient(PROJECT,'sb_publishable_D2OGfXHyZCN_DQJpR9LTNg_mOD03jnR',{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 Deno.serve(createPresenceHandler({
  getUser:token=>auth.auth.getUser(token),getClaims:token=>auth.auth.getClaims(token),
  isSessionActive:async(uid,sid)=>{const [row]=await sql`select exists(select 1 from auth.sessions where id=${sid}::uuid and user_id=${uid}::uuid) as active`;return row.active===true;},
  record:async(uid,input,sid)=>{
   if(!input.p_active){await sql.begin(async tx=>{const changed=await tx`update public.app_presence set active=false,sequence=${input.p_sequence} where user_id=${uid}::uuid and app='salah' and tab_id=${input.p_tab}::uuid and sequence<${input.p_sequence} returning user_id`;if(changed.length&&input.p_context)await recordAccountContext(tx,uid,input.p_context);});return;}
   await sql.begin(async tx=>{
    const changed=await tx`insert into public.app_presence(user_id,app,tab_id,active,sequence,last_seen,app_version,version_checked_at) values(${uid}::uuid,'salah',${input.p_tab}::uuid,true,${input.p_sequence},clock_timestamp(),${input.p_version??null},case when ${input.p_version??null}::integer is not null then clock_timestamp() else null end) on conflict(user_id,app,tab_id) do update set active=excluded.active,sequence=excluded.sequence,last_seen=excluded.last_seen,app_version=coalesce(excluded.app_version,app_presence.app_version),version_checked_at=coalesce(excluded.version_checked_at,app_presence.version_checked_at) where excluded.sequence>app_presence.sequence returning user_id`;
    if(!changed.length)return;
    if(input.p_context)await recordAccountContext(tx,uid,input.p_context);
    if(!input.p_notifications)return;
    const n=input.p_notifications;let pushId=null;
    if(n.device&&n.permission==='granted'){
     const tokenHash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(n.device.token))),b=>b.toString(16).padStart(2,'0')).join('');
     const [device]=await tx`select id from salah_push_private.devices where id=${n.device.id}::uuid and token_hash=${tokenHash}`;pushId=device?.id||null;
    }
    await tx`insert into public.app_notification_status(user_id,tab_id,session_id,enabled,permission,browser_notifications,push_device_id,native_until,checked_at) values(${uid}::uuid,${input.p_tab}::uuid,${sid}::uuid,${n.enabled},${n.permission},${n.browser},${pushId}::uuid,${n.nativeUntil?new Date(n.nativeUntil).toISOString():null}::timestamptz,clock_timestamp()) on conflict(user_id,tab_id) do update set session_id=excluded.session_id,enabled=excluded.enabled,permission=excluded.permission,browser_notifications=excluded.browser_notifications,push_device_id=excluded.push_device_id,native_until=excluded.native_until,checked_at=excluded.checked_at`;
   });
  }
 }));
}

