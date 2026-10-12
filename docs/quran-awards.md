# Quran awards — release 312

Profile: a plain daily listening counter (one minute of Quran, any reciter), current and best consecutive series, seven days. No 7/30-day reward badges. Two award types only: weekly silver and monthly gold. Repeat wins remain one visible type with a count and dated history.

Automatic calendar finalization uses the existing competition_board: a listener is represented by the single reciter with the highest time, never the sum of all reciters. Ties receive equal first-place awards. One weekly result per user/period; first eligible week starts 2026-10-12; first eligible month starts 2026-10-01. Existing saved seconds are used; no historical winners before launch are fabricated. Calendar closes in Europe/Moscow; 24 hours of synchronization grace, daily job at 00:10 UTC. First weekly award is eligible on 2026-10-20, first monthly on 2026-11-02. Late uploads after finalization do not rewrite awards. Empty periods are finalized once.

Personal daily series uses the existing per-device saved local-day data and the account time zone. Legacy and migrated daily sources are merged using the same max/initial-growth semantics as competition scores, then reciters are combined for the daily minute threshold. Yesterday remains current until the end of today; missed day resets current, preserves best. Days are server-derived, no award for merely opening the app.

Private schema, RLS enabled, all anon/authenticated grants revoked. Only verified confirmed account with current live session reads its own collection via the existing custom-auth Edge endpoint. Internal privileged scheduler finalizes awards; service_role cannot choose a future date. Public completed-winner projection filters current participation, visibility, confirmed account and anonymous-account flag; no auth user IDs or private dates are exposed publicly. Public IDs, nickname and photo are projected only under the existing chosen profile visibility; anonymous users retain initials, no photo. Account deletion cascades awards.

Winner card: actual saved seconds and selected reciter; 1080x1920 PNG, brand above and Saadi Kobilov inside story-safe margins. Native share uses prepared files, otherwise saves image. No social posts or messages are sent automatically. Refresh visibility before opening a card; local identity/privacy changes close an open export.

CI runs application contracts, isolated actual PostgreSQL rules and isolated DOM interactions. No production listening time, user preference or winner is altered for testing.
