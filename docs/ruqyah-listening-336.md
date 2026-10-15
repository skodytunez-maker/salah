# Ruqyah listening and Luhaidan ayah following

Checked 2026-10-15. Release 336.

Ruqyah previously used a persistent player separate from quranPlayback. The ranking listener subscribed only to quranPlayback, so ruqyah did not reach either personal listening totals or the shared minute queue. The competition snapshot consumes those same personal totals.

The production entry point now also supplies ruqyahPlayback to the existing ranking tracker. A retained ruqyah recording supplies its actual reciter, recording identity, playback state and position. Paused ruqyah cannot fall back to an old Quran position. The existing audio-focus coordinator prevents concurrent playback. Recording changes and explicit seek revisions establish a fresh baseline. Existing consent, per-account storage, full-minute queue acknowledgments and competition synchronization remain in use. This only records new actual playback; previously unrecorded time is not reconstructed.

Regression coverage: scripts/check-ruqyah-listening.mjs uses the real ruqyah session and ranking tracker, verifying personal totals, shared minute reports, competition snapshot, pause, resume, small and large seeks, recording changes by the same reader, Quran-to-ruqyah transitions, account changes and opt-out. Existing Quran timing and ruqyah lock-screen checks are retained.

Luhaidan's source is MP3Quran reciter/read 107. The current reciter catalogue lists a complete 114-surah recording collection, but read 107 is absent from the 115 entries in the timing-read catalogue. Its timed-surah list and timing responses for surahs 1 and 67 are empty. The inspected Quran.com recitation catalogue and EveryAyah directory do not provide a matching alternative. No timingRead is fabricated and no timings from another reader are used. Accurate ayah following requires timing data for the same audio recording.

Sources:

- https://www.mp3quran.net/eng/api
- https://www.mp3quran.net/api/v3/reciters?language=eng&reciter=107
- https://www.mp3quran.net/api/v3/ayat_timing/reads
- https://www.mp3quran.net/api/v3/ayat_timing/soar?read=107
- https://www.mp3quran.net/api/v3/ayat_timing?surah=1&read=107
- https://www.mp3quran.net/api/v3/ayat_timing?surah=67&read=107
- https://api.quran.com/api/v4/resources/recitations?language=en
- https://everyayah.com/data/
