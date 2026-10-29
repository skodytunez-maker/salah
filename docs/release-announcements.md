# SALAH release announcements

## Version 419 — restore startup after update (29 October 2026)

Restore the APP_UPDATE_DATE export required by the main entry. Its removal in
418 prevented the entire browser module graph from linking after the cached
update activated. A module-link check now validates every HTML module entry
without executing browser code. Keep announcement 418, its artwork, expiry,
and acknowledgement. This repair does not introduce a new announcement.

The worker asks its predecessor for release metadata. Only a confirmed broken
418 predecessor triggers immediate activation and navigation of existing app
windows after the complete corrected shell has been cached. This restores the
existing iPhone Home Screen app; a reinstall is not required. Working versions
retain the normal safe-screen update gate. Account storage and media caches are
not cleared. The independent recover.html page provides an optional fallback.

User preference, 16 October 2026: show feature pictures with short captions in
the same “Что нового” dialog, both on the home screen and in Settings / Update.
Use the existing accessible swipeable gallery. Future public releases keep
illustrated cards automatically; add feature-specific artwork for each release.

Call listening badges “Новые награды”; do not describe icon sharpness. Distinguish
Google Play closed testing from general availability. Support is planned,
voluntary, from 150 RUB/month, with payments disabled until readiness is verified.
Owner-only profiles must not appear as a public feature in announcements.

City art is optional and lazy-loaded. News uses small thumbnails, not full pairs.
Keep source, author, transformation notes and derivative license in credits.json.

## Permanent illustration requirement (18 October 2026)

This applies to current release notes as well as the large roundup, including the owner update dialog and Settings → What is new. A generic book/star/play icon is not acceptable artwork for a new feature. Select a feature screenshot or a feature-specific visual composition and explain the feature briefly. The build checks that every APP_CHANGES entry has an artwork category, so a new feature cannot silently fall back to an icon.

The map/reading additions belong to announcement 367. Version 368 is a visual correction of those additions; later cosmetic versions must keep that announcement id. The roundup now preserves its earlier cards and includes holy-city map views and regular Quran reading resume. Keep the existing October 21 expiry and dismissal behaviour.

Version 369 activates Russian tafsirs of as-Saadi and Ibn Kathir via the verse menu and upgrades recognition to 221 recordings/46 voices with eight-second capture and parallel preparation. Advance announcement to 369 because these are major additions; retain the existing gallery and expiry. Replace the planned tafsir card with an actual screenshot before publication.

## Hold subscription news (19 October 2026)

At the user’s request, keep subscriptions, monthly financial support and YooKassa cancellation review out of public news until explicitly approved for announcement. Filter both installed/waiting release copy and legacy cards. Keep the current major roundup, acknowledgement and expiry. The support page and direct cancellation-review route stay available.

## Version 375 — personal account continuity (19 October 2026)

Profile identity checks no longer wait for counter uploads. Fresh login invalidates older pending checks, and unclassified network/gateway refusals preserve the local session. Confirmed Auth revocation still closes it. The minor-fix card uses the original SALAH account illustration; keep announcement 369, its expiry and dismissal state.

## Version 376 — readable leader badges (19 October 2026)

Move the weekly/monthly winner medallions below the nickname in the podium and ranking list. Increase them from 12 to 32 CSS pixels, preserving each person button and the existing ranking order. The minor-fix card reuses the matching week/month medallion artwork. Preserve announcement 369, its expiry and acknowledgement.

## Version 377 — visible leader award artwork (19 October 2026)

The podium now groups avatar and nickname on one aligned row, then centres a large trophy and readable award caption below it. CSS viewports remove the existing PNGs’ transparent margins without modifying the supplied artwork. List rows use the same hierarchy at a compact size. Keep announcement 369, its expiry and acknowledgement.

## Version 378 — balanced leader award size (19 October 2026)

Reduce podium trophies from 88 to 72 CSS pixels and list trophies from 64 to 56, retaining the artwork crop and readable captions. Reduce the podium identity area to 90 pixels to match. Preserve announcement 369, expiry and acknowledgement.

## Version 379 — continuous Mishary and Maher playback (19 October 2026)

