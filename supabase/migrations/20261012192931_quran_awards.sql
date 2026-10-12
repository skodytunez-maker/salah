-- Calendar awards, Moscow boundaries, one favorite reciter per listener.
-- Results are finalized after a 24-hour sync grace; no previous periods are invented.
create table salah_competition_private.award_periods(
 kind text not null check(kind in('week','month')), starts_on date not null, ends_on date not null,
 finalized_at timestamptz not null default now(), primary key(kind,starts_on), check(ends_on>starts_on)
);
create table salah_competition_private.awards(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in('week','month')), starts_on date not null, ends_on date not null,
 reciter text, seconds bigint not null default 0 check(seconds>=0), earned_at timestamptz not null default now(),
 unique(user_id,kind,starts_on),check(ends_on>=starts_on)
);
create index quran_award_user_recent on salah_competition_private.awards(user_id,earned_at desc);
create index quran_award_public_period on salah_competition_private.awards(kind,ends_on desc) where kind in('week','month');
alter table salah_competition_private.award_periods enable row level security;
alter table salah_competition_private.awards enable row level security;
revoke all on salah_competition_private.award_periods,salah_competition_private.awards from public,anon,authenticated;
grant all on salah_competition_private.award_periods,salah_competition_private.awards to service_role;

create function salah_competition_private.award_activity(p_user uuid)
returns table("day" date,seconds bigint) language sql stable security invoker set search_path='' as $$
 with snapshots as(select d.day,d.reciter,sum(d.initial_seconds)::bigint initial,sum(d.seconds-d.initial_seconds)::bigint growth from salah_competition_private.days d where d.user_id=p_user group by d.day,d.reciter),
 seeds as(select l.day,l.reciter,l.seconds from salah_competition_private.legacy_days l where l.user_id=p_user),
 joined as(select coalesce(s.day,b.day) AS "day",coalesce(s.reciter,b.reciter)reciter,greatest(coalesce(s.initial,0),coalesce(b.seconds,0))+coalesce(s.growth,0)seconds from snapshots s full join seeds b using(day,reciter)),
 old as(select m.day,m.reciter,(m.minutes::bigint*60+m.extra_seconds)::bigint seconds from public.reciter_popularity_minutes m join public.reciter_listener_visibility v on v.listener_hash=m.listener_hash where v.user_id=p_user),
 heard as(select x.day,x.reciter,max(x.seconds)::bigint seconds from(select * from joined union all select * from old)x group by x.day,x.reciter)
 select h.day,sum(h.seconds)::bigint from heard h group by h.day having sum(h.seconds)>=60;
$$;

create function salah_competition_private.award_streak(p_user uuid,p_today date)
returns jsonb language plpgsql security invoker set search_path='' as $$
 declare result jsonb;
 begin
 with dates as(select a.day,a.day-(row_number()over(order by a.day))::integer island from salah_competition_private.award_activity(p_user)a where a.day<=p_today),
 runs as(select min(day)first_day,max(day)last_day,count(*)::integer days from dates group by island)
 select jsonb_build_object('current',coalesce(max(days)filter(where last_day>=p_today-1),0),'best',coalesce(max(days),0),'today',exists(select 1 from dates where day=p_today),'days',coalesce((select jsonb_agg(day order by day)from dates where day>=p_today-6),'[]'::jsonb)) into result from runs;
 return result;
 end;$$;

create function salah_competition_private.finalize_awards(p_now timestamptz default now())
returns integer language plpgsql security invoker set search_path='' as $$
 declare p record; added integer:=0; inserted integer;
 begin
 perform pg_advisory_xact_lock(31220261013);
 for p in
 select 'week'::text kind,d::date starts_on,(d+interval '7 days')::date ends_on from generate_series('2026-10-12'::date,(p_now at time zone 'Europe/Moscow')::date,interval '7 days')d
 union all select 'month',d::date,(d+interval '1 month')::date from generate_series('2026-10-01'::date,(p_now at time zone 'Europe/Moscow')::date,interval '1 month')d
 loop
 if (p.ends_on::timestamp at time zone 'Europe/Moscow')+interval '24 hours'>p_now then continue;end if;
 insert into salah_competition_private.award_periods(kind,starts_on,ends_on,finalized_at)values(p.kind,p.starts_on,p.ends_on,p_now)on conflict do nothing;
 if not found then continue;end if;
 insert into salah_competition_private.awards(user_id,kind,starts_on,ends_on,reciter,seconds,earned_at)
 select b.user_id,p.kind,p.starts_on,p.ends_on,b.reciter,b.seconds,p_now from public.competition_board(p.kind,p.ends_on-1)b where b.place=1 and b.seconds>0 on conflict do nothing;
 get diagnostics inserted=row_count;added:=added+inserted;
 end loop;
 return added;
 end;$$;
revoke all on function salah_competition_private.award_activity(uuid),salah_competition_private.award_streak(uuid,date),salah_competition_private.finalize_awards(timestamptz) from public,anon,authenticated;
grant execute on function salah_competition_private.award_activity(uuid),salah_competition_private.award_streak(uuid,date) to service_role;
-- Only the privileged scheduler can finalize calendar results; clients cannot select a future date.
revoke all on function salah_competition_private.finalize_awards(timestamptz) from service_role;
select cron.schedule('salah-quran-awards','10 0 * * *',$cron$select salah_competition_private.finalize_awards();$cron$);
