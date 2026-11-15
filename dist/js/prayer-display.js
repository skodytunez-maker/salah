import{esc}from './ui.js';
import{prayers,formatTime,countdown}from './prayers.js';
import{t}from './i18n.js';
export function PrayerDisplay({mode,next,times,loading,hasCity,asr,nextAsr,tahajjud}){
  const nextKey=[...prayers.map(([key])=>key),'Sunrise'].includes(next?.key)?'home.'+next.key.toLowerCase():null;
  const nameKey=next?nextKey:hasCity?'home.schedule':'home.selectCity',name=nameKey?t(nameKey):next?.name||'';
  const time=next?formatTime(next.time):'—';
  const remaining=next?countdown(next.time-Date.now()):'— : — : —';
  const noteKey=next?null:loading?'home.loadingSchedule':asr?.kind==='missing'?'home.firstAsrUnavailable':hasCity?'home.noSavedData':'home.selectCity';
  const rows=[prayers[0],['Sunrise','Восход'],...prayers.slice(1)];
  const nightRow=tahajjud?.shown?'<span class="central-row tahajjud-row" data-prayer="Tahajjud"'+(tahajjud.label?'':' data-i18n-title="home.noSavedCalculationData"')+' title="'+esc(tahajjud.label||t('home.noSavedCalculationData'))+'"><span data-i18n="home.tahajjud">'+esc(t('home.tahajjud'))+'</span><time>'+esc(tahajjud.text||'—')+'</time></span>':'';
  const calculatedNext=next?.key==='Asr'&&nextAsr?.kind==='calculated';
  const toggleKey=mode==='focus'?'home.showDaySchedule':'home.showLargeCountdown';
  return '<div class="prayer-stage"><button class="central-prayer '+mode+'" data-time-toggle data-i18n-aria-label="'+toggleKey+'" aria-label="'+esc(t(toggleKey))+'"><span class="central-table">'+rows.map(([key])=>{const labelKey='home.'+key.toLowerCase();return '<span class="central-row '+(next?.key===key&&times&&Math.abs(next.time-times[key])<60000?'next':'')+'" data-prayer="'+key+'"'+(key==='Asr'&&asr?' title="'+esc(asr.label)+'"':'')+'><span><span data-i18n="'+labelKey+'">'+esc(t(labelKey))+'</span>'+(key==='Asr'&&asr?.kind==='calculated'?'<small class="asr-calculated" data-i18n="home.calculated">'+esc(t('home.calculated'))+'</small>':'')+'</span><time>'+(times?formatTime(times[key]):'—')+'</time></span>';}).join('')+nightRow+'<span class="central-table-note" data-i18n="home.sunriseNotPrayer">'+esc(t('home.sunriseNotPrayer'))+'</span></span><span class="central-next"><span class="central-next-label"><span id="next-prefix"'+(next?.key==='Sunrise'?'':' data-i18n="home.nextPrefix"')+'>'+(next?.key==='Sunrise'?'':esc(t('home.nextPrefix')))+'</span><span id="next-name"'+(nameKey?' data-i18n="'+nameKey+'"':'')+'>'+esc(name)+'</span><span class="central-clock"> · <span id="next-time">'+time+'</span></span></span><span class="central-digits" id="countdown">'+remaining+'</span><span class="central-source" id="next-source" data-i18n="home.firstAsrCalculated"'+(calculatedNext?'':' hidden')+'>'+esc(t('home.firstAsrCalculated'))+'</span><span class="central-note" id="next-note"'+(noteKey?' data-i18n="'+noteKey+'"':'')+'>'+(noteKey?esc(t(noteKey)):'')+'</span></span></button><span class="central-hint" data-i18n="home.switchViewHint">'+esc(t('home.switchViewHint'))+'</span></div>';
}