Start online listening from the beginning with the provider's complete Hafs recordings for Mishary Alafasy and Maher Al Muaiqly. Keep the existing verse IDs for downloaded recordings, explicit ayah playback and saved ayah/time offsets. Hidden recording variants retain the public catalog and listening identities. Reuse a session-owned audio element across whole chapters and build the next track from validated catalog positions without waiting for reading-text downloads. Maher's checked recording has no provider ayah timing, so do not invent highlighting. The minor-fix cards use the two actual reciter portraits; preserve announcement 369, expiry and acknowledgement.

## Version 380 — reviewed adhkar readings and pronunciation (20 October 2026)

Keep the user-reviewed Sayyid al-istighfar and tahlil spelling and the readable Al-Ikhlas presentation. Use «уа» for the conjunction. Leave all other original readings, canonical Arabic, translations, sources, IDs and repetition counts unchanged. Scope the existing Madinah Unicode typography to surahs 112–114, with the bundled Amiri Quran fallback.

Add a compact gold play/pause button on the left for 13 recordings whose provider-published Arabic matches our formulas. Coordinate playback and update protection; stop sound on card or section exit. Keep three differing provider formulas excluded. Retain provenance internally; a complete phonetic listening audit is not claimed. Keep swipe/keyboard navigation and hide the unrequested previous/next buttons.

Update the existing adhkar illustration/card with the agreed spelling and compact audio control. Preserve the other 13 cards, announcement 369, expiry and acknowledgement. No subscription announcements. Publication authorized by the user on 20 October 2026.

## Version 381 — further approved adhkar readings (20 October 2026)

Publish the agreed Alim reading and the verbatim user-supplied raditu, hayy and hasbi spellings. Preserve the exact Cyrillic wording, punctuation and hyphenation. Keep all other readings, canonical source catalogue, IDs, repetitions and saved progress unchanged.

The selected raditu variant includes salawat. Add it to the Arabic display and its translation, retain the original catalogue, and enable the matching existing provider recording. Validate the displayed Arabic against the provider formula before returning any audio URL. Fourteen recordings are available; the differing sayyid and evening bika formulas remain excluded.

Update the existing adhkar feature card and reuse its approved illustration. Preserve the gallery, announcement 369, expiry and acknowledgement. No subscription announcements. Publication authorized by the user on 20 October 2026.

Play/pause consumes its click before replacing the SVG, preventing the detached icon target from opening the explanation panel through event bubbling. The counter remains independent.

## Version 382 — Asbahna and salawat spelling (20 October 2026)

Publish the user's Asbahna transcription verbatim, including «Асбахнаа», «аляя», «сууи-ль-кибар», punctuation and hyphens. In Raditu replace only «сал-ля-Ллаху» with the exact requested «салляЛлаху». Keep Arabic, translations, audio mappings, repetition IDs, targets and saved progress unchanged.

Reuse the existing adhkar feature artwork and gallery. Preserve announcement 369, expiry and acknowledgement. No subscription announcements. Publication authorized by the user; remaining adhkar are deferred to the next session.

## Version 383 — live Top SALAH listening total (21 October 2026)

Update the shared listening display from actual local audio progress while the eligible signed-in listener's server snapshot is in flight. Reconcile server acknowledgements without duplicate seconds, respect downward corrections and privacy changes, and reset the preview on account, date or period changes. Pauses, seeking, repeated renders and the page timer never invent listening time. Keep confirmed server scores authoritative for rankings and awards.

Reuse the existing Quran listening artwork and gallery. Preserve announcement 369, expiry and acknowledgement. No subscription announcements. Validate the real listening meter, stable DOM updates, server reconciliation and event cleanup.

## Version 384 — news-style invitation for friends (21 October 2026)

Show a separate illustrated invitation in the existing news-dialog style, with «Пригласить друзей», a chain-link button for copying the public link and «Позже». Offer it after eight idle seconds on Home after onboarding and existing public news, with no foreground playback, other dialog or celebration. Store a separate seven-day cooldown when actually shown, including dismissal by Escape; do not change the public announcement receipt. Restricted audiences receive no new invitation. Recheck guards at presentation time and clean up scheduled work and listeners. No inline Home banner.

Keep the existing Menu sharing actions, clarify the label and use the same link icon. Sharing only opens after an explicit tap and includes no account, reading position or tracking identifier. Preserve native cancellation, duplicate-tap protection, clipboard fallback and QR.

