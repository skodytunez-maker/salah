import {esc,modal,toast,closeModal} from './ui.js';
import {loadSurah} from './quran-data.js';
import {actionLabel,actionIcon} from './action-icons.js';

// A shared, shuffled Quran cycle: stable for the local calendar day, offline and without reading history.
const dailyOrderCache=new Map();
function shuffledDailyOrder(total,cycle){
 let state=(Math.imul(cycle^0x9e3779b9,0x85ebca6b)^total)>>>0;
 const random=()=>{let value=state=(state+0x6d2b79f5)>>>0;value=Math.imul(value^(value>>>15),value|1);value^=value+Math.imul(value^(value>>>7),value|61);return ((value^(value>>>14))>>>0)/4294967296;};
 const order=Array.from({length:total},(_,i)=>i);
 for(let i=total-1;i>0;i--){const j=Math.floor(random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
 return order;
}
function dailyOffset(total,day){
 const cycle=Math.floor(day/total),key=total+':'+cycle;
 let order=dailyOrderCache.get(key);
 if(!order){
  order=shuffledDailyOrder(total,cycle);
  // Only the first two items can change, so the previous cycle's last item stays reproducible.
  if(total>2&&order[0]===shuffledDailyOrder(total,cycle-1)[total-1])[order[0],order[1]]=[order[1],order[0]];
  dailyOrderCache.set(key,order);if(dailyOrderCache.size>2)dailyOrderCache.delete(dailyOrderCache.keys().next().value);
 }
 return order[((day%total)+total)%total];
}
export function dailyPosition(index,date=new Date()){
 const day=Math.floor(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate())/86400000);
 const total=index.surahs.reduce((sum,s)=>sum+s.ayahs,0);
 if(!Number.isFinite(day)||!Number.isSafeInteger(total)||total<1)return;
 let offset=dailyOffset(total,day);
 for(const s of index.surahs){if(offset<s.ayahs)return {surah:s.number,ayah:offset+1};offset-=s.ayahs;}
}
let dailySurface=null;
export function closeDailyAyah(){dailySurface?.dispose();dailySurface=null;}
export async function mountDailyAyah(slot,index,listen,{compact=false}={}){
 closeDailyAyah();
 const position=dailyPosition(index);
 try{
  const surah=await loadSurah(position.surah);if(!slot.isConnected)return;
  const verse=surah.verses[position.ayah-1],meta=index.surahs[position.surah-1];
  if(compact){
   slot.innerHTML='<button type="button" class="quran-day-short" aria-haspopup="dialog" aria-expanded="false" aria-controls="quran-day-popover">'+actionLabel('book','Аят дня')+'<small>'+position.surah+':'+position.ayah+'</small></button>';
   const invoker=slot.querySelector('button'),panel=document.createElement('section');panel.id='quran-day-popover';panel.className='quran-day-popover';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Аят дня');
   panel.innerHTML='<div class="quran-day-popover-head"><h2>Аят дня</h2><button type="button" class="quran-small-close" aria-label="Закрыть аят дня" data-day-close>'+actionIcon('close')+'</button></div><p class="muted">'+esc(meta.name)+' · '+position.surah+':'+position.ayah+'</p><p class="ayah-day-arabic" dir="rtl" lang="ar">'+esc(verse.arabic)+'</p><p class="ayah-day-translation">'+esc(verse.translation)+'</p><div class="ayah-day-actions"><button class="text-button" data-day-listen>'+actionLabel('play','Слушать')+'</button><button class="text-button" data-day-share>Поделиться</button><a class="text-button" href="#quran?surah='+position.surah+'&ayah='+position.ayah+'" data-day-read>Читать полностью</a></div>';
   document.body.append(panel);
   const hide=()=>{panel.hidden=true;invoker.setAttribute('aria-expanded','false');};
   const place=()=>{const rect=invoker.getBoundingClientRect(),top=Math.max(8,Math.min(rect.bottom+8,innerHeight-100));panel.style.top=top+'px';panel.style.maxHeight=Math.max(80,innerHeight-top-12)+'px';};
   const outside=e=>{if(!panel.hidden&&!panel.contains(e.target)&&!invoker.contains(e.target))hide();};
   const key=e=>{if(e.key==='Escape'&&!panel.hidden){e.preventDefault();hide();invoker.focus({preventScroll:true});}};
   const resize=()=>{if(!panel.hidden)place();};
   document.addEventListener('pointerdown',outside);document.addEventListener('keydown',key);window.addEventListener('resize',resize);
   dailySurface={dispose(){hide();panel.remove();document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',key);window.removeEventListener('resize',resize);}};
   invoker.onclick=()=>{if(!panel.hidden){hide();return;}const searchClose=document.getElementById('quran-search-close');if(searchClose&&!searchClose.hidden)searchClose.click();place();panel.hidden=false;invoker.setAttribute('aria-expanded','true');panel.querySelector('[data-day-close]').focus({preventScroll:true});};
   panel.querySelector('[data-day-close]').onclick=()=>{hide();invoker.focus({preventScroll:true});};
   panel.querySelector('[data-day-listen]').onclick=()=>{hide();listen(surah,position.ayah);};panel.querySelector('[data-day-share]').onclick=()=>{hide();showAyahCard(surah,verse,meta);};panel.querySelector('[data-day-read]').onclick=hide;return;
  }
  slot.innerHTML='<details class="ayah-day-disclosure"><summary><span class="ayah-day-heading"><span class="eyebrow">АЯТ ДНЯ</span><span class="ayah-day-reference">'+esc(meta.name)+' · '+position.surah+':'+position.ayah+'</span></span><span class="ayah-day-excerpt">'+esc(verse.translation)+'</span></summary><div class="ayah-day-body"><p class="ayah-day-arabic" dir="rtl" lang="ar">'+esc(verse.arabic)+'</p><p class="ayah-day-translation">'+esc(verse.translation)+'</p><div class="ayah-day-actions"><button class="text-button" data-day-listen>'+actionLabel('play','Слушать')+'</button><button class="text-button" data-day-share>Поделиться</button><a class="text-button" href="#quran?surah='+position.surah+'&ayah='+position.ayah+'">Читать полностью</a></div></div></details>';
  slot.querySelector('[data-day-listen]').onclick=()=>listen(surah,position.ayah);
  slot.querySelector('[data-day-share]').onclick=()=>showAyahCard(surah,verse,meta);
 }catch{if(slot.isConnected)slot.hidden=true;}
}

export const AYAH_PHOTO_BACKGROUNDS=[{"id":"moon-mosque","name":"Лунная мечеть","path":"./assets/ayah-backgrounds/moon-mosque.webp"},{"id":"desert-dawn","name":"Рассвет в пустыне","path":"./assets/ayah-backgrounds/desert-dawn.webp"},{"id":"misty-lake","name":"Тихое озеро","path":"./assets/ayah-backgrounds/misty-lake.webp"},{"id":"rain-window","name":"После дождя","path":"./assets/ayah-backgrounds/rain-window.webp"},{"id":"ocean-dusk","name":"Море на закате","path":"./assets/ayah-backgrounds/ocean-dusk.webp"},{"id":"mosque-arches","name":"Свет сквозь арки","path":"./assets/ayah-backgrounds/mosque-arches.webp"},{"id":"olive-grove","name":"Оливковая роща","path":"./assets/ayah-backgrounds/olive-grove.webp"},{"id":"mountain-night","name":"Ночь в горах","path":"./assets/ayah-backgrounds/mountain-night.webp"},{"id":"lantern-courtyard","name":"Тёплый свет","path":"./assets/ayah-backgrounds/lantern-courtyard.webp"},{"id":"garden-stream","name":"Сад и ручей","path":"./assets/ayah-backgrounds/garden-stream.webp"},{"id":"snow-forest","name":"Зимняя тишина","path":"./assets/ayah-backgrounds/snow-forest.webp"},{"id":"coastal-mosque","name":"Мечеть у моря","path":"./assets/ayah-backgrounds/coastal-mosque.webp"}];
export function automaticBackground(surah,ayah,date=new Date()){const day=Math.floor(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate())/86400000);const index=((day+surah*31+ayah)%AYAH_PHOTO_BACKGROUNDS.length+AYAH_PHOTO_BACKGROUNDS.length)%AYAH_PHOTO_BACKGROUNDS.length;return AYAH_PHOTO_BACKGROUNDS[index].id;}
const themes={night:['#070b16','#15223c','#f5efe2','#dbc08e'],sand:['#f4ead7','#ddd0b6','#302b25','#80633c'],blue:['#071d25','#153d49','#eef5f3','#d9c89b']};
export function wrapCardText(ctx,text,width){
 const lines=[];let line='';
 for(const word of text.split(/\s+/)){const next=line?line+' '+word:word;if(line&&ctx.measureText(next).width>width){lines.push(line);line=word;}else line=next;}
 if(line)lines.push(line);return lines;
}
async function renderCards(surah,verse,meta,options){
 await document.fonts.ready;
 if(options.theme==='auto')options={...options,theme:automaticBackground(surah.number,verse.ayah)};
 const story=options.format!=='square',full=options.format==='full',width=1080,height=full?2340:story?1920:1080,pad=100;
 // A tall export extends the photograph around the same safe 9:16 composition.
 const contentHeight=story?1920:1080,contentOffset=(height-contentHeight)/2;
 // Keep all meaningful content clear of story viewer controls; square posts retain their layout.
 const topInset=story?228:0,bottomInset=story?332:0;
 const short=verse.arabic.length+verse.translation.length<500;
 const measure=document.createElement('canvas').getContext('2d'),capacity=contentHeight-650-topInset-bottomInset;
 const languageRows=(text,arabic,size)=>{
  const font=arabic?size+'px serif':'600 '+size+'px sans-serif';
  measure.font=font;
  return wrapCardText(measure,text,width-pad*2).map(text=>({text,arabic,font,size,height:size*(arabic?1.65:1.55)}));
 };
 const arabicRows=options.arabic?languageRows(verse.arabic,true,short?68:52):[];
 const translationRows=options.translation?languageRows(verse.translation,false,short?54:42):[];
 const rowHeight=lines=>lines.reduce((sum,row)=>sum+row.height,0);
 const combined=[...arabicRows,...(arabicRows.length&&translationRows.length?[{text:'',height:48}]:[]),...translationRows];
 const pages=[];
 const paginate=lines=>{
  let page=[],used=0;
  for(const row of lines){if(used+row.height>capacity&&page.length){pages.push(page);page=[];used=0;}page.push(row);used+=row.height;}
  if(page.length)pages.push(page);
 };
 if(rowHeight(combined)<=capacity){pages.push(combined);}
 else{
  // Keep languages on separate cards. A modest reduction can fit one language on
  // one card; very long ayahs keep readable type and continue on further pages.
  const fitLanguage=(text,arabic,preferred)=>{
   if(rowHeight(preferred)<=capacity)return preferred;
   for(let size=preferred[0].size-2;size>=(arabic?44:36);size-=2){
    const lines=languageRows(text,arabic,size);if(rowHeight(lines)<=capacity)return lines;
   }
   return preferred;
  };
  if(arabicRows.length)paginate(fitLanguage(verse.arabic,true,arabicRows));
  if(translationRows.length)paginate(fitLanguage(verse.translation,false,translationRows));
 }
 const photoPaths={mosque:'./wallpapers/istanbul/night-v1.webp',mountains:'./wallpapers/pamir/day-v1.webp',...Object.fromEntries(AYAH_PHOTO_BACKGROUNDS.map(bg=>[bg.id,bg.path]))};
 const photo=new Image();if(photoPaths[options.theme]){photo.src=photoPaths[options.theme];try{await photo.decode();}catch{}}
 const logo=new Image();logo.src='./favicon.svg';try{await logo.decode();}catch{}
 return pages.map((lines,i)=>{
  const canvas=document.createElement('canvas');canvas.width=width*2;canvas.height=height*2;canvas.setAttribute('role','img');const hasArabic=lines.some(row=>row.arabic===true),hasTranslation=lines.some(row=>row.arabic===false);canvas.dataset.language=hasArabic&&hasTranslation?'both':hasArabic?'ar':'ru';canvas.setAttribute('aria-label',meta.name+', аят '+verse.ayah+', '+(hasArabic&&hasTranslation?'арабский текст и перевод':hasArabic?'арабский текст':'перевод')+', карточка '+(i+1)+' из '+pages.length);const ctx=canvas.getContext('2d'),colors=themes[options.theme]||themes.night;ctx.scale(2,2);
  const bg=ctx.createLinearGradient(0,0,width,height);bg.addColorStop(0,colors[0]);bg.addColorStop(1,colors[1]);ctx.fillStyle=bg;ctx.fillRect(0,0,width,height);
  if(photo.complete&&photo.naturalWidth){const scale=Math.max(width/photo.naturalWidth,height/photo.naturalHeight),w=photo.naturalWidth*scale,h=photo.naturalHeight*scale;ctx.drawImage(photo,(width-w)/2,(height-h)/2,w,h);const shade=ctx.createLinearGradient(0,0,0,height);shade.addColorStop(0,'#030812aa');shade.addColorStop(.5,'#03081299');shade.addColorStop(1,full?'#030812b8':'#030812e6');ctx.fillStyle=shade;ctx.fillRect(0,0,width,height);}
  const halo=ctx.createRadialGradient(width/2,height*.43,0,width/2,height*.43,width*.7);halo.addColorStop(0,options.theme==='sand'?'#fff9ed66':'#dbc08e12');halo.addColorStop(1,'#00000000');ctx.fillStyle=halo;ctx.fillRect(0,0,width,height);
  ctx.strokeStyle=colors[3];ctx.globalAlpha=.28;ctx.lineWidth=2;ctx.strokeRect(48,48,width-96,height-96);
  ctx.globalAlpha=.12;ctx.beginPath();ctx.moveTo(78,height-280);ctx.lineTo(78,560);ctx.bezierCurveTo(78,380,300,390,540,315);ctx.bezierCurveTo(780,390,1002,380,1002,560);ctx.lineTo(1002,height-280);ctx.stroke();ctx.globalAlpha=1;
  ctx.direction='ltr';ctx.textAlign='center';ctx.fillStyle=colors[3];
  if(logo.complete&&logo.naturalWidth)ctx.drawImage(logo,width/2-30,72+topInset+contentOffset,60,60);
  ctx.font='76px serif';ctx.fillText('SALAH',width/2,220+topInset+contentOffset);
  ctx.font='25px sans-serif';ctx.fillText('К О Р А Н  ·  '+surah.number+':'+verse.ayah,width/2,275+topInset+contentOffset);
  ctx.fillStyle=colors[2];let y=330+topInset+contentOffset+Math.max(0,(capacity-lines.reduce((n,r)=>n+r.height,0))/2)+(lines[0]?.size||0);
  for(const row of lines){ctx.direction=row.arabic?'rtl':'ltr';ctx.textAlign='center';if(row.font){ctx.font=row.font;ctx.fillText(row.text,width/2,y);}y+=row.height;}
  ctx.direction='ltr';ctx.textAlign='center';ctx.font='30px sans-serif';ctx.fillStyle=colors[3];ctx.fillText(meta.name+(pages.length>1?' · '+(i+1)+'/'+pages.length:''),width/2,contentHeight-235-bottomInset+contentOffset);
  if(hasTranslation){ctx.font='21px sans-serif';ctx.globalAlpha=.75;ctx.fillText('Перевод Эльмира Кулиева',width/2,contentHeight-192-bottomInset+contentOffset);ctx.globalAlpha=1;}
  ctx.globalAlpha=.5;ctx.beginPath();ctx.moveTo(430,contentHeight-153-bottomInset+contentOffset);ctx.lineTo(650,contentHeight-153-bottomInset+contentOffset);ctx.stroke();ctx.globalAlpha=1;
  ctx.font=(story?44:32)+'px sans-serif';ctx.fillText('Saadi Kobilov',width/2,contentHeight-102-bottomInset+contentOffset);ctx.font=(story?24:20)+'px sans-serif';ctx.globalAlpha=.72;ctx.fillText('АВТОР ПРИЛОЖЕНИЯ SALAH',width/2,contentHeight-68-bottomInset+contentOffset);ctx.globalAlpha=1;
  return canvas;
 });
}
export function showAyahCard(surah,verse,meta){
 modal('<div class="ayah-card-editor"><div class="modal-heading ayah-card-heading"><h2>Карточка аята</h2><button class="text-button" data-close>Закрыть</button></div><div class="ayah-card-options"><label>Формат<select id="ayah-card-format"><option value="full">На весь экран · 9:19,5</option><option value="story">Сторис · 9:16</option><option value="square">Квадрат · 1:1</option></select></label><label>Фон<select id="ayah-card-theme"><option value="auto">Автоматически · каждый день</option><option value="mosque">Мечеть · вечер</option><option value="mountains">Горы · тишина</option><option value="moon-mosque">Лунная мечеть</option><option value="desert-dawn">Рассвет в пустыне</option><option value="misty-lake">Тихое озеро</option><option value="rain-window">После дождя</option><option value="ocean-dusk">Море на закате</option><option value="mosque-arches">Свет сквозь арки</option><option value="olive-grove">Оливковая роща</option><option value="mountain-night">Ночь в горах</option><option value="lantern-courtyard">Тёплый свет</option><option value="garden-stream">Сад и ручей</option><option value="snow-forest">Зимняя тишина</option><option value="coastal-mosque">Мечеть у моря</option><option value="night">Ночной</option><option value="sand">Песочный</option><option value="blue">Глубокий синий</option></select></label><label><input type="checkbox" id="ayah-card-arabic" checked> Арабский текст</label><label><input type="checkbox" id="ayah-card-translation" checked> Перевод</label></div><div id="ayah-card-preview" aria-live="polite"></div><p id="ayah-card-status" class="muted"></p><div class="ayah-card-actions"><button class="button" id="ayah-card-send" disabled>Поделиться</button><button class="button secondary" id="ayah-card-save" disabled>Сохранить</button></div></div>');
 const root=document.getElementById('modal-content'),preview=root.querySelector('#ayah-card-preview'),status=root.querySelector('#ayah-card-status'),send=root.querySelector('#ayah-card-send'),save=root.querySelector('#ayah-card-save');let canvases=[],readyFiles=[],generation=0;
 const backgroundChoice=root.querySelector('#ayah-card-theme');try{const saved=localStorage.getItem('salah-ayah-card-background');if(saved&&[...backgroundChoice.options].some(option=>option.value===saved))backgroundChoice.value=saved;}catch{}
 const regenerate=async()=>{const token=++generation;send.disabled=save.disabled=true;const options={format:root.querySelector('#ayah-card-format').value,theme:root.querySelector('#ayah-card-theme').value,arabic:root.querySelector('#ayah-card-arabic').checked,translation:root.querySelector('#ayah-card-translation').checked};if(!options.arabic&&!options.translation){preview.replaceChildren();status.textContent='Выберите арабский текст или перевод.';return;}try{const result=await renderCards(surah,verse,meta,options);if(token!==generation||!preview.isConnected)return;canvases=result;preview.dataset.format=options.format;const exported=await files();if(token!==generation||!preview.isConnected)return;readyFiles=exported;preview.replaceChildren(...result);const separated=options.arabic&&options.translation&&result.every(canvas=>canvas.dataset.language!=='both');status.textContent=separated?'Арабский текст и перевод отдельно · '+result.length+' шт.':result.length>1?'Полный аят на '+result.length+' карточках.':'Полный текст аята.';send.disabled=save.disabled=false;}catch{status.textContent='Не удалось создать карточку.';}};
 root.querySelectorAll('.ayah-card-options input,.ayah-card-options select').forEach(control=>control.onchange=()=>{if(control===backgroundChoice)try{localStorage.setItem('salah-ayah-card-background',backgroundChoice.value);}catch{}regenerate();});
 const files=async()=>Promise.all(canvases.map((canvas,i)=>new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(new File([blob],'SALAH-'+surah.number+'-'+verse.ayah+'-'+(i+1)+'.png',{type:'image/png'})):reject(Error()),'image/png'))));
 const download=file=>{const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=file.name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);};
 save.onclick=async()=>{try{for(const file of readyFiles)download(file);}catch{toast('Не удалось сохранить карточку');}};
 send.onclick=async()=>{try{const images=readyFiles;if(navigator.canShare?.({files:images}))await navigator.share({files:images,title:meta.name+' · '+surah.number+':'+verse.ayah});else{for(const file of images)download(file);toast('Картинки сохранены для отправки');}}catch(e){if(e.name!=='AbortError')toast('Не удалось отправить карточку. Попробуйте сохранить её.');}};
 regenerate();
}
