# Control Center resume follow-up

Reported after424: pressing Play in iPhone Control Center does not resume Quran and system audio eventually disappears.

A regression fixture demonstrates that MediaSession Play was ignored if the page still reported playing after the native element had paused without delivering onpause. The explicit command now calls an idempotent resume method that checks the actual media element. Duplicate commands never toggle into pause or start a second pending request.

A NotAllowedError or AbortError during explicit resume retains the same source, position and paused controls, without host fallback, destructive clearing or automatic retry. A user pause wins over a delayed play completion. Actual iPhone validation after publication remains required; tests cannot prove OS background lifetime.

Passed: native audio-session/Control Center regressions; lock-screen controls; persistent session; same-element background transitions; full-surah continuity; playlists; ayah timing; preload/fallback and media-output tests. Earlier189 checks passed before this targeted follow-up; CI runs again at the final PR head.
