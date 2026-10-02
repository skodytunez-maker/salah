export const RECITERS=[
{id:'ar.alafasy',name:'Мишари аль-Афаси',format:'verse'},
{id:'ar.husary',name:'Махмуд Халиль аль-Хусари',format:'verse'},
{id:'ar.minshawi',name:'Мухаммад Сиддик аль-Миншави',format:'verse'},
{id:'ar.yasseraldossari',name:'Ясир ад-Даусари',format:'verse',folder:'Yasser_Ad-Dussary_128kbps'},
{id:'ar.mahermuaiqly',name:'Махер аль-Мувайкли',format:'verse',folder:'MaherAlMuaiqly128kbps'},
{id:'ar.badralturki',name:'Бадр ат-Турки',format:'surah',server:'https://server10.mp3quran.net/bader/Rewayat-Hafs-A-n-Assem/'},
{"id":"ar.muhammadalluhaidan","name":"Мухаммад Люхайдан","format":"surah","server":"https://server8.mp3quran.net/lhdan/","source":"https://www.mp3quran.net/eng/lhdan","sourceApi":"https://www.mp3quran.net/api/v3/reciters?language=eng&reciter=107","verifiedOn":"2026-10-02"},
{"id":"ar.tariqmuhammad","name":"Тарик Мухаммад","format":"surah","server":"https://ia601507.us.archive.org/5/items/Tareq-Mohammad/","availableSurahs":[1,2,12,13,14,15,18,19,20,23,25,29,31,32,36,38,44,45,47,49,50,51,52,53,55,56,60,61,62,63,64,67,68,72,73,75,76,78,79,80,81,82,83,84,85,86],"source":"https://surahquran.com/quran-mp3-qari-23.html","verifiedOn":"2026-10-02"}
];
export function reciterInfo(id){const r=RECITERS.find(r=>r.id===id);if(!r)throw Error('Неизвестный чтец');return r}

export function reciterHasSurah(id,number){const r=reciterInfo(id);return !r.availableSurahs||r.availableSurahs.includes(number)}
export function adjacentReciterSurah(id,number,delta){if(![-1,1].includes(delta))return null;for(let n=number+delta;n>=1&&n<=114;n+=delta)if(reciterHasSurah(id,n))return n;return null}
