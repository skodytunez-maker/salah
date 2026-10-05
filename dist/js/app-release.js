export const APP_VERSION=169;
export const APP_UPDATED_AT='2026-10-05';
export const APP_CHANGES=["Android-сборка получает актуальный номер версии SALAH.","В настройках Тюмени скрыт неприменимый выбор метода расчёта."];
export const APP_UPDATE_DATE=new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(APP_UPDATED_AT)).replace(/ г\.$/,'');
