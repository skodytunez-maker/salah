# SALAH release announcements

User preference, 16 October 2026: show feature pictures with short captions in
the same “Что нового” dialog, both on the home screen and in Settings / Update.
Use the existing accessible swipeable gallery. Future public releases keep
illustrated cards automatically; add feature-specific artwork for each release.

Call listening badges “Новые награды”; do not describe icon sharpness. Distinguish
Google Play closed testing from general availability. Support is planned,
voluntary, from 150 RUB/month, with payments disabled until readiness is verified.
Owner-only profiles must not appear as a public feature in announcements.

City art is optional and lazy-loaded. News uses small thumbnails, not full pairs.
Keep source, author, transformation notes and derivative license in credits.json.

## Permanent illustration requirement (18 October 2026)

This applies to current release notes as well as the large roundup, including the owner update dialog and Settings → What is new. A generic book/star/play icon is not acceptable artwork for a new feature. Select a feature screenshot or a feature-specific visual composition and explain the feature briefly. The build checks that every APP_CHANGES entry has an artwork category, so a new feature cannot silently fall back to an icon.

The map/reading additions belong to announcement 367. Version 368 is a visual correction of those additions; later cosmetic versions must keep that announcement id. The roundup now preserves its earlier cards and includes holy-city map views and regular Quran reading resume. Keep the existing October 21 expiry and dismissal behaviour.

Version 369 activates Russian tafsirs of as-Saadi and Ibn Kathir via the verse menu and upgrades recognition to 221 recordings/46 voices with eight-second capture and parallel preparation. Advance announcement to 369 because these are major additions; retain the existing gallery and expiry. Replace the planned tafsir card with an actual screenshot before publication.

## Hold subscription news (19 October 2026)

At the user’s request, keep subscriptions, monthly financial support and YooKassa cancellation review out of public news until explicitly approved for announcement. Filter both installed/waiting release copy and legacy cards. Keep the current major roundup, acknowledgement and expiry. The support page and direct cancellation-review route stay available.

## Version 375 — personal account continuity (19 October 2026)

Profile identity checks no longer wait for counter uploads. Fresh login invalidates older pending checks, and unclassified network/gateway refusals preserve the local session. Confirmed Auth revocation still closes it. The minor-fix card uses the original SALAH account illustration; keep announcement 369, its expiry and dismissal state.

## Version 376 — readable leader badges (19 October 2026)

Move the weekly/monthly winner medallions below the nickname in the podium and ranking list. Increase them from 12 to 32 CSS pixels, preserving each person button and the existing ranking order. The minor-fix card reuses the matching week/month medallion artwork. Preserve announcement 369, its expiry and acknowledgement.

## Version 377 — visible leader award artwork (19 October 2026)

The podium now groups avatar and nickname on one aligned row, then centres a large trophy and readable award caption below it. CSS viewports remove the existing PNGs’ transparent margins without modifying the supplied artwork. List rows use the same hierarchy at a compact size. Keep announcement 369, its expiry and acknowledgement.

## Version 378 — balanced leader award size (19 October 2026)

Reduce podium trophies from 88 to 72 CSS pixels and list trophies from 64 to 56, retaining the artwork crop and readable captions. Reduce the podium identity area to 90 pixels to match. Preserve announcement 369, expiry and acknowledgement.

## Version 379 — continuous Mishary and Maher playback (19 October 2026)

Start online listening from the beginning with the provider's complete Hafs recordings for Mishary Alafasy and Maher Al Muaiqly. Keep the existing verse IDs for downloaded recordings, explicit ayah playback and saved ayah/time offsets. Hidden recording variants retain the public catalog and listening identities. Reuse a session-owned audio element across whole chapters and build the next track from validated catalog positions without waiting for reading-text downloads. Maher's checked recording has no provider ayah timing, so do not invent highlighting. The minor-fix cards use the two actual reciter portraits; preserve announcement 369, expiry and acknowledgement.

## Version 380 — reviewed adhkar readings and pronunciation (20 October 2026)

Keep the user-reviewed Sayyid al-istighfar and tahlil spelling and the readable Al-Ikhlas presentation. Use «уа» for the conjunction. Leave all other original readings, canonical Arabic, translations, sources, IDs and repetition counts unchanged. Scope the existing Madinah Unicode typography to surahs 112–114, with the bundled Amiri Quran fallback.

Add a compact gold play/pause button on the left for 13 recordings whose provider-published Arabic matches our formulas. Coordinate playback and update protection; stop sound on card or section exit. Keep three differing provider formulas excluded. Retain provenance internally; a complete phonetic listening audit is not claimed. Keep swipe/keyboard navigation and hide the unrequested previous/next buttons.

Update the existing adhkar illustration/card with the agreed spelling and compact audio control. Preserve the other 13 cards, announcement 369, expiry and acknowledgement. No subscription announcements. Publication authorized by the user on 20 October 2026.

## Version 381 — further approved adhkar readings (20 October 2026)

