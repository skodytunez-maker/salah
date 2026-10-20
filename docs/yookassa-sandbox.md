# YooKassa sandbox — 20 October 2026

Live shop **1489995** has card binding enabled (provider email dated 19 October). Live payments remain disabled. This implementation deliberately cannot accept that shop ID or a live secret key. It is a separate sandbox, not a production billing launch.

## Implemented

- `support-billing-test` Edge Function and private `salah_billing_test_private.accounts` ledger. Production `support-billing` and its subscriptions are unchanged.
- Confirmed signed-in accounts, live session and MFA checks, explicit allowlist of at most ten account UUIDs. No client-selected user ID.
- Initial payment with explicit amount/terms consent and saving a bank-card method. Only a verified paid test payment with `saved=true` activates renewals.
- Persisted operation UUID before the provider request; same idempotency key on retries. An ambiguous POST is never repeated after 23 hours (provider guarantee is 24 hours). Manual reconciliation is required instead.
- Renewal runner `/renew` uses a separate server secret, calendar-month anchor (January 31 → February 28 → March 31), one operation per due date, and no multiple catch-up charges. Runner implementation exists; **no cron job is installed**.
- Webhook `/webhook` accepts notification IDs, fetches the actual payment from YooKassa, and validates test flag, recipient shop, operation metadata, amount/currency and ownership. Payload status alone is never trusted.
- Cancellation uses the same per-user transaction lock as payment dispatch, removes the reusable method and next-charge date, and increments a revision. Late notifications cannot reactivate cancelled support. An already submitted payment may finish; cancellation does not constitute a refund.
- Only safe fields and last four card digits are stored. No PAN, CVC, first six digits or full provider payload. The private table is inaccessible to anon/authenticated roles; RLS is on.
- Isolated client page `billing-sandbox.html#support-salah?billing=test` has unchecked consent, a test payment button, status refresh and cancellation. It reuses the existing SALAH session and is not linked from the app. The public payment button, release version and cancellation review remain unchanged. Public news contain no payment announcement.

## Deployment state

Migration applied and Edge Function v1 deployed on project `kbltwszfvphgbxdbczsb`. An unauthenticated GET was checked: HTTP 503, `test_configuration_required`, `paymentEnabled:false`, `testPaymentEnabled:false`. There are zero sandbox accounts and zero pending/active live subscriptions. Frontend changes are local and have **not been published**.

Later on 20 October: the user created test shop **1503110** and saved `YOOKASSA_TEST_SECRET_KEY` directly in Supabase. Its value was not read or logged. The Shop ID was saved, test access restricted to the confirmed owner account, and `SALAH_BILLING_TEST_ENABLED=true` saved. The endpoint now returns HTTP 401 `sign_in_required`, confirming the configured handler is running. This does not verify provider authentication or a completed payment. The user reported saving the test webhook URL with the three payment events; a direct unknown-ID notification returned HTTP 200 `{received:true}` without creating a payment. Merchant delivery and an actual sandbox checkout remain unverified. Runner secret and scheduling remain unset. The change adds an isolated test page for publication, with no modification to `financial-support.js`, app release or service worker. Live payment acceptance remains disabled.

Tests passed with a simulated provider and local PostgreSQL (PGlite): checkout/renewal/cancellation, duplicate clicks/workers/webhooks, lost response, retry window, late success, invalid consent/amount, cross-account request, test-only keys/responses, private schema constraints. These are not proof of a real YooKassa sandbox payment.

## Remaining external setup

1. In the YooKassa merchant dashboard, find or create a **test shop**. Obtain its Shop ID and API test secret. Keep secret values out of chat, repository, frontend and logs.
2. In Supabase Edge Function Secrets set:
   - `YOOKASSA_TEST_SHOP_ID` (test shop, not 1489995)
   - `YOOKASSA_TEST_SECRET_KEY` (test key only)
   - `SALAH_BILLING_TEST_USERS` (comma-separated internal UUIDs of approved test accounts)
   - `SALAH_BILLING_TEST_RUNNER_SECRET` (random server-only secret of at least 32 characters)
   - `SALAH_BILLING_TEST_ENABLED=true`
3. Configure test shop notifications for `payment.succeeded`, `payment.canceled`, `payment.waiting_for_capture` to:
   `https://kbltwszfvphgbxdbczsb.supabase.co/functions/v1/support-billing-test/webhook`
4. Publish the isolated test page after checks, then complete a test checkout using provider test-card details. Verify redirect return to `billing-sandbox.html`, webhook result, refresh, saved method, renewal, duplicate delivery, decline and cancellation in the actual provider sandbox. Advance the **sandbox ledger only** for testing a renewal; never change the system clock or live subscriptions.
5. After a successful end-to-end check, arrange the test runner schedule using Supabase Cron/pg_net and a runner secret in Vault. Do not place the secret in migration source. No scheduler has been activated by this work.

Production is a separate reviewed change after sandbox verification: merchant terms/consent and receipt requirements, production credentials, production audit ledger, reconciliation/monitoring, scheduled renewals, support/refund handling, retention, and any relevant native-store payment restrictions. Do not repurpose this test ledger as live billing by removing a guard.

The in-app browser cannot load `https://yookassa.ru/my` (timeout). Test-shop existence was confirmed from the user's screenshots; credential presence was confirmed by saved secret names, without reading the secret. Merchant webhook setup was performed by the user on their phone; actual delivery must still be checked during payment.

## Checks

```sh
node scripts/check-billing-test.mjs
node scripts/check-billing-test-client.mjs
node scripts/check-billing-sandbox-page.mjs
node scripts/check-support-subscription.mjs
node scripts/check-financial-support.mjs
node scripts/check-support-cancellation-preview.mjs
```

Supabase advisors were checked after the schema addition: no sandbox-table finding. Existing project-wide INFO notices for unrelated private tables and the existing leaked-password-protection warning remain outside this change. See [Supabase password security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Primary references

- [YooKassa recurring payments](https://yookassa.ru/developers/payment-acceptance/scenario-extensions/recurring-payments/basics)
- [Save method during payment](https://yookassa.ru/developers/payment-acceptance/scenario-extensions/recurring-payments/save-payment-method/save-during-payment)
- [Saved-method payments](https://yookassa.ru/developers/payment-acceptance/scenario-extensions/recurring-payments/pay-with-saved)
- [Idempotency and 24h guarantee](https://yookassa.ru/developers/using-api/interaction-format)
- [Webhook authenticity](https://yookassa.ru/developers/using-api/webhooks)
- [Supabase server secrets](https://supabase.com/docs/guides/functions/secrets)
