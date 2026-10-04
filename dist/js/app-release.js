export const APP_VERSION=161;
export const APP_UPDATED_AT='2026-10-04';
export const APP_CHANGES=["Экран Киблы стал точнее и понятнее: добавлены более мягкие подсказки поворота и пояснение работы света.","Белое свечение теперь плавно усиливается по мере точного наведения на Киблу и корректно работает в современных браузерах.","Улучшены режим уменьшения движения и визуальная обратная связь при точном направлении."];
export const APP_UPDATE_DATE=new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(APP_UPDATED_AT)).replace(/ г\.$/,'');
