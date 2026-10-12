-- One-time listening milestones and exact calendar close.
alter table salah_competition_private.awards drop constraint awards_kind_check;
alter table salah_competition_private.awards add constraint awards_kind_check check(kind in('week','month','streak7','streak30','streak100','streak365'));
create unique index quran_award_milestone_once on salah_competition_private.awards(user_id,kind) where kind in('streak7','streak30','streak100','streak365');

create or replace function salah_competition_private.award_streak(p_user uuid,p_today date)
returns jsonb language plpgsql security invoker set search_path='' as $$
 declare first_day date; d date; heard date[]; protected date[]:='{}'; current_days integer:=0; best_days integer:=0; reserves integer:=3; refill_days integer:=0; series_start date; milestone record;
 begin
 select array_agg(a.day order by a.day)into heard from salah_competition_private.award_activity(p_user)a where a.day<=p_today;
 if heard is null then heard:='{}';end if;
 first_day:=heard[1];
 if first_day is not null then
 for d in select generate_series(first_day,p_today,interval '1 day')::date loop
  if d=any(heard)then
   if current_days=0 then series_start:=d;end if;
   current_days:=current_days+1;best_days:=greatest(best_days,current_days);refill_days:=refill_days+1;
   if refill_days=7 then reserves:=3;refill_days:=0;end if;
   for milestone in select * from(values('streak7',7),('streak30',30),('streak100',100),('streak365',365))m(kind,needed)where needed=current_days loop
    insert into salah_competition_private.awards(user_id,kind,starts_on,ends_on)values(p_user,milestone.kind,series_start,d)on conflict do nothing;
   end loop;
  elsif d<p_today and current_days>0 then
   if reserves>0 then reserves:=reserves-1;protected:=array_append(protected,d);
   else current_days:=0;refill_days:=0;reserves:=3;series_start:=null;end if;
  end if;
 end loop;end if;
 return jsonb_build_object('current',current_days,'best',best_days,'today',p_today=any(heard),'days',coalesce((select jsonb_agg(x order by x)from unnest(heard)x where x>=p_today-6),'[]'::jsonb),'freezes',reserves,'refillDays',refill_days,'protectedDays',coalesce((select jsonb_agg(x order by x)from unnest(protected)x where x>=p_today-6),'[]'::jsonb));
 end;$$;
revoke all on function salah_competition_private.award_streak(uuid,date)from public,anon,authenticated;
grant execute on function salah_competition_private.award_streak(uuid,date)to service_role;
-- The shared weekly/monthly first-place rule is unchanged.
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
 select b.user_id,p.kind,p.starts_on,p.ends_on,b.reciter,b.seconds,p_now from public.competition_board(p.kind,p.ends_on-1)b where b.place=1 and b.seconds>0 on conflict do nothing;
 get diagnostics inserted=row_count;added:=added+inserted;
 end loop;return added;end;$$;
revoke all on function salah_competition_private.finalize_awards(timestamptz)from public,anon,authenticated,service_role;
-- Runs on minute boundaries, including 00:00 Moscow on Monday/the first of the month.
select cron.schedule('salah-quran-awards','* * * * *',$cron$select salah_competition_private.finalize_awards();$cron$);
