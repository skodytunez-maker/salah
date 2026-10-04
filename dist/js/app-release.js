export const APP_VERSION=164;
export const APP_UPDATED_AT='2026-10-04';
export const APP_CHANGES=["Улучшена совместимость напоминаний между веб-версией SALAH и будущими iOS/Android сборками.","В мобильном приложении разрешение на системные уведомления запрашивается только после действия пользователя.","Нативные мосты виджетов и напоминаний добавлены в офлайн-проверки, чтобы обычная PWA-версия продолжала работать без сети."];
export const APP_UPDATE_DATE=new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(APP_UPDATED_AT)).replace(/ г\.$/,'');
