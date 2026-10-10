-- Preserve existing RLS and privileges. Extra seconds support explicit one-time corrections.
alter table public.reciter_popularity_minutes add column if not exists extra_seconds integer not null default 0 check(extra_seconds between 0 and 59);
