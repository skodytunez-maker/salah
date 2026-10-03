export const APP_VERSION=140;
export const APP_UPDATED_AT='2026-10-03';
export const APP_CHANGES=['Уведомление об обновлении с датой и списком изменений.','Проверка новой версии во время работы и после возвращения в приложение.','Подсветка текущего аята в записях имамов. Кнопка трансляций Мекки и Медины.'];
export const APP_UPDATE_DATE=new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(APP_UPDATED_AT)).replace(/ г\.$/,'');
