# SALAH diagnostics delivery

Client reports keep the existing anonymous POST format. The owner summary
keeps the same session and MFA verification as the rest of the owner console.

## Confirmed in version 547

The client removed a batch before the server acknowledged it. Network failure,
HTTP 429, HTTP 503 and a restart while offline could lose a report. The
20-event cap was applied for the whole launch. The public production audit
confirmed the function was reachable, but did not establish why a particular
iPhone produced no report.

## Delivery and privacy

- The browser, PWA and native web view use the same queue. It contains only an
  event ID, capture time, app version and allowlisted categories. It expires
  pending reports after 24 hours. Up to 60 pending events and 20 new regular
  events per 15 minutes per running app bound storage and reporting load.
- The client retries transient failures with backoff. It keeps the original
  batch ID across attempts and restarts. The database counts a batch once.
  If storage cannot write a diagnostic report, the client can hold the report
  in memory for the current session and shows the storage limitation.
- Consent, the audience restriction and Do Not Track apply to capture and send.
  Turning reporting off cancels local retries and discards pending reports.
  Normal reports carry no account credentials. An explicit owner test uses the
  existing owner session for authorization only. Its receipt contains only a
  test ID, version and receipt time, separate from incident counts.

## Returning from the reciter list

When Back reaches the expanded Quran player's own history entry, the app
attempts to restore the still-available player. A failed restoration queues
one `quran` report in the `quran-navigation` module. It uses the existing
action-failure kind so older owner consoles can still open the summary.
Updated consoles show the group as a navigation failure. An ordinary
transition, a cancelled gesture or an already closed playback session
produces no report. The payload contains no title, reciter, listening
position or URL. Previously reported issues are kept in the issue journal.

## Local verification

Use the existing pinned `tests/staff` dependencies, then run
`node scripts/check-error-summary.mjs`. The test executes the production
handler and SQL against local PGlite, with a simulated transport and owner
identity. It verifies a real fault and a synthetic owner test independently,
including a commit followed by a lost reply. The real iOS installation and
Supabase deployment require their own verification.

## Deployment sequence after approval

1. Verify `supabase/error-summary-test-schema.sql` has been applied, then apply
   the reviewed Quran-navigation migration. It expands a constraint on the
   private aggregate table. The POST format and owner read contract stay
   compatible with older clients.
2. Deploy the updated `error-summary` function. Verify owner-only reads and the
   private table grants. Deploy the client only after its release scope is reviewed.
3. Configure a dedicated `DIAGNOSTIC_HEALTH_TOKEN` for the Edge function and
   `SALAH_DIAGNOSTIC_HEALTH_TOKEN` for the independent monitor. Set
   `SALAH_DIAGNOSTIC_URL` to the deployed diagnostic Edge Function. Run
   `node scripts/probe-error-summary.mjs` from the monitoring environment.
   A failed check exits nonzero. The probe only reads service health and does
   not generate events or authenticate as the owner. Use the secrets manager
   to provide the token.
4. On an actual iPhone, enable diagnostics and run **Test delivery** in the owner
   console. Verify its timestamp appears and the actual error totals do not
   change. Verify that an offline test queues and reaches the console after
   reconnect. The test confirms the web-view delivery path.

Functional checks and recovery should use specific, allowlisted outcomes from
each module. Native iOS crash reports require a separate collection path.
Any later AI analysis should read aggregate diagnostics only and produce
reviewable findings without write access or release credentials.
