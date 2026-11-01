import{checkAccountSession,OWNER_PROJECT_URL,OWNER_PUBLIC_KEY}from './owner-auth.js';
export async function mountLearningCabinetLink(root,{userId,isActive=()=>root.isConnected,checkSession=checkAccountSession,fetcher=fetch}={}){
 if(!userId)return;
 try{
  const checked=await checkSession({force:true});
  if(!isActive()||checked.state!=='valid'||checked.session?.user?.id!==userId||!checked.session.user.email_confirmed_at||checked.session.user.is_anonymous)return;
  const response=await fetcher(OWNER_PROJECT_URL+'/functions/v1/classroom-schedule',{method:'POST',headers:{apikey:OWNER_PUBLIC_KEY,Authorization:'Bearer '+checked.session.access_token,'Content-Type':'application/json'},body:JSON.stringify({action:'portal',view:'student'}),credentials:'omit',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000)});
  if(!response.ok)return;const data=await response.json();
  if(!isActive()||!Array.isArray(data.lessons)||root.querySelector('[data-learning-cabinets]'))return;
  const entries=[];
  if(data.canTeach===true)entries.push(['#lesson?view=teacher','Кабинет преподавателя','Уроки, ученики и домашние задания','teacher']);
  if(data.lessons.length)entries.push(['#lesson','Моё обучение','Занятия, задания и результаты','student']);
  if(!entries.length)return;
  const doc=root.ownerDocument,nav=doc.createElement('nav');nav.className='learning-cabinet-links';nav.dataset.learningCabinets='';nav.setAttribute('aria-label','Мои кабинеты обучения');
  for(const[href,label,detail,role]of entries){const link=doc.createElement('a');link.href=href;link.className='learning-cabinet-card';link.dataset.learningCabinet=role;link.innerHTML='<span class="knowledge-icon" aria-hidden="true">'+(role==='teacher'?'<img src="./assets/knowledge-teacher.svg" alt="">':'<span class="knowledge-symbol knowledge-symbol-knowledge-prayer"></span>')+'</span><span class="learning-cabinet-copy"><strong>'+label+'</strong><small>'+detail+'</small></span><span class="learning-cabinet-arrow" aria-hidden="true">→</span>';nav.append(link);}
  root.querySelector('.knowledge-head')?.after(nav);
 }catch{}
}
