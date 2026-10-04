export const APP_VERSION=155;
export const APP_UPDATED_AT='2026-10-04';
export const APP_CHANGES=["Добавлены тихие звуки дождя и ветра в «Оформление и атмосфера»: плавное включение, регулировка громкости и пауза во время Корана, трансляции и Азана.","Поддержка работает через защищённый сервер: переписка и ответы находятся внутри соответствующего приложения.","Кадр с крепостью Худжанда слегка поднят."];
export const APP_UPDATE_DATE=new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(APP_UPDATED_AT)).replace(/ г\.$/,'');
