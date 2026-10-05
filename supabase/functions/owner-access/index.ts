// Deploy only to the separate SALAH project. No service-role key is required.
// A valid session is checked against Auth on EVERY request before owner access.
const OWNER_ID='dc1eb1cc-6f8f-472f-a937-735fbfbba4b7';
const APP_ORIGIN='https://skodytunez-maker.github.io';
const PROJECT_URL='https://kbltwszfvphgbxdbczsb.supabase.co';
const PUBLISHABLE_KEY='sb_publishable_D2OGfXHyZCN_DQJpR9LTNg_mOD03jnR';
// Returned only after fresh identity, active session and MFA verification.
const OWNER_RELEASES={salah:[{date:'2026-10-06',version:'180',changes:['В карточках показаны версия SALAH и последнее успешное сохранение счёта.','Карточка закрывается повторным нажатием или свайпом влево.']},{date:'2026-10-05',version:'179',changes:['Добавлены отдельные карточки пользователей: посещения, регистрация и состояние напоминаний.']},{date:'2026-10-04',version:'158',changes:['Изменения кабинета убраны из общих уведомлений; личная история доступна здесь.']},{date:'2026-10-04',version:'157',changes:['У пользователей показаны настройки уведомлений о намазе и состояние фоновой доставки. Отсутствующие данные отмечаются отдельно.']},{date:'2026-10-04',version:'155',changes:['Обращения пользователей доступны внутри кабинета; переписка двух приложений разделена.']}],sahaba:[{date:'2026-10-04',version:'',changes:['Изменения кабинета убраны из общих уведомлений; личная история доступна здесь.','Поддержка подключена к отдельному защищённому списку обращений SAHABA.']}]};
const STATS_URL='https://salah-saadi.goatcounter.com/api/v0/stats/total';