Publish the agreed Alim reading and the verbatim user-supplied raditu, hayy and hasbi spellings. Preserve the exact Cyrillic wording, punctuation and hyphenation. Keep all other readings, canonical source catalogue, IDs, repetitions and saved progress unchanged.

The selected raditu variant includes salawat. Add it to the Arabic display and its translation, retain the original catalogue, and enable the matching existing provider recording. Validate the displayed Arabic against the provider formula before returning any audio URL. Fourteen recordings are available; the differing sayyid and evening bika formulas remain excluded.

Update the existing adhkar feature card and reuse its approved illustration. Preserve the gallery, announcement 369, expiry and acknowledgement. No subscription announcements. Publication authorized by the user on 20 October 2026.

Play/pause consumes its click before replacing the SVG, preventing the detached icon target from opening the explanation panel through event bubbling. The counter remains independent.

## Version 382 — Asbahna and salawat spelling (20 October 2026)

Publish the user's Asbahna transcription verbatim, including «Асбахнаа», «аляя», «сууи-ль-кибар», punctuation and hyphens. In Raditu replace only «сал-ля-Ллаху» with the exact requested «салляЛлаху». Keep Arabic, translations, audio mappings, repetition IDs, targets and saved progress unchanged.

Reuse the existing adhkar feature artwork and gallery. Preserve announcement 369, expiry and acknowledgement. No subscription announcements. Publication authorized by the user; remaining adhkar are deferred to the next session.

## Version 383 — live Top SALAH listening total (21 October 2026)

Update the shared listening display from actual local audio progress while the eligible signed-in listener's server snapshot is in flight. Reconcile server acknowledgements without duplicate seconds, respect downward corrections and privacy changes, and reset the preview on account, date or period changes. Pauses, seeking, repeated renders and the page timer never invent listening time. Keep confirmed server scores authoritative for rankings and awards.

Reuse the existing Quran listening artwork and gallery. Preserve announcement 369, expiry and acknowledgement. No subscription announcements. Validate the real listening meter, stable DOM updates, server reconciliation and event cleanup.

## Version 384 — news-style invitation for friends (21 October 2026)

Show a separate illustrated invitation in the existing news-dialog style, with «Пригласить друзей», a chain-link button for copying the public link and «Позже». Offer it after eight idle seconds on Home after onboarding and existing public news, with no foreground playback, other dialog or celebration. Store a separate seven-day cooldown when actually shown, including dismissal by Escape; do not change the public announcement receipt. Restricted audiences receive no new invitation. Recheck guards at presentation time and clean up scheduled work and listeners. No inline Home banner.

Keep the existing Menu sharing actions, clarify the label and use the same link icon. Sharing only opens after an explicit tap and includes no account, reading position or tracking identifier. Preserve native cancellation, duplicate-tap protection, clipboard fallback and QR.

Add the feature-specific two-screen sharing illustration for this minor enhancement. Preserve the existing roundup, announcement 369, expiry and acknowledgement. No subscription announcements or outbound campaigns. Publication is part of the requested app sharing change.

Remove the redundant leader caption and separate own-place/time line above the Top SALAH podium as requested. Keep the shared total, period selection, podium times, badges, confirmed ranks and live updates unchanged; reuse existing Quran feature artwork for this minor cleanup.

## Version 385 — refined friend invitation (21 October 2026)

Use the existing night mosque artwork in a full-width hero, a quiet SALAH wordmark, a refined gold/ivory heading, and matching gold sharing/link controls. Replace the paragraph with the requested «Отправь ссылку тем, кому желаешь блага». Scope dialog styling to this invitation and preserve explicit sharing, native cancellation, clipboard fallback, safe Home-only idle guards and the separate seven-day cooldown. Keep the podium cleanup and public announcement 369, expiry and acknowledgement. Reuse the existing sharing feature artwork; no new media or subscription news.


## Version 386 — chapter continuation and steady mobile dock (21 October 2026)

Prepare the next recording metadata and saved-audio lookup while the current chapter plays. A ready automatic continuation starts on the already authorized media element directly from ended, without an IndexedDB or catalog wait. Preserve offline-only playback, finite boundaries, partial catalogs, playlists, cancellation and explicit Pause. Regress 7 → 8 with storage/catalog callbacks blocked at ended; physical iPhone locked-screen verification remains required.

Position the compact player from the navigation bar's layout bottom inset and height, rather than its moving screen rectangle during elastic scrolling. Disable Home boundary overscroll without disabling content scrolling. Reuse Quran artwork; preserve announcement 369, expiry and dismissed state. No subscription news.


## Version 387 — confirmed shared listening motion (22 October 2026)

The existing shared SQL total sums eligible listeners across reciters. Smooth confirmed remote additions over their observed reporting interval while keeping real local progress immediate. Never infer seconds from online counts or multiply listening time. Drain only an already confirmed backlog; reset on account, period, date, privacy changes, missing totals and downward corrections. Ranks, awards and stored scores stay authoritative. Update text in place, suspend animation while hidden and dispose the timer on exit. Reuse Quran artwork and preserve announcement 369, expiry and acknowledgement.
