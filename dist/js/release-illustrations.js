import{esc}from './ui.js';
import{actionIcon}from './action-icons.js';
import{awardArtwork}from './quran-awards-core.js';

const gallery=cards=>'<div class="release-gallery"><div class="release-gallery-strip" tabindex="0" aria-label="Новые возможности SALAH">'+cards.join('')+'</div><div class="release-gallery-controls"><button type="button" data-release-prev aria-label="Предыдущая карточка"><img src="./assets/arrow-left.svg" alt=""></button><span data-release-page aria-live="polite">1/'+cards.length+'</span><button type="button" data-release-next aria-label="Следующая карточка"><img src="./assets/arrow-left.svg" alt=""></button></div></div>';
const card=(art,title,text,note='')=>'<article class="release-feature"><div class="release-new-art" aria-hidden="true">'+art+'</div><h3>'+esc(title)+'</h3><p>'+esc(text)+'</p>'+(note?'<p class="release-feature-note">'+esc(note)+'</p>':'')+'</article>';
const portrait=(src)=>'<img class="release-reader-portrait" src="./assets/reciters/'+src+'" alt="">';
const artwork=kind=>'<img src="./'+awardArtwork(kind)+'" alt="">';
const spark=()=>'<svg viewBox="0 0 80 80" fill="none" aria-hidden="true"><path d="M40 12c0 18-10 28-28 28 18 0 28 10 28 28 0-18 10-28 28-28-18 0-28-10-28-28Z" stroke="currentColor" stroke-width="1.5"/><circle cx="65" cy="15" r="3" fill="currentColor"/></svg>';

