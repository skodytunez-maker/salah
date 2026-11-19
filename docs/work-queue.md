# Текущий статус —19 ноября2026

- Публичная база:524, commit7746ec9d07fc5539464a469c07d7b462aaacbb12. Исправление оформления обращений опубликовано; установка и внешний вид на телефоне не подтверждены.
- Сейчас: следующий отдельный кандидат525 — оформление настроек/напоминаний и пожелание с «Аминь» в наградах. Новое живое небо по-прежнему закрыто. Темы523 и исправление524 уже опубликованы.
- Следующая ближайшая задача: измерить и устранить подтверждённые задержки открытий/переключений; предварительные точки ожидания записаны в outputs/salah-navigation-performance-triage-2026-11-19.json. Пока ускорение не заявлять.
- В очереди остаются: оформление значков и напоминаний, пожелание и «Аминь» в наградах, названия сур по языку интерфейса, геолокация, честный прогресс обновления; отдельное новое небо требует переноса на актуальную базу и проверки владельцем.
- Последующие идеи: возобновление после внешнего микрофона, отправитель «лично / SALAH · Поддержка», набор аватаров, «Тёплый песок» как светлая тема всего приложения, подарки Рамадана, формат живого радио и бизнес-экосистема.
- После текущих работ сверить всю историю пожеланий с кодом и релизами, отделить готовое от непроверенного и упущенного. Ниже сохранён хронологический журнал; более поздние решения уточняют старые статусы.

---

# Очередь SALAH — 18 ноября 2026

Записывать новые пожелания во время текущей работы, не заменяя ими незавершённую задачу. Идеи с явной оговоркой «на будущее» не внедрять автоматически. Проверка кода или тестов не означает проверку на телефоне или публикацию.

## Текущий пакет

- Обращения: отступ имени от верхней полосы; аватар открывает приватную карточку владельцу; свайп из карточки возвращает к той же переписке с местом и черновиком; следующий свайп ведёт в список. Статус: код и целевые регрессии подготовлены, общий выпуск ещё не опубликован.
- Возврат после другого приложения: не сбрасывать открытый чат при повторной проверке того же аккаунта; настоящий выход или смена аккаунта очищают приватное состояние; новый запуск открывает Главную. Статус: целевые проверки пройдены, проверка на iPhone впереди.
- Награды: пожелание «Пусть Всевышний примет твоё усердие» и кнопка «Аминь» на восьми языках; обычное подтверждение новости не менять. Статус: код подготовлен, проверки впереди.
- Названия сур в общем списке Корана: отображать соответственно языку интерфейса, не менять арабский текст и выбранный перевод смыслов. Статус: найдена причина — прямое использование русского поля name, исправление в работе.
- После этого проверить всю переписку последних дней на упущенные пожелания и сопоставить с кодом/публикациями. Статус: обязательный следующий этап; неизвестное отмечать «нужна проверка», не считать готовым по прежним обещаниям.

## Отложено по явному указанию

- Подарки к Рамадану: поздравления/открытки/анимации с выбранной стоимостью. На будущее, без внедрения платежей или объявления.
- Видео/радио знакомого автора: получить конкретные ссылки, права и доступный исходный файл или отдельное аудио. Возможность обсуждена; материал ещё не получен, использование не запущено.
- Экосистема SALAH: умра/хадж, переселение, карго и личный бренд. Идея на будущее.

## Независимая пробная работа

- Живое небо519: кандидат и видеопример подготовлены отдельно; не опубликованы и не установлены на iPhone. Сохранить чёткость исходных мечетей; перед общим выпуском нужна проверка владельцем на телефоне.

- После обращений: оформление настроек атмосферы — убрать пояснение под «Живым небом», добавить SVG-значки к переходам/погоде и заголовкам стеклянного режима/звуков. Переключатели, сохранение, owner-only живое небо и остальные настройки не менять. Статус: заказано, ожидает текущего пакета.

- В том же следующем оформлении настроек: единые заголовки, SVG-значки, размеры и отступы для напоминаний об азкарах/зикре, Джумы, раздела «Когда SALAH свёрнуто» и звука/уведомлений iPhone. Сохранить все действующие настройки и поведение уведомлений. Статус: заказано, после приоритетного исправления обращений.

- Ближайшая отдельная задача после текущих исправлений: проверить задержки кнопки «Моё местоположение» и существующую логику предложения обновить город при входе после поездки. Использовать только разрешённую геолокацию, не обещать мгновенный GPS; не менять религиозные настройки и остальные разделы. Статус: записано по просьбе владельца, не реализовано в520.
- Возможный анализ радио/подкастов: структура выпуска, работа ведущего, темп и переходы по предоставленным примерам. Обсуждена возможность; конкретные записи и задание ещё не получены.

- Уточнение владельца: новое небо включить в следующий пробный пакет для него, после выпуска520; сохранить общий базовый режим обычных пользователей.
- Новый запрос: сделать компактнее текст статуса после нажатия «Обновить»; не менять размеры всех текстов/кнопок приложения.
- Проверить объём повторной загрузки при обновлениях: различать серверную сборку/публикацию и загрузку на телефон; не обещать ускорение без измерений.

- Уточнение обновлений: компактное тёмное сообщение в стиле SALAH; короткие подписи этапов; реальный процент загрузки, когда известен общий размер. При неизвестном размере показывать стадию без выдуманного процента. Перед изменением измерить существующий поток Web/PWA и native; не нарушить сохранение форм, аудио и атомарность установки.

## Подтверждение выпуска520

PR388 объединён; commit13a82eddf379f283988798852bb6b51b2aed1bb1, treee95cdb0692d4d338b8b5aee973f0c7d5f02c7acd. Все334 проверки приложения и проверка публикации Pages44373051268 завершились успешно. Проверка на iPhone ожидается. Прямой HTTP-контроль из этой среды недоступен; доставку на конкретный телефон не объявлять подтверждённой. Новое небо, награды, названия сур, оформление настроек и прогресс обновления не включены.


