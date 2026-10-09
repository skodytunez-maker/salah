import {esc,modal,toast} from './ui.js';
import {loadSurah} from './quran-data.js';
import {actionLabel} from './action-icons.js';

// Stable local calendar day; no random selection during render and no inferred reading history.
export function dailyPosition(index,date=new Date()){
 const day=Math.floor(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate())/86400000);
 const total=index.surahs.reduce((sum,s)=>sum+s.ayahs,0);
 let offset=((day%total)+total)%total;
 for(const s of index.surahs){if(offset<s.ayahs)return {surah:s.number,ayah:offset+1};offset-=s.ayahs;}
}
export async function mountDailyAyah(slot,index,listen){
 const position=dailyPosition(index);
 try{
  const surah=await loadSurah(position.surah);if(!slot.isConnected)return;
  const verse=surah.verses[position.ayah-1],meta=index.surahs[position.surah-1];
  slot.innerHTML='<div class="ayah-day-heading"><span class="eyebrow">АЯТ ДНЯ</span><a href="#quran?surah='+position.surah+'&ayah='+position.ayah+'">'+esc(meta.name)+' · '+position.surah+':'+position.ayah+'</a></div><p class="ayah-day-arabic" dir="rtl" lang="ar">'+esc(verse.arabic)+'</p><p class="ayah-day-translation">'+esc(verse.translation)+'</p><div class="ayah-day-actions"><button class="text-button" data-day-listen>'+actionLabel('play','Слушать')+'</button><button class="text-button" data-day-share>Поделиться</button><a class="text-button" href="#quran?surah='+position.surah+'&ayah='+position.ayah+'">Читать полностью</a></div>';
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
 const story=options.format==='story',width=1080,height=story?1920:1080,pad=100,rows=[];
 // Keep all meaningful content clear of story viewer controls; square posts retain their layout.
 const topInset=story?228:0,bottomInset=story?332:0;
 const short=verse.arabic.length+verse.translation.length<500;const arabicSize=short?68:52,translationSize=short?54:42;
 const measure=document.createElement('canvas').getContext('2d');
 if(options.arabic){measure.font=arabicSize+'px serif';for(const text of wrapCardText(measure,verse.arabic,width-pad*2))rows.push({text,arabic:true,height:arabicSize*1.65});}
 if(options.arabic&&options.translation)rows.push({text:'',height:48});
 if(options.translation){measure.font='600 '+translationSize+'px sans-serif';for(const text of wrapCardText(measure,verse.translation,width-pad*2))rows.push({text,arabic:false,height:translationSize*1.55});}
 const pages=[];let page=[],used=0;const capacity=height-650-topInset-bottomInset;
 for(const row of rows){if(used+row.height>capacity&&page.length){pages.push(page);page=[];used=0;}page.push(row);used+=row.height;}
 if(page.length)pages.push(page);
 const photoPaths={mosque:'./wallpapers/istanbul/night-v1.webp',mountains:'./wallpapers/pamir/day-v1.webp',...Object.fromEntries(AYAH_PHOTO_BACKGROUNDS.map(bg=>[bg.id,bg.path]))};
 const photo=new Image();if(photoPaths[options.theme]){photo.src=photoPaths[options.theme];try{await photo.decode();}catch{}}
 const logo=new Image();logo.src='./favicon.svg';try{await logo.decode();}catch{}
 return pages.map((lines,i)=>{
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;canvas.setAttribute('role','img');canvas.setAttribute('aria-label',meta.name+', аят '+verse.ayah+', карточка '+(i+1));const ctx=canvas.getContext('2d'),colors=themes[options.theme]||themes.night;
  const bg=ctx.createLinearGradient(0,0,width,height);bg.addColorStop(0,colors[0]);bg.addColorStop(1,colors[1]);ctx.fillStyle=bg;ctx.fillRect(0,0,width,height);
  if(photo.complete&&photo.naturalWidth){const scale=Math.max(width/photo.naturalWidth,height/photo.naturalHeight),w=photo.naturalWidth*scale,h=photo.naturalHeight*scale;ctx.drawImage(photo,(width-w)/2,(height-h)/2,w,h);const shade=ctx.createLinearGradient(0,0,0,height);shade.addColorStop(0,'#030812aa');shade.addColorStop(.5,'#03081299');shade.addColorStop(1,'#030812e6');ctx.fillStyle=shade;ctx.fillRect(0,0,width,height);}
  const halo=ctx.createRadialGradient(width/2,height*.43,0,width/2,height*.43,width*.7);halo.addColorStop(0,options.theme==='sand'?'#fff9ed66':'#dbc08e12');halo.addColorStop(1,'#00000000');ctx.fillStyle=halo;ctx.fillRect(0,0,width,height);
  ctx.strokeStyle=colors[3];ctx.globalAlpha=.28;ctx.lineWidth=2;ctx.strokeRect(48,48,width-96,height-96);
  ctx.globalAlpha=.12;ctx.beginPath();ctx.moveTo(78,height-280);ctx.lineTo(78,560);ctx.bezierCurveTo(78,380,300,390,540,315);ctx.bezierCurveTo(780,390,1002,380,1002,560);ctx.lineTo(1002,height-280);ctx.stroke();ctx.globalAlpha=1;
  ctx.direction='ltr';ctx.textAlign='center';ctx.fillStyle=colors[3];
  if(logo.complete&&logo.naturalWidth)ctx.drawImage(logo,width/2-30,72+topInset,60,60);
  ctx.font='76px serif';ctx.fillText('SALAH',width/2,220+topInset);
  ctx.font='25px sans-serif';ctx.fillText('К О Р А Н  ·  '+surah.number+':'+verse.ayah,width/2,275+topInset);
  ctx.fillStyle=colors[2];let y=330+topInset+Math.max(0,(capacity-lines.reduce((n,r)=>n+r.height,0))/2)+arabicSize;
  for(const row of lines){ctx.direction=row.arabic?'rtl':'ltr';ctx.textAlign='center';ctx.font=row.arabic?arabicSize+'px serif':'600 '+translationSize+'px sans-serif';ctx.fillText(row.text,width/2,y);y+=row.height;}
  ctx.direction='ltr';ctx.textAlign='center';ctx.font='30px sans-serif';ctx.fillStyle=colors[3];ctx.fillText(meta.name+(pages.length>1?' · '+(i+1)+'/'+pages.length:''),width/2,height-235-bottomInset);
  if(options.translation){ctx.font='21px sans-serif';ctx.globalAlpha=.75;ctx.fillText('Перевод Эльмира Кулиева',width/2,height-192-bottomInset);ctx.globalAlpha=1;}
  ctx.globalAlpha=.5;ctx.beginPath();ctx.moveTo(430,height-153-bottomInset);ctx.lineTo(650,height-153-bottomInset);ctx.stroke();ctx.globalAlpha=1;
  ctx.font=(story?44:32)+'px sans-serif';ctx.fillText('Saadi Kobilov',width/2,height-102-bottomInset);ctx.font=(story?24:20)+'px sans-serif';ctx.globalAlpha=.72;ctx.fillText('АВТОР ПРИЛОЖЕНИЯ SALAH',width/2,height-68-bottomInset);ctx.globalAlpha=1;
  return canvas;
 });
}
export function showAyahCard(surah,verse,meta){
 modal('<div class="modal-heading ayah-card-heading"><h2>Поделиться аятом</h2><button class="text-button" data-close>Закрыть</button></div><div class="ayah-card-options"><label>Формат<select id="ayah-card-format"><option value="story">Сторис · 9:16</option><option value="square">Квадрат · 1:1</option></select></label><label>Фон<select id="ayah-card-theme"><option value="auto">Автоматически · каждый день</option><option value="mosque">Мечеть · вечер</option><option value="mountains">Горы · тишина</option><option value="moon-mosque">Лунная мечеть</option><option value="desert-dawn">Рассвет в пустыне</option><option value="misty-lake">Тихое озеро</option><option value="rain-window">После дождя</option><option value="ocean-dusk">Море на закате</option><option value="mosque-arches">Свет сквозь арки</option><option value="olive-grove">Оливковая роща</option><option value="mountain-night">Ночь в горах</option><option value="lantern-courtyard">Тёплый свет</option><option value="garden-stream">Сад и ручей</option><option value="snow-forest">Зимняя тишина</option><option value="coastal-mosque">Мечеть у моря</option><option value="night">Ночной</option><option value="sand">Песочный</option><option value="blue">Глубокий синий</option></select></label><label><input type="checkbox" id="ayah-card-arabic" checked> Арабский текст</label><label><input type="checkbox" id="ayah-card-translation" checked> Перевод</label></div><div id="ayah-card-preview" aria-live="polite"></div><p id="ayah-card-status" class="muted"></p><div class="ayah-card-actions"><button class="button" id="ayah-card-send" disabled>Поделиться</button><button class="button secondary" id="ayah-card-save" disabled>Сохранить картинки</button><button class="text-button ayah-card-done" data-close>Готово</button></div>');
 const root=document.getElementById('modal-content'),preview=root.querySelector('#ayah-card-preview'),status=root.querySelector('#ayah-card-status'),send=root.querySelector('#ayah-card-send'),save=root.querySelector('#ayah-card-save');let canvases=[],readyFiles=[],generation=0;
 const backgroundChoice=root.querySelector('#ayah-card-theme');try{const saved=localStorage.getItem('salah-ayah-card-background');if(saved&&[...backgroundChoice.options].some(option=>option.value===saved))backgroundChoice.value=saved;}catch{}
 const regenerate=async()=>{const token=++generation;send.disabled=save.disabled=true;const options={format:root.querySelector('#ayah-card-format').value,theme:root.querySelector('#ayah-card-theme').value,arabic:root.querySelector('#ayah-card-arabic').checked,translation:root.querySelector('#ayah-card-translation').checked};if(!options.arabic&&!options.translation){preview.replaceChildren();status.textContent='Выберите арабский текст или перевод.';return;}try{const result=await renderCards(surah,verse,meta,options);if(token!==generation||!preview.isConnected)return;canvases=result;preview.dataset.format=options.format;const exported=await files();if(token!==generation||!preview.isConnected)return;readyFiles=exported;preview.replaceChildren(...result);status.textContent=result.length>1?'Полный аят на '+result.length+' карточках.':'Полный текст аята.';send.disabled=save.disabled=false;}catch{status.textContent='Не удалось создать карточку.';}};
 root.querySelectorAll('.ayah-card-options input,.ayah-card-options select').forEach(control=>control.onchange=()=>{if(control===backgroundChoice)try{localStorage.setItem('salah-ayah-card-background',backgroundChoice.value);}catch{}regenerate();});
 const files=async()=>Promise.all(canvases.map((canvas,i)=>new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(new File([blob],'SALAH-'+surah.number+'-'+verse.ayah+'-'+(i+1)+'.png',{type:'image/png'})):reject(Error()),'image/png'))));
 const download=file=>{const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=file.name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);};
 save.onclick=async()=>{try{for(const file of readyFiles)download(file);}catch{toast('Не удалось сохранить карточку');}};
 send.onclick=async()=>{try{const images=readyFiles;if(navigator.canShare?.({files:images}))await navigator.share({files:images,title:meta.name+' · '+surah.number+':'+verse.ayah});else{for(const file of images)download(file);toast('Картинки сохранены для отправки');}}catch(e){if(e.name!=='AbortError')toast('Не удалось отправить карточку. Попробуйте сохранить её.');}};
 regenerate();
}
