begin;
create schema salah_visits_private;
revoke all on schema salah_visits_private from public,anon,authenticated;
create table salah_visits_private.guest_days(
 device_hash text not null check(device_hash~'^[0-9a-f]{64}$'),
 day date not null,
 last_seen timestamptz not null,
 primary key(device_hash,day)
);
create index guest_days_last_seen_idx on salah_visits_private.guest_days(last_seen);
create index guest_days_retention_idx on salah_visits_private.guest_days(day);
create table salah_visits_private.budgets(bucket timestamptz primary key,hits integer not null check(hits between 1 and 300));
create table salah_visits_private.daily_budgets(day date primary key,hits integer not null check(hits between 1 and 20000));
create table salah_visits_private.tracking(singleton boolean primary key check(singleton),started_at timestamptz not null default clock_timestamp());
insert into salah_visits_private.tracking(singleton) values(true);
alter table salah_visits_private.guest_days enable row level security;
alter table salah_visits_private.budgets enable row level security;
alter table salah_visits_private.daily_budgets enable row level security;
alter table salah_visits_private.tracking enable row level security;
revoke all on all tables in schema salah_visits_private from public,anon,authenticated;
create index app_presence_app_seen_accounts on public.app_presence(app,last_seen,user_id);
comment on schema salah_visits_private is 'Write-only guest device statistics; aggregates restricted to freshly verified owner with MFA. No client roles or guest profiles.';
commit;
