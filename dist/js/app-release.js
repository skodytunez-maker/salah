export const APP_VERSION=350;
export const APP_UPDATED_AT='2026-10-17';
export const APP_CHANGES=["Фильтры «Все», «Новые», «Избранные» и «Рукъя» помещаются в одну строку на телефоне."];
export const APP_ANNOUNCEMENT={"version":350,"date":"2026-10-17","changes":["Фильтры «Все», «Новые», «Избранные» и «Рукъя» помещаются в одну строку на телефоне."]};
export const APP_UPDATE_DATE=new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(APP_UPDATED_AT)).replace(/ г\.$/,'');
