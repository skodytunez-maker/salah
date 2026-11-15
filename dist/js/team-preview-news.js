import{subscribeLanguage,translateUi}from './i18n.js';
import{teamLeaf,teamAttr}from './team-ui.js';
import{teamPreviewVerified,verifiedTeamPreviewId,onTeamPreviewChange}from './team-preview-access.js';
import{modal,esc}from './ui.js';
import{bindIllustratedRelease}from './release-gallery.js';
export const TEAM_PREVIEW_NEWS=Object.freeze({version:484,cards:[
 {id:'radio',title:'Радио SALAH',text:'Соберите час коротких сур, послушайте выбранную запись и попробуйте викторину. Общий прямой эфир ещё не запущен.',where:'Главная → Радио',href:'#radio'},
 {id:'teacher',title:'Кабинет преподавателя',text:'Посмотрите расписание, учебную группу, задания и пример обратной связи. Здесь примерные данные для знакомства с кабинетом.',where:'Знания → Кабинет преподавателя',href:'#knowledge?view=teacher-preview'},
 {id:'muallim',title:'Муаллим Сани',text:'Познакомьтесь с пошаговым курсом: буквы, огласовки, упражнения и небольшие тесты. Прогресс сохраняется на этом устройстве.',where:'Знания → Муаллим Сани',href:'#knowledge?view=muallim'},
 {id:'live',title:'Прямой эфир',text:'Посмотрите экран будущих лекций и общих разборов с преподавателем. Настоящая трансляция пока не запущена.',where:'Знания → Прямой эфир',href:'#knowledge?view=live-stream'},
 {id:'lessons',title:'Онлайн-занятия',text:'Познакомьтесь с экраном занятия: видео преподавателя и учебный материал. Для администраторов открыт учебный пример без реальных учеников.',where:'Знания → Онлайн-занятия',href:'#knowledge?view=online-lessons'}
]});
const key=id=>'salah:team-features-understood-v1:'+id;
const teamMotionMarkup=id=>{
 if(id==='radio'){
  const heights=[15,28,43,22,51,35,17,39,25,46,18,30],from=[.7,.95,.6,.85,.65,.95,.7,.65,.9,.6,.85,.7],middle=[1,.6,.95,.65,1,.6,.95,1,.65,.9,.6,1],to=[.65,1,.7,1,.6,.9,.65,.7,1,.7,.95,.65];
  return '<span class="release-team-equalizer">'+heights.map((height,index)=>'<span class="release-team-eq-bar" data-release-motion-part="element" style="left:'+((4+index*22)/260*100)+'%;height:'+(height/58*100)+'%;--team-eq-from:'+from[index]+';--team-eq-middle:'+middle[index]+';--team-eq-to:'+to[index]+'"></span>').join('')+'</span>';
 }
 if(id==='teacher')return '<span class="release-team-teacher-check"><svg viewBox="0 0 30 30" aria-hidden="true"><circle cx="15" cy="15" r="14.5" fill="#29384f" stroke="#bba87d"/><path class="release-team-check-stroke" data-release-motion-part="element" d="m7 15 5 5 10-11" fill="none" stroke="#dfca96" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';
 if(id==='muallim')return '<span class="release-team-muallim-progress"><span data-release-motion-part="element"></span></span>';
 if(id==='live')return '<span class="release-team-live-indicator"><svg viewBox="0 0 20 20" aria-hidden="true"><circle class="release-team-live-ring" data-release-motion-part="element" cx="10" cy="10" r="8.5" fill="none" stroke="#d8c493"/><circle cx="10" cy="10" r="3" fill="#d8c493"/></svg></span>';
 if(id==='lessons')return '<span class="release-team-lesson-focus"><span class="release-team-lesson-cursor" data-release-motion-part="element"></span></span>';
 return '';
};
export function teamPreviewNewsMarkup(){return '<div class="release-gallery"><div class="release-gallery-strip" tabindex="0" '+teamAttr('newsSections',{},'aria-label')+'>'+TEAM_PREVIEW_NEWS.cards.map(card=>'<article class="release-feature"><div class="release-new-art release-team-art" aria-hidden="true"><div class="release-team-demo release-team-'+card.id+' release-motion-preview"><img src="./assets/updates/team-'+card.id+'-484.svg" alt="">'+teamMotionMarkup(card.id)+'</div></div><h3 lang="ru" dir="ltr" translate="no">'+esc(card.title)+'</h3><p lang="ru" dir="ltr" translate="no">'+esc(card.text)+'</p><p class="release-feature-note" lang="ru" dir="ltr" translate="no">'+esc(card.where)+'</p></article>').join('')+'</div><div class="release-gallery-controls"><button type="button" data-release-prev '+teamAttr('previousCard',{},'aria-label')+'><img src="./assets/arrow-left.svg" alt=""></button><span data-release-page aria-live="polite">1/5</span><button type="button" data-release-next '+teamAttr('nextCard',{},'aria-label')+'><img src="./assets/arrow-left.svg" alt=""></button></div></div>';}
export function createTeamPreviewNews({verified=teamPreviewVerified,userId=verifiedTeamPreviewId,subscribe=onTeamPreviewChange,storage,show=modal,doc=document,win=window,schedule=setTimeout,cancel=clearTimeout,canShow=()=>true}={}){
 if(storage===undefined)try{storage=globalThis.localStorage;}catch{storage=null;}
 let timer=null,openedFor=null,off=null,stopped=false,cleanup=null;const memory=new Set();
 const seen=id=>{if(memory.has(id))return true;try{return Number(storage.getItem(key(id)))>=TEAM_PREVIEW_NEWS.version;}catch{return false;}};
 function open(){
  const id=userId();if(!verified()||!id||doc.getElementById('modal')?.open)return false;
  openedFor=id;show('<div class="release-dialog team-preview-news"><span class="eyebrow">'+teamLeaf('forTeam')+'</span><h2 tabindex="-1" autofocus>'+teamLeaf('newForYou')+'</h2>'+teamPreviewNewsMarkup()+'<button class="button secondary" type="button" data-close>'+teamLeaf('understood')+'</button></div>');
  const dialog=doc.getElementById('modal'),root=doc.querySelector('.team-preview-news');bindIllustratedRelease(root);translateUi(root);const stopLocale=subscribeLanguage(()=>{if(root.isConnected)translateUi(root);});
  const acknowledge=()=>{if(!verified()||userId()!==id)return;memory.add(id);try{storage.setItem(key(id),String(TEAM_PREVIEW_NEWS.version));}catch{}};
  root.querySelector('[data-close]').addEventListener('click',acknowledge,{once:true});
  const closed=()=>{stopLocale();openedFor=null;cleanup=null;refresh();};dialog.addEventListener('close',closed,{once:true});cleanup=()=>{stopLocale();dialog.removeEventListener('close',closed);if(dialog.open)dialog.close();root.remove();openedFor=null;};return true;
 }
 function refresh(){
  if(stopped)return;if(timer!==null)cancel(timer);timer=null;
  for(const motion of doc.querySelectorAll('.team-preview-news .release-motion-preview')){if(doc.hidden)motion.style.setProperty('--release-motion-state','paused');else motion.style.removeProperty('--release-motion-state');}
  const id=userId();if(openedFor&&(!verified()||openedFor!==id))cleanup?.();
  if(!verified()||!id||seen(id)||openedFor||doc.hidden||!canShow())return;
  timer=schedule(()=>{timer=null;if(!doc.hidden&&verified()&&!seen(userId())&&canShow()&&!open())timer=schedule(refresh,1500);},650);
 }
 return{open,refresh,start(){stopped=false;off=subscribe(refresh);win.addEventListener('hashchange',refresh);doc.addEventListener('visibilitychange',refresh);win.addEventListener('salah:release-dismissed',refresh);refresh();return()=>{stopped=true;off?.();if(timer!==null)cancel(timer);win.removeEventListener('hashchange',refresh);doc.removeEventListener('visibilitychange',refresh);win.removeEventListener('salah:release-dismissed',refresh);cleanup?.();};}};
}
// Keep the permanent team entry inside its cabinet. This controller never
// schedules a popup by itself and keeps the existing verified access checks.
export function mountTeamPreviewNewsEntry(host,{verified=teamPreviewVerified,userId=verifiedTeamPreviewId,subscribe=onTeamPreviewChange,create=createTeamPreviewNews}={}){
 const news=create({verified,userId,subscribe,canShow:()=>false});
 host.innerHTML='<button type="button" class="staff-action" data-team-preview-news>'+teamLeaf('newsSections')+'</button>';
 const button=host.querySelector('[data-team-preview-news]');button.onclick=()=>{if(verified())news.open();};
 const paint=()=>{host.hidden=!verified();};paint();const off=subscribe(paint),stop=news.start();
 return()=>{off?.();stop?.();button.onclick=null;host.replaceChildren();};
}
