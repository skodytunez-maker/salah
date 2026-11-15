// Delivery text only. Language never participates in reminder IDs or instants.
// Reviewed Quran/hadith excerpts stay in their source edition; UI labels are not
// used to manufacture a translation of religious content.
export const NOTIFICATION_LANGUAGES=Object.freeze(['ru','en','az','tg','uz','kk','de','ar']);
const NOTIFICATION_COPY=Object.freeze({
 ru:{prayers:{Fajr:'Фаджр',Dhuhr:'Зухр',Asr:'Аср',Maghrib:'Магриб',Isha:'Иша'},genitive:{Fajr:'Фаджра',Dhuhr:'Зухра',Asr:'Асра',Maghrib:'Магриба',Isha:'Иша'},before:'До {prayer} осталось {minutes} минут',at:'Наступило время {prayer}',morning:'Время утренних азкаров',evening:'Время вечерних азкаров',tahajjud:'Тахаджуд: началась последняя треть ночи',jumuah:'Сегодня Джума',test:'Фоновые уведомления SALAH подключены.',staff:'Новое сообщение команды',support:'Новый ответ в обращении',classroom:'Сегодня в {time} занятие: {title}'},
 en:{prayers:{Fajr:'Fajr',Dhuhr:'Dhuhr',Asr:'Asr',Maghrib:'Maghrib',Isha:'Isha'},before:'{prayer} begins in {minutes} minutes',at:'It is time for {prayer}',morning:'Time for morning adhkar',evening:'Time for evening adhkar',tahajjud:'Tahajjud: the last third of the night has begun',jumuah:'Today is Jumuah',test:'Test: SALAH background notifications are connected.',staff:'New team message',support:'New reply to your support request',classroom:'Your lesson today at {time}: {title}'},
 az:{prayers:{Fajr:'Sübh',Dhuhr:'Zöhr',Asr:'Əsr',Maghrib:'Məğrib',Isha:'İşa'},before:'{prayer} namazına {minutes} dəqiqə qalıb',at:'{prayer} namazının vaxtıdır',morning:'Səhər zikrlərinin vaxtıdır',evening:'Axşam zikrlərinin vaxtıdır',tahajjud:'Təhəccüd: gecənin son üçdə biri başlayıb',jumuah:'Bu gün cümədir',test:'Yoxlama: SALAH fon bildirişləri qoşulub.',staff:'Komandadan yeni mesaj',support:'Müraciətinizə yeni cavab',classroom:'Bu gün saat {time} dərs: {title}'},
 tg:{prayers:{Fajr:'Бомдод',Dhuhr:'Пешин',Asr:'Аср',Maghrib:'Шом',Isha:'Хуфтан'},before:'То намози {prayer} {minutes} дақиқа мондааст',at:'Вақти намози {prayer} расид',morning:'Вақти азкори субҳ',evening:'Вақти азкори шом',tahajjud:'Таҳажҷуд: сеяки охири шаб оғоз шуд',jumuah:'Имрӯз ҷумъа аст',test:'Санҷиш: огоҳиномаҳои заминавии SALAH пайваст шудаанд.',staff:'Паёми нави даста',support:'Ҷавоби нав ба муроҷиати шумо',classroom:'Дарси имрӯза соати {time}: {title}'},
 uz:{prayers:{Fajr:'Bomdod',Dhuhr:'Peshin',Asr:'Asr',Maghrib:'Shom',Isha:'Xufton'},before:'{prayer} namoziga {minutes} daqiqa qoldi',at:'{prayer} namozi vaqti kirdi',morning:'Tonggi zikrlar vaqti',evening:'Kechki zikrlar vaqti',tahajjud:'Tahajjud: tunning oxirgi uchdan bir qismi boshlandi',jumuah:'Bugun juma',test:'Sinov: SALAH fon bildirishnomalari ulangan.',staff:'Jamoadan yangi xabar',support:'Murojaatingizga yangi javob',classroom:'Bugun soat {time} dagi dars: {title}'},
 kk:{prayers:{Fajr:'Таң',Dhuhr:'Бесін',Asr:'Екінті',Maghrib:'Ақшам',Isha:'Құптан'},before:'{prayer} намазына {minutes} минут қалды',at:'{prayer} намазының уақыты кірді',morning:'Таңғы зікірлердің уақыты',evening:'Кешкі зікірлердің уақыты',tahajjud:'Тәһәжжүд: түннің соңғы үштен бірі басталды',jumuah:'Бүгін жұма',test:'Тексеру: SALAH фондық хабарландырулары қосылды.',staff:'Топтан жаңа хабарлама',support:'Өтінішіңізге жаңа жауап',classroom:'Бүгін сағат {time} сабақ: {title}'},
 de:{prayers:{Fajr:'Fadschr',Dhuhr:'Dhuhr',Asr:'Asr',Maghrib:'Maghrib',Isha:'Ischa'},before:'{prayer} beginnt in {minutes} Minuten',at:'Es ist Zeit für {prayer}',morning:'Zeit für die morgendlichen Adhkar',evening:'Zeit für die abendlichen Adhkar',tahajjud:'Tahadschud: Das letzte Drittel der Nacht hat begonnen',jumuah:'Heute ist Dschumua',test:'Test: SALAH-Hintergrundbenachrichtigungen sind verbunden.',staff:'Neue Teamnachricht',support:'Neue Antwort auf Ihre Supportanfrage',classroom:'Ihr Unterricht heute um {time}: {title}'},
 ar:{prayers:{Fajr:'الفجر',Dhuhr:'الظهر',Asr:'العصر',Maghrib:'المغرب',Isha:'العشاء'},before:'بقي {minutes} دقيقة على صلاة {prayer}',at:'حان وقت صلاة {prayer}',morning:'حان وقت أذكار الصباح',evening:'حان وقت أذكار المساء',tahajjud:'التهجد: بدأ الثلث الأخير من الليل',jumuah:'اليوم يوم الجمعة',test:'اختبار: تم تفعيل إشعارات SALAH في الخلفية.',staff:'رسالة جديدة من الفريق',support:'رد جديد على طلب الدعم',classroom:'درسك اليوم الساعة {time}: {title}'}
});
export function notificationLanguage(value){return NOTIFICATION_LANGUAGES.includes(value)?value:'ru';}
export function reminderNotificationText(event,language='ru'){
 const code=notificationLanguage(language),copy=NOTIFICATION_COPY[code];
 if(!event||typeof event!=='object')return '';
 if(code==='ru'&&typeof event.message==='string'&&event.message)return event.message;
 let template,parameters={};
 if(event.kind==='prayer'&&Object.hasOwn(copy.prayers,event.key)){
  parameters.prayer=(copy.genitive||copy.prayers)[event.key];
  if(event.phase==='at')template=copy.at;
  else if(/^before:(5|10|15|30)$/.test(event.phase||'')){template=copy.before;parameters.minutes=Number(event.phase.slice(7));}
 }else if(event.kind==='adhkar'&&['morning','evening'].includes(event.key))template=copy[event.key];
 else if(['tahajjud','jumuah','test','staff','support'].includes(event.kind))template=copy[event.kind];
 else if(event.kind==='classroom'&&typeof event.lessonTitle==='string'&&typeof event.lessonTime==='string'){
  template=copy.classroom;parameters={time:event.lessonTime,title:event.lessonTitle};
 }
 if(!template)return typeof event.message==='string'?event.message:'';
 // These strings are plain text. DOM callers use textContent or escape them.
 return template.replace(/\{(prayer|minutes|time|title)\}/g,(_,key)=>String(parameters[key]));
}
