# SALAH release announcements

## Version490 — centred phone player cascade (13 November2026)

Fix the phone layout regression reported on iPhone after488: the reader stylesheet also supplies compact two-column positioning for the now-playing contents. Explicitly set the expanded phone grid to one full-width column and place portrait/title/reader/status in rows1–4 with centred alignment. Keep the flexible portrait height. The user selected the gold reader name itself as the native reciter picker without an arrow; remove the duplicate dropdown row and keep reader/status as independent siblings of the portrait/title button, with no nested interactive controls. Shuffle, TV and share use the existing gold outline style and accessible labels in one compact icon row. Add a CSS cascade regression using actual player markup and relevant rules from both reader/player stylesheets at375×667,393×852 and430×932; this is not a browser pixel-layout test. Announcement486, expiry and acknowledgment remain unchanged. No audio or backend changes; real iPhone visual confirmation remains pending.

## Version489 — one nature-volume control (13 November2026)

Remove the redundant quiet/medium/louder presets and their event/CSS branches at the user’s request. The existing continuous0–100% background slider and percentage output remain, preserving the stored level, source selection, timer and Quran audio session. Public announcement486, expiry and acknowledgment are unchanged. No server, recording or scenic artwork changes.

## Version488 — retained player and compact phone controls (13 November2026)

Local playback checkpoint restores the same Quran reciter, chapter, exact track offset and shuffled queue on pause after document/native restart, without playing audio or awarding listening time. Save synchronously immediately before an update reload and on page hide. Preserve expanded/compact presentation when visible. Explicit mini-player cross or right swipe stops playback and removes the checkpoint; collapsing the full player only changes presentation. Phone controls use the available safe-area viewport with a flexible portrait; settings and the queue may still scroll when opened. Announcement486 and acknowledgment remain unchanged for these fixes. Nature field-recording candidates and scenic artwork remain review-only. Listening takes priority over inferred reading, and text behind an open dialog never reports reading. Observe player dialog open/close alongside app content so the transient reading stop is immediate for accounts and guests. No saved listening minutes or server changes. Physical iPhone layout/update QA remains pending.

## Version487 — iPhone player swipe and one playback control (13 November2026)

Native one-finger touch handling survives Safari pointer cancellation, ignores sliders and scrolled settings, and uses final touch-end coordinates. Header/portrait or empty player surface may dismiss downward from the top; upward portrait movement can scroll. Reset window scroll on opening. The heading is a div, avoiding the Quran-focus rule that hides all page header elements. Add a subtle grip. Remove the separate Stop button as requested, retaining the single play/pause control and remote/system Stop behavior. Remove the explicit bottom open-surah link at the user’s request; Quran navigation elsewhere stays intact. Preserve public announcement486, expiry and acknowledgment; no new news for this fix. No server changes. Actual iPhone gesture QA remains pending.

## Version486 — full player window (13 November2026)

The same unreleased edition also corrects the background balance: full0–100% nature gain, no extra0.4 attenuation, centred RMS-matched textures, and25/50/75 presets. Existing saved levels remain unchanged. Quran audio routing and source volume remain unchanged for native background continuity; device buttons control overall volume. The current full-player announcement includes the corrected range.

Portrait, surah title and arrow open the same native modal. The connected controls move, preserving the single audio session, playlist, timer and background controller. Phones use the full dynamic viewport and safe-area padding; desktop uses a centred window. Larger framed portrait, reader name, clear timeline and a gold main control retain the current palette. An explicit link still opens the current surah. Close arrow, Escape/backdrop and a downward swipe on the top section collapse without audio actions; ranges and scrolled settings never dismiss the window. Focus and body overflow are restored. Public announcement486 contains only this feature in a looping UI composition using the existing registered reciter portrait; private team announcement484 stays unchanged. Actual iPhone visual/swipe QA remains pending because browser automation is disabled in Work settings.

## Version480 — portrait Home balance (12 November2026)

Lift the existing Home prayer-center group by 20 CSS pixels on portrait phones at least 701px high while the live activity row and timetable are visible. SALAH, selected city, timetable and azkar suggestion move together; relative positioning preserves their dimensions, internal gaps and rendering without creating a transformed containing block. The activity row remains outside the shifted group, with the status-fade inset from479. Fixed audio player and navigation retain their viewport positions. Short phones, landscape, tablets, focus mode and activity-free Home keep their existing layout. Announcement479, its guest leaderboard artwork, acknowledgment and expiry remain unchanged for this cosmetic adjustment. Browser automation is disabled in Work settings; verify the final position on the user's iPhone after publication.


## Version479 — guests in the leaderboard and private app version (12 November2026)

New guest listening starts after a successful anonymous enrollment. A private installation capability protects its ledger; public IDs and short guest labels are separate from device/capability hashes. The existing real-progress audio meter supplies measured seconds; pause, seek and unknown identity never invent time. Durable cumulative per-reciter/day snapshots are monotonic and bounded against elapsed server enrollment time. Public boards combine unclaimed guests and eligible accounts before ranking and before the 1000-row cap, with one matching shared summary for all periods. Ordinary profiles, locations and identity permissions stay unchanged; guest rows have no account-card link or photo.

On sign-in, flush guest snapshots then claim that ledger with verified identity and an active auth session. Ownership changes atomically once; its guest row disappears and the same seconds enter the account score. Lost responses, repeats and another account cannot copy or reassign the claimed ledger. The registered local meter remains separate, so later account uploads cannot upload guest seconds again. Guest capability data is excluded from backups. Existing historical local device totals are not backfilled or guessed.

Restore version SALAH and observation date in the existing owner-only account card, using bounded server presence metadata and explicit unknown states. Move the Home indicator below the iPhone status fade (including short viewports), keeping its right alignment, original colours, zero hiding and animated digits.

Announcement479 contains only the new guest leaderboard composition; its number and focus previews use the shared alternating release-motion-preview loop until acknowledgment, respecting hidden/reduced-motion states. Server rollout requires the source schema supabase/guest-competition.sql, guest-competition, and reciter-competition with guest-board.mjs. Existing listening-now and owner-access remain unchanged.


## Version458 — earned collection and award presentations (4 November2026)

Keep every issued weekly/monthly win in the personal collection, grouped by award type with its dated results. Only the current finalized-period winner wears the transferable podium title; selection, scores and source award records stay unchanged. The existing MFA-protected owner-access user profile now includes every earned kind and up to 200 dated calendar wins in its read-only response; no schema or permission changes. Each of the fifteen earned types has a replayable presentation using its approved artwork. New non-founder awards queue once per account/device at a quiet Home screen; existing awards are initially baselined and remain manually replayable, avoiding a rollout popup burst. Existing founder welcome and account-scoped acknowledgement stay intact. The presentation stops on navigation, hidden state, account change or playback; it neither grants rewards nor changes listening time. Reduced motion, keyboard/focus, safe areas and queued-image failures are covered. New public announcement458 contains only the collection and ceremony feature compositions; no old cards or financial features are appended. Closed sections remain closed. The fullscreen owner profile now puts its bottom gesture inset inside the scrollable card rather than outside its grid viewport, removing the permanent dark clipping band while preserving safe final-row spacing and visible error/status text.


## Version433 — private account context (2 November2026)

Owner MFA profile shows selected prayer city and the last successfully rendered mushaf page with edition and server save time. Only the latest observation is retained; no page history, precise coordinates or IP location is collected. Checkpoints belong to the signed-in account and do not backfill anonymous/device bookmarks. Existing presence heartbeat carries the bounded optional context; older clients remain supported. Keep public announcement425 and closed Knowledge access unchanged.


