// Demonstration data only; never a real contest or user score.
export function radioQuizQuestions(index){
 const chapters=index?.surahs||[],first=chapters.find(x=>x.number===1),last=chapters.find(x=>x.number===114),shortest=chapters.find(x=>x.number===108);
 if(chapters.length!==114||!first||!last||!shortest||index?.juz?.length!==30)throw Error('Не удалось проверить вопросы');
 return [
  {text:'Сколько сур в Коране?',answer:String(chapters.length),source:'Оглавление Корана'},
  {text:'На сколько джузов разделён Коран?',answer:String(index.juz.length),source:'Деление Корана на джузы'},
  {text:'Как называется первая сура Корана?',answer:first.name,source:'Коран, сура 1'},
  {text:'Как называется последняя сура Корана?',answer:last.name,source:'Коран, сура 114'},
  {text:'Сколько аятов в суре «Аль-Каусар»?',answer:String(shortest.ayahs),source:'Коран, сура 108'}
 ];
}
export function initialRadioQuiz(){return {round:0,phase:'ready',first:null,scores:[0,0]};}
export function stepRadioQuiz(state,event){
 if(event.type==='reset')return initialRadioQuiz();
 if(state.phase==='ready'&&event.type==='show')return {...state,phase:'question'};
 if(state.phase==='question'&&event.type==='open')return {...state,phase:'answers'};
 if(state.phase==='answers'&&event.type==='buzz'&&[0,1].includes(event.player))return {...state,phase:'locked',first:event.player};
 if(state.phase==='locked'&&event.type==='reveal')return {...state,phase:'review'};
 if(state.phase==='review'&&event.type==='judge'){
  const scores=state.scores.map((score,i)=>score+(event.correct===true&&i===state.first?1:0));
  return {...state,scores,phase:'scored'};
 }
 if(state.phase==='scored'&&event.type==='next')return {...state,round:state.round+1,phase:state.round>=4?'finished':'ready',first:null};
 return state;
}
