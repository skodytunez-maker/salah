// Color names and swatches follow Quran Foundation QCF V4 / Quran.com TajweedBar.
export const MUSHAF_COLOR_RULES=[
 ['edgham','Идгам','Слияние звуков при слитном чтении.'],
 ['mad-2','Мадд · 2 хараката','Удлинение гласного на 2 счёта.'],
 ['mad-2-4-6','Мадд · 2, 4 или 6 харакатов','Допустимое удлинение; длительность зависит от правила и остановки.'],
 ['mad-4-5','Мадд · 4–5 харакатов','Удлинение гласного на 4–5 счётов.'],
 ['mad-6','Мадд · 6 харакатов','Удлинение гласного на 6 счётов.'],
 ['ekhfa','Ихфа и гунна','Скрытое произнесение и носовое звучание.'],
 ['qalqala','Калькаля','Лёгкий отзвук согласного.'],
 ['tafkhim','Тафхим','Твёрдое, полнозвучное произнесение.']
];
export function mushafThemeButton(theme){return '<span class="mushaf-theme-symbol" aria-hidden="true">◐</span><span>'+(theme==='night'?'Светлый':'Тёмный')+'</span>';}
export function mushafColorGuideMarkup(){
 return '<dialog id="mushaf-colors-dialog" class="mushaf-colors-dialog" aria-labelledby="mushaf-colors-title"><div class="mushaf-colors-heading"><h2 id="mushaf-colors-title">Цвета таджвида</h2><button type="button" id="mushaf-colors-close" aria-label="Закрыть объяснение цветов" autofocus>×</button></div><p class="mushaf-colors-intro">Цветные буквы подсказывают правила чтения. Харакат — время произнесения одной короткой гласной.</p><p id="mushaf-colors-note" hidden>Сейчас выбран обычный мусхаф. Цветной вариант можно включить в Aa → Издание.</p><ul class="mushaf-color-rules">'+MUSHAF_COLOR_RULES.map(([key,title,text])=>'<li><span class="mushaf-color-swatch" data-rule="'+key+'" aria-hidden="true"></span><div><strong>'+title+'</strong><p>'+text+'</p></div></li>').join('')+'</ul><p class="mushaf-colors-source">Оттенки адаптированы к светлому и тёмному фону. <a href="https://github.com/quran/quran.com-frontend-next/blob/aff1a035b09b66f28047b3216edcae4c5c949a49/src/components/QuranReader/TajweedBar/TajweedBar.tsx" target="_blank" rel="noopener">Обозначения Quran.com</a></p></dialog>';
}
