export const APP_VERSION=284;
export const APP_UPDATED_AT='2026-10-10';
export const APP_CHANGES=["Коран запоминает последнее место прослушивания и выбранного чтеца.","В плеере показывается общее время суры.","Одинаковые буквы слушателей различаются цветными рамками."];
// Public notes list new user-facing features or sections only. Internal settings,
// maintenance fixes and owner-only changes stay in Git history, not these lists.
// Keep the announcement unchanged for minor builds; advance only for major public features.
export const APP_ANNOUNCEMENT={"version":282,"date":"2026-10-10","changes":["Коран запоминает последнее место прослушивания и выбранного чтеца.","В плеере показывается общее время суры.","Одинаковые буквы слушателей различаются цветными рамками."]};
export const APP_UPDATE_DATE=new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(APP_UPDATED_AT)).replace(/ г\.$/,'');
