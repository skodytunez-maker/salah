# Nature auditions — review only

This branch prepares short, explicitly unapproved nature recordings for the SALAH owner's listening review. It does not change `dist/`, the app version, audio routing, accounting, backend, or production publication. Do not merge or deploy it as a replacement sound library.

The workflow has read-only repository permissions. Its only outputs are review artifacts and short audio payloads in its own job logs for delivery through the connected GitHub tool. There is no code that commits generated binaries or uses application credentials.

Sources were checked on 13 November 2026:

- Rain with distant thunder, kvgarlic, original WAV, CC0: https://commons.wikimedia.org/wiki/File:Light_Rain_Distant_Thunder_July_5th_2016.wav
- Gentle Rain Mix (2018), esh9419, public MP3 preview, CC0: https://freesound.org/people/esh9419/sounds/417616/
- A Small Fire Crackling, ExplosiveTamale, public MP3 preview, CC0: https://freesound.org/people/ExplosiveTamale/sounds/448361/

The samples preserve the recording's texture, using a selected excerpt, linear gain and short edge fades. The rain excerpt finder looks for low-frequency energy; this is not automatic proof that the event is thunder. The fire excerpt finder favors a lower crest factor; this is not proof that voices or harsh pops are absent. Human listening remains necessary.

MP3-derived candidates are previews, not recovered lossless originals. No Quran audio is copied, redistributed or transformed. The blend with live recitation and eventual loop seams must be reviewed separately before integration.