## Version432 — private connection recovery and compact win history (2 November2026)

Keep the existing425 public announcement, acknowledgement, expiry and feature artwork. This minor fix hides the remote classroom frame until its verified loaded handshake, provides retry after load/auth errors, and avoids timing out while the app is suspended. All existing owner/session checks stay in force; public sections remain closed. History now separates finalized weekly/monthly results with two period buttons; dates are visible and listening hours expand on tap. Winner-card access still refreshes public visibility before export. No award/listening data is changed. Cabinet role/tab navigation replaces the current history entry; a short account-scoped in-memory portal cache removes repeated downloads while server authorization stays authoritative. Use a teacher-at-board icon. Learning access requires explicit owner/teacher addition to a lesson: shared links cannot self-enroll a user. Reject unassigned student portals and direct lesson/work access server-side. Registered nickname search and add/remove live in the class pupil roster. Reuse existing private enrollment tables/RLS; no migration or payment processing.


## Version431 — learning entries and transferable period titles (2 November2026)

Place the server-verified owner-cabinet entry first in My Account, before the avatar, statistics and awards. Move current-role teaching and enrolled-student entries to the start of Knowledge; teacher management remains in the owner workspace. Read roles only from the existing verified classroom portal response, reject late/switched-account results, and never expose experimental Knowledge cards to public visitors. Weekly/monthly titles belong to one winner of the latest finalized period and transfer only after the next completed-period result. Keep original awards as historical records; show full win history from the bottom of Top SALAH. Public podium badges, own account and owner-viewed user profiles use the same current-holder rule. Ties select one stable holder by score, award timestamp, account ID and award ID. No source award records are deleted or rewritten. Preserve430 listening persistence,429 Quran queue transitions, announcement425, acknowledgment and expiry.


## Candidate430 — durable personal listening in Top SALAH (2 November2026)

Use the greater of the confirmed board score and the account-scoped local period counter for the displayed own-reciter duration. Remove mount-local additive previews: reopening must retain locally recorded pending time; server acknowledgment must not add it twice. Other-device time comes from refreshed confirmed results; local display cannot change the confirmed rank. Checkpoint actual media progress at most every five seconds from media callbacks, even when background interval timers are suspended; save the final tail on pause/end and sample before pagehide/visibility saves. No invented listening credit or live database changes. Exact historical27-minute difference is not proved from present records. Minor fix retains announcement425, artwork, acknowledgment and expiry. Quran429 queue changes and closed-section gates remain unchanged. Local candidate, not published.


## Version429 — preserve Android device compatibility (2 November2026)

Google Play detected28 devices excluded by permission-implied hardware requirements in the428 candidate. Declare location, GPS, network location and microphone hardware optional: city selection and the application remain usable without location/recording hardware. Preserve runtime permission requests, manifest components and all428 Quran queue continuity changes. Verify optional declarations in the actual built App Bundle. Minor release preserves announcement425, artwork, acknowledgement and expiry. Closed sections remain closed; no account data or listening scores are changed.


## Version428 — Quran queue audio-session continuity (2 November2026)

Keep one playback-category owner throughout the Quran queue. Automatic chapter transitions reuse the permitted media element without unloading its source or releasing/reacquiring the OS audio session. Retire old player callbacks before switching; maintain pause/stop precedence and release the category at final completion, failure or explicit stop. Preserve existing announcement425, artwork, acknowledgement and expiry. No recording replacements, listening-time corrections or closed-section access changes. Automated lifecycle regression is covered; iPhone locked-screen acceptance remains necessary.


## Version427 — shuffled daily ayah (30 October2026)

Fix the existing Ayah of the Day selector: use a reproducible shuffled cycle across all6236 Quran ayahs instead of advancing by one ayah per calendar day. Same local date gives the same reference, including offline and after reopening. Every ayah appears once per full cycle; prevent an immediate repeat at cycle boundaries. Text, translation, reading/listening/share actions and closed access gates are unchanged. Minor fix retains announcement425, artwork, acknowledgement and expiry; no new Home announcement.


## Version426 — compact account and current-recording preparation (30 October2026)

Minor account layout and audio-startup refinements. Keep announcement425, its one alphabet illustration, acknowledgement and expiry unchanged. Do not append a new news card. The three learning-account entries share a compact bordered group; remove only the My Support link inside the account, preserving Main Menu support. Prepare only the current valid short recording; no autoplay, library download or source/wording changes. The Saba alternative remains a separate unpublished listening decision.


## Candidate 421 — closed learning accounts

Connect the prepared teacher/student cabinets and homework exchange to the
existing protected API. Import the learning UI only when entering the lesson
route. Teacher assignments and enrolled-account access remain server-checked;
all three experimental public Knowledge cards remain disabled. Keep announcement
418 and preserve the startup repairs and portrait/Azkar changes from 419–420.
This candidate is local and not published; public source disclosure requires
the explicit consent requested by the earlier automatic approval review.

## Version 420 — portrait and Azkar refinements (29 October 2026)

Use the user-requested charcoal portrait background for Peshawa, preserving the
original source file and recording the derivative. Remove hub-card arrows and
increase the current-period label to 12px, placed in the card flow. Existing
card actions and saved progress are unchanged.

The 418 worker recovery also covers owner.html, the owner's existing Home
Screen launch URL. Normal working-version update gates remain in place.
Preserve announcement 418, illustrations, acknowledgement and expiry.

## Version 419 — restore startup after update (29 October 2026)

Restore the APP_UPDATE_DATE export required by the main entry. Its removal in
418 prevented the entire browser module graph from linking after the cached
update activated. A module-link check now validates every HTML module entry
without executing browser code. Keep announcement 418, its artwork, expiry,
and acknowledgement. This repair does not introduce a new announcement.

The worker asks its predecessor for release metadata. Only a confirmed broken
418 predecessor triggers immediate activation and navigation of existing app
windows after the complete corrected shell has been cached. This restores the
existing iPhone Home Screen app; a reinstall is not required. Working versions
retain the normal safe-screen update gate. Account storage and media caches are
not cleared. The independent recover.html page provides an optional fallback.

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


## Version 388 — shared mobile viewport (22 October 2026)

Use one top-anchored dynamic-height mobile container for navigation and the compact Quran player. Preserve the safe inset, eight-pixel gap, natural scrolling and full-player dialog. Desktop and About retain their layouts. Physical iPhone floating-dock and locked-screen verification remain required. Reuse Quran artwork; preserve announcement 369, expiry and acknowledgement.


## Version 389 — guarded iOS audio interruption handling (23 October 2026)

The user reports that force-closing the separate Sahaba home-screen web app also stops Quran playback in SALAH. Source inspection found no cross-app pause channel. Treat shared WebKit/system audio-session interruption as a hypothesis, not a reproduced root cause.

Request the playback audio-session category only while Quran playback is intended. After an explicit OS interrupted → active transition, recover the same media element and position once if it remains paused. Manual pause, stop, track disposal and replacement cancel recovery. Generic pause, visibility changes and page lifecycle events never initiate playback; do not steal focus while another app or a phone call still interrupts the session. Unsupported APIs degrade to existing HTML audio.

Reuse existing Quran feature artwork. Preserve announcement 369, expiry and acknowledgement. Private video lessons are excluded from this release. Physical iPhone reproduction (both apps installed through Add to Home Screen, close Sahaba while SALAH is playing) remains required. JavaScript cannot recover after iOS terminates the SALAH process itself.


## Version 390 — full-audit corrections (23 October 2026)

