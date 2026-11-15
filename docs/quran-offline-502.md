# Quran offline reading, candidate 502

The download saves the existing 114 canonical surah JSON files, their verified reading layers, the existing search corpus, and the already bundled Amiri Quran font. The Arabic is neither generated nor reserialized. Each original file is checked against the existing SHA-256 metadata before use and again after saving. The existing 604-page range map covers all 6,236 ayat exactly once.

Verified content is 9,358,890 bytes for texts, reading layers and search, plus 130,184 bytes for the existing font: 9,489,074 bytes before browser storage overhead. No new audio recording, Quran corpus, printed-page image or external font is added to the native package.

## Storage and user flow

- In Mushaf options, “Download the whole Quran” saves the book. Progress counts 114 surahs; pause is available while downloading. Verified files survive an interrupted download or app restart and are reused when resuming.
- The “Read offline” button selects Unicode Arabic reading. The choice uses `salah:quran-mushaf-offline-reading`; `#quran?view=mushaf&page=…&offline=1` also selects that view. Bookmarks and last page continue to use the existing storage and page map.
- Offline reading uses the existing Amiri Quran font from the app, loaded from verified stored bytes. The text and 604-page boundaries are preserved. Lettering and line breaks differ from the online printed Tajweed/Madani presentation; this is stated in the interface.
- The online printed renderer remains the default. Offline detection bypasses its CDN fonts; a printed-provider failure can fall back to readable, verified Arabic. Returning to the printed view keeps the current verse. The selected meaning translation is not a dependency of this Mushaf route.
- `salah-quran-text-v1` continues to hold texts. `salah-quran-mushaf-v1` holds only the existing local Amiri font. An ordinary shell update preserves both stores. Cache readiness is derived from verified bytes rather than a persisted success flag.
- Persistence is requested only when the user starts a download and is best effort. Quota/read/write errors retain completed files and never report a completed book. Cache deletion pauses and settles audio, Mushaf and all legacy `saveAllTexts` calls before deleting public downloads, preventing late writes from restoring cleared files.

The app shell, Quran index and code/page map must already be installed or cached before a cold offline launch. A first-ever visit without network cannot install the app. Browser-managed storage can still be removed by the user or system; reopening the download controls rechecks availability.

## Source boundary

The Amiri font and its existing `dist/assets/amiri-OFL.txt` remain unchanged. Quran source credits remain in the existing Quran/Mushaf sources.

No Quran Foundation page-font cache or bundle is introduced. The repository evidence describes those fonts as runtime-only, and no non-secret repository record confirms an active Quran Foundation Developer Console account. The current provider terms specifically permit caching/bundling documented fonts with an active account and accessible credit; that account condition has not been verified here. Existing online font use is unchanged.

Primary references checked on 2026-11-15:

- [Quran Foundation font rendering](https://api-docs.quran.foundation/docs/tutorials/fonts/font-rendering/)
- [Quran Foundation Developer Terms, section 3.1](https://api-docs.quran.foundation/legal/developer-terms/)
- [WebKit storage policy and persistence](https://webkit.org/blog/14403/updates-to-storage-policy/)

## Verification

`node scripts/check-quran-mushaf-offline.mjs` exercises real original files, CacheStorage responses, SHA verification and a cold client. It checks paused/reloaded resume without refetching verified files, corrupted text/font repair, quota/write failure, all 604 pages and unchanged 6,236 Arabic ayat, zero QF/API calls offline, blocked-provider fallback, current-verse retention when switching views, eight-language DOM/draft retention, actual shell activation preserving downloads, and clearing while font/text writes are pending.

Existing `check-quran-mushaf`, `check-quran-transcription`, `check-mushaf-print`, `check-mushaf-listening` and `check-storage-cache` remain applicable. Native iPhone/Android rendering is not represented as device-tested by these local checks.
