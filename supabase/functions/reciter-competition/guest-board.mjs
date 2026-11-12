import{publicListenerRows}from './listener-labels.mjs';
export async function combinedPublicBoard(sql,period,day,holders={},withTotals=false){
 const rows=await sql`with source as(
 select s.user_id,v.public_id as id,v.mode,false as guest,s.reciter,s.seconds,f.reciter as preferred,
 upper(left(coalesce(nullif(btrim(u.raw_user_meta_data->>'nickname'),''),'Слушатель'),1))initial,
 upper(left(coalesce(nullif(btrim(u.raw_user_meta_data->>'nickname'),''),'Слушатель'),2))prefix,
 case when v.mode='profile'then left(coalesce(nullif(btrim(u.raw_user_meta_data->>'nickname'),''),'Слушатель'),40)end nickname,
 case when v.mode='profile'then exists(select 1 from storage.objects o where o.bucket_id='profile-avatars' and o.name=u.id::text||'/profile.jpg')else false end has_photo,
 coalesce((select least(45,greatest(0,ceil(extract(epoch from(max(lp.reported_at)+interval '45 seconds'-statement_timestamp())))))::int from salah_competition_private.listener_presence lp join auth.sessions a on a.id=lp.session_id and a.user_id=lp.user_id where lp.user_id=s.user_id and lp.playing and lp.reported_at>statement_timestamp()-interval '45 seconds' and (a.not_after is null or a.not_after>statement_timestamp()) and (u.banned_until is null or u.banned_until<=statement_timestamp())),0)active_for_seconds
 from public.competition_scores(${period},${day}::date)s
 join salah_competition_private.preferences p using(user_id)join public.reciter_listener_visibility v using(user_id)join auth.users u on u.id=s.user_id
 left join salah_competition_private.favorite_state f on f.user_id=s.user_id and f.period=${period} and f.bucket=case ${period} when 'all'then '1970-01-01'::date when 'week'then date_trunc('week',${day}::timestamp)::date when 'month'then date_trunc('month',${day}::timestamp)::date else ${day}::date end
 where p.enabled and v.mode in('initial','profile') and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false)
 union all
 select null::uuid,g.public_id,'profile',true,s.reciter,s.seconds,null::text,'Г','Г','Гость '||upper(left(replace(g.public_id::text,'-',''),6)),false,
 coalesce((select least(45,greatest(0,ceil(extract(epoch from(max(a.reported_at)+interval '45 seconds'-statement_timestamp())))))::int from salah_visits_private.guest_activity_presence a where a.device_hash=g.activity_hash and a.kind='listening' and a.active and a.reported_at>statement_timestamp()-interval '45 seconds'),0)
 from salah_competition_private.guest_scores(${period},${day}::date)s join salah_competition_private.guest_players g on g.public_id=s.guest_id where g.claimed_by is null
 ), heard as(
 select *,sum(seconds)over(partition by id)::bigint total_seconds,row_number()over(partition by id order by seconds desc,case when reciter=preferred then 0 else 1 end,reciter)favorite from source
 ), ranked as (
 select *,rank()over(order by case when ${withTotals} then total_seconds else seconds end desc)place,
 row_number()over(order by case when ${withTotals} then total_seconds else seconds end desc,id)ordinal from heard where favorite=1
 ), podium as(
 select h.id,json_agg(json_build_object('reciter',h.reciter,'seconds',h.seconds)order by h.favorite)reciters from heard h join ranked r using(id)where r.ordinal<=3 group by h.id
 )
 select r.*,p.reciters,sum(r.total_seconds)over()listening_total from ranked r left join podium p using(id)order by r.place,r.id limit 1000`;
 const labels=publicListenerRows(rows.filter(r=>!r.guest)),byId=new Map(labels.map(r=>[r.id,r]));
 return{items:rows.map(r=>({...((r.guest)?{id:r.id,mode:'profile',initial:'Г',nickname:r.nickname,hasPhoto:false,guest:true}:byId.get(r.id)),
 reciter:r.reciter,seconds:Number(r.seconds),rank:Number(r.place),activeForSeconds:Number(r.active_for_seconds)||0,
 ...(withTotals?{totalSeconds:Number(r.total_seconds),...(Array.isArray(r.reciters)?{reciters:r.reciters.map(x=>({reciter:x.reciter,seconds:Number(x.seconds)}))}:{})}:{}),
 awards:r.guest?[]:[...(holders.week===r.user_id?['week']:[]),...(holders.month===r.user_id?['month']:[])]})),
 limited:rows.length===1000,listeningTotal:Number(rows[0]?.listening_total||0)};
}
