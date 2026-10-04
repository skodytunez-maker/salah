export const APP_VERSION=158;
export const APP_UPDATED_AT='2026-10-04';
export const APP_CHANGES=["Улучшено отображение информации об обновлениях.","Настройки и личные данные сохраняются при установке новой версии."];
export const APP_UPDATE_DATE=new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(APP_UPDATED_AT)).replace(/ г\.$/,'');
