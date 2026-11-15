begin;
-- Owner-only current app state. No click contents, URLs, coordinates or movement history.
create table salah_visits_private.app_state_presence(
 actor text not null,
 tab_id uuid not null,
 user_id uuid references auth.users(id) on delete cascade,
 device_hash text,
 session_id uuid,
 sequence bigint not null check(sequence between 0 and 2147483647),
 visible boolean not null,
 section text not null check(section in('home','knowledge','quran','reciters','qibla','adhkar','more','settings','account','support','staff','lesson','radio','admin','other')),
 player_state text not null check(player_state in('playing','paused','stopped','unknown')),
 action_sequence bigint not null check(action_sequence between 0 and 2147483647),
 last_action_at timestamptz,
 credit_paused boolean,
 app_version integer not null check(app_version between 1 and 100000),
 reported_at timestamptz not null default clock_timestamp(),
 primary key(actor,tab_id),
 check((user_id is not null and device_hash is null and session_id is not null and actor='account:'||user_id::text) or (user_id is null and device_hash is not null and device_hash~'^[a-f0-9]{64}$' and session_id is null and actor='guest:'||device_hash))
);
create index app_state_presence_recency on salah_visits_private.app_state_presence(reported_at);
create index app_state_presence_account on salah_visits_private.app_state_presence(user_id) where user_id is not null;
create table salah_visits_private.app_state_limits(actor text primary key,minute bigint not null,attempts integer not null check(attempts between 1 and 91));
alter table salah_visits_private.app_state_presence enable row level security;
alter table salah_visits_private.app_state_limits enable row level security;
revoke all on salah_visits_private.app_state_presence,salah_visits_private.app_state_limits from public,anon,authenticated;
grant usage on schema salah_visits_private to service_role;
grant select,insert,update,delete on salah_visits_private.app_state_presence,salah_visits_private.app_state_limits to service_role;
comment on table salah_visits_private.app_state_presence is 'Last reported section/player state and last trusted interaction only, for verified owner with live session and MFA. Rows older than 24h removed in bounded maintenance; never a location or content log.';
commit;
