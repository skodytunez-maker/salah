# Phone sign-in: staged, not enabled

Shared SALAH / SAHABA accounts; Russia (+79…) and Tajikistan (+992…). Both PHONE_AUTH_READY flags are false. No SMS sent, no production Auth/database change, no new API keys installed.

Prepared: compact OTP forms and authenticated linking using phone_change; existing UID retained; fresh Auth checks and owner TOTP required for linking; non-owner endpoint drafts accept confirmed email or supported confirmed phone; fixed owner UID/email/session/TOTP guard unchanged. SMSC server adapter uses POST, cost=1 for quotes without sending, a closed sending gate and safe errors. It is not a deployed endpoint.

verified-phone.sql is an unapplied compatibility draft, preserving existing grants and stopping on definition drift. Generate its migration with Supabase CLI after comparing fresh production definitions. SAHABA's existing history/content changes were preserved. Its phone core is copied byte-for-byte from SALAH.

Before activation:
1. Create SMSC account. Its tariff selector lists Russia and Tajikistan; verify routes and OTP delivery for actual operators, sender/template approval and exact costs.
2. Approve budget before funding/sending. Keep restricted provider API key only in Supabase function secrets, never apps, GitHub, logs or chat.
3. Implement the Auth Send SMS hook using pinned Standard Webhooks verification. Reject unsigned, expired and replayed events. Wire authorizeSend to durable atomic per-number, hourly and global daily quotas. Do not automatically retry uncertain deliveries. Store no OTPs or raw phone numbers in the delivery ledger.
4. Add CAPTCHA to both forms and enable Auth CAPTCHA/rate limits together. Enable phone confirmation; retain email provider; never allow production test-number bypasses.
5. Apply reviewed migration, deploy guards and test confirmed/unconfirmed phones, revoked sessions, two-user isolation, support, presence and fixed owner MFA. Review database advisors.
6. Test one approved real number in each country, link an existing email account and confirm same UID/data in the other app. Then enable both UI flags, update app versions and publish. Review SAHABA live/source drift before publishing its pending history work. Owner changes stay out of public announcements.

Sources: [Supabase phone login](https://supabase.com/docs/guides/auth/phone-login), [Send SMS Hook](https://supabase.com/docs/guides/auth/auth-hooks/send-sms-hook), [SMSC tariffs](https://smsc.ru/tariffs/), [SMSC API](https://smsc.ru/api/http/).
