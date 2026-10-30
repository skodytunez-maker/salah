import{checkAccountSession,OWNER_PROJECT_URL,OWNER_PUBLIC_KEY}from './owner-auth.js';
export async function mountAccountLessonLink(root,{userId,isActive=()=>root.isConnected,checkSession=checkAccountSession,fetcher=fetch}={}){
 try{const checked=await checkSession({force:true});if(!isActive()||checked.state!=='valid'||checked.session?.user?.id!==userId||!checked.session.user.email_confirmed_at||checked.session.user.is_anonymous)return;
 const r=await fetcher(OWNER_PROJECT_URL+'/functions/v1/classroom-schedule',{method:'POST',headers:{apikey:OWNER_PUBLIC_KEY,Authorization:'Bearer '+checked.session.access_token,'Content-Type':'application/json'},body:JSON.stringify({action:'portal',view:'student'}),credentials:'omit',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000)});if(!r.ok)return;const data=await r.json();if(!isActive()||!Array.isArray(data.lessons)||(!data.lessons.length&&data.canTeach!==true)||root.querySelector('[data-account-lessons]'))return;
 const doc=root.ownerDocument,group=doc.createElement('nav');group.className='account-learning-links';group.setAttribute('aria-label','Обучение');
 const symbols={student:'<path d="M12 6c-3-2-6-2-9-1v14c3-1 6-1 9 1m0-14c3-2 6-2 9-1v14c-3-1-6-1-9 1V6Z"/>',teacher:'<circle cx="12" cy="7" r="3"/><path d="M5 21v-3a7 7 0 0 1 14 0v3M9 19h6"/>',teachers:'<path d="M16 21v-2a6 6 0 0 0-12 0v2m16 0v-2a5 5 0 0 0-3-4.6"/><circle cx="10" cy="7" r="3"/><path d="M16 4a3 3 0 0 1 0 6"/>'};
 function row(href,label,key,symbol){const link=doc.createElement('a');link.href=href;link.className='account-learning-row';link.dataset[key]='';link.innerHTML='<svg class="account-learning-icon" viewBox="0 0 24 24" aria-hidden="true">'+symbols[symbol]+'</svg><span>'+label+'</span><svg class="account-learning-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>';group.append(link);}
 row('#lesson','Моё обучение','accountLessons','student');
 if(data.canTeach===true){row('#lesson?view=teacher','Кабинет преподавателя','teacherCabinet','teacher');if(data.canManageTeachers===true)row('#admin?view=teachers','Преподаватели','teacherAdmin','teachers');}
 root.querySelector('.account-details')?.before(group);
 }catch{}
}
