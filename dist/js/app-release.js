export const APP_VERSION=260;
export const APP_UPDATED_AT='2026-10-09';
export const APP_CHANGES=["В меню и аудиоплеерах появилась кнопка «На телевизор»: системный выбор устройства для звука и инструкции по повтору экрана."];
// Public notes list new user-facing features or sections only. Internal settings,
// maintenance fixes and owner-only changes stay in Git history, not these lists.
// Keep the announcement unchanged for minor builds; advance only for major public features.
export const APP_ANNOUNCEMENT={"version":260,"date":"2026-10-09","changes":["В меню и аудиоплеерах появилась кнопка «На телевизор»: системный выбор устройства для звука и инструкции по повтору экрана."]};
export const APP_UPDATE_DATE=new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(APP_UPDATED_AT)).replace(/ г\.$/,'');
