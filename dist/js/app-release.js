export const APP_VERSION=280;
export const APP_UPDATED_AT='2026-10-10';
export const APP_CHANGES=["В топе чтецов появился подиум, время прослушивания и лидеры по периодам.","Можно выбрать показ среди слушателей или анонимность со скрытым ником и фото."];
// Public notes list new user-facing features or sections only. Internal settings,
// maintenance fixes and owner-only changes stay in Git history, not these lists.
// Keep the announcement unchanged for minor builds; advance only for major public features.
export const APP_ANNOUNCEMENT={"version":279,"date":"2026-10-10","changes":["В топе чтецов появился подиум, время прослушивания и лидеры по периодам.","Можно выбрать показ среди слушателей или анонимность со скрытым ником и фото."]};
export const APP_UPDATE_DATE=new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(APP_UPDATED_AT)).replace(/ г\.$/,'');
