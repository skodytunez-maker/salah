begin;
-- Latest self-reported prayer city only; reuse the existing bounded owner state.
alter table salah_visits_private.app_state_presence
 add column selected_city text,
 add column selected_country text,
 add column selected_context_at timestamptz,
 add constraint app_state_selected_city_length check(selected_city is null or(length(selected_city)between 1 and 160 and selected_city=btrim(selected_city)and selected_city!~'[[:cntrl:]]')),
 add constraint app_state_selected_country_length check(selected_country is null or(length(selected_country)between 1 and 160 and selected_country=btrim(selected_country)and selected_country!~'[[:cntrl:]]')),
 add constraint app_state_selected_context check((selected_city is not null and selected_context_at is not null)or(selected_city is null and selected_country is null));
comment on column salah_visits_private.app_state_presence.selected_city is 'Self-reported prayer city selected in SALAH, never physical location, coordinates or IP-derived. Read only through verified owner session and MFA.';
comment on column salah_visits_private.app_state_presence.selected_context_at is 'Server receipt time of an explicit selected-city value or null clear. Legacy omission does not change it; bounded by the existing 24-hour state retention.';
comment on table salah_visits_private.app_state_presence is 'Latest section/player state, last trusted interaction and explicit selected prayer city for verified owner with live session and MFA. Bounded 24h state, no coordinates, physical location, content or movement history.';
commit;