Prevent stale final Auth session reads from signing out a freshly accepted login or returning an old identity. Preserve both fixed Quran edition identifiers in validated backups, while rejecting unsupported editions and unknown fields. Add accessible previous/next step names to existing prayer learning; localize fallback map zoom buttons and Quran ayah-count plurals.

Use existing account, Quran, prayer-pose and Qibla feature artwork. Preserve announcement 369, its expiry and acknowledgement. Private video lessons are excluded. Device-specific iOS background audio, hardware permissions, real push delivery and Google Play upgrade delivery remain separately unverified; the browser audit must not claim them as passed.

## Version 391 — names of Allah (23 October 2026)

Add the names study and five-question practice in Knowledge. Its own Arabic
card illustration opens the roundup; preserve all 14 earlier cards. This is a
new feature announcement, so advance its identifier to 391 and the three-day
window to October 26. Keep lessons private and payment news excluded.
See allah-names-sources.md for the editorial policy and sources.

## Version 392 — Safari standalone foreground audio recovery (23 October 2026)

Version 389 relied on AudioSession.state/statechange, absent from shipping Safari
according to MDN BCD api/AudioSession.json; WebKit DOMAudioSession.idl gates them
behind DOMAudioSessionFullEnabled. Keep playback category, add a one-shot
foreground/focus return recovery only for standalone pages whose intended
playback paused during a background transition. Resume the existing element
and position; never retry generically, while hidden, or after explicit UI or
MediaSession pause/stop, owner replacement or destruction. Full API support
also handles an active event delivered before the media pause.

Sources: https://github.com/mdn/browser-compat-data/blob/main/api/AudioSession.json
and https://github.com/WebKit/WebKit/blob/main/Source/WebCore/Modules/audiosession/DOMAudioSession.idl.
An OS-frozen/terminated PWA cannot run this recovery until it returns; continuous
background playback across closing another PWA is not guaranteed. The exact
physical-iPhone scenario remains pending. No SAHABA code or private lessons
are published. This minor fix preserves announcement 391, its artwork/gallery
and acknowledgement/expiry.

The shared listening counter now drains confirmed remote seconds over the actual
observed response interval, including delays longer than 15 seconds. Separate
local batches replay at 1x; ordinary single-second samples stay immediate.
Foreground return seeds the fresh total instead of replaying hidden time. Stored
scores, eligibility, ranks, awards and server SQL are unchanged; no seconds are
extrapolated. New original vector artwork shows two measured totals and their
sum. Keep announcement 391, all earlier roundup cards and private lessons.

## Version 394 — shared-counter digit transitions (24 October 2026)

Only the shared total in Top SALAH changes: animate changing digits with a small
vertical fade, preserve the original text/spacing, and keep all count/rank logic.
Use the existing Prata family locally for lining figures on one baseline, with
equal-width digit slots. Per user feedback, unit labels are 80% of digit size.
Personal totals and the rest of the screen retain their existing appearance.
Respect reduced motion; expose one current accessible value, without duplicate
old glyphs. Pauses, snapshot corrections and unknown values never invent seconds.
Keep announcement 391, its expiry and acknowledgement. Reuse the existing
shared-listening-392.svg illustration. Pending update-choice PR 254, the private
update channel, lessons and payment announcements are excluded.

Remove the large roundup banner from Menu at the user's explicit request;
keep Home behaviour, announcement acknowledgement and Settings → What is new.

## Version 395 — upcoming learning formats (25 October 2026)
At the user's request, publish announcements for «Онлайн-занятия», «Муаллим Сани» and «Прямой эфир».
Show three static cards at the end of Knowledge, preserving all existing study links.
Each uses a real disabled gray button labelled «Скоро», with no launcher, URL, token or API call.
Online lessons cover tajwid, Arabic and future teacher-selected subjects; the name describes live classes rather than prerecorded videos.
Publish only feature-specific original illustrations of a classroom, course and broadcast presentation.
The existing roundup keeps its fifteen cards and adds the alphabet PDF card and three future-format cards.
Advance the announcement identifier to 395 and its three-day window to October 28 because the user explicitly requested new public news.
Keep the large Menu banner removed.
No private video-room client, LiveKit configuration, invitation, full Muallim course, private update prototype or alphabet audio draft is included.
The public availability is «Скоро», not a claim that lessons, broadcasts or the course are launched.


The user also requested pictures of the existing names of Allah, Arabic letters, and downloadable alphabet options. The roundup starts with names and the new alphabet PDF composition. The alphabet now offers a one-page letters/names PDF and the two-page contextual-forms PDF. Both omit the technical footer, as requested. Audio remains outside this public release.

At the user’s request, each Knowledge section has a distinct thematic icon rather than repeated books: names, letters, Kaaba, prayer, washing, steps, classroom, vowel study and broadcast. These are original vectors, with actual Amiri outlines for Arabic glyphs.


## Version 396 — closed owner previews (25 October 2026)
Keep announcement 395, all public copy, its expiry and acknowledgement.
The verified owner sees private test links for online classes and Muallim Sani, and a clearly labelled layout preview for the not-yet-launched broadcast mode.
Ordinary users retain disabled gray Soon buttons. The owner status comes from the existing server-verified owner-access check, not a query parameter or storage flag.
Knowledge refreshes after owner verification/revocation. Alphabet and names readers do not add owner polling.
Links contain no secret, token or invitation. The private gateway retains its separate authenticated classroom session; full course and chat remain outside the public bundle.
The new course view in the private client checks the teacher session. Broadcast preview is explicitly a layout/description and does not claim working live-broadcast controls.

2026-10-25 user revision: current news includes only this release’s four changes, without appended older reciter/Qibla/travel cards. Keep announcement 395, expiry and acknowledgement unchanged. Knowledge symbols retain 36px tiles, use 28px thematic masks in the existing gold theme, with no orange filter. Queuing an update hides its banner and preserves audio until safe activation.

397: verified owner checks open inside SALAH through a restricted frame and existing server-side owner authorization. Public launch buttons remain disabled. New course content and private video transport remain outside the public bundle. Announcement 395, expiry and seen state retained.

398: cross-origin lesson input focus now drives a scoped iPhone visual viewport layout, preserving the same frame and draft, hiding the dock/footer while typing and restoring them afterward. Closed lesson camera decoration uses a separate layout slot. A foreground owner grant is revalidated after suspension instead of treating UI-cache age as revocation. Explicit sign-out still closes the preview. Book cursor bridge is restricted to validated owner messages. Public announcement395/acknowledgement and disabled launches remain unchanged.


### 399 · 26 October 2026 · closed course persistence
The owner-only Muallim course is now adapted into SALAH lessons. Only its bounded progress validator and origin/nonce-protected first-party progress bridge are in the public wrapper; the teaching content and source pages remain private. Existing announcement395, acknowledgement and expiry stay unchanged. Public users continue to see Soon.


###400 ·26October · closed inline learning navigation
Muallim and live preparation render in the app like alphabet and Umrah. Only public rendering code is bundled; owner-only teaching data use a narrow authenticated GET API with exact-origin CORS and in-memory reuse. Original pages remain an explicit reference. Other users retain disabled Soon controls; announcement395 is unchanged. The local preview missing-import defect and legacy lesson routes are corrected.

###401 ·26October · closed section loading
Verified owners reuse a validated first-party course package across app launches; Knowledge prefetches it once. Sign-out/revocation clears the course cache and no bearer is stored or backed up. The separate private lesson service uses a lazy media bundle, one authenticated list bootstrap and compressed, ETag-validated static assets. Media is prepared on prejoin so the Join tap retains its audio gesture. Other users retain Soon; announcement395, expiry and acknowledgement remain unchanged.

