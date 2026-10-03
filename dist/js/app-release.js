export const APP_VERSION=148;
export const APP_UPDATED_AT='2026-10-04';
export const APP_CHANGES=["На странице «Меню» убрана нижняя панель вкладок: список разделов и подпись больше не перекрываются.","Из настроек убрана нижняя ссылка «Вернуться в меню». Короткий возврат расположен сверху; из меню можно перейти на главную."];
export const APP_UPDATE_DATE=new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(APP_UPDATED_AT)).replace(/ г\.$/,'');