## Support521 correction, 19 November

Real520 Habib Malik/Sarvinoz card failures and native Back were reproduced. Production auth/server integration and same-URL conversation Back corrected; 335/335 exact-head CI checks, database/DOM, native Android/Play/iOS, rights and tablet checks passed. Server owner-access v36 deployed and read back exactly. PR389 merged (5140b111c12481c9955eed3331e5e1071443d815; tree20ff9d2349d21008c3b77a927ff39be50e1d406d). Pages publication pending; phone confirmation outstanding. Future private sky must be rebased onto521 or later, never replace these Support fixes with518/519 source. Other queue items remain unfinished.


### 521 publication completed

Published through ordinary installed SALAH on19November: Pages44379775146/job135068514477 succeeded on exact merge51611e8ed0788b20e5a854049f5059d8f606f28f (tree4a2849e2a881a1ae655ee00af397fa94bc7b6466). Follow-upPR390 restored the exact existing generated official-imam schedule entry omitted in the initial scope manifest; no checker/workflow weakening. Final exact head again335/335 application checks plus database/DOM checks passed. Backend36 verified byte-for-byte and both reported contacts resolve in the updated production query. No physical iPhone retest yet and no direct public-byte/hash HTTP probe; Pages deployment source/manifest evidence retained. The owner needs521 installed to verify avatar cards and card→chat→inbox right Back. Other queue items are unfinished; next private sky must incorporate521 fixes.


## Support522 card presentation —19November

Two real phone screenshots confirmed a loaded but unstyled card. Reused the owner-profile-screen styling context in the Support modal; scoped rounded Back/Refresh toolbar, even spacing, responsive sections and initial dialog focus. New real CSS-cascade regression fails on521 and passes on522 atfive phone/landscape/desktop/RTL variants. All336 exact-head application checks plus database/DOM, Android/Play/iOS, account marks, rights and tablet checks passed. PR391 merged41419b922cd25d675dc1440c7b26b05137d1774a; tree2bef48d88e742cc9e9ebea15b3311c9f58dc4514. Pages publication pending; no physical iPhone rendering confirmation yet. No backend/sky/photo/player/news change. Next owner-only sky must incorporate522 or later common fixes.


### 522 publication completed

Actual Pages44384156597/job135084044008 succeeded on merge41419b922cd25d675dc1440c7b26b05137d1774a, source tree2bef48d88e742cc9e9ebea15b3311c9f58dc4514. Card presentation is public522 through the usual installed app. No physical iPhone styling retest or direct public HTTP byte probe yet.

### New wallpaper/theme idea —19November

Keep the current card structure and placement; allow a personally chosen wallpaper behind it. A stock image or own photo is a possible UI, with readable text/controls. Timing of card wallpapers is being clarified; do not silently broaden to all owner screens or expose photos to another account. Telegram/Instagram-like conversation themes (different backgrounds/palettes per conversation) are explicitly a future idea; do not launch now. Current common522 card layout remains the baseline.


### Theme preview approval boundary

Owner clarified: include both private-card wallpapers and conversation themes in the current design exploration, but FIRST send concrete visual alternatives for evaluation. Do not implement or publish these themes before the owner selects/approves a shown direction. Keep card structure and message layout. No523 source candidate exists; only522 card styling is published.

### Future audio interruption resume —19November

When Quran was playing before recording/sending a voice message in another app, resume from the exact prior position after microphone use ends, where the platform permits. Record for later updates, not part of themes now. Preserve authoritative manual/system Pause: resume only a source that was actually playing and interrupted by microphone/audio focus, never after deliberate Pause/Stop, dismissal, track/account changes, permanent interruption or revoked audio session. Investigate real iPhone/native/PWA behavior; do not promise background JavaScript can observe every external microphone release. Add appropriate interruption/resume regressions before a future release.


### Current theme design brief

Preview-only now: exactly three coherent wallpaper/theme directions, each shown on the private card and a conversation. Existing SALAH dark navy/gold typography, card order and message alignment are grounding references. Personal stock/custom wallpaper support is planned, not built. Current date19November2026. The user must evaluate and select a displayed direction before implementation/publication. Next request: future audio focus/microphone interruption resume recorded separately.


### Theme previews shown; awaiting selection

Exactly three independent ImageGen comparison images displayed once in order:1=exec-48ed7fbc-1b9c-485a-8016-f4b1288a2347.png;2=exec-73144134-e065-465d-b1c8-9986fa33be06.png;3=exec-77992ed2-75d3-49e7-a845-1e8f161500a2.png. Full paths and shared prompt in outputs/salah-theme-previews-2026-11-19.json. Each image shows the same theme on a profile and a conversation with fictional content. These are illustrative previews, not screenshots of implemented themes. No523 source candidate or theme app change exists. Wait for the owner to choose or refine a displayed preview, and preserve522 actual structure/behavior when implementing.


### Future full-app light theme: warm sand approved as direction

Owner explicitly praised the displayed third theme «Тёплый песок» and asked to remember it as the design direction for a future light theme across the entire SALAH application. Reference: displayed theme option3, generated image exec-77992ed2-75d3-49e7-a845-1e8f161500a2.png; see salah-theme-previews-2026-11-19.json. Preserve warm muted sand/ivory, dark readable type, restrained gold/sage accents and avoid bright white flashes when entering from dark screens. This is a FUTURE whole-app theme idea, not authorization to recolor or publish the whole application now. It is separate from the still-unselected current card/chat theme implementation.


### Expanded theme catalogue requested

Owner clarified that «Тёплый песок» stays a DRAFT for a future whole-app light theme and is excluded from the current card/chat selection. Owner requested roughly6–10 themes for variety. Prepare8 dark card/chat themes: retain the two shown dark directions and show6 additional independent visual previews first. No theme code or publication before user evaluation. Planned additional directions: emerald, graphite, bronze, mountain lake, amethyst, starry night. All retain existing layout and readable surfaces; no bright-white transition. Final numbering must follow actual displayed results of this new six-image set, separately from the original three-image set.


