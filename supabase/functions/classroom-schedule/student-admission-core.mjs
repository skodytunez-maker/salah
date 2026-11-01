export const STUDENT_ADMIN_ACTIONS=['student-lookup','student-add','student-remove'];
export async function studentAdmission({action,input,actor,row,db,fail}){
 if(action==='student-lookup'){
  const nickname=typeof input.nickname==='string'?input.nickname.trim().toLowerCase():'';
  if(nickname.length<2||nickname.length>40||/[\x00-\x1f\x7f]/.test(nickname))fail(400,'Введите ник в SALAH: от 2 до 40 символов.');
  return{accounts:await db.studentLookup(nickname,row.ownerId)};
 }
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.userId||'')||input.userId===row.ownerId)fail(400,'Выберите зарегистрированного ученика.');
 const admitted=await db.studentSet(row,actor.id,input.userId,action==='student-add');
 if(!admitted)fail(409,'Занятие, доступ или свободные места изменились. Обновите список.');
 return{userId:input.userId,added:action==='student-add'};
}
