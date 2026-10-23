// Educational selection; provenance and editorial policy: docs/allah-names-sources.md.
const q=(surah,ayah)=>Object.freeze({label:'Коран · '+surah+':'+ayah,url:'https://quran.com/'+surah+'/'+ayah});
const sunnah=Object.freeze({label:'Имена из Сунны · «Аль-Каваид аль-мусля»',url:'https://www.islamarchive.cc/ketab_content/6215/p-20'});
const rows=[
['allah','اللَّه','Аллах','Единственный, достойный поклонения',1,1],
['ahad','الْأَحَد','Аль-Ахад','Единственный, не имеющий равных',112,1],
['ala','الْأَعْلَى','Аль-А‘ля','Наивысший',87,1],
['akram','الْأَكْرَم','Аль-Акрам','Наищедрейший',96,3],
['ilah','الْإِلَه','Аль-Илях','Бог, достойный поклонения',2,163],
['awwal','الْأَوَّل','Аль-Аууаль','Первый, до Которого ничего не было',57,3],
['akhir','الْآخِر','Аль-Ахир','Последний, после Которого ничего не будет',57,3],
['zahir','الظَّاهِر','Аз-Захир','Высочайший, над Которым ничего нет',57,3],
['batin','الْبَاطِن','Аль-Батын','Ближайший, от Которого ничто не скрыто',57,3],
['bari','الْبَارِئ','Аль-Бари’','Создающий творения',59,24],
['barr','الْبَرّ','Аль-Барр','Благодетельный',52,28],
['basir','الْبَصِير','Аль-Басыр','Всевидящий',42,11],
['tawwab','التَّوَّاب','Ат-Таууаб','Принимающий покаяние',2,37],
['jabbar','الْجَبَّار','Аль-Джаббар','Всеподчиняющий',59,23],
['hafiz','الْحَافِظ','Аль-Хафиз','Хранящий',12,64],
['hasib','الْحَسِيب','Аль-Хасиб','Ведущий полный расчёт',4,6],
['hafizh','الْحَفِيظ','Аль-Хафиз','Оберегающий всё сущее',11,57],
['haqq','الْحَقّ','Аль-Хакк','Истинный',22,6],
['mubin','الْمُبِين','Аль-Мубин','Явный',24,25],
['hakim','الْحَكِيم','Аль-Хаким','Мудрый',2,32],
['halim','الْحَلِيم','Аль-Халим','Выдержанный, не спешащий с наказанием',2,225],
['hamid','الْحَمِيد','Аль-Хамид','Достойный всякой хвалы',14,1],
['hayy','الْحَيّ','Аль-Хайй','Вечно Живой',2,255],
['qayyum','الْقَيُّوم','Аль-Каййум','Поддерживающий существование всего',2,255],
['khabir','الْخَبِير','Аль-Хабир','Ведающий о сокровенном',6,18],
['khaliq','الْخَالِق','Аль-Халик','Творец',59,24],
['khallaq','الْخَلَّاق','Аль-Халляк','Непрестанно Творящий',15,86],
['rauf','الرَّؤُوف','Ар-Рауф','Сострадательный',9,117],
['rahman','الرَّحْمَٰن','Ар-Рахман','Всемилостивый',1,3],
['rahim','الرَّحِيم','Ар-Рахим','Милующий',1,3],
['razzaq','الرَّزَّاق','Ар-Раззак','Наделяющий уделом',51,58],
['raqib','الرَّقِيب','Ар-Ракиб','Наблюдающий за всем',4,1],
['salam','السَّلَام','Ас-Салям','Пречистый от всякого недостатка',59,23],
['sami','السَّمِيع','Ас-Сами‘','Всеслышащий',42,11],
['shakir','الشَّاكِر','Аш-Шакир','Благодарный за добро рабов',2,158],
['shakur','الشَّكُور','Аш-Шакур','Многократно воздающий за добро',35,30],
['shahid','الشَّهِيد','Аш-Шахид','Свидетель всего',4,79],
['samad','الصَّمَد','Ас-Самад','Тот, в Ком нуждаются все',112,2],
['alim','الْعَالِم','Аль-‘Алим','Знающий сокровенное и явное',6,73],
['aziz','الْعَزِيز','Аль-‘Азиз','Могущественный, Непобедимый',59,23],
['azim','الْعَظِيم','Аль-‘Азым','Великий',2,255],
['afuw','الْعَفُوّ','Аль-‘Афуу','Стирающий грехи',4,149],
['aleem','الْعَلِيم','Аль-‘Алим','Всезнающий',2,32],
['ali','الْعَلِيّ','Аль-‘Алийй','Возвышенный',2,255],
['ghaffar','الْغَفَّار','Аль-Гаффар','Многократно Прощающий',20,82],
['ghafur','الْغَفُور','Аль-Гафур','Всепрощающий',39,53],
['ghani','الْغَنِيّ','Аль-Ганийй','Ни в ком не нуждающийся',35,15],
['fattah','الْفَتَّاح','Аль-Фаттах','Открывающий, Справедливо Решающий',34,26],
['qadir','الْقَادِر','Аль-Кадир','Способный на всё',6,65],
['qahir','الْقَاهِر','Аль-Кахир','Властвующий над Своими рабами',6,18],
['quddus','الْقُدُّوس','Аль-Куддус','Святой, Пречистый',59,23],
['qadeer','الْقَدِير','Аль-Кадир','Всемогущий',67,1],
['qarib','الْقَرِيب','Аль-Кариб','Близкий',2,186],
['qawi','الْقَوِيّ','Аль-Кауийй','Всесильный',22,40],
['qahhar','الْقَهَّار','Аль-Каххар','Всепокоряющий',13,16],
['kabir','الْكَبِير','Аль-Кабир','Превеликий',13,9],
['karim','الْكَرِيم','Аль-Карим','Щедрый',82,6],
['latif','اللَّطِيف','Аль-Лятыф','Добрый к рабам, Знающий тонкости всего',67,14],
['mumin','الْمُؤْمِن','Аль-Му’мин','Дарующий безопасность',59,23],
['mutaali','الْمُتَعَالِي','Аль-Мута‘али','Превознесённый',13,9],
['mutakabbir','الْمُتَكَبِّر','Аль-Мутакаббир','Обладающий истинным величием',59,23],
['matin','الْمَتِين','Аль-Матин','Обладающий несокрушимой силой',51,58],
['mujib','الْمُجِيب','Аль-Муджиб','Отвечающий на мольбы',11,61],
['majid','الْمَجِيد','Аль-Маджид','Преславный',11,73],
['muhit','الْمُحِيط','Аль-Мухит','Объемлющий всё',4,126],
['musawwir','الْمُصَوِّر','Аль-Мусаууир','Придающий творениям облик',59,24],
['muqtadir','الْمُقْتَدِر','Аль-Муктадир','Обладающий совершенным могуществом',54,55],
['muqit','الْمُقِيت','Аль-Мукит','Обеспечивающий творения всем необходимым',4,85],
['malik','الْمَلِك','Аль-Малик','Царь',59,23],
['maleek','الْمَلِيك','Аль-Малик','Всевластный Царь',54,55],
['mawla','الْمَوْلَى','Аль-Мауля','Покровитель и Защитник',8,40],
['muhaymin','الْمُهَيْمِن','Аль-Мухаймин','Хранитель, Наблюдающий за творениями',59,23],
['nasir','النَّصِير','Ан-Насыр','Помогающий',8,40],
['wahid','الْوَاحِد','Аль-Уахид','Единый',13,16],
['warith','الْوَارِث','Аль-Уарис','Наследующий всё после гибели творений',15,23],
['wasi','الْوَاسِع','Аль-Уаси‘','Всеобъемлющий',2,115],
['wadud','الْوَدُود','Аль-Уадуд','Любящий',85,14],
['wakil','الْوَكِيل','Аль-Уакиль','Попечитель, на Которого полагаются',3,173],
['wali','الْوَلِيّ','Аль-Уалийй','Покровитель верующих',42,9],
['wahhab','الْوَهَّاب','Аль-Уаххаб','Безвозмездно Дарующий',3,8],
['jamil','الْجَمِيل','Аль-Джамиль','Прекрасный'],
['jawad','الْجَوَاد','Аль-Джауад','Щедро Одаряющий'],
['hakam','الْحَكَم','Аль-Хакам','Судья'],
['hayiy','الْحَيِيّ','Аль-Хайийй','Стыдливый'],
['rabb','الرَّبّ','Ар-Рабб','Господь'],
['rafiq','الرَّفِيق','Ар-Рафык','Мягкий'],
['subbuh','السُّبُّوح','Ас-Суббух','Пресвятой'],
['sayyid','السَّيِّد','Ас-Саййид','Господин'],
['shafi','الشَّافِي','Аш-Шафи','Исцеляющий'],
['tayyib','الطَّيِّب','Ат-Таййиб','Благой, Чистый'],
['qabid','الْقَابِض','Аль-Кабид','Сужающий удел по Своей мудрости'],
['basit','الْبَاسِط','Аль-Басыт','Расширяющий удел по Своей мудрости'],
['muqaddim','الْمُقَدِّم','Аль-Мукаддим','Выдвигающий вперёд'],
['muakhkhir','الْمُؤَخِّر','Аль-Му’аххир','Отодвигающий'],
['muti','الْمُعْطِي','Аль-Му‘ты','Дающий'],
['mannan','الْمَنَّان','Аль-Маннан','Оказывающий великие милости'],
['witr','الْوِتْر','Аль-Уитр','Единственный, Нечётный'],
['malik-mulk','مَالِك الْمُلْك','Малик аль-Мульк','Владыка всей власти',3,26],
['dhul-jalal','ذُو الْجَلَالِ وَالْإِكْرَام','Зу-ль-Джаляли уа-ль-Икрам','Обладатель величия и щедрости',55,27]
];
export const ALLAH_NAMES=Object.freeze(rows.map(([id,arabic,name,meaning,surah,ayah],index)=>Object.freeze({id,arabic,name,meaning,index,source:surah?q(surah,ayah):sunnah})));
export const NAMES_COUNT=ALLAH_NAMES.length;
export const NAMES_PROGRESS_KEY='allah-names-progress';
const byId=new Map(ALLAH_NAMES.map(n=>[n.id,n]));
export const nameById=id=>typeof id==='string'?byId.get(id)||null:null;
export function normalizeNamesProgress(v){
 return {version:1,last:nameById(v?.last)?.id||null,reviewed:Array.isArray(v?.reviewed)?[...new Set(v.reviewed.filter(id=>nameById(id)))].slice(0,NAMES_COUNT):[]};
}
export function validNamesProgress(v){
 return !!v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).every(k=>['version','last','reviewed'].includes(k))&&v.version===1&&(v.last===null||!!nameById(v.last))&&Array.isArray(v.reviewed)&&v.reviewed.length<=NAMES_COUNT&&new Set(v.reviewed).size===v.reviewed.length&&v.reviewed.every(id=>!!nameById(id));
}
export function reviewName(progress,id){
 const p=normalizeNamesProgress(progress);if(!nameById(id))return p;
 return {...p,last:id,reviewed:p.reviewed.includes(id)?p.reviewed.filter(x=>x!==id):[...p.reviewed,id]};
}
export const normalizeNameSearch=v=>String(v??'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed]/g,'').replace(/[أإآٱ]/g,'ا').replace(/ё/g,'е').replace(/[‘’'ʼ\-\s]/g,'');
export function findNames(query){
 const needle=normalizeNameSearch(query);return ALLAH_NAMES.filter(n=>normalizeNameSearch(n.arabic+' '+n.name+' '+n.meaning).includes(needle));
}
// Closely related meanings must not compete as distractors.
const families=[
 ['allah','ilah','ahad','wahid','witr'],['ala','ali','mutaali','zahir'],
 ['akram','karim','jawad','wahhab','muti','mannan','barr','basit','razzaq','muqit'],
 ['bari','khaliq','khallaq','musawwir'],['hafiz','hafizh','muhaymin','raqib','shahid','mumin','mawla','wali','wakil','nasir'],
 ['hasib','hakam','fattah'],['salam','quddus','subbuh','tayyib'],['alim','aleem','khabir','latif','muhit','wasi'],
 ['rahman','rahim','rauf','wadud','rafiq','halim'],['shakir','shakur'],
 ['aziz','qawi','matin','qadir','qadeer','muqtadir','jabbar','qahir','qahhar'],
 ['afuw','ghaffar','ghafur','tawwab'],['azim','kabir','mutakabbir','majid','dhul-jalal'],
 ['malik','maleek','malik-mulk','rabb','sayyid'],['hamid','majid'],
 ['qarib','batin'],['hayy','qayyum','ghani','samad']
];
export function comparableNames(a,b){return a===b||families.some(f=>f.includes(a)&&f.includes(b));}
function shuffled(values,random){
 const a=[...values];for(let i=a.length-1;i>0;i--){const v=Number(random()),j=Math.floor((Number.isFinite(v)?Math.max(0,Math.min(0.999999999,v)):0)*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;
}
export function createNamesQuiz(progress,{start=null,random=Math.random}={}){
 const p=normalizeNamesProgress(progress),first=nameById(start),pool=p.reviewed.length>=5?p.reviewed.map(nameById):ALLAH_NAMES;
 const targets=first?[first,...shuffled(ALLAH_NAMES.filter(n=>n!==first),random).slice(0,4)]:shuffled(pool,random).slice(0,5);
 return targets.map(target=>{
  const others=shuffled(ALLAH_NAMES.filter(n=>!comparableNames(target.id,n.id)),random).slice(0,3);
  return Object.freeze({target,choices:Object.freeze(shuffled([target,...others],random))});
 });
}
