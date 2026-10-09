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

const themes={night:['#070b16','#15223c','#f5efe2','#dbc08e'],sand:['#f4ead7','#ddd0b6','#302b25','#80633c'],blue:['#071d25','#153d49','#eef5f3','#d9c89b']};
export function wrapCardText(ctx,text,width){
 const lines=[];let line='';
 for(const word of text.split(/\s+/)){const next=line?line+' '+word:word;if(line&&ctx.measureText(next).width>width){lines.push(line);line=word;}else line=next;}
 if(line)lines.push(line);return lines;
}
async function renderCards(surah,verse,meta,options){
 await document.fonts.ready;
 const width=1080,height=options.format==='story'?1920:1080,pad=100,rows=[];
 const short=verse.arabic.length+verse.translation.length<500;const arabicSize=short?68:52,translationSize=short?44:38;
 const measure=document.createElement('canvas').getContext('2d');
 if(options.arabic){measure.font=arabicSize+'px serif';for(const text of wrapCardText(measure,verse.arabic,width-pad*2))rows.push({text,arabic:true,height:arabicSize*1.65});}
 if(options.arabic&&options.translation)rows.push({text:'',height:48});
 if(options.translation){measure.font=translationSize+'px sans-serif';for(const text of wrapCardText(measure,verse.translation,width-pad*2))rows.push({text,arabic:false,height:translationSize*1.55});}
 const pages=[];let page=[],used=0;const capacity=height-470;
 for(const row of rows){if(used+row.height>capacity&&page.length){pages.push(page);page=[];used=0;}page.push(row);used+=row.height;}
 if(page.length)pages.push(page);
 const logo=new Image();logo.src='./favicon.svg';try{await logo.decode();}catch{}
 return pages.map((lines,i)=>{
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;canvas.setAttribute('role','img');canvas.setAttribute('aria-label',meta.name+', аят '+verse.ayah+', карточка '+(i+1));const ctx=canvas.getContext('2d'),colors=themes[options.theme];
  const bg=ctx.createLinearGradient(0,0,width,height);bg.addColorStop(0,colors[0]);bg.addColorStop(1,colors[1]);ctx.fillStyle=bg;ctx.fillRect(0,0,width,height);
  ctx.strokeStyle=colors[3];ctx.globalAlpha=.35;ctx.lineWidth=2;ctx.strokeRect(48,48,width-96,height-96);ctx.globalAlpha=1;
  ctx.fillStyle=colors[3];ctx.textAlign='left';ctx.direction='ltr';ctx.font='24px sans-serif';ctx.fillText('КОРАН · '+surah.number+':'+verse.ayah,pad,135);
  ctx.fillStyle=colors[2];let y=230+Math.max(0,(capacity-lines.reduce((n,r)=>n+r.height,0))/2);
  for(const row of lines){ctx.direction=row.arabic?'rtl':'ltr';ctx.textAlign=row.arabic?'right':'left';ctx.font=row.arabic?arabicSize+'px serif':translationSize+'px sans-serif';ctx.fillText(row.text,row.arabic?width-pad:pad,y);y+=row.height;}
  ctx.direction='ltr';ctx.textAlign='left';ctx.font='28px sans-serif';ctx.fillStyle=colors[3];ctx.fillText(meta.name+(pages.length>1?' · '+(i+1)+'/'+pages.length:''),pad,height-210);
  if(options.translation){ctx.font='20px sans-serif';ctx.fillText('Перевод Эльмира Кулиева',pad,height-170);}
  if(logo.complete&&logo.naturalWidth)ctx.drawImage(logo,pad,height-130,64,64);
  ctx.font='26px serif';ctx.fillText('SALAH',pad+84,height-91);ctx.textAlign='right';ctx.font='18px sans-serif';ctx.fillText('skodytunez-maker.github.io/salah',width-pad,height-91);
  return canvas;
 });
}
export function showAyahCard(surah,verse,meta){
 modal('<div class="modal-heading"><h2>Поделиться аятом</h2><button class="text-button" data-close>Закрыть</button></div><div class="ayah-card-options"><label>Формат<select id="ayah-card-format"><option value="story">Сторис · 9:16</option><option value="square">Квадрат · 1:1</option></select></label><label>Фон<select id="ayah-card-theme"><option value="night">Ночной</option><option value="sand">Песочный</option><option value="blue">Глубокий синий</option></select></label><label><input type="checkbox" id="ayah-card-arabic" checked> Арабский текст</label><label><input type="checkbox" id="ayah-card-translation" checked> Перевод</label></div><div id="ayah-card-preview" aria-live="polite"></div><p id="ayah-card-status" class="muted"></p><div class="ayah-card-actions"><button class="button" id="ayah-card-send" disabled>Поделиться</button><button class="button secondary" id="ayah-card-save" disabled>Сохранить картинки</button></div>');
 const root=document.getElementById('modal-content'),preview=root.querySelector('#ayah-card-preview'),status=root.querySelector('#ayah-card-status'),send=root.querySelector('#ayah-card-send'),save=root.querySelector('#ayah-card-save');let canvases=[],readyFiles=[],generation=0;
 const regenerate=async()=>{const token=++generation;send.disabled=save.disabled=true;const options={format:root.querySelector('#ayah-card-format').value,theme:root.querySelector('#ayah-card-theme').value,arabic:root.querySelector('#ayah-card-arabic').checked,translation:root.querySelector('#ayah-card-translation').checked};if(!options.arabic&&!options.translation){preview.replaceChildren();status.textContent='Выберите арабский текст или перевод.';return;}try{const result=await renderCards(surah,verse,meta,options);if(token!==generation||!preview.isConnected)return;canvases=result;preview.dataset.format=options.format;const exported=await files();if(token!==generation||!preview.isConnected)return;readyFiles=exported;preview.replaceChildren(...result);status.textContent=result.length>1?'Полный аят на '+result.length+' карточках.':'Полный текст аята.';send.disabled=save.disabled=false;}catch{status.textContent='Не удалось создать карточку.';}};
 root.querySelectorAll('.ayah-card-options input,.ayah-card-options select').forEach(control=>control.onchange=regenerate);
 const files=async()=>Promise.all(canvases.map((canvas,i)=>new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(new File([blob],'SALAH-'+surah.number+'-'+verse.ayah+'-'+(i+1)+'.png',{type:'image/png'})):reject(Error()),'image/png'))));
 const download=file=>{const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=file.name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);};
 save.onclick=async()=>{try{for(const file of readyFiles)download(file);}catch{toast('Не удалось сохранить карточку');}};
 send.onclick=async()=>{try{const images=readyFiles;if(navigator.canShare?.({files:images}))await navigator.share({files:images,title:meta.name+' · '+surah.number+':'+verse.ayah});else{for(const file of images)download(file);toast('Картинки сохранены для отправки');}}catch(e){if(e.name!=='AbortError')toast('Не удалось отправить карточку. Попробуйте сохранить её.');}};
 regenerate();
}
