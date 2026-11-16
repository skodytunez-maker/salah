# Selected prayer city on app entry

The existing account and guest app-state heartbeat can include `selectedCity` as
`{city, country}` or `null`. This is the prayer city explicitly selected in SALAH,
not a physical location. Coordinates, IP-derived geography, time zones and client
timestamps are not accepted in this field. City and country strings are bounded
to 160 characters and reject control characters and unexpected fields.

The additive `app_entry_selected_city` migration stores the latest explicit value
and its server receipt time in the existing private app-state row. An omitted
field from an older client preserves that row's previous context. An explicit
null records a timestamped clear. Normal sequence, session, rate and 24-hour
state retention rules still apply. This adds no request, activity kind, visit,
trusted action or competition credit.

Only the owner app-state reader returns `selectedCity: {city, country,
reportedAt}` or null, behind the unchanged owner identity, active-session and
MFA checks. It selects the newest explicit context for the same actor: app-state
and saved account context for an account; app-state and legacy guest activity
for a guest. A newer clear suppresses older fallbacks. Equal receipt times prefer
the chosen current tab, then app-state, saved account context, legacy guest
activity, and a stable tab/kind key. Future receipts are ignored.

The saved account context and reading checkpoint are not rewritten by this
transport. Historical guests never borrow a claimed account's city. Public
activity counts, rankings and profiles do not receive the private field.

The PostgreSQL checks in `check-app-state-sql.mjs` and
`check-owner-app-state.mjs` exercise entry without playback, legacy omission,
explicit clearing, rejected payloads and replays, newest-source ordering,
deterministic ties, historical guest isolation, unchanged credit/counts,
retention, RLS and owner/session/MFA enforcement.
