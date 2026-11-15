// Read only, called exclusively after owner identity, live session and MFA checks.
// A last app-state signal is independent of competition seconds and never proves sleep.
export async function readOwnerAppState(sql,page=1){
 if(!Number.isSafeInteger(page)||page<1||page>10000)throw Error('invalid_page');
 const offset=(page-1)*50;
 const [result]=await sql`with bounds as(select statement_timestamp() as now),
 modern as(
  select p.actor,p.tab_id,p.user_id,p.device_hash,p.visible,p.section,p.player_state,p.last_action_at,p.credit_paused,p.app_version,p.reported_at,
   (p.user_id is null or exists(select 1 from auth.sessions s where s.id=p.session_id and s.user_id=p.user_id and(s.not_after is null or s.not_after>(select now from bounds)))) as valid_session,true as is_modern
  from salah_visits_private.app_state_presence p,bounds b where p.reported_at>=b.now-interval '24 hours' and p.reported_at<=b.now+interval '5 seconds'
 ), legacy as(
  select 'account:'||p.user_id::text as actor,p.tab_id,p.user_id,null::text as device_hash,p.active as visible,'other'::text as section,'unknown'::text as player_state,null::timestamptz as last_action_at,null::boolean as credit_paused,p.app_version,p.last_seen as reported_at,
   exists(select 1 from auth.sessions s where s.user_id=p.user_id and(s.not_after is null or s.not_after>(select now from bounds))) as valid_session,false as is_modern
  from public.app_presence p,bounds b where p.app='salah' and p.last_seen>=b.now-interval '24 hours' and p.last_seen<=b.now+interval '5 seconds'
  union all
  select 'account:'||p.user_id::text,p.tab_id,p.user_id,null::text,false,'other',case when p.playing then 'playing' else 'unknown' end,null::timestamptz,null::boolean,null::integer,p.reported_at,
   exists(select 1 from auth.sessions s where s.id=p.session_id and s.user_id=p.user_id and(s.not_after is null or s.not_after>(select now from bounds))),false
  from salah_competition_private.listener_presence p,bounds b where p.reported_at>=b.now-interval '24 hours' and p.reported_at<=b.now+interval '5 seconds'
  union all
  select 'account:'||p.user_id::text,p.tab_id,p.user_id,null::text,p.active,case when p.active and p.kind='reading' then 'quran' when p.active and p.kind='dhikr' then 'adhkar' else 'other' end,'unknown',null::timestamptz,null::boolean,null::integer,p.reported_at,
   exists(select 1 from auth.sessions s where s.id=p.session_id and s.user_id=p.user_id and(s.not_after is null or s.not_after>(select now from bounds))),false
  from salah_competition_private.activity_presence p,bounds b where p.reported_at>=b.now-interval '24 hours' and p.reported_at<=b.now+interval '5 seconds'
  union all
  select 'guest:'||p.device_hash,p.tab_id,null::uuid,p.device_hash,p.active and p.kind in('reading','dhikr'),case when p.active and p.kind='reading' then 'quran' when p.active and p.kind='dhikr' then 'adhkar' else 'other' end,case when p.active and p.kind='listening' then 'playing' else 'unknown' end,null::timestamptz,null::boolean,null::integer,p.reported_at,true,false
  from salah_visits_private.guest_activity_presence p,bounds b where p.reported_at>=b.now-interval '24 hours' and p.reported_at<=b.now+interval '5 seconds'
 ), records as(
  select * from modern union all select l.* from legacy l where not exists(select 1 from modern m where m.actor=l.actor and m.tab_id=l.tab_id and m.reported_at>=l.reported_at)
 ), chosen as(
  select distinct on(r.actor) r.* from records r,bounds b
  order by r.actor,(r.is_modern and r.visible and r.valid_session and r.reported_at>b.now-interval '45 seconds')desc,(r.visible and r.valid_session and r.reported_at>b.now-interval '45 seconds')desc,r.reported_at desc,r.is_modern desc,r.tab_id
 ), player_latest as(
  select distinct on(r.actor) r.actor,r.player_state,r.reported_at from records r,bounds b
  where r.is_modern and r.valid_session and r.reported_at>b.now-interval '45 seconds'
  order by r.actor,r.reported_at desc,r.tab_id
 ), signals as(
  select r.actor,max(r.reported_at) as last_signal_at,max(r.last_action_at) as last_action_at,
   max(r.reported_at)filter(where r.player_state='playing' and r.valid_session and r.reported_at>b.now-interval '45 seconds') as playing_at,
   (array_agg(r.credit_paused order by(r.is_modern and r.valid_session and r.reported_at>b.now-interval '45 seconds')desc,r.reported_at desc,r.tab_id))[1] as credit_paused,
   (array_agg(r.app_version order by(r.is_modern and r.valid_session and r.reported_at>b.now-interval '45 seconds')desc,r.reported_at desc)filter(where r.app_version is not null))[1] as app_version
  from records r,bounds b group by r.actor
 ), named as(
  select c.actor,coalesce(c.user_id::text,g.public_id::text,'guest:'||c.device_hash)as id,c.user_id is null as guest,
   case when c.user_id is not null then left(coalesce(nullif(btrim(u.raw_user_meta_data->>'nickname'),''),'Без ника'),40)else coalesce(g.nickname,'Гость')end as nickname,
   c.section,case when s.playing_at is not null then 'playing' when mp.actor is not null then mp.player_state else 'unknown' end as player_state,
   coalesce(s.playing_at,mp.reported_at)as player_signal_at,
   case when g.paused_at is not null then true else s.credit_paused end as credit_paused,
   c.visible and c.valid_session and c.reported_at>b.now-interval '45 seconds' as visible,s.last_signal_at,s.last_action_at,s.app_version
  from chosen c join signals s using(actor)cross join bounds b left join player_latest mp on mp.actor=c.actor
  left join auth.users u on u.id=c.user_id
  left join lateral(
   select p.public_id,a.nickname,k.paused_at from salah_competition_private.guest_players p
   left join salah_competition_private.guest_aliases a on a.guest_id=p.public_id
   left join salah_competition_private.guest_credit_controls k on k.guest_id=p.public_id
   where p.activity_hash=c.device_hash and p.claimed_by is null order by p.created_at desc,p.public_id limit 1
  )g on c.user_id is null
  where(c.user_id is null and c.device_hash~'^[a-f0-9]{64}$')or(u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false)and(u.banned_until is null or u.banned_until<=b.now))
 ), numbered as(
  select n.*,row_number()over(order by n.last_signal_at desc,n.actor)as rank from named n
 ), summary as(select count(*)::integer as total from numbered)
 select (select now from bounds)as "updatedAt",summary.total,
  coalesce(jsonb_agg(jsonb_build_object('id',n.id,'guest',n.guest,'nickname',n.nickname,'section',n.section,'playerState',n.player_state,'playerSignalAt',n.player_signal_at,'playerExpiresAt',n.player_signal_at+interval '45 seconds','creditPaused',n.credit_paused,'lastSignalAt',n.last_signal_at,'lastActionAt',n.last_action_at,'visible',n.visible,'appVersion',n.app_version)order by n.rank)filter(where n.rank is not null),'[]'::jsonb)as items
 from summary left join numbered n on n.rank>${offset} and n.rank<=${offset+50} group by summary.total`;
 if(!result||!Number.isSafeInteger(result.total)||result.total<0||!Array.isArray(result.items))throw Error('invalid_app_state');
 const iso=value=>value===null?null:new Date(value).toISOString();
 return{updatedAt:iso(result.updatedAt),freshForSeconds:45,total:result.total,page,pageSize:50,items:result.items.map(row=>({...row,lastSignalAt:iso(row.lastSignalAt),lastActionAt:iso(row.lastActionAt),playerSignalAt:iso(row.playerSignalAt),playerExpiresAt:iso(row.playerExpiresAt)}))};
}
