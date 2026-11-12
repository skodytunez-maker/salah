-- Unregistered installation ledger; no name, email, city or country.
create table salah_competition_private.guest_players(
 public_id uuid primary key default gen_random_uuid(),device_hash text unique not null check(device_hash~'^[a-f0-9]{64}$'),
 secret_hash text not null check(secret_hash~'^[a-f0-9]{64}$'),activity_hash text not null check(activity_hash~'^[a-f0-9]{64}$'),
 claimed_by uuid references auth.users(id) on delete cascade,claimed_at timestamptz,
 created_at timestamptz not null default clock_timestamp(),rate_minute timestamptz not null default date_trunc('minute',clock_timestamp()),attempts integer not null default 0 check(attempts between 0 and 30)
);
create index guest_players_claim on salah_competition_private.guest_players(claimed_by);
create table salah_competition_private.guest_totals(
 guest_id uuid not null references salah_competition_private.guest_players(public_id) on delete cascade,reciter text not null,
 seconds bigint not null check(seconds between 0 and 315360000),primary key(guest_id,reciter)
);
create table salah_competition_private.guest_days(
 guest_id uuid not null references salah_competition_private.guest_players(public_id) on delete cascade,day date not null,reciter text not null,
 seconds integer not null check(seconds between 0 and 86400),primary key(guest_id,day,reciter)
);
alter table salah_competition_private.guest_players enable row level security;
alter table salah_competition_private.guest_totals enable row level security;
alter table salah_competition_private.guest_days enable row level security;
revoke all on salah_competition_private.guest_players,salah_competition_private.guest_totals,salah_competition_private.guest_days from public,anon,authenticated;
create function salah_competition_private.guest_scores(p_period text,p_day date)
 returns table(guest_id uuid,reciter text,seconds bigint) language sql stable security invoker set search_path='' as $guest$
 select t.guest_id,t.reciter,t.seconds from salah_competition_private.guest_totals t where p_period='all' and t.seconds>0
 union all
 select d.guest_id,d.reciter,sum(d.seconds)::bigint from salah_competition_private.guest_days d
 where p_period in('day','week','month') and d.day between
 case p_period when 'week'then date_trunc('week',p_day::timestamp)::date when 'month'then date_trunc('month',p_day::timestamp)::date else p_day end and p_day
 group by d.guest_id,d.reciter having sum(d.seconds)>0;
$guest$;
revoke all on function salah_competition_private.guest_scores(text,date) from public,anon,authenticated;
grant execute on function salah_competition_private.guest_scores(text,date) to service_role;
grant select on salah_competition_private.guest_players,salah_competition_private.guest_totals,salah_competition_private.guest_days to service_role;

-- Transfer is an ownership change of one ledger, never a second copy of its seconds.
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
  where p_period='all' or p_period in('day','week','month')and m.day between b.first_day and p_day group by v.user_id,m.reciter
 ), joined as(select coalesce(s.user_id,b.user_id)user_id,coalesce(s.reciter,b.reciter)reciter,greatest(coalesce(s.initial,0),coalesce(b.seconds,0))+coalesce(s.growth,0)seconds from snapshots s full join seeds b using(user_id,reciter))
 select combined.user_id,combined.reciter,sum(combined.seconds)::bigint from (
 select x.user_id,x.reciter,max(x.seconds)::bigint as seconds from(select * from joined union all select * from old)x group by x.user_id,x.reciter having max(x.seconds)>0
 union all select g.claimed_by,s.reciter,s.seconds from salah_competition_private.guest_scores(p_period,p_day)s join salah_competition_private.guest_players g on g.public_id=s.guest_id where g.claimed_by is not null
 )combined group by combined.user_id,combined.reciter;
$$;
