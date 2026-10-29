-- Private homework exchange, restricted to verified classroom API.
create table if not exists salah_classroom_private.homework_submissions (
 lesson_id text not null references salah_classroom_private.lessons(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 homework_revision integer not null check(homework_revision>0),
 version integer not null check(version>0),details jsonb not null,
 updated_at timestamptz not null default now(),
 primary key(lesson_id,user_id,homework_revision)
);
create table if not exists salah_classroom_private.homework_files (
 id text primary key check(id ~ '^[A-Za-z0-9_-]{32}$'),
 lesson_id text not null references salah_classroom_private.lessons(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 homework_revision integer not null check(homework_revision>0),
 object_path text not null unique,
 mime text not null check(mime in('image/jpeg','image/png','image/webp','audio/mp4','audio/x-m4a','audio/mpeg','audio/webm','audio/ogg','audio/wav','audio/x-wav')),
 kind text not null check(kind in('audio','photo')),
 bytes integer not null check(bytes between 12 and 6291456),
 state text not null default 'pending' check(state in('pending','ready','submitted','invalid','deleted')),
 created_at timestamptz not null default now()
);
create index if not exists classroom_homework_user on salah_classroom_private.homework_submissions(user_id,updated_at desc);
create index if not exists classroom_homework_files_user on salah_classroom_private.homework_files(user_id,created_at);
create index if not exists classroom_homework_files_lesson on salah_classroom_private.homework_files(lesson_id,user_id,homework_revision);
alter table salah_classroom_private.homework_submissions enable row level security;
alter table salah_classroom_private.homework_files enable row level security;
revoke all on salah_classroom_private.homework_submissions,salah_classroom_private.homework_files from public,anon,authenticated;

-- Signed URLs are issued only by the verified backend.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('salah-homework-private','salah-homework-private',false,6291456,array['image/jpeg','image/png','image/webp','audio/mp4','audio/x-m4a','audio/mpeg','audio/webm','audio/ogg','audio/wav','audio/x-wav'])
on conflict(id) do nothing;
do $$ begin
 if exists(select 1 from storage.buckets where id='salah-homework-private' and (public or file_size_limit is distinct from 6291456)) then
  raise exception 'Existing homework bucket configuration must be reviewed before activation';
 end if;
end $$;
-- Restrictive policy also denies this bucket if unrelated permissive policies allow all buckets.
create policy salah_homework_private_guard on storage.objects as restrictive for all to anon,authenticated
using(bucket_id<>'salah-homework-private') with check(bucket_id<>'salah-homework-private');
