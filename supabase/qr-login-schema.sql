-- QR requests are transient, inaccessible to browser/Data API roles.
create schema if not exists salah_qr_private;
revoke all on schema salah_qr_private from public, anon, authenticated;
create table salah_qr_private.requests (
 id uuid primary key,
 poll_hash text not null check (poll_hash ~ '^[a-f0-9]{64}$'),
 approval_hash text not null check (approval_hash ~ '^[a-f0-9]{64}$'),
 pairing_code text not null check (pairing_code ~ '^[0-9]{6}$'),
 device text not null check (device in ('computer','tablet','phone')),
 ip_hash text not null check (ip_hash ~ '^[a-f0-9]{64}$'),
 created_at timestamptz not null default clock_timestamp(),
 expires_at timestamptz not null,
 state text not null default 'pending' check (state in ('pending','approved','denied','consumed')),
 user_id uuid references auth.users(id) on delete cascade,
 session_id uuid,
 check ((state in ('pending','denied') and user_id is null and session_id is null) or
        (state in ('approved','consumed') and user_id is not null and session_id is not null))
);
alter table salah_qr_private.requests enable row level security;
revoke all on salah_qr_private.requests from public, anon, authenticated;
create index qr_requests_rate on salah_qr_private.requests(ip_hash,created_at);
create index qr_requests_expiry on salah_qr_private.requests(created_at);
