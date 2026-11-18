# Release 514 — public stability fixes

This candidate is prepared from public 513 (`5914bd5cc86109de4e7c7bb9859f732a272cebc2`, tree `594c2ad1b91e0e824e3d3bd2aaf8fa76f9a2d880`). The owner explicitly instructed that these fixes be released to all users; only the experimental living sky remains closed to ordinary users. This authorization does not establish physical iPhone verification. Preserve announcement505, acknowledgement and expiry; no external push or backend change is included.

## System pause

The owner's 513 recording shows voiced audio continuing while the lock-screen button displays Play. The video does not identify the source element or record delivered system commands. Do not claim that a passing fixture establishes the cause on that iPhone.

Controlled failures against the actual 513 modules established two defects: a verse/UI observer could throw before native `pause()`, and a failing paused observer could leave a retained chapter source playing during a pending handoff. Pause now physically stops the source before verse notifications, retains a final stop of the shared chapter source, and isolates UI subscribers while reporting their errors through the available global error reporter. Explicit Play keeps the same source and position.

Media Session handlers remain registered across ordinary position updates, read fresh controls and reject callbacks for obsolete metadata owners. Failed registrations can retry. Background nature audio silences and requests native suspension immediately; paused emissions cannot postpone it through timers. A new Pause invalidates a pending restart; an obsolete resume rejection cannot poison a later successful restart.

`check-quran-system-pause.mjs` covers these controlled failures alongside the existing native pause, delayed-play ownership, chapter queue, sleep timer and listening-credit regressions. These are code-level checks, not an iOS delivery guarantee.

## Owner controls, pointer focus and startup

Restore legacy live weather, weather animation and photo day/night/weather demonstrations for ordinary users. Only the new living-sky control requires a current existing server/MFA owner capability, or the isolated private-pilot policy. Preserve settings drafts while capability changes; expiry, revocation and hidden-page lifecycle stop advanced preparation and rendering. No local role flag grants access. The basic original-photo mode remains the default.

Touch/mouse activation of the three player expand/collapse controls no longer leaves a gold keyboard-focus ring. Preserve the focused element, return focus, keyboard and assistive-technology indicators. No audio command or route change is added to this styling correction.

The independent startup fallback is one opaque full-screen surface. Hide the unfinished header, empty dock and duplicate footer brand only while that fallback owns the app. First real render removes the startup marker; missing/slow modules retain the existing explicit Retry and recovery page. No automatic reload, storage clearing, audio mutation or new route restoration is introduced.

## Phone follow-up after the authorized stability release

1. Confirm the trial shows 514. Start the same Al-A'raf recording and selected nature sound. Lock the phone, pause from the lock screen and Control Center, and verify silence and a stationary position. Repeat rapid Pause/Play and leave Pause untouched for at least 30 seconds.
2. Explicit Play must resume from the same position. Repeat around a chapter boundary, after returning from the background, and with nature audio disabled. The test must establish both actual sound and the displayed controls.
3. Expand/collapse by touch: no persistent gold ring. Verify owner atmosphere controls survive a background return without resetting drafts. Fresh launch should show one loading surface then Home.

The owner explicitly authorized public514 without another trial hold for these fixes. Retain the existing verified-owner atmosphere controls; ordinary users receive the basic photo mode and legacy weather/demos, with no new living-sky opt-in. Skyline mask refinements and a replacement authentic Makkah photograph are separate work; this candidate does not silently replace photo assets or assert that those visual issues have been solved.
