# Tyumen timetable source selection

The Tyumen settings now offer the user's supplied October calendar and the timetable published at https://al-hakk.ru/namaz/ separately. Existing installations without an explicit choice keep their previous combined timetable until they choose a source; neither school nor minute corrections are reset.

Calendar coverage: 1–31 October 2026. Al-Hakk coverage: 1 September–31 October 2026, bundled and verified 30 September; 5 October's six published times match the site's current homepage. These are bundled timetables, not a live site subscription. No times are invented for dates outside the published coverage, and one source never silently substitutes for the other.

The calendar has both first Asr and mosque Asr columns. Al-Hakk publishes Hanafi Asr; the existing Aladhan supplement remains explicitly identified when the user selects the other school. The foreground timetable, calendar exports, widget snapshot, Azan, azkar and Tahajjud use the selected source. Background reminder preferences and caches carry that choice too. The server now parses the bundled first-Asr supplement using the same validator as the web app.

Rollout order: deploy the backward-compatible background-reminders bundle first (existing subscriptions default to their previous combined timetable), then publish the web release. No database schema changes, new secrets or native signing changes are required. The separate tablet wallpaper draft PR remains independent.

Validation: all 47 existing/new check scripts, generated function freshness, and app syntax passed (49 checks). Pages and Quran timing checks needed a rerun after Windows runtime processes crashed; their reruns passed. The new source test also exercises the real settings renderer and change handler. Interactive browser inspection was unavailable because its automation runtime crashed, so physical phone testing remains to be done. No APK was built or installed.
