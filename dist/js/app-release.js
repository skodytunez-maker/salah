export const APP_VERSION=163;
export const APP_UPDATED_AT='2026-10-04';
export const APP_CHANGES=["При ручной смене достопримечательности больше не появляется на секунду стандартный фон мечети.","Новый городской фон подменяет предыдущий только после полной загрузки и декодирования, поэтому переход выглядит чище.","Если новый фон недоступен, SALAH показывает нейтральный фон и статус загрузки вместо неправильной достопримечательности."];
export const APP_UPDATE_DATE=new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(APP_UPDATED_AT)).replace(/ г\.$/,'');
