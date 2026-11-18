# Conversation themes — local candidate523

Eight approved dark themes plus the original presentation. Applied only to the private Support profile, Support conversations and internal staff/team/direct messenger (including the requested administrator/teacher conversation surface where access already exists). No new contact/role access is granted.

The shared catalogue is dist/js/conversation-themes.js. Stable IDs, translated title keys, wallpaper/thumbnail URLs and palette tokens define a new theme without screen rewrites. Current theme selection is per actor and conversation on this device; Support card and Support conversation share a preference scope. Counterparty preferences are independent. Warm Sand remains deferred.

Built-in selection uses validated localStorage metadata. Personal JPEG/PNG/WebP is decoded before saving and kept unchanged as a local IndexedDB Blob, never uploaded or put into a message. Invalid or over25MB/50MP images are rejected. Failed decoding/storage leaves the last valid selection. Room/account disposal cancels obsolete work and revokes owned object URLs.

Changing the background never renders messages again or changes their identities, text, files, reply/delete actions, status, drafts, scroll or server calls. Picker owns one opaque same-URL Back step above the existing card/chat steps. All new labels are included in eight interface languages. Existing basic Home/sky/photo/player/news behavior stays unchanged.

Full-size new WebP files are lossless and have the same decoded RGBA pixels as their generated PNG sources; all eight separate thumbnails total61116 bytes. Only the selected full-size background is requested by a conversation. Thumbnails are lazy images in the picker. Worker optionally caches public theme files on use; private custom images stay in IndexedDB. Existing Medina photo is reused unchanged. Provenance and hashes: conversation-theme-assets-523.json.

Verification: check-conversation-themes.mjs exercises per-room/account persistence, own-photo roundtrip, quota rollback, serialized writes, stale results, live scopes, unchanged draft/message/scroll, locale changes, nested Back and actual staff messenger switching. Existing Support/profile/actions/access/language/listening checks also pass in local DOM fixtures. Physical iPhone/Safari rendering and owner approval are still required; this is not a public release or a completed visual handoff.

Phone checks: same eight backgrounds in card/Support/internal chat; long names and RTL; readable panels on custom light photos; open/close/reopen theme picker; theme→card→same chat→inbox Back; preserved draft and reading position; cold/warm loading and image decode. Next queued task is measured navigation/control responsiveness.

## Publication authorization

Owner explicitly requested publication after disclosure of pending phone rendering review. Prepare523 for the ordinary installed app; preserve the existing515 announcement and its receipt/expiry and send no external push. No new Support announcement was requested. Phone rendering remains unverified. The reattached old lock-screen/Control Center Pause video is recorded for the next work item, with no new player fix claimed in523.

## Requested theme announcement

The owner subsequently explicitly requested an animated theme card in news. Current announcement becomes523 with only this new feature;515 historical receipts are preserved. Eight actual thumbnail/palette scenes use the shared alternating24s gallery lifecycle and8-language captions; no old feature promotion, system-pause claim or external push. The current expiry is2026-11-26T23:59:59Z.
