# Compact owner-only Azkar activity

425 adds one day-level presence bit after a successful explicit counter increment. Merely opening a screen, resetting, undoing or restoring cloud totals does not mark activity. The profile shows Today: Has a mark / No marks yet, with Unknown when unavailable. It never lists dhikr names, texts, repetition counts or individual action times. No marks is not proof that someone did not recite. Old activity is not reconstructed.

The bounded offline queue is isolated by authenticated account. It retries through the existing counter sync, without extra polling. Server identity comes from a confirmed, live Auth session; the owner still requires MFA. The owner endpoint returns only day and a boolean. The existing private counter backup contract is unchanged.

## Database and deployment

Remote migration adhkar_activity_days, generated version 20261029233447, created salah_counter_private.activity_days(user_id uuid references auth.users(id) on delete cascade, day date, primary key(user_id,day)). RLS is enabled; all privileges are revoked from public, anon and authenticated. There are no direct client policies. Server code prunes that account's flags older than eight UTC days when new activity arrives.

Verified after deployment: adhkar-sync v11 and owner-access v22 match the reviewed source. RLS enabled, anon and authenticated SELECT denied, authenticated INSERT denied. No test marks or user assignments were inserted in production. The frontend remains a 425 release candidate until publication.

## Validation

189 application checks pass. New tests cover bounded calendar dates, per-account queues and acknowledgements, unauthorized/revoked sessions, forged UIDs, fresh owner MFA, whitelisted boolean output, actual SQL day selection and unknown UI states. Three fixtures were updated for the new imported helper / fifth compact panel; their reruns pass and are recorded separately.

The three experimental Knowledge sections remain closed. Muallim letter names share alphabet recordings; reading-example narration remains pending teacher recordings.