Add the feature-specific two-screen sharing illustration for this minor enhancement. Preserve the existing roundup, announcement 369, expiry and acknowledgement. No subscription announcements or outbound campaigns. Publication is part of the requested app sharing change.

Remove the redundant leader caption and separate own-place/time line above the Top SALAH podium as requested. Keep the shared total, period selection, podium times, badges, confirmed ranks and live updates unchanged; reuse existing Quran feature artwork for this minor cleanup.

## Version 385 — refined friend invitation (21 October 2026)

Use the existing night mosque artwork in a full-width hero, a quiet SALAH wordmark, a refined gold/ivory heading, and matching gold sharing/link controls. Replace the paragraph with the requested «Отправь ссылку тем, кому желаешь блага». Scope dialog styling to this invitation and preserve explicit sharing, native cancellation, clipboard fallback, safe Home-only idle guards and the separate seven-day cooldown. Keep the podium cleanup and public announcement 369, expiry and acknowledgement. Reuse the existing sharing feature artwork; no new media or subscription news.


## Version 386 — chapter continuation and steady mobile dock (21 October 2026)

Prepare the next recording metadata and saved-audio lookup while the current chapter plays. A ready automatic continuation starts on the already authorized media element directly from ended, without an IndexedDB or catalog wait. Preserve offline-only playback, finite boundaries, partial catalogs, playlists, cancellation and explicit Pause. Regress 7 → 8 with storage/catalog callbacks blocked at ended; physical iPhone locked-screen verification remains required.

Position the compact player from the navigation bar's layout bottom inset and height, rather than its moving screen rectangle during elastic scrolling. Disable Home boundary overscroll without disabling content scrolling. Reuse Quran artwork; preserve announcement 369, expiry and dismissed state. No subscription news.


## Version 387 — confirmed shared listening motion (22 October 2026)

The existing shared SQL total sums eligible listeners across reciters. Smooth confirmed remote additions over their observed reporting interval while keeping real local progress immediate. Never infer seconds from online counts or multiply listening time. Drain only an already confirmed backlog; reset on account, period, date, privacy changes, missing totals and downward corrections. Ranks, awards and stored scores stay authoritative. Update text in place, suspend animation while hidden and dispose the timer on exit. Reuse Quran artwork and preserve announcement 369, expiry and acknowledgement.


## Version 388 — shared mobile viewport (22 October 2026)

Use one top-anchored dynamic-height mobile container for navigation and the compact Quran player. Preserve the safe inset, eight-pixel gap, natural scrolling and full-player dialog. Desktop and About retain their layouts. Physical iPhone floating-dock and locked-screen verification remain required. Reuse Quran artwork; preserve announcement 369, expiry and acknowledgement.


## Version 389 — guarded iOS audio interruption handling (23 October 2026)

The user reports that force-closing the separate Sahaba home-screen web app also stops Quran playback in SALAH. Source inspection found no cross-app pause channel. Treat shared WebKit/system audio-session interruption as a hypothesis, not a reproduced root cause.

Request the playback audio-session category only while Quran playback is intended. After an explicit OS interrupted → active transition, recover the same media element and position once if it remains paused. Manual pause, stop, track disposal and replacement cancel recovery. Generic pause, visibility changes and page lifecycle events never initiate playback; do not steal focus while another app or a phone call still interrupts the session. Unsupported APIs degrade to existing HTML audio.

Reuse existing Quran feature artwork. Preserve announcement 369, expiry and acknowledgement. Private video lessons are excluded from this release. Physical iPhone reproduction (both apps installed through Add to Home Screen, close Sahaba while SALAH is playing) remains required. JavaScript cannot recover after iOS terminates the SALAH process itself.


## Version 390 — full-audit corrections (23 October 2026)

Prevent stale final Auth session reads from signing out a freshly accepted login or returning an old identity. Preserve both fixed Quran edition identifiers in validated backups, while rejecting unsupported editions and unknown fields. Add accessible previous/next step names to existing prayer learning; localize fallback map zoom buttons and Quran ayah-count plurals.

Use existing account, Quran, prayer-pose and Qibla feature artwork. Preserve announcement 369, its expiry and acknowledgement. Private video lessons are excluded. Device-specific iOS background audio, hardware permissions, real push delivery and Google Play upgrade delivery remain separately unverified; the browser audit must not claim them as passed.

## Version 391 — names of Allah (23 October 2026)