### Expanded-theme visual constraint

Owner asked to research current messenger/wallpaper practice and clarified variety must include genuinely different patterns, not simply recoloring the same wallpaper. Use quiet diamonds, fine geometry, curves/contour lines in some themes; keep some photographic or textured themes without pattern. Maintain dark SALAH-compatible palettes and legible text. One new emerald mock has already been displayed; remaining five should explicitly vary the wallpaper motif, not just color. No implementation until evaluation.


### Future Support sender persona selector

Owner requested a later-update «Ответить как» switch: their personal founder/account name OR official «SALAH · Поддержка». Recipient must clearly see the selected display persona. Future implementation must preserve the real authenticated sender/operator and existing session/MFA authorization; official-app sending is a server-checked capability, not a client-editable role. Keep a separate per-message real actor/audit identity; do not rewrite prior messages or bypass participant/staff boundaries. This is queued for later, not part of current theme mockups.


### Future optional avatar gallery

Owner explicitly deferred this to subsequent updates: replace initials by choice with either the user’s own photo or a polished modern built-in avatar. Suggested examples are a faceless woman in hijab and a faceless bearded man; create tasteful contemporary illustrations rather than a real identifiable person. Preserve own-photo option and initials fallback; user chooses, do not infer or assign gender/religion from profile data. Plan image previews and selection before implementation. No avatar assets or account/avatar changes are part of current wallpaper/theme work.


### Standing backlog workflow preference

When the owner says «работай», continue the next prioritized, agreed unfinished item from this durable queue rather than requiring them to remember every idea. Retain status/evidence and dependencies. Ideas explicitly deferred remain in the backlog and can be proposed when higher-priority work is done; user-selection/phone-test/approval boundaries still apply, especially preview-only themes, whole-app light theme, private sky and monetary gifts. Do not interpret general «работай» as choosing an unselected theme or authorizing an unapproved public rollout. Current active task: finish the six additional dark theme previews.


### Six additional dark previews complete; waiting for evaluation

All six new generated images displayed once in actual order:1 emerald (23e43e01),2 graphite (bcf167f0),3 bronze (3704673d),4 mountain lake (1d2ecf4a),5 amethyst (7e05517a),6 starry night (ef415aaf). Full paths/prompts/research references are in outputs/salah-expanded-theme-previews-2026-11-19.json. Alongside the initial two dark concepts this makes8 proposed card/chat themes. Initial third Warm Sand stays future whole-app light-theme draft. User has not yet approved/selectively refined the expanded set; do not implement or publish themes. Original522 remains the common version. Current source has no523 candidate. Future queue additions: optional stock/custom avatars, actual microphone interruption resume, personal/official Support sender switch; standing «работай» chooses a prioritized agreed item while respecting existing approval/phone-test boundaries.


### Theme implementation approved

Owner evaluated the six additional dark previews and said «Очень интересные темы, можно добавлять». Implement all8 dark directions, excluding Warm Sand future whole-app draft. Owner further requested a reusable/extensible theme scheme and persistent selected themes on reopening. Preserve actual522 card/message structure, focus, history, drafts/scroll, user data and other sections. Use a shared validated theme catalogue and scoped presentation; do not make future additions require screen rewrites. Work523 candidate started from published522. Publication remains subject to standing phone-first rule for unapproved new feature rollouts; ordinary prior fixes stay public.


### Themes: internal admin–teacher chats and implementation status

Owner explicitly extended the approved eight dark themes to internal administrator/teacher conversations. Candidate523 now uses one reusable catalogue/controller for Support conversations, the owner-only Support profile and internal staff/team/direct chats. Theme preference is personal, per authenticated actor and room, stored on this device; no recipient theme, role or message changes. Own JPEG/PNG/WebP wallpaper is local-only. Current source remains unpublished while tests and owner-phone preview are pending. Warm Sand stays a future whole-app light-theme draft. Do not equate local implementation with a released update.

### Near-term navigation performance audit —19November

Owner reports intermittent hesitation when opening sections, switching controls and navigating between views; requested investigation and fixes soon, after the current theme work. Measure existing transitions first, distinguish initial loading from repeat opens, network/auth waits from UI work, image decoding and unnecessary remounts. Cover Home ↔ Quran/Adhkar/Menu, Settings, Support inbox/chat/profile and administrator/teacher messenger. Preserve live sky/weather continuity, drafts/scroll, player and actor/MFA access; no bypass of authorization to hide delay. Record representative cold/warm timings and physical iPhone observations, implement only evidenced bottlenecks with targeted regressions. No timing measurements or performance improvement claimed yet.


### Candidate523 implementation verification completed locally

Shared eight-theme catalogue, local/custom-photo persistence and picker integrated into private Support cards, Support conversations and internal staff direct/team messenger, including the requested admin/teacher surface under existing access. General application run336/337 found one missing theme stylesheet in owner.html; corrected it and the Pages check plus final affected theme/group/profile/listening/scope checks passed. Full original report and follow-up are retained outside the app in outputs/salah-523-app-qa.json and outputs/salah-523-final-followup.json; do not mislabel the original report as337/337. Every detected application-test failure is resolved in the follow-up.55 changed/added files versus public522; backend/native source and all unrelated protected files stay unchanged. No public/owner-phone deployment or native build is claimed. Design QA remains blocked pending a rendered implementation/physical-phone comparison; public522 remains untouched. One optional historical rights-snapshot check already fails on unchanged522 for an unrelated Dua asset, while the current-build rights inventory passes; that unrelated historical mismatch was not rewritten.

Next action: measured route/control responsiveness audit from the user's latest request, preserving the agreed theme/phone-check workflow and every other queued request.


