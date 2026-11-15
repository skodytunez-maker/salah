// Explicit display adapters. Lesson IDs, dates, grades, source content and
// recorder/upload/player state are never changed here.
import{t,getLocale,translateUi,subscribeLanguage}from './i18n.js';
import{esc,uiMessage}from './ui.js';
export function lessonDateLabel(lesson,{zoneName=false}={}){
 if(!Number.isFinite(lesson?.startsAt))return t('lessonUi.cabinetTimePending');
 try{return new Intl.DateTimeFormat(getLocale(),{timeZone:lesson.timeZone,day:'numeric',month:'long',hour:'2-digit',minute:'2-digit',...(zoneName?{timeZoneName:'short'}:{})}).format(lesson.startsAt);}catch{return t('lessonUi.cabinetTimePending');}
}
export const lessonDueLabel=day=>new Intl.DateTimeFormat(getLocale(),{timeZone:'UTC',day:'numeric',month:'long',year:'numeric'}).format(Date.parse(day+'T12:00:00Z'));
export const lessonDateMarkup=(lesson,{zoneName=false}={})=>'<span data-lesson-ui-date="'+esc(JSON.stringify({startsAt:lesson.startsAt,timeZone:lesson.timeZone,zoneName}))+'">'+esc(lessonDateLabel(lesson,{zoneName}))+'</span>';
export const lessonDueMarkup=day=>'<span data-lesson-ui-due="'+esc(day)+'">'+esc(t('lessonUi.homeworkDue',{date:lessonDueLabel(day)}))+'</span>';
export function lessonErrorMessage(error,fallback=null){
 if(error&&typeof error.key==='string'&&error.key.startsWith('lessonUi.'))return error;
 if(error?.uiMessage&&typeof error.uiMessage.key==='string')return error.uiMessage;
 return typeof error==='string'?error:typeof error?.message==='string'&&error.message?error.message:fallback?uiMessage(fallback):'';
}
export const lessonErrorText=(error,fallback)=>{const value=lessonErrorMessage(error,fallback);return typeof value==='string'?value:t(value.key,value.params);};
export const lessonMessageMarkup=(value,fallback)=>{const message=lessonErrorMessage(value,fallback);return typeof message==='string'?esc(message):'<span data-i18n="'+esc(message.key)+'" data-i18n-params="'+esc(JSON.stringify(message.params||{}))+'">'+esc(t(message.key,message.params))+'</span>';};
export function lessonUiError(message,key){return Object.assign(Error(message),{uiMessage:uiMessage(key)});}
export function paintLessonsUi(root){
 if(!root)return;translateUi(root);
 for(const node of root.querySelectorAll?.('[data-lesson-ui-date]')||[])try{const value=JSON.parse(node.dataset.lessonUiDate);node.textContent=lessonDateLabel(value,{zoneName:value.zoneName===true});}catch{}
 for(const node of root.querySelectorAll?.('[data-lesson-ui-due]')||[])node.textContent=t('lessonUi.homeworkDue',{date:lessonDueLabel(node.dataset.lessonUiDue)});
}
export function bindLessonsUi(root,paint=()=>{}){const draw=()=>{paintLessonsUi(root);paint();};const off=subscribeLanguage(draw);draw();return off;}
