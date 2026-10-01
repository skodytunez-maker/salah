export const RECITERS=[
{id:'ar.alafasy',name:'Мишари аль-Афаси',format:'verse'},
{id:'ar.husary',name:'Махмуд Халиль аль-Хусари',format:'verse'},
{id:'ar.minshawi',name:'Мухаммад Сиддик аль-Миншави',format:'verse'},
{id:'ar.yasseraldossari',name:'Ясир ад-Даусари',format:'verse',folder:'Yasser_Ad-Dussary_128kbps'},
{id:'ar.mahermuaiqly',name:'Махер аль-Мувайкли',format:'verse',folder:'MaherAlMuaiqly128kbps'},
{id:'ar.badralturki',name:'Бадр ат-Турки',format:'surah',server:'https://server10.mp3quran.net/bader/Rewayat-Hafs-A-n-Assem/'}
];
export function reciterInfo(id){const r=RECITERS.find(r=>r.id===id);if(!r)throw Error('Неизвестный чтец');return r}
