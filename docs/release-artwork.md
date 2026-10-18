# Public release roundup

The user requested real feature pictures in update cards, not a generic star plus text. Use screenshots from SALAH and the existing verified reciter portraits and award artwork. Keep personal account data out of these images.

The October 18, 2026 roundup is APP_ANNOUNCEMENT version 357. It remains prominently available on Menu through APP_NEWS_UNTIL (October 21, 2026, 05:30 Asia/Yekaterinburg). Per the user's follow-up, the Home entry disappears after the announcement is read and «Понятно» is pressed; the saved seen-version prevents its return on later launches. Menu retains access for reopening the cards. The automatic modal remains once per announcement; do not interrupt readers repeatedly.

For small fixes, update APP_VERSION/APP_CHANGES and keep this APP_ANNOUNCEMENT and roundup. When a new major feature is ready, append a feature-specific picture/card to this same roundup, preserving earlier cards; advance the announcement version so readers can discover the addition. Do not advertise planned tafsir text as available: its card explicitly says it is in preparation. Keep the expiry unless the user requests an extension.

Arabic adhkar font: documented Quran Foundation Unicode Uthmanic Hafs, runtime CDN only. Documentation: https://api-docs.quran.foundation/docs/tutorials/fonts/font-rendering/ . The page-specific QCF fonts cannot encode arbitrary supplications; original Unicode strings remain unchanged. No font file is redistributed by this release.

The Unicode Hafs face is scoped to Arabic letters and vowel signs with unicode-range. Arabic punctuation keeps the normal Arabic fallback: this Quran font maps punctuation such as U+060C to Quran-specific ornaments, which must not appear in supplications.
