export const APP_VERSION=166;
export const APP_UPDATED_AT='2026-10-05';
export const APP_CHANGES=["В настройках Тюмени убраны пояснения под выбором источника времени намаза."];
export const APP_UPDATE_DATE=new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(APP_UPDATED_AT)).replace(/ г\.$/,'');
