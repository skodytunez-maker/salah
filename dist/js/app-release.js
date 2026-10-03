export const APP_VERSION=147;
export const APP_UPDATED_AT='2026-10-03';
export const APP_CHANGES=["На странице настроек убрана нижняя панель вкладок: она больше не перекрывает разделы и кнопку сохранения.","Добавлены удобные ссылки для возврата в меню сверху и под кнопкой «Сохранить настройки»."];
export const APP_UPDATE_DATE=new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(APP_UPDATED_AT)).replace(/ г\.$/,'');
