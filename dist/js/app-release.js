export const APP_VERSION=142;
export const APP_UPDATED_AT='2026-10-03';
export const APP_CHANGES=["Новый режим «Достопримечательность»: фон подбирается по городу. Первый город — Тюмень.","День и ночь у Моста влюблённых, движение солнца и луны и живая погода.","Кнопка «Слушать в фоне» в трансляции Мекки и Медины."];
export const APP_UPDATE_DATE=new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(APP_UPDATED_AT)).replace(/ г\.$/,'');
