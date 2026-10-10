-- One participant per account; private listening snapshots and delivery queue.
create schema if not exists salah_competition_private;
revoke all on schema salah_competition_private from public,anon,authenticated;
grant usage on schema salah_competition_private to service_role;
create table salah_competition_private.preferences (
 user_id uuid primary key references auth.users(id) on delete cascade,
 enabled boolean not null default true, notify boolean not null default false,
 period text not null default 'all' check(period in ('day','week','month','all')),
 time_zone text not null default 'UTC', updated_at timestamptz not null default now()
);
create table salah_competition_private.totals (
 user_id uuid references auth.users(id) on delete cascade, device_id uuid not null,
 reciter text not null, seconds bigint not null check(seconds between 0 and 315360000), initial_seconds bigint not null check(initial_seconds between 0 and seconds),
 updated_at timestamptz not null default now(), primary key(user_id,device_id,reciter)
);
create table salah_competition_private.days (
 user_id uuid references auth.users(id) on delete cascade, device_id uuid not null,
 day date not null, reciter text not null, seconds integer not null check(seconds between 0 and 86400), initial_seconds integer not null check(initial_seconds between 0 and seconds),
 primary key(user_id,device_id,day,reciter)
);
create table salah_competition_private.legacy (
 user_id uuid references auth.users(id) on delete cascade, reciter text not null,
 seconds bigint not null check(seconds>=0), seed_seconds bigint not null check(seed_seconds>=0), primary key(user_id,reciter)
);
create table salah_competition_private.legacy_days (
 user_id uuid references auth.users(id) on delete cascade, day date not null,reciter text not null,
 seconds bigint not null check(seconds>=0),primary key(user_id,day,reciter)
);
create table salah_competition_private.favorite_state (
 user_id uuid references auth.users(id) on delete cascade,period text not null,bucket date not null,reciter text not null,
 primary key(user_id,period,bucket)
);
create table salah_competition_private.rank_state (
 user_id uuid primary key references auth.users(id) on delete cascade,
 period text not null, bucket date not null, place integer not null,
 notified_at timestamptz, updated_at timestamptz not null default now()
);
create table salah_competition_private.events (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 period text not null, bucket date not null, old_place integer not null, new_place integer not null,
 created_at timestamptz not null default now()
);
create index competition_events_recent on salah_competition_private.events(created_at,user_id);
create table salah_competition_private.devices (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
 session_id uuid not null references auth.sessions(id) on delete cascade,
 subscription jsonb not null, enabled boolean not null default true, updated_at timestamptz not null default now()
);
create index competition_device_user on salah_competition_private.devices(user_id) where enabled;
create index competition_device_session on salah_competition_private.devices(session_id);
create table salah_competition_private.deliveries (
 device_id uuid references salah_competition_private.devices(id) on delete cascade,
 event_id uuid references salah_competition_private.events(id) on delete cascade,
 state text not null check(state in ('sending','sent','failed')), updated_at timestamptz not null default now(),
 primary key(device_id,event_id)
);
-- Automatic participation is initialized only by the verified user opening SALAH.
-- No migration enrolls other accounts; existing hidden/withdrawn choices are preserved.
create function public.competition_scores(p_period text,p_day date)
 returns table(user_id uuid,reciter text,seconds bigint)
 language sql stable security invoker set search_path='' as $$
 with bounds as(select case p_period when 'day' then p_day when 'week' then date_trunc('week',p_day::timestamp)::date when 'month' then date_trunc('month',p_day::timestamp)::date else '-infinity'::date end first_day),
 snapshots as (
  select t.user_id,t.reciter,sum(t.initial_seconds)::bigint initial,sum(t.seconds-t.initial_seconds)::bigint growth from salah_competition_private.totals t where p_period='all' group by t.user_id,t.reciter
  union all
  select d.user_id,d.reciter,sum(d.initial_seconds)::bigint,sum(d.seconds-d.initial_seconds)::bigint from salah_competition_private.days d,bounds b where p_period in('day','week','month') and d.day between b.first_day and p_day group by d.user_id,d.reciter
 ), seeds as(
  select l.user_id,l.reciter,l.seed_seconds seconds from salah_competition_private.legacy l where p_period='all'
  union all
  select l.user_id,l.reciter,sum(l.seconds)::bigint from salah_competition_private.legacy_days l,bounds b where p_period in('day','week','month')and l.day between b.first_day and p_day group by l.user_id,l.reciter
 ), old as(
  select l.user_id,l.reciter,l.seconds from salah_competition_private.legacy l where p_period='all'
  union all
  select v.user_id,m.reciter,sum(m.minutes::bigint*60+m.extra_seconds)::bigint from public.reciter_popularity_minutes m join public.reciter_listener_visibility v on v.listener_hash=m.listener_hash,bounds b where p_period in('day','week','month') and m.day between b.first_day and p_day group by v.user_id,m.reciter
 ), joined as(select coalesce(s.user_id,b.user_id)user_id,coalesce(s.reciter,b.reciter)reciter,greatest(coalesce(s.initial,0),coalesce(b.seconds,0))+coalesce(s.growth,0)seconds from snapshots s full join seeds b using(user_id,reciter))
 select x.user_id,x.reciter,max(x.seconds)::bigint from(select * from joined union all select * from old)x group by x.user_id,x.reciter having max(x.seconds)>0;
