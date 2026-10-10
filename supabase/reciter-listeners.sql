create table public.reciter_listener_visibility(
 user_id uuid primary key references auth.users(id) on delete cascade,
 public_id uuid not null unique default gen_random_uuid(),
 listener_hash text not null check(listener_hash ~ '^[a-f0-9]{64}$'),
 mode text not null default 'hidden' check(mode in ('hidden','initial','profile')),
 updated_at timestamptz not null default now()
);
alter table public.reciter_listener_visibility enable row level security;
revoke all on public.reciter_listener_visibility from public,anon,authenticated;
grant all on public.reciter_listener_visibility to service_role;
create function public.reciter_popularity_rank_stats() returns table(reciter text,minutes bigint)
language sql stable security invoker set search_path=public,pg_temp as $$
 select m.reciter,sum(m.minutes)::bigint from public.reciter_popularity_minutes m
 where m.day>=current_date-29 group by m.reciter having sum(m.minutes)>=1
 order by sum(m.minutes) desc,m.reciter limit 33;
$$;
revoke all on function public.reciter_popularity_rank_stats() from public,anon,authenticated;
grant execute on function public.reciter_popularity_rank_stats() to service_role;
create index reciter_listener_visibility_hash on public.reciter_listener_visibility(listener_hash) where mode<>'hidden';