### Latest release authorization and iPhone system-pause video —19November

Owner explicitly instructed «Обновление отправь в приложение» after being told themes523 are implemented but not published and phone visual review is pending. Publish this exact checked theme candidate through the ordinary installed app; this current explicit instruction supersedes the earlier phone-first hold for this package. Do not claim a physical-phone visual test. Preserve the owner-private living-sky policy and existing515 Support-news acknowledgement/expiry; send no external push.

Owner separately attached ScreenRecording_11-18-2026 01-54-36_1.mp4 and asked to record it in near-term tasks, not to invent a new pause fix in523. Source: attachment74D9B7B0-6AB3-43B8-806F-378503698990; 5.67s,1206x2622. Reviewed frames0,1,2.5,4,5.3s show lock-screen media controls and Control Center; pause/play presentation changes during the clip. Re-check reliable system Pause and actual Quran/nature source state on a physical iPhone, including an active external microphone/media session visible in the recording. Do not infer that this old recording proves a regression in523 or that audible energy alone identifies its media source. Keep this task open until device verification; prior unit fixes do not close a real-device report. Evidence: outputs/salah-523-video-review. Prioritize alongside navigation responsiveness after this release.


### Explicit animated theme-news request

Owner requested an attractive theme animation in news while523 publication was being prepared. New523 edition contains only the new conversation themes: eight real thumbnail/palette scenes travel smoothly forward and backward on the existing gallery motion lifecycle. Old515 acknowledgement records remain; the current edition is now523 by explicit request. Eight-language captions, hidden/closed/reduced-motion pause and no personal messages. Theme-news and existing release/update checks pass locally. No new system Pause fix or navigation-speed claim.


### 523 native archive compatibility correction

First exact-head application QA passed338/338, but Android correctly rejected an archive over its existing100MiB limit. Preserve the limit and original image quality: exclude catalogue full-size theme files from native archives, retain all preview thumbnails and existing Medina/Home photos, fetch only the selected stock original from immutable parent commit c041fd9e9440a07ba240075c7998731a8dfddc5a and cache it unchanged locally. Existing PWA image paths/cache stay intact. Dedicated asset/cancellation/offline/packing and real-controller URL-disposal checks pass; rerun full CI on the corrected exact head before publication.


### 523 publication completed

Published after the owner explicitly requested the update and animated theme news. PR392, exact head d1a9c390b7d46c9486ea9b477c5146ec7afec111;339/339 app checks plus database/DOM and all Android/Play/iOS/foundation/rights/tablet checks passed. Verified2107-file tree f39c642d98b2b37e72172511c671d98069315a88 merged as0d2f49d1451729d2d184e65c767dfad32dc668cf. Actual Pages run44401972508/job135147133966 succeeded on that source. Version523 is published through the ordinary installed application, including the new eight-theme animated news. No physical phone installation/rendering verification is claimed. Native100MiB limit retained through selected-original lazy delivery with local cache; image pixels are unchanged.

Next near-term tasks remain the reattached iPhone system Pause/Control Center report and measured navigation/control delays. Do not mark either fixed by523. The remaining settings/icons, award «Аминь», surah localisation and other ideas remain queued; new living sky remains private.


### 524 prepared: reported Support theme seams (not published)

The owner’s fresh523 iPhone screenshot shows the Stars wallpaper inset below an opaque rectangular header/footer, heavy lavender outgoing bubbles and an oversized continuation button. Scope the correction to Support conversations: mount the existing theme controller on the fixed conversation root so its wallpaper also covers side gutters and safe insets; transparent Support toolbar/footer over a gentle top/bottom scrim; restrained navy/petrol Stars bubbles; compact44px continuation action. Preserve the reviewed status-fade clearance, message scroll position, draft, card→chat→inbox history and all permissions. A partly clipped older message at the latest-message scroll boundary is normal and is not a reason to force history to the top.

The user explicitly declined browser checking («Пока без браузера»). No browser automation, rendered preview, phone installation, visual pass or public deployment is claimed.16 targeted DOM/CSS/controller regressions passed, including actual mounted Support theme-root/cleanup behavior, four viewport/inset cases with default and themed styles, profiles/internal chats, message actions/tail and mandatory live listening total. All source wallpapers remain byte-identical. Minor candidate524 preserves announcement523, its acknowledgement and expiry; no external push. Prepare for owner phone review before a new global rollout; the special523 publication instruction applied to523 only.

Candidate524 package checks also pass: updates, Pages, sharing, reviewed file scope, current rights register, release illustrations and theme news. Exact scope:11 files; all228 raster source images unchanged. Evidence: outputs/salah-524-prepared-evidence.json and outputs/salah-524-theme-polish.patch. No publication.


### Explicit524 publication instruction

After being told the corrected Support candidate was prepared, its targeted checks passed, no browser was opened and physical iPhone appearance was unverified, the owner instructed «Отправь». Publish this scoped524 maintenance package through the ordinary installed application without another approval request. This current instruction supersedes the earlier phone-first hold for this specific package; it does not establish a phone visual pass or authorize new sky/public feature changes. Preserve announcement523/receipt/expiry and send no external push.


### 524 publication completed; sequential work continues

The owner explicitly said «Отправь» and then requested continued sequential work on agreed items. PR393 merged as7746ec9d07fc5539464a469c07d7b462aaacbb12, exact head3a5ba00afbfbd7cb3221abba52a104b396a5ed75, tree7a3429f0f89ff867ff8f19c70b3bf595ec8b4415. All339 app checks plus real database/DOM, Android/Play, exact-source iOS/native foundation and rights/tablet checks passed. The duplicate PR iOS job was still queued at merge; the successful push iOS job tested the same exact source and the simulated merge tree was verified identical. No protection was changed or bypassed. Actual Pages run44409069245/job135172033455 succeeded on the merge source. Native manifest524 is102337132 bytes, SHA25690587b4608f6dcff3cad3c6e6b84872d345bc5bdabe442c91cede074ff0414aa. Announcement523/receipts/expiry retained; no external push or phone visual/install claim. All228 raster images unchanged. Evidence: outputs/salah-524-public-release-complete.json.

