export const APP_VERSION=337;
export const APP_UPDATED_AT='2026-10-15';
export const APP_CHANGES=["В разделе «О приложении» добавлены Instagram SALAH и профиль основателя."];
export const APP_ANNOUNCEMENT={"version":335,"date":"2026-10-14","changes":["Раздел «Моя поддержка» в аккаунте: просмотр состояния и самостоятельное отключение с отвязкой способа оплаты. Подключение платежей ещё готовится."]};
export const APP_UPDATE_DATE=new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(APP_UPDATED_AT)).replace(/ г\.$/,'');
