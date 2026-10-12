export const APP_VERSION=313;
export const APP_UPDATED_AT='2026-10-13';
export const APP_CHANGES=["Счётчик дней прослушивания Корана в профиле.","Награды лидера недели и месяца с историей побед.","Карточки победителей для сторис с сохранением анонимности."];
// Public notes list new user-facing features or sections only. Internal settings,
// maintenance fixes and owner-only changes stay in Git history, not these lists.
// Keep the announcement unchanged for minor builds; advance only for major public features.
export const APP_ANNOUNCEMENT={"version":312,"date":"2026-10-13","changes":["Счётчик дней прослушивания Корана в профиле.","Награды лидера недели и месяца с историей побед.","Карточки победителей для сторис с сохранением анонимности."]};
export const APP_UPDATE_DATE=new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(APP_UPDATED_AT)).replace(/ г\.$/,'');
