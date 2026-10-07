create schema if not exists salah_errors_private;
revoke all on schema salah_errors_private from public,anon,authenticated;
create table salah_errors_private.batches(
 id uuid primary key,ip_hash text not null check(ip_hash ~ '^[a-f0-9]{64}$'),
 created_at timestamptz not null default clock_timestamp(),units integer not null check(units between 1 and 20)
);
create index error_batch_rate on salah_errors_private.batches(ip_hash,created_at);
create table salah_errors_private.counts(
 day date not null,version integer not null check(version between 1 and 1000000),
 route text not null check(route in('home','knowledge','quran','adhkar','more','account','settings','calendar','qibla','umrah','support','learning','other')),
 kind text not null check(kind in('script','promise','resource','slow')),
 module text not null check(module in('app','quran','adhkar','qibla','support','settings','qr-login','account-devices','weather','other')),
 screen text not null check(screen in('phone','tablet','desktop')),
 count bigint not null check(count>0),primary key(day,version,route,kind,module,screen)
);
alter table salah_errors_private.batches enable row level security;
alter table salah_errors_private.counts enable row level security;
revoke all on all tables in schema salah_errors_private from public,anon,authenticated;
