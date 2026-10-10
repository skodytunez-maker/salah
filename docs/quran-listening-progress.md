# Quran listening progress

Release 282 saves the latest surah, exact reciter, ayah index and offset within its audio file every three seconds and on pause, page hide and backgrounding. Keys are scoped to the current account or device; no listening position is uploaded. The Quran library restores it only after pressing Continue listening.

Whole-recording reciters use actual recording metadata. Verse recordings use the sum of each audio file duration and a cumulative timeline; three metadata requests at most run concurrently. Valid duration tables are cached on the device. Incomplete metadata never masquerades as a full-surah total. Offline playback probes only saved blobs. Seeking across verses while paused does not start playback.


Release 284 replaces stacked library cards with 2–3 top actions (Live, Daily verse, Continue). Search is revealed via the icon above the surah list. Continue is hidden while a player exists and reads the latest account-scoped position at activation. The compact player remains connected while moving into a native modal for full controls; closing the modal does not stop audio. Position updates after route rendering and navigation resize retain an eight-pixel gap above the bottom tabs.

Daily verse and search toggle closed on repeated activation. Small close icons provide a direct dismissal. Daily verse closes by outside click/Escape and is removed on Quran teardown; it does not block the top action row.
