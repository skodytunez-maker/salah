# Session verification — 330

Auth logs on 2026-10-13 00:00–13:30 UTC contained 540 successful refresh requests and two refresh_token_already_used refusals (03:55:32 and 09:36:23 UTC). These counts do not establish how many people were affected or whether every reported logout had the same cause. No logout requests were present in that bounded query. Version 329 changed settings/update UI only; its release did not clear auth storage.

The client previously forced refreshSession every 30 seconds and on resume, in addition to SDK auto-renewal. Version 330 verifies existing access tokens with Auth getUser(token) instead. Auth checks the signed token and live user/session; privileged functions independently retain session, identity, database role and MFA gates. Token renewal stays with the SDK's shared lock and auto-refresh. No Auth configuration, refresh-token reuse policy, session key, backend schema, RLS or SDK bundle changed.

A cold-start temporary Auth failure now shows a retry screen instead of a sign-in form. A later successful check restores the account screen. Existing sessions survive network/429/5xx errors. Confirmed session revocation still signs out locally. Stale replies cannot clear a changed account; concurrent checks coalesce.

Regression tests are synthetic and offline: repeated/parallel checks, server revocation, transient errors, cold-start retry, cross-tab renewals, owner denial, QR approval and deletion/MFA gates. No real tokens, emails, messages, user sessions or account deletions were used in tests.

Primary sources inspected: https://supabase.com/changelog.md ; https://supabase.com/docs/guides/auth/sessions ; https://supabase.com/docs/reference/javascript/auth-getuser ; https://github.com/supabase/auth/blob/master/internal/api/auth.go .
