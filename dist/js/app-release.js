export const APP_VERSION=162;
export const APP_UPDATED_AT='2026-10-04';
export const APP_CHANGES=["Установленное SALAH стало удобнее: добавлены быстрые действия для Корана, азкаров и Киблы там, где их поддерживает устройство.","Обновлено описание приложения, чтобы оно точнее отражало основные функции.","Проверки публикации теперь отдельно контролируют PWA-ярлыки и метаданные."];
export const APP_UPDATE_DATE=new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(APP_UPDATED_AT)).replace(/ г\.$/,'');