System Pause source review: six current regression suites pass; existing command path stops native Quran/nature audio before observers, invalidates stale Play and silences retained chapter sources. No new audio source change or real-device fix was made. The physical iPhone/Control Center report remains open. Navigation review confirms Support/staff render an initial shell before authorization/RPC; no measured device timings or acceleration claim. Continue measured investigation later without bypassing auth or rewriting private caches.

Next candidate525 is separate and unpublished: shared decorative icons/consistent subsection headers in Atmosphere, glass, sounds, Adhkar, dhikr, Jumuah, background and iPhone reminder controls; remove only the requested live-sky explanatory line, retain the owner-only gate and existing controls/storage. Settings language/functional tests pass; actual template evaluated in eight languages with public/owner states. Previously prepared blessing/«Аминь» presentation and eight translations have been reviewed/rebased; seven award/language suites pass. News confirmation stays unchanged. No physical visual approval or525 publication.


### 525 prepared: settings hierarchy and award greeting

Settings: one decorative line-icon system, consistent subsection headers and spacing for atmosphere switches, glass, sounds, Adhkar/dhikr/Jumuah, background and iPhone help. Actual template/public-owner modes checked in all eight languages, unchanged controls/values and no dangling live-sky hint. Existing shell tests retain owner grant refresh/revocation and saved methods/offsets; no live-sky exposure. Award/founder greeting rebased from the earlier partial draft: blessing and «Аминь» with eight translations, no eligibility/history/news-confirmation changes. Language catalogues rebuilt from current source, preserving themes. Targeted award/reminder/settings tests pass after VM fixtures were given the real imported decorative helper. This is not a browser/phone visual pass or publication. Current public version remains524. Next items stay open: list-surah localisation, measured navigation delays, device Pause verification, geolocation/update progress and private sky. Future-only ideas remain deferred.


### Explicit525 publication instruction

After being told525 settings/reward changes were prepared,36 targeted checks passed, the package was not published and iPhone rendering remained unverified, the owner instructed to publish immediately and not wait for them («Опубликую сразу, не надо меня ждать» in context). Publish this scoped525 package through the ordinary installed SALAH channel after complete required checks/builds, without another phone-approval request. This supersedes the phone-first hold for this package, while preserving the declined browser automation preference, private living sky and no external update push. Do not claim a phone visual/install pass.


### Owner publication workflow and morning checklist

The owner reaffirmed: publish agreed checked corrections without waiting for another message and provide a full phone-check list in the morning. Continue to preserve explicit private-living-sky and future-only boundaries. For525 this is an explicit immediate publication instruction, not a claim that physical visual QA occurred. Prepare next agreed changes sequentially, test/review scope before publishing and maintain evidence rather than marking promises complete. A one-time current-thread morning checklist was created through Codex automation salah-2 for09:00Asia/Yekaterinburg on19November2026 (daily rule with count1). Its report must reconcile real published versions and the queue, separate incomplete work and provide concrete expected phone behavior. No external user push was sent.


### Latest owner request: raise the Support header

The owner supplied fresh phone screenshots comparing native messenger headers with the low SALAH conversation header and explicitly requested raising it. The screenshots establish header placement; the6.49-second native messenger recording was subsequently sampled at0.75-second intervals to inspect the scroll edge. They do not show an installed version number. Remove the extra40px second status-bar allowance only from the grouped Support chat viewport. New top padding is max(8px,4px+actual safe-area top): at59px inset it is63px rather than107px. Preserve Dynamic Island/sensor insets,44px controls, fixed keyboard viewport, full wallpaper, bottom actions and card→chat→inbox behavior. The private profile and other section clearances remain unchanged. This current owner request supersedes the earlier instruction to retain the extra chat allowance. Seven Support/theme/scroll regressions pass, including actual stylesheet order, default/themed modes, keyboard-sized viewport and newer62px insets. Physical iPhone fade/appearance remains unverified. Include this correction in the still-unpublished525 release and rerun exact-head checks/builds after the new commit. Add a morning check that the raised name/avatar remain sharp and do not enter the status fade.


### Reference video: soft top scroll edge

The owner explicitly requested the message exit/entry effect near the header and reiterated independent publication plus the morning change list. The6.49s reference recording is a native messenger, distinct from the separate WhatsApp height screenshot. Nine sampled reference frames show messages moving under the upper region while participant controls stay fixed. Keep source frames outside the application and do not copy third-party chat contents into product/news. Add a static16px alpha fade only to scrolled grouped Support history; at scrollTop0 the first message stays opaque. Use an event-driven passive scroll listener with cleanup, standard/WebKit CSS masks, no new animation loop, timer, blur on the header or original wallpaper. Reading position, message nodes and drafts remain unchanged. Actual DOM/cascade/navigation/disposal tests pass after validating the standard mask property (HappyDOM does not expose prefixed computed masks). No rendered implementation/Safari pass is claimed. Morning: confirm the raised header is clear, top fade works in both directions, first-message content is fully visible at the start and no jump occurs while reading old messages.


### Scheduling outcome

The one-time morning report automation salah-2 was created successfully for09:00. An additional attempted recurring overnight coding/publication automation was rejected by automatic approval review as ongoing external side effects beyond current-release approval. It was not created and must not be treated as running, retried through a workaround or used as evidence of future work. Current explicitly authorized525 publication continues in the active turn. The morning report is read/report only.

Morning checklist source prepared outside application source: outputs/salah-morning-phone-checklist-2026-11-19.json. Reconcile its pending525 field with actual release evidence before reporting; do not call open items implemented.

