export const APP_VERSION=151;
export const APP_UPDATED_AT='2026-10-04';
export const APP_CHANGES=["В «Знаниях» появился урок Умры: 10 этапов с иллюстрациями, схемами тавафа и са‘й.","Добавлены история Умры, памятка паломника и сохранение места в уроке.","Можно посмотреть опубликованные записи имамов Мекки и Медины по месяцам и дням."];
export const APP_UPDATE_DATE=new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(APP_UPDATED_AT)).replace(/ г\.$/,'');
