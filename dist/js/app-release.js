export const APP_VERSION=167;
export const APP_UPDATED_AT='2026-10-05';
export const APP_CHANGES=["На главной убрана подпись источника под расписанием намазов."];
export const APP_UPDATE_DATE=new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(APP_UPDATED_AT)).replace(/ г\.$/,'');
