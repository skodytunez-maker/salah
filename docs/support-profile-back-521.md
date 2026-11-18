# Support521: account profile and native Back

The owner reported 520 on the real iPhone: Habib Malik and Sarvinoz initials open an unavailable card; right swipe shakes and can land in Menu. The supplied 8.32s recording confirms card failure and route-level exit.

## Cause and behavior

Support passes an authenticated account ID. The existing rank-user service resolves a separate public listener ID; both reported accounts resolve to zero rows under that mistaken lookup. A separate owner-only account-user lookup resolves the exact account while preserving the ranking resolver. The existing sanitized card, details and avatar are reused. Live session, owner identity and AAL2/TOTP gates are unchanged; no schema, grants or ordinary-user profile access changes.

Grouped conversations now own an opaque same-URL history entry. Native browser Back consumes that entry and returns to the existing inbox rather than the previous Menu route. The private card remains the next nested step. Account IDs, messages and drafts remain in memory. Support-only horizontal distance is 18% (48–100px), preserving vertical scrolling and control taps.

## Evidence

- The new production client/server transport test fails on 520 and passes on 521. It exercises actual owner-auth rather than a mocked successful card.
- The new native history regression fails on 520 and passes on 521; an 82px deliberate horizontal gesture returns on its first attempt, while vertical movement stays in chat.
- Read-only production queries using the updated SQL resolve exactly one matching account for each reported contact.
- Profile/card nested Back, list position, draft, account switch, late results, owner/MFA/session denials and old ranking behavior are checked.
- Prior 520 local server source matched deployed owner-access v35 exactly; rollback copy retained outside the release tree.

This is not a physical Safari engine test or proof of the owner's installed version. Verify both contacts and Back on the iPhone after installation. Keep living sky owner-private; do not change release515 news, acknowledgement, photos, player or reminders.
