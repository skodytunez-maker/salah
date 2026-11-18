# Support conversation candidate

Status: public516 explicitly authorized by the owner with «Опубликуй» after implementation and source-bound checks. Prepare the516 metadata/news, reverify the exact release, apply the reviewed Support migration/function and publish through the normal installed application. No external update push; living sky remains owner-private. Physical-phone verification is not claimed.

The owner's request is «В обращениях добавь этот же механизм чатов». The owner and user Support screen now reuses the messenger action component: own messages on the right, incoming messages on the left, time, accessible action button and touch hold, Reply with a quoted preview and cancellation, source jump, Copy, selected-message Self/Everyone removal and conversation-history Self/Everyone removal. Individual Everyone removal remains author-only. Closed cases retain read/copy/delete actions and hide Reply. Case status, subject, recipient resolution and diagnostics remain on the existing Support protocol.

The shared staff Support queue keeps its existing markup and explicit team-visible/session/MFA authorization. Its reads and photo manifest respect Everyone removal. No new staff authority or access to owner-private cases is granted. SAHABA keeps its original support protocol and appearance.

The owner subsequently requested a cleaner Support inbox and supplied Telegram/WhatsApp list references. The embedded screen now has one heading and conversation rows, with a real user name, time, current visible message preview, topic/status and unread marker. The owner's existing authenticated profile-picture endpoint supplies optional memory-only avatars; no new profile access is granted to ordinary users. Profile images are cleared/revoked across account changes and disposal. Initials reuse the existing SALAH fallback. Dates/status labels retain all eight interface languages. The ordinary-user case list retains its New Request action. No fake unread-message totals or unsupported call/archive controls are added. The existing application's player/navigation space reserve remains authoritative.

## Case resolution and automatic acknowledgement

The owner then requested explicit case completion, user reopening or a new request, and an automatic acknowledgement which does not clear the owner's red state. The operator's existing authenticated Close action is labelled «Завершить обращение». It preserves history. A closed case offers its requesting user «Возобновить переписку» and «Новое обращение»; replies remain blocked until reopening succeeds. Owner/staff authority and the separate-app boundary stay on the server.

For an active request awaiting a real operator answer, the user sees a clearly labelled automatic acknowledgement: «Обращение получено. Постараемся ответить как можно скорее». It is server-backed case state rendered as a service notice, not an invented human message, quote target or unread reply. It sends no extra notification and does not consume a human-message limit. It disappears when a real operator answers or explicitly completes the case. Reading a case does not resolve it.

`needs_owner_reply` and `waiting_since` track real user messages; real authorized operator replies clear them. A closed case clears pending-answer status through the operator's deliberate resolution. Reopening restores pending-answer status without fabricating a message. Owner inbox rows and the existing red menu indicator use pending-answer state; actual unread/new badges remain separate. The owner-status response retains the actual unread count separately. Existing SAHABA read/unread semantics stay unchanged.

Case completion and reopening are session/actor bound, operation-idempotent and rate limited. A delayed reopen retry cannot undo a later human answer or completion; a delayed completion retry cannot undo the user's later reopening. A deliberate new action uses a new operation. Both successful and failed operations preserve the unsent reply draft. Explicit reopening makes the case visible again even after history removal, using a separate logical reopen revision; removed messages remain hidden and an old clear retry cannot hide the new request. The eight-language Support namespace contains only labels for these case actions, the system notice and accurate pending-answer indicator labels.

## Consistency and privacy

- Every queued HTTP request is bound to its initiating account immediately before fetch. Account changes abort reads/mutations, erase private cached content and invalidate late callbacks.
- Message and history deletion use account-bound operation UUIDs. A retry cannot change scope, target another case or erase newer messages. The server decides author authority and thread membership.
- Self deletion stores visibility for that account. Everyone deletion redacts the original message identity; a replay of its old send ID cannot resurrect content. Whole-history removal records a sequence cutoff; later messages can reopen the case in the list.
- Quotes are rebuilt from the target's current visibility within the same case. Hidden/removed targets have no text or author payload. Old read, list, preview, unread, photo-signing and shared-staff paths apply the same visibility filter.
- Queued web/native notifications for removed messages/history are revoked in the deletion transaction. Already delivered notifications cannot be recalled. Previously signed photo links can remain usable for their existing300-second lifetime; deletion prevents new signing and removes the local image/link, but cannot remove a recipient's prior download.
- A validated deletion ACK removes local message/attachment/quote/preview content before refresh. A failed refresh cannot restore the known-deleted snapshot. Invalid ACKs preserve the draft and visible conversation.
- An unchanged refresh retains the open menu, textarea, draft, scroll and decoded image nodes. Fresh signed download links update without reloading photographs.

## Deployment boundary

The migration was created by the existing Supabase CLI2.81.3 and tested against isolated PostgreSQL containing the actual Support/staff schema. Before publication, the eight live legacy function definitions were compared against the reviewed baseline and matched. Apply20261118103824_support_chat_actions_516.sql and deploy only the reviewed support-messages function, then publish the exact verified516 frontend. The common client retains its original Support view when the server does not advertise the capability. The owner explicitly authorized this publication; no further approval is required for the concrete reviewed change. New living sky remains owner-private, all original photographs stay unchanged and no external update push is sent.

Checks cover actual database functions, HTTP action validation, transport actor binding and the real Support components in HappyDOM. These checks do not establish physical iPhone/Safari behavior. Phone verification must include hold/menu/cancel, quote/source jump, two-account deletion, photos, offline retry, returning to another case and sign-out/account switch.

`design-qa.md` records the screenshot reference and the blocked rendered comparison: browser automation is prohibited by the user's established preference. Do not present DOM assertions as a visual or physical-phone pass.
