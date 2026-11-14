-- Private, narrowly scoped credit controls. No anonymous/authenticated API access.
create table salah_competition_private.guest_credit_controls (
 guest_id uuid primary key references salah_competition_private.guest_players(public_id) on delete cascade,
 paused_at timestamptz,
 pause_token uuid not null default gen_random_uuid(),
 raw_totals jsonb not null default '{}'::jsonb,
 raw_days jsonb not null default '{}'::jsonb,
 excluded_totals jsonb not null default '{}'::jsonb,
 excluded_days jsonb not null default '{}'::jsonb,
 updated_at timestamptz not null default now(),
 resumed_at timestamptz,
 check(jsonb_typeof(raw_totals)='object' and jsonb_typeof(raw_days)='object' and jsonb_typeof(excluded_totals)='object' and jsonb_typeof(excluded_days)='object')
);
alter table salah_competition_private.guest_credit_controls enable row level security;
revoke all on salah_competition_private.guest_credit_controls from public,anon,authenticated;
grant select,insert,update,delete on salah_competition_private.guest_credit_controls to service_role;

-- Also protects a snapshot already running on an old function instance.
create function salah_competition_private.guard_guest_credit_hold() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if exists(select 1 from salah_competition_private.guest_credit_controls c where c.guest_id=new.guest_id and c.paused_at is not null) then return null; end if;
 return new;
end $$;
revoke all on function salah_competition_private.guard_guest_credit_hold() from public,anon,authenticated;
create trigger guest_totals_credit_hold before insert or update on salah_competition_private.guest_totals for each row execute function salah_competition_private.guard_guest_credit_hold();
create trigger guest_days_credit_hold before insert or update on salah_competition_private.guest_days for each row execute function salah_competition_private.guard_guest_credit_hold();
