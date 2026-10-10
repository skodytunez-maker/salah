# Quran listening progress

Release 282 saves the latest surah, exact reciter, ayah index and offset within its audio file every three seconds and on pause, page hide and backgrounding. Keys are scoped to the current account or device; no listening position is uploaded. The Quran library restores it only after pressing Continue listening.

Whole-recording reciters use actual recording metadata. Verse recordings use the sum of each audio file duration and a cumulative timeline; three metadata requests at most run concurrently. Valid duration tables are cached on the device. Incomplete metadata never masquerades as a full-surah total. Offline playback probes only saved blobs. Seeking across verses while paused does not start playback.
