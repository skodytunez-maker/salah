-- Latest account-selected prayer country. No GPS coordinates or visit history.
alter table salah_counter_private.account_context add column country text
 check (country is null or (city is not null and length(btrim(country)) between 1 and 160 and country !~ '[[:cntrl:]]'));
comment on column salah_counter_private.account_context.country is 'Country from the existing selected prayer city; optional for older clients. Owner MFA read only.';
-- The private table's existing RLS and grants remain unchanged.
