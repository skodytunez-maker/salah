begin;
-- A guest may report only the prayer city selected in SALAH. This is not geolocation.
alter table salah_visits_private.guest_activity_presence
 add column selected_city text,
 add column selected_country text,
 add column selected_context_at timestamptz,
 add constraint guest_selected_city_length check(selected_city is null or (length(selected_city) between 1 and 160 and selected_city=btrim(selected_city) and selected_city!~'[[:cntrl:]]')),
 add constraint guest_selected_country_length check(selected_country is null or (length(selected_country) between 1 and 160 and selected_country=btrim(selected_country) and selected_country!~'[[:cntrl:]]')),
 add constraint guest_selected_city_context check((selected_city is not null and selected_context_at is not null) or (selected_city is null and selected_country is null));
alter table salah_visits_private.guest_activity_presence enable row level security;
revoke all on salah_visits_private.guest_activity_presence from public,anon,authenticated;
create index guest_players_live_alias on salah_competition_private.guest_players(activity_hash,created_at desc,public_id) where claimed_by is null;
comment on column salah_visits_private.guest_activity_presence.selected_city is 'Self-reported prayer city chosen in SALAH; owner-only through active session and MFA. Never IP/GPS-derived.';
comment on column salah_visits_private.guest_activity_presence.selected_context_at is 'Last explicit selected-city report, including explicit clearing; legacy heartbeats preserve prior context. Transient presence retention applies.';
commit;
