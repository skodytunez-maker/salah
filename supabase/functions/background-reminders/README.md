# SALAH background Web Push

The generated index.ts is deployed as background-reminders. JWT verification is disabled **only for this public device endpoint**; owner-access retains its existing MFA. The handler authenticates each subscription change by a separate random 256-bit device capability (only its SHA-256 digest is stored), and dispatch requires a database-generated server secret. No auth user, prayer history, adhkar count or email is uploaded.

1. Run migration 2026100201_background_reminders.sql in the SALAH project after owner approval.
2. Deploy index.ts with postgres@3.4.9 and web-push@3.6.7. SUPABASE_DB_URL is the built-in server-only connection. The public configuration generates and retains one VAPID keypair privately on first use.
3. Verify public config, denial of unauthenticated dispatch and cross-origin requests, plus schema grants/RLS. Do not inspect device tokens or subscription keys in reports.
4. Run migration 2026100202_background_reminders_cron.sql after these checks. It calls dispatch once per minute; the cron query retrieves its secret privately at execution.
5. Publish the app. Each user opts in on their own device. On iPhone use the Home Screen web app on iOS 16.4 or later. The first registration checks the push gateway and sends a fixed welcome notification. Test on the physical installed device with the screen locked.

The master reminder switch, city, method, Asr variant, high-latitude rule, calculation offsets, explicit local-table offsets, legacy personal times and selected adhkar times/modes are synchronized. Aladhan receives city coordinates/calculation parameters for non-Tyumen schedules, as in the existing app. Approved Tyumen rows come from the public SALAH bundled table; no unsupported month is fabricated.

Endpoint requests are limited to official Apple/FCM/Mozilla/Windows push hosts. Delivery uses a short expiry, a private deduplication ledger and bounded retries. Existing saved settings and backup allow-lists exclude subscription credentials. Private responses are never cached.

Subscription retention: 90 days without use; notification ledger: 7 days; rate-limit counters: 24 hours. The user can unsubscribe/delete their device's row. Expired browser subscriptions are disabled and sensitive payload cleared on HTTP 404/410. RLS is enabled with no public policies, and the private schema is excluded from the Data API. The existing Data API setting remains disabled.

Web Push carries a system notification sound; it cannot automatically play the full Azan in a locked iPhone PWA. Delivery depends on network, OS notification permission and Focus settings. There is no guarantee of exact-second delivery. A scheduler outage does not replay old prayers.

Operational limits in this pilot: 1000 device rows, 20 new subscriptions/minute globally, 10/minute per hashed gateway peer, 10 preference writes/minute per device, 1 test/minute per device. Increase capacity only after observing load and abuse.

Build: node scripts/build-push-function.mjs
Verify: node scripts/build-push-function.mjs --check; node scripts/check-push.mjs; node scripts/check-push-client.mjs

Pause delivery reversibly with: select cron.unschedule('salah-background-reminders'); No personal settings need to be cleared.

Adhkar defaults follow Fajr (morning) and Maghrib (evening); previously saved custom HH:mm values retain manual mode. Published Tyumen times are unchanged until a user explicitly adjusts tableOffsets; old calculation offsets continue to be separate.

## Optional return-to-dhikr reminders
Users opt in separately (disabled by default). Only the last use timestamp from this installation is included in the private subscription preferences; no count, text, history or account identity is uploaded. The first reminder waits 2 or 3 full days from opt-in/latest use, then follows Dhuhr in the selected timetable. Unavailable or out-of-window Dhuhr falls back to 12:00 city-local. This reminder is never sent between 22:00 (inclusive) and 08:00 (exclusive); short gateway expiry and a receive-time worker check discard delayed inactivity notices. Prayer, morning/evening adhkar, Friday and Tahajjud notifications keep their own chosen schedules. Subsequent opportunities are separated by the chosen number of calendar days; short sourced excerpts alternate. A server cooldown and delivery ledger prevent repeated dispatch; preferences are checked again before sending to cancel a late return or opt-out. No database schema changes are required. Prayer-provider availability is unnecessary for a dhikr-only subscription.
