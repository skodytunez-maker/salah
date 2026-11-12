-- Transient statuses only; no verses, dhikr text or repetition history.
create table salah_competition_private.activity_presence(
 user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in ('reading','dhikr')),
 tab_id uuid not null,
 session_id uuid not null references auth.sessions(id) on delete cascade,
 sequence integer not null check(sequence>=0),
 active boolean not null default false,
 reported_at timestamptz not null default clock_timestamp(),
 primary key(user_id,kind,tab_id)
);
alter table salah_competition_private.activity_presence enable row level security;
revoke all on salah_competition_private.activity_presence from public,anon,authenticated;
create index activity_presence_recent on salah_competition_private.activity_presence(reported_at);
create index activity_presence_session on salah_competition_private.activity_presence(session_id);

create table salah_visits_private.guest_activity_presence(
 device_hash text not null check(device_hash~'^[a-f0-9]{64}$'),
 kind text not null check(kind in('listening','reading','dhikr')),tab_id uuid not null,
 sequence integer not null check(sequence>=0),active boolean not null default false,
 reported_at timestamptz not null default clock_timestamp(),primary key(device_hash,kind,tab_id)
);
create index guest_activity_recent on salah_visits_private.guest_activity_presence(reported_at);
create table salah_visits_private.activity_budgets(bucket timestamptz primary key,hits integer not null check(hits between 1 and 1200));
create table salah_visits_private.activity_daily_budgets(day date primary key,hits integer not null check(hits between 1 and 120000));
create table salah_visits_private.activity_limits(device_hash text primary key check(device_hash~'^[a-f0-9]{64}$'),minute bigint not null,attempts integer not null check(attempts between 1 and 121));
alter table salah_visits_private.guest_activity_presence enable row level security;
alter table salah_visits_private.activity_budgets enable row level security;
alter table salah_visits_private.activity_daily_budgets enable row level security;
alter table salah_visits_private.activity_limits enable row level security;
revoke all on salah_visits_private.guest_activity_presence,salah_visits_private.activity_budgets,salah_visits_private.activity_daily_budgets,salah_visits_private.activity_limits from public,anon,authenticated;
