# One-off recommendation to update to SALAH 501

This fixed campaign is separate from religious reminders and support conversations. It is inactive after deployment until an operator arms it, only after independently verifying that public web/native update files for 501 are live and consistent.

The immutable deadline is **2026-11-17 11:59:59 UTC**. The existing minute dispatcher processes at most 100 pending users per pass and stops this campaign after a 20-second budget. Delivery is attempted only from 08:00 inclusive to 22:00 exclusive in a verified saved device timezone. Gateway TTL is at most 120 seconds, clipped to 22:00 and the campaign deadline.

The Russian legacy message is fixed:

> Доступна версия SALAH 501. Обновите: Меню → Настройки → Приложение и обновления → Обновить.

The seven other fixed interface-language variants use an existing saved Web Push language. Old native rows have no language field and use Russian. No request can supply custom text, recipients, URL, target version or a different deadline.

## Audience and once semantics

Only confirmed, non-anonymous, non-banned accounts with a known diagnostic version 1–500 reported within 90 days are considered. Any fresh 501+ account report, including the current app-state reports, excludes the entire user conservatively. These reports are not installation-specific; unknown versions and guests are excluded.

Web delivery requires the existing enabled device, master reminder consent, granted permission, active matching session, fresh notification status and unchanged device/account binding. The notification-status prayer-schedule flag is not master consent: dhikr/adhkar-only subscriptions remain eligible. Native delivery requires the existing enabled, fresh native row, token, active matching session and valid saved timezone. A newer explicit denied report from that same session suppresses native delivery. An unrelated web unsupported/default status is not a native opt-out.

Arming freezes one selected device/channel per user. Private cache rows contain only the campaign state and selected identifiers/timezone, never subscription keys or native tokens. Version, account, session, consent and binding are checked again before claiming and sending. Removed or rebound selected devices are skipped; no second channel is substituted.

An atomic claim consumes the user's only attempt. Gateway failure, timeout or an uncertain result does not cause a retry or fallback. A known missing native sender leaves the job pending before claiming. A final-state write failure also cannot allow another attempt because the durable attempted state already excludes it. Receipts remain until the deadline plus seven days; normal cache cleanup cannot remove them while the campaign is active. The absolute deadline prevents rearming even after eventual cleanup.

Web Push uses a generic notification with the exact best-effort target #settings. Older app startup rules can instead open the main or previous screen, so the body contains the manual path. Native delivery uses an FCM notification-only payload and the existing background system-display pattern; no support/staff event or deep-link is fabricated. Foreground display and a precise destination on old Android are not guaranteed. The OS still controls notification display and may have a permission revocation not yet reflected in the server row. Gateway acceptance is not proof that a person saw a notification. No claim is made that tapping an old client's notification preserves audio.

## Operator sequence

Do not run these statements before the public 501 verification and function deployment pass. They are operational commands, not a migration or a new cron task. They read the existing cron secret on the server and return only an HTTP request identifier; do not select or print the secret or request-queue headers.

First request aggregate preview counts:

~~~sql
select net.http_post(
 url:='https://kbltwszfvphgbxdbczsb.supabase.co/functions/v1/background-reminders/update-501-preview',
 headers:=jsonb_build_object('Content-Type','application/json','X-Salah-Cron',
  (select cron_secret from salah_push_private.config where id=1)),
 body:='{}'::jsonb,timeout_milliseconds:=20000
) as request_id;
~~~

Inspect only its response using the returned request identifier:

~~~sql
select id,status_code,content
from net._http_response
where id = REPLACE_WITH_PREVIEW_REQUEST_ID;
~~~

The successful response contains only version, deadline and eligible/web/native/quiet counts. A public, cross-origin or wrong-secret request cannot preview or arm.

After reviewing the counts, arm the fixed audience once:

~~~sql
select net.http_post(
 url:='https://kbltwszfvphgbxdbczsb.supabase.co/functions/v1/background-reminders/update-501-arm',
 headers:=jsonb_build_object('Content-Type','application/json','X-Salah-Cron',
  (select cron_secret from salah_push_private.config where id=1)),
 body:='{}'::jsonb,timeout_milliseconds:=20000
) as request_id;
~~~

Inspect that response in net._http_response in the same way. Arming does not change notification permissions or subscriptions. Existing cron dispatch sends daytime jobs; quiet jobs wait for their daytime window until the immutable deadline. Repeated arm calls return alreadyArmed without adding recipients or resetting receipts.

For an aggregate-only progress check:

~~~sql
select rows->>'state' as state,count(*)::int as users
from salah_push_private.cache
where key like 'update-501:user:%'
group by rows->>'state'
order by state;
~~~

The attempted state can represent an interrupted or unknown gateway attempt; it is deliberately final for sending. Sent means gateway acceptance, not confirmed display.

To stop this campaign without disturbing prayer, Quran, adhkar or support notifications:

~~~sql
update salah_push_private.cache
set rows=rows||'{"state":"cancelled"}'::jsonb
where key='update-501:campaign' and rows->>'state'='armed';
~~~

Do not delete campaign or receipt rows to resume or resend. There is no rearm, reset or arbitrary-message endpoint.

## Local verification

Run scripts/check-update-501.mjs, scripts/check-push.mjs, scripts/check-owner-return.mjs and scripts/build-push-function.mjs --check. The new test executes the real candidate/claim SQL with PostgreSQL (PGlite), both delivery paths, unknown/current versions, channel consent, rebinding, session removal, fresh opt-out, missing native sender, concurrency, quiet hours, clipped TTL, private-schema denial, the aggregate secret-only endpoints and post-cleanup expiry. No production sends are made by these tests.
