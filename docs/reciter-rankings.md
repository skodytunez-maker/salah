# Reciter rankings

Personal totals are device-local, scoped to the current account or the guest device. The listening meter credits audio progress while playing, including the final progress before pause/end; seeking and stalled audio add no time. Totals are flushed at 15-second intervals and on page hide. Existing history cannot be recovered.

Global ranking uses opted-in, confirmed accounts only. The client sends a canonical reciter ID, a random idempotency event ID, and explicit consent for each accrued minute. The server checks Auth, stores an HMAC account code (no name, email, surah or ayah), limits contribution frequency to one per 55 seconds and to 120 minutes per account/day, and deletes rows older than the 30-day window daily. Public output contains only ordered reciter IDs. A reciter needs at least three distinct account codes and ten accepted minutes to appear. Raw tables have RLS enabled and no anon/authenticated grants or policies; server functions use the existing private database connection.

The default is local-only tracking; global contribution is off until the user explicitly enables it in Top SALAH. Opt-out clears pending unsent reports. Local statistics continue to work offline and without an account. Contributions queued during outages are bounded and are subject to server rate limits. This is an interest ranking, not a fraud-proof billing meter.
