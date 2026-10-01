const escapeHtml=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const TAJWEED_RULES={
h:['silent','Хамзат аль-васл','Соединительная хамза: произношение зависит от начала или продолжения чтения.'],
s:['silent','Непроизносимая буква','В этом месте разметка источника отмечает непроизносимую букву.'],
l:['silent','Солнечный лям','Лям артикля сливается со следующей солнечной буквой.'],
n:['madd','Естественное удлинение','Долгий гласный: 2 счёта.'],
p:['madd-p','Допустимое удлинение','В источнике отмечено допустимое удлинение: 2, 4 или 6 счётов; длительность зависит от способа чтения.'],
m:['madd-m','Необходимое удлинение','Удлинение на 6 счётов.'],
o:['madd-o','Обязательное удлинение','Удлинение на 4–5 счётов.'],
q:['qalqalah','Калькаля','Отзвук отмеченного согласного с сукуном.'],
c:['ikhfa','Ихфа шафави','Скрытое произношение мима перед ба с носовым звучанием.'],
f:['ikhfa','Ихфа','Скрытое произношение нуна или танвина с носовым звучанием.'],
w:['idgham','Идгам шафави','Слияние мима со следующим мимом с носовым звучанием.'],
i:['iqlab','Икляб','Нун или танвин перед ба переходит в мим с носовым звучанием.'],
a:['idgham','Идгам с гунной','Слияние с носовым звучанием.'],
u:['idgham','Идгам без гунны','Слияние без носового звучания.'],
d:['silent','Идгам мутаджанисайн','Слияние букв с общим местом образования.'],
b:['silent','Идгам мутакарибайн','Слияние букв с близкими местами образования.'],
g:['ghunnah','Гунна','Носовое звучание на 2 счёта.']
};
export function parseTajweed(source){
 const parts=[],stack=[];let text='',active;
 const flush=()=>{if(text){parts.push(active?{text,rule:active}:{text});text=''}};
 for(let i=0;i<source.length;){
  if(source[i]==='['){
   const bare=/^\[([\u0600-\u06ff]+)\]/.exec(source.slice(i));if(bare){text+=bare[1];i+=bare[0].length;continue}
   const match=/^\[([a-z])(?::\d+)?\[/.exec(source.slice(i));
   if(!match||!TAJWEED_RULES[match[1]])throw Error('Неизвестная разметка таджвида');
   flush();stack.push(match[1]);active=stack.at(-1);i+=match[0].length;
  }else if(source[i]===']'){
   if(!stack.length)throw Error('Неполная разметка таджвида');
   flush();stack.pop();active=stack.at(-1);i++;
  }else{text+=source[i++];}
 }
 flush();if(stack.length)throw Error('Неполная разметка таджвида');return parts;
}
export function arabicWithHints(verse){
 if(!verse.tajweed)return escapeHtml(verse.arabic);
 try{return parseTajweed(verse.tajweed).map(p=>p.rule?'<span class="tajweed-'+TAJWEED_RULES[p.rule][0]+'" data-tajweed-rule="'+p.rule+'" tabindex="0" role="button" aria-label="'+escapeHtml(TAJWEED_RULES[p.rule][1])+'" title="'+escapeHtml(TAJWEED_RULES[p.rule][1])+'">'+escapeHtml(p.text)+'</span>':escapeHtml(p.text)).join('')}catch{return escapeHtml(verse.arabic)}
}
export function hintsLegend(){return '<details class="quran-hint-guide"><summary>Цветовые подсказки</summary><div class="quran-hint-legend"><span class="tajweed-madd">Удлинение</span><span class="tajweed-ghunnah">Гунна</span><span class="tajweed-ikhfa">Ихфа</span><span class="tajweed-idgham">Идгам</span><span class="tajweed-iqlab">Икляб</span><span class="tajweed-qalqalah">Калькаля</span><span class="tajweed-silent">Непроизносимые буквы и слияние</span></div><p>Нажмите цветной фрагмент арабского текста, чтобы открыть правило.</p><a href="https://alquran.cloud/tajweed-guide" target="_blank" rel="noopener">Разметка Al Quran Cloud</a></details>'}
