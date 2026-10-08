// Audio sessions need verse positions, not downloaded reading text.
export function reciterRecording(index,number){
 const meta=index?.surahs?.find(s=>s.number===number);
 if(!meta||!Number.isInteger(number)||number<1||number>114||!Number.isInteger(meta.ayahs)||meta.ayahs<1)throw Error('Неизвестная сура');
 const offset=index.surahs.slice(0,number-1).reduce((sum,s)=>sum+s.ayahs,0);
 if(!Number.isInteger(offset)||offset<0||offset+meta.ayahs>6236)throw Error('Неверные позиции аятов');
 return {number,verses:Array.from({length:meta.ayahs},(_,i)=>({number:offset+i+1,ayah:i+1}))};
}