// Known editions have feature-specific pictures. Future public release notes
// retain illustrated cards automatically instead of reverting to a text list.
export function releaseIllustrations(version,changes=[]){
 if(version===344)return gallery([card('<svg viewBox="0 0 140 140" fill="none"><rect x="24" y="24" width="92" height="92" rx="26" stroke="currentColor" stroke-width="2"/><path d="M49 43l42 27-42 27z" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/></svg>','Ровный значок плеера','Треугольник воспроизведения расположен по центру кнопки — в маленьком и полном плеере.')]);

 if(version===343)return gallery([card('<svg viewBox="0 0 160 140" fill="none"><rect x="15" y="62" width="38" height="62" rx="8" stroke="#c2cbd8" stroke-width="2"/><rect x="61" y="24" width="38" height="100" rx="8" stroke="#d8be88" stroke-width="2"/><rect x="107" y="76" width="38" height="48" rx="8" stroke="#bf926c" stroke-width="2"/><text x="34" y="88" text-anchor="middle" fill="#c2cbd8" font-family="Georgia,serif" font-size="21">2</text><text x="80" y="55" text-anchor="middle" fill="#d8be88" font-family="Georgia,serif" font-size="25">1</text><text x="126" y="103" text-anchor="middle" fill="#bf926c" font-family="Georgia,serif" font-size="21">3</text></svg>','Первое место — выше','Подиум сохраняет правильную высоту, даже когда имя или время занимают несколько строк.','Результаты и места слушателей не изменены.'),card('<svg viewBox="0 0 140 140" fill="none"><path d="M70 120s37-38 37-65a37 37 0 0 0-74 0c0 27 37 65 37 65Z" stroke="currentColor" stroke-width="2"/><circle cx="70" cy="54" r="13" stroke="currentColor" stroke-width="2"/></svg>','Поиск местоположения','Определение города стало устойчивее при слабом GPS-сигнале. Сообщения подскажут, если нет координат или связи.','Исправление разрешений Android требует обновления приложения через Google Play.')]);

 if(version===342)return gallery([card('<svg viewBox="0 0 150 140" fill="none"><rect x="24" y="25" width="102" height="96" rx="14" stroke="currentColor" stroke-width="2"/><path d="M24 52h102M48 16v20M102 16v20" stroke="currentColor" stroke-width="2"/><text x="75" y="88" text-anchor="middle" fill="currentColor" font-family="Georgia,serif" font-size="32">30</text><text x="75" y="108" text-anchor="middle" fill="currentColor" font-size="10">НОЯБРЬ</text></svg>','Ноябрь в календаре Тюмени','Месяц добавлен по присланной таблице: первое время Асра и Аср в мечетях сохранены отдельно.','Времена перенесены из таблицы 2025 года; дни недели указаны для ноября 2026.'),card('<div class="release-total-preview"><div><span>МОЙ ТОП</span><strong>Ваше время</strong></div><div><span>ТОП SALAH</span><strong>Вместе прослушали</strong></div></div>','Компактнее и точнее','Счётчик в топах занимает меньше места — подиум виден выше.','Повторный учёт старых минут в месячном итоге исправлен.')]);

 if(![339,340,341].includes(version)){
  if(!Number.isSafeInteger(version)||version<=341||!Array.isArray(changes))return '';
  const safe=changes.filter(x=>typeof x==='string'&&x.trim()&&x.length<=240&&!/владел|админ|owner|admin/iu.test(x)).slice(0,8);
  return safe.length?gallery(safe.map((text,i)=>card(spark(),'Обновление '+(i+1),text))):'';
 }
 const cards=[
  card('<div class="release-hours-medals">'+['hours25','hours100','hours1000'].map(artwork).join('')+'</div>','Новые награды','За 25, 50, 100, 250, 500, 1 000 и 5 000 часов прослушивания Корана.','Полученные награды остаются в вашем аккаунте.'),
  card('<div class="release-shuffle-preview"><div>'+portrait('alafasy.webp')+'<span>'+actionIcon('shuffle')+'</span>'+portrait('muhammadalluhaidan.jpg')+'</div><strong>'+actionIcon('shuffle')+' Перемешать</strong><small>Суры и чтецы · один плейлист</small></div>','Случайный плейлист','Нажмите «Перемешать» в развёрнутом плеере: SALAH соберёт плейлист сур и чтецов.','Следующая запись включается автоматически.'),
  card('<div class="release-total-preview"><div><span>МОЙ ТОП</span><strong>Ваше время</strong></div><div><span>ТОП SALAH</span><strong>Вместе прослушали</strong></div></div>','Время в топах','В «Мой топ» — ваше время прослушивания. В «Топ SALAH» — общее время участников.','Общий счётчик обновляется после сохранения статистики.')
 ];
 if(version>=340)cards.push(card('<div class="release-city-pair"><figure><img src="./assets/updates/kaspiysk-v1.webp" alt="" loading="lazy"><figcaption>Каспийск</figcaption></figure><figure><img src="./assets/updates/kazan-v1.webp" alt="" loading="lazy"><figcaption>Казань</figcaption></figure></div>','Новые городские обои','Каспийск и Казань: дневной свет, вечернее освещение и плавный переход к ночи.','Настройки → Оформление и атмосфера → Обои.'));
 cards.push(
  card('<div class="release-play-preview">'+actionIcon('play')+'<span>Google Play</span><small>ЗАКРЫТЫЙ ТЕСТ</small></div>','SALAH в Google Play','Закрытая тестовая версия одобрена и опубликована для приглашённых тестировщиков.','Общий выпуск для всех пользователей готовится.'),
  card('<div class="release-support-preview"><span>Поддержать SALAH</span><strong>от 150 ₽</strong><small>в месяц · добровольно</small></div>','Готовим добровольную поддержку','Скоро появится возможность поддержать развитие SALAH ежемесячной подпиской.','Оплата пока отключена. Все функции приложения остаются бесплатными.'),
  card('<div class="release-instagram-preview"><svg viewBox="0 0 64 64" fill="none"><rect x="10" y="10" width="44" height="44" rx="13" stroke="currentColor" stroke-width="2.5"/><circle cx="32" cy="32" r="11" stroke="currentColor" stroke-width="2.5"/><circle cx="46" cy="18" r="3" fill="currentColor"/></svg><span>SALAH · Saadi</span></div>','Мы в Instagram','В приложении появились ссылки на Instagram SALAH и страницу основателя Saadi.','Ищите их в разделе «О приложении».')
 );
 return gallery(cards);
}
