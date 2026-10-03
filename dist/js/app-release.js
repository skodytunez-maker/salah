export const APP_VERSION=144;
export const APP_UPDATED_AT='2026-10-03';
export const APP_CHANGES=["Исправлена запись посещений: статус «В сети» и время последней активности обновляются при открытии приложения.","В кабинете различаются общие посещения с гостями и зарегистрированные пользователи.","Окно «Что нового» открывается с начала списка, чтобы дата и заголовок были видны на телефоне."];
export const APP_UPDATE_DATE=new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(APP_UPDATED_AT)).replace(/ г\.$/,'');