Add the names study and five-question practice in Knowledge. Its own Arabic
card illustration opens the roundup; preserve all 14 earlier cards. This is a
new feature announcement, so advance its identifier to 391 and the three-day
window to October 26. Keep lessons private and payment news excluded.
See allah-names-sources.md for the editorial policy and sources.

## Version 392 — Safari standalone foreground audio recovery (23 October 2026)

Version 389 relied on AudioSession.state/statechange, absent from shipping Safari
according to MDN BCD api/AudioSession.json; WebKit DOMAudioSession.idl gates them
behind DOMAudioSessionFullEnabled. Keep playback category, add a one-shot
foreground/focus return recovery only for standalone pages whose intended
playback paused during a background transition. Resume the existing element
and position; never retry generically, while hidden, or after explicit UI or
MediaSession pause/stop, owner replacement or destruction. Full API support
also handles an active event delivered before the media pause.

Sources: https://github.com/mdn/browser-compat-data/blob/main/api/AudioSession.json
and https://github.com/WebKit/WebKit/blob/main/Source/WebCore/Modules/audiosession/DOMAudioSession.idl.
An OS-frozen/terminated PWA cannot run this recovery until it returns; continuous
background playback across closing another PWA is not guaranteed. The exact
physical-iPhone scenario remains pending. No SAHABA code or private lessons
are published. This minor fix preserves announcement 391, its artwork/gallery
and acknowledgement/expiry.

The shared listening counter now drains confirmed remote seconds over the actual
observed response interval, including delays longer than 15 seconds. Separate
local batches replay at 1x; ordinary single-second samples stay immediate.
Foreground return seeds the fresh total instead of replaying hidden time. Stored
scores, eligibility, ranks, awards and server SQL are unchanged; no seconds are
extrapolated. New original vector artwork shows two measured totals and their
sum. Keep announcement 391, all earlier roundup cards and private lessons.

## Version 394 — shared-counter digit transitions (24 October 2026)

Only the shared total in Top SALAH changes: animate changing digits with a small
vertical fade, preserve the original text/spacing, and keep all count/rank logic.
Use the existing Prata family locally for lining figures on one baseline, with
equal-width digit slots. Per user feedback, unit labels are 80% of digit size.
Personal totals and the rest of the screen retain their existing appearance.
Respect reduced motion; expose one current accessible value, without duplicate
old glyphs. Pauses, snapshot corrections and unknown values never invent seconds.
Keep announcement 391, its expiry and acknowledgement. Reuse the existing
shared-listening-392.svg illustration. Pending update-choice PR 254, the private
update channel, lessons and payment announcements are excluded.

Remove the large roundup banner from Menu at the user's explicit request;
keep Home behaviour, announcement acknowledgement and Settings → What is new.

## Version 395 — upcoming learning formats (25 October 2026)
At the user's request, publish announcements for «Онлайн-занятия», «Муаллим Сани» and «Прямой эфир».
Show three static cards at the end of Knowledge, preserving all existing study links.
Each uses a real disabled gray button labelled «Скоро», with no launcher, URL, token or API call.
Online lessons cover tajwid, Arabic and future teacher-selected subjects; the name describes live classes rather than prerecorded videos.
Publish only feature-specific original illustrations of a classroom, course and broadcast presentation.
The existing roundup keeps its fifteen cards and adds the alphabet PDF card and three future-format cards.
Advance the announcement identifier to 395 and its three-day window to October 28 because the user explicitly requested new public news.
Keep the large Menu banner removed.
No private video-room client, LiveKit configuration, invitation, full Muallim course, private update prototype or alphabet audio draft is included.
The public availability is «Скоро», not a claim that lessons, broadcasts or the course are launched.


The user also requested pictures of the existing names of Allah, Arabic letters, and downloadable alphabet options. The roundup starts with names and the new alphabet PDF composition. The alphabet now offers a one-page letters/names PDF and the two-page contextual-forms PDF. Both omit the technical footer, as requested. Audio remains outside this public release.

At the user’s request, each Knowledge section has a distinct thematic icon rather than repeated books: names, letters, Kaaba, prayer, washing, steps, classroom, vowel study and broadcast. These are original vectors, with actual Amiri outlines for Arabic glyphs.


