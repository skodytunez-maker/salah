export const APP_VERSION=342;
export const APP_UPDATED_AT='2026-10-16';
export const APP_CHANGES=["В календарь Тюмени добавлен ноябрь по присланной таблице, с двумя временами Асра и днями недели ноября 2026.","Счётчик времени в топах стал компактнее. Исправлен повторный учёт старых минут в месячном итоге."];
export const APP_ANNOUNCEMENT={"version":342,"date":"2026-10-16","changes":["В календарь Тюмени добавлен ноябрь по присланной таблице, с двумя временами Асра и днями недели ноября 2026.","Счётчик времени в топах стал компактнее. Исправлен повторный учёт старых минут в месячном итоге."]};
export const APP_UPDATE_DATE=new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(APP_UPDATED_AT)).replace(/ г\.$/,'');
