-- Short-lived playback status only; never credits listening seconds or awards.
create table salah_competition_private.listener_presence(
 user_id uuid not null references auth.users(id) on delete cascade,
 tab_id uuid not null,session_id uuid not null references auth.sessions(id) on delete cascade,
 sequence integer not null check(sequence>=0),playing boolean not null,
 reported_at timestamptz not null default clock_timestamp(),primary key(user_id,tab_id)
);
create index listener_presence_session_idx on salah_competition_private.listener_presence(session_id);
create index listener_presence_reported_idx on salah_competition_private.listener_presence(reported_at);
create table salah_competition_private.listener_presence_limits(
 user_id uuid primary key references auth.users(id) on delete cascade,minute bigint not null,attempts integer not null check(attempts>0)
);
alter table salah_competition_private.listener_presence enable row level security;
alter table salah_competition_private.listener_presence_limits enable row level security;
revoke all on salah_competition_private.listener_presence,salah_competition_private.listener_presence_limits from public,anon,authenticated;
