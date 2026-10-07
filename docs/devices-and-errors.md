# Account devices and owner error summary

## Devices (implemented first)

The signed-in account has a collapsed «Мои устройства» section. Loading occurs
only on expansion. Sessions are paginated in groups of 50 with the current session
kept visible. Device/browser labels come from bounded known user-agent patterns;
the response contains session ID, inferred label, current marker and creation
time only. No raw user agent, IP, email, access/refresh token or worship data is
returned. Multiple sessions can correspond to one physical device (for example,
Safari and an installed PWA). These are the common SALAH/SAHABA account's Auth
sessions; SK Greens uses a separate project and is unaffected.

Every request checks Auth getUser/getClaims, issuer/subject, a confirmed
nonanonymous account and the current live session including not_after. Enrolled
MFA requires aal2. A revoke requires the target to belong to the caller, differ
from the current session, and have a still-active calling session. The same
predicates are present in the atomic DELETE, not just the browser. The existing
refresh_tokens session FK was checked: ON DELETE CASCADE. The other device loses
renewal; existing SALAH private endpoints additionally check active sessions and
fail closed. Standard Supabase access tokens can remain valid until expiry for
direct Auth APIs that do not check live sessions; no claim of immediate universal
token invalidation is made. No Auth settings or token lifetime are changed.

The UI has a second inline confirmation and offers no current-session revoke.
Existing account sign-out remains available. No real sessions are revoked during
agent tests; test users/session IDs are synthetic.

## Error summary (implemented second)

The verified owner's overview has collapsed «Сводка ошибок», with 1/7/30-day
periods. Its server GET delegates owner identity, live-session and MFA authority
to the existing owner-access gate. It returns aggregate counts only, limited to
the first 100 groups by frequency. Empty results mean «Пока нет отчётов», not proof
of an error-free app. Session revocation and account functions are separate from
the public diagnostic ingestion endpoint.

Diagnostics is OFF by default, has an explicit «Сообщать о сбоях» switch in a
collapsed settings section, respects Do Not Track and foreground state. Only
enumerated route, script/promise/resource/long-task kind, enumerated module,
screen-size category, app version and count are sent. URL parameters, city,
identity, exception text, stack, messages and Quran/adhkar activity are excluded.
Long tasks are reported only where PerformanceObserver supports them and duration
is at least 2 seconds; this does not detect every kind of freeze or caught error.

Counts are coalesced in memory, at most 20 events per launch and 10 groups per
batch, with no persistent queue and no retries after failures. Each batch has a
random UUID; the database deduplicates it atomically and bounds intake to 100
events per daily HMAC IP pseudonym per UTC day (server-only key, domain separated). IP is not retained in plaintext or shown to the
owner. Private RLS tables have no anon/authenticated schema/table access. Counts
older than 30 days and intake rate records older than 2 days are removed on the
next ingestion (not a guaranteed background timer). The diagnostic consent key
is separate from personal worship backups; opting out stops future sending and
clears queued counts, without undoing already received anonymous aggregates.

The summary shows coarse symptoms, not exception-level root causes. Existing
optional diagnostics/photo attachments in support remain unchanged. No owner
features or private maintenance notes appear in public release announcements.
