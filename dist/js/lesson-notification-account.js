let user=null,started=false,tail=Promise.resolve();
export function syncLessonNotificationAccount(value){
 user=typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)?value:null;
 const worker=globalThis.navigator?.serviceWorker;if(!worker)return;
 if(!started){started=true;worker.addEventListener?.('controllerchange',()=>syncLessonNotificationAccount(user));}
 try{worker.controller?.postMessage({type:'SALAH_LESSON_ACCOUNT',user});}catch{}
 const snapshot=user;tail=tail.catch(()=>{}).then(async()=>{const reg=await worker.getRegistration('./');if(snapshot!==user)return;reg?.active?.postMessage({type:'SALAH_LESSON_ACCOUNT',user:snapshot});}).catch(()=>{});
}
