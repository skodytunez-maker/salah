export const APP_VERSION=182;
export const APP_UPDATED_AT='2026-10-06';
export const APP_CHANGES=["Улучшена стабильность интерфейса."];
// Keep this announcement unchanged for minor builds. Advance it only for major public features.
export const APP_ANNOUNCEMENT={"version":173,"date":"2026-10-05","changes":["Добавлено добровольное напоминание о зикре после паузы в 2 или 3 дня.","Короткие тексты аята и хадиса чередуются. Напоминание можно отключить в настройках."]};
export const APP_UPDATE_DATE=new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(APP_UPDATED_AT)).replace(/ г\.$/,'');
