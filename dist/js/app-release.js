export const APP_VERSION=238;
export const APP_UPDATED_AT='2026-10-08';
export const APP_CHANGES=["В обращениях можно прикрепить до 5 фото и сохранить полученные снимки.","Появились уведомления о новых сообщениях поддержки."];
// Public notes list new user-facing features or sections only. Internal settings,
// maintenance fixes and owner-only changes stay in Git history, not these lists.
// Keep the announcement unchanged for minor builds; advance only for major public features.
export const APP_ANNOUNCEMENT={"version":236,"date":"2026-10-08","changes":["В обращениях можно прикрепить до 5 фото и сохранить полученные снимки.","Появились уведомления о новых сообщениях поддержки."]};
export const APP_UPDATE_DATE=new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(APP_UPDATED_AT)).replace(/ г\.$/,'');
