# SALAH 485 — player timer, nature textures and all radio voices

The expanded player adds 15/30/45/60-minute wall-clock timers and a stop at the end of the current surah. Expiry runs before automatic chapter continuation. Delayed timers, media updates and foreground/remote-play events recheck the absolute deadline. Cancelled callbacks cannot fork a replacement. Stop clears the timer; pause does not stop its countdown. Timers are not restored on reload.

Rain, wind, fire, forest and ocean use original locally generated Web Audio textures, not third-party recordings or music. Default is off in each new page session. Only volume is saved: default 12, maximum 40. Quran volume, media element, playback category, metadata and accounting ownership are unchanged. Nature audio has no analytics or competition ownership. It follows Quran playing state, stops on pause/error/end/close and is disabled during ruqyah. System interruptions do not trigger a repeated resume loop. A gesture or foreground return while Quran is actually playing may retry the background. Existing Home atmosphere still yields to foreground audio.

The mini-player stays compact; the new controls appear only in its expanded dialog. Radio lists all 59 primary reciters with search and select-all/clear controls, respecting available short surahs. Full verse recordings are timed by summing every ayah. Candidate scanning is balanced, cached, cancellable and bounded to three candidates per voice; sufficient measured material ends further requests. Radio remains owner/admin-only.

Two public animated cards introduce only the timer and nature controls. Private team news 484 keeps its original receipt. No server changes or listening-minute edits are required.

Tests cover delayed expiry, surah continuation, remote resume, audio bounds/seams, interruption, UI state and all radio voices. Actual iPhone/Android locked-screen behaviour and sound quality require device testing. DOM tests cannot establish OS background scheduling; exact stop timing is not guaranteed while the OS has suspended the web process.

References: https://bugs.webkit.org/show_bug.cgi?id=261554 and https://bugs.webkit.org/show_bug.cgi?id=220879 .
