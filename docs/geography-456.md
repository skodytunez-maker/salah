# 456 — Compact guests and consistent geography

The guest counter started with455 on3November2026. Selecting seven days does not reconstruct visits before collection began. The initial one-device count includes the ordinary application verification visit. No counting logic changes in456.

Keep two compact counts, period and collection start visible; put the explanation behind an accessible button. Mobile fixture at402×874 measures the compact card at about157CSSpx. Fixture data and member names are explicitly synthetic, external connections are disabled.

Normalize selected city/country data with one bounded fallback catalog shared by client, account-presence, owner-access and an immutable private SQL helper. Known legacy Тюмень without a country becomes Тюмень, Россия. Recognized appended country names and case/English aliases coalesce. Unknown cities do not acquire a guessed country, and an explicitly supplied different country is preserved. The fallback catalog comes from the existing city seed and current saved city/country pairs.

The migration updates only existing account_context.city/country values that differ from their canonical values. Prayer settings on phones, coordinates, Quran reading checkpoints, city_updated_at and visit times are untouched. The private pure mapping helper is SECURITY INVOKER with a fixed pg_catalog search path; public, anon and authenticated cannot execute it.

City/country rows open a bounded paginated member list for the same rolling1/7/30-day period. Confirmed nonanonymous accounts are counted once despite multiple tabs. Cities with the same name in different countries remain separate. A row opens the existing private profile and returns to the originating row with focus. Period switches, disposal and authorization failures discard stale lists. Restoring the website chart's last valid period also restores the guest and geography period.

The new geography-users mode retains the exact confirmed owner/live-session/MFA gate, accepts strict bounded parameters, binds SQL values and sanitizes the existing user-header format. No guest identity list, public accounts, staff access, or role grants are added. The Top title-selection prefix remains exactly the shared source.

Deployment order: apply20261103092602_canonical_account_locations.sql once; update account-presence and owner-access; publish456. Keep downloaded owner-accessv26 and account-presencev13 backups outside the app. No shared reminder dispatcher, campaigns, notification permissions or Auth settings change. Verify canonical totals and schema privileges after deployment, then normal455→456 update. Do not send notifications as part of this change. Preserve announcement425, artwork/acknowledgment/expiry, native minimum445, all Top rules and closed sections.