###402 ·26October · dhikr completion and everyday dua pronunciation
Only new public changes appear: deliberate continuation after the prescribed dhikr count and61 everyday duas with43 exact-formula audio mappings. Two original feature compositions accompany this announcement. No old reciter/Qibla cards are appended.
Closed teaching-room improvements and source-checked additional reading rows remain owner-only. Visible source citations have been removed from dua/course cards at the user’s request; internal references remain available for text/audio checks.

## 403 — closed account lessons, 2026-10-26

Version403 adds invitation-only account enrollment and the private teacher schedule. Public knowledge cards remain Soon. The public announcement stays402with its existing acknowledgement and expiry; no old feature cards are re-announced. Schema20261026114530is applied with private tables and no direct browser-role access. Lesson reminders use the browser/PWA delivery path; Android native lesson push remains a later phase. Actual authenticated lesson enrollment and closed-app delivery require the private device check.

## 404 · 27 октября 2026

Только новые тематические подборки повседневных дуа с иллюстрированными обложками. Ранее показанные карточки не повторяются. Кабинет команды доступен только сотрудникам по прежним серверным правам и не анонсируется публично.


## 405 · 27 октября 2026 · кабинет и карточки

Исправления кабинета владельца, отдельных экранов настроек и переписок; компактный список пользователей и самостоятельный профиль с раздельными блоками. Доступ остаётся по прежним серверным правам/MFA. Назначение преподавателей не активировано: кнопка «Скоро», без новых API/ролей. Учебные разделы сохраняют прежние owner-only ограничения. Общий счётчик больше не проигрывает очередь подтверждённых секунд с ускорением. Публичное объявление404, иллюстрации, срок и отметка прочтения сохранены.

## 406 · 27 октября 2026 · первое открытие и оформление

Исправлен переход из личного аккаунта в кабинет владельца: общий визуальный класс больше не принимается за готовый кабинет. Возвращены тонкие рамки пунктам меню; устранены двойные боковые отступы и внешняя сужающая оболочка авторизованного аккаунта. Заголовок «Азкары» использует белый шрифт и масштаб раздела «Знания». Это исправление: объявление 404, иллюстрации, срок и прочтение сохранены. Закрытые разделы, серверные права, MFA, данные и аудио не изменены.

## 407 · 27 октября 2026 · компактный аккаунт и верхняя строка

Уменьшены аватар, награды и промежутки личного аккаунта, три награды полностью помещаются в ряд. Скорректирован одинарный контур значка сообщений. Верхние строки аккаунта и кабинета получили дополнительный отступ от системного края iPhone, строка кабинета — непрозрачный фон; эффект системного размытия требует подтверждения на устройстве. Публичное объявление404, срок и отметка просмотра не меняются. Права, MFA и закрытые разделы сохранены.

В эту же407 включена компактная мобильная раскладка меню, настроек и вложенных карточек кабинета: короче строки, меньше промежутки; убраны двойные внутренние отступы групп настроек. Поля ввода сохраняют шрифт16px, цели нажатия — от44px.

Дополнительно уплотнён «Обзор» и рассчитана высота плиток короткого кабинета для портретного экрана; в меню/кабинете убран нижний авторский блок, создававший лишнюю прокрутку. Длинные списки продолжают прокручиваться. Строки пользователей оформлены отдельными закруглёнными карточками с полной рамкой и без вложенного сужения.

В профиле пользователя удалена контрастная прямоугольная подложка; фон общий с приложением, верхняя навигация получила цельную закруглённую рамку.

Компактный масштаб применён также к отдельной карточке пользователя: меньше аватар, заголовок, награды и промежутки между панелями; основные текстовые сведения и удобные кнопки сохранены.

## 408 · 27 октября 2026 · внутренние карточки знаний и подпись

Для подтверждённого владельца три закрытые карточки знаний оформлены обычными карточками с внутренними маршрутами view: онлайн-занятия, Муаллим Сани, прямой эфир. Открытие остаётся в SALAH с внутренним возвратом; прежние preview-ссылки поддерживаются. Для остальных пользователей — прежние три отключённые кнопки «Скоро». В кабинете владельца включены реальные поиск зарегистрированных аккаунтов по нику, назначение и отзыв роли преподавателя с серверной проверкой владельца/MFA, ревизиями и приватной историей. Роль сама по себе не открывает новые учебные разделы; доступ к урокам остаётся закрытым. Подпись SALAH by Saadi Kobilov восстановлена компактно над нижней навигацией меню и кабинета, не увеличивая страницу. Объявление404, срок и прочтение сохранены.

В408 также закреплены камера и удаление фото у компактного аватара, заголовок аккаунта уменьшен и отодвинут от системного края. Убрана чёрная полоса заголовков кабинета, зелёная точка поддержки закреплена внутри плитки. Фото в карточке пользователя увеличено, четыре панели уплотнены. Кнопка возврата «Меню» на странице «О приложении» учитывает безопасную область iPhone.

Общий чат команды закреплён первым по умолчанию; переписки можно закрепить/открепить отдельно для аккаунта на этом устройстве. Серверный список личных чатов возвращает идентификатор собеседника для защищённой загрузки аватара; видимость переписок и доступ к фото не расширены.

## 409 · 27 октября 2026 · подпись внизу меню

Авторская подпись возвращена в обычный поток в конце меню. Закрепление над нижней навигацией удалено: в кабинете владельца и его внутренних разделах, включая пользователей и переписки, подпись больше не накладывается на карточки. Публичное объявление404, срок и отметка прочтения сохранены; доступы и данные не изменены.

## 410 · 27 октября 2026 · кто слушает Коран

В Топе у открытых профилей участников появился полупрозрачный значок наушников у аватара. Он основан на продвижении записи Корана, отправляется не чаще раза в15секунд и истекает через45секунд без свежего сигнала. Пауза, завершение и ошибка записи отправляют остановку; порядковый номер защищает от запоздавшего запроса. Наушники обновляются без повторной анимации рейтинга. У скрытых и анонимных профилей статус не показывается. Время, рейтинг и награды не меняются этим механизмом. Новость410 содержит только эту возможность с отдельной иллюстрацией; срок прежнего окна новостей сохранён. Закрытые разделы знаний не открыты.

## 411 · 27 октября 2026 · подпись в меню как в аккаунте

Авторская подпись в главном меню получила прежний размер17/12px, стандартный промежуток между названием и автором, а также отступ36px от разделительной линии. Сохранено обычное положение в конце страницы. Нижний запас прокрутки учитывает безопасную область и навигацию, чтобы подпись оставалась доступной над панелью. В кабинете подпись не показывается. Объявление410, срок и отметка прочтения не сбрасываются.

## 412 · 27 октября 2026 · подпись меню без прокрутки

Сохранён размер авторской подписи17/12px. Уменьшены пустые промежутки около подписи и приглашения, нижний запас страницы согласован с навигацией и безопасной областью iPhone. Компактные отступы меню включаются также на экранах высотой до820px. В проверке390×844 и375×812 подпись видна при открытии меню, без прокрутки и перекрытия панелью. Объявление410, срок и прочтение сохранены.

В412 также удалена устаревшая карточка «Большое обновление SALAH» с главной, включая старые изображения и текст о мусхафе, чтецах и карте. Она больше не зависит от отметки прочтения и не возвращается при обновлении. Актуальное «Что нового» остаётся доступным отдельной кнопкой в настройках приложения.


## 413 — Menu spacing

Menu title now starts 24px below the safe content inset. Its rows share the available phone height, leaving the normal-flow author signature 16px above the dock. Natural minimum row sizes and scrolling remain available for short screens and larger text. Announcement410 and its acknowledgement/expiry are unchanged.


