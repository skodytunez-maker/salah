-- Calendar leaders use the same all-reciter total as the default public Top.
-- The favorite-reciter board stays separate and unchanged. Existing finalized
-- awards are not rewritten here; any correction requires a separate review.
create function salah_competition_private.award_total_board(p_period text,p_day date)
returns table(user_id uuid,reciter text,seconds bigint,place bigint)
language sql stable security invoker set search_path='' as $$
 with heard as(
  select s.*,sum(s.seconds)over(partition by s.user_id)::bigint total_seconds,
   row_number()over(partition by s.user_id order by s.seconds desc,case when s.reciter=f.reciter then 0 else 1 end,s.reciter)favorite
  from public.competition_scores(p_period,p_day)s
  join salah_competition_private.preferences p using(user_id)
  join public.reciter_listener_visibility v using(user_id)
  join auth.users u on u.id=s.user_id
  left join salah_competition_private.favorite_state f on f.user_id=s.user_id and f.period=p_period
   and f.bucket=case p_period when 'week'then date_trunc('week',p_day::timestamp)::date when 'month'then date_trunc('month',p_day::timestamp)::date end
  where p_period in('week','month') and p.enabled and v.mode in('initial','profile')
   and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false)
 ), leaders as(select h.user_id,h.reciter,h.total_seconds as seconds from heard h where h.favorite=1)
 select l.user_id,l.reciter,l.seconds,rank()over(order by l.seconds desc)place from leaders l order by l.seconds desc,l.user_id;
$$;
revoke all on function salah_competition_private.award_total_board(text,date) from public,anon,authenticated,service_role;

create or replace function salah_competition_private.finalize_awards(p_now timestamptz default now())
returns integer language plpgsql security invoker set search_path='' as $$
 declare p record;added integer:=0;inserted integer;
 begin
 perform pg_advisory_xact_lock(31220261013);
 for p in
 select 'week'::text kind,d::date starts_on,(d+interval '7 days')::date ends_on from generate_series('2026-10-12'::date,(p_now at time zone 'Europe/Moscow')::date,interval '7 days')d
 union all select 'month',d::date,(d+interval '1 month')::date from generate_series('2026-10-01'::date,(p_now at time zone 'Europe/Moscow')::date,interval '1 month')d
 loop
 if (p.ends_on::timestamp at time zone 'Europe/Moscow')>p_now then continue;end if;
 insert into salah_competition_private.award_periods(kind,starts_on,ends_on,finalized_at)values(p.kind,p.starts_on,p.ends_on,p_now)on conflict do nothing;
 if not found then continue;end if;
 insert into salah_competition_private.awards(user_id,kind,starts_on,ends_on,reciter,seconds,earned_at)
 select b.user_id,p.kind,p.starts_on,p.ends_on,b.reciter,b.seconds,p_now from salah_competition_private.award_total_board(p.kind,p.ends_on-1)b where b.place=1 and b.seconds>0 on conflict do nothing;
 get diagnostics inserted=row_count;added:=added+inserted;
 end loop;return added;end;$$;
revoke all on function salah_competition_private.finalize_awards(timestamptz) from public,anon,authenticated,service_role;
