export const TEACHER_ADMIN_ACTIONS=['teacher-list','teacher-lookup','teacher-assign','teacher-revoke'];
export async function teacherAdmin({action,input,actor,db,ownerId,fail}){
 if(actor.id!==ownerId||actor.owner!==true)fail(403,'Назначать преподавателей может только владелец SALAH.');
 if(action==='teacher-list')return{teachers:await db.teacherList()};
 if(action==='teacher-lookup'){
  const nickname=typeof input.nickname==='string'?input.nickname.trim().toLowerCase():'';
  if(nickname.length<2||nickname.length>40||/[\x00-\x1f\x7f]/.test(nickname))fail(400,'Введите ник в SALAH: от 2 до 40 символов.');
  const accounts=await db.teacherLookup(nickname);if(!accounts.length)fail(404,'Аккаунт с таким ником не найден. Проверьте ник и регистрацию в SALAH.');
  return{accounts:accounts.slice(0,8),truncated:accounts.length>8};
 }
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.userId||'')||input.userId===ownerId)fail(400,'Выберите другой аккаунт.');
 if(!Number.isSafeInteger(input.expectedRevision)||input.expectedRevision<0||input.expectedRevision>=2147483647)fail(400,'Откройте профиль заново.');
 const result=await db.teacherSet(actor.id,input.userId,action==='teacher-assign',input.expectedRevision);
 if(!result)fail(409,'Профиль или доступ изменились. Обновите список и повторите.');
 return{userId:input.userId,...result};
}
