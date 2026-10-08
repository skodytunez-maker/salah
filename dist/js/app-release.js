export const APP_VERSION=234;
export const APP_UPDATED_AT='2026-10-08';
export const APP_CHANGES=["Главный экран стал удобнее при горизонтальном положении телефона.","Обои адаптированы для вертикального и горизонтального экрана планшета."];
// Public notes list new user-facing features or sections only. Internal settings,
// maintenance fixes and owner-only changes stay in Git history, not these lists.
// Keep the announcement unchanged for minor builds; advance only for major public features.
export const APP_ANNOUNCEMENT={"version":234,"date":"2026-10-08","changes":["Главный экран стал удобнее при горизонтальном положении телефона.","Обои адаптированы для вертикального и горизонтального экрана планшета."]};
export const APP_UPDATE_DATE=new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(APP_UPDATED_AT)).replace(/ г\.$/,'');