## 414 — Large Menu buttons

Restore large phone Menu rows: at least52px, account60px. Their explicit flex basis cannot shrink. Reduce empty heading and inter-row gaps on short phones; keep title24px below the safe inset and the author signature in normal flow. Announcement410 and closed learning sections remain unchanged.

The Menu section explicitly spans the available width and receives the remaining viewport height after the safe title, footer and dock reserves. This prevents auto side margins from narrowing the buttons and removes the marked empty area below the signature by growing the buttons.


## 415 — Menu hierarchy and SAHABA

SAHABA moves from Menu to a regular Knowledge card, retaining its existing destination and external-link protections. Support SALAH remains a separate visible Menu action. Menu recovers unused footer and heading space for its eight rows; personal account has a72px minimum, larger42px portrait,18px name and stronger gold surface. Author signature remains in normal flow,8px clear of the bottom dock on standard phone sizes. Announcement410 and private learning gates remain unchanged.


## 416 — Menu button block offset

Move the button block40px farther below the Menu heading, preserving its row minimums, emphasized personal account and visible support action. Use the current dynamic viewport height for the Menu height budget so the author signature aligns with the fixed navigation rather than leaving a smaller-viewport gap. Keep the8px signature clearance; existing SAHABA placement, announcement410 and closed learning gates remain unchanged.


## 418 — 29 октября 2026 · Азкары и свой счётчик

Главный экран азкаров использует палитру Знаний и пять крупных карточек. На обычных портретных экранах390×844 и375×812 все действия видны без прокрутки; на меньшей высоте и при увеличенном тексте прокрутка остаётся доступной. Свой счётчик: восемь коротких формул, отдельные локальные круги и цели, свои тексты; общий накопленный счёт и прежняя привязка к аккаунтам сохранены. Резервные копии поддерживают новое состояние. Картинка short-dhikr-418.svg создана кодом SALAH и показывает эти изменения. Новое объявление418 включает только этот выпуск. Учебные разделы и закрытая неопубликованная417 в выпуск не входят.


### Pending418: eight reciters

Added a second current-edition feature picture made from the eight actual reciter portraits. The Azkar picture remains within this same unpublished edition. Each portrait is documented in `reciter-expansion-20261029.json`. No generic reciter artwork, old reader announcement, closed classroom news or Home banner is added. Announcement ID and expiry remain418 /2026-11-01.

## 422 — Azkar reading palette

Morning/evening lists, reading cards, counter dock, audio and reading settings use the same navy palette as the Azkar hub. Layout, count behavior and public access gates are unchanged. Minor visual fix: retain announcement 418, acknowledgement and expiry.

## 423 — Menu bottom breathing room

Move the phone Menu button stack and footer up16px by reducing the title-to-buttons gap and reserving the same extra bottom space. Keep large button dimensions, title position and existing closed access. Minor visual fix retains announcement418 and expiry.

## 424 — resumable iPhone pause

Keep the playback audio-session category for an existing paused Quran track while clearing playback/recovery intent. Release on stop, completion, error or destruction. Preserve original announcement418 and acknowledgement/expiry; this repairs existing system controls, with no new feature announcement. Portrait changes are excluded.

## 425 — Letter names on tap

One public feature: names of the28alphabet letters play by tapping the large letter, with no visible media player. Complete short-name audio accepted by the user, from Alfathon (repository MIT declaration, ©2025 Erkin Kholmatov; original performer not identified). Volume gain and MP3 conversion documented per file. New code-native letter-card/speaker artwork alphabet-audio-425.svg. Attribution and full license in About and alphabet-audio-credits.html. Recordings load only on request and cache after real use, including Safari byte ranges. The rejected WAV set is excluded.

The same names and a separate Hamza clip are available in already-private Muallim letter headers; no syllable recordings fabricated and no course gates opened. Internal owner profile adds only a day-specific yes/no Azkar activity mark, with no per-dhikr details in its API or UI. It is not a public ranking or feed announcement.


## 434 — History award date

Minor history layout correction: below the winner show the actual earnedAt date in the competition calendar zone Europe/Moscow; full period and listening hours stay inside native disclosure. Weekly/monthly tabs, identity privacy and current transferable titles are unchanged. Unknown timestamps are labelled, never inferred from the period end. Announcement425, acknowledgement and expiry retained.

## 435 — Period labels and phone disclosure
History identifies the period won: compact week date range or month name and year, such as October2026, rather than the next month's handover date. Exact period, optional actual earnedAt date and listening hours remain inside the disclosure. On narrow phones these details and card action stack in a full-width column so seconds do not become an isolated line. Minor refinement, announcement425 and closed access unchanged.

## 436 — Stable Knowledge opening

Resolve the role-checked cabinet entry before revealing the signed-in Knowledge catalog, so late insertion cannot push already visible cards down. The brief status has a three-second limit; on timeout/error the public catalog opens without private cabinet links and late responses cannot insert anything. Guest catalog stays immediate. Server role/session checks and all closed access remain unchanged. Minor fix retains announcement425. Ranking preview is excluded.


## 437 — Knowledge navigation without repeated loading flashes

Warm the role decision on Home; retain only two navigation booleans in memory for 30 seconds, keyed to the verified live account token. Re-entering Knowledge reuses this bounded decision after the live session guard instead of refetching the portal every time. No lesson data, credentials or new permissions are persisted. Cabinet endpoints still authorize each entry. Already mounted Knowledge catalogs survive unrelated same-state renders. Home prayer-card opacity animation no longer restarts on every route return. Announcement425 and expiry preserved; Top SALAH and closed gates unchanged.


## 438 — Menu copy and conditional atmosphere controls

Minor layout corrections after the functional audit. The guest sign-in title and subtitle share two grid rows beside the avatar, within the existing large account tile. Authenticated account tiles and the rest of the menu keep their sizing and behavior. Verified at320×568,394×852,430×932 and1024×768: no horizontal overflow, all account-copy bounds inside the tile. On short screens normal scrolling remains available.

The atmosphere audio retry button obeys its hidden attribute: it stays absent when sound is disabled, and is available only when enabled sound needs another user gesture. The fix is scoped to ambient settings, preserving all other pages.

Retain announcement425, its existing artwork, acknowledgement and expiry. No new home promotion or release banner. Top SALAH visuals, tabs, ranking formula, awards, recordings and closed-feature access are unchanged.


## 439 — Stable private profile scrolling

Presence polling could recreate a focused profile heading and scroll the owner away from the section being read. Restore heading focus without scrolling and preserve the profile scroll offset during replacement. A fresh profile opening starts at its own top. The private profile now owns one fixed viewport scroll region with safe-area padding and a sticky return bar, instead of delegating the long screen to the iPhone document rubber band.

The actual pre-fix interface reproduced a presence update moving document scroll790.4 to0. The corrected interface retained profile scroll660.8 and the last account panel position through six changing presence responses. This is browser verification; physical iPhone gesture acceptance remains required.

Retain announcement425, acknowledgement, expiry and artwork. No ranking, award, audio-file, role or closed-feature access changes.


## 444 — Preserve sessions during Auth interruptions

A stalled account check now settles to a recoverable state after12seconds, superseding late responses without clearing stored credentials. An access-token rejection after one successful token refresh is not treated as proof that the refresh session was revoked. Explicit session/user/refresh-token revocations remain final, and private gates still require current server verification and MFA. The initial account title is neutral until the session check completes. A temporary owner gate error shows Retry instead of the sign-in form; fresh authentication resumes through the existing SDK. No credential, permission, closed-section or ranking formula change.

