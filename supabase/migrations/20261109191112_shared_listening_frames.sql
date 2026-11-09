-- Live display only. Existing score and award functions are unchanged.
create table salah_competition_private.live_listening_samples(
 user_id uuid not null references auth.users(id) on delete cascade,
 device_id uuid not null,reciter text not null,day date not null,
 session_id uuid not null references auth.sessions(id) on delete cascade,
 total_seconds bigint not null check(total_seconds between 0 and 315360000),
 day_seconds integer not null check(day_seconds between 0 and 86400),
 reported_at timestamptz not null default clock_timestamp(),
 primary key(user_id,device_id,reciter,day)
);
create index live_listening_device_time on salah_competition_private.live_listening_samples(user_id,device_id,reported_at desc);
create index live_listening_retention on salah_competition_private.live_listening_samples(reported_at);
alter table salah_competition_private.live_listening_samples enable row level security;
revoke all on salah_competition_private.live_listening_samples from public,anon,authenticated;
create sequence salah_competition_private.shared_listening_revision;
revoke all on sequence salah_competition_private.shared_listening_revision from public,anon,authenticated;
create table public.salah_shared_listening(
 day date primary key,revision bigint not null,
 sampled_at timestamptz not null default clock_timestamp(),
 totals jsonb not null check(jsonb_typeof(totals)='object')
);
alter table public.salah_shared_listening enable row level security;
revoke all on public.salah_shared_listening from public,anon,authenticated;
grant select on public.salah_shared_listening to anon,authenticated;
create policy shared_listening_aggregate_read on public.salah_shared_listening for select to anon,authenticated
 using(day between (now() at time zone 'UTC')::date-1 and (now() at time zone 'UTC')::date+1);
do $migration$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='salah_shared_listening')then
  alter publication supabase_realtime add table public.salah_shared_listening;
 end if;
end $migration$;
create function salah_competition_private.live_competition_scores(p_period text,p_day date)
 returns table(user_id uuid,reciter text,seconds bigint)
 language sql stable security invoker set search_path='' as $$
 with live_all as(select l.user_id,l.device_id,l.reciter,max(l.total_seconds) total_seconds from salah_competition_private.live_listening_samples l join auth.sessions a on a.id=l.session_id and a.user_id=l.user_id join auth.users u on u.id=l.user_id where(a.not_after is null or a.not_after>now()) and (u.banned_until is null or u.banned_until<=now()) group by l.user_id,l.device_id,l.reciter),
 live_day as(select l.* from salah_competition_private.live_listening_samples l join auth.sessions a on a.id=l.session_id and a.user_id=l.user_id join auth.users u on u.id=l.user_id where(a.not_after is null or a.not_after>now()) and (u.banned_until is null or u.banned_until<=now())),
 bounds as(select case p_period when 'day' then p_day when 'week' then date_trunc('week',p_day::timestamp)::date when 'month' then date_trunc('month',p_day::timestamp)::date else '-infinity'::date end first_day),
 snapshots as (
  select t.user_id,t.reciter,sum(t.initial_seconds)::bigint initial,sum(greatest(t.seconds,coalesce(l.total_seconds,t.seconds))-t.initial_seconds)::bigint growth from salah_competition_private.totals t left join live_all l using(user_id,device_id,reciter) where p_period='all' group by t.user_id,t.reciter
  union all
  select d.user_id,d.reciter,sum(d.initial_seconds)::bigint,sum(greatest(d.seconds,coalesce(l.day_seconds,d.seconds))-d.initial_seconds)::bigint from salah_competition_private.days d left join live_day l using(user_id,device_id,reciter,day),bounds b where p_period in('day','week','month') and d.day between b.first_day and p_day group by d.user_id,d.reciter
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
 select x.user_id,x.reciter,max(x.seconds)::bigint from(select * from joined union all select * from old)x group by x.user_id,x.reciter having max(x.seconds)>0;
$$;
revoke all on function salah_competition_private.live_competition_scores(text,date) from public,anon,authenticated;