## Version 396 — closed owner previews (25 October 2026)
Keep announcement 395, all public copy, its expiry and acknowledgement.
The verified owner sees private test links for online classes and Muallim Sani, and a clearly labelled layout preview for the not-yet-launched broadcast mode.
Ordinary users retain disabled gray Soon buttons. The owner status comes from the existing server-verified owner-access check, not a query parameter or storage flag.
Knowledge refreshes after owner verification/revocation. Alphabet and names readers do not add owner polling.
Links contain no secret, token or invitation. The private gateway retains its separate authenticated classroom session; full course and chat remain outside the public bundle.
The new course view in the private client checks the teacher session. Broadcast preview is explicitly a layout/description and does not claim working live-broadcast controls.

2026-10-25 user revision: current news includes only this release’s four changes, without appended older reciter/Qibla/travel cards. Keep announcement 395, expiry and acknowledgement unchanged. Knowledge symbols retain 36px tiles, use 28px thematic masks in the existing gold theme, with no orange filter. Queuing an update hides its banner and preserves audio until safe activation.

397: verified owner checks open inside SALAH through a restricted frame and existing server-side owner authorization. Public launch buttons remain disabled. New course content and private video transport remain outside the public bundle. Announcement 395, expiry and seen state retained.

398: cross-origin lesson input focus now drives a scoped iPhone visual viewport layout, preserving the same frame and draft, hiding the dock/footer while typing and restoring them afterward. Closed lesson camera decoration uses a separate layout slot. A foreground owner grant is revalidated after suspension instead of treating UI-cache age as revocation. Explicit sign-out still closes the preview. Book cursor bridge is restricted to validated owner messages. Public announcement395/acknowledgement and disabled launches remain unchanged.


### 399 · 26 October 2026 · closed course persistence
The owner-only Muallim course is now adapted into SALAH lessons. Only its bounded progress validator and origin/nonce-protected first-party progress bridge are in the public wrapper; the teaching content and source pages remain private. Existing announcement395, acknowledgement and expiry stay unchanged. Public users continue to see Soon.


###400 ·26October · closed inline learning navigation
Muallim and live preparation render in the app like alphabet and Umrah. Only public rendering code is bundled; owner-only teaching data use a narrow authenticated GET API with exact-origin CORS and in-memory reuse. Original pages remain an explicit reference. Other users retain disabled Soon controls; announcement395 is unchanged. The local preview missing-import defect and legacy lesson routes are corrected.

###401 ·26October · closed section loading
Verified owners reuse a validated first-party course package across app launches; Knowledge prefetches it once. Sign-out/revocation clears the course cache and no bearer is stored or backed up. The separate private lesson service uses a lazy media bundle, one authenticated list bootstrap and compressed, ETag-validated static assets. Media is prepared on prejoin so the Join tap retains its audio gesture. Other users retain Soon; announcement395, expiry and acknowledgement remain unchanged.

###402 ·26October · dhikr completion and everyday dua pronunciation
Only new public changes appear: deliberate continuation after the prescribed dhikr count and61 everyday duas with43 exact-formula audio mappings. Two original feature compositions accompany this announcement. No old reciter/Qibla cards are appended.
Closed teaching-room improvements and source-checked additional reading rows remain owner-only. Visible source citations have been removed from dua/course cards at the user’s request; internal references remain available for text/audio checks.

## 403 — closed account lessons, 2026-10-26

Version403 adds invitation-only account enrollment and the private teacher schedule. Public knowledge cards remain Soon. The public announcement stays402with its existing acknowledgement and expiry; no old feature cards are re-announced. Schema20261026114530is applied with private tables and no direct browser-role access. Lesson reminders use the browser/PWA delivery path; Android native lesson push remains a later phase. Actual authenticated lesson enrollment and closed-app delivery require the private device check.

## 404 · 27 октября 2026

Только новые тематические подборки повседневных дуа с иллюстрированными обложками. Ранее показанные карточки не повторяются. Кабинет команды доступен только сотрудникам по прежним серверным правам и не анонсируется публично.


## 405 · 27 октября 2026 · кабинет и карточки

Исправления кабинета владельца, отдельных экранов настроек и переписок; компактный список пользователей и самостоятельный профиль с раздельными блоками. Доступ остаётся по прежним серверным правам/MFA. Назначение преподавателей не активировано: кнопка «Скоро», без новых API/ролей. Учебные разделы сохраняют прежние owner-only ограничения. Общий счётчик больше не проигрывает очередь подтверждённых секунд с ускорением. Публичное объявление404, иллюстрации, срок и отметка прочтения сохранены.

