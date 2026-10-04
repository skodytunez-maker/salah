export const APP_VERSION=157;
export const APP_UPDATED_AT='2026-10-04';
export const APP_CHANGES=["В кабинете владельца у пользователей показан статус уведомлений о намазе и подключения фоновой доставки.","Если обновлённое SALAH ещё не открывали, отображается «Нет данных». Статус доступен только владельцу."];
export const APP_UPDATE_DATE=new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(APP_UPDATED_AT)).replace(/ г\.$/,'');
