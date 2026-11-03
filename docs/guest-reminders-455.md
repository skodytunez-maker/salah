# 455 deployment and verification

Base: published454 (`a6c01e3de255fba360ac5a733ac1bdcfd4a2b4bf`). Google Play Alpha445 is already available to selected testers; a tester must install that native update through Google Play. The old338 screen alone does not identify the installed native package. No new Play rollout is part of this change.

Guests are random persistent device IDs, hashed with SHA-256 on the server. No fingerprint, email, nickname, coordinates or raw IP is stored in the counter. Authentication starts unresolved, becomes resolved only after the existing session guard completes, and is unresolved again during rechecks or Auth outages. There is no anonymous Auth signup or change to refresh-token coordination. Multiple tabs and days deduplicate by device hash for each rolling period; clearing storage or using another device can count again. Guests that later sign in can occur in both cohorts, so these counts must not be summed as people.

The public guest endpoint accepts only bounded POSTs from exact application origins and returns no data. Private deny-all RLS tables are inaccessible to anon/authenticated roles. Atomic global budgets bound accepted traffic to300 requests/minute and20000/day; the client backs off and sends at most once per30 foreground minutes after success. Old guest rows are removed during counter maintenance, and reports cover only the last1/7/30 days. Owner aggregate reads retain confirmed owner ID, verified live session and enrolled aal2/TOTP gates. The report records collection start and does not reconstruct past guests. Existing GoatCounter website statistics remain separate and are not used to subtract/infer guests.

Return reminders are manual: Users → Remind inactive → period/text → Preview → explicit Send. Preview does not send; Cancel stops pending jobs. Only previously connected and permitted devices are eligible. The server rechecks current inactivity, confirmation, session, permission, device and cooldown under a lease; one device/account, weekly cooldown,08:00–22:00 in its selected city timezone,120-second TTL, at most3 attempts with backoff. No extra city or notification switch is introduced. Existing prayer/support/staff/classroom branches remain intact. The original held worker contained duplicate new service-worker clauses; this rebase includes each clause once.

## Production changes requiring approval

1. Apply only `20261103080537_guest_device_visits.sql`, including a supporting `(app,last_seen,user_id)` presence index. The existing campaign migration was already applied and must not be replayed.
2. Deploy new `guest-presence` with platform JWT verification disabled because it is write-only public telemetry; its handler enforces the origin/body/quotas. Deploy the updated `owner-access` with all existing identity/MFA checks unchanged.
3. Replace shared `background-reminders`v23 with the reproducible candidate bundle. This action previously failed automatic approval review because the same worker serves prayer/support/classroom notifications. It requires explicit approval for this shared production-dispatcher update after validation. Do not bypass that restriction through another tool or a parallel sender.
4. Publish client455. Existing `owner-reminders`v1 and `native-support-devices`v6 match the candidate and do not need redeployment. Their sources are included to bring the repository in sync with the already deployed feature prerequisites.

No campaign is created by any deployment step. Do not create a live preview, queue or send without separately reviewed audience and message. Existing OS notification denial cannot be bypassed. Real device FCM/WebPush delivery still requires an approved end-to-end test; offline transport tests do not prove phone receipt.

## Verification and rollback

Before deployment:208 application checks, including real PostgreSQL guest RLS/deduplication/retention/quotas,38 campaign database checks, actual account restoration and no-send-on-preview UI assertions. Review the exact shared-worker diff against the downloaded v23 snapshot; check GitHub builds on the final head. Local mobile fixture uses explicitly synthetic data and blocks outbound connections.

After approval/deployment: compare downloaded function sources and versions, inspect schema privileges/indexes, verify negative API cases (wrong origin, malformed guest body, unauthenticated/non-owner reads), confirm no campaign was created, then verify ordinary client update to455. Positive owner aggregate reads require the real owner gate; never fake owner status in production. Confirm a tester's installed Android version separately.

Backups outside the source tree contain the downloaded current owner-accessv25 and background-remindersv23. If deployment fails, restore those exact handlers and revert the client feature commit while preserving existing452 Auth and454 painting fixes. Leave the private guest schema inert; do not delete collected records as a rollback shortcut. No database restart or Auth configuration change is required.
