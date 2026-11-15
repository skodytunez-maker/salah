# Tyumen timetable source selection

The Tyumen settings now offer the user's supplied October calendar and the timetable published at https://al-hakk.ru/namaz/ separately. Existing installations without an explicit choice keep their previous combined timetable until they choose a source; neither school nor minute corrections are reset.

Calendar coverage: 1 October–30 November 2026, with the November source correction recorded below. Al-Hakk coverage: 1 September–31 October 2026, bundled and verified 30 September; 5 October's six published times match the site's current homepage. These are bundled timetables, not a live site subscription. No times are invented for dates outside the published coverage, and one source never silently substitutes for the other.

The calendar has both first Asr and mosque Asr columns. Al-Hakk publishes Hanafi Asr; the existing Aladhan supplement remains explicitly identified when the user selects the other school. The foreground timetable, calendar exports, widget snapshot, Azan, azkar and Tahajjud use the selected source. Background reminder preferences and caches carry that choice too. The server now parses the bundled first-Asr supplement using the same validator as the web app.

Rollout order: deploy the backward-compatible background-reminders bundle first (existing subscriptions default to their previous combined timetable), then publish the web release. No database schema changes, new secrets or native signing changes are required. The separate tablet wallpaper draft PR remains independent.

Validation: all 47 existing/new check scripts, generated function freshness, and app syntax passed (49 checks). Pages and Quran timing checks needed a rerun after Windows runtime processes crashed; their reruns passed. The new source test also exercises the real settings renderer and change handler. Interactive browser inspection was unavailable because its automation runtime crashed, so physical phone testing remains to be done. No APK was built or installed.

## November user calendar · 16 October 2026

The initial November release reused the user's 2025 table for the upcoming calendar at their request. At that time, all 30 rows and both Asr columns were copied without adjusting clock times, and metadata/source attribution retained the printed 2025 year. That initial source was replaced by the explicitly dated 2026 photo described below. No repeating-year rule was enabled and no other year or month was synthesized.

The separate Al-Hakk November remains withheld because its title and weekdays disagree. October calendar data and September/October/December official data are unchanged. Calendar and legacy auto mode may read the user November; explicitly selected Al-Hakk never substitutes it. The new JSON and original image are cached offline. Publish the new data on Pages before deploying the generated reminder bundle, then verify both routes. The reminder schedule cache is versioned to avoid six-hour stale coverage.

## November 2026 photo correction · 15 November 2026

The user supplied a replacement image explicitly labelled «ТЮМЕНЬ 2026» and «ноябрь». Two independent transcriptions agree on all 30 rows and seven time columns. Compared with the previous 2025-based values, 97 of 210 cells change by exactly one minute: Fajr 17, Sunrise 20, Dhuhr 5, first Asr 11, mosque Asr 19, Maghrib 13 and Isha 12. The complete transcription is recorded in `docs/tyumen-november-2026.json`. The new image is copied without editing its pixels; its SHA-256 and byte count are recorded there.

The photo prints the calculation-method label “Spiritual Administration of Muslims of the Moscow Region”. That printed attribution is recorded as evidence, rather than treating it as an external verification of the publisher. No separate official publication was verified for this correction. The active data and source link now use the 2026 photo, with no year remapping or derived times.

The first-Asr column remains `asrFirst` for school 0, and «Аср в мечетях» remains `timings.Asr` for school 1. Personal table offsets still apply after reading the published values. October, other months, other cities and calculated-source offsets are not changed. Tests compare every cell, both Asr choices, foreground/server calculations, personal corrections, PDF output, widget and reminder events.

Rollout refreshes the web cache to `tyumen-table-v3` and the server cache to `tyumen-published-v4`; old stored rows cannot mask the correction. `build-push-function.mjs` embeds scheduler code, not timetable values: the server fetches the published JSON. Its November request includes `?source=2026-11-15` to bypass an older unversioned CDN response. The app's new service-worker shell precaches its canonical data using `cache:reload`. Publish the corrected JSON before deploying the rebuilt background-reminders bundle. Existing reminder preferences and notification configuration are preserved.
