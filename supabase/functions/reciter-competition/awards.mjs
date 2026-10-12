import{publicListenerRows}from './listener-labels.mjs';
const awardItem=r=>({id:r.id,kind:r.kind,start:r.starts_on,end:r.ends_on,reciter:r.reciter,seconds:Number(r.seconds),earnedAt:r.earned_at});
export async function ownAwards(sql,user){
 const [{day}]=await sql`select (now()at time zone p.time_zone)::date::text AS "day" from salah_competition_private.preferences p where p.user_id=${user.id}::uuid`;
 const [{streak}]=await sql`select salah_competition_private.award_streak(${user.id}::uuid,${day}::date)streak`;
 const items=await sql`select id,kind,starts_on::text,ends_on::text,reciter,seconds,earned_at from salah_competition_private.awards where user_id=${user.id}::uuid order by earned_at desc,id limit 200`;
 const summary=await sql`select kind,count(*)::integer wins from salah_competition_private.awards where user_id=${user.id}::uuid group by kind`;
 const rows=await sql`select v.public_id as id,case when v.mode='profile'then 'profile'else 'initial'end mode,upper(left(coalesce(nullif(btrim(u.raw_user_meta_data->>'nickname'),''),'Слушатель'),2))initial,
 case when v.mode='profile'then left(coalesce(nullif(btrim(u.raw_user_meta_data->>'nickname'),''),'Слушатель'),40)end nickname,
 case when v.mode='profile'then exists(select 1 from storage.objects o where o.bucket_id='profile-avatars'and o.name=v.user_id::text||'/profile.jpg')else false end has_photo
 from public.reciter_listener_visibility v join auth.users u on u.id=v.user_id where v.user_id=${user.id}::uuid`;
 return {day,streak,items:items.map(awardItem),counts:Object.fromEntries(summary.map(r=>[r.kind,r.wins])),listener:publicListenerRows(rows)[0]||null,timeZone:'Europe/Moscow',graceHours:0};
}
export async function awardWinners(sql){
 const rows=await sql`with recent as(select kind,max(ends_on)ends_on from salah_competition_private.award_periods group by kind)
 select a.id award_id,a.kind,a.starts_on::text,a.ends_on::text,a.reciter,a.seconds,a.earned_at,v.public_id as id,v.mode,
 upper(left(coalesce(nullif(btrim(u.raw_user_meta_data->>'nickname'),''),'Слушатель'),2))initial,
 upper(left(coalesce(nullif(btrim(u.raw_user_meta_data->>'nickname'),''),'Слушатель'),2))prefix,
 case when v.mode='profile'then left(coalesce(nullif(btrim(u.raw_user_meta_data->>'nickname'),''),'Слушатель'),40)end nickname,
 case when v.mode='profile'then exists(select 1 from storage.objects o where o.bucket_id='profile-avatars'and o.name=v.user_id::text||'/profile.jpg')else false end has_photo
 from salah_competition_private.awards a join recent r on r.kind=a.kind and r.ends_on=a.ends_on join public.reciter_listener_visibility v using(user_id)
 join salah_competition_private.preferences p using(user_id)join auth.users u on u.id=a.user_id
 where p.enabled and v.mode<>'hidden'and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false)
 order by a.kind,v.public_id limit 1000`;
 const labels=publicListenerRows(rows);return {items:rows.map((r,i)=>({...awardItem({...r,id:r.award_id}),listener:labels[i]})),timeZone:'Europe/Moscow',graceHours:0};
}
