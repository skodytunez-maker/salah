-- Isolated sandbox only. Remote migration version: 20261020095414.
-- Does not modify live subscriptions or schedule any jobs.
create schema salah_billing_test_private;
revoke all on schema salah_billing_test_private from public,anon,authenticated;
grant usage on schema salah_billing_test_private to service_role;
create table salah_billing_test_private.accounts (
 user_id uuid primary key references auth.users(id) on delete cascade,
 state jsonb not null check(coalesce(jsonb_typeof(state)='object' and state->>'environment'='test',false)),
 updated_at timestamptz not null default now(),
 check(octet_length(state::text)<262144)
);
alter table salah_billing_test_private.accounts enable row level security;
revoke all on salah_billing_test_private.accounts from public,anon,authenticated;
grant select,insert,update,delete on salah_billing_test_private.accounts to service_role;
create policy sandbox_server_only on salah_billing_test_private.accounts to service_role using(true) with check(true);
comment on table salah_billing_test_private.accounts is 'Private bounded sandbox ledger, no PAN/CVC. Not exposed through Data API. Cancellation clears reusable method tokens. Production payments are forbidden by the sandbox adapter.';