export function createOwnerHandler({getUser,getClaims,statsToken='',fetcher=fetch,now=Date.now,readUsers=null,readProfiles=null,isSessionActive=null}){
 return async function handle(req){
  const origin=req.headers.get('Origin');
  const headers={'Cache-Control':'no-store, private','Pragma':'no-cache','Vary':'Origin','X-Content-Type-Options':'nosniff','Content-Type':'application/json'};
  if(origin===APP_ORIGIN)Object.assign(headers,{'Access-Control-Allow-Origin':APP_ORIGIN,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'GET, OPTIONS','Access-Control-Max-Age':'600'});
  const reply=(status,data)=>new Response(JSON.stringify(data),{status,headers});
  // CORS is supplementary. Requests without Origin still require a verified user.
  if(origin&&origin!==APP_ORIGIN)return reply(403,{error:'forbidden'});
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(req.method!=='GET')return reply(405,{error:'method_not_allowed'});
  const auth=req.headers.get('Authorization')||'';
  if(!/^Bearer [A-Za-z0-9._-]{16,8192}$/.test(auth))return reply(401,{error:'sign_in_required'});
  let user;
  try{const result=await getUser(auth.slice(7));if(result.error)return reply(401,{error:'invalid_session'});user=result.data?.user;}
  catch{return reply(503,{error:'auth_unavailable'});}
  // Never trust form email, user_metadata, query parameters or decoded JWTs.
  if(!user||user.id!==OWNER_ID||!user.email_confirmed_at||user.is_anonymous)return reply(403,{error:'owner_only'});
  const url=new URL(req.url);
  const mode=url.searchParams.get('mode')||'gate';
  if([...url.searchParams.keys()].some(key=>key!=='mode'&&key!=='days'&&key!=='page'&&key!=='ids'&&key!=='app'))return reply(400,{error:'invalid_parameters'});
  let claims;
  try{const checked=await getClaims(auth.slice(7));if(checked.error)return reply(401,{error:'invalid_session'});claims=checked.data?.claims;}
  catch{return reply(503,{error:'auth_unavailable'});}
  if(!claims||claims.sub!==OWNER_ID||claims.iss!==PROJECT_URL+'/auth/v1')return reply(401,{error:'invalid_session'});
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(claims.session_id||''))return reply(401,{error:'invalid_session'});
  try{if(!isSessionActive||!await isSessionActive(user.id,claims.session_id))return reply(401,{error:'invalid_session'});}catch{return reply(503,{error:'auth_unavailable'});}
  const secondFactor=claims.aal==='aal2'&&user.factors?.some(factor=>factor.status==='verified'&&factor.factor_type==='totp');
  if(!secondFactor)return mode==='gate'?reply(200,{owner:false,mfaRequired:true}):reply(403,{error:'mfa_required'});
  if(mode==='releases'){
   if(url.searchParams.has('ids')||url.searchParams.has('page')||url.searchParams.has('days'))return reply(400,{error:'invalid_parameters'});
   const app=url.searchParams.get('app')||'salah';if(!Object.hasOwn(OWNER_RELEASES,app))return reply(400,{error:'invalid_app'});
   return reply(200,{releases:OWNER_RELEASES[app]});
  }
  if(url.searchParams.has('app'))return reply(400,{error:'invalid_parameters'});
  if(mode==='gate'&&url.searchParams.has('ids'))return reply(400,{error:'invalid_parameters'});
  if(mode==='gate')return reply(200,{owner:true,statisticsConnected:Boolean(statsToken)});
  if(mode==='profiles'){
   if(url.searchParams.has('days')||url.searchParams.has('page'))return reply(400,{error:'invalid_parameters'});
   const ids=(url.searchParams.get('ids')||'').split(',');
   if(ids.length>50||new Set(ids).size!==ids.length||ids.some(id=>! /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)))return reply(400,{error:'invalid_ids'});
   if(!readProfiles)return reply(503,{error:'profiles_unavailable'});
   try{const rows=await readProfiles(ids);if(!Array.isArray(rows))throw Error('invalid');return reply(200,{profiles:rows.filter(row=>ids.includes(row.id)).slice(0,50).map(row=>({id:row.id,nickname:typeof row.nickname==='string'?row.nickname.replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,40):''}))});}catch{return reply(503,{error:'profiles_unavailable'});}
  }
  if(url.searchParams.has('ids'))return reply(400,{error:'invalid_parameters'});
  if(mode==='users'){
   if(url.searchParams.has('days'))return reply(400,{error:'invalid_parameters'});
   const page=Number(url.searchParams.get('page')||1);if(!Number.isSafeInteger(page)||page<1||page>10000)return reply(400,{error:'invalid_page'});
   if(!readUsers)return reply(503,{error:'users_not_connected'});
   try{const result=await readUsers(page);if(!Number.isSafeInteger(result.total)||result.total<0||!Array.isArray(result.users))throw Error('invalid');const date=v=>Number.isFinite(Date.parse(v))?new Date(v).toISOString():null;return reply(200,{total:result.total,online:Number.isSafeInteger(result.online)&&result.online>=0?result.online:0,page,users:result.users.slice(0,50).map(row=>({id:/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(row.id||'')?row.id:null,nickname:typeof row.nickname==='string'&&row.nickname.trim()?row.nickname.replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,40):'Без ника',joinedAt:date(row.joinedAt),lastSignInAt:date(row.lastSignInAt),lastSeenAt:date(row.lastSeenAt),appVersion:Number.isSafeInteger(row.appVersion)&&row.appVersion>=1&&row.appVersion<=1000000&&date(row.versionCheckedAt)?row.appVersion:null,versionCheckedAt:date(row.versionCheckedAt),lastSavedAt:date(row.lastSavedAt),notifications:date(row.notificationCheckedAt)?{enabled:row.notificationEnabled===true,background:row.notificationBackground===true,permissionGranted:row.notificationGranted===true,permissionDenied:row.notificationDenied===true,checkedAt:date(row.notificationCheckedAt)}:null,online:row.online===true&&Number.isFinite(Date.parse(row.lastSeenAt))&&Date.parse(row.lastSeenAt)>=now()-90000}))});}catch{return reply(503,{error:'users_unavailable'});}
  }
  if(url.searchParams.has('page'))return reply(400,{error:'invalid_parameters'});
  if(mode!=='stats')return reply(400,{error:'invalid_mode'});
  if(!statsToken)return reply(503,{error:'statistics_not_connected'});
  const days=Number(url.searchParams.get('days')||7);
  if(![1,7,30].includes(days))return reply(400,{error:'invalid_period'});
  // Fixed read-only upstream and bounded periods: never proxy a caller's URL.
  const end=new Date(Math.floor(now()/3600000)*3600000+3600000);
  const start=new Date(end.getTime()-days*86400000);
  const upstream=new URL(STATS_URL);upstream.searchParams.set('start',start.toISOString());upstream.searchParams.set('end',end.toISOString());
  try{
   const response=await fetcher(upstream,{method:'GET',headers:{Authorization:'Bearer '+statsToken,Accept:'application/json','Content-Type':'application/json'},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000)});
   if(!response.ok)return reply(502,{error:'statistics_unavailable'});
   const data=await response.json();
   if(!Number.isSafeInteger(data.total)||data.total<0||!Array.isArray(data.stats))return reply(502,{error:'invalid_statistics'});
   const stats=data.stats.filter(row=>/^\d{4}-\d{2}-\d{2}$/.test(row?.day)&&Number.isSafeInteger(row.daily)&&row.daily>=0).slice(0,32).map(row=>({day:row.day,visitors:row.daily}));
   // Statistics contains aggregates only. Never return tokens or upstream errors.
   return reply(200,{period:days,total:data.total,stats,updatedAt:new Date(now()).toISOString()});
  }catch{return reply(502,{error:'statistics_unavailable'});}
 };
}