The server write optimization is prepared separately and is not deployed in444. This release changes only the client. Existing announcement425, acknowledgement, expiry and artwork stay unchanged. Guest counting and the separate443 statistics/geography candidate are not included.


## 445 — Native startup and update feedback

The installed Android package can now remove a legacy browser worker at its local app origin and reload the same route from APK or verified active assets. Recovery runs once per Activity, checks the local origin in Java and JavaScript, and leaves credentials, settings, reading progress, IndexedDB and downloaded audio intact. Normal ready/version acknowledgement, archive verification, Families protection and failed-bundle rollback remain enabled. Clean launches do not reload.

A rejected web update no longer reports “current”. Unsupported descriptors, required Google Play upgrades, bridge failures, offline state and ongoing downloads have distinct outcomes. The native settings screen hides the redundant browser install action. Manual checks stop waiting after20seconds while a native download can continue. Web updates445 onward require native445, so this native repair must be distributed through Google Play before older APKs can receive subsequent web releases.

Retain announcement425, acknowledgement, expiry and artwork. This candidate does not include guest analytics, geography, server ranking optimization, reminders, new recordings or expanded closed-section access. The tester screenshot proves web338 is visible; it does not establish the installed APK version. Physical-device upgrade acceptance remains required.


## 446 — Owner activity, selected city/country and compact list-row awards

Publish the previously prepared activity chart with period summary, day selection and collapsed complete daily list. Owner-only geography shows active verified SALAH accounts by their selected prayer city and optional country, kept separate from website visitor counts. Profile labels use city, country. The optional country is transmitted with existing authenticated foreground context; old clients remain supported. Existing city-only rows stay honest until the selected country is sent. No GPS/IP lookup, coordinates, city guessing, movement history or staff visibility is added.

Only lower ranking list rows place the existing leader artwork beside the nickname with50px width and12px gap; podiums, formula, ordering, periods and switches are unchanged. Preserve all444/445 session/startup/update recovery and closed-section gates. No441 audio,442 sender or guest analytics included.

Minor owner-only interface work and the accepted badge refinement retain announcement425, its current feature artwork, acknowledgement and expiry. No new Home promotion.

## 447 — Simpler owner statistics and separate profile scrolling

Remove the duplicate Overview destination. Keep the existing Visits layout, chart, periods and totals without adding another summary. Old overview links resolve to Visits. Geography is always visible and its city/country tabs remain; remove the duplicate complete-day list while keeping chart day selection and accessible arrows.

Keep the profile navigation outside its single viewport content scroller, so the toolbar cannot paint over the portrait. Preserve the reading position through presence updates and reset it only on a new profile opening. Refine the existing Menu owner emblem to a quieter circular gold/navy S without changing its meaning, owner gate or roles.

Retain announcement425, artwork, acknowledgement and expiry. Top layout/formula, audio, authentication, native runtime minimum445 and closed Knowledge access remain unchanged. Explicitly requested one-off country backfill for existing Tyumen/Omsk/Ganja rows was applied separately; it changes no chosen city or timestamps and is not a migration or guess for ambiguous cities.

## 448 — Owner tile caption fit and distinct staff icon

Owner cabinet cards use content-based row minimums and normal-height page flow below the My Account return. Keep captions inside the card at shorter viewport heights, allow captions to wrap without horizontal overflow, and permit document scrolling when the safe-area/viewport budget cannot fit the content. Preserve existing text sizes and the five-row/two-column layout; no clipping or line clamp hides labels.

Use an identity badge icon for the Employees tile and navigation, distinct from Users (people) and Teachers (book). The shared staff messenger icon system and all role checks remain unchanged.

Minor cosmetic fix retains announcement425, artwork, acknowledgment and expiry. No Top, audio, access, private data, native minimum445 or closed-section changes.

448 also removes the unrelated invitation screen during teacher/student cabinet loading. A shared data-free shell keeps the requested cabinet heading through the lazy import and live server authorization, with static placeholders rather than an invitation title or checking-login page. Actual invitation, denial, retry, session, role, account-scoped cache and closed-section checks remain in force. No automatic access is granted by a route title.


## 449 — Owner cabinet fresh entry

Opening the bare #admin cabinet entry from the account or main panel always starts at the owner section chooser. Remove module-level last-section fallback; explicit section links and existing Back/history routes keep their destination. Preserve announcement425, artwork, acknowledgment and expiry. No visual, Top, audio, access, server or native minimum445 changes.


## 450 — Continuous Sun and Moon visibility

Keep the existing independent astronomical paths and continuous position interpolation. Replace binary upper-limb rise/set visibility with a smooth half-degree fade and blend lunar daylight brightness continuously with solar elevation. Returning after a pause or switching city resets position without a streak while retaining opacity fading. Skyline masks, weather, fixed backgrounds and reduced-motion settings remain intact. Retain announcement425, artwork, acknowledgment and expiry; no prayer time, Top, auth or access changes.

For the reported Khujand background, lift only the visual projected track by 8.5 source percentage points to match its higher distant skyline; bound high arcs inside the sky. Preserve the photograph/mask alignment, actual city/time visibility and independent lunar path. Other artwork projection is unchanged.


## 451 — Visible celestial paths on every background

Fit the existing independent Sun/Moon paths inside each visible photo crop and above each artwork skyline, with one aligned source rectangle for masks and sky. Add a project-authored vector sky mask for the original mosque and a moving Sun. Keep the original mosque crescent and both photographs unchanged by explicit user preference; suppress a duplicate dynamic Moon only there. City backgrounds and New York use moving Sun/Moon. Preserve motion settings, astronomical visibility, weather, prayer city/calculation, Top, access, native minimum445 and announcement425/artwork/acknowledgment/expiry.


## 452 — Preserve renewed session during profile writes

Serialize SDK session-writing operations so a delayed profile/MFA response cannot compete with token renewal. Coordinate shared browser storage with exclusive Web Locks; busy/timeout skips never steal an active writer. Use the pinned SDK process queue when Web Locks are unavailable. Add offline regression using the actual pinned browser SDK and production client configuration with two clients, plus bounded busy/retry cases. No server/Auth configuration, token-reuse policy, session key, permissions, Top, audio, sky, native minimum445 or closed-section changes. Preserve announcement425, artwork, acknowledgment and expiry. Previously revoked sessions still require a new sign-in.


## 453 — Align the protected account confirmation action

Render the existing protected-entry action inside the signed-in account action grid, between earned awards and Account details, before Sign out. Match the full available row width, allow text wrapping, retain a52px touch target and vertical separation. Preserve the existing link, same-hash retry handler, visibility condition, MFA/server authorization and sign-out behavior. No Auth/token/session changes; retain452 renewal coordination, Top, native minimum445 and announcement425/artwork/acknowledgment/expiry.


## 454 — Opaque under-page canvas for history transitions

Set matching deep-night background colors on html and body, and isolate body painting so its existing negative-z scenery remains above the opaque canvas. This provides a dark under-page color for iOS history-swipe snapshots while keeping the original route gestures, Home scenery, Sun/Moon, scroll, media, auth, Top and closed sections. Browser fixture verifies opaque root/body and preserved scenic rendering; physical iPhone native-swipe acceptance remains required. Preserve announcement425/artwork/acknowledgment/expiry and native minimum445.

## 455 — Separate guests and signed-in accounts

Owner-only rolling24h/7d/30d aggregates from a new write-only guest-device counter and existing confirmed account presence. Await resolved authentication before counting guests; no names, email, IP-derived fingerprint or coordinates. Random persistent device UUID is hashed server-side, daily storage is private/RLS deny-all, requests and retention bounded. Record tracking start explicitly; do not reconstruct historical guests or sum guest devices and accounts as people. Preserve existing website statistics, geography, owner live-session/MFA gates, Top, closed sections, announcement425 and native minimum445.

