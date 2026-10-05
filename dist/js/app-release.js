export const APP_VERSION=170;
export const APP_UPDATED_AT='2026-10-05';
export const APP_CHANGES=["Добавлено расписание Тюмени с сайта «Аль-Хакк» на декабрь 2026 года."];
export const APP_UPDATE_DATE=new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(APP_UPDATED_AT)).replace(/ г\.$/,'');