525 exact-head full CI found339/340 passing: check-account-experience still expected the old founder Спасибо label. Updated that actual presentation contract to localized celebrationAmeen and verified blessing, preserving all eligibility/Auth/acknowledgement/replay/device/news assertions. Local account-experience checks pass. Rerun full exact-head QA after the contract-only follow-up; do not merge a failed340 suite.


### Latest owner activity and catalogue requests

After525 began its final CI the owner requested the next priority: on-entry update delivery for old clients; truthful complete current activity fields (section/player/credit/action) and location; remove the top explanations/duplicate heading, make Refresh a real styled button, remove accidental header whitespace in activity cards. Preserve real data and do not backfill invented historical state. Both selected prayer city and consented actual entry city are requested, but when they match show a single city rather than duplicate rows; show the entry city separately only on a real difference, owner-only with active session/MFA. Actual location must depend on the visitor’s granted permission; do not infer it from prayer-city choice. New screenshot/profile request for a following task: research reciter Abdullah Shaaban using the supplied textual handle abdullahshaabn_reciter and other viable new catalogue candidates, with reliable complete audio, source availability and rights. No face identification, unauthorized audio extraction or catalogue addition is claimed.


### 525 publication completed

PR394, final headd33a64f51c07711d46c4b60519df9727ac1e2f6e, treeedf1fddd40e7e7bafd595be3c821cf008c3b3233, merge6433e15985018f99f3796f1eba4a3bfe01753102.340/340 exact-head app checks plus actual database/DOM/founder tests and Android/Play/iOS/checkmarks/rights/tablet checks passed. Actual Pages run44416691318/job135198756010 succeeded on the merge source; native manifest525 is102339820 bytes, SHA256ee4894183a0b6595c621b102cd640c23e524de723531db4b7f36f40d9668f025. Ordinary installed application channel published, no external push or phone install/appearance claim. Settings icons, eight-language reward blessing/Ameen and compact Support header with static scrolled top fade included. Current public version525. Next active priority: activity signal-cap fix, owner activity presentation, on-entry update delivery and consented entry city alongside prayer city (deduplicate equal cities). Reciter research remains a following task. Evidence: outputs/salah-525-public-release-complete.json.


### Activity server hotfix verified

Production read-only diagnosis: four actors had exactly32 retained tab leases; all135 recent listening-now POSTs in the inspected20:00–22:54UTC window were429 (plus3unauthenticated401); global daily guest budget was only322 and per-actor current rate attempts below90. SQL source rejected every new tab at capacity for24h. Local actual Postgres/handler regression reproduced capacity and now recycles exactly one expired45s lease under the existing actor advisory transaction lock.32fresh leases still reject a new one, existing live updates work, invalid sessions cannot evict, other actors/cities/Top totals/RLS remain untouched. listening-now version5 deployed from the exact version4 baseline, changing only app-state.mjs; all five files read back exactly and custom Auth checks/verify_jwt=false preserved. No schema or auth grants changed. Keep this hotfix in candidate526; do not redeploy version4 from an older source snapshot. Source/tests: outputs/salah-526-activity-updates/app. Server readback: outputs/salah-526-listening-now-server-readback.json. Live row verification is tracked separately; no fabricated historical fields.


### Уточнение владельца — одинаковые города не дублировать (526, подготовлено)
- Показывать город для намаза один раз, если фактический город входа совпадает. Раздельное поле «Город входа» только при различии (включая одноимённые города разных известных стран). Регистр, пробелы и ё/е не создают повтор. При отсутствии города для намаза разрешённый фактический город может отображаться отдельно.
- Подготовлено в owner-current-activity.js: строгая проверка DTO без координат; город входа старше24ч не показывать; подпись на8языках. Целевые проверки совпадений/различий/отсутствующих и просроченных данных прошли.
- Полная доставка фактического города с явным согласием пользователя и backend526 ещё не реализована; этот пункт не считать опубликованным или проверенным на iPhone. Серверный lease-hotfix v5 сохранён.


### Последнее решение владельца — фактический город не нужен (526)
- «Хотя фактически город нам не нужен»: отменены сбор/показ фактического города и дополнительное согласие. Только выбранный город для намаза; геолокация и её существующее назначение не меняются. Это решение заменяет предыдущие просьбы о двух полях/устранении повторов.
- Подготовленный entryCity DTO/строка/8 подписей удалены. Схема базы, геолокационные разрешения и фактическое отслеживание не добавлялись. Регрессия проверяет, что переданное постороннее entryCity не попадает в модель или интерфейс.
- Продолжать526: корректная приёмка app-state (32 устаревших tab-lease), компактная «Активность сейчас», заметная кнопка обновления и безопасное обновление клиентов при входе.


### Кандидат526 — готовится к общей проверке
- Отчёт: устранён отказ при32 старых вкладках; server listening-now v5 проверен, новые реальные сигналы524 принимаются. Заголовки карточек/кнопка/пояснения исправлены; маршруты расписания относятся к Главной.
- Вход/возврат: проверка обновления после30с, периодический интервал5мин; pageshow,повторные события и все защиты воспроизведения/форм/сохранения проверены.
- Скриншот05:50 B1A8F684: владелец уточнил «Только шапку». Дополнительный верхний запас до16px при ненулевом safe inset; поле ответа не менять. Проверка на реальном iPhone остаётся.
- Фактический город отменён. Следом: исследование чтеца Abdullah Shaaban по явному текстовому профилю и прочие незавершённые задачи; не считать их готовыми.


### Дополнение526 — поля ввода по видео05:53
- Из обеих7.5с записей извлечены кадры0/3/6с: компактная одна строка,клавиатура под полем,кнопки по краям. В групповом чате обращений подготовлены поле44px,скругление,реальный submit со стрелкой,расширение до144px/четверти видимого окна.
- Эмодзи,черновик,ответ на выбранное,ошибки сети,Enter/перенос строк,3000знаков и сохранение позиции истории проверяются; другие формы/командный мессенджер не менять. Это более позднее уточнение дополняет просьбу «Только шапку». Внешний вид на iPhone ещё не подтверждён.


