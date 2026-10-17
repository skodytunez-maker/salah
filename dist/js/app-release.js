export const APP_VERSION=349;
export const APP_UPDATED_AT='2026-10-17';
export const APP_CHANGES=["Новые чтецы — в начале каталога первые три дня; отдельный фильтр показывает добавления за последние 30 дней.","Обновлён портрет Мухаммада аль-Курди."];
export const APP_ANNOUNCEMENT={"version":349,"date":"2026-10-17","changes":["Новые чтецы — в начале каталога первые три дня; отдельный фильтр показывает добавления за последние 30 дней.","Обновлён портрет Мухаммада аль-Курди."]};
export const APP_UPDATE_DATE=new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(APP_UPDATED_AT)).replace(/ г\.$/,'');
