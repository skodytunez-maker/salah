export const APP_VERSION=347;
export const APP_UPDATED_AT='2026-10-17';
export const APP_CHANGES=["Новые чтецы: Ислам Субхи, Абдуррахман аль-Ауси, Саад аль-Гамиди, Ахмад аль-Аджми и Фарис Аббад."];
export const APP_ANNOUNCEMENT={"version":347,"date":"2026-10-17","changes":["Новые чтецы: Ислам Субхи, Абдуррахман аль-Ауси, Саад аль-Гамиди, Ахмад аль-Аджми и Фарис Аббад."]};
export const APP_UPDATE_DATE=new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(APP_UPDATED_AT)).replace(/ г\.$/,'');