### Уточнение05:59 — самолётик вместо «Ответить»
- Для526 заменить иконку стрелки на узнаваемый линейный самолётик; компактное поле и круглое44px submit без видимой надписи. Доступное название действия и механизм отправки сохранены.


### Следующая задача: чтецы — предварительное исследование19 ноября
- Сверен действующий каталог: 59 основных чтецов / 62 записей с вариантами. AbdullahShaaban отсутствует; личность берётся только из явно подписанного профиля,не по лицу.
- Первичные страницы MP3Quran подтверждают каталоги Абдуллаха Басфара (https://www.mp3quran.net/eng/bsfr) и Халида аль-Кахтани (https://www.mp3quran.net/eng/qht),которых ещё нет в SALAH. Официальная APIдокументация содержит Ибрахима аль-Ахдара,id1/114сур. Это кандидаты на проверку,а не уже добавленные записи.
- Источник одобренных аудиомастеров/разрешение для AbdullahShaaban ещё не подтверждены: первичные YouTube/Instagram-данные не удалось получить. Никаких сообщений автору,извлечения аудио из соцсетей или правок каталога526 не выполнялось. Детали в salah-reciter-research-2026-11-19.json.


### Опубликовано526 — подтверждено доставкой
- PR395 merged52c35ba1b6c77ee4a7b4723c1aa4cee6f8c7ba56,tree121170c3be65522eb9ca96902fd2e9ec5e19c715,headb8c0b5376d05694a103d102e4512aad690323339.
- Exact-head CI340/340,actual staffDB123/DOM66,awards/founders и все7workflow прошли. Pages44434644906/job135260324900 сообщил Reported success; native manifest526/SHA256 9fe6a3016a1a5c95e55bb965250eeb65714a262140d17cd8c2966e1039fd221a/102340980bytes.
- Вышли приёмка состояний при32старых вкладках,компактная Активность сейчас,реальная кнопка Обновить,расписание как Главная,проверка при возврате,верхний запас шапки и компактное поле с самолётиком. Только выбранный город для намаза. Все232 растровых файла совпадают с525.
- Фото/телефон владельца пока не проверены; в утреннем списке17пунктов. Новость523/квитанции/срок неизменны,живое небо закрыто,внешний push не отправлялся. Источник доказательств salah-526-public-release-complete.json.


### Кандидат527 — новые сообщения после526
- Скрин06:12: Мой аккаунт в размытой зоне. Стрелочный25px стиль попадал на переводимый span текста; ограничить подпись14px и добавить bounded16px safe-inset запас только вSupport.
- Скрин06:14: убрать прямоугольный внутренний focus outline,сохранить мягкий фокус по внешней скруглённой форме и доступность.
- Обе записи06:16/06:18 относятся кCodex. Владелец явно подтвердил: «Хочу чтоб работало в как в кодекс». Фокус раскрывает поле64px,пустой blur сворачивает44px; клавиатура поднимает чат,без двойного нижнего inset и вторичной кнопки под полем. Кешировать измерения неизменного текста/размера,не сбрасывать читающего историю.
- Скрин06:18 карточкиSarvinoz: убрать непрозрачные прямоугольники шапки/identity на выбранном космическом фоне,сохранить скруглённые читаемые статистические панели.
- Отключение верхнего системного размытия только внутрираздела не подтверждено; глобальный status-bar meta не менять и не объявлять эффект отключённым.
- Целевые15проверок прошли; публикация527 и физическийiPhone пока не подтверждены.


### Проверка527: повтор без изменения тестов
- Первый exact-head run44437211355:339/340. Единственный сбойcheck-staff-composer-viewport.mjs — 25с таймаут запускаChromeдо импорта дочернихмодулей/утверждений; sourcefixture и staffCSS/JS не менялись. Все15целевых проверок527 прошли,остальные6workflow успешны.
- Повторяется только упавший workflowjob135268982484 на том же headc9ff611100a9cfe4d5f4d6bade99624a1824df58,без ослабления теста или обхода gate.527не опубликована до полного успешного прогона. Серверный headless fixture — часть штатногоCI; браузер пользователя и его аккаунт не открывались,физическогоSafari-прогона нет.


### Опубликовано527 — подтверждено 2026-11-19T01:42:44.0937665Z
- PR396,headc9ff611100a9cfe4d5f4d6bade99624a1824df58,merge29ba026350bc1687ba06e701f21bdc6d1bc07f37,treeb6096930371df5f5334b58c32cc896990b0dfd88. Все7exact-head workflows прошли; PR-QAattempt2/job135272082661:340/340,actualDB123/DOM66. Независимый push-QA того жеhead тоже340/340. Первый сбой был таймаутом запуска неизменённого serverChrome fixture,тесты не ослаблялись.
- Pages44438803316/job135274243884:Reported success. Manifest527/SHA256 69610d886bf7e1ffe9003e4842fc8a052a27c760c41eb8a1affdb9a6015ba613/102341596bytes. Source2109файлов/13изменений/232неизменённых растровых файла; backend,globalstatusmeta,новости523,private sky и прочие разделы не менялись.
- Вышли Support-only нормальный размер/отступ возвратной ссылки,скруглённыйфокусввода,Codex-подобное раскрытие и клавиатурнаягеометрия,прозрачные шапка/identity тематической карточки с читаемыми скруглёнными статистическимипанелями.
- Верхний системныйblur НЕобъявлятьотключённым. Browserпользователянеоткрывался; renderfixtureтольковсерверномCI. ФизическийSafari/iPhone527пока не подтверждён. Утреннийсписок19пунктов,доказательства salah-527-public-release-complete.json.


### Кандидат528 — чуть выше и космическая статистика
- Владелец подтвердил527 «Все лучше»,затем попросил поднять шапку карточки чуть выше. Для Support privateprofile capдопотступа40→24px:59/62safeinsetдаёт16pxвыше,20/0insetнеизменны.
- Следующая просьба: космическая тема вместо плотных фигур. ТолькоStars: лёгкая22%нейтральнаяподложка/12%тонкаяграница/мягкая тень текста; общая фотография видна сквозь секции безповтора,кадрированияилиblur. Структура/метрики/другиетемы прежние.
- Проверена актуальная карточка со всемCSS:default/Stars/Bronze,320/393/402,landscape/desktop/RTL иsafe20/59/62/0. Ещё6связанныхпроверокprofile/chat/theme/live-listening прошли.528пока не опубликована,реальногоSafari-прогона нет.


### Ближайшая задача: оформление «Город и время намаза»
- Новый скриншот 07:19: привести кнопки и раскрывающиеся строки к уже принятому стилю раздела «Оформление». Заметные согласованные значки и равные отступы для выбора города, режима путника, источника времени, расчёта Асра, дополнительных параметров, Тахаджуда, сохранения и отчётов о сбоях.
- Сохранить выбранный город, источник, мазхаб, значения и расчёт расписания. Это запись следующей задачи; изменение пока не выполнено.


### Candidate529 — названия сур
- Подготовлены полные114 названий для всех8языков,поиск на выбранном языке и сохранение названий при переключении без пересоздания списка. Дополнены связанные заголовки и подписи в том же модуле Корана; данные аятов/переводов,позиция и плеер сохранены.
- Все целевые проверки прошли,общая exact-head проверка и публикация ещё впереди. Новая задача07:19 по кнопкам города записана отдельно и не выполнена.
- Текущая общая версия528 опубликована: PR397,merge ff637426ae6a1f1158553817c53a90c6fd2253b5,Pages44441183330:Reported success. Телефон владельца не проверен.


### Published529 and candidate530
-529 published: PR398,merge ceec8b9a354fd0521309fd13938caf46078f501f,Pages44445497915:Reported success;340/340. Names require the phone language check.
- New07:21:31 video inspected locally. Duplicate same-token SIGNED_IN reproduces the owner sky reset in the real auth/weather fixture.530 preserves only the already valid server grant for that exact session;token rotation,expiry,new login,actor changes and revocation remain tested. Nine related checks pass;publication still pending.
- City/prayer-settings button styling remains queued;no calculation changes.


###531 — приоритетное исправление таймера
- Новая запись07:55:30 и уточнение владельца:время ходит вверх-вниз,когда маленький раздел зикра появляется;после его закрытия таймер стоит ровно. Небо и перескакивание секунд не являются текущей жалобой.
- Подготовлено:индикатор activity вынесен из потока молитвенного блока,убраны только изменения высоты/отступов предков по его hidden-состоянию. Подсчёты,приватность,ошибки/zero-hide,время,фото и530сессия неизменны. Полная проверка и публикация впереди;физическийiPhone ещё не проверен.
-530 опубликована после явного «Давай отправляй»:PR399,merge71a3fd6834c965c0a535c1109b08915ed580fe59,Pages44447134698:Reported success. Это не доказательство установленной версии в07:55видео.
- Оформление города/намаза и общего диагностического блока остаётся в очереди,код этих элементов не менялся.


### Candidate532 — оформление города/намаза
- Подготовлены общие значки/карточки для выбранного города,режима путника,источника времени,Асра,дополнительных параметров иТахаджуда. Общий диагностический блок оформлен так же на всех страницах настроек,о чём владелец уведомлён до изменения.
- Девять целевых и четыре связанные проверки прошли:значения/методы/школа/часовые пояса/offsets/согласие диагностики/черновики/переводы сохранены. Восьмиязыковая разметка проверена существующими fixtures;визуальныйphone-pass отсутствует.
-531 merge2a9ba759ab098b3f43ed6c18d72dda427646812e прошёл340/340 и6requiredPRworkflows;Pages публикация проверяется отдельно. Самтаймер/счётчики/фотографии не меняются в532.
- Дальше:измеренные задержки переходов,личная геолокация/предложение обновить город,честные проценты/оценка загрузки;фактический город посетителей владельцу по-прежнему не собирается.


### Published531/532 and candidate533
-531 published:PR400,merge2a9ba759ab098b3f43ed6c18d72dda427646812e,Pages44449731886:Reported success;340/340.
-532 published:PR401,merge18276782f0b4d525ff58c1f9b40addaea728aca1,Pages44450747459:Reported success;340/340. Physical phone checks remain open.
-533 prepares actual decoded-byte progress for browser shell updates,conditional HTTP cache validation,compact dark manual status and a sample-based approximate ETA. Exact-source/full CI/publication still pending. New progress UI first becomes available for a subsequent download after533 installation;old/native bridges do not expose byte progress. No raster or native binary changed.
- Personal location delay is analysis only:two GPS attempts plus two parallel reverse-city/timezone requests can reach~37.5s before scheduling/permission time. Actual visitor location collection remains cancelled. Next queued work includes measured navigation latency,consented personal city update offer,external voice interruption resume and separate owner-only sky rebase.


### Candidate534 — personal city lookup lifecycle
-533 exact head f84ce6609a0c79d225e9093ba958e6142e20bbc6 passed341/341,DB123/DOM66 and6PRworkflows;merge15382acaadae362b44683ac145baa8101503024c. Pages publication is checked separately.
-534 prepares exact-coordinate2-minute/eight-entry memory reuse after an explicit consented location request and a real12s bound over provider fetch/body decoding. Cancellation/late results/consent/timezone/settlement remain guarded;no GPS timeout reduction,automatic tracking or owner actual-city collection. Shared text search uses the same bounded network helper.
- Automatic travel-city offer,measured screen-navigation latency,external microphone interruption resume and separate owner-only new-sky rebase remain open. No phone benchmark or visual pass is claimed.
