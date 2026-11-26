import{checkAccountSession,OWNER_PROJECT_URL,OWNER_PUBLIC_KEY}from './owner-auth.js';
import{uiLeaf,uiAttribute}from './practice-i18n.js';
// Cache only navigation flags, in memory, for the same verified live token.
// Opening a cabinet still checks current permissions at its protected endpoint.
export function createLearningCabinetLoader({checkSession=checkAccountSession,fetcher=fetch,now=Date.now,ttl=30000}={}){
 let cached=null,pending=null,revision=0;
 const clear=()=>{revision++;cached=null;pending?.controller.abort();pending=null;};
 async function load(userId){
  if(!userId){clear();return null;}
  const generation=revision,checked=await checkSession({force:false});
  if(generation!==revision)return null;
  const session=checked.session;
  if(checked.state!=='valid'||session?.user?.id!==userId||!session.user.email_confirmed_at||session.user.is_anonymous){clear();return null;}
  const token=session.access_token;
  if(!token){clear();return null;}
  if(cached?.userId===userId&&cached.token===token&&now()>=cached.at&&now()-cached.at<ttl)return cached.flags;
  if(pending?.userId===userId&&pending.token===token)return pending.task;
  cached=null;pending?.controller.abort();const ticket=revision,controller=new AbortController(),entry={userId,token,controller,task:null};
  const timer=setTimeout(()=>controller.abort(),3000);timer.unref?.();
  entry.task=(async()=>{
   try{
    const response=await fetcher(OWNER_PROJECT_URL+'/functions/v1/classroom-schedule',{method:'POST',headers:{apikey:OWNER_PUBLIC_KEY,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({action:'portal',view:'student'}),credentials:'omit',cache:'no-store',redirect:'error',signal:controller.signal});
    if(!response.ok)throw Error('cabinet_unavailable');const data=await response.json();
    if(controller.signal.aborted||ticket!==revision||pending!==entry||!Array.isArray(data.lessons))return null;
    const flags=Object.freeze({teacher:data.canTeach===true,student:data.lessons.length>0});
    cached={userId,token,at:now(),flags};return flags;
   }finally{clearTimeout(timer);if(pending===entry)pending=null;}
  })();pending=entry;return entry.task;
 }
 return{load,clear};
}
const sharedLoader=createLearningCabinetLoader();
export const preloadLearningCabinetLink=userId=>sharedLoader.load(userId).catch(()=>null);
export async function mountLearningCabinetLink(root,{
 userId,isActive=()=>root.isConnected,
 checkSession=checkAccountSession,fetcher=fetch,loadDecision=null,
 timeoutMs=3000,schedule=setTimeout,cancel=clearTimeout,
 scheduleFrame=callback=>root.ownerDocument.defaultView?.requestAnimationFrame?.(callback),
 cancelFrame=id=>root.ownerDocument.defaultView?.cancelAnimationFrame?.(id)
}={}){
 if(!userId)return;
 let accepting=true,beforeFirstPaint=false;
 const frame=scheduleFrame(()=>{beforeFirstPaint=false;});
 beforeFirstPaint=frame!=null;
 const timer=schedule(()=>{accepting=false;},timeoutMs);
 try{
  const load=loadDecision||(checkSession===checkAccountSession&&fetcher===fetch?sharedLoader.load:createLearningCabinetLoader({checkSession,fetcher}).load);
  const data=await load(userId);
  if(!accepting||!isActive()||!data||root.querySelector('[data-learning-cabinets]'))return;
  const entries=[];
  if(data.teacher)entries.push(['#lesson?view=teacher','Кабинет преподавателя','Уроки, ученики и домашние задания','teacher']);
  if(data.student)entries.push(['#lesson','Моё обучение','Занятия, задания и результаты','student']);
  if(!entries.length)return;
  const doc=root.ownerDocument,nav=doc.createElement('nav');nav.className='learning-cabinet-links';nav.dataset.learningCabinets='';uiAttribute(nav,'aria-label','knowledgeUi.cabinetsLabel','Мои кабинеты обучения');
  for(const[href,label,detail,role]of entries){const link=doc.createElement('a');link.href=href;link.className='learning-cabinet-card';link.dataset.learningCabinet=role;link.innerHTML='<span class="knowledge-icon" aria-hidden="true">'+(role==='teacher'?'<img src="./assets/knowledge-teacher.svg" alt="">':'<span class="knowledge-symbol knowledge-symbol-knowledge-prayer"></span>')+'</span><span class="learning-cabinet-copy"><strong>'+uiLeaf('knowledgeUi.'+(role==='teacher'?'teacherTitle':'studentTitle'),label)+'</strong><small>'+uiLeaf('knowledgeUi.'+role+'CabinetDetail',detail)+'</small></span><span class="learning-cabinet-arrow" aria-hidden="true">→</span>';nav.append(link);}
  // Preserve the usual top placement for warm permissions without moving
  // cards after the first frame when the permission check takes longer.
  const heading=root.querySelector('.knowledge-head');
  if(beforeFirstPaint&&heading)heading.after(nav);
  else root.append(nav);
 }catch{}finally{cancel(timer);if(frame!=null)cancelFrame(frame);}
}
