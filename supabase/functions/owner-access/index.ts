// A title belongs to one winner of the latest finalized period, never to all
// historical winners. Existing award records remain immutable history.
export async function currentTitleHolders(sql){
 const rows=await sql`with recent as(select kind,max(ends_on)ends_on from salah_competition_private.award_periods where kind in('week','month') group by kind)
 select distinct on(a.kind) a.kind,a.user_id from salah_competition_private.awards a join recent r on r.kind=a.kind and r.ends_on=a.ends_on
 order by a.kind,a.seconds desc,a.earned_at,a.user_id,a.id`;
 const result={week:null,month:null};for(const row of rows)if(Object.hasOwn(result,row.kind))result[row.kind]=row.user_id;return result;
}

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
export function validGeoSelection(kind,city,country){
 const clean=v=>typeof v==='string'&&v.trim()&&v.length<=160&&!/[\u0000-\u001f\u007f]/.test(v);
 if(kind==='country')return clean(country)&&!city?{kind,city:null,country:canonicalAccountLocation('?',country).country}:null;
 if(kind!=='city'||!clean(city)||country!==null&&country!==''&&!clean(country))return null;
 const resolved=canonicalAccountLocation(city,country);return{kind,...resolved};
}
export async function readOwnerGeoMembers(sql,days,selection,page=1){
 if(![1,7,30].includes(days)||!Number.isSafeInteger(page)||page<1||page>10000||!selection||!validGeoSelection(selection.kind,selection.city,selection.country))throw Error('invalid_filter');
 const [group]=await sql`with eligible as(
 select u.id,max(p.last_seen) as last_seen,bool_or(p.active and p.last_seen>=clock_timestamp()-interval '90 seconds') as online
 from auth.users u join salah_counter_private.account_context c on c.user_id=u.id
 cross join lateral salah_counter_private.canonical_location(c.city,c.country) n
 join public.app_presence p on p.user_id=u.id and p.app='salah' and p.last_seen>=clock_timestamp()-(${days}::int*interval '1 day') and p.last_seen<=clock_timestamp()
 where u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false)
 and ((${selection.kind}='country' and n.country=${selection.country}) or (${selection.kind}='city' and n.city=${selection.city} and n.country is not distinct from ${selection.country}))
 group by u.id)
 select count(*)::int as total,(select array_agg(id) from(select id from eligible order by online desc,last_seen desc nulls last,id limit 50 offset ${(page-1)*50}) members) as ids from eligible`;
 const ids=group.ids||[];if(!ids.length)return{total:group.total,online:0,users:[]};
 const users=await sql`select u.id::text as id,u.raw_user_meta_data->>'nickname' as nickname,u.created_at as "joinedAt",u.last_sign_in_at as "lastSignInAt",p.last_seen as "lastSeenAt",coalesce(p.online,false) as online,v.app_version as "appVersion",v.version_checked_at as "versionCheckedAt",c.saved_at as "lastSavedAt",n.checked_at as "notificationCheckedAt",n.enabled as "notificationEnabled",n.granted as "notificationGranted",n.denied as "notificationDenied",n.background as "notificationBackground" from auth.users u left join lateral(select max(last_seen) as last_seen,bool_or(active and last_seen>=now()-interval '90 seconds') as online from public.app_presence where user_id=u.id and app='salah') p on true left join lateral(select app_version,version_checked_at from public.app_presence where user_id=u.id and app='salah' and app_version is not null and version_checked_at is not null order by version_checked_at desc,tab_id limit 1) v on true left join lateral(select max(saved_at) as saved_at from salah_counter_private.components where user_id=u.id) c on true left join lateral(
 select max(n.checked_at) as checked_at,bool_or(n.enabled) as enabled,bool_or(n.enabled and n.permission='granted') as granted,bool_or(n.enabled) and bool_and(not n.enabled or n.permission='denied') as denied,
 bool_or(n.enabled and n.permission='granted' and ((n.native_until>now() and n.native_until<=n.checked_at+interval '14 days') or (coalesce(d.enabled,false) and d.subscription is not null and d.preferences is not null and d.updated_at>now()-interval '90 days' and d.preferences->'reminders'->>'enabled'='true' and exists(select 1 from jsonb_each(coalesce(d.preferences->'reminders'->'prayers','{}'::jsonb)) r where r.key in('Fajr','Dhuhr','Asr','Maghrib','Isha') and (r.value->>'atTime'='true' or r.value->>'beforeMinutes' in('5','10','15','30')))))) as background
 from(select distinct on(s.session_id) s.* from public.app_notification_status s join auth.sessions a on a.id=s.session_id and a.user_id=s.user_id where s.user_id=u.id and s.checked_at>now()-interval '90 days' order by s.session_id,s.checked_at desc,s.tab_id) n
 left join salah_push_private.devices d on d.id=n.push_device_id
 ) n on true where u.id=any(${ids}::uuid[]) and u.email_confirmed_at is not null and coalesce(u.is_anonymous,false)=false order by coalesce(p.online,false) desc,p.last_seen desc nulls last,u.id`;
 return{total:group.total,online:users.filter(row=>row.online).length,users};
}
export function safeOwnerUsers(result,page,now=Date.now){
 if(!Number.isSafeInteger(result.total)||result.total<0||!Array.isArray(result.users))throw Error('invalid');const date=v=>Number.isFinite(Date.parse(v))?new Date(v).toISOString():null;return{total:result.total,online:Number.isSafeInteger(result.online)&&result.online>=0?result.online:0,page,users:result.users.slice(0,50).map(row=>({id:/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(row.id||'')?row.id:null,nickname:typeof row.nickname==='string'&&row.nickname.trim()?row.nickname.replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,40):'Без ника',joinedAt:date(row.joinedAt),lastSignInAt:date(row.lastSignInAt),lastSeenAt:date(row.lastSeenAt),appVersion:Number.isSafeInteger(row.appVersion)&&row.appVersion>=1&&row.appVersion<=1000000&&date(row.versionCheckedAt)?row.appVersion:null,versionCheckedAt:date(row.versionCheckedAt),lastSavedAt:date(row.lastSavedAt),notifications:date(row.notificationCheckedAt)?{enabled:row.notificationEnabled===true,background:row.notificationBackground===true,permissionGranted:row.notificationGranted===true,permissionDenied:row.notificationDenied===true,checkedAt:date(row.notificationCheckedAt)}:null,online:row.online===true&&Number.isFinite(Date.parse(row.lastSeenAt))&&Date.parse(row.lastSeenAt)>=now()-90000}))};
}


