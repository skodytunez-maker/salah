export const APP_VERSION=276;
export const APP_UPDATED_AT='2026-10-10';
export const APP_CHANGES=["В аккаунте можно добавить фото профиля, выбрать кадр и показывать аватар рядом с ником."];
// Public notes list new user-facing features or sections only. Internal settings,
// maintenance fixes and owner-only changes stay in Git history, not these lists.
// Keep the announcement unchanged for minor builds; advance only for major public features.
export const APP_ANNOUNCEMENT={"version":276,"date":"2026-10-10","changes":["В аккаунте можно добавить фото профиля, выбрать кадр и показывать аватар рядом с ником."]};
export const APP_UPDATE_DATE=new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(APP_UPDATED_AT)).replace(/ г\.$/,'');
