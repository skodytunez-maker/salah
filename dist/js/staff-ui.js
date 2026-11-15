// Translate only a controlled UI error channel. Never pass message bodies,
// author names, filenames, draft comments or arbitrary source content here.
import{uiMessage}from './ui.js';
import{t,getLocale,translateUi}from './i18n.js';
const codeKeys=Object.freeze({
 "invalid_subscription": "staffUi.errorInvalidSubscription",
 "device_limit": "staffUi.errorDeviceLimit",
 "sender_unavailable": "staffUi.errorSenderUnavailable",
 "sign_in_required": "staffUi.errorSignIn",
 "invalid_session": "staffUi.errorInvalidSession",
 "staff_only": "staffUi.errorStaffOnly",
 "forbidden": "staffUi.errorForbidden",
 "owner_only": "staffUi.errorOwnerOnly",
 "mfa_required": "staffUi.errorMfa",
 "workspace_unavailable": "staffUi.errorWorkspace",
 "auth_unavailable": "staffUi.errorAuth",
 "revision_conflict": "staffUi.errorRevisionConflict",
 "catalog_conflict": "staffUi.errorCatalogConflict",
 "draft_locked": "staffUi.errorDraftLocked",
 "unsupported_file": "staffUi.errorUnsupportedFile",
 "file_too_large": "staffUi.errorFileLarge",
 "paired_images_required": "staffUi.errorPairedImages",
 "paired_dimensions_required": "staffUi.errorPairedDimensions",
 "image_orientation_required": "staffUi.errorOrientation",
 "incomplete_reciter": "staffUi.errorIncompleteReciter",
 "invalid_audio_source": "staffUi.errorAudioSource",
 "invalid_image": "staffUi.errorInvalidImage",
 "chat_rate_limit": "staffUi.errorChatRate",
 "chat_upload_limit": "staffUi.errorChatUpload",
 "support_rate_limit": "staffUi.errorSupportRate",
 "invalid_parameters": "staffUi.errorParameters"
});
const textKeys=new Map([
 [
  "Телефон не подтвердил подключение уведомлений.",
  "staffUi.errorInvalidSubscription"
 ],
 [
  "Достигнут лимит подключённых устройств.",
  "staffUi.errorDeviceLimit"
 ],
 [
  "Сервис доставки временно недоступен.",
  "staffUi.errorSenderUnavailable"
 ],
 [
  "Войдите в свой аккаунт.",
  "staffUi.errorSignIn"
 ],
 [
  "Войдите в аккаунт снова.",
  "staffUi.errorInvalidSession"
 ],
 [
  "Доступ к команде не назначен.",
  "staffUi.errorStaffOnly"
 ],
 [
  "Доступ закрыт. Обновите кабинет.",
  "staffUi.errorForbidden"
 ],
 [
  "Это действие доступно владельцу.",
  "staffUi.errorOwnerOnly"
 ],
 [
  "Подтвердите защищённый вход.",
  "staffUi.errorMfa"
 ],
 [
  "Кабинет пока недоступен. Попробуйте позже.",
  "staffUi.errorWorkspace"
 ],
 [
  "Не удалось проверить вход.",
  "staffUi.errorAuth"
 ],
 [
  "Черновик уже изменён. Откройте его заново.",
  "staffUi.errorRevisionConflict"
 ],
 [
  "Материал уже обновлён. Создайте новый черновик.",
  "staffUi.errorCatalogConflict"
 ],
 [
  "Черновик уже отправлен. Дождитесь проверки.",
  "staffUi.errorDraftLocked"
 ],
 [
  "Поддерживаются фото, PDF, TXT, ZIP и документы Office.",
  "staffUi.errorUnsupportedFile"
 ],
 [
  "Файл должен быть не больше 10 МБ.",
  "staffUi.errorFileLarge"
 ],
 [
  "Добавьте дневную и ночную версии для обоих размеров.",
  "staffUi.errorPairedImages"
 ],
 [
  "День и ночь должны быть одного размера.",
  "staffUi.errorPairedDimensions"
 ],
 [
  "Для телефона нужен вертикальный фон, для планшета — горизонтальный.",
  "staffUi.errorOrientation"
 ],
 [
  "Добавьте портрет и адрес записи.",
  "staffUi.errorIncompleteReciter"
 ],
 [
  "Проверьте адрес записи из поддерживаемой библиотеки.",
  "staffUi.errorAudioSource"
 ],
 [
  "Не удалось прочитать фото.",
  "staffUi.errorInvalidImage"
 ],
 [
  "Сообщений слишком много. Подождите минуту.",
  "staffUi.errorChatRate"
 ],
 [
  "Лимит файлов за день достигнут.",
  "staffUi.errorChatUpload"
 ],
 [
  "Подождите минуту перед следующим ответом.",
  "staffUi.errorSupportRate"
 ],
 [
  "Проверьте заполненные поля.",
  "staffUi.errorParameters"
 ],
 [
  "Выберите JPG, PNG или WebP до 20 МБ.",
  "staffUi.errorImageType"
 ],
 [
  "Фото слишком большое. Выберите меньший размер.",
  "staffUi.errorImageLarge"
 ],
 [
  "Телефон не ответил. Повторите подключение.",
  "staffUi.pushTimeout"
 ],
 [
  "Обновите SALAH через настройки и повторите подключение.",
  "staffUi.pushUpdateSalah"
 ],
 [
  "На iPhone откройте SALAH с иконки на экране «Домой».",
  "staffUi.pushHomeScreen"
 ],
 [
  "Сервис уведомлений временно недоступен.",
  "staffUi.pushServiceUnavailable"
 ],
 [
  "Не удалось подключить уведомления.",
  "staffUi.pushConnectFailed"
 ],
 [
  "Разрешите уведомления SALAH в настройках телефона.",
  "staffUi.pushPermission"
 ],
 [
  "Обновите Android-приложение для уведомлений команды.",
  "staffUi.pushUpdateAndroid"
 ],
 [
  "На этом устройстве недоступны уведомления Google.",
  "staffUi.pushGoogleUnavailable"
 ],
 [
  "Не удалось подключить уведомления. Повторите попытку.",
  "staffUi.pushConnectRetry"
 ],
 [
  "Войдите в кабинет команды.",
  "staffUi.pushSignIn"
 ],
 [
  "Аккаунт изменился.",
  "staffUi.pushAccountChanged"
 ],
 [
  "Телефон не подтвердил регистрацию.",
  "staffUi.pushRegistration"
 ],
 [
  "Не удалось сохранить подключение.",
  "staffUi.pushSaveFailed"
 ]
]);
const descriptor=value=>value&&typeof value.key==='string'&&value.key.startsWith('staffUi.');
export function staffErrorMessage(value){
 if(descriptor(value))return value;if(descriptor(value?.uiMessage))return value.uiMessage;
 const raw=typeof value==='string'?value:typeof value?.message==='string'?value.message:'';
 const key=(Object.hasOwn(codeKeys,value?.code)?codeKeys[value.code]:null)||textKeys.get(raw);return key?uiMessage(key):raw;
}
// Keep source .message/.code intact: the push core intentionally persists only
// an error string, and retry/access branches continue to inspect source codes.
export function staffUiError(message,code){
 const error=Object.assign(Error(message),code?{code}:{}),label=staffErrorMessage(error);
 if(descriptor(label))error.uiMessage=label;return error;
}
export function staffTimeLabel(value,{format='time',seen=false}={}){
 const date=new Date(value),label=format==='datetime'?date.toLocaleString(getLocale()):date.toLocaleTimeString(getLocale(),{hour:'2-digit',minute:'2-digit'});
 return label+(seen?' · '+t('staffUi.statusRead'):'');
}
export function paintStaffUi(root){
 if(!root)return;translateUi(root);
 for(const node of root.querySelectorAll?.('[data-staff-time]')||[])node.textContent=staffTimeLabel(node.dataset.staffTime,{format:node.dataset.staffTimeFormat,seen:node.dataset.staffSeen==='true'});
}