// Deploy only to the separate SALAH project. Storage credentials stay server-side.
// A valid session is checked against Auth on EVERY request before owner access.
const OWNER_ID='dc1eb1cc-6f8f-472f-a937-735fbfbba4b7';
const APP_ORIGINS=new Set(['https://skodytunez-maker.github.io','capacitor://localhost','http://localhost','https://localhost']);
const PROJECT_URL='https://kbltwszfvphgbxdbczsb.supabase.co';
const PUBLISHABLE_KEY='sb_publishable_D2OGfXHyZCN_DQJpR9LTNg_mOD03jnR';
// Returned only after fresh identity, active session and MFA verification.
const OWNER_RELEASES={salah:[{date:'2026-10-16',version:'339',changes:['Профили пользователей открываются из списка: фото, сохранённое время прослушивания, любимые чтецы и полученные награды.','Доступ к профилям и фото проверяется на сервере при каждом запросе: только владелец с действующей сессией и вторым фактором.']},{date:'2026-10-06',version:'180',changes:['В карточках показаны версия SALAH и последнее успешное сохранение счёта.','Карточка закрывается повторным нажатием или свайпом влево.']},{date:'2026-10-05',version:'179',changes:['Добавлены отдельные карточки пользователей: посещения, регистрация и состояние напоминаний.']},{date:'2026-10-04',version:'158',changes:['Изменения кабинета убраны из общих уведомлений; личная история доступна здесь.']},{date:'2026-10-04',version:'157',changes:['У пользователей показаны настройки уведомлений о намазе и состояние фоновой доставки. Отсутствующие данные отмечаются отдельно.']},{date:'2026-10-04',version:'155',changes:['Обращения пользователей доступны внутри кабинета; переписка двух приложений разделена.']}],sahaba:[{date:'2026-10-04',version:'',changes:['Изменения кабинета убраны из общих уведомлений; личная история доступна здесь.','Поддержка подключена к отдельному защищённому списку обращений SAHABA.']}]};
const STATS_URL='https://salah-saadi.goatcounter.com/api/v0/stats/total';

