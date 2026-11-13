# Nature auditions — review only

This branch prepares short, explicitly unapproved nature recordings for the SALAH owner's listening review. It does not change `dist/`, the app version, audio routing, accounting, backend, or production publication. Do not merge or deploy it as a replacement sound library.

The workflow has read-only repository permissions. Its only outputs are review artifacts and short audio payloads in its own job logs for delivery through the connected GitHub tool. There is no code that commits generated binaries or uses application credentials.

Sources were checked on 13 November 2026:

- Rain with distant thunder, kvgarlic, original WAV, CC0: https://commons.wikimedia.org/wiki/File:Light_Rain_Distant_Thunder_July_5th_2016.wav
- Gentle Rain Mix (2018), esh9419, public MP3 preview, CC0: https://freesound.org/people/esh9419/sounds/417616/
- A Small Fire Crackling, ExplosiveTamale, public MP3 preview, CC0: https://freesound.org/people/ExplosiveTamale/sounds/448361/

The samples use a selected excerpt, level matching and short edge fades. Extreme source transients receive soft-knee compression and lookahead peak limiting so individual pops do not set the entire bed's level. The rain excerpt finder looks for low-frequency energy; this is not automatic proof that the event is thunder. The fire excerpt finder favors a lower crest factor; this is not proof that voices or harsh pops are absent. Human listening remains necessary.

MP3-derived candidates are previews, not recovered lossless originals. No Quran audio is copied, redistributed or transformed. The blend with live recitation and eventual loop seams must be reviewed separately before integration.

Additional CC0 review candidates:

- Gentle wind, fthgurdy: https://freesound.org/people/fthgurdy/sounds/528944/
- Nord Odal quiet forest, birds, insects and leaf rustle, nfsgit: https://freesound.org/people/nfsgit/sounds/121967/
- sea_waves_soft_shenzhen_2020-05-30_iXY.wav, Archos: https://freesound.org/people/Archos/sounds/521602/

Wind has only an eight-second audition because its source is short. No loop is invented. These sources have not passed human listening review; calmness, absence of speech and suitability under recitation remain unverified. This workflow batch prepares only wind, forest and ocean; completed rain and fire artifacts are retained in their earlier run.


## Owner feedback and replacement auditions, 13 November 2026

The owner prefers rain_soft for further review. This is a sound-character preference, not publication or blend approval. The first forest, wind and fire samples were rejected for unwanted noise; the first ocean sample was rejected because it resembles rain.

Round two uses different recordings, fixed excerpts, no dynamic compression and at most eightfold linear gain. The previous forest sample needed 181x gain; the new round does not raise recordings to that extent. These choices do not prove that the new sources are free of noise. User listening remains pending.

- Fireplace Burning — AugustSandberg, CC0: https://freesound.org/people/AugustSandberg/sounds/508844/
- breeze.wav — keweldog, CC0: https://freesound.org/people/keweldog/sounds/181801/
- Birds In Forest (Scotland) — BurghRecords, CC0: https://freesound.org/people/BurghRecords/sounds/490846/
- Gentle Waves - Quiet Beach — amholma, CC0: https://freesound.org/people/amholma/sounds/376795/

All four replacement sources are public MP3 previews. The original WAV files are not obtained. No app assets or production files are replaced. Do not merge or deploy this review branch.
