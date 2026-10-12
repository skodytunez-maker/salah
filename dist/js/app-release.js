export const APP_VERSION=314;
export const APP_UPDATED_AT='2026-10-13';
export const APP_CHANGES=["Награды лидера недели и месяца с итогами в полночь.","Награды за 7, 30, 100 и 365 дней прослушивания в одной серии.","Три запаса пропуска с восстановлением после семи дней прослушивания."];
// Public notes list new user-facing features or sections only. Internal settings,
// maintenance fixes and owner-only changes stay in Git history, not these lists.
// Keep the announcement unchanged for minor builds; advance only for major public features.
export const APP_ANNOUNCEMENT={"version":314,"date":"2026-10-13","changes":["Награды лидера недели и месяца с итогами в полночь.","Награды за 7, 30, 100 и 365 дней прослушивания в одной серии.","Три запаса пропуска с восстановлением после семи дней прослушивания."]};
export const APP_UPDATE_DATE=new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(APP_UPDATED_AT)).replace(/ г\.$/,'');