export function createOwnerHandler({getUser,getClaims,statsToken='',fetcher=fetch,now=Date.now,readUsers=null,readProfiles=null,readUser=null,readRankUser=null,readAvatar=null,readGeography=null,readGeoMembers=null,readVisitors=null,isSessionActive=null}){
 return async function handle(req){
  const origin=req.headers.get('Origin');
  const headers={'Cache-Control':'no-store, private','Pragma':'no-cache','Vary':'Origin','X-Content-Type-Options':'nosniff','Content-Type':'application/json'};
  if(APP_ORIGINS.has(origin))Object.assign(headers,{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'GET, OPTIONS','Access-Control-Max-Age':'600'});
  const reply=(status,data)=>new Response(JSON.stringify(data),{status,headers});
  // CORS is supplementary. Requests without Origin still require a verified user.
  if(origin&&!APP_ORIGINS.has(origin))return reply(403,{error:'forbidden'});
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
  if([...url.searchParams.keys()].some(key=>key!=='mode'&&key!=='days'&&key!=='page'&&key!=='ids'&&key!=='app'&&key!=='activityDay'&&key!=='kind'&&key!=='city'&&key!=='country'))return reply(400,{error:'invalid_parameters'});
  if(['kind','city','country'].some(k=>url.searchParams.has(k))&&mode!=='geography-users')return reply(400,{error:'invalid_parameters'});
  if(url.searchParams.has('activityDay')&&mode!=='user')return reply(400,{error:'invalid_parameters'});
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
  if(mode==='rank-user'){
   const id=url.searchParams.get('ids')||'';
   if(url.searchParams.size!==2||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))return reply(400,{error:'invalid_parameters'});
   if(!readRankUser)return reply(503,{error:'user_unavailable'});
   try{
    const row=await readRankUser(id.toLowerCase());
    if(!row)return reply(404,{error:'not_found'});
    const [user]=safeOwnerUsers({total:1,online:row.online===true?1:0,users:[row]},1,now).users;
    return reply(200,{user});
   }catch{return reply(503,{error:'user_unavailable'});}
  }
  if(mode==='user'||mode==='user-avatar'){
   const id=url.searchParams.get('ids')||'';
   if(url.searchParams.has('days')||url.searchParams.has('page')||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))return reply(400,{error:'invalid_parameters'});
   if(!readUser)return reply(503,{error:'user_unavailable'});
   try{
    const activityDay=url.searchParams.get('activityDay');if(activityDay!==null&&!validOwnerActivityDay(activityDay,now()))return reply(400,{error:'invalid_parameters'});
    const details=await readUser(id.toLowerCase(),activityDay);if(!details)return reply(404,{error:'not_found'});
    if(mode==='user-avatar'){
     if(!details.hasAvatar||!readAvatar)return reply(404,{error:'not_found'});
     const bytes=await readAvatar(id.toLowerCase());
     if(!(bytes instanceof Uint8Array)||bytes.length<3||bytes.length>200000||bytes[0]!==255||bytes[1]!==216||bytes[2]!==255)return reply(404,{error:'not_found'});
     return new Response(bytes,{status:200,headers:{...headers,'Content-Type':'image/jpeg','Content-Disposition':'inline'}});
    }
    return reply(200,safeOwnerUserDetails(details,id.toLowerCase()));
   }catch{return reply(503,{error:'user_unavailable'});}
  }
  if(url.searchParams.has('ids'))return reply(400,{error:'invalid_parameters'});
  if(mode==='geography-users'){
   if([...url.searchParams].some(([k])=>url.searchParams.getAll(k).length!==1))return reply(400,{error:'invalid_parameters'});
   const days=Number(url.searchParams.get('days')||7),page=Number(url.searchParams.get('page')||1);
   const selection=validGeoSelection(url.searchParams.get('kind'),url.searchParams.get('city'),url.searchParams.get('country'));
   if(![1,7,30].includes(days)||!Number.isSafeInteger(page)||page<1||page>10000||!selection)return reply(400,{error:'invalid_filter'});
   if(!readGeoMembers)return reply(503,{error:'geography_unavailable'});
   try{return reply(200,{...safeOwnerUsers(await readGeoMembers(days,selection,page),page,now),period:days,selection});}catch{return reply(503,{error:'geography_unavailable'});}
  }
  if(mode==='users'){
   if(url.searchParams.has('days'))return reply(400,{error:'invalid_parameters'});
   const page=Number(url.searchParams.get('page')||1);if(!Number.isSafeInteger(page)||page<1||page>10000)return reply(400,{error:'invalid_page'});
   if(!readUsers)return reply(503,{error:'users_not_connected'});
   try{const result=await readUsers(page);return reply(200,safeOwnerUsers(result,page,now));}catch{return reply(503,{error:'users_unavailable'});}
  }
  if(url.searchParams.has('page'))return reply(400,{error:'invalid_parameters'});
  if(mode==='visitors'){
   const days=Number(url.searchParams.get('days')||7);if(![1,7,30].includes(days))return reply(400,{error:'invalid_period'});
   if(!readVisitors)return reply(503,{error:'visitors_unavailable'});
   try{const counts=await readVisitors(days);if(!Number.isSafeInteger(counts.guests)||counts.guests<0||!Number.isSafeInteger(counts.accounts)||counts.accounts<0||!Number.isFinite(Date.parse(counts.startedAt)))throw Error('invalid_counts');return reply(200,{days,guests:counts.guests,accounts:counts.accounts,startedAt:new Date(counts.startedAt).toISOString(),updatedAt:new Date(now()).toISOString()});}catch{return reply(503,{error:'visitors_unavailable'});}
  }
  if(mode==='geography'){
   const days=Number(url.searchParams.get('days')||7);if(![1,7,30].includes(days))return reply(400,{error:'invalid_period'});
   if(!readGeography)return reply(503,{error:'geography_unavailable'});
   try{return reply(200,summarizeOwnerGeography(await readGeography(days),days,now()));}catch{return reply(503,{error:'geography_unavailable'});}
  }
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

