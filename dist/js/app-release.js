export const APP_VERSION=242;
export const APP_UPDATED_AT='2026-10-09';
export const APP_CHANGES=["В разделе «Коран» появились карточки чтецов, избранные и удобный выбор сур для прослушивания.","Добавлены девять чтецов, включая Ахмеда Касеба, Мухаммада аль-Курди и Сиратулло Раупова."];
// Public notes list new user-facing features or sections only. Internal settings,
// maintenance fixes and owner-only changes stay in Git history, not these lists.
// Keep the announcement unchanged for minor builds; advance only for major public features.
export const APP_ANNOUNCEMENT={"version":242,"date":"2026-10-09","changes":["В разделе «Коран» появились карточки чтецов, избранные и удобный выбор сур для прослушивания.","Добавлены девять чтецов, включая Ахмеда Касеба, Мухаммада аль-Курди и Сиратулло Раупова."]};
export const APP_UPDATE_DATE=new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(APP_UPDATED_AT)).replace(/ г\.$/,'');
