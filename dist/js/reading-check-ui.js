export{readingExamples}from './reading-check-core.js';
import{READING_CHECK_LETTERS,READING_REASONS,readingLetter,readingExamples,normalizeReadingCheck,normalizeReadingReview}from './reading-check-core.js';
import{t,subscribeLanguage,translateUi}from './i18n.js';
import{uiLeaf,uiAttribute,uiMessage,setUiMessage}from './ui.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const optionTextAttributes=(key,params={})=>'data-reading-option="'+esc(key)+'" data-reading-option-params="'+esc(JSON.stringify(params))+'"';
const setOptionText=(node,value)=>{if(node.firstChild?.nodeType===3)node.firstChild.data=value;else node.textContent=value;};
const letterKey=id=>'lessonUi.readingLetter'+id[0].toUpperCase()+id.slice(1);
export const readingLetterUiName=id=>readingLetter(id)?t(letterKey(id)):'';
const reasonKey=reason=>Object.hasOwn(READING_REASONS,reason)?'lessonUi.readingReason'+reason[0].toUpperCase()+reason.slice(1):'lessonUi.readingRetry';
export const readingReasonUiLabel=reason=>t(reasonKey(reason));
const heading=(id,format,tag='span',className='')=>'<'+tag+' class="'+className+'" data-reading-letter="'+esc(id)+'" data-reading-heading="'+format+'">'+esc(t(format==='after'?'lessonUi.readingAfterLetter':'lessonUi.readingReviewAfter',{letter:readingLetterUiName(id)}))+'</'+tag+'>';
const sourceErrors=new Map([
 ['Выберите пройденную букву и 10 или 15 сочетаний.','readingChooseError'],
 ['Добавьте арабские сочетания.','readingArabicError'],
 ['В каждом сочетании нужны арабские буквы и огласовки с выбранной буквой.','readingCombinationError'],
 ['Отметьте чтение каждого сочетания.','readingMarkEachError']
]);
export function readingErrorMessage(error){if(typeof error?.key==='string')return error;if(error?.uiMessage)return error.uiMessage;const raw=typeof error==='string'?error:error?.message||'',key=sourceErrors.get(raw);return key?uiMessage('lessonUi.'+key):raw;}
function validated(read){try{return read();}catch(error){const label=readingErrorMessage(error);if(typeof label==='object')error.uiMessage=label;throw error;}}
export function paintReadingUi(root){
 if(!root)return;translateUi(root);
 for(const node of root.querySelectorAll?.('[data-reading-heading]')||[])node.textContent=t(node.dataset.readingHeading==='after'?'lessonUi.readingAfterLetter':'lessonUi.readingReviewAfter',{letter:readingLetterUiName(node.dataset.readingLetter)});
 for(const node of root.querySelectorAll?.('[data-reading-option]')||[])setOptionText(node,t(node.dataset.readingOption,JSON.parse(node.dataset.readingOptionParams||'{}')));
 for(const node of root.querySelectorAll?.('[data-reading-letter-name]')||[]){const letter=readingLetter(node.dataset.readingLetterName);if(letter)setOptionText(node,letter[1]+' · '+readingLetterUiName(letter[0]));}
}
export function readingCheckMarkup(check,review=null){
 if(!check)return'';
 return '<section class="reading-check">'+heading(check.letterId,'after','span','reading-check-label')+'<h3>'+uiLeaf('lessonUi.readingTitle')+'</h3><p>'+uiLeaf('lessonUi.readingInstructions',{count:check.count})+'</p><ol class="reading-check-prompts">'+check.prompts.map((text,index)=>'<li><span class="reading-check-number">'+(index+1)+'</span><span class="reading-check-ar" lang="ar" dir="rtl" translate="no">'+esc(text)+'</span></li>').join('')+'</ol>'+(review?'<div class="reading-check-score"><strong>'+uiLeaf('lessonUi.readingResult',{correct:review.correctCount,count:review.count,mistakes:review.mistakeCount})+'</strong>'+(review.difficulties.length?'<p>'+uiLeaf('lessonUi.readingRepeatMarked')+'</p><ul>'+review.difficulties.map(item=>'<li><span class="reading-check-ar" lang="ar" dir="rtl" translate="no">'+esc(item.prompt)+'</span><span>'+uiLeaf(reasonKey(item.reason))+'</span></li>').join('')+'</ul>':'<p>'+uiLeaf('lessonUi.readingAllCorrectNote')+'</p>')+'</div>':'<p class="reading-check-note">'+uiLeaf('lessonUi.readingManualAssessment')+'</p>')+'</section>';
}
export function mountReadingCheckEditor(root,{initial=null,onChange=()=>{}}={}){
 let enabled=Boolean(initial),current=initial||{letterId:'mim',count:10,prompts:readingExamples('mim',10)};
 root.innerHTML='<section class="reading-check-editor"><label class="reading-check-toggle"><input type="checkbox" data-enable-reading '+(enabled?'checked':'')+'>'+uiLeaf('lessonUi.readingEnable')+'</label><p class="reading-check-note">'+uiLeaf('lessonUi.readingTeacherChoice')+'</p><div data-reading-options></div></section>';
 const toggle=root.querySelector('input'),options=root.querySelector('[data-reading-options]');
 function draw(){
  options.replaceChildren();if(!enabled)return;
  options.innerHTML='<div class="reading-check-fields"><label>'+uiLeaf('lessonUi.readingStudiedLetter')+'<select data-letter '+uiAttribute('lessonUi.readingStudiedLetter')+'>'+READING_CHECK_LETTERS.map(([id,char])=>'<option value="'+id+'"'+(id===current.letterId?' selected':'')+' data-reading-letter-name="'+id+'">'+esc(char+' · '+readingLetterUiName(id))+'</option>').join('')+'</select></label><label>'+uiLeaf('lessonUi.readingCount')+'<select data-count '+uiAttribute('lessonUi.readingCountAria')+'><option value="10"'+(current.count===10?' selected':'')+' '+optionTextAttributes('lessonUi.readingCombinations',{count:10})+'>'+esc(t('lessonUi.readingCombinations',{count:10}))+'</option><option value="15"'+(current.count===15?' selected':'')+' '+optionTextAttributes('lessonUi.readingCombinations',{count:15})+'>'+esc(t('lessonUi.readingCombinations',{count:15}))+'</option></select></label></div><p class="reading-check-note">'+uiLeaf('lessonUi.readingEditableNote')+'</p><div data-prompts class="reading-check-inputs"></div>';
  const rows=options.querySelector('[data-prompts]');
  current.prompts.forEach((value,i)=>{const label=root.ownerDocument.createElement('label');label.innerHTML=uiLeaf('lessonUi.readingCombinationIndex',{number:i+1})+'<input type="text" class="reading-check-ar" lang="ar" dir="rtl" translate="no" maxlength="24" value="'+esc(value)+'">';label.querySelector('input').oninput=event=>{current.prompts[i]=event.target.value;onChange();};rows.append(label);});
  options.querySelector('[data-letter]').onchange=event=>{current={letterId:event.target.value,count:current.count,prompts:readingExamples(event.target.value,current.count)};draw();onChange();};
  options.querySelector('[data-count]').onchange=event=>{const count=Number(event.target.value),examples=readingExamples(current.letterId,count);current={...current,count,prompts:Array.from({length:count},(_,i)=>current.prompts[i]||examples[i])};draw();onChange();};
 }
 toggle.onchange=()=>{enabled=toggle.checked;draw();onChange();};draw();
 const offLanguage=subscribeLanguage(()=>paintReadingUi(root));
 return{value:()=>validated(()=>enabled?normalizeReadingCheck(current):null),disable:()=>{enabled=false;toggle.checked=false;draw();onChange();},dispose:()=>{offLanguage();root.replaceChildren();}};
}
export function mountReadingReview(root,{check,initial=null}={}){
 if(!check)return{value:()=>null,dispose:()=>{}};
 const marks=Array.from({length:check.count},(_,i)=>initial?.marks?.[i]||null);
 root.innerHTML='<section class="reading-review">'+heading(check.letterId,'review','h4')+'<p>'+uiLeaf('lessonUi.readingReviewInstructions')+'</p><button type="button" class="lesson-text-button" data-all-correct>'+uiLeaf('lessonUi.readingMarkAllCorrect')+'</button><ol class="reading-review-items">'+check.prompts.map((text,index)=>'<li data-index="'+index+'"><div><span class="reading-check-number">'+(index+1)+'</span><span class="reading-check-ar" lang="ar" dir="rtl" translate="no">'+esc(text)+'</span></div><label>'+uiLeaf('lessonUi.readingOutcome')+'<select data-mark '+uiAttribute('lessonUi.readingOutcomeAria',{number:index+1})+'><option value="" '+optionTextAttributes('lessonUi.readingChoose')+'>'+esc(t('lessonUi.readingChoose'))+'</option><option value="correct" '+optionTextAttributes('lessonUi.readingCorrect')+'>'+esc(t('lessonUi.readingCorrect'))+'</option><option value="error" '+optionTextAttributes('lessonUi.readingRepeat')+'>'+esc(t('lessonUi.readingRepeat'))+'</option></select></label><label data-reason-label hidden>'+uiLeaf('lessonUi.readingDifficulty')+'<select data-reason>'+Object.keys(READING_REASONS).map(key=>'<option value="'+key+'" '+optionTextAttributes(reasonKey(key))+'>'+esc(readingReasonUiLabel(key))+'</option>').join('')+'</select></label></li>').join('')+'</ol><p data-score role="status">'+uiLeaf('lessonUi.readingNotChecked')+'</p></section>';
 const score=root.querySelector('[data-score]');
 function update(){
  root.querySelectorAll('[data-index]').forEach(item=>{const i=Number(item.dataset.index),mark=marks[i];item.querySelector('[data-mark]').value=mark?(mark.correct?'correct':'error'):'';item.querySelector('[data-reason-label]').hidden=!mark||mark.correct;if(mark?.reason)item.querySelector('[data-reason]').value=mark.reason;});
  const checked=marks.filter(Boolean),errors=checked.filter(mark=>!mark.correct).length;setUiMessage(score,uiMessage(checked.length?'lessonUi.readingCheckedErrors':'lessonUi.readingChecked',{checked:checked.length,count:check.count,errors}));
 }
 root.querySelectorAll('[data-index]').forEach(item=>{const index=Number(item.dataset.index);item.querySelector('[data-mark]').onchange=event=>{marks[index]=event.target.value?{correct:event.target.value==='correct',reason:event.target.value==='correct'?null:item.querySelector('[data-reason]').value}:null;update();};item.querySelector('[data-reason]').onchange=event=>{if(marks[index]&&!marks[index].correct)marks[index].reason=event.target.value;};});
 root.querySelector('[data-all-correct]').onclick=()=>{marks.fill(null);for(let i=0;i<marks.length;i++)marks[i]={correct:true,reason:null};update();};update();
 const offLanguage=subscribeLanguage(()=>paintReadingUi(root));
 return{value:()=>validated(()=>normalizeReadingReview(marks,check)),dispose:()=>{offLanguage();root.replaceChildren();}};
}
