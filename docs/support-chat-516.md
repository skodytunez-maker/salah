# Support conversation candidate

Status: local, unreleased follow-up to public515. The staging directory uses516 as its task identifier; app/version/cache/news metadata remain the approved515 baseline until a separately prepared phone candidate is ready. Nothing in this change authorizes a public deployment or a live database mutation.

The owner's request is «В обращениях добавь этот же механизм чатов». The owner and user Support screen now reuses the messenger action component: own messages on the right, incoming messages on the left, time, accessible action button and touch hold, Reply with a quoted preview and cancellation, source jump, Copy, selected-message Self/Everyone removal and conversation-history Self/Everyone removal. Individual Everyone removal remains author-only. Closed cases retain read/copy/delete actions and hide Reply. Case status, subject, recipient resolution and diagnostics remain on the existing Support protocol.

The shared staff Support queue keeps its existing markup and explicit team-visible/session/MFA authorization. Its reads and photo manifest respect Everyone removal. No new staff authority or access to owner-private cases is granted. SAHABA keeps its original support protocol and appearance.

## Consistency and privacy

- Every queued HTTP request is bound to its initiating account immediately before fetch. Account changes abort reads/mutations, erase private cached content and invalidate late callbacks.
- Message and history deletion use account-bound operation UUIDs. A retry cannot change scope, target another case or erase newer messages. The server decides author authority and thread membership.
- Self deletion stores visibility for that account. Everyone deletion redacts the original message identity; a replay of its old send ID cannot resurrect content. Whole-history removal records a sequence cutoff; later messages can reopen the case in the list.
- Quotes are rebuilt from the target's current visibility within the same case. Hidden/removed targets have no text or author payload. Old read, list, preview, unread, photo-signing and shared-staff paths apply the same visibility filter.
- Queued web/native notifications for removed messages/history are revoked in the deletion transaction. Already delivered notifications cannot be recalled. Previously signed photo links can remain usable for their existing300-second lifetime; deletion prevents new signing and removes the local image/link, but cannot remove a recipient's prior download.
- A validated deletion ACK removes local message/attachment/quote/preview content before refresh. A failed refresh cannot restore the known-deleted snapshot. Invalid ACKs preserve the draft and visible conversation.
- An unchanged refresh retains the open menu, textarea, draft, scroll and decoded image nodes. Fresh signed download links update without reloading photographs.

## Deployment boundary

The migration was created by the existing Supabase CLI2.81.3 and tested against an isolated PGlite database containing the actual Support/staff schema. Before a future release, review the exact live legacy function definitions against the predicate anchors, apply `20261118103824_support_chat_actions_516.sql`, deploy only the reviewed `support-messages` function, then prepare version/cache/artwork metadata and an owner phone candidate. The common client fails back to the original Support screen if the server does not advertise the new capability. Do not change the public latest manifest, merge an auto-publishing branch or deploy to other users before the required phone test and explicit approval. New living sky remains owner-private and all photographs remain unchanged.

Checks cover actual database functions, HTTP action validation, transport actor binding and the real Support components in HappyDOM. These checks do not establish physical iPhone/Safari behavior. Phone verification must include hold/menu/cancel, quote/source jump, two-account deletion, photos, offline retry, returning to another case and sign-out/account switch.
