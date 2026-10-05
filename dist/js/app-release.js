export const APP_VERSION=172;
export const APP_UPDATED_AT='2026-10-05';
export const APP_CHANGES=["Небольшие исправления стабильности и поведения разрешений."];
// Keep this announcement unchanged for minor builds. Advance it only for major public features.
export const APP_ANNOUNCEMENT={version:168,date:'2026-10-05',changes:["Обои адаптированы для планшетов в вертикальном и горизонтальном положении.","В календаре показана приблизительная дата начала Рамадана."]};
export const APP_UPDATE_DATE=new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(APP_UPDATED_AT)).replace(/ г\.$/,'');
