const previews=Object.freeze({
 'online-lessons':{href:'#knowledge?view=online-lessons',label:'Открыть занятия',detail:'С преподавателем'},
 muallim:{href:'#knowledge?view=muallim',label:'Начать обучение',detail:'Пошаговый курс'},
 'live-stream':{href:'#knowledge?view=live-stream',label:'Перейти к эфиру',detail:'Трансляции'}
});
export function ownerLearningPreview(id,verified=false){return verified===true?previews[id]||null:null;}
