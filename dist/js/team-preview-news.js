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
export function teamPreviewNewsMarkup(){return '<div class="release-gallery"><div class="release-gallery-strip" tabindex="0" aria-label="Новые разделы для команды SALAH">'+TEAM_PREVIEW_NEWS.cards.map(card=>'<article class="release-feature"><div class="release-new-art release-team-art" aria-hidden="true"><div class="release-team-demo release-team-'+card.id+' release-motion-preview"><img src="./assets/updates/team-'+card.id+'-484.svg" alt=""><span class="release-team-focus" data-release-motion-part="element"></span></div></div><h3>'+esc(card.title)+'</h3><p>'+esc(card.text)+'</p><p class="release-feature-note">'+esc(card.where)+'</p></article>').join('')+'</div><div class="release-gallery-controls"><button type="button" data-release-prev aria-label="Предыдущая карточка"><img src="./assets/arrow-left.svg" alt=""></button><span data-release-page aria-live="polite">1/5</span><button type="button" data-release-next aria-label="Следующая карточка"><img src="./assets/arrow-left.svg" alt=""></button></div></div>';}
export function createTeamPreviewNews({verified=teamPreviewVerified,userId=verifiedTeamPreviewId,subscribe=onTeamPreviewChange,storage=globalThis.localStorage,show=modal,doc=document,win=window,schedule=setTimeout,cancel=clearTimeout,canShow=()=>true}={}){
 let timer=null,openedFor=null,off=null,stopped=false,cleanup=null;const memory=new Set();
 const seen=id=>{if(memory.has(id))return true;try{return Number(storage.getItem(key(id)))>=TEAM_PREVIEW_NEWS.version;}catch{return false;}};
 function open(){
  const id=userId();if(!verified()||!id||doc.getElementById('modal')?.open)return false;
  openedFor=id;show('<div class="release-dialog team-preview-news"><span class="eyebrow">КОМАНДЕ SALAH</span><h2 tabindex="-1" autofocus>Новые разделы для вас</h2>'+teamPreviewNewsMarkup()+'<button class="button secondary" type="button" data-close>Понятно</button></div>');
  const dialog=doc.getElementById('modal'),root=doc.querySelector('.team-preview-news');bindIllustratedRelease(root);
  const acknowledge=()=>{if(!verified()||userId()!==id)return;memory.add(id);try{storage.setItem(key(id),String(TEAM_PREVIEW_NEWS.version));}catch{}};
  root.querySelector('[data-close]').addEventListener('click',acknowledge,{once:true});
  const closed=()=>{openedFor=null;cleanup=null;refresh();};dialog.addEventListener('close',closed,{once:true});cleanup=()=>{dialog.removeEventListener('close',closed);if(dialog.open)dialog.close();root.remove();openedFor=null;};return true;
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
