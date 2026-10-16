export const APP_VERSION=343;
export const APP_UPDATED_AT='2026-10-16';
export const APP_CHANGES=["Исправлено выравнивание подиума: первое место остаётся выше независимо от длины имени и времени.","Улучшено определение города: сначала используется доступное местоположение, затем уточнение при необходимости. Исправлены разрешения в новой Android-сборке."];
export const APP_ANNOUNCEMENT={"version":343,"date":"2026-10-16","changes":["Исправлено выравнивание подиума: первое место остаётся выше независимо от длины имени и времени.","Улучшено определение города: сначала используется доступное местоположение, затем уточнение при необходимости. Исправлены разрешения в новой Android-сборке."]};
export const APP_UPDATE_DATE=new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(APP_UPDATED_AT)).replace(/ г\.$/,'');
