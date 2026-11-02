// Shared public loading shell; it contains no account data or access grant.
export function lessonEntryLoading(hash=''){
 const params=new URLSearchParams(hash.split('?')[1]||''),cabinet=!params.has('invite')&&!params.has('class');
 if(!cabinet)return '<section class="alphabet-page lesson-account-entry"><a class="alphabet-back" href="#knowledge">← Знания</a><h1>Онлайн-занятие</h1><p role="status">Открываем занятие…</p></section>';
 return '<section class="alphabet-page learning-cabinet cabinet-loading" aria-busy="true"><a class="alphabet-back" href="#knowledge">← Знания</a><div class="cabinet-kicker">ОБУЧЕНИЕ · SALAH</div><h1>'+(params.get('view')==='teacher'?'Кабинет преподавателя':'Моё обучение')+'</h1><p class="cabinet-welcome" role="status">Открываем кабинет…</p><div class="cabinet-loading-panel" aria-hidden="true"><span></span><span></span><span></span></div></section>';
}

// Keep the private learning UI out of the ordinary app's startup graph.
export function createLessonRoute({load=()=>import('./lesson-invitation.js')}={}){
 let module=null,loading=null,generation=0,view=null;
 const stopStudentLesson=()=>{generation++;view=null;module?.stopStudentLesson();};
 const studentLessonBusy=()=>Boolean(module?.studentLessonBusy());
 function showLessonInvitation(host,options={}){
  if(module)return module.showLessonInvitation(host,options);
  const hash=options.hash??location.hash;
  if(view?.host===host&&view.hash===hash)return;
  const token=++generation;view={host,hash};
  const active=()=>generation===token&&host.isConnected;
  host.innerHTML=lessonEntryLoading(hash);
  const task=loading||(loading=Promise.resolve().then(load));
  void task.then(value=>{
   if(typeof value.showLessonInvitation!=='function'||typeof value.stopStudentLesson!=='function'||typeof value.studentLessonBusy!=='function')throw Error('learning_module_unavailable');
   module=value;
   if(active()){view=null;module.showLessonInvitation(host,{...options,hash});}
  }).catch(()=>{
   if(loading===task)loading=null;
   if(!active())return;
   view=null;
   host.innerHTML='<section class="alphabet-page lesson-account-entry"><a class="alphabet-back" href="#knowledge">← Знания</a><h1>Не удалось открыть кабинет</h1><p role="alert">Проверьте интернет и попробуйте ещё раз.</p><button class="button secondary" type="button" data-retry-lesson>Повторить</button></section>';
   host.querySelector('[data-retry-lesson]').onclick=()=>showLessonInvitation(host,options);
  });
 }
 return{showLessonInvitation,stopStudentLesson,studentLessonBusy};
}
export const{showLessonInvitation,stopStudentLesson,studentLessonBusy}=createLessonRoute();