export function validOwnerActivityDay(day,now=Date.now()){
 if(typeof day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(day))return false;
 const epoch=Date.parse(day+'T00:00:00Z');return Number.isFinite(epoch)&&new Date(epoch).toISOString().slice(0,10)===day&&Math.abs(Math.floor(epoch/86400000)-Math.floor(now/86400000))<=1;
}

// Latest selected prayer cities of verified accounts active in the rolling
// period. Never infer residence from an IP, and never expose account IDs here.
export function summarizeOwnerGeography(rows,days,now=Date.now()){
 if(![1,7,30].includes(days)||!Array.isArray(rows))throw Error('invalid_geography');
 const clean=value=>typeof value==='string'&&value.trim()&&value.length<=160&&!/[\u0000-\u001f\u007f]/.test(value)?value.trim():null;
 const countries=new Map(),cities=new Map();let total=0,withCity=0,withCountry=0;
 for(const row of rows){
  const n=row?.accounts;if(!Number.isSafeInteger(n)||n<1||!Number.isSafeInteger(total+n))throw Error('invalid_geography');total+=n;
  const {city,country}=canonicalAccountLocation(clean(row.city),clean(row.country));if(!city)continue;withCity+=n;
  const key=JSON.stringify([city,country]),previous=cities.get(key);cities.set(key,{name:city,country,accounts:n+(previous?.accounts||0)});
  if(country){withCountry+=n;countries.set(country,(countries.get(country)||0)+n);}
 }
 const order=(a,b)=>b.accounts-a.accounts||a.name.localeCompare(b.name,'ru')||String(a.country||'').localeCompare(String(b.country||''),'ru');
 const countryRows=[...countries].map(([name,accounts])=>({name,accounts})).sort(order),cityRows=[...cities.values()].sort(order);
 return{period:days,total,withCity,withCountry,countries:countryRows.slice(0,100),cities:cityRows.slice(0,100),otherCountries:countryRows.slice(100).reduce((n,r)=>n+r.accounts,0),otherCities:cityRows.slice(100).reduce((n,r)=>n+r.accounts,0),updatedAt:new Date(now).toISOString()};
}
export async function readOwnerVisitors(sql,days){
 if(![1,7,30].includes(days))throw Error('invalid_period');
 const [row]=await sql`select (select started_at from salah_visits_private.tracking where singleton) as "startedAt", (select count(distinct device_hash)::int from salah_visits_private.guest_days where last_seen>=clock_timestamp()-(${days}::integer*interval '1 day') and last_seen<=clock_timestamp()) as guests,
 (select count(distinct p.user_id)::int from public.app_presence p join auth.users u on u.id=p.user_id where p.app='salah' and p.last_seen>=clock_timestamp()-(${days}::integer*interval '1 day') and p.last_seen<=clock_timestamp() and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false)) as accounts`;
 return row;
}
export async function readOwnerGeography(sql,days){
 if(![1,7,30].includes(days))throw Error('invalid_period');
 return sql`select c.city,c.country,count(*)::int as accounts from auth.users u
 left join salah_counter_private.account_context c on c.user_id=u.id
 where u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false)
 and exists(select 1 from public.app_presence p where p.user_id=u.id and p.app='salah' and p.last_seen>=clock_timestamp()-(${days}::integer*interval '1 day') and p.last_seen<=clock_timestamp())
 group by c.city,c.country`;
}
export function safeOwnerUserDetails(details,id){
 const seconds=n=>(typeof n==='number'||typeof n==='string'&&/^\d+$/.test(n))&&Number.isSafeInteger(Number(n))&&Number(n)>=0?Number(n):null;
 const date=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
 const wins=row=>['week','month'].includes(row.kind)?(Array.isArray(row.wins)?row.wins:[]).slice(0,200).filter(win=>date(win.start)&&date(win.end)&&win.start<win.end&&seconds(win.seconds)>0).map(win=>({start:win.start,end:win.end,seconds:seconds(win.seconds)})):[];
 const kinds=new Set(['founder','week','month','streak7','streak30','streak100','streak200','streak365','hours25','hours50','hours100','hours250','hours500','hours1000','hours5000','reading1','reading10','khatm','adhkar7','adhkar30']);
 const periods={};for(const period of ['all','day','week','month'])periods[period]=details.connected===true?seconds(details.periods?.[period]):null;
 const context=details.context,city=typeof context?.city==='string'&&context.city.trim()?context.city.replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,160):null;const v=context?.reading,reading=v&&Number.isInteger(v.page)&&v.page>=1&&v.page<=604&&['madani','tajweed'].includes(v.edition)&&Number.isFinite(Date.parse(v.savedAt))?{page:v.page,edition:v.edition,savedAt:new Date(v.savedAt).toISOString()}:null;
 const resolvedLocation=canonicalAccountLocation(city,context?.country);const country=resolvedLocation.country;
 return{id,context:{city:resolvedLocation.city,reading,...(country?{country}:{})},hasAvatar:details.hasAvatar===true,connected:details.connected===true,periods,adhkar:details.adhkar&&/^\d{4}-\d{2}-\d{2}$/.test(details.adhkar.day)&&typeof details.adhkar.active==='boolean'?{day:details.adhkar.day,active:details.adhkar.active}:null,
  reciters:(Array.isArray(details.reciters)?details.reciters:[]).filter(row=>typeof row.id==='string'&&/^ar\.[a-z0-9_-]{1,80}$/.test(row.id)&&seconds(row.seconds)>0).slice(0,5).map(row=>({id:row.id,seconds:seconds(row.seconds)})),
  awards:(Array.isArray(details.awards)?details.awards:[]).filter(row=>kinds.has(row.kind)&&Number.isSafeInteger(Number(row.count))&&Number(row.count)>0).slice(0,20).map(row=>({kind:row.kind,count:Number(row.count),earnedAt:Number.isFinite(Date.parse(row.earnedAt))?new Date(row.earnedAt).toISOString():null,...(['week','month'].includes(row.kind)?{wins:wins(row)}:{})})),
  updatedAt:Number.isFinite(Date.parse(details.updatedAt))?new Date(details.updatedAt).toISOString():null};
}

