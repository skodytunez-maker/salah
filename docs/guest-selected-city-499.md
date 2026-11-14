# Guest selected prayer city

Release499 adds the city and optional country explicitly selected in SALAH to guest activity heartbeats. It does not request GPS access, derive a location from IP, send coordinates, or infer the city from a browser timezone. It is a self-reported application setting, not proof of physical location.

The client sends `selectedCity: { city, country }` or explicit `null` with the existing guest activity packet. Names are bounded to160characters and control characters are rejected. No page, verse, reciter, IP address, account name, or extra identifier is added to that packet. Identity reset stop packets retain the previous guest's captured context instead of reading a newly signed-in profile.

The existing private, transient `salah_visits_private.guest_activity_presence` table stores three nullable columns: `selected_city`, `selected_country`, and `selected_context_at`. The timestamp records the last explicit context report or clearing. Omitted context from an older client preserves a previously supplied context on that tab; explicit `null` clears it. Per-tab sequence checks also protect context against late packets. The current transient retention and private RLS/revoked client grants remain in force. No new history or identity table is created.

Only the existing owner activity endpoint returns selected-city context, after its verified owner, active-session and MFA checks. It allows only city, optional country and report timestamp. Public activity reads continue to contain only the three aggregate counts. Staff, support and public rankings receive no geography.

The owner live list labels the value as the selected city and shows «Город не передан» for missing context. A client predating499 cannot populate its selected city until the new code runs. The owner API includes `reportedAt` so an old preserved report is distinguishable from a new observation.

Where a guest has an unclaimed Top ledger, the owner activity list uses that ledger's persisted stone nickname through the existing activity-hash link and private guest-alias table. This is the same display name as Top. It does not merge histories or reveal raw device hashes. A guest without a matching ledger is shown simply as «Гость»; opening an activity list does not create a guest ledger or alias.

Apply the generated migration before deploying the listening-now and owner-access handlers. The client module and owner UI can then be released. Tests use an isolated PGlite database and mocked DOM/network; they do not change production data. Production readiness must be verified by the parent workflow after deployment, without inventing a city when an older client has not sent one.
