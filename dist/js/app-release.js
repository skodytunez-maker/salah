export const APP_VERSION=278;
export const APP_UPDATED_AT='2026-10-10';
export const APP_CHANGES=["В «Моём топе» появился счётчик за день, неделю, месяц и всё время.","Общий топ чтецов показывает записи после первой учтённой минуты."];
// Public notes list new user-facing features or sections only. Internal settings,
// maintenance fixes and owner-only changes stay in Git history, not these lists.
// Keep the announcement unchanged for minor builds; advance only for major public features.
export const APP_ANNOUNCEMENT={"version":278,"date":"2026-10-10","changes":["В «Моём топе» появился счётчик за день, неделю, месяц и всё время.","Общий топ чтецов показывает записи после первой учтённой минуты."]};
export const APP_UPDATE_DATE=new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(APP_UPDATED_AT)).replace(/ г\.$/,'');
