export const APP_VERSION=159;
export const APP_UPDATED_AT='2026-10-04';
export const APP_CHANGES=["Исправлено отображение дождя: анимация погоды работает независимо от плавных переходов.","Осадки стали заметнее; при уменьшении движения показываются без анимации.","Погода обновляется чаще. В её карточке появилась кнопка «Обновить погоду»."];
export const APP_UPDATE_DATE=new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(APP_UPDATED_AT)).replace(/ г\.$/,'');
