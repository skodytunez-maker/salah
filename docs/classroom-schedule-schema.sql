-- Applied migration:20261026114530_private_classroom_schedule.sql
create schema if not exists salah_classroom_private;
revoke all on schema salah_classroom_private from public,anon,authenticated;
create table if not exists salah_classroom_private.lessons(
 id text primary key check(id ~ '^[A-Za-z0-9_-]{32}$'), owner_id uuid not null references auth.users(id) on delete cascade,
 invite_hash text not null unique check(invite_hash ~ '^[a-f0-9]{64}$'), details jsonb not null,
 state text not null default 'planned' check(state in('planned','live','ended','cancelled')),
 revision integer not null default 1 check(revision>0), starts_at timestamptz not null,ends_at timestamptz not null,reminder_at timestamptz not null,
 created_at timestamptz not null default now(),check(reminder_at<starts_at and starts_at<ends_at)
);
create table if not exists salah_classroom_private.enrollments(
 lesson_id text not null references salah_classroom_private.lessons(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 nickname text not null check(length(nickname) between 1 and 40),reminders_enabled boolean not null default false,
 created_at timestamptz not null default now(),primary key(lesson_id,user_id)
);
create table if not exists salah_classroom_private.limits(
 user_id uuid not null references auth.users(id) on delete cascade,minute bigint not null,attempts integer not null default 1,primary key(user_id,minute)
);
alter table salah_classroom_private.lessons enable row level security;
alter table salah_classroom_private.enrollments enable row level security;
alter table salah_classroom_private.limits enable row level security;
revoke all on all tables in schema salah_classroom_private from public,anon,authenticated;
create index if not exists classroom_reminder_due on salah_classroom_private.lessons(reminder_at) where state='planned';
create index if not exists classroom_enrolled_user on salah_classroom_private.enrollments(user_id);

create index if not exists classroom_owner_schedule on salah_classroom_private.lessons(owner_id,starts_at);
