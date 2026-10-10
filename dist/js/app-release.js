export const APP_VERSION=273;
export const APP_UPDATED_AT='2026-10-10';
export const APP_CHANGES=["В разделе «Чтецы» появился личный топ и счётчик времени прослушивания.","Общий топ SALAH формируется по добровольным прослушиваниям за 30 дней."];
// Public notes list new user-facing features or sections only. Internal settings,
// maintenance fixes and owner-only changes stay in Git history, not these lists.
// Keep the announcement unchanged for minor builds; advance only for major public features.
export const APP_ANNOUNCEMENT={"version":273,"date":"2026-10-10","changes":["В разделе «Чтецы» появился личный топ и счётчик времени прослушивания.","Общий топ SALAH формируется по добровольным прослушиваниям за 30 дней."]};
export const APP_UPDATE_DATE=new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(APP_UPDATED_AT)).replace(/ г\.$/,'');
