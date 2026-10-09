export const APP_VERSION=256;
export const APP_UPDATED_AT='2026-10-09';
export const APP_CHANGES=["В профилях Люхайдана, Идриса Абкара, Мишари аль-Афаси и Мансура ас-Салими появился отдельный блок «Рукъя».","Добавлены чтец Мансур ас-Салими с портретом и фильтр «Рукъя» в каталоге."];
// Public notes list new user-facing features or sections only. Internal settings,
// maintenance fixes and owner-only changes stay in Git history, not these lists.
// Keep the announcement unchanged for minor builds; advance only for major public features.
export const APP_ANNOUNCEMENT={"version":256,"date":"2026-10-09","changes":["В профилях Люхайдана, Идриса Абкара, Мишари аль-Афаси и Мансура ас-Салими появился отдельный блок «Рукъя».","Добавлены чтец Мансур ас-Салими с портретом и фильтр «Рукъя» в каталоге."]};
export const APP_UPDATE_DATE=new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(APP_UPDATED_AT)).replace(/ г\.$/,'');
