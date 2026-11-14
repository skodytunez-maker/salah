# Stable guest stone names

The private `salah_competition_private.guest_aliases` table assigns one unique nickname to an existing `guest_players.public_id`. `ensure_guest_alias(uuid) RETURNS text` returns the complete display name, for example «Гость · Янтарь». Calling it again returns the original name and assignment timestamp. A missing ledger returns null; the helper never creates an identity or joins listening histories.

The generated migration backfills existing guest ledgers in creation order. A private sequence assigns 32 stone names, then adjective/stone names, then two-adjective combinations: 17,440 friendly names in total. After those combinations, a stone and a unique decimal ordinal keep enrollment available. Every result fits the existing 40-character display limit. Claimed ledgers keep their aliases, so names are not recycled onto another guest.

The guest registration transaction locks its player row and calls the helper. The helper also uses the alias primary key with `ON CONFLICT DO NOTHING` and rereads the assigned value. Concurrent retries may consume a sequence value but cannot rename a guest. The function is SECURITY INVOKER with an empty search path; service_role receives SELECT/INSERT on aliases, sequence USAGE and function EXECUTE, without UPDATE on aliases. Client roles receive no table, sequence or function grants; RLS remains enabled.

Combined Top boards join the persisted alias by guest public ID. The owner activity endpoint finds the matching unclaimed guest ledger through the existing activity hash and projects that same nickname. Unenrolled activity is labelled «Гость» without creating a ledger. Public responses do not include hashes or city context. Selected city/country remain exclusively in the existing owner activity response protected by owner identity, active session and MFA.

Apply `20261114230126_guest_stone_aliases.sql` before deploying guest-competition, reciter-competition and owner-access changes. Local PGlite checks exercise the real migration, backfill, stability, uniqueness, pool overflow and role grants; owner/board tests verify display and privacy integration. No production state is modified by these checks.
