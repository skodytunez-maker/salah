export const APP_VERSION=415;
export const APP_UPDATED_AT='2026-10-27';
export const APP_CHANGES=["Топ SALAH: значок наушников рядом с фото показывает, кто слушает Коран. Только значок — без подписи и подсказки."];
export const APP_ANNOUNCEMENT={version:410,date:'2026-10-27',changes:APP_CHANGES};
export const APP_NEWS_UNTIL='2026-10-30T00:30:00Z';
export const APP_UPDATE_DATE=new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(APP_UPDATED_AT)).replace(/ г\.$/,'');
