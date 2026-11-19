# Stale implicit refresh prevention — 535

The owner reported being signed out. Authorized server metadata showed an existing session with revoked refresh credentials and a later successful new sign-in. Private identifiers,audit details,IPs,credential strings and access/refresh tokens are excluded from this published document. This observation establishes revocation;it does not prove the exact originating phone callback.

A regression uses the shipped SDK's public getSession,refreshSession,startAutoRefresh and initialize APIs with the production account-client lock options. Two isolated browser-process fixtures share storage. One read is suspended while the peer rotates twice. The upstream bundle sends the obsolete key after its fresh storedAtStart read already sees the winning session. The fixture models Auth's immediate-parent retry exception correctly;an older key revokes the current family. Before:the regression fails. After:no obsolete implicit key is sent and the winning session is retained.

A minimal reversible patch adds a stored-key preflight only to implicit session reads,startup recovery,auto-refresh ticks and no-argument refreshSession. It returns the SDK's existing AuthRefreshDiscardedError if storage disappeared or holds another key. Existing SDK reread/error contracts remain. Explicit setSession and supplied refreshSession credentials retain their intentional semantics;real current-token refusal,logout,new account,MFA/server permissions and all existing lock/commit guards remain authoritative.

The package remains2.117.2,not a claimed upstream release. scripts/lib/supabase-refresh-patch.mjs applies/removes the exact documented edits. The new regression reverses the patch and verifies the original59d39487c3589843b410322d8a3d562ce022aba1e5ccb16898ef3fb2a0da2ecd SHA256,then re-applies it byte-for-byte. supabase-source.json records both original and modified fingerprints;MIT attribution is retained. No general SDK upgrade or server session-policy change is included.

A server-revoked session requires authenticating again;this change does not restore revoked credentials. Physical iPhone causality and long-running behavior still require device verification. Daylight Home contrast was explicitly queued for later and is not changed here.

Primary references inspected:
- https://supabase.com/docs/guides/auth/sessions
- https://github.com/supabase/supabase-js/blob/master/packages/core/auth-js/src/GoTrueClient.ts
- https://github.com/supabase/supabase-js/issues/2731
- https://github.com/supabase/supabase-js/blob/master/CHANGELOG.md
