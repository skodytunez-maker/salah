export const APP_VERSION=338;
export const APP_UPDATED_AT='2026-10-16';
export const APP_CHANGES=["В версии Google Play добавлена защита детей: дата рождения не сохраняется, личные и облачные функции доступны только взрослым."];
export const APP_ANNOUNCEMENT={"version":338,"date":"2026-10-16","changes":["В версии Google Play добавлена защита детей: дата рождения не сохраняется, личные и облачные функции доступны только взрослым."]};
export const APP_UPDATE_DATE=new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(APP_UPDATED_AT)).replace(/ г\.$/,'');