## 406 · 27 октября 2026 · первое открытие и оформление

Исправлен переход из личного аккаунта в кабинет владельца: общий визуальный класс больше не принимается за готовый кабинет. Возвращены тонкие рамки пунктам меню; устранены двойные боковые отступы и внешняя сужающая оболочка авторизованного аккаунта. Заголовок «Азкары» использует белый шрифт и масштаб раздела «Знания». Это исправление: объявление 404, иллюстрации, срок и прочтение сохранены. Закрытые разделы, серверные права, MFA, данные и аудио не изменены.

## 407 · 27 октября 2026 · компактный аккаунт и верхняя строка

Уменьшены аватар, награды и промежутки личного аккаунта, три награды полностью помещаются в ряд. Скорректирован одинарный контур значка сообщений. Верхние строки аккаунта и кабинета получили дополнительный отступ от системного края iPhone, строка кабинета — непрозрачный фон; эффект системного размытия требует подтверждения на устройстве. Публичное объявление404, срок и отметка просмотра не меняются. Права, MFA и закрытые разделы сохранены.

В эту же407 включена компактная мобильная раскладка меню, настроек и вложенных карточек кабинета: короче строки, меньше промежутки; убраны двойные внутренние отступы групп настроек. Поля ввода сохраняют шрифт16px, цели нажатия — от44px.

Дополнительно уплотнён «Обзор» и рассчитана высота плиток короткого кабинета для портретного экрана; в меню/кабинете убран нижний авторский блок, создававший лишнюю прокрутку. Длинные списки продолжают прокручиваться. Строки пользователей оформлены отдельными закруглёнными карточками с полной рамкой и без вложенного сужения.

В профиле пользователя удалена контрастная прямоугольная подложка; фон общий с приложением, верхняя навигация получила цельную закруглённую рамку.

Компактный масштаб применён также к отдельной карточке пользователя: меньше аватар, заголовок, награды и промежутки между панелями; основные текстовые сведения и удобные кнопки сохранены.

## 408 · 27 октября 2026 · внутренние карточки знаний и подпись

Для подтверждённого владельца три закрытые карточки знаний оформлены обычными карточками с внутренними маршрутами view: онлайн-занятия, Муаллим Сани, прямой эфир. Открытие остаётся в SALAH с внутренним возвратом; прежние preview-ссылки поддерживаются. Для остальных пользователей — прежние три отключённые кнопки «Скоро». В кабинете владельца включены реальные поиск зарегистрированных аккаунтов по нику, назначение и отзыв роли преподавателя с серверной проверкой владельца/MFA, ревизиями и приватной историей. Роль сама по себе не открывает новые учебные разделы; доступ к урокам остаётся закрытым. Подпись SALAH by Saadi Kobilov восстановлена компактно над нижней навигацией меню и кабинета, не увеличивая страницу. Объявление404, срок и прочтение сохранены.

В408 также закреплены камера и удаление фото у компактного аватара, заголовок аккаунта уменьшен и отодвинут от системного края. Убрана чёрная полоса заголовков кабинета, зелёная точка поддержки закреплена внутри плитки. Фото в карточке пользователя увеличено, четыре панели уплотнены. Кнопка возврата «Меню» на странице «О приложении» учитывает безопасную область iPhone.

Общий чат команды закреплён первым по умолчанию; переписки можно закрепить/открепить отдельно для аккаунта на этом устройстве. Серверный список личных чатов возвращает идентификатор собеседника для защищённой загрузки аватара; видимость переписок и доступ к фото не расширены.

## 409 · 27 октября 2026 · подпись внизу меню

Авторская подпись возвращена в обычный поток в конце меню. Закрепление над нижней навигацией удалено: в кабинете владельца и его внутренних разделах, включая пользователей и переписки, подпись больше не накладывается на карточки. Публичное объявление404, срок и отметка прочтения сохранены; доступы и данные не изменены.

## 410 · 27 октября 2026 · кто слушает Коран