if(typeof Deno!=='undefined'){
 const {createClient}=await import('npm:@supabase/supabase-js@2.117.2');
 const {default:postgres}=await import('npm:postgres@3.4.9');
 const sql=postgres(Deno.env.get('SUPABASE_DB_URL'),{max:1,prepare:false,idle_timeout:20,connect_timeout:10});
 const readUsers=async page=>sql.begin(async tx=>{
 const [count]=await tx`select count(*)::int as total from auth.users where email_confirmed_at is not null and coalesce(is_anonymous,false)=false`;
 const [presence]=await tx`select count(distinct p.user_id)::int as online from public.app_presence p join auth.users u on u.id=p.user_id where p.app='salah' and p.active and p.last_seen>=now()-interval '90 seconds' and u.email_confirmed_at is not null and coalesce(u.is_anonymous,false)=false`;
 const users=await tx`select u.id::text as id,u.raw_user_meta_data->>'nickname' as nickname,u.created_at as "joinedAt",u.last_sign_in_at as "lastSignInAt",p.last_seen as "lastSeenAt",coalesce(p.online,false) as online,v.app_version as "appVersion",v.version_checked_at as "versionCheckedAt",c.saved_at as "lastSavedAt",n.checked_at as "notificationCheckedAt",n.enabled as "notificationEnabled",n.granted as "notificationGranted",n.denied as "notificationDenied",n.background as "notificationBackground" from auth.users u left join lateral(select max(last_seen) as last_seen,bool_or(active and last_seen>=now()-interval '90 seconds') as online from public.app_presence where user_id=u.id and app='salah') p on true left join lateral(select app_version,version_checked_at from public.app_presence where user_id=u.id and app='salah' and app_version is not null and version_checked_at is not null order by version_checked_at desc,tab_id limit 1) v on true left join lateral(select max(saved_at) as saved_at from salah_counter_private.components where user_id=u.id) c on true left join lateral(
 select max(n.checked_at) as checked_at,bool_or(n.enabled) as enabled,bool_or(n.enabled and n.permission='granted') as granted,bool_or(n.enabled) and bool_and(not n.enabled or n.permission='denied') as denied,
 bool_or(n.enabled and n.permission='granted' and coalesce(d.enabled,false) and d.subscription is not null and d.preferences is not null and d.updated_at>now()-interval '90 days' and d.preferences->'reminders'->>'enabled'='true' and exists(select 1 from jsonb_each(coalesce(d.preferences->'reminders'->'prayers','{}'::jsonb)) r where r.key in('Fajr','Dhuhr','Asr','Maghrib','Isha') and (r.value->>'atTime'='true' or r.value->>'beforeMinutes' in('5','10','15','30')))) as background
 from(select distinct on(s.session_id) s.* from public.app_notification_status s join auth.sessions a on a.id=s.session_id and a.user_id=s.user_id where s.user_id=u.id and s.checked_at>now()-interval '90 days' order by s.session_id,s.checked_at desc,s.tab_id) n
 left join salah_push_private.devices d on d.id=n.push_device_id
 ) n on true where u.email_confirmed_at is not null and coalesce(u.is_anonymous,false)=false order by coalesce(p.online,false) desc,p.last_seen desc nulls last,u.id limit 50 offset ${(page-1)*50}`;
 return{total:count.total,online:presence.online,users};
 });
 const readProfiles=async ids=>sql`select id::text as id,raw_user_meta_data->>'nickname' as nickname from auth.users where id=any(${ids}::uuid[]) and email_confirmed_at is not null and coalesce(is_anonymous,false)=false`;
 const client=createClient(PROJECT_URL,PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 // Accept the already saved legacy name while preferring the canonical name.
 Deno.serve(createOwnerHandler({getUser:token=>client.auth.getUser(token),getClaims:token=>client.auth.getClaims(token),readUsers,readProfiles,isSessionActive:async(uid,sid)=>{const [row]=await sql`select exists(select 1 from auth.sessions where id=${sid}::uuid and user_id=${uid}::uuid) as active`;return row.active===true;},statsToken:Deno.env.get('GOATCOUNTER_READ_TOKEN')||Deno.env.get('GOATCOUNTER_READ_TOKEN.')||''}));
}
