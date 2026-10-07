export const APP_VERSION=225;
export const APP_UPDATED_AT='2026-10-07';
export const APP_CHANGES=["Добавлен вход по QR с подтверждением на телефоне."];
// Public notes list new user-facing features or sections only. Internal settings,
// maintenance fixes and owner-only changes stay in Git history, not these lists.
// Keep the announcement unchanged for minor builds; advance only for major public features.
export const APP_ANNOUNCEMENT={"version":225,"date":"2026-10-07","changes":["Добавлен вход по QR с подтверждением на телефоне."]};
export const APP_UPDATE_DATE=new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(APP_UPDATED_AT)).replace(/ г\.$/,'');
