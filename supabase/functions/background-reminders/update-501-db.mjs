import{returnAllowedAt}from '../../../dist/js/owner-return-core.js';
import{UPDATE_501_VERSION,UPDATE_501_UNTIL,UPDATE_501_RECEIPTS_UNTIL}from './update-501.mjs';
const UPDATE_501_CACHE='update-501:campaign';
const UPDATE_501_JOB='update-501:user:';
const update501Iso=value=>new Date(value).toISOString();
// These are diagnostic, client-reported versions, never an authority grant.
// Any fresh 501+ report excludes the whole account conservatively because old
// app_presence reports do not identify a particular push installation.
export async function update501Audience(sql,now,user=null){
 const at=update501Iso(now);
 return sql`with versions as(
  select distinct on(p.user_id)p.user_id,p.app_version,p.version_checked_at
  from public.app_presence p where p.app='salah' and p.app_version between 1 and 500
  and p.version_checked_at>${at}::timestamptz-interval '90 days' and p.version_checked_at<=${at}::timestamptz
  and (${user}::uuid is null or p.user_id=${user}::uuid)
  and not exists(select 1 from public.app_presence newer where newer.user_id=p.user_id and newer.app='salah' and newer.app_version>=501 and newer.version_checked_at>${at}::timestamptz-interval '90 days')
  and not exists(select 1 from salah_visits_private.app_state_presence newer where newer.user_id=p.user_id and newer.app_version>=501 and newer.reported_at>${at}::timestamptz-interval '90 days')
  order by p.user_id,p.version_checked_at desc
 ),people as(
  select v.* from versions v join auth.users u on u.id=v.user_id
  where u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false) and (u.banned_until is null or u.banned_until<=${at}::timestamptz)
 ),channels as(
  select p.user_id as "user",d.id device,'web'::text channel,p.app_version version,d.preferences->'city'->>'timezone' as "timeZone",d.preferences->>'language' language,
   greatest(n.checked_at,d.updated_at) updated,d.subscription,null::text as "nativeToken"
  from people p join public.app_notification_status n on n.user_id=p.user_id and n.permission='granted'
  join auth.sessions s on s.id=n.session_id and s.user_id=n.user_id
  join salah_push_private.devices d on d.id=n.push_device_id
  where d.enabled and d.subscription is not null and d.preferences->'reminders'->>'enabled'='true'
  and d.updated_at>${at}::timestamptz-interval '90 days' and d.updated_at<=${at}::timestamptz
  and n.checked_at>${at}::timestamptz-interval '90 days' and n.checked_at<=${at}::timestamptz
  and (s.not_after is null or s.not_after>${at}::timestamptz)
  and not exists(select 1 from public.app_notification_status newer where newer.push_device_id=d.id and newer.user_id<>p.user_id and newer.checked_at>=n.checked_at)
  and not exists(select 1 from public.app_notification_status newer where newer.push_device_id=d.id and newer.checked_at>=n.checked_at and newer.permission<>'granted')
  and not exists(select 1 from public.app_notification_status newer where newer.user_id=p.user_id and newer.session_id=n.session_id and newer.checked_at>=n.checked_at and newer.permission<>'granted')
  union all
  select p.user_id,d.id,'native',p.app_version,d.time_zone,'ru',d.updated_at,null::jsonb,d.token
  from people p join salah_support_private.native_devices d on d.user_id=p.user_id
  join auth.sessions s on s.id=d.session_id and s.user_id=d.user_id
  where d.enabled and d.token is not null and length(d.token) between 100 and 4096 and d.token~'^[-A-Za-z0-9_:.]+$'
  and d.updated_at>${at}::timestamptz-interval '90 days' and d.updated_at<=${at}::timestamptz
  and (s.not_after is null or s.not_after>${at}::timestamptz)
  and not exists(select 1 from public.app_notification_status newer where newer.user_id=p.user_id and newer.session_id=d.session_id and newer.permission='denied' and newer.checked_at>=d.updated_at)
 )select distinct on(c."user") c."user",c.device,c.channel,c.version,c."timeZone",c.language,c.subscription,c."nativeToken"
 from channels c join pg_catalog.pg_timezone_names z on z.name=c."timeZone"
 order by c."user",c.updated desc,c.device`;
}
export function createUpdate501Db(sql){
 const campaignActive=async(connection,now)=>{
  if(now>=UPDATE_501_UNTIL)return false;
  const[r]=await connection`select rows from salah_push_private.cache where key=${UPDATE_501_CACHE} and expires_at>${update501Iso(now)}::timestamptz`;
  return r?.rows?.state==='armed'&&r.rows.version===UPDATE_501_VERSION&&r.rows.until===update501Iso(UPDATE_501_UNTIL)&&Number.isFinite(Date.parse(r.rows.armedAt))&&Date.parse(r.rows.armedAt)<=now;
 };
 const snapshot=async(connection,user)=>{const[r]=await connection`select rows from salah_push_private.cache where key=${UPDATE_501_JOB+user}`;return r?.rows;};
 const matching=async(connection,user,job,now)=>{
  if(!job||!['pending','attempted'].includes(job.state)||!await campaignActive(connection,now))return null;
  const rows=await update501Audience(connection,now,user);
  return rows.find(row=>row.device===job.device&&row.channel===job.channel&&row.timeZone===job.timeZone)||null;
 };
 return{
  async update501Preview(now){
   if(now>=UPDATE_501_UNTIL)return{version:501,expired:true,until:update501Iso(UPDATE_501_UNTIL),eligible:0,web:0,native:0,quiet:0};
   const rows=await update501Audience(sql,now);return{version:501,until:update501Iso(UPDATE_501_UNTIL),eligible:rows.length,web:rows.filter(row=>row.channel==='web').length,native:rows.filter(row=>row.channel==='native').length,quiet:rows.filter(row=>!returnAllowedAt(now,row.timeZone)).length};
  },
  async update501Arm(now){
   if(now>=UPDATE_501_UNTIL)return{version:501,expired:true,armed:false};
   return sql.begin(async tx=>{
    // These values are already serialized. Give postgres.js a text parameter
    // before the database parses JSON, avoiding its jsonb string serializer.
    const inserted=await tx`insert into salah_push_private.cache(key,rows,expires_at)values(${UPDATE_501_CACHE},${JSON.stringify({state:'armed',version:501,armedAt:update501Iso(now),until:update501Iso(UPDATE_501_UNTIL)})}::text::jsonb,${update501Iso(UPDATE_501_RECEIPTS_UNTIL)}::timestamptz)on conflict(key)do nothing returning key`;
    if(!inserted.length)return{version:501,armed:false,alreadyArmed:true};
    const rows=await update501Audience(tx,now),jobs=rows.map(row=>({user:row.user,device:row.device,channel:row.channel,timeZone:row.timeZone,state:'pending'}));
    if(jobs.length)await tx`insert into salah_push_private.cache(key,rows,expires_at)select ${UPDATE_501_JOB}||(j->>'user'),j,${update501Iso(UPDATE_501_RECEIPTS_UNTIL)}::timestamptz from jsonb_array_elements(${JSON.stringify(jobs)}::text::jsonb)j on conflict(key)do nothing`;
    return{version:501,armed:true,recipients:jobs.length,until:update501Iso(UPDATE_501_UNTIL)};
   });
  },
  async update501Jobs(now,nativeReady=true){
   if(!await campaignActive(sql,now))return[];
   return sql`select j.rows->>'user' as "user",j.rows->>'channel' as channel from salah_push_private.cache j join pg_catalog.pg_timezone_names z on z.name=j.rows->>'timeZone'
    where j.key like 'update-501:user:%' and j.rows->>'state'='pending' and j.expires_at>${update501Iso(now)}::timestamptz
    and(${nativeReady} or j.rows->>'channel'<>'native')
    and(${update501Iso(now)}::timestamptz at time zone z.name)::time>=time '08:00' and(${update501Iso(now)}::timestamptz at time zone z.name)::time<time '22:00' order by j.key limit 100`;
  },
  async update501Claim(user,now){
   return sql.begin(async tx=>{
    const[r]=await tx`select rows from salah_push_private.cache where key=${UPDATE_501_JOB+user} for update`,job=r?.rows;
    if(job?.state!=='pending'||!await campaignActive(tx,now))return false;
    const current=await matching(tx,user,job,now);
    if(!current){await tx`update salah_push_private.cache set rows=rows||' {"state":"skipped"}'::jsonb where key=${UPDATE_501_JOB+user} and rows->>'state'='pending'`;return false;}
    if(!returnAllowedAt(now,current.timeZone))return false;
    const claimed=await tx`update salah_push_private.cache set rows=rows||${JSON.stringify({state:'attempted',attemptedAt:update501Iso(now)})}::text::jsonb where key=${UPDATE_501_JOB+user} and rows->>'state'='pending' returning key`;
    return claimed.length===1;
   });
  },
  async update501Active(user,now){const job=await snapshot(sql,user);return job?.state==='attempted'?matching(sql,user,job,now):null;},
  async update501Complete(user,state){
   if(!['sent','expired','failed','skipped'].includes(state))throw Error('invalid_update_501_state');
   await sql`update salah_push_private.cache set rows=rows||${JSON.stringify({state})}::text::jsonb where key=${UPDATE_501_JOB+user} and rows->>'state'='attempted'`;
  }
 };
}
