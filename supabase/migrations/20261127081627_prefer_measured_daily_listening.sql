begin;

-- From the observed incident date, favor a measured daily snapshot over the
-- older whole-minute channel for the same account, local date and reciter.
create or replace function public.competition_scores(p_period text,p_day date)
 returns table(user_id uuid,reciter text,seconds bigint)
 language sql stable security invoker set search_path='' as $$
 with bounds as(select case p_period when 'day' then p_day when 'week' then date_trunc('week',p_day::timestamp)::date when 'month' then date_trunc('month',p_day::timestamp)::date else '-infinity'::date end first_day),
 snapshots as (
  select t.user_id,t.reciter,sum(t.initial_seconds)::bigint initial,sum(t.seconds-t.initial_seconds)::bigint growth from salah_competition_private.totals t where p_period='all' group by t.user_id,t.reciter
  union all
  select d.user_id,d.reciter,sum(d.initial_seconds)::bigint,sum(d.seconds-d.initial_seconds)::bigint from salah_competition_private.days d,bounds b where p_period in('day','week','month') and d.day between b.first_day and p_day group by d.user_id,d.reciter
 ), legacy_day_budgets as(
  select d.user_id,d.day,d.reciter,least(d.seconds,greatest(l.seed_seconds-coalesce(sum(d.seconds)over(partition by d.user_id,d.reciter order by d.day rows between unbounded preceding and 1 preceding),0),0))::bigint seconds
  from salah_competition_private.legacy_days d join salah_competition_private.legacy l using(user_id,reciter) where l.seed_seconds>0
 ), seeds as(
  select l.user_id,l.reciter,l.seed_seconds seconds from salah_competition_private.legacy l where p_period='all'
  union all
  select l.user_id,l.reciter,sum(l.seconds)::bigint from legacy_day_budgets l,bounds b where p_period in('day','week','month')and l.day between b.first_day and p_day group by l.user_id,l.reciter
 ), old as(
  select l.user_id,l.reciter,l.seconds from salah_competition_private.legacy l where p_period='all'
  union all
  select v.user_id,m.reciter,sum(m.minutes::bigint*60+m.extra_seconds)::bigint from public.reciter_popularity_minutes m join public.reciter_listener_visibility v on v.listener_hash=m.listener_hash,bounds b
  where (p_period='all' or p_period in('day','week','month')and m.day between b.first_day and p_day)
    and not (p_period='day' and m.day>=date '2026-11-27' and exists (
      select 1 from salah_competition_private.days d
      where d.user_id=v.user_id and d.day=m.day and d.reciter=m.reciter and d.seconds>0
    ))
  group by v.user_id,m.reciter
 ), joined as(select coalesce(s.user_id,b.user_id)user_id,coalesce(s.reciter,b.reciter)reciter,greatest(coalesce(s.initial,0),coalesce(b.seconds,0))+coalesce(s.growth,0)seconds from snapshots s full join seeds b using(user_id,reciter))
 select combined.user_id,combined.reciter,sum(combined.seconds)::bigint from (
 select x.user_id,x.reciter,max(x.seconds)::bigint as seconds from(select * from joined union all select * from old)x group by x.user_id,x.reciter having max(x.seconds)>0
 union all select g.claimed_by,s.reciter,s.seconds from salah_competition_private.guest_scores(p_period,p_day)s join salah_competition_private.guest_players g on g.public_id=s.guest_id where g.claimed_by is not null
 )combined group by combined.user_id,combined.reciter;
$$;

commit;
