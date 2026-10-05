export const APP_VERSION=165;
export const APP_UPDATED_AT='2026-10-05';
export const APP_CHANGES=["В Тюмени можно отдельно выбрать календарь или расписание сайта «Аль-Хакк».","Выбранный источник сохраняется после обновлений и используется в расписании, виджете и напоминаниях.","В настройках указан период доступных данных; расписание не подменяется другим источником."];
export const APP_UPDATE_DATE=new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(APP_UPDATED_AT)).replace(/ г\.$/,'');