Manual return-reminder controls are rebased from the held442 candidate: owner-only preview, explicit queue/cancel, existing connected devices, one device/account, weekly cooldown, local08:00–22:00 and120-second TTL. Preserve existing prayer/support/staff/classroom schedulers. No campaign is created or sent by deploying this feature. Existing owner-remindersv1/native-support-devicesv6 and private campaign migration already match; only the shared dispatcher still needs its separately approved deployment. No extra opt-in switch or second city.

## 456 — Compact guests and city/country drilldown

Compact guest/account counts with collection date and expandable help. Canonicalize known selected cities and country aliases consistently in the client, presence handler, owner aggregates and private SQL helper. Backfill only existing account-context city/country values without changing prayer settings, visit times or Quran checkpoints. City/country rows open paginated owner-only members for the same rolling period, retaining live session/MFA gates, private profile navigation and return focus. Preserve announcement425/artwork/acknowledgment/expiry, native minimum445, Top and all closed-section rules. No guest counting changes, reminder sends, new location provider or coordinates.

## 457 — Fresh Visits entry after leaving nested geography

Discard the selected city/country member pane when leaving Visits for another owner section. Re-enter Visits at the aggregate chart and geography, retaining the chosen period and already loaded totals. Dispose the old member list so late requests cannot reopen it. Same-section renders and opening/returning from an account profile retain their originating city list. No Auth, API, database, guest count, reminder, Top or closed-section changes. Preserve announcement425/artwork/acknowledgment/expiry and native minimum445.

458: добавлены пять постоянных наград за подтверждённое чтение и завершённые утренние/вечерние азкары. Карточка reading-adhkar-awards использует новые медали, показывает реальный путь получения; личного рекорда нет. Учёт начинается с явных действий в обновлённом приложении, без восстановления из закладок/посещений.

458 до публикации: подтверждение чтения упрощено до одной кнопки «Джуз прочитан» в конце каждого джуза. Учёт ведётся по 30 разным джузам, повторная отметка не увеличивает прогресс. Отметок страниц нет. Иллюстрации, идентификатор новости и срок показа сохранены.

## 459 — Control Center resume on iPhone

Explicit remote Play in a standalone type-only Safari audio session reacquires the retained playback category before the same media element is resumed; keep source and playback time. Duplicate Play and in-app/browser/full-state sessions do not cycle categories. A delayed native onplay cannot defeat a newer Pause, and an unsuccessful native resume consumes recovery intent. Preserve announcement458, its artwork, acknowledgement and expiry, native minimum445, new awards and all access rules. Physical iPhone background resume acceptance is required; no universal WebKit fix is claimed from emulated tests.

## 460 — Borderless Mushaf and two verified reciters

New announcement460 includes only a real borderless Mushaf screenshot and the new Ahmad Talib/Muhammad Dibirov cards. Exit control remains visible, page/bookmarks/text are retained and both paper/night themes work. Reciter source lists contain107/24 available chapters, no invented timing or missing chapter playback. Preserve Top formulas, account session behavior, min native445 and all closed sections. Umar Sildinskiy remains pending verified complete recordings. RF tafsir review is edition-specific evidence in docs/tafsir-rf-review-20261105.json; no general legal clearance or text removal claimed. Sun/Moon observation is queued separately.

460 candidate expanded after user selection: Kamil Samigullin112 complete-track candidates (3/4 withheld for publisher boundary reports), Alijon Qori114 surahs and Jahongir Nematov25 teaching recordings (1,91–114; Baqara94sec excerpt withheld). User excluded Kazakhstan. Kamil/Jahongir online only because source lacks CORS. No new sun/moon change in460.

460 portrait refinement: four source-based AI-assisted photographic edits with calm slate backgrounds and consistent head/shoulder framing. Dibirov retained byte-for-byte. Minor refinement preserves announcement460 and existing expiry. Kamil source credited underCC BY4.0; portrait-source attribution is available from About.

460 minor sky correction: retain the same public announcement460 and expiry. Pair rise/set events so the partly visible Sun and Moon no longer jump horizontally at the horizon on any existing background. Astronomical opacity, prayer settings, polar fallback, artwork crop and the original mosque crescent remain unchanged. Regression covers solar/lunar rise/set across seasons and both hemispheres. See docs/sky-motion-460.json.

461 moves the Mushaf controls below the iPhone status bar fade in both reading modes. It keeps announcement 460 and its expiry.

462 restores online playback for Kamil Samigullin and Jahongir Nematov by allowing their two recording directories in the media policy. It keeps announcement 460 and its expiry.

463 brings the fullscreen Mushaf page header beside the exit control, reclaiming the extra row above the text. It keeps announcement 460 and its expiry.

464 adds five text duas for children to the existing Family and Wellbeing category, using Quran 25:74, 14:40, 3:38, 46:15 and the dual-child protection formula in Abu Dawud 4737. Each entry has Arabic, Cyrillic transliteration and a Russian meaning prepared for SALAH. Quran excerpts are identified in their internal source labels. The protection card explains that its attested wording addresses two children. This catalogue update keeps announcement 460, acknowledgement and expiry.

464 also adds independent optional count-click sound and supported-device vibration to the reading and free counters. Sound defaults off; browser support is checked and no silent-switch detection or universal iPhone vibration is claimed. Feedback follows successful increments and is discarded on navigation, hidden pages and late saves. Approved anonymous Top participants can expose only the expiring headphone signal, while identity filters and score formulas remain unchanged. Home no longer mounts the unfinished morning/evening card; saved progress is retained inside Azkars. Keep announcement460, artwork, acknowledgement and expiry for this maintenance release. Media artwork opening another installed PWA remains an unverified WebKit handoff issue, not a completed fix.

## 466 — owner profile from the SALAH leaderboard

A verified owner can tap a visible nickname in Top SALAH to open the existing owner profile. Back returns to the selected ranking period. The server resolves the public ranking identifier only after checking the live owner session and MFA. Anonymous and hidden rows cannot resolve to owner profiles from the leaderboard. Preserve the current illustrated announcement, acknowledgement and expiry.

## 467 — owner cards for anonymous ranking rows

The verified owner can open the existing owner card for any listed participant, including rows shown as initials. Other accounts may open only their own ranking summary. The public ranking continues to respect profile visibility. City, country and user geography remain visible only to the verified owner. The existing owner-access gate requires the current owner session and MFA, and hidden rows still cannot be resolved from the leaderboard. Preserve the current illustrated announcement, acknowledgement and expiry.

## 468 — award history and leaderboard profile transition

Use the same tappable tiles for medals and leaderboard titles in the protected owner profile. Show saved dates or calendar results and listening time for the selected award. Replay an already loaded personal award without another account request. When opening a profile from Top SALAH, show the public leaderboard label while the verified owner profile loads. Keep the current illustrated announcement, acknowledgement and expiry.

In Top SALAH, jump to the signed-in participant’s row in the current period, including rows in the expanded ranking. Count visible Top SALAH participants with a current playback signal across periods; only the verified owner can open the corresponding list. City and country lists in the owner cabinet load visible private profile photos through the existing owner gate and keep initials as a fallback. The app’s Back swipe returns from a city or country to the corresponding geography list.

## 469 — simplify Top SALAH

Temporarily remove the My Place and Now Listening actions from the ranking. Preserve the ranking, period selection, listening indicators and the owner-only profile flow. Keep the current illustrated announcement, acknowledgement and expiry.

