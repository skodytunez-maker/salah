import{checkAccountSession,OWNER_PROJECT_URL,OWNER_PUBLIC_KEY}from './owner-auth.js';
export async function mountLearningCabinetLink(root,{userId,isActive=()=>root.isConnected,checkSession=checkAccountSession,fetcher=fetch,timeoutMs=3000,schedule=setTimeout,cancel=clearTimeout}={}){
 const content=root.querySelector('[data-knowledge-content]'),status=root.querySelector('[data-learning-access-status]');
 let accepting=true,timer=null;const controller=new AbortController();
 const finish=()=>{if(!accepting)return;accepting=false;if(timer!==null)cancel(timer);controller.abort();if(isActive()){if(content)content.hidden=false;status?.remove();root.removeAttribute('aria-busy');}};
 if(!userId){finish();return;}
 timer=schedule(finish,timeoutMs);
 try{
  const checked=await checkSession({force:true});
  if(!accepting||!isActive()||checked.state!=='valid'||checked.session?.user?.id!==userId||!checked.session.user.email_confirmed_at||checked.session.user.is_anonymous)return;
  const response=await fetcher(OWNER_PROJECT_URL+'/functions/v1/classroom-schedule',{method:'POST',headers:{apikey:OWNER_PUBLIC_KEY,Authorization:'Bearer '+checked.session.access_token,'Content-Type':'application/json'},body:JSON.stringify({action:'portal',view:'student'}),credentials:'omit',cache:'no-store',redirect:'error',signal:controller.signal});
  if(!response.ok)return;const data=await response.json();
  if(!accepting||!isActive()||!Array.isArray(data.lessons)||root.querySelector('[data-learning-cabinets]'))return;
  const entries=[];
  if(data.canTeach===true)entries.push(['#lesson?view=teacher','Кабинет преподавателя','Уроки, ученики и домашние задания','teacher']);
  if(data.lessons.length)entries.push(['#lesson','Моё обучение','Занятия, задания и результаты','student']);
  if(!entries.length)return;
  const doc=root.ownerDocument,nav=doc.createElement('nav');nav.className='learning-cabinet-links';nav.dataset.learningCabinets='';nav.setAttribute('aria-label','Мои кабинеты обучения');
  for(const[href,label,detail,role]of entries){const link=doc.createElement('a');link.href=href;link.className='learning-cabinet-card';link.dataset.learningCabinet=role;link.innerHTML='<span class="knowledge-icon" aria-hidden="true">'+(role==='teacher'?'<img src="./assets/knowledge-teacher.svg" alt="">':'<span class="knowledge-symbol knowledge-symbol-knowledge-prayer"></span>')+'</span><span class="learning-cabinet-copy"><strong>'+label+'</strong><small>'+detail+'</small></span><span class="learning-cabinet-arrow" aria-hidden="true">→</span>';nav.append(link);}
  root.querySelector('.knowledge-head')?.after(nav);
 }catch{}finally{finish();}
}
