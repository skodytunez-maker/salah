# Surah display-name sources

Display names are interface metadata only. Canonical Quran index,Arabic verses and translations remain byte-identical. All names are bundled for offline use; switching language requires no provider request.

- Russian,Arabic and English: existing approved dist/data/quran-index.json name,arabicName and englishName fields. Russian spellings are unchanged.
- German: the primary mosque publisher https://moschee-al-ummah.de/koran uses the same114 Latin proper-name spellings as the existing English-name field; this is a shared transliteration,not an English translation of meanings. Verified2026-11-19.
- Azerbaijani: https://quranenc.com/az/browse/azeri_musayev,114-numbered name catalogue captured2026-11-18 and checked2026-11-19.
- Tajik: https://quran.tj/quran,114-numbered names,verified2026-11-19.
- Kazakh: https://portal.iqra.kz/kk/quran,114-numbered names,verified2026-11-19.
- Uzbek: https://quranenc.com/uz/browse/uzbek_rwwad,114-numbered Cyrillic names; editorial Uzbek-Latin conversion for the application’s uz-Latn-UZ interface. Preserve the existing Russian,Arabic and English search aliases;this does not change the selected meaning edition.

Whole-list row/number/link validation is in scripts/check-quran-library-language.mjs. Quran proper names may share spellings between languages. Do not infer a language mismatch merely because a proper name matches a Latin source. No new religious commentary or scripture is added.
