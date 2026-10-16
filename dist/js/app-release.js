export const APP_VERSION=345;
export const APP_UPDATED_AT='2026-10-16';
export const APP_CHANGES=["Подиум выровнен во всех периодах: общее основание и постоянная высота ступеней. Время на трёх карточках показано одной строкой."];
export const APP_ANNOUNCEMENT={"version":345,"date":"2026-10-16","changes":["Подиум выровнен во всех периодах: общее основание и постоянная высота ступеней. Время на трёх карточках показано одной строкой."]};
export const APP_UPDATE_DATE=new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(APP_UPDATED_AT)).replace(/ г\.$/,'');
