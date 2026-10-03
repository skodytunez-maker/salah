export const APP_VERSION=150;
export const APP_UPDATED_AT='2026-10-04';
export const APP_CHANGES=["В транскрипции азкаров, повседневных дуа и Корана «ляа» заменено на «ля»."];
export const APP_UPDATE_DATE=new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(APP_UPDATED_AT)).replace(/ г\.$/,'');