В Топе у открытых профилей участников появился полупрозрачный значок наушников у аватара. Он основан на продвижении записи Корана, отправляется не чаще раза в15секунд и истекает через45секунд без свежего сигнала. Пауза, завершение и ошибка записи отправляют остановку; порядковый номер защищает от запоздавшего запроса. Наушники обновляются без повторной анимации рейтинга. У скрытых и анонимных профилей статус не показывается. Время, рейтинг и награды не меняются этим механизмом. Новость410 содержит только эту возможность с отдельной иллюстрацией; срок прежнего окна новостей сохранён. Закрытые разделы знаний не открыты.

## 411 · 27 октября 2026 · подпись в меню как в аккаунте

Авторская подпись в главном меню получила прежний размер17/12px, стандартный промежуток между названием и автором, а также отступ36px от разделительной линии. Сохранено обычное положение в конце страницы. Нижний запас прокрутки учитывает безопасную область и навигацию, чтобы подпись оставалась доступной над панелью. В кабинете подпись не показывается. Объявление410, срок и отметка прочтения не сбрасываются.

## 412 · 27 октября 2026 · подпись меню без прокрутки

Сохранён размер авторской подписи17/12px. Уменьшены пустые промежутки около подписи и приглашения, нижний запас страницы согласован с навигацией и безопасной областью iPhone. Компактные отступы меню включаются также на экранах высотой до820px. В проверке390×844 и375×812 подпись видна при открытии меню, без прокрутки и перекрытия панелью. Объявление410, срок и прочтение сохранены.

В412 также удалена устаревшая карточка «Большое обновление SALAH» с главной, включая старые изображения и текст о мусхафе, чтецах и карте. Она больше не зависит от отметки прочтения и не возвращается при обновлении. Актуальное «Что нового» остаётся доступным отдельной кнопкой в настройках приложения.


## 413 — Menu spacing

Menu title now starts 24px below the safe content inset. Its rows share the available phone height, leaving the normal-flow author signature 16px above the dock. Natural minimum row sizes and scrolling remain available for short screens and larger text. Announcement410 and its acknowledgement/expiry are unchanged.


## 414 — Large Menu buttons

Restore large phone Menu rows: at least52px, account60px. Their explicit flex basis cannot shrink. Reduce empty heading and inter-row gaps on short phones; keep title24px below the safe inset and the author signature in normal flow. Announcement410 and closed learning sections remain unchanged.

The Menu section explicitly spans the available width and receives the remaining viewport height after the safe title, footer and dock reserves. This prevents auto side margins from narrowing the buttons and removes the marked empty area below the signature by growing the buttons.


## 415 — Menu hierarchy and SAHABA

SAHABA moves from Menu to a regular Knowledge card, retaining its existing destination and external-link protections. Support SALAH remains a separate visible Menu action. Menu recovers unused footer and heading space for its eight rows; personal account has a72px minimum, larger42px portrait,18px name and stronger gold surface. Author signature remains in normal flow,8px clear of the bottom dock on standard phone sizes. Announcement410 and private learning gates remain unchanged.


## 416 — Menu button block offset

Move the button block40px farther below the Menu heading, preserving its row minimums, emphasized personal account and visible support action. Use the current dynamic viewport height for the Menu height budget so the author signature aligns with the fixed navigation rather than leaving a smaller-viewport gap. Keep the8px signature clearance; existing SAHABA placement, announcement410 and closed learning gates remain unchanged.


## 418 — 29 октября 2026 · Азкары и свой счётчик

Главный экран азкаров использует палитру Знаний и пять крупных карточек. На обычных портретных экранах390×844 и375×812 все действия видны без прокрутки; на меньшей высоте и при увеличенном тексте прокрутка остаётся доступной. Свой счётчик: восемь коротких формул, отдельные локальные круги и цели, свои тексты; общий накопленный счёт и прежняя привязка к аккаунтам сохранены. Резервные копии поддерживают новое состояние. Картинка short-dhikr-418.svg создана кодом SALAH и показывает эти изменения. Новое объявление418 включает только этот выпуск. Учебные разделы и закрытая неопубликованная417 в выпуск не входят.


### Pending418: eight reciters

Added a second current-edition feature picture made from the eight actual reciter portraits. The Azkar picture remains within this same unpublished edition. Each portrait is documented in `reciter-expansion-20261029.json`. No generic reciter artwork, old reader announcement, closed classroom news or Home banner is added. Announcement ID and expiry remain418 /2026-11-01.
