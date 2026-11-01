begin;
create table if not exists salah_counter_private.account_context(
 user_id uuid primary key references auth.users(id) on delete cascade,
 city text check(city is null or (char_length(city) between 1 and 160 and city !~ '[[:cntrl:]]')),
 city_updated_at timestamptz,
 reading_page smallint check(reading_page between 1 and 604),
 reading_edition text check(reading_edition in ('madani','tajweed')),
 reading_observed_at timestamptz,
 reading_saved_at timestamptz,
 check((reading_page is null and reading_edition is null and reading_observed_at is null and reading_saved_at is null) or (reading_page is not null and reading_edition is not null and reading_observed_at is not null and reading_saved_at is not null))
);
alter table salah_counter_private.account_context enable row level security;
revoke all on salah_counter_private.account_context from public,anon,authenticated;
comment on table salah_counter_private.account_context is 'Latest account-selected prayer city and rendered mushaf checkpoint only; owner MFA API read, verified account-presence service write. No coordinates, IP location or reading history.';
commit;