export async function readOwnerUserDetails(sql,id,activityDay=null){
 return sql.begin(async tx=>{
  await tx`set transaction read only`;
  const [user]=await tx`select exists(select 1 from storage.objects o where o.bucket_id='profile-avatars' and o.name=u.id::text||'/profile.jpg') as "hasAvatar",exists(select 1 from salah_competition_private.preferences p where p.user_id=u.id) as connected,(now()at time zone 'Europe/Moscow')::date::text as day from auth.users u where u.id=${id}::uuid and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false)`;
  if(!user)return null;
  const scores=await tx`select periods.period,s.reciter,s.seconds::text from(values('all'),('day'),('week'),('month')) periods(period) cross join lateral public.competition_scores(periods.period,${user.day}::date) s where s.user_id=${id}::uuid`;
  const periods={all:0,day:0,week:0,month:0};for(const row of scores){const value=Number(row.seconds);if(!Object.hasOwn(periods,row.period)||!Number.isSafeInteger(value)||value<0||!Number.isSafeInteger(periods[row.period]+value))throw Error('invalid_score');periods[row.period]+=value;}
  const reciters=scores.filter(row=>row.period==='all').map(row=>({id:row.reciter,seconds:Number(row.seconds)})).sort((a,b)=>b.seconds-a.seconds||a.id.localeCompare(b.id)).slice(0,5);
  const awards=await tx`select kind,count(*)::int as count,max(earned_at) as "earnedAt" from salah_competition_private.awards where user_id=${id}::uuid group by kind order by max(earned_at) desc,kind limit 20`;
  const wins=await tx`select kind,starts_on::text as "start",ends_on::text as "end",seconds::text as seconds from salah_competition_private.awards where user_id=${id}::uuid and kind in('week','month') order by ends_on desc,earned_at desc,id limit 200`;
  const earnedAwards=awards.map(row=>({...row,...(['week','month'].includes(row.kind)?{wins:wins.filter(win=>win.kind===row.kind).map(({start,end,seconds})=>({start,end,seconds}))}:{})}));
  const [saved]=await tx`select max(updated_at) as "updatedAt" from salah_competition_private.totals where user_id=${id}::uuid`;
  const targetDay=activityDay||user.day;const [activity]=await tx`select exists(select 1 from salah_counter_private.activity_days where user_id=${id}::uuid and day=${targetDay}::date) as active`;
  const [context]=await tx`select city,country,reading_page as page,reading_edition as edition,reading_saved_at as "savedAt" from salah_counter_private.account_context where user_id=${id}::uuid`;
  return{context:{city:context?.city||null,country:context?.country||null,reading:context?.page?{page:context.page,edition:context.edition,savedAt:context.savedAt}:null},adhkar:{day:targetDay,active:activity?.active===true},hasAvatar:user.hasAvatar,connected:user.connected||scores.length>0,periods,reciters,awards:earnedAwards,updatedAt:saved?.updatedAt||null};
 });
}

