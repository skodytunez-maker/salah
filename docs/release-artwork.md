# Public release roundup

## Candidate515 — glass and message actions

Two original code-authored SVGs show the actual controls: a prayer timetable and mini-player with independent transparency sliders; incoming/outgoing chat bubbles, a reply quote and the selected own-message action menu. They contain no third-party media, embedded fonts, religious quotations, private content, scripts or independent animation. Both include accessible title/description metadata. The static illustrations use the existing gallery; captions and navigation are translated into all eight interface languages. The Everyone option is explicitly limited to the author’s own messages. Final byte counts and Git blob fingerprints are appended to both rights registers. This is candidate preparation, not evidence of publication or physical-device review.

## 505 — the sky in your city

The new public announcement contains one sky feature only. `home-sky-505.svg` is original, repository-authored vector artwork: a mosque silhouette, sunrise arc, warm horizon and a sequence of shaded lunar discs. It embeds no external pictures, fonts, religious quotations, personal data or third-party artwork. The card adds its own vector Sun, phase-shaded Moon and cloud/fog layers; the Sun follows the illustrated arc and clouds cover the light sources. These are explanatory examples, not a live astronomical observation inside the news card.

`sky-release-news.js` uses existing `release-motion-preview` and `data-release-motion-part`. The 507 correction gives only its Sun and Moon a dedicated 12-second normal-direction `release-sky-orbit`, with the Moon offset by six seconds. Visible travel follows east → upper arc → west; return/reset is transparent below the shared horizon. Clouds retain `release-nature-scene` and the ordinary alternating loop. Hidden/closed and reduced-motion modes retain the shared pause/static behavior; motion-off keeps both bodies in visible upper-arc poses. Three explicit `skyReleaseUi` captions are translated in all eight existing UI languages, with no text baked into the artwork. The source catalogue hook is additive; runtime bundles and the worker graph are built by the release pipeline. This correction to the news artwork preserves announcement505, its acknowledgement and expiry, the SVG asset and ordinary Home astronomy/weather/photo behavior. The same507 release also repairs the separate Settings day/night demonstration with temporary clear weather and a36-second astronomical timeline; see `home-sky-preview-507.md`.

`scripts/check-sky-release-news.mjs` verifies the installed 505 dialog, one-feature scope, original bounded SVG, real keyframes, actual orbital endpoints and every sampled visible position moving left-to-right, transparent below-horizon reset, all-eight source/runtime captions, stable elements/focus/RTL while changing language, visibility and confirmation-only acknowledgement. It independently keeps the three historical 502 offline cards intact. The main release-artwork check also exercises the current 505 branch; no older features, private owner reports or billing are promoted.

The user requested real feature pictures in update cards, not a generic star plus text. Use screenshots from SALAH and the existing verified reciter portraits and award artwork. Keep personal account data out of these images.

The October 18, 2026 roundup is APP_ANNOUNCEMENT version 357. It remains prominently available on Menu through APP_NEWS_UNTIL (October 21, 2026, 05:30 Asia/Yekaterinburg). Per the user's follow-up, the Home entry disappears after the announcement is read and «Понятно» is pressed; the saved seen-version prevents its return on later launches. Menu retains access for reopening the cards. The automatic modal remains once per announcement; do not interrupt readers repeatedly.

For small fixes, update APP_VERSION/APP_CHANGES and keep this APP_ANNOUNCEMENT and roundup. When a new major feature is ready, append a feature-specific picture/card to this same roundup, preserving earlier cards; advance the announcement version so readers can discover the addition. Do not advertise planned tafsir text as available: its card explicitly says it is in preparation. Keep the expiry unless the user requests an extension.

Arabic adhkar font: documented Quran Foundation Unicode Uthmanic Hafs, runtime CDN only. Documentation: https://api-docs.quran.foundation/docs/tutorials/fonts/font-rendering/ . The page-specific QCF fonts cannot encode arbitrary supplications; original Unicode strings remain unchanged. No font file is redistributed by this release.

The Unicode Hafs face is scoped to Arabic letters and vowel signs with unicode-range. Arabic punctuation keeps the normal Arabic fallback: this Quran font maps punctuation such as U+060C to Quran-specific ornaments, which must not appear in supplications.

## Follow-up corrections

The current roundup identifier is 367 (the earlier reference to 357 describes the first roundup). Version 368 adds actual feature screenshots for the ordinary map, holy-city satellite views, recognition screen and reading resume. The generic future-release book-icon template has been removed. Publication must pass the artwork-category check for APP_CHANGES. Map image attribution remains visible in screenshots; screenshots use public city centres and contain no account data or device GPS.

Version 369 replaces the planned tafsir card with a real reader screenshot and source/author overview. Recognition coverage copy must state specific recordings and the absence of ayah labels where timing data is unavailable.
