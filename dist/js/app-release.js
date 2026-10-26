export const APP_VERSION=405;
export const APP_UPDATED_AT='2026-10-27';
export const APP_CHANGES=['Повседневные дуа: тематические подборки с иллюстрациями. Находите дуа для дома, еды, мечети и других ситуаций.'];
export const APP_ANNOUNCEMENT={version:404,date:'2026-10-27',changes:APP_CHANGES};
export const APP_NEWS_UNTIL='2026-10-30T00:30:00Z';
export const APP_UPDATE_DATE=new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(APP_UPDATED_AT)).replace(/ г\.$/,'');
