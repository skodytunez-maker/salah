export const APP_VERSION=317;
export const APP_UPDATED_AT='2026-10-13';
export const APP_CHANGES=["В профиле — только полученные награды, с горизонтальным пролистыванием."];
// Public notes list new user-facing features or sections only. Internal settings,
// maintenance fixes and owner-only changes stay in Git history, not these lists.
// Keep the announcement unchanged for minor builds; advance only for major public features.
export const APP_ANNOUNCEMENT={"version":316,"date":"2026-10-13","changes":["Медальоны лидера недели и месяца в общей серии наград.","Первопроходец SALAH — награда первым 100 пользователям.","Плавная анимация нового дня прослушивания в серии."]};
export const APP_UPDATE_DATE=new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(APP_UPDATED_AT)).replace(/ г\.$/,'');