$$;
create function public.competition_board(p_period text,p_day date)
 returns table(user_id uuid,reciter text,seconds bigint,place bigint)
 language sql stable security invoker set search_path='' as $$
 with heard as(select s.*,row_number()over(partition by s.user_id order by s.seconds desc,case when s.reciter=f.reciter then 0 else 1 end,s.reciter) favorite from public.competition_scores(p_period,p_day)s
 join salah_competition_private.preferences p using(user_id)
 join public.reciter_listener_visibility v using(user_id)
 join auth.users u on u.id=s.user_id
 left join salah_competition_private.favorite_state f on f.user_id=s.user_id and f.period=p_period and f.bucket=case p_period when 'all'then '1970-01-01'::date when 'week'then date_trunc('week',p_day::timestamp)::date when 'month'then date_trunc('month',p_day::timestamp)::date else p_day end
 where p.enabled and v.mode<>'hidden' and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false)),
 leaders as(select user_id,reciter,seconds from heard where favorite=1)
 select user_id,reciter,seconds,rank()over(order by seconds desc) place from leaders order by seconds desc,user_id;
$$;
create function public.competition_refresh()
 returns void language plpgsql security invoker set search_path='' as $$
 declare cohort record; person record; selected_period text; previous salah_competition_private.rank_state%rowtype; bucket_day date;
 begin
 perform pg_advisory_xact_lock(28520261011);
 for cohort in select distinct (now()at time zone p.time_zone)::date as ref_day from salah_competition_private.preferences p where p.enabled loop
 foreach selected_period in array array['day','week','month','all'] loop
 bucket_day:=case selected_period when 'week'then date_trunc('week',cohort.ref_day::timestamp)::date when 'month'then date_trunc('month',cohort.ref_day::timestamp)::date when 'all'then '1970-01-01'::date else cohort.ref_day end;
 insert into salah_competition_private.favorite_state(user_id,period,bucket,reciter)
 select choice.user_id,selected_period,bucket_day,choice.reciter from(
 select s.user_id,s.reciter,row_number()over(partition by s.user_id order by s.seconds desc,case when s.reciter=f.reciter then 0 else 1 end,s.reciter) favorite
 from public.competition_scores(selected_period,cohort.ref_day)s join salah_competition_private.preferences p using(user_id)
 left join salah_competition_private.favorite_state f on f.user_id=s.user_id and f.period=selected_period and f.bucket=bucket_day
 where p.enabled and (now()at time zone p.time_zone)::date=cohort.ref_day
 )choice where choice.favorite=1 on conflict(user_id,period,bucket)do update set reciter=excluded.reciter;
 end loop;end loop;
 for cohort in select distinct p.period,(now() at time zone p.time_zone)::date as ref_day from salah_competition_private.preferences p where p.enabled and p.notify loop
 bucket_day:=case cohort.period when 'week' then date_trunc('week',cohort.ref_day::timestamp)::date when 'month' then date_trunc('month',cohort.ref_day::timestamp)::date when 'all' then '1970-01-01'::date else cohort.ref_day end;
 for person in select b.* from public.competition_board(cohort.period,cohort.ref_day)b join salah_competition_private.preferences p using(user_id) where p.enabled and p.notify and p.period=cohort.period and (now() at time zone p.time_zone)::date=cohort.ref_day loop
 select * into previous from salah_competition_private.rank_state where user_id=person.user_id;
 if found and previous.period=cohort.period and previous.bucket=bucket_day and person.place>previous.place and (previous.notified_at is null or previous.notified_at<now()-interval '30 minutes') then
 insert into salah_competition_private.events(user_id,period,bucket,old_place,new_place)values(person.user_id,cohort.period,bucket_day,previous.place,person.place);
 previous.notified_at:=now();
 end if;
 insert into salah_competition_private.rank_state(user_id,period,bucket,place,notified_at)
 values(person.user_id,cohort.period,bucket_day,person.place,previous.notified_at)
 on conflict(user_id)do update set period=excluded.period,bucket=excluded.bucket,place=excluded.place,notified_at=excluded.notified_at,updated_at=now();
 end loop; end loop;
 end; $$;
revoke all on function public.competition_scores(text,date),public.competition_board(text,date),public.competition_refresh() from public,anon,authenticated;
grant execute on function public.competition_scores(text,date),public.competition_board(text,date),public.competition_refresh() to service_role;
do $$declare t text;begin
 for t in select tablename from pg_tables where schemaname='salah_competition_private' loop
 execute format('alter table salah_competition_private.%I enable row level security',t);
 execute format('revoke all on salah_competition_private.%I from public,anon,authenticated',t);
 execute format('grant all on salah_competition_private.%I to service_role',t);
 end loop;end $$;
