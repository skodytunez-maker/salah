# Automatic offline core — 545

The owner asked that Quran texts, Mushaf, Adhkar and city prayer tables work offline automatically, and explicitly excluded automatic audio. Standing instructions authorize checked publication of agreed work. This change builds on the already reviewed manual502 download pipelines.

## What is prepared

After five seconds of stable visible, connected, onboarded use, prepare the exact installed114-surah corpus, reading layer, search and existing local OFL Mushaf font (9,489,074 bytes, before storage overhead). Reuse SHA-verified saved bytes. The chosen meaning translation uses its existing pinned publisher hashes and edition; bundled Kuliev is already in the base corpus. Adhkar and the Quran/Mushaf indexes, layouts and interface code remain in the installed app shell. No scripture or source data is rewritten.

Then save the selected city's current city-local month plus11 months using the existing calculation/source cache. Tyumen uses only published source dates and approved first-Asr supplements, never fabricated future dates. Changing city, timezone, method, school or source cancels the captured work; old-city saved data is retained for a later return. No GPS, visitor-city collection or permission request is introduced.

## Lifecycle and controls

Background work does not participate in startup/navigation readiness. It uses one text/translation worker and cooperative40ms yields. Ordinary inputs, navigation, user interaction, hidden/offline state, Save Data, slow2g and foreground audio keep preparation quiet or cancel it. Retried failures back off15minutes; successful unchanged data is revalidated at most every6hours. Visibility, network, page restore and settings changes may wake it after the stable interval. Metadata uses an independent pinned read with a20second whole-response deadline, leaving the foreground index promise untouched.

Settings → Data has a localized automatic-saving switch. It is device-local, default-on when storage can be read, and fails closed if storage is unavailable. A manual Mushaf pause, prayer pause/removal or public-download cache clear turns automatic saving off. Clear waits for the current automatic work and all registered manual text/translation/audio writes before deleting reproducible public caches. Re-enable explicitly to resume. Deleted/evicted files are never represented by a persisted ready flag. A shared prayer writer prevents concurrent manual/automatic prayer jobs. Updates retain existing audio/editing guards and also wait for automatic/translation preparation.

Automatic preparation never calls storage.persist, notification/geolocation permission APIs, reciter audio downloads, or QuranFoundation printed-font downloads. Existing manual audio controls remain manual. Unicode offline Mushaf still differs from the online printed-font edition, preserving ayat/page/position as documented in quran-offline-502.md. An operating system can evict local web storage; first-ever offline installation is impossible. Dates not published by a prayer source remain unavailable. Download success on one device is not proof of another device's storage.

## Verification

New coordinator/policy tests cover scheduling, backoff, changed identity, cancellation settlement, denied storage and persisted pause. The actual Quran storage and Mushaf controller save original bytes, reject corruption and read all114surahs after a cold network-blocked restart. Existing whole-book604page/6236ayah, prayer year/month/timezone/Tyumen, translation pinning, cache clear and updater fixtures remain required. New UI/news strings cover all8interface languages; historical523 announcement/receipts/expiry stay unchanged. No browser automation or physical-phone pass is claimed. Phone checks must include airplane mode after preparation, selected translation, Mushaf page turns/bookmarks, Adhkar, selected-city month coverage, pause/delete and re-enable.
