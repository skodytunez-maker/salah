# Recognition expansion 369

221 recording fingerprints cover 46 unique library voices. Coverage is concrete recordings, not every surah or arbitrary live recitation. The UI lists supported surahs by voice. Full-surah sources use the exact public library recording URLs, and optional mp3quran ayat_timing data. Verse sources use EveryAyah folders already in the library. Reference MP3s remain outside dist. Source URLs and hashes are in catalog-v2.json.

Reference selection: available short surahs from 1,112,113,114,103,108,107,100,78; existing 69 tracks are retained. Seven failed downloads/decodes were rejected. Each library voice has at least one accepted recording. Ayah timing is either validated and complete, or absent with ayahTiming=false. The latter returns only voice/surah, never a guessed ayah.

Query phase defect: sparse reference anchors were mistakenly also used for queries. An offset of an odd frame could suppress all true matches. Queries now use all frames; reference sparsity and confidence thresholds are unchanged.

Clean calibration: 303/304 independently cropped 6/8-second excerpts, one no-match, zero wrong identities. CI stores one independent eight-second crop for each of the 41 new voices, alongside the original echo fixtures, corruption/abort/cache tests and synthetic negatives. This is not a field microphone accuracy claim.

Performance: capture limit reduced 12 to 8 seconds. Validated database loading begins on the same user gesture, in parallel with permission and recording. Cancellation/visibility/navigation still stops tracks, aborts requests and terminates workers. No speech upload. New cache/catalog path avoids stale v1 data; Settings cleanup removes both revisions.
