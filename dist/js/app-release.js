export const APP_VERSION=168;
export const APP_UPDATED_AT='2026-10-05';
export const APP_CHANGES=["Обои адаптированы для планшетов и поворота экрана; телефонное оформление сохранено.","Дневной и ночной фон, небо и погода используют одинаковое кадрирование.","Начало Рамадана отмечено как ориентировочная дата ±1 день."];
export const APP_UPDATE_DATE=new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(APP_UPDATED_AT)).replace(/ г\.$/,'');
