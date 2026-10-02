begin;
create schema if not exists salah_counter_private;
revoke all on schema salah_counter_private from public,anon,authenticated;
create table if not exists salah_counter_private.components(
 user_id uuid not null references auth.users(id) on delete cascade,
 device uuid not null,sequence bigint not null check(sequence>0),
 seed jsonb not null default '{}'::jsonb,delta jsonb not null default '{}'::jsonb,
 primary key(user_id,device));
create table if not exists salah_counter_private.rates(user_id uuid primary key references auth.users(id) on delete cascade,minute bigint not null,n int not null);
alter table salah_counter_private.components enable row level security;
alter table salah_counter_private.rates enable row level security;
revoke all on all tables in schema salah_counter_private from public,anon,authenticated;
commit;
