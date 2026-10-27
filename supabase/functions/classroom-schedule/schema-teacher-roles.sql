-- Owner-only teacher appointments. No classroom routes are opened by this schema.
create table if not exists salah_classroom_private.teachers(
 user_id uuid primary key references auth.users(id) on delete cascade,
 active boolean not null,
 revision integer not null check(revision>0),
 appointed_by uuid not null check(appointed_by='dc1eb1cc-6f8f-472f-a937-735fbfbba4b7'::uuid),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists salah_classroom_private.teacher_role_audit(
 id bigint generated always as identity primary key,
 user_id uuid not null,
 actor_id uuid not null check(actor_id='dc1eb1cc-6f8f-472f-a937-735fbfbba4b7'::uuid),
 active boolean not null,
 revision integer not null check(revision>0),
 changed_at timestamptz not null default now(),
 unique(user_id,revision)
);
alter table salah_classroom_private.teachers enable row level security;
alter table salah_classroom_private.teacher_role_audit enable row level security;
revoke all on salah_classroom_private.teachers,salah_classroom_private.teacher_role_audit from public,anon,authenticated;
revoke all on sequence salah_classroom_private.teacher_role_audit_id_seq from public,anon,authenticated;
create index if not exists teachers_active_updated on salah_classroom_private.teachers(updated_at desc) where active;
