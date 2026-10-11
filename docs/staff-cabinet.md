# SALAH staff cabinet — version 301

Status: owner explicitly approved the permanent role schema, private chat/files and public owner-approved media on 2026-10-12. Migration and four functions are deployed; frontend 299 is published. Version 300 corrects typed JSON arguments in the private adapter and verifies that unassigned/guest accounts have no cabinet entry. No staff member has been granted access and no real message has been sent.

## Owner and staff workflow

The signed-in personal account gets a server-verified “Кабинет команды” entry. The owner searches an existing confirmed account by nickname, chooses moderator or administrator, and can revoke access. The owner account itself cannot be assigned or demoted here.

| Role | Support requests | Reciters and wallpapers | Publish | Manage roles |
| --- | --- | --- | --- | --- |
| Moderator | SALAH only | No | No | No |
| Administrator | SALAH only | Own drafts and submissions | No | No |
| Owner | SALAH only | All drafts and review | Yes | Yes |

Each material is saved as a revisioned draft, submitted, then published, returned with a note, or rejected by the owner. Concurrent publication against a changed catalog is refused. The owner sees the current image beside proposed assets. Existing static material is the fallback when the public catalog is unavailable; approved records keep stable IDs. New approved reciters are eligible for personal listening and the shared ranking.

Phone and wide wallpaper day/night images are uploaded separately. Day/night dimensions must match, and phone/wide orientations are checked. The server generates an inert SVG sky mask from a bounded fraction; employees cannot upload executable SVG.

## Chat and attachments

The team channel is for active staff. Direct conversations are accessible only to the two participants, including when the application owner requests someone else's conversation. The composer supports native emojis and up to five attachments per message. Messages use retry IDs. Polling updates messages without rebuilding the composer or replacing unchanged message nodes. The chat refreshes while visible, and stops on navigation/revocation.

Files: JPEG, PNG, PDF, TXT, ZIP, DOCX, XLSX and PPTX, up to 10 MiB per file and 100 MiB per account/day. Executable files, HTML, SVG and macro-document extensions are refused. Files are downloaded as attachments, not executed or extracted by the server. Messages are capped at 5,000 characters and 30/minute per sender. Signed links last five minutes. Unattached uploads can remain if a user closes a composer; storage housekeeping should remove old unattached objects with metadata reconciliation, retaining attached and reviewed material. This version does not add external email/SMS/chat notifications.

## Security boundary

Every private request validates the current Auth user, signed claims, project issuer, confirmed/nonanonymous status, active and unexpired database session, current database staff role, and verified TOTP with AAL2. `user_metadata` supplies display nicknames only. A revoked employee's old JWT does not grant staff rights.

The private schema has RLS and no schema/table/function/sequence permissions for PUBLIC, anon or authenticated. Only the server's database connection calls fixed private request functions with a transaction-local claims setting. Those SECURITY DEFINER functions have an empty search path. Storage administration uses existing server-only keys; no service-role key is shipped to a browser. The existing owner statistics and support actor are not broadened. SAHABA support is excluded. Private requests are uncached and do not enter the service-worker cache.

New storage:

| Bucket | Access | Purpose |
| --- | --- | --- |
| salah-staff-drafts | Private | Proposed portrait/wallpaper JPEGs |
| salah-staff-chat | Private | Team/direct attachments, signed participant-only downloads |
| salah-curated | Public | Only owner-approved portrait/wallpaper images and generated masks |

The migration grants nobody a role. Public access applies only to approved display assets. Staff roles, drafts, chat, files and audit are not returned by the public catalog endpoint. Audit stores action metadata, not message bodies. Account removal cascades membership/drafts and direct rooms, while published catalog and team history can retain nullable attribution.

The project uses modern signing-key JWTs, so Edge's legacy gateway `verify_jwt` remains false like existing authenticated functions. This does not provide anonymous private access: getUser/getClaims, active-session checks, MFA and database role checks are mandatory in the handler and private SQL. `approved-catalog` is intentionally public and reads only published metadata.

## Tests and review limits

- `node scripts/check-app.mjs`: all app checks, including 57 staff endpoint/security/publication checks.
- From `tests/staff`, install the pinned dependencies with the committed pnpm lockfile and scripts disabled; run `pnpm test`: actual local PostgreSQL schema execution and DOM interactions, using synthetic users/files/messages only.
- Local database coverage includes forged role metadata, moderator permissions, MFA/session expiry, draft revisions, owner-only publication, revocation, SALAH-only support, private direct conversations, attachment scoping, and private grants/RLS.
- Local DOM coverage includes role-specific tabs, emoji insertion, sending, composer preservation/no poll flicker, room switching, pending-upload guards, and save-before-submit revisions.
- Edge adapters are syntax checked. The browser could not reach the local preview, and local-file navigation is prohibited by its policy. Production checks confirm guest/origin/method denial, private grants/storage, empty members/messages and public approved-only catalog. The existing owner session opened the cabinet in the browser after the typed JSON correction. No real role grant, upload or message was used for verification. Phone hardware verification remains pending.

## Approval and rollout

The owner explicitly approved the previously blocked scope. The exact migration and four functions were installed through the official connector, with no policy workaround. Nine tables have RLS and no anon/authenticated schema/table/function grants. Draft/chat storage is private; only approved display images are public.

Frontend 299 was published after guest-server checks. An authenticated browser check then caught double JSON serialization in the adapter; version 300 uses tx.json(args) for both private request functions. The existing owner session now opens the Team screen. The owner assigns real staff and enters authenticator codes themselves.

Unassigned accounts and guests have no cabinet entry, and direct denied navigation shows a neutral access-closed screen. Local DOM tests cover authorized, unassigned, guest, stale and direct-route cases.

If rollout fails, preserve private data. Never delete schemas/buckets or purge published images as an automatic rollback.

## Private correspondence and compact cabinet

Existing and future support threads default to owner-private (`team_visible=false`). The team queue lists and opens only deliberately shared SALAH conversations. Reading, replying, closing and signing their photos all use the same server-side visibility gate. Administrators/moderators cannot change sharing; only the owner with MFA can. The private owner inbox still retains every conversation. Its “Передать команде” action confirms that staff will see all messages and photos, and “Вернуть в личные” closes staff access. This rollout shares no real conversation.

“Публикации” groups reciter/wallpaper drafts with compact inner selectors. “Сообщения” groups shared support and team/direct chat. Their separate database permissions and storage remain enforced. Local PostgreSQL checks cover default privacy, staff direct-ID denial, owner-only sharing, MFA, cross-project denial and withdrawal without deletion.
