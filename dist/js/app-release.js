export const APP_VERSION=288;
export const APP_UPDATED_AT='2026-10-11';
export const APP_CHANGES=["Топ SALAH: слушатели и их самые прослушиваемые чтецы.","Золотые, серебряные и бронзовые рамки первых мест.","Анонимность и уведомления об обгоне."];
// Public notes list new user-facing features or sections only. Internal settings,
// maintenance fixes and owner-only changes stay in Git history, not these lists.
// Keep the announcement unchanged for minor builds; advance only for major public features.
export const APP_ANNOUNCEMENT={"version":285,"date":"2026-10-11","changes":["Топ SALAH: слушатели и их самые прослушиваемые чтецы.","Золотые, серебряные и бронзовые рамки первых мест.","Анонимность и уведомления об обгоне."]};
export const APP_UPDATE_DATE=new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(APP_UPDATED_AT)).replace(/ г\.$/,'');
