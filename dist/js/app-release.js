export const APP_VERSION=247;
export const APP_UPDATED_AT='2026-10-09';
export const APP_CHANGES=["В плеере Корана появилась кнопка «Передать»: отправьте ссылку или покажите QR-код, чтобы друг продолжил слушать с сохранённого места.","Получатель видит чтеца, суру и место прослушивания и запускает запись кнопкой «Продолжить слушать»."];
// Public notes list new user-facing features or sections only. Internal settings,
// maintenance fixes and owner-only changes stay in Git history, not these lists.
// Keep the announcement unchanged for minor builds; advance only for major public features.
export const APP_ANNOUNCEMENT={"version":247,"date":"2026-10-09","changes":["В плеере Корана появилась кнопка «Передать»: отправьте ссылку или покажите QR-код, чтобы друг продолжил слушать с сохранённого места.","Получатель видит чтеца, суру и место прослушивания и запускает запись кнопкой «Продолжить слушать»."]};
export const APP_UPDATE_DATE=new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(APP_UPDATED_AT)).replace(/ г\.$/,'');
