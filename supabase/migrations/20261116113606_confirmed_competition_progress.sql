-- Shared fast/full growth accounting. No public API, credit policy or ledger reset.
create table salah_competition_private.sync_budgets(
 scope text primary key,
 user_id uuid references auth.users(id)on delete cascade,
 guest_id uuid references salah_competition_private.guest_players(public_id)on delete cascade,
 device_id uuid not null,
 available_seconds numeric not null check(available_seconds between 0 and 315360120),
 refilled_at timestamptz not null,
 last_full_at timestamptz,
 check(num_nonnulls(user_id,guest_id)=1)
);
create table salah_competition_private.progress_request_limits(
 scope text primary key,
 user_id uuid references auth.users(id)on delete cascade,
 guest_id uuid references salah_competition_private.guest_players(public_id)on delete cascade,
 minute timestamptz not null,attempts integer not null,last_at timestamptz not null,
 check(num_nonnulls(user_id,guest_id)=1)
);
create unique index sync_budgets_account_device on salah_competition_private.sync_budgets(user_id,device_id)where user_id is not null;
create unique index sync_budgets_guest_device on salah_competition_private.sync_budgets(guest_id,device_id)where guest_id is not null;
create index progress_limits_account on salah_competition_private.progress_request_limits(user_id)where user_id is not null;
create index progress_limits_guest on salah_competition_private.progress_request_limits(guest_id)where guest_id is not null;
create table salah_competition_private.progress_request_windows(
 bucket timestamptz primary key,hits integer not null
);
create table salah_competition_private.progress_request_days(
 day date primary key,hits integer not null
);
do $$declare name text;begin
 foreach name in array array['sync_budgets','progress_request_limits','progress_request_windows','progress_request_days']loop
 execute format('alter table salah_competition_private.%I enable row level security',name);
 execute format('revoke all on salah_competition_private.%I from public,anon,authenticated',name);
 execute format('grant select,insert,update,delete on salah_competition_private.%I to service_role',name);
 end loop;
end$$;

-- Separate from the presence/registration budget. Account and guest devices
-- share a bounded fast-channel budget without exhausting activity reporting.
create function salah_competition_private.allow_progress_window()
returns boolean language plpgsql security invoker set search_path='' as $$
declare stamp timestamptz:=clock_timestamp();allowed boolean;
begin
 insert into salah_competition_private.progress_request_windows(bucket,hits)values(date_trunc('minute',stamp),1)
 on conflict(bucket)do update set hits=progress_request_windows.hits+1 where progress_request_windows.hits<12000 returning true into allowed;
 if not coalesce(allowed,false)then return false;end if;
 allowed:=false;
 insert into salah_competition_private.progress_request_days(day,hits)values((stamp at time zone 'UTC')::date,1)
 on conflict(day)do update set hits=progress_request_days.hits+1 where progress_request_days.hits<1200000 returning true into allowed;
 if not coalesce(allowed,false)then return false;end if;
 delete from salah_competition_private.progress_request_windows where bucket<stamp-interval '2 minutes';
 delete from salah_competition_private.progress_request_days where day<(stamp at time zone 'UTC')::date-1;
 return true;
end$$;
create function salah_competition_private.allow_progress_request(p_user uuid,p_guest uuid,p_device uuid,p_global boolean default true)
returns boolean language plpgsql security invoker set search_path='' as $$
declare stamp timestamptz:=clock_timestamp();scope_key text;hits integer;
begin
 if num_nonnulls(p_user,p_guest)<>1 or p_device is null then return false;end if;
 if p_global and not salah_competition_private.allow_progress_window()then return false;end if;
 scope_key:=case when p_user is not null then 'account:'||p_user::text else 'guest:'||p_guest::text end||':'||p_device::text;
 insert into salah_competition_private.progress_request_limits(scope,user_id,guest_id,minute,attempts,last_at)
 values(scope_key,p_user,p_guest,date_trunc('minute',stamp),1,stamp)
 on conflict(scope)do update set minute=excluded.minute,attempts=case when progress_request_limits.minute=excluded.minute then progress_request_limits.attempts+1 else 1 end,last_at=excluded.last_at
 where(progress_request_limits.minute<>excluded.minute or progress_request_limits.attempts<90)
 and progress_request_limits.last_at<=stamp-interval '750 milliseconds' returning attempts into hits;
 return hits is not null;
end$$;

-- The slack is granted only when the budget is first created. Every subsequent
-- growth (full or compact) spends the same balance; elapsed server time refills it.
-- The full-sync timestamp is independent from per-second ledger updated_at.
create function salah_competition_private.consume_sync_budget(
 p_user uuid,p_guest uuid,p_device uuid,p_growth bigint,p_full boolean,
 p_seed_at timestamptz default null,p_seed_spent bigint default 0)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare stamp timestamptz:=clock_timestamp();scope_key text;b salah_competition_private.sync_budgets%rowtype;available numeric;slack integer;
begin
 if num_nonnulls(p_user,p_guest)<>1 or p_device is null or p_growth<0 or p_growth>315360000 or p_seed_spent<0 then raise exception 'invalid_growth';end if;
 scope_key:=case when p_user is not null then 'account:'||p_user::text else 'guest:'||p_guest::text end||':'||p_device::text;
 select * into b from salah_competition_private.sync_budgets where scope=scope_key for update;
 if not found then
  if not p_full then return jsonb_build_object('ok',false,'needsFull',true);end if;
  slack:=case when p_guest is null then 120 else 10 end;
  available:=least(315360120,greatest(0,slack+greatest(0,extract(epoch from(stamp-coalesce(p_seed_at,stamp))))-p_seed_spent));
  insert into salah_competition_private.sync_budgets(scope,user_id,guest_id,device_id,available_seconds,refilled_at,last_full_at)
  values(scope_key,p_user,p_guest,p_device,available,stamp,case when p_user is not null then p_seed_at end)returning * into b;
 end if;
 if p_full and p_user is not null and b.last_full_at>stamp-interval '10 seconds'then return jsonb_build_object('ok',false,'retry',true);end if;
 available:=least(315360120,b.available_seconds+greatest(0,extract(epoch from(stamp-b.refilled_at))));
 if p_growth>available then raise exception 'invalid_growth';end if;
 update salah_competition_private.sync_budgets set available_seconds=available-p_growth,refilled_at=greatest(stamp,refilled_at),last_full_at=case when p_full then stamp else last_full_at end where scope=scope_key;
 return jsonb_build_object('ok',true);
end$$;
revoke all on function salah_competition_private.allow_progress_window(),salah_competition_private.allow_progress_request(uuid,uuid,uuid,boolean),salah_competition_private.consume_sync_budget(uuid,uuid,uuid,bigint,boolean,timestamptz,bigint)from public,anon,authenticated;
grant execute on function salah_competition_private.allow_progress_window(),salah_competition_private.allow_progress_request(uuid,uuid,uuid,boolean),salah_competition_private.consume_sync_budget(uuid,uuid,uuid,bigint,boolean,timestamptz,bigint)to service_role;