## 470 — system Back in geography and manual award replay

Give a city or country drilldown a private browser Back entry so the system gesture returns to the selected geography tab. Keep location and profile data out of browser history. Keep an explicitly requested award presentation open while automatic award scheduling runs. Preserve the current illustrated announcement, acknowledgement and expiry.

## 471 — listening-time modes and podium reciter carousel

The opt-in public Top response ranks by each participant’s combined listening time for the selected period and returns the per-reciter breakdown only for the podium. The compact clock/heart switch beside the full ranking selects combined or favorite-reciter time without rearranging the podium. Each podium card can page through its own reciters while its combined time remains visible. Existing clients can keep using the original response, and finalized winner selection continues to use the existing competition rules.

## 472 — animated Top SALAH release news

Announce the Top SALAH listening modes in one feature card. Animate a contained horizontal slide between existing catalog portraits with sample reciter times. The combined time stays fixed in the preview. Use the current SALAH colors and a static frame when app or system motion is reduced.

## 473 — looping motion in release news

The active illustrated news card alternates between its two portraits while the dialog is open. Future animated cards share the same alternating loop. Inactive cards pause and reduced-motion modes render a static frame. Record installed news acknowledgement on the «Понятно» button. Preserve announcement 472, artwork and expiry.

Rank the heart view by the favorite reciter's time. The clock view continues to rank by the combined time. Reuse the existing favorite-reciter API when the overall board has been capped.

## 474 — dated listening reports and background queue continuity

Queue new minute reports with their actual completion timestamps and resolved time zone. The private dated RPC attributes deferred reports to the playback day, retaining idempotency, existing rate limits and the legacy three-argument RPC. Version the durable queue so ambiguous old reports cannot create fresh minutes on a later day. Preserve canonical personal totals and dated snapshots; do not alter existing user history.

Keep the system playback hint active while the next chapter loads after an actively playing chapter. Manual pause, terminal completion and stop still release or pause normally. Regression coverage includes twenty hidden chapter transitions on the same media element and actual system controls. A real locked iPhone check remains required.

Preserve announcement 472, its gallery artwork, acknowledgement and expiry. No congratulations feature is included.

## 475 — SALAH message emojis

Add one shared palette of sixteen original gold line glyphs beside message inputs in support requests, private/team conversations and student/teacher homework correspondence. Preserve drafts, caret/selection, input/change events, Unicode payloads and existing message length/disabled guards. Incoming messages safely escape text and display supported glyphs with accessible labels; older clients retain standard Unicode emoji.

Use the feature-specific chat-emojis-475.svg composer illustration with an alternating selection highlight through release-motion-preview. Announce only this change as edition 475, ending 15 November 2026. Messaging permissions, attachments and account behavior retain their existing contracts.

## 476 — messenger-style emoji keyboard and reachable Send

The smile button switches from native input to the custom emoji keyboard below the composer row. Selecting an emoji preserves the caret and draft without focusing the textarea or summoning the system keyboard. Tapping the textarea or the keyboard toggle returns to native input and hides the emoji panel. Notification controls collapse while either keyboard is active.

Let the mobile composer shrink within the visual viewport during keyboard animations. The emoji area scrolls in the remaining space, the input/Send row keeps its height, expanded text is capped by available height, and native keyboard mode omits home-indicator padding. Restore the notification setting when both keyboards close.

Preserve announcement 475, acknowledgement and expiry. Update its existing composer illustration to match the input-above-panel layout. Regression coverage includes mutually exclusive keyboard modes, caret/draft retention, viewport offsets, and real Chrome geometry at narrow portrait/landscape sizes with a simulated keyboard and iPhone safe area.

## 477 — temporarily remove public Tafsir

Remove the Tafsir action and module mounting from the public Quran reader, and remove its availability card from legacy illustrated news. Keep the underlying module for a future explicit decision, without a public entry point. Preserve Quran text, translations, audio, bookmarks and progress. Preserve announcement 475, acknowledgement and expiry; this is a temporary availability change, not a new feature announcement.

Record the deferred Quran radio with a host idea in docs/product-ideas.md. This release does not implement radio or include the separate pending competition-summary server fix.

## 478 — compact anonymous activity on Home

Show a compact horizontal row in the upper-right safe area, in the Home shell flow above the brand so it cannot overlap the title on short phones: listening, Quran reading and dhikr. Render only positive counts; when one disappears the remaining metrics close the gap toward the right. Use Top SALAH's digit renderer/transitions and a reduced-motion-aware position transition. Do not show names, photos, user IDs or links to people.

The listening count uses the existing 45-second playback presence. Reading presence means a rendered verse reader or printed Mushaf is visible. Dhikr presence starts only after a successful explicit counter increment for the current account and expires after 45 seconds without another increment; opening the section or restoring counters does not activate it. Backgrounding or leaving the activity clears its status. A person can appear in multiple activity totals. Eligible signed-in accounts and anonymous guest installations participate.

Use a private transient activity_presence table with active-session FKs, RLS, rate limits shared with listener presence, a 32-row account cap, monotonic per-kind/tab sequences, bounded cleanup and 45-second expiry. The listening-now GET returns only three aggregate numbers. Authenticated POST updates only the verified caller's status; guest POST uses an existing random installation ID, hashes it on the server, validates origin/body/type, and applies global, daily, device and tab budgets. No verse, dhikr text, repetition count or location is stored by this feature. A guest uses the existing random installation ID (hashed on the server); extra tabs are deduplicated, while two devices remain two guests. Unknown authentication states are excluded from guest reporting. Status rows are transient and overwritten, with bounded cleanup. Unknown authentication states are not treated as guests; no fingerprinting or anonymous Auth account is created. Publish the schema and handler before the client.

All ordinary users receive only counts and non-interactive indicators. The owner can tap a metric to read a paginated list through owner-access mode=live, after fresh identity, active-session and MFA checks. Registered participants have names even when their public display is anonymous; unregistered devices remain labelled «Гость» with a short anonymous code. The private list is purged on close or loss of authority, and never includes location or session data.

Announcement 478 uses an original Home SVG plus a shared release-motion-preview loop showing digit changes and a book metric disappearing/reappearing while its neighbors move right. Pause hidden cards, respect reduced motion, and acknowledge only on «Понятно». Include the tested competition-summary correction from PR339: compute the reciter-detail aggregate in the same SQL statement as participant cards, before LIMIT, instead of a cached summary. This corrects the 15/19 mismatch without changing stored seconds or awards.

## 484 — closed team feature introduction

Public announcement 479, its deadline and acknowledgement remain unchanged. A separate account-bound animated gallery introduces Radio, the example teacher cabinet, Muallim Sani, the live-broadcast screen and online lessons only to the verified owner and active administrators with MFA. Teacher/lesson examples contain no real pupils or classroom data. Five dedicated SVG illustrations use the shared `release-motion-preview` alternating loop; inactive cards, hidden documents and reduced motion pause animation. Only «Понятно» acknowledges this team edition; Menu can reopen it. The existing owner-only activity lists and geography gates are unchanged.

## 485 — Quran player timer and optional nature backgrounds

Public edition 485 introduces two illustrated, looping cards: stop after 15/30/45/60 minutes or at the end of the current surah; and optional rain, wind, fire, forest or ocean textures with independent volume. Both use original SVG artwork and the shared active-card alternating motion. The background is off by default and follows Quran pause/stop. The artwork and animation stay in the existing dark/gold palette. Private team edition 484 is not reset; all-reciter radio selection is a closed-team improvement and is not announced to ordinary users. Device QA for locked-screen scheduling/audio remains pending.
