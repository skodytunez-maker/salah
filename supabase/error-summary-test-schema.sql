-- Apply after error-summary-schema.sql. Test receipts are separate from real faults.
create table if not exists salah_errors_private.test_receipts (
 id uuid primary key,
 version integer not null check (version between 1 and 1000000),
 created_at timestamptz not null default clock_timestamp()
);
create index if not exists diagnostic_test_receipt_recency on salah_errors_private.test_receipts (created_at desc);
alter table salah_errors_private.test_receipts enable row level security;
revoke all on salah_errors_private.test_receipts from public, anon, authenticated;
