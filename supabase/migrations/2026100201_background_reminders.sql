-- Private device capabilities. No table or policy is exposed through the Data API.
create schema if not exists salah_push_private;
revoke all on schema salah_push_private from public, anon, authenticated;
create extension if not exists pgcrypto with schema extensions;
create table if not exists salah_push_private.config (
 id smallint primary key check(id=1), vapid jsonb,
 cron_secret text not null default encode(extensions.gen_random_bytes(32),'hex'), lease_until timestamptz
);
insert into salah_push_private.config(id) values(1) on conflict do nothing;
create table if not exists salah_push_private.devices (
 id uuid primary key, token_hash text not null check(length(token_hash)=64),
 endpoint_hash text not null unique check(length(endpoint_hash)=64),
 subscription jsonb, preferences jsonb, enabled boolean not null default false,
 updated_at timestamptz not null default now()
);
create table if not exists salah_push_private.deliveries (
 device_id uuid not null references salah_push_private.devices(id) on delete cascade,
 event_hash text not null, event_at timestamptz not null,
 state text not null check(state in ('sending','sent','retry','expired')),
 claimed_at timestamptz not null, primary key(device_id,event_hash)
);
create table if not exists salah_push_private.cache(key text primary key,rows jsonb not null,expires_at timestamptz not null);
create table if not exists salah_push_private.limits(key text not null,minute bigint not null,n integer not null,primary key(key,minute));
alter table salah_push_private.config enable row level security;
alter table salah_push_private.devices enable row level security;
alter table salah_push_private.deliveries enable row level security;
alter table salah_push_private.cache enable row level security;
alter table salah_push_private.limits enable row level security;
revoke all on all tables in schema salah_push_private from public,anon,authenticated;
alter default privileges in schema salah_push_private revoke all on tables from public,anon,authenticated;