export function readOwnerUserSummaries(sql,page,listenerId=null){
 return sql`select u.id::text as id,u.raw_user_meta_data->>'nickname' as nickname,u.created_at as "joinedAt",u.last_sign_in_at as "lastSignInAt",p.last_seen as "lastSeenAt",coalesce(p.online,false) as online,v.app_version as "appVersion",v.version_checked_at as "versionCheckedAt",c.saved_at as "lastSavedAt",n.checked_at as "notificationCheckedAt",n.enabled as "notificationEnabled",n.granted as "notificationGranted",n.denied as "notificationDenied",n.background as "notificationBackground" from auth.users u left join lateral(select max(last_seen) as last_seen,bool_or(active and last_seen>=now()-interval '90 seconds') as online from public.app_presence where user_id=u.id and app='salah') p on true left join lateral(select app_version,version_checked_at from public.app_presence where user_id=u.id and app='salah' and app_version is not null and version_checked_at is not null order by version_checked_at desc,tab_id limit 1) v on true left join lateral(select max(saved_at) as saved_at from salah_counter_private.components where user_id=u.id) c on true left join lateral(
 select max(n.checked_at) as checked_at,bool_or(n.enabled) as enabled,bool_or(n.enabled and n.permission='granted') as granted,bool_or(n.enabled) and bool_and(not n.enabled or n.permission='denied') as denied,
 bool_or(n.enabled and n.permission='granted' and ((n.native_until>now() and n.native_until<=n.checked_at+interval '14 days') or (coalesce(d.enabled,false) and d.subscription is not null and d.preferences is not null and d.updated_at>now()-interval '90 days' and d.preferences->'reminders'->>'enabled'='true' and exists(select 1 from jsonb_each(coalesce(d.preferences->'reminders'->'prayers','{}'::jsonb)) r where r.key in('Fajr','Dhuhr','Asr','Maghrib','Isha') and (r.value->>'atTime'='true' or r.value->>'beforeMinutes' in('5','10','15','30')))))) as background
 from(select distinct on(s.session_id) s.* from public.app_notification_status s join auth.sessions a on a.id=s.session_id and a.user_id=s.user_id where s.user_id=u.id and s.checked_at>now()-interval '90 days' order by s.session_id,s.checked_at desc,s.tab_id) n
 left join salah_push_private.devices d on d.id=n.push_device_id
 ) n on true where u.email_confirmed_at is not null and coalesce(u.is_anonymous,false)=false
 and (${listenerId}::uuid is null or u.id=(select l.user_id from public.reciter_listener_visibility l join salah_competition_private.preferences pref on pref.user_id=l.user_id and pref.enabled where l.public_id=${listenerId}::uuid and l.mode='profile'))
 order by coalesce(p.online,false) desc,p.last_seen desc nulls last,u.id limit 50 offset ${(page-1)*50}`;
}

