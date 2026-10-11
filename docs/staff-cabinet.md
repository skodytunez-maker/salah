# SALAH staff cabinet — prepared version 299

Status: source and local tests prepared. Production database/function deployment is pending explicit approval after an automatic approval review rejected the migration. No staff member has been granted access and no real message has been sent.

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

- `node scripts/check-app.mjs`: all app checks, including 55 staff endpoint/security/publication checks.
- From `tests/staff`, install the pinned dependencies with the committed pnpm lockfile and scripts disabled; run `pnpm test`: actual local PostgreSQL schema execution and DOM interactions, using synthetic users/files/messages only.
- Local database coverage includes forged role metadata, moderator permissions, MFA/session expiry, draft revisions, owner-only publication, revocation, SALAH-only support, private direct conversations, attachment scoping, and private grants/RLS.
- Local DOM coverage includes role-specific tabs, emoji insertion, sending, composer preservation/no poll flicker, room switching, pending-upload guards, and save-before-submit revisions.
- Edge adapters are syntax checked. The browser could not reach the local preview, and local-file navigation is prohibited by its policy. No real-device visual or production-server check is claimed.

## Approval and rollout

Automatic review rejected permanently creating the role schema and public approved-asset bucket without approval of that specific scope. Do not deploy by another route to circumvent that rejection. Ask the owner to approve the exact private staff/chat system and public approved media storage after presenting the local result.

After approval: apply `20261011194033_staff_cabinet.sql` to SALAH project `kbltwszfvphgbxdbczsb`; deploy `staff-cabinet`, `approved-catalog`, and the changed reciter competition/popularity functions; verify unauthenticated denial, owner MFA gate, empty roster, empty published catalog, and storage privacy without creating staff or sending real messages. Merge/publish frontend 299 only after the backend checks succeed. Confirm exact release and Pages publication. The owner assigns real staff and enters authenticator codes themselves.

If rollout fails, keep frontend 298 and restore prior ranking function source; revoke any role grants if later made through the owner UI. Preserve private data. Never delete schemas/buckets or purge published images as an automatic rollback.
