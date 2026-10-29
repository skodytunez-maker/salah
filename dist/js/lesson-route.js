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
  host.innerHTML='<section class="alphabet-page lesson-account-entry"><a class="alphabet-back" href="#knowledge">← Знания</a><h1>Моё обучение</h1><p role="status">Открываем кабинет…</p></section>';
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