if(typeof Deno!=='undefined'){
 const {createClient}=await import('npm:@supabase/supabase-js@2.117.2');
 const {default:postgres}=await import('npm:postgres@3.4.9');
 const sql=postgres(Deno.env.get('SUPABASE_DB_URL'),{max:1,prepare:false,idle_timeout:20,connect_timeout:10});
 const readUsers=async page=>sql.begin(async tx=>{
 const [count]=await tx`select count(*)::int as total from auth.users where email_confirmed_at is not null and coalesce(is_anonymous,false)=false`;
 const [presence]=await tx`select count(distinct p.user_id)::int as online from public.app_presence p join auth.users u on u.id=p.user_id where p.app='salah' and p.active and p.last_seen>=now()-interval '90 seconds' and u.email_confirmed_at is not null and coalesce(u.is_anonymous,false)=false`;
 const users=await readOwnerUserSummaries(tx,page);
 return{total:count.total,online:presence.online,users};
 });
 const readProfiles=async ids=>sql`select id::text as id,raw_user_meta_data->>'nickname' as nickname from auth.users where id=any(${ids}::uuid[]) and email_confirmed_at is not null and coalesce(is_anonymous,false)=false`;
 const client=createClient(PROJECT_URL,PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 // Accept the already saved legacy name while preferring the canonical name.
 const readAvatar=async id=>{const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(!key)return null;const response=await fetch(PROJECT_URL+'/storage/v1/object/authenticated/profile-avatars/'+id+'/profile.jpg',{headers:{apikey:key,Authorization:'Bearer '+key},redirect:'error',signal:AbortSignal.timeout(10000)});if(!response.ok||Number(response.headers.get('content-length'))>200000)return null;const reader=response.body?.getReader();if(!reader)return null;const parts=[];let size=0;try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>200000){await reader.cancel();return null;}parts.push(value);}}finally{reader.releaseLock();}const bytes=new Uint8Array(size);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length;}return bytes;};
 Deno.serve(createOwnerHandler({getUser:token=>client.auth.getUser(token),getClaims:token=>client.auth.getClaims(token),readUsers,readProfiles,readRankUser:async id=>(await readOwnerUserSummaries(sql,1,id))[0]||null,readGeoMembers:(days,selection,page)=>readOwnerGeoMembers(sql,days,selection,page),readVisitors:days=>readOwnerVisitors(sql,days),readGeography:days=>readOwnerGeography(sql,days),readUser:(id,day)=>readOwnerUserDetails(sql,id,day),readAvatar,isSessionActive:async(uid,sid)=>{const [row]=await sql`select exists(select 1 from auth.sessions where id=${sid}::uuid and user_id=${uid}::uuid) as active`;return row.active===true;},statsToken:Deno.env.get('GOATCOUNTER_READ_TOKEN')||Deno.env.get('GOATCOUNTER_READ_TOKEN.')||''}));
}
