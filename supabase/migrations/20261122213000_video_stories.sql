create schema salah_video_stories_private;
revoke all on schema salah_video_stories_private from public, anon, authenticated;
grant usage on schema salah_video_stories_private to service_role;

create table salah_video_stories_private.stories (
  id uuid primary key,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  expires_at timestamptz,
  removed_at timestamptz,
  highlighted boolean not null default false,
  hours smallint not null check (hours in (24,48)),
  bytes integer not null check (bytes between 16 and 25165824),
  mime_type text not null check (mime_type in ('video/mp4','video/quicktime')),
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  check ((published_at is null and expires_at is null) or
    (published_at is not null and expires_at is not null and expires_at = published_at + hours * interval '1 hour'))
);

alter table salah_video_stories_private.stories enable row level security;
revoke all on salah_video_stories_private.stories from public, anon, authenticated, service_role;
grant select, insert, update on salah_video_stories_private.stories to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('salah-video-stories','salah-video-stories',false,25165824,array['video/mp4','video/quicktime']);
