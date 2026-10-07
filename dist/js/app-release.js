export const APP_VERSION=222;
export const APP_UPDATED_AT='2026-10-07';
export const APP_CHANGES=["Коран можно скачать для прослушивания без интернета.","Поиск дуа по ситуации и быстрый доступ к избранным.","Добавлены дуа для дороги, тревоги и других случаев.","Новые обои: Стамбул, Каир и Куала-Лумпур."];
// Public notes list new user-facing features or sections only. Internal settings,
// maintenance fixes and owner-only changes stay in Git history, not these lists.
// Keep the announcement unchanged for minor builds; advance only for major public features.
export const APP_ANNOUNCEMENT={"version":222,"date":"2026-10-07","changes":["Коран можно скачать для прослушивания без интернета.","Поиск дуа по ситуации и быстрый доступ к избранным.","Добавлены дуа для дороги, тревоги и других случаев.","Новые обои: Стамбул, Каир и Куала-Лумпур."]};
export const APP_UPDATE_DATE=new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(APP_UPDATED_AT)).replace(/ г\.$/,'');
