import{esc}from './ui.js';
import{prayers,formatTime,countdown}from './prayers.js';
export function PrayerDisplay({mode,next,times,loading,hasCity,asr,nextAsr,tahajjud}){
  const name=next?.name||(hasCity?'Расписание':'Выберите город');
  const time=next?formatTime(next.time):'—';
  const remaining=next?countdown(next.time-Date.now()):'— : — : —';
  const note=next?'':loading?'Загружаем расписание':asr?.kind==='missing'?'Первое время Асра недоступно':hasCity?'Нет сохранённых данных':'Выберите город';
  const rows=[prayers[0],['Sunrise','Восход'],...prayers.slice(1)];
  const nightRow=tahajjud?.shown?'<span class="central-row tahajjud-row" data-prayer="Tahajjud" title="'+esc(tahajjud.label||'Нет сохранённых данных для расчёта')+'"><span>Тахаджуд</span><time>'+esc(tahajjud.text||'—')+'</time></span>':'';
  const calculatedNext=next?.key==='Asr'&&nextAsr?.kind==='calculated';
  return '<div class="prayer-stage"><button class="central-prayer '+mode+'" data-time-toggle aria-label="'+(mode==='focus'?'Показать расписание на день':'Показать крупный отсчёт')+'"><span class="central-table">'+rows.map(([key,label])=>'<span class="central-row '+(next?.key===key&&times&&Math.abs(next.time-times[key])<60000?'next':'')+'" data-prayer="'+key+'"'+(key==='Asr'&&asr?' title="'+esc(asr.label)+'"':'')+'><span>'+label+(key==='Asr'&&asr?.kind==='calculated'?'<small class="asr-calculated">расчёт</small>':'')+'</span><time>'+(times?formatTime(times[key]):'—')+'</time></span>').join('')+nightRow+'<span class="central-table-note">Восход не является намазом</span></span><span class="central-next"><span class="central-next-label"><span id="next-prefix">'+(next?.key==='Sunrise'?'':'Следующий ')+'</span><span id="next-name">'+esc(name)+'</span><span class="central-clock"> · <span id="next-time">'+time+'</span></span></span><span class="central-digits" id="countdown">'+remaining+'</span><span class="central-source" id="next-source"'+(calculatedNext?'':' hidden')+'>Первый Аср · расчёт</span><span class="central-note" id="next-note">'+note+'</span></span></button><span class="central-hint">Нажмите по центру, чтобы сменить вид</span></div>';
}
