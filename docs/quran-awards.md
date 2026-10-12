# Quran awards — release 314

Profile keeps two compact calendar leader previews, plus one plain daily counter and an earned-count collection link. Collection has six fixed types: weekly/monthly leaders; week/month/100 days/year of listening in one series. Repeated calendar wins stay grouped with accurate counts and history; each constancy kind can be earned only once per account. No repeated badges for opening the app.

Calendar finalization uses the existing competition_board: a listener is represented by the single reciter with the highest time, never the sum of all reciters. Ties receive equal first-place awards. Moscow calendar closes at 00:00 Monday/first of month, no grace. First eligible week starts 2026-10-12 and closes 2026-10-19; first eligible month starts 2026-10-01 and closes 2026-11-01. A minute-boundary cron includes these midnight boundaries. Existing saved seconds are used; no earlier winners fabricated; late uploads cannot rewrite frozen results.

A played day needs at least 60 seconds of Quran audio across any reciters/devices, based on existing saved local days and account time zone. Merely opening the app never counts. The protected series counts only actual played days. Three reserve skips preserve it without adding listening days. Every seven actual played days within that series restore reserves to three (not cumulative above three). Once empty, another completed missed day resets the series; best count and all earned awards remain. Today is not treated as missed before midnight. New series starts with three reserves. The calendar shows recent played/protected days; neither discarded incomplete day nor a protected miss adds to milestones.

7,30,100,365 actual played days within a protected series award one milestone each, available to every confirmed listener without needing a leaderboard win. Milestone history records the calendar start/end of that protected series. Existing verified listening history can qualify; it is not invented.

Private schema, RLS enabled, anon/authenticated grants revoked. Verified confirmed account with a current live session reads only its collection through the existing custom-auth Edge endpoint. Only privileged cron finalizes calendar awards; service_role cannot select future periods. Public completed winners reflect current participation and visibility; no auth user IDs or private counter history published. Nickname/photo only under chosen profile mode, otherwise initials. Account deletion cascades awards.

Leader and constancy cards export 1080x1920 PNG with real favorite-reciter seconds or real milestone day count, SALAH branding and Saadi Kobilov inside story-safe margins. Native share uses prepared files; unsupported devices save images. No social messages/posts sent automatically. Current identity/privacy refresh before opening export and local privacy/account change closes stale export.

CI runs application contracts, actual isolated PostgreSQL rules, isolated DOM and export workflows. Physical phone receipt is not needed for this feature. No production listening minutes or ranking places are changed for testing.


## Release315 — selected medallion family and200 days
Five individually generated transparent1254px PNG medallions replace the unrelated consistency icons: bronze7, silver30, gold100, faceted pale gold200, platinum365 with a thin engraved geometric rim. They retain embossed milestone numerals. Collection/details/history/share cards consume these assets directly; missing rewards remain recognizably colored and clearly labelled unearned. Calendar awards remain separate. Seven collection types total, repeated wins grouped;200 is one-time and observes the same protected actual-played-day series as other milestones. Existing history is eligible on the next normal authenticated refresh, never manufactured. The200 SQL migration preserves midnight calendar rules, three skip reserves/refill and all previous awards.


## Release316 — leaders, first100 and daily-series animation
Weekly/monthly leader medals are individually generated silver/gold members of the same family with subtle laurel branches and НЕДЕЛЯ/МЕСЯЦ inscriptions. The collection/card/profile/top markers all consume these raster assets. Founder medal uses pale metal, gold SALAH mark, geometric rim and НАЧАЛО.

First100 founding seats: existing confirmed non-anonymous accounts with real SALAH presence or competition enrollment are seeded in auth registration order. Future eligible users claim an available seat on their normal verified own-account refresh, using a shared transaction lock. A fixed ordinal1..100 cap and one-time award index prevent duplicates. Deleting an account clears its medal and identity, retains an anonymous occupied seat, and does not reopen the first100 cap. No Sahaba-only/unconfirmed/anonymous account is seeded. Private RLS schema and denied public grants are retained.

Series overlay listens to actual personal playback progress and only presents a matching server-confirmed newly completed day. No overlay on initial login, ordinary polls, remote history restore or inactive playback. It is once per account/day/device, waits while a dialog or background state blocks presentation, expires old pending events and cancels on account switch. Dimming and a typographic old/new digit transition last about2.6seconds. Bronze starts at7, silver30, gold100, palegold200, platinum365; before7 uses warmgold. Reduced motion uses a static short announcement. Preview in the existing counter help is clearly labelled and does not alter counters, storage celebration markers, listening time or awards. Overlay does not steal focus or intercept player controls.


## Release317 — earned-only profile carousel
The account’s main reward strip now shows only kinds actually earned, with one grouped tile per kind and repeat calendar wins kept as counts/history. A single earned founder medal is centered; multiple received types form a native horizontal touch scroll/snap carousel. No unearned leader placeholder appears as if obtained. All unearned types remain accessible through the separate missing collection tab. No listening data or awards are changed by this presentation update.

Release317: calendar leaders have distinct silver/week and gold/month podium artwork. Consistency milestones and founder artwork retain the selected medallion family. The account reward strip contains only actually earned kinds and supports horizontal native swiping.
