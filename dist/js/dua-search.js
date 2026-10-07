const groups=[
 ['travel',/^(дорог|поезд|путешеств|пут[ьи]|самолет|пол[её]т|рейс|транспорт)/],
 ['parents',/^(родител|мам|пап|матер|отец|отц)/],
 ['distress',/^(тревог|тревож|беспоко|пережив|грус|грущ|печал|стресс|волнен)/],
 ['health',/^(болез|боле|больн|исцел|лечен|здоров)/],
 ['decision',/^(решен|выбор|выбира|выбра|истихар|сомнева)/],
 ['sleep',/^(сон|сном|спать|засып|постел|ноч[ьи])/],
 ['anger',/^(гнев|злос|раздраж|сердит)/],
 ['forgive',/^(прощ|прост|покаян|грех)/],
 ['knowledge',/^(знани|учеб|учени|учиться|обуч)/],
 ['food',/^(ед[аыуе]|пищ|куша|обед|завтрак|ужин)/]
];
const stop=new Set(['дуа','молитва','мольба','для','перед','после','когда','при','о','об','от','за','на','в','во','и','про','мне','меня','моих','моего','своих','хочу','нужно','как','что','читать','почитать','сказать','очень','мою','моей','моему']);
export const searchWords=value=>String(value||'').normalize('NFKC').toLocaleLowerCase('ru').replace(/ё/g,'е').replace(/[‘’']/g,'').split(/[^\p{L}\p{N}]+/u).filter(Boolean);
const concept=word=>groups.find(([,expression])=>expression.test(word))?.[0]||word;
export function matchesDuaSituation(query,content){
 const wanted=searchWords(query).filter(word=>!stop.has(word)).map(concept);if(!wanted.length)return false;
 const found=searchWords(content).map(concept);
 return wanted.every(word=>found.some(value=>word===value||word.length>=4&&value.startsWith(word)));
}
