import{verifyOwner,verifiedOwnerId,checkAccountSession,OWNER_PROJECT_URL,OWNER_PUBLIC_KEY}from './owner-auth.js';
const actions=new Set(['teacher-list','teacher-lookup','teacher-assign','teacher-revoke']);
export async function ownerClassroomCall(action,input={}){
 if(!actions.has(action))throw Error('Недоступное действие кабинета.');
 if(!await verifyOwner({verifySession:true}))throw Error('Подтвердите защищённый вход владельца.');
 const checked=await checkAccountSession({force:true});if(checked.state!=='valid'||checked.session?.user?.id!==verifiedOwnerId())throw Error('Аккаунт изменился. Откройте кабинет заново.');
 const response=await fetch(OWNER_PROJECT_URL+'/functions/v1/classroom-schedule',{method:'POST',headers:{apikey:OWNER_PUBLIC_KEY,Authorization:'Bearer '+checked.session.access_token,'Content-Type':'application/json'},body:JSON.stringify({...input,action}),credentials:'omit',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)});
 const value=await response.json();if(!response.ok)throw Object.assign(Error(value.error||'Не удалось выполнить действие.'),{status:response.status});return value;
}
