export const APP_VERSION=261;
export const APP_UPDATED_AT='2026-10-09';
export const APP_CHANGES=["Рукъя получила постоянный плеер с перемоткой. Добавлено управление Кораном и рукъей с экрана блокировки на поддерживаемых устройствах."];
// Public notes list new user-facing features or sections only. Internal settings,
// maintenance fixes and owner-only changes stay in Git history, not these lists.
// Keep the announcement unchanged for minor builds; advance only for major public features.
export const APP_ANNOUNCEMENT={"version":261,"date":"2026-10-09","changes":["Рукъя получила постоянный плеер с перемоткой. Добавлено управление Кораном и рукъей с экрана блокировки на поддерживаемых устройствах."]};
export const APP_UPDATE_DATE=new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(APP_UPDATED_AT)).replace(/ г\.$/,'');
